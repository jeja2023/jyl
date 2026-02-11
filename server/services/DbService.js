const sequelize = require('../db');
const User = require('../models/User');
const HealthRecord = require('../models/HealthRecord');
const MedicationPlan = require('../models/MedicationPlan');
const CheckupReminder = require('../models/CheckupReminder');
const HealthTip = require('../models/HealthTip');
const SmsCode = require('../models/SmsCode');
const Notification = require('../models/Notification');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class DbService {
    static async init() {
        try {
            await sequelize.authenticate();
            logger.info('数据库连接成功，开始同步模型...');

            // 1. 特殊处理：Users 表容易因为 alter: true 产生重复索引导致 ER_TOO_MANY_KEYS
            await this.cleanupDuplicateIndexes();

            // 2. 执行模型同步 - 手动字段升级
            await this.manualMigrations();

            // 3. Sync
            await sequelize.sync();
            logger.info('数据库模型同步成功');

            // 4. 初始化数据（如管理员）
            await this.seedData();

            // 5. 启动定期清理任务
            this.startCleanupTask();

        } catch (err) {
            logger.error('数据库同步失败', { message: err.message });
        }
    }

    /**
     * 清理 Users 表潜在的重复索引
     */
    static async cleanupDuplicateIndexes() {
        try {
            const [results] = await sequelize.query("SHOW INDEX FROM Users WHERE Key_name LIKE 'username%' AND Key_name != 'username'");
            if (results.length > 5) {
                logger.info(`发现 Users 表有 ${results.length} 个潜在重复索引，正在清理...`);
                for (const row of results) {
                    await sequelize.query(`ALTER TABLE Users DROP INDEX ${row.Key_name}`).catch(() => { });
                }
            }
        } catch (e) {
            // 表可能还不存在，忽略
        }
    }

    /**
     * 手动字段与索引升级
     */
    static async manualMigrations() {
        try {
            await sequelize.query("ALTER TABLE HealthRecords MODIFY noduleCount VARCHAR(255) COMMENT '结节数量'");
            await sequelize.query("ALTER TABLE HealthRecords MODIFY reportImage TEXT COMMENT '化验单图片路径 (JSON数组)'");
            await sequelize.query("ALTER TABLE HealthRecords MODIFY ultrasoundImage TEXT COMMENT 'B超报告图片路径 (JSON数组)'");
            await sequelize.query("ALTER TABLE HealthRecords ADD COLUMN ultrasoundDate DATE COMMENT 'B超检查日期'").catch(() => { });

            // 批量升级浮点数字段为 DOUBLE，解决截断问题
            const floatFields = ['TSH', 'FT3', 'FT4', 'T3', 'T4', 'TGAb', 'TPOAb', 'TRAb', 'Tg', 'Calcitonin', 'Calcium', 'Magnesium', 'Phosphorus', 'PTH'];
            for (const field of floatFields) {
                await sequelize.query(`ALTER TABLE HealthRecords MODIFY ${field} DOUBLE`).catch(() => { });
            }

            // 将isthmus改为字符串以支持 "已切除" 等描述
            await sequelize.query("ALTER TABLE HealthRecords MODIFY isthmus VARCHAR(255) COMMENT '峡部厚度'").catch(() => { });

            // 增加用户百科阅读数统计
            await sequelize.query("ALTER TABLE Users ADD COLUMN wikiReadCount INTEGER DEFAULT 0 COMMENT '百科阅读数'").catch(() => { });

            // 增加服药打卡字段
            await sequelize.query("ALTER TABLE MedicationPlans ADD COLUMN lastTakenDate DATE COMMENT '上次服药日期'").catch(() => { });

            // 补充索引优化性能
            await sequelize.query("CREATE INDEX idx_healthrecord_userid ON HealthRecords(UserId)").catch(() => { });
            await sequelize.query("CREATE INDEX idx_healthrecord_date ON HealthRecords(recordDate)").catch(() => { });
            await sequelize.query("CREATE INDEX idx_healthrecord_user_date ON HealthRecords(UserId, recordDate)").catch(() => { });

            // 验证码表索引优化
            await sequelize.query("CREATE INDEX idx_smscode_phone ON SmsCodes(phone)").catch(() => { });
            await sequelize.query("CREATE INDEX idx_smscode_expire ON SmsCodes(expireAt)").catch(() => { });

            logger.info('手动字段与索引升级完成');
        } catch (e) {
            // 首次运行或表不存在会报这个错，正常
        }
    }

    /**
     * 初始化种子数据
     */
    static async seedData() {
        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminPass = process.env.ADMIN_PASS || '123456';

        try {
            const [user, created] = await User.findOrCreate({
                where: { username: adminUser },
                defaults: {
                    password: adminPass,
                    nickname: '系统管理员',
                    role: 'admin',
                    patientType: '其他'
                }
            });

            if (created) {
                logger.info(`初始管理员账户已创建: ${adminUser}`);
            }
        } catch (e) {
            logger.error('管理员账户检查失败', { message: e.message });
        }
    }

    /**
     * 启动定期清理任务
     * 每6小时清理一次过期的验证码记录
     */
    static startCleanupTask() {
        // 启动后延迟1分钟执行首次清理
        setTimeout(() => this.cleanExpiredData(), 60 * 1000);

        // 每6小时执行一次定期清理
        setInterval(() => this.cleanExpiredData(), 6 * 60 * 60 * 1000);

        logger.info('定期清理任务已启动（每6小时执行）');
    }

    /**
     * 清理过期数据
     */
    static async cleanExpiredData() {
        try {
            // 清理已使用或已过期超过24小时的验证码
            const deletedCount = await SmsCode.destroy({
                where: {
                    [Op.or]: [
                        { used: true },
                        { expireAt: { [Op.lt]: new Date() } }
                    ],
                    createdAt: { [Op.lt]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            });

            if (deletedCount > 0) {
                logger.info(`定期清理: 已清理 ${deletedCount} 条过期验证码`);
            }
        } catch (e) {
            logger.error('定期清理失败', { message: e.message });
        }
    }
}

module.exports = DbService;

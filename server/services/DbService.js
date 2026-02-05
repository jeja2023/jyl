const sequelize = require('../db');
const User = require('../models/User');
const HealthRecord = require('../models/HealthRecord');
const MedicationPlan = require('../models/MedicationPlan');
const CheckupReminder = require('../models/CheckupReminder');
const HealthTip = require('../models/HealthTip');
const SmsCode = require('../models/SmsCode');
const Notification = require('../models/Notification');
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
            await sequelize.sync(); // 改用常规 sync，减少 alter 的副作用
            logger.info('数据库模型同步成功');

            // 4. 初始化数据（如管理员）
            await this.seedData();

        } catch (err) {
            logger.error('数据库同步失败', { message: err.message });
            // 这里不抛出错误，以免中断启动，但记录日志
        }
    }

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

    static async manualMigrations() {
        // 手动修改字段类型，规避整体 alter 可能触发的重复索引或锁表错误
        try {
            await sequelize.query("ALTER TABLE HealthRecords MODIFY noduleCount VARCHAR(255) COMMENT '结节数量'");
            await sequelize.query("ALTER TABLE HealthRecords MODIFY reportImage TEXT COMMENT '化验单图片路径 (JSON数组)'");
            await sequelize.query("ALTER TABLE HealthRecords MODIFY ultrasoundImage TEXT COMMENT 'B超报告图片路径 (JSON数组)'");
            // 尝试添加新字段 (如果已存在会报错，忽略即可)
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

            logger.info('手动字段与索引升级完成');
        } catch (e) {
            // 首次运行或表不存在会报这个错，正常
        }
    }

    static async seedData() {
        // 自动创建管理员账户
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
}

module.exports = DbService;

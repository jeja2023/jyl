const sequelize = require('../db');
const User = require('../models/User');
const HealthRecord = require('../models/HealthRecord');
const MedicationPlan = require('../models/MedicationPlan');
const CheckupReminder = require('../models/CheckupReminder');
const HealthTip = require('../models/HealthTip');
const VerifyCode = require('../models/VerifyCode');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

class DbService {
    static async init() {
        try {
            await sequelize.authenticate();
            logger.info('数据库连接成功，开始同步模型...');

            // 执行模型同步 (增加 alter: true 以自动更新表结构，如添加 email 字段)
            await sequelize.sync({ alter: true });
            logger.info('数据库模型同步成功');

            // 4. 初始化数据（如管理员）
            await this.seedData();

        } catch (err) {
            logger.error('数据库同步失败，应用无法正常运行，强制退出', { message: err.message });
            process.exit(1);
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

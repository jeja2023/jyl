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
    static async init(retries = 10) {
        while (retries > 0) {
            try {
                await sequelize.authenticate();
                logger.info('数据库连接成功，开始同步模型...');

                // 执行模型同步 (增加 alter: true 以自动更新表结构，如添加 email 字段)
                await sequelize.sync({ alter: true });
                logger.info('数据库模型同步成功');

                // 4. 初始化数据（如管理员）
                await this.seedData();
                return; // 成功则退出循环
            } catch (err) {
                retries -= 1;
                logger.warn(`等待数据库准备就绪... (${err.message})。剩余重试次数: ${retries}`);
                if (retries === 0) {
                    logger.error('数据库同步失败，达到最大重试次数，应用无法正常运行，强制退出');
                    process.exit(1);
                }
                // 等待 5 秒再次尝试连接数据库
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
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

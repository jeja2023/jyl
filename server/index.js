const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = new Koa();
const port = process.env.PORT || 3000;

// 确保存储目录存在
const storageDir = path.join(__dirname, '../storage/reports');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// 数据库
const sequelize = require('./db');
// 模型
const User = require('./models/User');
const HealthRecord = require('./models/HealthRecord');
const MedicationPlan = require('./models/MedicationPlan');
const CheckupReminder = require('./models/CheckupReminder');
const HealthTip = require('./models/HealthTip');
const SmsCode = require('./models/SmsCode');

// 同步数据库
sequelize.authenticate()
    .then(async () => {
        console.log('📡 数据库连接成功，开始同步模型...');

        // 1. 特殊处理：Users 表容易因为 alter: true 产生重复索引导致 ER_TOO_MANY_KEYS
        try {
            const [results] = await sequelize.query("SHOW INDEX FROM Users WHERE Key_name LIKE 'username%' AND Key_name != 'username'");
            if (results.length > 5) { // 如果重复索引超过5个，清理一下
                console.log(`🧹 发现 Users 表有 ${results.length} 个潜在重复索引，正在清理...`);
                for (const row of results) {
                    await sequelize.query(`ALTER TABLE Users DROP INDEX ${row.Key_name}`).catch(() => { });
                }
            }
        } catch (e) {
            // 表可能还不存在，忽略
        }

        // 2. 执行模型同步
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

            console.log('📝 手动字段升级完成');
        } catch (e) {
            // 首次运行或表不存在会报这个错，正常
        }

        return sequelize.sync(); // 改用常规 sync，减少 alter 的副作用
    })
    .then(async () => {
        console.log('✅ 数据库模型同步成功');

        // 自动创建管理员账户
        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminPass = process.env.ADMIN_PASS || '123456';

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
            console.log(`🚀 初始管理员账户已创建: ${adminUser}`);
        }
    })
    .catch(err => {
        console.error('❌ 数据库同步失败:', err);
    });

// 中间件
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);
app.use(cors()); // 跨域支持
app.use(bodyParser({ jsonLimit: '10mb' })); // 增加限制以支持图片上传

// 静态文件服务 - 用于访问上传的报告图片
app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/storage/')) {
        const filePath = path.join(__dirname, '..', ctx.path);
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp'
            };
            ctx.type = mimeTypes[ext] || 'application/octet-stream';
            ctx.body = fs.createReadStream(filePath);
            return;
        }
    }
    await next();
});

// 路由
const apiRouter = require('./routes/index');
app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

// 启动服务
app.listen(port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║          甲友乐 JYL Server               ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  🌐 服务端口: http://localhost:${port}       ║`);
    console.log('║  📊 数据库: MySQL                        ║');
    console.log('║  🔐 认证方式: JWT                        ║');
    console.log('║  📁 文件存储: storage/reports            ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});


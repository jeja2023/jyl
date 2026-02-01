const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
require('dotenv').config();

const app = new Koa();
const port = process.env.PORT || 3000;

// 数据库
const sequelize = require('./db');
// 模型
const User = require('./models/User');
const HealthRecord = require('./models/HealthRecord');
const MedicationPlan = require('./models/MedicationPlan');
const CheckupReminder = require('./models/CheckupReminder');
const HealthTip = require('./models/HealthTip');

// 同步数据库
sequelize.sync({ alter: true })
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
app.use(bodyParser());

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
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const path = require('path');
const fs = require('fs');
const serve = require('koa-static');
const mount = require('koa-mount');
const compress = require('koa-compress');
const helmet = require('koa-helmet');
require('dotenv').config();

// 环境变量校验
const { validateEnv } = require('./utils/envCheck');
if (!validateEnv()) {
    process.exit(1);
}

const app = new Koa();
const port = process.env.PORT || 3000;

// 确保存储目录存在
const storageDir = path.join(__dirname, '../storage/reports');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// 数据库服务 初始化
const DbService = require('./services/DbService');
DbService.init();

// 中间件
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);
app.use(helmet()); // 设置安全HTTP头
app.use(compress({
    filter: (content_type) => {
        return /text|javascript|css|json|svg/i.test(content_type);
    },
    threshold: 1024, // 1kb 以上的数据才压缩
    gzip: { flush: require('zlib').constants.Z_SYNC_FLUSH },
    deflate: { flush: require('zlib').constants.Z_SYNC_FLUSH },
    br: false // 禁用 brotli，因为通常需要额外的配置
}));
app.use(cors()); // 跨域支持
app.use(bodyParser({ jsonLimit: '10mb' })); // 增加限制以支持图片上传

// 静态文件服务 - 使用 koa-static 替换手动流式读取，提升性能
const staticPath = path.join(__dirname, '../storage');
app.use(mount('/storage', serve(staticPath, {
    maxage: 86400000, // 缓存一天
    gzip: true
})));

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


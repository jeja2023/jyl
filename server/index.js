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
app.use(helmet({ crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } })); // 设置安全HTTP头，允许跨域加载存储图片
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

// 生产环境：托管前端构建产物（dist/build/h5）
// 前端 build 后的静态文件由后端直接托管，前端访问同一端口，无跨域问题
const distPath = path.join(__dirname, '../client/dist/build/h5');
if (fs.existsSync(distPath)) {
    // 所有非 /api、非 /storage 的请求回退到 index.html（SPA 路由支持）
    app.use(serve(distPath, { maxage: 86400000 }));
    app.use(async (ctx, next) => {
        // 只对 GET 请求且路径不匹配静态文件时回退到 index.html
        if (ctx.method === 'GET' && !ctx.path.startsWith('/api') && !ctx.path.startsWith('/storage')) {
            const indexFile = path.join(distPath, 'index.html');
            if (fs.existsSync(indexFile)) {
                ctx.type = 'html';
                ctx.body = fs.createReadStream(indexFile);
                return;
            }
        }
        await next();
    });
    console.log(`[生产] 前端静态文件已托管: ${distPath}`);
}

// 过滤客户端主动断开连接产生的无害流错误
app.on('error', (err) => {
    if (err.code === 'ERR_STREAM_PREMATURE_CLOSE' || err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ECONNABORTED') return;
    console.error('[App Error]', err.message);
});

// 启动服务
app.listen(port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║          甲友乐 JYL Server               ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  🌐 服务端口: http://localhost:${port}      ║`);
    console.log('║  📊 数据库: MySQL                        ║');
    console.log('║  🔐 认证方式: JWT                        ║');
    console.log('║  📁 文件存储: storage/reports            ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
});


const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const serve = require('koa-static');
const mount = require('koa-mount');
const compress = require('koa-compress');
const helmet = require('koa-helmet');
const pkg = require('./package.json');
require('dotenv').config();

// 环境变量校验
const { validateEnv } = require('./utils/envCheck');
if (!validateEnv()) {
    process.exit(1);
}

const app = new Koa();
const port = process.env.PORT || 3000;
const logger = require('./utils/logger');
const { startCleanupJobs } = require('./utils/cleanup');

// 请求链路 ID
app.use(async (ctx, next) => {
    const incomingId = ctx.get('X-Request-Id');
    const requestId = incomingId || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));
    ctx.state.requestId = requestId;
    ctx.set('X-Request-Id', requestId);
    await next();
});

// 请求日志中间件
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    logger.request(ctx, ms);
});

// 确保存储目录存在 (递归创建，支持 Docker 初始挂载环境)
const storageDir = path.join(__dirname, '../storage/reports');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// 打印库连接诊断信息
console.log(`[启动] 数据库连接检测: HOST=${process.env.DB_HOST || 'localhost'}, USER=${process.env.DB_USER}`);

// 数据库服务 初始化
const DbService = require('./services/DbService');
DbService.init().then(() => {
    startCleanupJobs();
});

// 中间件
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // 禁用默认的 CSP，防止前端请求不同端口的 API 被拦截
}));
app.use(compress({
    filter: (content_type) => {
        return /text|javascript|css|json|svg/i.test(content_type);
    },
    threshold: 1024, // 1kb 以上的数据才压缩
    gzip: { flush: require('zlib').constants.Z_SYNC_FLUSH },
    deflate: { flush: require('zlib').constants.Z_SYNC_FLUSH },
    br: false // 禁用 brotli，因为通常需要额外的配置
}));
// 跨域支持（生产环境可配置白名单）
const corsOptions = {};
if (process.env.NODE_ENV === 'production' && process.env.CORS_ORIGINS) {
    const allowedOrigins = process.env.CORS_ORIGINS
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    corsOptions.origin = (ctx) => {
        const reqOrigin = ctx.get('Origin');
        if (!reqOrigin) return '*';
        return allowedOrigins.includes(reqOrigin) ? reqOrigin : false;
    };
    corsOptions.credentials = true;
}
app.use(cors(corsOptions));
const largeBodyPaths = new Set(['/api/ocr/recognize', '/api/upload/report']);
const defaultBodyParser = bodyParser({ jsonLimit: '2mb', formLimit: '1mb' });
app.use(async (ctx, next) => {
    if (largeBodyPaths.has(ctx.path)) {
        await next();
        return;
    }
    await defaultBodyParser(ctx, next);
});

// 静态文件服务 - 使用 koa-static 替换手动流式读取，提升性能
const staticPath = path.join(__dirname, '../storage');
app.use(async (ctx, next) => {
    await next();
    if (ctx.status < 400 && ctx.body && ctx.path.endsWith('.apk')) {
        ctx.type = 'application/vnd.android.package-archive';
        ctx.set('Content-Disposition', `attachment; filename="${path.basename(ctx.path)}"`);
    }
});
app.use(mount('/storage', serve(staticPath, {
    maxage: 86400000, // 缓存一天
    gzip: true
})));

// 路由
const apiRouter = require('./routes/index');

// 健康检查接口
apiRouter.get('/health', async (ctx) => {
    const DbService = require('./services/DbService');
    const dbStatus = await DbService.checkConnection();
    ctx.body = {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: Date.now(),
        database: dbStatus ? 'connected' : 'disconnected',
        version: pkg.version
    };
});

app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

// 生产环境：托管前端构建产物（dist/build/h5）
// 前端 build 后的静态文件由后端直接托管，前端访问同一端口，无跨域问题
const distPath = path.join(__dirname, '../client/dist/build/h5');
if (fs.existsSync(distPath)) {
    const noStore = (ctx) => {
        ctx.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        ctx.set('Pragma', 'no-cache');
        ctx.set('Expires', '0');
        ctx.set('Clear-Site-Data', '"cache"');
    };

    app.use(async (ctx, next) => {
        if (ctx.path === '/sw.js' || ctx.path === '/service-worker.js') {
            noStore(ctx);
            ctx.type = 'application/javascript';
            ctx.body = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 优先清除所有浏览器静态缓存，防止 unregister 后进程被杀导致清理未完成
    if (self.caches) {
      try {
        const keys = await self.caches.keys();
        await Promise.all(keys.map((key) => self.caches.delete(key)));
      } catch (e) {}
    }
    // 卸载 Service Worker
    if (self.registration.unregister) {
      await self.registration.unregister();
    }
    // 强制刷新所有关联的标签页以加载服务端最新资源
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      try { client.navigate(client.url); } catch (e) {}
    });
  })());
});`;
            return;
        }

        if (ctx.path === '/registerSW.js') {
            noStore(ctx);
            ctx.type = 'application/javascript';
            ctx.body = `if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .then(() => window.caches ? window.caches.keys() : [])
    .then((keys) => Promise.all((keys || []).map((key) => window.caches.delete(key))))
    .catch(() => {});
}`;
            return;
        }

        if (ctx.path === '/manifest.webmanifest') {
            noStore(ctx);
            ctx.type = 'application/manifest+json';
            ctx.body = JSON.stringify({ name: 'JYL', short_name: 'JYL', start_url: '/', display: 'browser' });
            return;
        }

        if ((ctx.path === '/index.html' || ctx.path === '/') && ctx.method === 'GET') {
            const indexFile = path.join(distPath, 'index.html');
            if (fs.existsSync(indexFile)) {
                noStore(ctx);
                ctx.type = 'html';
                ctx.body = fs.createReadStream(indexFile);
                return;
            }
        }

        if (ctx.path === '/index.html' || ctx.path === '/') {
            noStore(ctx);
        }
        await next();
    });

    // 1. 先尝试匹配静态文件（带有缓存设置，除了上面排除的文件）
    app.use(serve(distPath, { 
        maxage: 86400000, 
        greedy: false 
    }));

    // 2. 如果静态文件未匹配，且是 GET 请求，则作为 SPA 回退到 index.html
    app.use(async (ctx, next) => {
        // 只有不带后缀名（即不是文件请求）、是 GET 请求、且请求头包含 text/html 且不是 API/Storage 的请求才回退
        const isHtmlRequest = ctx.get('Accept')?.includes('text/html');
        const isPageRequest = !ctx.path.includes('.') && ctx.method === 'GET' && isHtmlRequest;
        
        if (isPageRequest && !ctx.path.startsWith('/api') && !ctx.path.startsWith('/storage')) {
            const indexFile = path.join(distPath, 'index.html');
            if (fs.existsSync(indexFile)) {
                noStore(ctx);
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

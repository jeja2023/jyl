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

/**
 * 只有部署在可信反向代理后面才解析转发头，默认关闭。
 *
 * 原先无条件 app.proxy = true：ctx.ip 直接取 X-Forwarded-For 首段，
 * 而限流器的 key 就是 ctx.ip，任何客户端换一个转发头就能拿到新的计数桶，
 * 登录爆破限流和验证码限流都能绕过，操作日志里的 IP 也可以随意伪造。
 *
 * maxIpsCount 只认最靠近服务端的 N 跳（由可信代理自己追加的部分），
 * 客户端塞在左侧的伪造条目会被切掉。默认 1，即"服务端前面只有一层代理"。
 */
const trustProxy = process.env.TRUST_PROXY === 'true';
app.proxy = trustProxy;
app.maxIpsCount = trustProxy
    ? Math.max(parseInt(process.env.TRUST_PROXY_HOPS || '1', 10) || 1, 1)
    : 0;

const port = process.env.PORT || 3000;
const logger = require('./utils/logger');
const { startCleanupJobs } = require('./utils/cleanup');
const isProd = process.env.NODE_ENV === 'production';
const publicStorageDirs = ['app-updates', 'app-releases'];

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
    const originalUrl = ctx.url;
    if (ctx.query?.authToken || ctx.query?.shareToken || ctx.query?.token) {
        ctx.url = ctx.path;
    }
    logger.request(ctx, ms);
    ctx.url = originalUrl;
});

// 确保存储目录存在 (递归创建，支持 Docker 初始挂载环境)
const storageDir = path.join(__dirname, '../storage/reports');
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}
publicStorageDirs.forEach((dir) => {
    const target = path.join(__dirname, '../storage', dir);
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
});

// 打印库连接诊断信息
console.log(`[启动] 数据库连接检测: HOST=${process.env.DB_HOST || 'localhost'}, USER=${process.env.DB_USER}`);

// 数据库服务 初始化（在 listen 之前完成，见文件末尾的 start()）
const DbService = require('./services/DbService');

// 中间件
const errorHandler = require('./middlewares/errorHandler');
app.use(errorHandler);
const contentSecurityPolicy = isProd && process.env.DISABLE_CSP !== 'true'
    ? {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "img-src": ["'self'", "data:", "blob:"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "connect-src": ["'self'"]
        }
    }
    : false;
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy
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
if (isProd && !process.env.CORS_ORIGINS) {
    logger.warn('生产环境未配置 CORS_ORIGINS，将拒绝带 Origin 的跨域请求');
    corsOptions.origin = (ctx) => ctx.get('Origin') ? false : '*';
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
const storageRoot = path.join(__dirname, '../storage');
app.use(async (ctx, next) => {
    await next();
    if (ctx.status < 400 && ctx.body && ctx.path.endsWith('.apk')) {
        ctx.type = 'application/vnd.android.package-archive';
        ctx.set('Content-Disposition', `attachment; filename="${path.basename(ctx.path)}"`);
    }
});
publicStorageDirs.forEach((dir) => {
    app.use(mount(`/storage/${dir}`, serve(path.join(storageRoot, dir), {
        maxage: 86400000, // 缓存一天
        gzip: true
    })));
});

// 路由
const apiRouter = require('./routes/index');

// 健康检查接口
// 数据库不可用时必须返回 503：之前恒返回 200 + status:'ok'，只把断连写在
// database 字段里，任何按状态码判活的探针（K8s httpGet、docker HEALTHCHECK）
// 都会认为服务正常，故障期间流量继续被打进来。
apiRouter.get('/health', async (ctx) => {
    const dbConnected = await DbService.checkConnection();
    ctx.status = dbConnected ? 200 : 503;
    ctx.body = {
        status: dbConnected ? 'ok' : 'unavailable',
        uptime: process.uptime(),
        timestamp: Date.now(),
        database: dbConnected ? 'connected' : 'disconnected',
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
//
// 必须先 await 数据库就绪再 listen。之前 DbService.init() 没有 await，
// listen 紧接着同步执行，而 init 最多重试 10 次 × 5 秒，
// 期间端口已经打开、请求进得来但每一个都因为库不可用而失败。
const start = async () => {
    await DbService.init();
    startCleanupJobs();

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
        console.log(`[启动] 反向代理转发头: ${trustProxy ? `信任最后 ${app.maxIpsCount} 跳` : '不信任（TRUST_PROXY 未开启）'}`);
        console.log('');
    });
};

start().catch((err) => {
    console.error('[启动失败]', err.message);
    process.exit(1);
});

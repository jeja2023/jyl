const ratelimit = require('koa-ratelimit');
const logger = require('./logger');
const { getClientIp } = require('./clientIp');

/**
 * 限流器封装，解决原先直接用 koa-ratelimit 的两个问题：
 *
 * 1. 内存驱动的 Map 只在 key 被再次访问时判断过期，从不主动删除，
 *    每个访问过的 IP 都会永久驻留，长期运行相当于内存泄漏。
 * 2. 内存计数是每个进程独立的，多实例部署时实际限额会被放大 N 倍。
 *    配置 REDIS_URL 后改用 Redis 计数，多个实例共享同一份限额。
 */

const SWEEP_INTERVAL_MS = parseInt(process.env.RATE_LIMIT_SWEEP_MS || '60000', 10);

const memoryStores = new Set();
let sweepTimer = null;
let redisClient = null;
let redisResolved = false;

/** 清掉已过期的计数条目，避免 Map 无界增长 */
const sweepMemoryStores = () => {
    const nowSeconds = Date.now() / 1000;
    for (const store of memoryStores) {
        for (const [key, entry] of store) {
            if (!entry || typeof entry.reset !== 'number' || entry.reset < nowSeconds) {
                store.delete(key);
            }
        }
    }
};

const ensureSweeper = () => {
    if (sweepTimer) return;
    sweepTimer = setInterval(sweepMemoryStores, SWEEP_INTERVAL_MS);
    // 清理任务不应该拖住进程退出
    if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
};

/**
 * 只在配置了 REDIS_URL 时才加载 ioredis。
 * 单实例部署不需要 Redis，因此它是可选依赖而非必装依赖。
 */
const getRedisClient = () => {
    if (redisResolved) return redisClient;
    redisResolved = true;

    const url = process.env.REDIS_URL;
    if (!url) return null;

    try {
        const Redis = require('ioredis');
        redisClient = new Redis(url);
        redisClient.on('error', (err) => {
            logger.warn('限流 Redis 连接异常', { message: err.message });
        });
        logger.info('限流使用 Redis 驱动，多实例共享限额');
    } catch (err) {
        logger.error(
            '已配置 REDIS_URL 但缺少 ioredis 依赖，限流回退到单进程内存驱动。请执行 npm i ioredis',
            { message: err.message }
        );
        redisClient = null;
    }

    return redisClient;
};

/**
 * 限流计数的默认 key。
 *
 * 必须走 getClientIp（也就是 ctx.ip），它由 app.proxy / app.maxIpsCount 裁决。
 * 千万不要在这里读 x-forwarded-for 之类的头：那等于让调用方自己指定计数桶，
 * 每次换一个值就是一份全新的额度，登录爆破和验证码限流全部形同虚设。
 */
const defaultRateLimitId = (ctx) => getClientIp(ctx);

/**
 * 创建一个限流中间件
 * @param {object} options duration(ms)、max、errorMessage、id
 */
const createRateLimiter = ({ duration, max, errorMessage, id }) => {
    const base = {
        duration,
        max,
        errorMessage,
        id: id || defaultRateLimitId,
        disableHeader: false
    };

    const client = getRedisClient();
    if (client) {
        return ratelimit({ ...base, driver: 'redis', db: client });
    }

    const store = new Map();
    memoryStores.add(store);
    ensureSweeper();

    return ratelimit({ ...base, driver: 'memory', db: store });
};

module.exports = { createRateLimiter, defaultRateLimitId, sweepMemoryStores, memoryStores };

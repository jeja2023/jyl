const User = require('../models/User');

/**
 * 认证中间件每个请求都要取一次用户的角色，之前是每请求一条 SELECT。
 * 这里加一层很短的进程内缓存：TTL 只有几十秒，改角色/改密后最多滞后一个 TTL，
 * 涉及权限变更的写入路径会主动调用 invalidate 立即失效。
 */

const TTL_MS = parseInt(process.env.USER_CACHE_TTL_MS || '30000', 10);
const MAX_ENTRIES = parseInt(process.env.USER_CACHE_MAX || '5000', 10);
const ATTRIBUTES = ['id', 'username', 'phone', 'role', 'nickname', 'tokenInvalidBefore'];

const cache = new Map();

const now = () => Date.now();

const toPlain = (user) => ({
    id: user.id,
    username: user.username || user.phone,
    role: user.role,
    nickname: user.nickname,
    tokenInvalidBefore: user.tokenInvalidBefore ? new Date(user.tokenInvalidBefore).getTime() : null
});

/** 缓存上限用最简单的 FIFO 淘汰，避免长期运行后无界增长 */
const evictIfNeeded = () => {
    if (cache.size <= MAX_ENTRIES) return;
    const overflow = cache.size - MAX_ENTRIES;
    let removed = 0;
    for (const key of cache.keys()) {
        cache.delete(key);
        removed += 1;
        if (removed >= overflow) break;
    }
};

/**
 * 取认证所需的用户信息，命中缓存时不查库
 * @returns {Promise<object|null>} 用户不存在时返回 null
 */
const getAuthUser = async (id) => {
    if (id === undefined || id === null) return null;

    const key = String(id);
    const hit = cache.get(key);
    if (hit && hit.expireAt > now()) {
        return hit.value;
    }

    const user = await User.findByPk(id, { attributes: ATTRIBUTES });
    const value = user ? toPlain(user) : null;

    cache.set(key, { value, expireAt: now() + TTL_MS });
    evictIfNeeded();

    return value;
};

/** 角色、账号状态变更后立即失效，不必等 TTL */
const invalidate = (id) => {
    if (id === undefined || id === null) return;
    cache.delete(String(id));
};

const clear = () => cache.clear();

module.exports = { getAuthUser, invalidate, clear, TTL_MS };

const jwt = require('jsonwebtoken');
const Response = require('../utils/response');
const { getAuthUser } = require('../utils/userCache');

/**
 * 判断令牌是否早于用户的失效基线（登出、改密会推进该基线）。
 *
 * 优先用自带的毫秒级签发戳 iatMs 精确比较：标准 iat 只有秒精度，
 * 登录后同一秒内登出的话，秒级比较会把已登出的令牌判为有效。
 * 老令牌没有 iatMs，退回秒级比较，并保留同秒容忍避免误杀。
 */
const isTokenRevoked = (decoded, user) => {
    if (!user?.tokenInvalidBefore) return false;

    if (typeof decoded?.iatMs === 'number') {
        return decoded.iatMs < user.tokenInvalidBefore;
    }

    if (!decoded?.iat) return false;
    return decoded.iat < Math.floor(user.tokenInvalidBefore / 1000);
};

/**
 * JWT 认证中间件
 */
const authMiddleware = async (ctx, next) => {
    const authHeader = ctx.header.authorization || '';
    const [scheme, credentials] = authHeader.split(' ');
    const token = /^Bearer$/i.test(scheme) ? credentials : null;

    if (!token) {
        return Response.error(ctx, '未提供认证令牌', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 取用户信息（含角色），带短 TTL 进程内缓存，避免每请求一条 SELECT
        const user = await getAuthUser(decoded.id);

        if (!user) {
            return Response.error(ctx, '用户不存在', 401);
        }

        if (isTokenRevoked(decoded, user)) {
            return Response.error(ctx, '登录状态已失效，请重新登录', 401);
        }

        ctx.state.user = user;
    } catch (err) {
        console.error('[认证失败]', err.message);
        if (err.name === 'TokenExpiredError') {
            return Response.error(ctx, '令牌已过期', 401);
        }
        return Response.error(ctx, '无效的令牌', 401);
    }

    await next();
};

const adminMiddleware = async (ctx, next) => {
    if (ctx.state.user?.role !== 'admin') {
        return Response.error(ctx, '需要管理员权限', 403);
    }
    await next();
};

/**
 * 可选认证中间件 (如果带了Token则解析，没带也放行)
 * 需要连带取出角色：百科详情等接口靠 ctx.state.user.role 判断管理员，
 * 只放 id 会让管理员分支永远走不到。
 */
const optionalAuth = async (ctx, next) => {
    const token = ctx.header.authorization ? ctx.header.authorization.split(' ')[1] : null;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await getAuthUser(decoded.id);
            if (user && !isTokenRevoked(decoded, user)) {
                ctx.state.user = user;
            }
        } catch (err) {
            // 可选认证：令牌无效就当作未登录继续放行，不需要处理
        }
    }
    await next();
};

module.exports = authMiddleware;
module.exports.admin = adminMiddleware;
module.exports.optional = optionalAuth;
module.exports.isTokenRevoked = isTokenRevoked;

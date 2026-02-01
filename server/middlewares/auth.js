const jwt = require('jsonwebtoken');
const Response = require('../utils/response');

/**
 * JWT 认证中间件
 */
const authMiddleware = async (ctx, next) => {
    const token = ctx.header.authorization ? ctx.header.authorization.split(' ')[1] : null;

    if (!token) {
        return Response.error(ctx, '未提供认证令牌', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ctx.state.user = decoded; // 将用户信息挂载到 ctx.state
        await next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return Response.error(ctx, '令牌已过期', 401);
        }
        return Response.error(ctx, '无效的令牌', 401);
    }
};

module.exports = authMiddleware;

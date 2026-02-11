const jwt = require('jsonwebtoken');
const Response = require('../utils/response');
const User = require('../models/User');

/**
 * JWT 认证中间件
 * 优先从 Token 解析用户信息，减少数据库查询
 * 仅在必要时（如 Token 中无角色信息的旧 Token）才查库
 */
const authMiddleware = async (ctx, next) => {
    const token = ctx.header.authorization ? ctx.header.authorization.split(' ')[1] : null;

    if (!token) {
        return Response.error(ctx, '未提供认证令牌', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 优先使用 Token 中的完整信息（新版 Token 携带 role/nickname）
        if (decoded.role) {
            ctx.state.user = {
                id: decoded.id,
                username: decoded.username,
                role: decoded.role,
                nickname: decoded.nickname
            };
        } else {
            // 兼容旧 Token：从数据库获取用户信息
            const user = await User.findByPk(decoded.id, {
                attributes: ['id', 'username', 'phone', 'role', 'nickname']
            });

            if (!user) {
                return Response.error(ctx, '用户不存在', 401);
            }

            ctx.state.user = {
                id: user.id,
                username: user.username || user.phone,
                role: user.role,
                nickname: user.nickname
            };
        }
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return Response.error(ctx, '令牌已过期', 401);
        }
        return Response.error(ctx, '无效的令牌', 401);
    }

    await next();
};

/**
 * 管理员权限中间件
 */
const adminMiddleware = async (ctx, next) => {
    if (ctx.state.user?.role !== 'admin') {
        return Response.error(ctx, '需要管理员权限', 403);
    }
    await next();
};

/**
 * 可选认证中间件 (如果带了Token则解析，没带也放行)
 */
const optionalAuth = async (ctx, next) => {
    const token = ctx.header.authorization ? ctx.header.authorization.split(' ')[1] : null;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            ctx.state.user = {
                id: decoded.id,
                role: decoded.role
            };
        } catch (err) { }
    }
    await next();
};

module.exports = authMiddleware;
module.exports.admin = adminMiddleware;
module.exports.optional = optionalAuth;

const jwt = require('jsonwebtoken');
const Response = require('../utils/response');
const User = require('../models/User');

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

        // 从数据库获取完整用户信息（包括角色）
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
    } catch (err) {
        console.error('[认证失败]', err.message, 'Token:', token);
        if (err.name === 'TokenExpiredError') {
            return Response.error(ctx, '令牌已过期', 401);
        }
        return Response.error(ctx, '无效的令牌', 401);
    }

    await next();
};

/**
 * 管理员权限中间件（需配合 authMiddleware 使用）
 */
const adminMiddleware = async (ctx, next) => {
    if (ctx.state.user?.role !== 'admin') {
        return Response.error(ctx, '需要管理员权限', 403);
    }
    await next();
};

module.exports = authMiddleware;
module.exports.admin = adminMiddleware;

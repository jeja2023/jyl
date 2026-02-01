const Response = require('../utils/response');

/**
 * 全局错误处理中间件
 */
const errorHandler = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.error('❌ 服务器错误:', err);

        // 处理不同类型的错误
        if (err.name === 'SequelizeValidationError') {
            return Response.error(ctx, err.errors[0].message, 400);
        }

        if (err.name === 'SequelizeUniqueConstraintError') {
            return Response.error(ctx, '数据已存在', 400);
        }

        Response.error(ctx, err.message || '服务器内部错误', err.status || 500);
    }
};

module.exports = errorHandler;

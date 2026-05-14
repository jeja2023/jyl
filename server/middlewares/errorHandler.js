const Response = require('../utils/response');
const logger = require('../utils/logger');

const errorHandler = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        const status = err.status || err.statusCode || 500;
        const requestId = ctx.state?.requestId;

        logger.error(`[${ctx.method}] ${ctx.url} failed`, {
            message: err.message,
            stack: err.stack?.split('\n').slice(0, 3).join(' | '),
            requestId,
            status
        });

        if (err.name === 'SequelizeValidationError') {
            return Response.error(ctx, err.errors[0].message, 400, { requestId });
        }

        if (err.name === 'SequelizeUniqueConstraintError') {
            return Response.error(ctx, '数据已存在', 400, { requestId });
        }

        if (err.name === 'SequelizeDatabaseError' && err.message.includes('Unknown column')) {
            return Response.error(ctx, '数据库结构不匹配，请执行迁移或同步表结构', 500, { requestId });
        }

        if (status >= 500 && process.env.NODE_ENV === 'production') {
            return Response.error(ctx, '服务器内部错误', 500, { requestId });
        }

        return Response.error(ctx, err.message || '服务器内部错误', status, { requestId });
    }
};

module.exports = errorHandler;

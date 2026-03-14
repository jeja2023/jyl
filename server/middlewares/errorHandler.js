const Response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 全局错误处理中间件
 */
const errorHandler = async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        logger.error(`[${ctx.method}] ${ctx.url} - 服务器错误`, { 
            message: err.message, 
            stack: err.stack?.split('\n').slice(0, 3).join(' | '), // 记录前3行堆栈
            requestId: ctx.state?.requestId
        });

        // 处理不同类型的错误
        if (err.name === 'SequelizeValidationError') {
            return Response.error(ctx, err.errors[0].message, 400);
        }

        if (err.name === 'SequelizeUniqueConstraintError') {
            return Response.error(ctx, '数据已存在', 400);
        }

        // 捕获数据库字段缺失错误 (SequelizeDatabaseError: Unknown column '...')
        if (err.name === 'SequelizeDatabaseError' && err.message.includes('Unknown column')) {
            return Response.error(ctx, `数据库结构不匹配，请尝试重启 Docker 容器或手动同步数据库 (${err.message})`, 500);
        }

        Response.error(ctx, err.message || '服务器内部错误', err.status || 500);
    }
};

module.exports = errorHandler;

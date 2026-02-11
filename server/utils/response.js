/**
 * 统一响应处理工具
 */
class Response {
    static success(ctx, data = null, message = '操作成功') {
        ctx.status = 200;
        ctx.body = {
            code: 200,
            data,
            message
        };
    }

    static error(ctx, message = '操作失败', code = 400, data = null) {
        ctx.status = code >= 100 && code < 600 ? code : 500;
        ctx.body = {
            code,
            message,
            data
        };
    }
}

module.exports = Response;

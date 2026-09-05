const ActionLog = require('../models/ActionLog');
const { getClientIp } = require('./clientIp');

/**
 * 记录用户操作日志
 * @param {Object} ctx Koa 上下文
 * @param {String} action 动作描述
 * @param {String} module 模块名称
 * @param {String} content 详细内容
 * @param {String} status 状态
 * @param {Object} explicitUser 可选，显式传入的用户信息 { id, username }。
 *        传了就完全以它为准（包括 id 为 null 的情况）——注销账号这类场景需要
 *        把日志记成匿名，不能再回退到 ctx.state.user 里那个已被删除的 ID。
 */
const logAction = async (ctx, action, module, content = '', status = 'success', explicitUser = null) => {
    try {
        const userId = explicitUser
            ? (explicitUser.id ?? null)
            : (ctx.state.user?.id ?? null);
        const username = explicitUser
            ? (explicitUser.username || explicitUser.nickname || '未知用户')
            : (ctx.state.user?.username || ctx.state.user?.nickname || '未知用户');

        // 统一走 clientIp：之前优先读 x-real-ip / x-forwarded-for，
        // 这两个头客户端随便填，审计日志里的来源地址等于对方说了算
        const ip = getClientIp(ctx);

        await ActionLog.create({
            userId,
            username,
            action,
            module,
            content: typeof content === 'object' ? JSON.stringify(content) : content,
            ip,
            status
        });
    } catch (err) {
        console.error('[ActionLog Error]', err.message);
    }
};

module.exports = { logAction };

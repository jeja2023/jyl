const ActionLog = require('../models/ActionLog');

/**
 * 记录用户操作日志
 * @param {Object} ctx Koa 上下文
 * @param {String} action 动作描述
 * @param {String} module 模块名称
 * @param {String} content 详细内容
 * @param {String} status 状态
 * @param {Object} explicitUser 可选，显示传入的用户信息 { id, username }
 */
const logAction = async (ctx, action, module, content = '', status = 'success', explicitUser = null) => {
    try {
        const userId = explicitUser?.id || ctx.state.user?.id || null;
        const username = explicitUser?.username || explicitUser?.nickname || ctx.state.user?.username || ctx.state.user?.nickname || '未知用户';
        
        // 更健壮的 IP 获取
        const ip = ctx.header['x-real-ip'] || 
                   ctx.header['x-forwarded-for']?.split(',')[0] || 
                   ctx.ip || 
                   ctx.socket.remoteAddress || 
                   'unknown';

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

const CheckupReminder = require('../models/CheckupReminder');
const Response = require('../utils/response');
const { suggestForUser } = require('../services/CheckupService');

class CheckupController {
    static async create(ctx) {
        const { date, note } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!date) return Response.error(ctx, '请选择复查日期', 400);

        const reminder = await CheckupReminder.create({
            date,
            note,
            UserId: userId
        });

        Response.success(ctx, reminder, '复查提醒已添加');
    }

    static async list(ctx) {
        const userId = ctx.state.user.id;
        const list = await CheckupReminder.findAll({
            where: { UserId: userId },
            order: [['date', 'ASC']]
        });
        Response.success(ctx, list);
    }

    static async complete(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        const result = await CheckupReminder.update(
            { isCompleted: true },
            { where: { id, UserId: userId } }
        );
        if (!result[0]) return Response.error(ctx, '记录不存在或无权操作', 404);
        Response.success(ctx, null, '已标记完成');
    }

    static async delete(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        const result = await CheckupReminder.destroy({ where: { id, UserId: userId } });
        if (!result) return Response.error(ctx, '记录不存在或无权操作', 404);
        Response.success(ctx, null, '删除成功');
    }

    static async suggest(ctx) {
        const userId = ctx.state.user.id;
        const result = await suggestForUser(userId, ctx.query.memberId || null);
        Response.success(ctx, result, '智能建议已生成');
    }

    static async generate(ctx) {
        const userId = ctx.state.user.id;
        const { memberId } = ctx.request.body || {};
        const suggestion = await suggestForUser(userId, memberId || null);
        const existing = await CheckupReminder.findOne({
            where: {
                UserId: userId,
                date: suggestion.nextDate,
                isCompleted: false
            }
        });

        if (existing) {
            return Response.success(ctx, { suggestion, reminder: existing, created: false }, '复查提醒已存在');
        }

        const reminder = await CheckupReminder.create({
            date: suggestion.nextDate,
            note: suggestion.note,
            UserId: userId
        });

        Response.success(ctx, { suggestion, reminder, created: true }, '复查提醒已生成');
    }
}

module.exports = CheckupController;

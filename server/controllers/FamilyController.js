const FamilyMember = require('../models/FamilyMember');
const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');
const { logAction } = require('../utils/actionLog');

class FamilyController {
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const list = await FamilyMember.findAll({
            where: { UserId: userId },
            order: [['createdAt', 'ASC']]
        });
        Response.success(ctx, list);
    }

    static async create(ctx) {
        const userId = ctx.state.user.id;
        const data = ctx.request.body;
        const name = String(data.name || '').trim();
        if (!name) return Response.error(ctx, '请填写成员姓名');

        const member = await FamilyMember.create({
            ...data,
            name,
            UserId: userId
        });
        Response.success(ctx, member, '成员已添加');
        logAction(ctx, '新增家庭成员', '家庭管理', `新增成员：${member.name}`);
    }

    static async update(ctx) {
        const userId = ctx.state.user.id;
        const { id, UserId, ...payload } = ctx.request.body;
        if (!id) return Response.error(ctx, '缺少成员ID');

        const member = await FamilyMember.findOne({ where: { id, UserId: userId } });
        if (!member) return Response.error(ctx, '成员不存在', 404);

        if (payload.name !== undefined) {
            const name = String(payload.name || '').trim();
            if (!name) return Response.error(ctx, '请填写成员姓名');
            payload.name = name;
        }

        await member.update(payload);
        Response.success(ctx, member, '成员已更新');
        logAction(ctx, '更新家庭成员', '家庭管理', `更新成员：${member.name}`);
    }

    static async delete(ctx) {
        const userId = ctx.state.user.id;
        const { id } = ctx.request.body;
        if (!id) return Response.error(ctx, '缺少成员ID');

        const member = await FamilyMember.findOne({ where: { id, UserId: userId } });
        if (!member) return Response.error(ctx, '成员不存在', 404);

        const affected = await HealthRecord.update(
            { memberId: null },
            { where: { UserId: userId, memberId: id } }
        );

        await member.destroy();
        Response.success(ctx, { clearedRecords: affected?.[0] || 0 }, '成员已删除');
        logAction(ctx, '删除家庭成员', '家庭管理', `删除成员：${member.name}`);
    }
}

module.exports = FamilyController;

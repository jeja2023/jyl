const MedicationPlan = require('../models/MedicationPlan');
const Response = require('../utils/response');
const { logAction } = require('../utils/actionLog');

class MedicationController {
    // 新增服药计划
    static async create(ctx) {
        const data = ctx.request.body;
        const userId = ctx.state.user.id;

        const plan = await MedicationPlan.create({
            ...data,
            UserId: userId
        });

        Response.success(ctx, plan, '服药计划已添加');
        logAction(ctx, '添加用药计划', '用药管理', `用户添加了药品: ${data.medicineName}`);
    }

    // 获取用户计划列表
    static async list(ctx) {
        const userId = ctx.state.user.id;

        const list = await MedicationPlan.findAll({
            where: { UserId: userId },
            order: [['takeTime', 'ASC']]
        });

        Response.success(ctx, list);
    }

    // 更新计划状态 (开启/关闭)
    static async toggle(ctx) {
        const { id, isActive } = ctx.request.body;
        const userId = ctx.state.user.id;

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.isActive = isActive;
        await plan.save();

        Response.success(ctx, null, '状态已更新');
        logAction(ctx, '切换用药状态', '用药管理', `用户将药品 ${plan.medicineName} 状态设为: ${isActive ? '开启' : '关闭'}`);
    }

    // 服药打卡
    static async take(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        const today = new Date().toISOString().split('T')[0];

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.lastTakenDate = today;
        await plan.save();

        Response.success(ctx, { lastTakenDate: today }, '已确认服药');
        logAction(ctx, '服药打卡', '用药管理', `用户确认服用了药品: ${plan.medicineName}`);
    }

    // 更新计划信息
    static async update(ctx) {
        const { id, medicineName, dosage, takeTime, notes } = ctx.request.body;
        const userId = ctx.state.user.id;

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.medicineName = medicineName;
        plan.dosage = dosage;
        plan.takeTime = takeTime;
        plan.notes = notes;

        await plan.save();

        Response.success(ctx, plan, '计划已更新');
        logAction(ctx, '修改用药计划', '用药管理', `用户修改了药品 ${plan.medicineName} 的详情`);
    }

    // 删除计划
    static async delete(ctx) {
        const { id } = ctx.query;
        const userId = ctx.state.user.id;

        const result = await MedicationPlan.destroy({
            where: { id, UserId: userId }
        });

        if (result) {
            Response.success(ctx, null, '计划已删除');
            logAction(ctx, '删除用药计划', '用药管理', `用户删除了一个服药计划`);
        } else {
            Response.error(ctx, '删除失败或计划不存在', 404);
        }
    }
}

module.exports = MedicationController;

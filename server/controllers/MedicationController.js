const MedicationPlan = require('../models/MedicationPlan');
const Response = require('../utils/response');

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
        } else {
            Response.error(ctx, '删除失败或计划不存在', 404);
        }
    }
}

module.exports = MedicationController;

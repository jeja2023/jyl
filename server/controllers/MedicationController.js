const MedicationPlan = require('../models/MedicationPlan');
const Response = require('../utils/response');

class MedicationController {
    /**
     * 新增服药计划
     * POST /api/medication/add
     */
    static async create(ctx) {
        const { medicineName, dosage, takeTime, notes } = ctx.request.body;
        const userId = ctx.state.user.id;

        // 参数校验
        if (!medicineName || !medicineName.trim()) {
            return Response.error(ctx, '请输入药品名称');
        }
        if (!dosage || !dosage.trim()) {
            return Response.error(ctx, '请输入服用剂量');
        }
        if (!takeTime) {
            return Response.error(ctx, '请选择服药时间');
        }

        const plan = await MedicationPlan.create({
            medicineName: medicineName.trim(),
            dosage: dosage.trim(),
            takeTime,
            notes: notes || null,
            UserId: userId
        });

        Response.success(ctx, plan, '服药计划已添加');
    }

    /**
     * 获取用户计划列表
     * GET /api/medication/list
     */
    static async list(ctx) {
        const userId = ctx.state.user.id;

        const list = await MedicationPlan.findAll({
            where: { UserId: userId },
            order: [['takeTime', 'ASC']]
        });

        Response.success(ctx, list);
    }

    /**
     * 更新计划状态 (开启/关闭)
     * POST /api/medication/toggle
     */
    static async toggle(ctx) {
        const { id, isActive } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!id) {
            return Response.error(ctx, '计划ID不能为空');
        }

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.isActive = isActive;
        await plan.save();

        Response.success(ctx, null, '状态已更新');
    }

    /**
     * 服药打卡
     * POST /api/medication/take
     */
    static async take(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        const today = new Date().toISOString().split('T')[0];

        if (!id) {
            return Response.error(ctx, '计划ID不能为空');
        }

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.lastTakenDate = today;
        await plan.save();

        Response.success(ctx, { lastTakenDate: today }, '已确认服药');
    }

    /**
     * 更新计划信息
     * PUT /api/medication/:id
     */
    static async update(ctx) {
        const { id } = ctx.params;
        const { medicineName, dosage, takeTime, notes } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!id) {
            return Response.error(ctx, '计划ID不能为空');
        }

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.medicineName = medicineName || plan.medicineName;
        plan.dosage = dosage || plan.dosage;
        plan.takeTime = takeTime || plan.takeTime;
        plan.notes = notes !== undefined ? notes : plan.notes;

        await plan.save();

        Response.success(ctx, plan, '计划已更新');
    }

    /**
     * 删除计划
     * DELETE /api/medication/:id
     */
    static async delete(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        if (!id) {
            return Response.error(ctx, '计划ID不能为空');
        }

        const result = await MedicationPlan.destroy({
            where: { id, UserId: userId }
        });

        if (result) {
            Response.success(ctx, null, '计划已删除');
        } else {
            return Response.error(ctx, '删除失败或计划不存在', 404);
        }
    }
}

module.exports = MedicationController;

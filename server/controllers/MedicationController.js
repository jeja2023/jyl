const MedicationPlan = require('../models/MedicationPlan');
const MedicationLog = require('../models/MedicationLog');
const Response = require('../utils/response');
const { logAction } = require('../utils/actionLog');
const { calculateStats } = require('../services/MedicationService');

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
        
        // 使用本地日期而非 UTC 日期，确保跨越午夜后能立即打卡
        const date = new Date();
        const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.lastTakenDate = today;
        await plan.save();

        await MedicationLog.findOrCreate({
            where: { UserId: userId, MedicationPlanId: plan.id, date: today },
            defaults: { takenAt: new Date() }
        });

        Response.success(ctx, { lastTakenDate: today }, '已确认服药');
        logAction(ctx, '服药打卡', '用药管理', `用户确认服用了药品: ${plan.medicineName}`);
    }

    // 服药依从性统计
    static async stats(ctx) {
        const userId = ctx.state.user.id;
        const days = parseInt(ctx.query.days || '7', 10);
        const result = await calculateStats(userId, Math.max(1, Math.min(days, 60)));
        Response.success(ctx, result);
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
        const id = ctx.query.id || ctx.params.id || (ctx.request.body && ctx.request.body.id);
        const userId = ctx.state.user.id;

        if (!id) {
            return Response.error(ctx, '缺少必要的参数 id', 400);
        }

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在或无权操作', 404);
        }

        try {
            await MedicationLog.destroy({ where: { MedicationPlanId: id } });
            await plan.destroy();

            Response.success(ctx, null, '计划已删除');
            logAction(ctx, '删除用药计划', '用药管理', `用户删除了服药计划: ${plan.medicineName}`);
        } catch (err) {
            console.error('[删除计划错误]', err);
            Response.error(ctx, '服务器内部错误，删除失败');
        }
    }
}

module.exports = MedicationController;

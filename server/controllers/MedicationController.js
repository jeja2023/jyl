const MedicationPlan = require('../models/MedicationPlan');
const MedicationLog = require('../models/MedicationLog');
const MedicationAdjustment = require('../models/MedicationAdjustment');
const Response = require('../utils/response');
const { logAction } = require('../utils/actionLog');
const { calculateStats } = require('../services/MedicationService');
const { Op } = require('sequelize');

const dateToStr = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const combineDateTime = (date, time) => {
    const safeTime = /^\d{2}:\d{2}/.test(String(time || '')) ? String(time).slice(0, 5) : '08:00';
    return new Date(`${date}T${safeTime}:00`);
};

class MedicationController {
    // 新增服药计划
    static async create(ctx) {
        const data = ctx.request.body;
        const userId = ctx.state.user.id;

        const plan = await MedicationPlan.create({
            ...data,
            UserId: userId
        });
        await MedicationAdjustment.create({
            adjustmentDate: new Date().toISOString().split('T')[0],
            medicineName: plan.medicineName,
            fromDosage: null,
            toDosage: plan.dosage,
            reason: data.adjustReason || '新增用药计划',
            UserId: userId,
            MedicationPlanId: plan.id
        }).catch(err => console.warn('[剂量调整记录失败]', err.message));

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

    static async adjustments(ctx) {
        const userId = ctx.state.user.id;
        const { planId, limit = 20 } = ctx.query;
        const where = { UserId: userId };
        if (planId) where.MedicationPlanId = planId;
        const list = await MedicationAdjustment.findAll({
            where,
            order: [['adjustmentDate', 'DESC'], ['createdAt', 'DESC']],
            limit: Math.min(parseInt(limit, 10) || 20, 100)
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
        const today = dateToStr(new Date());

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        plan.lastTakenDate = today;
        await plan.save();

        await MedicationLog.findOrCreate({
            where: { UserId: userId, MedicationPlanId: plan.id, date: today },
            defaults: {
                takenAt: new Date(),
                source: 'normal',
                medicineNameSnapshot: plan.medicineName,
                dosageSnapshot: plan.dosage
            }
        });

        Response.success(ctx, { lastTakenDate: today }, '已确认服药');
        logAction(ctx, '服药打卡', '用药管理', `用户确认服用了药品: ${plan.medicineName}`);
    }

    static async makeup(ctx) {
        const { id, date, takenTime, note } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!id || !isDateOnly(date)) {
            return Response.error(ctx, '请选择补签药品和日期', 400);
        }

        const today = dateToStr(new Date());
        const makeupDate = new Date(`${date}T00:00:00`);
        const todayDate = new Date(`${today}T00:00:00`);
        const diffDays = Math.floor((todayDate - makeupDate) / (24 * 3600 * 1000));
        if (diffDays < 0) {
            return Response.error(ctx, '不能补签未来日期', 400);
        }
        if (diffDays > 30) {
            return Response.error(ctx, '最多支持补签最近30天', 400);
        }

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        const planCreated = new Date(plan.createdAt);
        planCreated.setHours(0, 0, 0, 0);
        if (makeupDate < planCreated) {
            return Response.error(ctx, '补签日期早于该用药计划创建时间', 400);
        }

        const takenAt = combineDateTime(date, takenTime || plan.takeTime);
        const [log, created] = await MedicationLog.findOrCreate({
            where: { UserId: userId, MedicationPlanId: plan.id, date },
            defaults: {
                takenAt,
                source: date === today ? 'normal' : 'makeup',
                note: note || null,
                medicineNameSnapshot: plan.medicineName,
                dosageSnapshot: plan.dosage
            }
        });

        if (!created) {
            log.takenAt = takenAt;
            log.source = date === today && log.source === 'normal' ? 'normal' : 'makeup';
            log.note = note || log.note;
            log.medicineNameSnapshot = log.medicineNameSnapshot || plan.medicineName;
            log.dosageSnapshot = log.dosageSnapshot || plan.dosage;
            await log.save();
        }

        if (date >= (plan.lastTakenDate || '')) {
            plan.lastTakenDate = date;
            await plan.save();
        }

        Response.success(ctx, log, created ? '补签成功' : '已更新补签记录');
        logAction(ctx, '服药补签', '用药管理', `用户补签了 ${date} 的药品: ${plan.medicineName}`);
    }

    static async logs(ctx) {
        const userId = ctx.state.user.id;
        const days = Math.min(parseInt(ctx.query.days || '14', 10) || 14, 90);
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        const start = new Date(end.getTime() - (days - 1) * 24 * 3600 * 1000);

        const logs = await MedicationLog.findAll({
            where: {
                UserId: userId,
                date: { [Op.between]: [dateToStr(start), dateToStr(end)] }
            },
            include: [{ model: MedicationPlan, attributes: ['id', 'medicineName', 'dosage', 'takeTime', 'isActive'] }],
            order: [['date', 'DESC'], ['takenAt', 'DESC']]
        });
        Response.success(ctx, logs);
    }

    // 服药统计 (有一天算一天)
    static async stats(ctx) {
        const userId = ctx.state.user.id;
        // 如果客户端未传 days，默认为 0，表示从头开始算
        const days = parseInt(ctx.query.days || '0', 10);
        const result = await calculateStats(userId, days);
        Response.success(ctx, result);
    }

    // 更新计划信息
    static async update(ctx) {
        const { id, medicineName, dosage, takeTime, notes, adjustReason } = ctx.request.body;
        const userId = ctx.state.user.id;

        const plan = await MedicationPlan.findOne({ where: { id, UserId: userId } });
        if (!plan) {
            return Response.error(ctx, '计划不存在', 404);
        }

        const oldDosage = plan.dosage;
        const oldMedicineName = plan.medicineName;
        plan.medicineName = medicineName;
        plan.dosage = dosage;
        plan.takeTime = takeTime;
        plan.notes = notes;

        await plan.save();

        if (dosage && String(dosage) !== String(oldDosage)) {
            await MedicationAdjustment.create({
                adjustmentDate: new Date().toISOString().split('T')[0],
                medicineName: medicineName || oldMedicineName,
                fromDosage: oldDosage,
                toDosage: dosage,
                reason: adjustReason || '修改用药剂量',
                UserId: userId,
                MedicationPlanId: plan.id
            }).catch(err => console.warn('[剂量调整记录失败]', err.message));
        }

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
            await MedicationAdjustment.destroy({ where: { MedicationPlanId: id } });
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

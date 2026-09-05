const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');
const { analyzeRecord, parseRanges } = require('../utils/indicatorAnalysis');
const { buildDashboard, buildMonthlyInsights } = require('../services/InsightService');
const { loadOwnerProfile } = require('../services/OwnerProfileService');
const { resolveMemberScope, MEMBER, SELF } = require('../utils/memberScope');
const { Op } = require('sequelize');

class InsightController {
    static async dashboard(ctx) {
        const userId = ctx.state.user.id;
        // 不传 memberId 即"本人"，与前端首页现有调用保持兼容
        const result = await buildDashboard(userId, ctx.query.memberId);
        Response.success(ctx, result);
    }

    static async monthly(ctx) {
        const userId = ctx.state.user.id;
        const months = Math.min(parseInt(ctx.query.months || '6', 10), 24);
        const scope = resolveMemberScope(ctx.query.memberId);
        if (!scope.valid) {
            return Response.error(ctx, 'memberId 取值无效，应为家庭成员 ID、self 或 all', 400);
        }
        // 缺省是本人。传 memberId=all 才跨成员汇总（逐条记录按归属套各自的参考范围）
        const result = await buildMonthlyInsights(userId, months, ctx.query.memberId);
        Response.success(ctx, result);
    }

    static async analyzeRecord(ctx) {
        const userId = ctx.state.user.id;
        const { id } = ctx.params;
        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        // 用记录自己的归属取档案：本人分支过去只查了 patientType，
        // 自定义参考范围被丢掉，单条分析用的是系统默认范围
        const scope = record.memberId
            ? { mode: MEMBER, memberId: record.memberId }
            : { mode: SELF, memberId: null };
        const owner = await loadOwnerProfile(userId, scope);

        // "上一次记录"必须限定在同一归属内，否则趋势会拿家人的值当基线
        const previous = await HealthRecord.findOne({
            where: {
                UserId: userId,
                memberId: record.memberId || null,
                recordDate: { [Op.lt]: record.recordDate }
            },
            order: [['recordDate', 'DESC'], ['id', 'DESC']]
        });

        Response.success(ctx, analyzeRecord(
            record.toJSON(),
            parseRanges(owner?.referenceRanges),
            previous?.toJSON(),
            owner?.patientType || '其他'
        ));
    }
}

module.exports = InsightController;

const HealthRecord = require('../models/HealthRecord');
const FamilyMember = require('../models/FamilyMember');
const Response = require('../utils/response');
const { analyzeRecord, parseRanges } = require('../utils/indicatorAnalysis');
const { buildDashboard, buildMonthlyInsights } = require('../services/InsightService');

class InsightController {
    static async dashboard(ctx) {
        const userId = ctx.state.user.id;
        const result = await buildDashboard(userId);
        Response.success(ctx, result);
    }

    static async monthly(ctx) {
        const userId = ctx.state.user.id;
        const months = Math.min(parseInt(ctx.query.months || '6', 10), 24);
        const memberId = ctx.query.memberId ?? null;
        const result = await buildMonthlyInsights(userId, months, memberId);
        Response.success(ctx, result);
    }

    static async analyzeRecord(ctx) {
        const userId = ctx.state.user.id;
        const { id } = ctx.params;
        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        let customRanges = {};
        if (record.memberId) {
            const member = await FamilyMember.findOne({ where: { id: record.memberId, UserId: userId } });
            customRanges = parseRanges(member?.referenceRanges);
        }

        const previous = await HealthRecord.findOne({
            where: {
                UserId: userId,
                recordDate: { [require('sequelize').Op.lt]: record.recordDate }
            },
            order: [['recordDate', 'DESC']]
        });

        Response.success(ctx, analyzeRecord(record.toJSON(), customRanges, previous?.toJSON()));
    }
}

module.exports = InsightController;

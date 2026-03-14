const SymptomAssessment = require('../models/SymptomAssessment');
const { logAction } = require('../utils/actionLog');
const Response = require('../utils/response');

class AssessController {
    /**
     * 保存自测结果
     */
    static async saveAssessment(ctx) {
        const { id: UserId } = ctx.state.user;
        const { 
            totalScore, 
            resultLevel, 
            activityStatus, 
            hyperScore, 
            hypoScore, 
            categoryScores, 
            answers 
        } = ctx.request.body;

        try {
            const assessment = await SymptomAssessment.create({
                UserId,
                totalScore,
                resultLevel,
                activityStatus,
                hyperScore,
                hypoScore,
                categoryScores: typeof categoryScores === 'string' ? categoryScores : JSON.stringify(categoryScores),
                answers: typeof answers === 'string' ? answers : JSON.stringify(answers)
            });

            await logAction(ctx, '症状自测', '自测评估', `用户完成了症状自测，得分: ${totalScore}, 结果: ${resultLevel}`);

            Response.success(ctx, {
                id: assessment.id
            }, '评估结果已保存');
        } catch (err) {
            console.error('[Assess Save Error]', err);
            Response.error(ctx, '保存评估结果失败', 500, err.message);
        }
    }

    /**
     * 获取自测历史
     */
    static async getHistory(ctx) {
        const { id: UserId } = ctx.state.user;
        const { limit = 20, offset = 0 } = ctx.query;

        try {
            const { count, rows } = await SymptomAssessment.findAndCountAll({
                where: { UserId },
                limit: parseInt(limit),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']]
            });

            Response.success(ctx, {
                list: rows,
                total: count
            });
        } catch (err) {
            Response.error(ctx, '获取评估历史失败', 500, err.message);
        }
    }

    /**
     * 获取单次评估详情
     */
    static async getDetail(ctx) {
        const { id: UserId } = ctx.state.user;
        const { id } = ctx.params;

        try {
            const assessment = await SymptomAssessment.findOne({
                where: { id, UserId }
            });

            if (!assessment) {
                Response.error(ctx, '评估记录未找到', 404);
                return;
            }

            Response.success(ctx, assessment);
        } catch (err) {
            Response.error(ctx, '获取评估详情失败', 500, err.message);
        }
    }

    /**
     * 删除评估详情
     */
    static async deleteAssessment(ctx) {
        const { id: UserId } = ctx.state.user;
        const { id } = ctx.params;

        try {
            const deleted = await SymptomAssessment.destroy({
                where: { id, UserId }
            });

            if (deleted) {
                await logAction(ctx, '删除自测', '自测评估', `删除了症状自测记录 ID: ${id}`);
                Response.success(ctx, null, '记录已删除');
            } else {
                Response.error(ctx, '未找到待删除的记录', 404);
            }
        } catch (err) {
            Response.error(ctx, '删除记录失败', 500, err.message);
        }
    }
}

module.exports = AssessController;

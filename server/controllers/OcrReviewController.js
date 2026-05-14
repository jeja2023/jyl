const { Op } = require('sequelize');
const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');

const parseJson = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch (e) {
        return null;
    }
};

const isPendingReview = (ocrReview) => {
    const review = parseJson(ocrReview);
    if (!review) return false;
    return ['lab', 'ultrasound'].some(type => review[type] && !review[type].reviewed);
};

class OcrReviewController {
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const records = await HealthRecord.findAll({
            where: {
                UserId: userId,
                ocrReview: { [Op.ne]: null }
            },
            order: [['updatedAt', 'DESC']],
            limit: Math.min(parseInt(ctx.query.limit || '50', 10), 100)
        });

        const list = records
            .map(record => {
                const row = record.toJSON();
                row.ocrReview = parseJson(row.ocrReview);
                return row;
            })
            .filter(row => ctx.query.status === 'all' || isPendingReview(row.ocrReview));

        Response.success(ctx, list);
    }

    static async confirm(ctx) {
        const userId = ctx.state.user.id;
        const { id, type = 'lab', applied = null } = ctx.request.body || {};
        if (!id) return Response.error(ctx, '缺少记录ID', 400);
        if (!['lab', 'ultrasound'].includes(type)) return Response.error(ctx, '无效复核类型', 400);

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        const review = parseJson(record.ocrReview) || {};
        review[type] = {
            ...(review[type] || {}),
            reviewed: true,
            reviewedAt: new Date().toISOString(),
            applied: applied || review[type]?.applied || review[type]?.recognized || {}
        };

        await record.update({ ocrReview: JSON.stringify(review) });
        Response.success(ctx, review, 'OCR结果已确认');
    }
}

module.exports = OcrReviewController;

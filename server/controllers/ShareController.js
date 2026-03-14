const jwt = require('jsonwebtoken');
const HealthRecord = require('../models/HealthRecord');
const FamilyMember = require('../models/FamilyMember');
const Response = require('../utils/response');

class ShareController {
    // 生成分享链接
    static async createRecordShare(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        if (!id) return Response.error(ctx, '缺少记录ID');

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        const token = jwt.sign(
            { id: record.id, type: 'record' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.SHARE_EXPIRE || '7d' }
        );

        Response.success(ctx, { token }, '分享链接已生成');
    }

    // 获取分享数据（公开接口）
    static async getRecordShare(ctx) {
        const { token } = ctx.params;
        if (!token) return Response.error(ctx, '缺少分享令牌', 400);

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.type !== 'record') return Response.error(ctx, '无效分享令牌', 400);

            const record = await HealthRecord.findByPk(decoded.id, {
                include: [{ model: FamilyMember, attributes: ['id', 'name', 'relation'] }]
            });
            if (!record) return Response.error(ctx, '记录不存在', 404);

            const row = record.toJSON();
            // 公开分享只返回必要字段
            const allowedKeys = [
                'id', 'recordDate', 'TSH', 'FT3', 'FT4', 'T3', 'T4',
                'TPOAb', 'TGAb', 'TRAb', 'Tg', 'Calcitonin', 'Calcium', 'PTH',
                'thyroidLeft', 'thyroidRight', 'isthmus', 'noduleCount', 'noduleMaxSize',
                'noduleLocation', 'tiradsLevel', 'noduleFeatures', 'lymphNode',
                'ultrasoundNote', 'conclusion', 'ultrasoundDate', 'reportImage', 'ultrasoundImage',
                'FamilyMember'
            ];
            const result = {};
            allowedKeys.forEach(k => {
                if (row[k] !== undefined) result[k] = row[k];
            });
            Response.success(ctx, result);
        } catch (e) {
            return Response.error(ctx, '分享链接已失效', 401);
        }
    }
}

module.exports = ShareController;

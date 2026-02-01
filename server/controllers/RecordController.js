const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');

class RecordController {
    // 新增记录
    static async create(ctx) {
        const data = ctx.request.body;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.create({
            ...data,
            UserId: userId
        });

        Response.success(ctx, record, '健康记录已保存');
    }

    // 获取列表 (按日期倒序)
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const { limit = 20, offset = 0 } = ctx.query;

        const { count, rows } = await HealthRecord.findAndCountAll({
            where: { UserId: userId },
            order: [['recordDate', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        Response.success(ctx, {
            total: count,
            list: rows
        });
    }

    // 获取趋势图数据 (最近12条记录)
    static async trend(ctx) {
        const userId = ctx.state.user.id;

        const list = await HealthRecord.findAll({
            where: { UserId: userId },
            attributes: ['recordDate', 'TSH', 'FT3', 'FT4', 'T3', 'T4'],
            order: [['recordDate', 'ASC']],
            limit: 12
        });

        Response.success(ctx, list);
    }
}

module.exports = RecordController;

const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');

class RecordController {
    // 新增记录
    static async create(ctx) {
        const data = ctx.request.body;
        const userId = ctx.state.user.id;

        // 数据清洗：将空字符串转为 null，防止插入数值类型字段报错 (Data truncated)
        for (const key in data) {
            if (data[key] === '') {
                data[key] = null;
            }
        }

        // 如果填写了B超数据但没填B超日期，默认使用主日期
        if ((data.thyroidLeft || data.noduleCount || data.ultrasoundNote) && !data.ultrasoundDate) {
            data.ultrasoundDate = data.recordDate;
        }

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

        // 处理多图 JSON 字符串
        const list = rows.map(item => {
            const row = item.toJSON();
            try {
                row.reportImage = row.reportImage ? JSON.parse(row.reportImage) : [];
            } catch (e) {
                row.reportImage = row.reportImage ? [row.reportImage] : [];
            }
            try {
                row.ultrasoundImage = row.ultrasoundImage ? JSON.parse(row.ultrasoundImage) : [];
            } catch (e) {
                row.ultrasoundImage = row.ultrasoundImage ? [row.ultrasoundImage] : [];
            }
            return row;
        });

        Response.success(ctx, {
            total: count,
            list
        });
    }

    // 获取单条记录详情
    static async detail(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.findOne({
            where: { id, UserId: userId }
        });

        if (!record) {
            return Response.error(ctx, '记录不存在', 404);
        }

        // 处理多图 JSON 字符串
        const row = record.toJSON();
        try {
            row.reportImage = row.reportImage ? JSON.parse(row.reportImage) : [];
        } catch (e) {
            row.reportImage = row.reportImage ? [row.reportImage] : [];
        }
        try {
            row.ultrasoundImage = row.ultrasoundImage ? JSON.parse(row.ultrasoundImage) : [];
        } catch (e) {
            row.ultrasoundImage = row.ultrasoundImage ? [row.ultrasoundImage] : [];
        }

        Response.success(ctx, row);
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

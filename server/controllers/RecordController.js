const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');
const { Op } = require('sequelize');

// 健康记录允许写入的字段白名单
const ALLOWED_FIELDS = [
    'recordDate', 'TSH', 'FT3', 'FT4', 'T3', 'T4', 'TGAb', 'TPOAb',
    'TRAb', 'Tg', 'Calcitonin', 'Calcium', 'Magnesium', 'Phosphorus', 'PTH',
    'weight', 'heartRate', 'feeling',
    'ultrasoundDate', 'thyroidLeft', 'thyroidRight', 'isthmus',
    'noduleCount', 'noduleMaxSize', 'noduleLocation', 'tiradsLevel',
    'noduleFeatures', 'lymphNode', 'ultrasoundNote',
    'reportImage', 'ultrasoundImage'
];

class RecordController {
    /**
     * 辅助方法：清洗数据，将空字符串转换为 null
     */
    static cleanData(data) {
        for (const key in data) {
            if (data[key] === '') {
                data[key] = null;
            }
        }
    }

    /**
     * 辅助方法：过滤数据，仅保留白名单字段
     */
    static filterData(data) {
        const filtered = {};
        for (const key of ALLOWED_FIELDS) {
            if (data[key] !== undefined) {
                filtered[key] = data[key];
            }
        }
        return filtered;
    }

    /**
     * 新增记录
     * POST /api/record/add
     */
    static async create(ctx) {
        const userId = ctx.state.user.id;

        // 白名单过滤 + 数据清洗
        const data = RecordController.filterData(ctx.request.body);
        RecordController.cleanData(data);

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

    /**
     * 获取列表 (按日期倒序)
     * GET /api/record/list
     */
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const { limit = 20, offset = 0, hasLab } = ctx.query;

        const where = { UserId: userId };

        // 如果需要过滤含血检的记录
        if (hasLab == 1) {
            where[Op.or] = [
                { TSH: { [Op.ne]: null } },
                { FT4: { [Op.ne]: null } },
                { FT3: { [Op.ne]: null } },
                { T3: { [Op.ne]: null } },
                { T4: { [Op.ne]: null } }
            ];
        }

        const { count, rows } = await HealthRecord.findAndCountAll({
            where,
            order: [['recordDate', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        Response.success(ctx, {
            total: count,
            list: rows
        });
    }

    /**
     * 获取单条记录详情
     * GET /api/record/:id
     */
    static async detail(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.findOne({
            where: { id, UserId: userId }
        });

        if (!record) {
            return Response.error(ctx, '记录不存在', 404);
        }

        Response.success(ctx, record);
    }

    /**
     * 获取趋势图数据 (最近12条记录)
     * GET /api/record/trend
     */
    static async trend(ctx) {
        const userId = ctx.state.user.id;

        const list = await HealthRecord.findAll({
            where: { UserId: userId },
            attributes: ['recordDate', 'TSH', 'FT3', 'FT4', 'T3', 'T4'],
            order: [['recordDate', 'DESC']],
            limit: 12
        });

        // 取出后反转，变成按时间正序排列以便前端展示
        Response.success(ctx, list.reverse());
    }

    /**
     * 更新记录
     * PUT /api/record/:id
     */
    static async update(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        // 白名单过滤 + 数据清洗
        const data = RecordController.filterData(ctx.request.body);
        RecordController.cleanData(data);

        // 如果填写了B超数据但没填B超日期，默认使用主日期
        if ((data.thyroidLeft || data.noduleCount || data.ultrasoundNote) && !data.ultrasoundDate) {
            data.ultrasoundDate = data.recordDate;
        }

        await record.update(data);
        Response.success(ctx, record, '记录已更新');
    }

    /**
     * 删除记录
     * DELETE /api/record/:id
     */
    static async delete(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        await record.destroy();
        Response.success(ctx, null, '记录已删除');
    }
}

module.exports = RecordController;

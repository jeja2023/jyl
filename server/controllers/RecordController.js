const HealthRecord = require('../models/HealthRecord');
const Response = require('../utils/response');

class RecordController {
    // 辅助方法：清洗数据，将空字符串转换为 null
    static cleanData(data) {
        for (const key in data) {
            if (data[key] === '') {
                data[key] = null;
            }
        }
    }

    // 新增记录
    static async create(ctx) {
        const data = ctx.request.body;
        const userId = ctx.state.user.id;

        // 数据清洗
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

    // 获取列表 (按日期倒序)
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const { limit = 20, offset = 0, hasLab } = ctx.query;
        const { Op } = require('sequelize');

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

        // 处理多图 JSON 字符串
        const list = rows.map(item => {
            const row = item.toJSON();
            row.reportImage = RecordController.parseImages(row.reportImage);
            row.ultrasoundImage = RecordController.parseImages(row.ultrasoundImage);
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
        row.reportImage = RecordController.parseImages(row.reportImage);
        row.ultrasoundImage = RecordController.parseImages(row.ultrasoundImage);

        Response.success(ctx, row);
    }

    // 获取趋势图数据 (最近12条记录)
    static async trend(ctx) {
        const userId = ctx.state.user.id;

        const list = await HealthRecord.findAll({
            where: { UserId: userId },
            attributes: ['recordDate', 'TSH', 'FT3', 'FT4', 'T3', 'T4'],
            order: [['recordDate', 'DESC']], // 改为倒序获取最新的
            limit: 12
        });

        // 取出后反转，变成按时间正序排列以便前端展示
        Response.success(ctx, list.reverse());
    }

    // 更新记录
    static async update(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;
        const data = ctx.request.body;

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        // 数据清洗
        RecordController.cleanData(data);

        // 如果填写了B超数据但没填B超日期，默认使用主日期 (同步创建时的逻辑)
        if ((data.thyroidLeft || data.noduleCount || data.ultrasoundNote) && !data.ultrasoundDate) {
            data.ultrasoundDate = data.recordDate;
        }

        await record.update(data);
        Response.success(ctx, record, '记录已更新');
    }

    // 删除记录
    static async delete(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        const record = await HealthRecord.findOne({ where: { id, UserId: userId } });
        if (!record) return Response.error(ctx, '记录不存在', 404);

        await record.destroy();
        Response.success(ctx, null, '记录已删除');
    }
    // 辅助方法：解析图片 JSON 字符串，并确保返回扁平化的字符串数组
    static parseImages(val) {
        if (!val) return [];
        let result;
        if (Array.isArray(val)) {
            result = val;
        } else {
            try {
                result = JSON.parse(val);
                if (!Array.isArray(result)) result = [result];
            } catch (e) {
                result = [val];
            }
        }
        // 深度清理：确保数组内是字符串，如果是嵌套数组则展开 (修复历史 Bug 产生的数据)
        return result.map(item => Array.isArray(item) ? item[0] : item).filter(i => i && typeof i === 'string');
    }
}

module.exports = RecordController;

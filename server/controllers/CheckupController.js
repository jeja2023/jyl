const CheckupReminder = require('../models/CheckupReminder');
const Response = require('../utils/response');

class CheckupController {
    // 新增复查提醒
    static async create(ctx) {
        const { date, note } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!date) {
            throw new Error('请选择复查日期');
        }

        const reminder = await CheckupReminder.create({
            date,
            note,
            UserId: userId
        });

        Response.success(ctx, reminder, '复查提醒已添加');
    }

    // 获取列表
    static async list(ctx) {
        const userId = ctx.state.user.id;

        const list = await CheckupReminder.findAll({
            where: { UserId: userId },
            order: [['date', 'ASC']]
        });

        Response.success(ctx, list);
    }

    // 删除提醒
    static async delete(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;

        const result = await CheckupReminder.destroy({
            where: {
                id,
                UserId: userId
            }
        });

        if (result) {
            Response.success(ctx, null, '删除成功');
        } else {
            throw new Error('删除失败或记录不存在');
        }
    }
}

module.exports = CheckupController;

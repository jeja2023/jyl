const CheckupReminder = require('../models/CheckupReminder');
const Response = require('../utils/response');

class CheckupController {
    /**
     * 新增复查提醒
     * POST /api/checkup/add
     */
    static async create(ctx) {
        const { date, note } = ctx.request.body;
        const userId = ctx.state.user.id;

        if (!date) {
            return Response.error(ctx, '请选择复查日期');
        }

        const reminder = await CheckupReminder.create({
            date,
            note: note || null,
            UserId: userId
        });

        Response.success(ctx, reminder, '复查提醒已添加');
    }

    /**
     * 获取列表
     * GET /api/checkup/list
     */
    static async list(ctx) {
        const userId = ctx.state.user.id;

        const list = await CheckupReminder.findAll({
            where: { UserId: userId },
            order: [['date', 'ASC']]
        });

        Response.success(ctx, list);
    }

    /**
     * 删除提醒
     * DELETE /api/checkup/:id
     */
    static async delete(ctx) {
        const { id } = ctx.params;
        const userId = ctx.state.user.id;

        if (!id) {
            return Response.error(ctx, '提醒ID不能为空');
        }

        const result = await CheckupReminder.destroy({
            where: {
                id,
                UserId: userId
            }
        });

        if (result) {
            Response.success(ctx, null, '删除成功');
        } else {
            return Response.error(ctx, '删除失败或记录不存在', 404);
        }
    }
}

module.exports = CheckupController;

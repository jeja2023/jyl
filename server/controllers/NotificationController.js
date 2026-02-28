const Notification = require('../models/Notification');
const CheckupReminder = require('../models/CheckupReminder');
const Response = require('../utils/response');
const { Op } = require('sequelize');

class NotificationController {
    /**
     * 获取消息列表
     * GET /api/notification/list
     */
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const { page = 1, pageSize = 20 } = ctx.query;
        const limit = parseInt(pageSize);
        const offset = (parseInt(page) - 1) * limit;

        // 1. 获取数据库中的系统通知（不分页，全量获取用于合并后再分页）
        const dbNotifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { UserId: userId },
                    { UserId: null } // 全局通知
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        // 2. 查询未来30天的复查提醒
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);

        const checkups = await CheckupReminder.findAll({
            where: {
                UserId: userId,
                isCompleted: false,
                date: {
                    [Op.between]: [today, futureDate]
                }
            },
            order: [['date', 'ASC']]
        });

        // 将复查提醒转换为通知格式
        const checkupNotices = checkups.map(checkup => ({
            id: `checkup_${checkup.id}`,
            type: 'checkup',
            title: '复查提醒',
            content: `您预约了 ${checkup.date} 的复查，请按时前往。${checkup.note ? '备注：' + checkup.note : ''}`,
            createdAt: checkup.createdAt,
            param: checkup.date
        }));

        // 3. 合并所有通知并统一排序
        let allItems = [...dbNotifications.map(n => n.toJSON()), ...checkupNotices];
        allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 如果没有任何消息，添加一条默认的系统欢迎消息
        if (allItems.length === 0) {
            allItems.push({
                id: 'welcome',
                type: 'system',
                title: '系统通知',
                content: '欢迎使用甲友乐！这里将为您推送重要的系统公告和健康资讯。',
                createdAt: new Date(),
                isRead: true
            });
        }

        // 4. 在合并后的完整列表上执行分页
        const total = allItems.length;
        const list = allItems.slice(offset, offset + limit);

        Response.success(ctx, { list, total, page: parseInt(page), pageSize: limit });
    }

    // 标记已读
    static async markRead(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        await Notification.update({ isRead: true }, { where: { id, UserId: userId } });
        Response.success(ctx, null, '已标记已读');
    }

    // 删除系统通知
    static async delete(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        const result = await Notification.destroy({ where: { id, UserId: userId } });
        if (result) {
            Response.success(ctx, null, '删除成功');
        } else {
            throw new Error('删除失败或记录不存在');
        }
    }
}

module.exports = NotificationController;

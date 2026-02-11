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

        // 1. 获取数据库中的系统通知
        const dbNotifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { UserId: userId },
                    { UserId: null } // 全局通知
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: parseInt(pageSize),
            offset: (page - 1) * pageSize
        });

        // 2. 动态生成复查提醒 (未来7天内)
        // 简单起见，我们每次请求都检查一下是否有即将到来的复查，如果有且没有生成过通知，则生成一条
        // 但为了避免重复生成，这里简化为：前端展示时混合展示，或者只展示DB中的。
        // 既然要"完成功能"，最好是混合展示。

        // 查询未来30天的复查提醒
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
            id: `checkup_${checkup.id}`, // 虚拟ID
            type: 'checkup',
            title: '复查提醒',
            content: `您预约了 ${checkup.date} 的复查，请按时前往。${checkup.note ? '备注：' + checkup.note : ''}`,
            createdAt: checkup.createdAt, // 或者用 checkup.date 作为排序依据？通常用创建时间或目标时间
            param: checkup.date // 额外参数
        }));

        // 3. 构造欢迎通知 (如果列表为空)
        let list = [...dbNotifications.map(n => n.toJSON()), ...checkupNotices];

        // 按时间倒序
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // 如果没有任何消息，添加一条默认的系统欢迎消息
        if (list.length === 0) {
            list.push({
                id: 'welcome',
                type: 'system',
                title: '系统通知',
                content: '欢迎使用甲友乐！这里将为您推送重要的系统公告和健康资讯。',
                createdAt: new Date()
            });
        }

        Response.success(ctx, list);
    }
}

module.exports = NotificationController;

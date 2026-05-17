const Notification = require('../models/Notification');
const CheckupReminder = require('../models/CheckupReminder');
const MedicationPlan = require('../models/MedicationPlan');
const Response = require('../utils/response');
const { Op } = require('sequelize');
const { buildCheckupNotice, buildMedicationNotices, sortNotifications } = require('../services/NotificationService');
const { getPagination } = require('../utils/pagination');

class NotificationController {
    static async list(ctx) {
        const userId = ctx.state.user.id;
        const { page, pageSize, limit, offset } = getPagination(ctx.query, {
            defaultPageSize: 20,
            maxPageSize: 50
        });
        const now = new Date();

        const notificationWhere = {
            [Op.or]: [
                { UserId: userId },
                { UserId: null }
            ]
        };

        const today = new Date(now);
        const futureDate = new Date(now);
        futureDate.setDate(today.getDate() + 30);

        const [dbTotal, dbNotifications, checkups, medicationPlans] = await Promise.all([
            Notification.count({ where: notificationWhere }),
            Notification.findAll({
                where: notificationWhere,
                attributes: ['id', 'type', 'title', 'content', 'isRead', 'targetDate', 'UserId', 'createdAt'],
                order: [['createdAt', 'DESC']],
                limit: offset + limit
            }),
            CheckupReminder.findAll({
                where: {
                    UserId: userId,
                    isCompleted: false,
                    date: { [Op.between]: [today, futureDate] }
                },
                attributes: ['id', 'date', 'note', 'isCompleted', 'createdAt', 'updatedAt'],
                order: [['date', 'ASC']]
            }),
            MedicationPlan.findAll({
                where: {
                    UserId: userId,
                    isActive: true
                },
                attributes: ['id', 'medicineName', 'dosage', 'takeTime', 'lastTakenDate', 'createdAt'],
                order: [['takeTime', 'ASC']]
            })
        ]);

        const checkupNotices = checkups.map((checkup) => buildCheckupNotice(checkup, now));
        const medicationNotices = buildMedicationNotices(medicationPlans, now);
        const dynamicTotal = checkupNotices.length + medicationNotices.length;

        let allItems = [
            ...dbNotifications.map((notification) => {
                const item = notification.toJSON();
                item.remindAt = item.targetDate || item.createdAt;
                return item;
            }),
            ...checkupNotices,
            ...medicationNotices
        ];

        allItems.sort(sortNotifications);

        if (allItems.length === 0) {
            allItems.push({
                id: 'welcome',
                type: 'system',
                title: '系统通知',
                content: '欢迎使用甲友乐！这里将为您推送重要的系统公告和健康资讯。',
                createdAt: new Date(),
                remindAt: new Date(),
                isRead: true
            });
        }

        const total = Math.max(allItems.length, dbTotal + dynamicTotal);
        const list = allItems.slice(offset, offset + limit);
        Response.success(ctx, { list, total, page, pageSize });
    }

    static async markRead(ctx) {
        const { id } = ctx.request.body;
        const userId = ctx.state.user.id;
        await Notification.update({ isRead: true }, { where: { id, UserId: userId } });
        Response.success(ctx, null, '已标记已读');
    }

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

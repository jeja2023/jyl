const User = require('../models/User');
const ActionLog = require('../models/ActionLog');
const Response = require('../utils/response');
const { Op } = require('sequelize');
const { logAction } = require('../utils/actionLog');

class AdminController {
    /**
     * 获取用户列表
     */
    static async listUsers(ctx) {
        const { page = 1, pageSize = 20, keyword = '' } = ctx.query;
        const offset = (page - 1) * pageSize;

        const where = {};
        if (keyword) {
            where[Op.or] = [
                { nickname: { [Op.like]: `%${keyword}%` } },
                { username: { [Op.like]: `%${keyword}%` } },
                { phone: { [Op.like]: `%${keyword}%` } },
                { email: { [Op.like]: `%${keyword}%` } }
            ];
        }

        try {
            const { count, rows } = await User.findAndCountAll({
                where,
                limit: parseInt(pageSize),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']]
            });

            return Response.success(ctx, {
                total: count,
                list: rows,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            });
        } catch (err) {
            return Response.error(ctx, '获取用户列表失败: ' + err.message);
        }
    }

    /**
     * 更新用户角色或状态
     */
    static async updateUser(ctx) {
        const { id } = ctx.params;
        const { role, nickname, patientType } = ctx.request.body;

        try {
            const user = await User.findByPk(id);
            if (!user) {
                return Response.error(ctx, '用户不存在');
            }

            // 禁止修改自己的角色（防止失误取消自己的管理员）
            if (user.id === ctx.state.user.id && role && role !== user.role) {
                return Response.error(ctx, '禁止修改当前登录账号的角色');
            }

            await user.update({ role, nickname, patientType });
            
            logAction(ctx, '更新用户', '管理后台', `管理员更新了用户 ID:${user.id} 的信息`);

            return Response.success(ctx, null, '更新成功');
        } catch (err) {
            return Response.error(ctx, '更新用户失败: ' + err.message);
        }
    }

    /**
     * 删除用户
     */
    static async deleteUser(ctx) {
        const { id } = ctx.params;

        try {
            const user = await User.findByPk(id);
            if (!user) {
                return Response.error(ctx, '用户不存在');
            }

            if (user.id === ctx.state.user.id) {
                return Response.error(ctx, '禁止删除当前登录账号');
            }

            await user.destroy();
            
            logAction(ctx, '删除用户', '管理后台', `管理员删除了用户 ID:${id}`);

            return Response.success(ctx, null, '删除用户成功');
        } catch (err) {
            return Response.error(ctx, '删除用户失败: ' + err.message);
        }
    }

    /**
     * 获取系统日志
     */
    static async listLogs(ctx) {
        const { page = 1, pageSize = 20, action = '', username = '' } = ctx.query;
        const offset = (page - 1) * pageSize;

        const where = {};
        if (action) {
            where.action = { [Op.like]: `%${action}%` };
        }
        if (username) {
            where.username = { [Op.like]: `%${username}%` };
        }

        try {
            const { count, rows } = await ActionLog.findAndCountAll({
                where,
                limit: parseInt(pageSize),
                offset: parseInt(offset),
                order: [['createdAt', 'DESC']]
            });

            return Response.success(ctx, {
                total: count,
                list: rows,
                page: parseInt(page),
                pageSize: parseInt(pageSize)
            });
        } catch (err) {
            return Response.error(ctx, '获取日志失败: ' + err.message);
        }
    }
}

module.exports = AdminController;

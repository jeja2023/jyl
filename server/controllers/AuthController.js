const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Response = require('../utils/response');

class AuthController {
    // 注册
    static async register(ctx) {
        const { username, password, patientType, nickname } = ctx.request.body;

        if (!username || !password) {
            return Response.error(ctx, '用户名和密码不能为空');
        }

        const existUser = await User.findOne({ where: { username } });
        if (existUser) {
            return Response.error(ctx, '该用户已存在');
        }

        const newUser = await User.create({
            username,
            password,
            patientType,
            nickname: nickname || username
        });

        Response.success(ctx, {
            id: newUser.id,
            username: newUser.username,
            patientType: newUser.patientType
        }, '注册成功');
    }

    // 登录
    static async login(ctx) {
        const { username, password } = ctx.request.body;

        if (!username || !password) {
            return Response.error(ctx, '用户名和密码不能为空');
        }

        const user = await User.findOne({ where: { username } });

        if (!user || !(await user.comparePassword(password))) {
            return Response.error(ctx, '用户名或密码错误', 401);
        }

        // 生成真实 JWT Token
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        Response.success(ctx, {
            token,
            userInfo: {
                id: user.id,
                username: user.username,
                nickname: user.nickname,
                patientType: user.patientType,
                role: user.role
            }
        }, '登录成功');
    }

    // 获取当前用户信息
    static async profile(ctx) {
        const { id } = ctx.state.user;
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return Response.error(ctx, '用户不存在', 404);
        }

        Response.success(ctx, user);
    }
}

module.exports = AuthController;

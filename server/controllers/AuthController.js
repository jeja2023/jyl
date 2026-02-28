const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const VerifyCode = require('../models/VerifyCode');
const jwt = require('jsonwebtoken');
const Response = require('../utils/response');
const SmsService = require('../utils/sms');
const MailService = require('../utils/mail');
const { Op } = require('sequelize');

class AuthController {


    /**
     * 获取用户统计数据
     * GET /api/auth/stats
     */
    static async stats(ctx) {
        const { id } = ctx.state.user;

        const [daysCount, labCount, user] = await Promise.all([
            // 1. 记录天数 (不同日期的记录数)
            HealthRecord.count({
                where: { UserId: id },
                distinct: true,
                col: 'recordDate'
            }),
            // 2. 化验份数 (有化验数据的记录数)
            HealthRecord.count({
                where: {
                    UserId: id,
                    [Op.or]: [
                        { TSH: { [Op.ne]: null } },
                        { FT3: { [Op.ne]: null } },
                        { FT4: { [Op.ne]: null } },
                        { T3: { [Op.ne]: null } },
                        { T4: { [Op.ne]: null } },
                        { Tg: { [Op.ne]: null } },
                        { TGAb: { [Op.ne]: null } },
                        { TPOAb: { [Op.ne]: null } }
                    ]
                }
            }),
            // 3. 百科阅读
            User.findByPk(id, { attributes: ['wikiReadCount'] })
        ]);

        Response.success(ctx, {
            checkupDays: daysCount,
            labReports: labCount,
            wikiReads: user ? (user.wikiReadCount || 0) : 0
        });
    }


    /**
     * 生成JWT Token
     */
    static generateToken(user) {
        return jwt.sign(
            { id: user.id, username: user.username || user.phone || user.email },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
    }

    /**
     * 格式化用户信息返回
     */
    static formatUserInfo(user) {
        return {
            id: user.id,
            username: user.username,
            phone: user.phone,
            email: user.email,
            nickname: user.nickname,
            avatar: user.avatar,
            patientType: user.patientType,
            role: user.role,
            hasPassword: !!user.password
        };
    }

    // ==================== 传统用户名密码登录 ====================

    /**
     * 用户名密码注册
     * POST /api/auth/register
     */
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

    /**
     * 账号登录 (支持用户名或邮箱)
     * POST /api/auth/login
     */
    static async login(ctx) {
        const { username, password } = ctx.request.body;

        if (!username || !password) {
            return Response.error(ctx, '用户名或邮箱及密码不能为空');
        }

        // 查找用户 (支持用户名或邮箱)
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { username: username },
                    { email: username }
                ]
            }
        });

        if (!user || !(await user.comparePassword(password))) {
            return Response.error(ctx, '用户名/邮箱或密码错误', 401);
        }

        // 更新最后登录时间
        await user.update({ lastLoginAt: new Date() });

        const token = AuthController.generateToken(user);

        Response.success(ctx, {
            token,
            userInfo: AuthController.formatUserInfo(user)
        }, '登录成功');
    }

    // ==================== 邮箱验证码登录/注册 ====================

    /**
     * 发送邮箱验证码
     * POST /api/auth/email/send
     */
    static async sendEmailCode(ctx) {
        const { email, type = 'login' } = ctx.request.body;

        if (!email || !/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email)) {
            return Response.error(ctx, '请输入正确的邮箱地址');
        }

        // 检查是否频繁发送（1分钟内只能发一次）
        const recentCode = await VerifyCode.findOne({
            where: {
                target: email,
                targetType: 'email',
                createdAt: { [Op.gte]: new Date(Date.now() - 60000) }
            }
        });

        if (recentCode) {
            return Response.error(ctx, '验证码发送太频繁，请1分钟后再试');
        }

        // 生成验证码
        const code = MailService.generateCode(6);
        const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效

        // 保存验证码
        await VerifyCode.create({ target: email, code, type, targetType: 'email', expireAt });

        try {
            await MailService.sendCode(email, code);
        } catch (err) {
            console.error('[邮件] 发送失败:', err.message);
            return Response.error(ctx, '验证码发送失败，请稍后重试');
        }

        Response.success(ctx, null, '验证码已发送至您的邮箱');
    }

    /**
     * 邮箱验证码注册 (正式表单版)
     * POST /api/auth/email/register
     */
    static async emailRegister(ctx) {
        const { username, email, code, password, confirmPassword } = ctx.request.body;

        // 表单校验
        if (!username || !email || !code || !password) {
            return Response.error(ctx, '请填写完整注册信息');
        }
        if (!/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(email)) {
            return Response.error(ctx, '邮箱格式不正确');
        }
        if (password !== confirmPassword) {
            return Response.error(ctx, '两次输入密码不一致');
        }
        if (password.length < 6) {
            return Response.error(ctx, '密码长度至少6位');
        }

        // 1. 检查验证码
        const verifyCode = await VerifyCode.findOne({
            where: {
                target: email,
                code,
                targetType: 'email',
                used: false,
                expireAt: { [Op.gte]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });
        if (!verifyCode) {
            return Response.error(ctx, '验证码错误或已过期');
        }

        // 2. 检查唯一性
        const existUser = await User.findOne({
            where: {
                [Op.or]: [
                    { username: username },
                    { email: email }
                ]
            }
        });
        if (existUser) {
            if (existUser.username === username) return Response.error(ctx, '该用户名已被占用');
            if (existUser.email === email) return Response.error(ctx, '该邮箱已注册，请直接登录');
        }

        // 3. 消费验证码
        await verifyCode.update({ used: true });

        // 4. 创建用户
        const newUser = await User.create({
            username,
            email,
            password,
            nickname: username,
            patientType: '其他'
        });

        // 自动登录
        const token = AuthController.generateToken(newUser);

        Response.success(ctx, {
            token,
            userInfo: AuthController.formatUserInfo(newUser),
            isNewUser: true
        }, '注册成功');
    }

    // ==================== 手机号验证码登录 ====================

    /**
     * 发送短信验证码
     * POST /api/auth/sms/send
     */
    static async sendSmsCode(ctx) {
        const { phone, type = 'login' } = ctx.request.body;

        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            return Response.error(ctx, '请输入正确的手机号');
        }

        // 检查是否频繁发送（1分钟内只能发一次）
        const recentCode = await VerifyCode.findOne({
            where: {
                target: phone,
                targetType: 'sms',
                createdAt: { [Op.gte]: new Date(Date.now() - 60000) }
            }
        });

        if (recentCode) {
            return Response.error(ctx, '验证码发送太频繁，请1分钟后再试');
        }

        // 生成验证码
        const code = SmsService.generateCode(6);
        const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效

        // 保存验证码
        await VerifyCode.create({ target: phone, code, type, targetType: 'sms', expireAt });

        // 发送短信（开发环境可跳过实际发送）
        if (process.env.NODE_ENV === 'development' && !process.env.SMS_APP_ID) {
            console.log(`[开发模式] 手机号 ${phone} 的验证码是: ${code}`);
        } else {
            try {
                await SmsService.sendCode(phone, code);
            } catch (err) {
                console.error('[短信] 发送失败:', err.message);
                return Response.error(ctx, '验证码发送失败，请稍后重试');
            }
        }

        Response.success(ctx, null, '验证码已发送');
    }

    /**
     * 手机号验证码登录/注册
     * POST /api/auth/sms/login
     */
    static async smsLogin(ctx) {
        const { phone, code, nickname } = ctx.request.body;

        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            return Response.error(ctx, '请输入正确的手机号');
        }

        if (!code || !/^\d{6}$/.test(code)) {
            return Response.error(ctx, '请输入6位验证码');
        }

        // 验证验证码
        const verifyCode = await VerifyCode.findOne({
            where: {
                target: phone,
                code,
                targetType: 'sms',
                used: false,
                expireAt: { [Op.gte]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!verifyCode) {
            return Response.error(ctx, '验证码错误或已过期');
        }

        // 标记验证码已使用
        await verifyCode.update({ used: true });

        // 查找或创建用户
        let user = await User.findOne({ where: { phone } });
        let isNewUser = false;

        if (!user) {
            // 新用户自动注册
            user = await User.create({
                phone,
                nickname: nickname || `甲友${phone.slice(-4)}`,
                patientType: '其他'
            });
            isNewUser = true;
        }

        // 更新最后登录时间
        await user.update({ lastLoginAt: new Date() });

        const token = AuthController.generateToken(user);

        Response.success(ctx, {
            token,
            userInfo: AuthController.formatUserInfo(user),
            isNewUser
        }, isNewUser ? '注册成功' : '登录成功');
    }

    /**
     * 手机号+验证码+密码 注册
     * POST /api/auth/sms/register
     */
    static async smsRegister(ctx) {
        const { phone, code, password, nickname } = ctx.request.body;

        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            return Response.error(ctx, '请输入正确的手机号');
        }
        if (!code || !/^\d{6}$/.test(code)) {
            return Response.error(ctx, '请输入6位验证码');
        }
        if (!password || password.length < 6) {
            return Response.error(ctx, '密码长度至少6位');
        }

        // 验证验证码
        const verifyCode = await VerifyCode.findOne({
            where: {
                target: phone,
                code,
                targetType: 'sms',
                used: false,
                expireAt: { [Op.gte]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!verifyCode) {
            return Response.error(ctx, '验证码错误或已过期');
        }

        // 检查用户是否已存在
        const existUser = await User.findOne({ where: { phone } });
        if (existUser) {
            return Response.error(ctx, '该手机号已注册，请直接登录');
        }

        // 标记验证码已使用
        await verifyCode.update({ used: true });

        // 创建新用户
        const newUser = await User.create({
            phone,
            password, // 模型钩子会自动加密
            username: phone, // 默认用户名同手机号
            nickname: nickname || `甲友${phone.slice(-4)}`,
            patientType: '其他'
        });

        // 自动登录
        const token = AuthController.generateToken(newUser);

        Response.success(ctx, {
            token,
            userInfo: AuthController.formatUserInfo(newUser),
            isNewUser: true
        }, '注册成功');
    }


    // ==================== 用户信息 ====================

    /**
     * 获取当前用户信息
     * GET /api/auth/profile
     */
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

    /**
     * 更新用户信息
     * POST /api/auth/profile/update
     */
    static async updateProfile(ctx) {
        const { id } = ctx.state.user;
        const { nickname, avatar, patientType, diagnosisDate, birthDate, gender } = ctx.request.body;

        const user = await User.findByPk(id);
        if (!user) {
            return Response.error(ctx, '用户不存在', 404);
        }

        await user.update({
            nickname: nickname || user.nickname,
            avatar: avatar || user.avatar,
            patientType: patientType || user.patientType,
            diagnosisDate: diagnosisDate || user.diagnosisDate,
            birthDate: birthDate || user.birthDate,
            gender: gender || user.gender
        });

        Response.success(ctx, AuthController.formatUserInfo(user), '更新成功');
    }

    /**
     * 绑定手机号（已登录用户）
     * POST /api/auth/bindPhone
     */
    static async bindPhone(ctx) {
        const { id } = ctx.state.user;
        const { phone, code } = ctx.request.body;

        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
            return Response.error(ctx, '请输入正确的手机号');
        }

        // 检查手机号是否已被其他用户使用
        const existUser = await User.findOne({ where: { phone } });
        if (existUser && existUser.id !== id) {
            return Response.error(ctx, '该手机号已被其他账号绑定');
        }

        // 验证验证码
        const verifyCode = await VerifyCode.findOne({
            where: {
                target: phone,
                code,
                targetType: 'sms',
                used: false,
                expireAt: { [Op.gte]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!verifyCode) {
            return Response.error(ctx, '验证码错误或已过期');
        }

        // 标记验证码已使用
        await verifyCode.update({ used: true });

        // 绑定手机号
        const user = await User.findByPk(id);
        await user.update({ phone });

        Response.success(ctx, AuthController.formatUserInfo(user), '手机号绑定成功');
    }

    /**
     * 设置/修改密码
     * POST /api/auth/setPassword
     */
    static async setPassword(ctx) {
        const { id } = ctx.state.user;
        const { password, oldPassword } = ctx.request.body;

        if (!password || password.length < 6) {
            return Response.error(ctx, '密码长度至少6位');
        }

        const user = await User.findByPk(id);
        if (!user) {
            return Response.error(ctx, '用户不存在', 404);
        }

        // 如果已有密码，需要验证旧密码
        if (user.password) {
            if (!oldPassword) {
                return Response.error(ctx, '请输入原密码');
            }
            if (!(await user.comparePassword(oldPassword))) {
                return Response.error(ctx, '原密码错误');
            }
        }

        await user.update({ password });

        Response.success(ctx, null, '密码设置成功');
    }

    /**
     * 获取公开系统配置
     * GET /api/common/config
     */
    static async getPublicConfig(ctx) {
        Response.success(ctx, {
            supportEmail: process.env.SUPPORT_EMAIL || 'support@jiayoule.com',
            wechatSupport: process.env.WECHAT_SUPPORT || 'JYL_Support'
        });
    }
}

module.exports = AuthController;

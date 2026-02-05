const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const SmsCode = require('../models/SmsCode');
const jwt = require('jsonwebtoken');
const Response = require('../utils/response');
const SmsService = require('../utils/sms');
const WechatService = require('../utils/wechat');
const { Op } = require('sequelize');

class AuthController {
    /**
     * 生成JWT Token
     * ... existing code ...
     */

    // ... (keep existing methods) ...

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
            { id: user.id, username: user.username || user.phone },
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
     * 用户名密码登录
     * POST /api/auth/login
     */
    static async login(ctx) {
        const { username, password } = ctx.request.body;

        if (!username || !password) {
            return Response.error(ctx, '用户名和密码不能为空');
        }

        const user = await User.findOne({ where: { username } });

        if (!user || !(await user.comparePassword(password))) {
            return Response.error(ctx, '用户名或密码错误', 401);
        }

        // 更新最后登录时间
        await user.update({ lastLoginAt: new Date() });

        const token = AuthController.generateToken(user);

        Response.success(ctx, {
            token,
            userInfo: AuthController.formatUserInfo(user)
        }, '登录成功');
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
        const recentCode = await SmsCode.findOne({
            where: {
                phone,
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
        await SmsCode.create({ phone, code, type, expireAt });

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
        const smsCode = await SmsCode.findOne({
            where: {
                phone,
                code,
                used: false,
                expireAt: { [Op.gte]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!smsCode) {
            return Response.error(ctx, '验证码错误或已过期');
        }

        // 标记验证码已使用
        await smsCode.update({ used: true });

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
        const smsCode = await SmsCode.findOne({
            where: {
                phone,
                code,
                used: false,
                expireAt: { [Op.gte]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!smsCode) {
            return Response.error(ctx, '验证码错误或已过期');
        }

        // 检查用户是否已存在
        const existUser = await User.findOne({ where: { phone } });
        if (existUser) {
            return Response.error(ctx, '该手机号已注册，请直接登录');
        }

        // 标记验证码已使用
        await smsCode.update({ used: true });

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

    // ==================== 微信小程序登录 ====================

    /**
     * 微信小程序登录
     * POST /api/auth/wechat/login
     */
    static async wechatLogin(ctx) {
        const { code, userInfo } = ctx.request.body;

        if (!code) {
            return Response.error(ctx, '请提供微信登录code');
        }

        try {
            let openid, unionid;

            // 开发模拟逻辑：如果是 H5 环境模拟登录
            if (code === 'DEV_MOCK_CODE') {
                openid = 'mock_h5_openid_' + (userInfo?.nickName || 'guest');
                unionid = 'mock_h5_unionid';
            } else {
                // 通过code获取openid
                const wxSession = await WechatService.code2Session(code);
                openid = wxSession.openid;
                unionid = wxSession.unionid;
            }

            // 查找用户
            let user = await User.findOne({ where: { openid } });
            let isNewUser = false;

            if (!user) {
                // 新用户自动注册
                user = await User.create({
                    openid,
                    unionid,
                    nickname: userInfo?.nickName || `微信用户${Date.now().toString().slice(-6)}`,
                    avatar: userInfo?.avatarUrl,
                    gender: userInfo?.gender === 1 ? '男' : userInfo?.gender === 2 ? '女' : null,
                    patientType: '其他',
                    password: Math.random().toString(36).substring(2, 12) + '!' // 随机密码，安全性更高
                });
                isNewUser = true;
            } else {
                // 更新用户信息
                if (userInfo) {
                    await user.update({
                        nickname: userInfo.nickName || user.nickname,
                        avatar: userInfo.avatarUrl || user.avatar
                    });
                }
            }

            // 更新最后登录时间
            await user.update({ lastLoginAt: new Date() });

            const token = AuthController.generateToken(user);

            Response.success(ctx, {
                token,
                userInfo: AuthController.formatUserInfo(user),
                isNewUser
            }, isNewUser ? '注册成功' : '登录成功');

        } catch (err) {
            console.error('[微信登录] 失败:', err.message);
            return Response.error(ctx, '微信登录失败，请重试');
        }
    }

    /**
     * 微信小程序获取手机号登录
     * POST /api/auth/wechat/phone
     */
    static async wechatPhoneLogin(ctx) {
        const { code, phoneCode } = ctx.request.body;

        if (!code || !phoneCode) {
            return Response.error(ctx, '请提供登录凭证');
        }

        try {
            // 通过code获取openid
            const wxSession = await WechatService.code2Session(code);
            const { openid, unionid } = wxSession;

            // 通过phoneCode获取手机号
            const phoneInfo = await WechatService.getPhoneNumber(phoneCode);
            const phone = phoneInfo.purePhoneNumber;

            // 查找用户（优先通过手机号查找，方便账号合并）
            let user = await User.findOne({
                where: {
                    [Op.or]: [{ phone }, { openid }]
                }
            });
            let isNewUser = false;

            if (!user) {
                // 新用户
                user = await User.create({
                    phone,
                    openid,
                    unionid,
                    nickname: `甲友${phone.slice(-4)}`,
                    patientType: '其他',
                    password: Math.random().toString(36).substring(2, 12) + '!' // 随机密码，安全性更高
                });
                isNewUser = true;
            } else {
                // 已有用户，绑定微信或手机号
                await user.update({
                    phone: user.phone || phone,
                    openid: user.openid || openid,
                    unionid: user.unionid || unionid
                });
            }

            // 更新最后登录时间
            await user.update({ lastLoginAt: new Date() });

            const token = AuthController.generateToken(user);

            Response.success(ctx, {
                token,
                userInfo: AuthController.formatUserInfo(user),
                isNewUser
            }, isNewUser ? '注册成功' : '登录成功');

        } catch (err) {
            console.error('[微信手机号登录] 失败:', err.message);
            return Response.error(ctx, '获取手机号失败，请重试');
        }
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
        const smsCode = await SmsCode.findOne({
            where: {
                phone,
                code,
                used: false,
                expireAt: { [Op.gte]: new Date() }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!smsCode) {
            return Response.error(ctx, '验证码错误或已过期');
        }

        // 标记验证码已使用
        await smsCode.update({ used: true });

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
}

module.exports = AuthController;

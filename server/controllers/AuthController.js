const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const VerifyCode = require('../models/VerifyCode');
const VerifySendLock = require('../models/VerifySendLock');
const FamilyMember = require('../models/FamilyMember');
const jwt = require('jsonwebtoken');
const Response = require('../utils/response');
const SmsService = require('../utils/sms');
const MailService = require('../utils/mail');
const sequelize = require('../db');
const fs = require('node:fs');
const path = require('node:path');
const { Op, UniqueConstraintError } = require('sequelize');
const { logAction } = require('../utils/actionLog');
const { invalidate: invalidateUserCache } = require('../utils/userCache');
const { anyHasValue } = require('../utils/recordQuery');
const { memberWhereFrom, ALL: MEMBER_SCOPE_ALL } = require('../utils/memberScope');
const { TREND_KEYS, getDiseaseIndicatorProfile, getDefaultTrendKeys } = require('../utils/indicatorAnalysis');
// 整个模块引入而不是解构：解构会在加载时固化函数引用，测试里就没法替换掉真实的删库逻辑
const AccountDeletionService = require('../services/AccountDeletionService');
const logger = require('../utils/logger');
const pkg = require('../package.json');

/** 注销账号的确认短语，与前端设置页的提示保持一致 */
const DELETE_ACCOUNT_CONFIRM_TEXT = '确认注销';
/** 注销事件写入操作日志时的用户名占位，账号行此时已删除 */
const DELETED_ACCOUNT_LOG_NAME = '已注销用户';
const APP_RELEASES_DIR = path.resolve(__dirname, '..', '..', 'storage', 'app-releases');
const FALLBACK_APK_DOWNLOAD_URL = '/storage/app-releases/jyl-1.8.6.apk';

const normalizePublicUrl = (ctx, url) => {
    if (!url) return '';
    try {
        return new URL(url).toString();
    } catch (e) {
        const publicBase = process.env.APP_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL;
        return publicBase ? new URL(url, publicBase).toString() : url;
    }
};

const compareSemverParts = (left = '', right = '') => {
    const leftParts = String(left).split('.').map((part) => parseInt(part, 10) || 0);
    const rightParts = String(right).split('.').map((part) => parseInt(part, 10) || 0);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const diff = (leftParts[index] || 0) - (rightParts[index] || 0);
        if (diff !== 0) return diff;
    }

    return 0;
};

// /api/common/config 是登录页就会调用的公开接口，原本每次都同步 readdirSync 扫描
// APK 目录，会阻塞事件循环。结果缓存一段时间，发新包最多滞后一个 TTL。
const APK_URL_CACHE_TTL_MS = parseInt(process.env.APK_URL_CACHE_TTL_MS || '60000', 10);
let apkUrlCache = { value: null, expireAt: 0 };

const resolveDefaultApkDownloadUrl = () => {
    if (process.env.APK_DOWNLOAD_URL) {
        return process.env.APK_DOWNLOAD_URL;
    }

    if (apkUrlCache.value && apkUrlCache.expireAt > Date.now()) {
        return apkUrlCache.value;
    }

    const resolved = scanLatestApkUrl();
    apkUrlCache = { value: resolved, expireAt: Date.now() + APK_URL_CACHE_TTL_MS };
    return resolved;
};

const scanLatestApkUrl = () => {
    if (!fs.existsSync(APP_RELEASES_DIR)) {
        return FALLBACK_APK_DOWNLOAD_URL;
    }

    const apkFiles = fs.readdirSync(APP_RELEASES_DIR, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.apk'))
        .map((entry) => entry.name);

    if (apkFiles.length === 0) {
        return FALLBACK_APK_DOWNLOAD_URL;
    }

    const versionedApks = apkFiles
        .map((name) => {
            const match = /^jyl-(\d+(?:\.\d+)*)\.apk$/i.exec(name);
            return match ? { name, version: match[1] } : null;
        })
        .filter(Boolean)
        .sort((left, right) => compareSemverParts(right.version, left.version));

    if (versionedApks.length > 0) {
        return `/storage/app-releases/${versionedApks[0].name}`;
    }

    return `/storage/app-releases/${apkFiles[0]}`;
};

const getSendLockKey = (targetType, target) => `${targetType}:${target}`;

const findOrCreateSendLock = async (targetType, target, transaction) => {
    const targetKey = getSendLockKey(targetType, target);
    try {
        await VerifySendLock.findOrCreate({
            where: { targetKey },
            defaults: { targetKey },
            transaction
        });
    } catch (err) {
        if (!isUniqueConstraintError(err)) throw err;
    }

    return VerifySendLock.findByPk(targetKey, {
        transaction,
        lock: transaction.LOCK.UPDATE
    });
};

const isUniqueConstraintError = (err) => err instanceof UniqueConstraintError || err?.name === 'SequelizeUniqueConstraintError';

const clientError = (message) => {
    const err = new Error(message);
    err.isClientError = true;
    return err;
};

const parseTrendIndicators = (raw, patientType = '其他') => {
    if (!raw) return getDefaultTrendKeys(patientType);
    let value = raw;
    if (typeof raw === 'string') {
        try {
            value = JSON.parse(raw);
        } catch (e) {
            value = [];
        }
    }
    const valid = Array.isArray(value) ? value.filter(key => TREND_KEYS.includes(key)) : [];
    return valid.length ? [...new Set(valid)] : getDefaultTrendKeys(patientType);
};

const normalizeReferenceRanges = (raw) => {
    if (!raw) return {};
    let value = raw;
    if (typeof raw === 'string') {
        try {
            value = JSON.parse(raw);
        } catch (e) {
            value = {};
        }
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return Object.entries(value).reduce((acc, [key, range]) => {
        if (!TREND_KEYS.includes(key) || !range || typeof range !== 'object') return acc;
        const next = {};
        if (range.min !== undefined && range.min !== null && range.min !== '') {
            const min = Number(range.min);
            if (!Number.isNaN(min)) next.min = min;
        }
        if (range.max !== undefined && range.max !== null && range.max !== '') {
            const max = Number(range.max);
            if (!Number.isNaN(max)) next.max = max;
        }
        if (range.unit !== undefined && range.unit !== null) {
            next.unit = String(range.unit).trim();
        }
        if (Object.keys(next).length) acc[key] = next;
        return acc;
    }, {});
};

class AuthController {


    /**
     * 获取用户统计数据
     * GET /api/auth/stats
     *
     * 这里是"账号累计"口径：记录天数与化验份数缺省跨全部成员统计
     * （家庭成员数量本身就是并列展示的另一个计数）。
     * 它不做异常判定、不套参考范围，所以混算不会产生错误的医学结论。
     * 需要只看本人时传 memberId=self，看单个成员传 memberId=<成员ID>。
     */
    static async stats(ctx) {
        const { id } = ctx.state.user;
        const memberWhere = memberWhereFrom(ctx.query.memberId, { defaultMode: MEMBER_SCOPE_ALL });

        const [daysCount, labCount, familyCount] = await Promise.all([
            // 1. 记录天数 (不同日期的记录数)
            HealthRecord.count({
                where: { UserId: id, ...memberWhere },
                distinct: true,
                col: 'recordDate'
            }),
            // 2. 化验份数 (有化验数据的记录数)
            HealthRecord.count({
                where: {
                    UserId: id,
                    ...memberWhere,
                    ...anyHasValue(['TSH', 'FT3', 'FT4', 'T3', 'T4', 'Tg', 'TGAb', 'TPOAb'])
                }
            }),
            // 3. 家庭成员数量
            FamilyMember.count({ where: { UserId: id } })
        ]);

        Response.success(ctx, {
            checkupDays: daysCount,
            labReports: labCount,
            familyCount
        });
    }


    /**
     * 生成JWT Token
     */
    static generateToken(user) {
        return jwt.sign(
            {
                id: user.id,
                username: user.username || user.phone || user.email,
                // 标准 iat 只有秒精度，登录后同一秒内登出会因为"同秒"而判不出失效。
                // 额外带一个毫秒级签发时间，与 tokenInvalidBefore 精确比较。
                iatMs: Date.now()
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );
    }

    /**
     * 格式化用户信息返回
     */
    static formatUserInfo(user) {
        const patientType = user.patientType || '其他';
        return {
            id: user.id,
            username: user.username,
            phone: user.phone,
            email: user.email,
            nickname: user.nickname,
            avatar: user.avatar,
            patientType,
            treatmentStage: user.treatmentStage || '日常随访',
            trendIndicators: parseTrendIndicators(user.trendIndicators, patientType),
            referenceRanges: normalizeReferenceRanges(user.referenceRanges),
            diseaseIndicatorProfile: getDiseaseIndicatorProfile(patientType),
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
        // 与邮箱/手机注册保持同一条密码强度下限
        if (password.length < 6) {
            return Response.error(ctx, '密码长度至少6位');
        }

        const existUser = await User.findOne({ where: { username } });
        if (existUser) {
            return Response.error(ctx, '该用户已存在');
        }

        let newUser;
        try {
            newUser = await User.create({
                username,
                password,
                patientType,
                nickname: nickname || username
            });
        } catch (err) {
            // 并发注册同名账号时靠唯一索引兜底
            if (isUniqueConstraintError(err)) {
                return Response.error(ctx, '该用户已存在');
            }
            throw err;
        }

        Response.success(ctx, {
            id: newUser.id,
            username: newUser.username,
            patientType: newUser.patientType
        }, '注册成功');

        logAction(ctx, '注册', '认证', `新用户 ${newUser.username} 注册成功`, 'success', newUser);
    }

    /**
     * 检查用户名是否已存在
     * GET /api/auth/check-username
     */
    static async checkUsername(ctx) {
        const { username } = ctx.query;
        if (!username) {
            return Response.success(ctx, { exists: false });
        }

        const user = await User.findOne({ where: { username } });
        Response.success(ctx, { exists: !!user });
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

        const loginName = String(username).trim();
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { username: loginName },
                    { email: loginName }
                ]
            }
        });

        if (user && user.loginLockedUntil && new Date(user.loginLockedUntil).getTime() > Date.now()) {
            const remainingMinutes = Math.max(1, Math.ceil((new Date(user.loginLockedUntil).getTime() - Date.now()) / 60000));
            return Response.error(ctx, `账号已锁定，请 ${remainingMinutes} 分钟后再试`, 403);
        }

        if (!user || !(await user.comparePassword(password))) {
            if (user) {
                const maxFail = parseInt(process.env.LOGIN_FAIL_MAX || '5', 10);
                const lockMinutes = parseInt(process.env.LOGIN_LOCK_MINUTES || '15', 10);
                const nextFail = (user.loginFailCount || 0) + 1;
                const updateData = { loginFailCount: nextFail };

                if (nextFail >= maxFail) {
                    updateData.loginLockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
                    updateData.loginFailCount = 0;
                }

                await user.update(updateData);
            }

            logger.warn('登录失败', {
                username: loginName,
                reason: user ? 'password_mismatch' : 'user_not_found'
            });
            return Response.error(ctx, '用户名/邮箱或密码错误', 401);
        }

        await user.update({ lastLoginAt: new Date(), loginFailCount: 0, loginLockedUntil: null });

        const token = AuthController.generateToken(user);

        Response.success(ctx, {
            token,
            userInfo: AuthController.formatUserInfo(user)
        }, '登录成功');
        
        // 异步记录登录日志
        logAction(ctx, '登录', '认证', `用户 ${user.username || user.email} 登录成功`, 'success', user);
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

        let code = null;
        try {
            await sequelize.transaction(async (transaction) => {
                await findOrCreateSendLock('email', email, transaction);

                const recentCode = await VerifyCode.findOne({
                    where: {
                        target: email,
                        targetType: 'email',
                        createdAt: { [Op.gte]: new Date(Date.now() - 60000) }
                    },
                    transaction
                });

                if (recentCode) {
                    throw clientError('验证码发送太频繁，请1分钟后再试');
                }

                // 如果是注册流程，预先检查邮箱或用户名是否已存在
                if (type === 'register') {
                    const { username } = ctx.request.body;
                    const orConditions = [{ email }];
                    if (username) {
                        orConditions.push({ username });
                    }

                    const existUser = await User.findOne({
                        where: { [Op.or]: orConditions },
                        transaction
                    });

                    if (existUser) {
                        if (existUser.email === email) throw clientError('该邮箱已注册，请直接登录');
                        if (username && existUser.username === username) throw clientError('该用户名已被占用');
                    }
                }

                code = MailService.generateCode(6);
                try {
                    await MailService.sendCode(email, code);
                } catch (err) {
                    console.error('[邮件] 发送失败:', err.message);
                    throw clientError('验证码发送失败，请稍后重试');
                }

                const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效
                await VerifyCode.create({
                    target: email,
                    code,
                    type,
                    targetType: 'email',
                    expireAt
                }, { transaction });
            });
        } catch (err) {
            if (err?.isClientError) {
                return Response.error(ctx, err.message);
            }
            throw err;
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

        let newUser;
        try {
            newUser = await sequelize.transaction(async (transaction) => {
                // 1. 检查验证码
                const verifyCode = await VerifyCode.findOne({
                    where: {
                        target: email,
                        code,
                        targetType: 'email',
                        used: false,
                        expireAt: { [Op.gte]: new Date() }
                    },
                    order: [['createdAt', 'DESC']],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!verifyCode) {
                    throw clientError('验证码错误或已过期');
                }

                // 2. 检查唯一性
                const existUser = await User.findOne({
                    where: {
                        [Op.or]: [
                            { username: username },
                            { email: email }
                        ]
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (existUser) {
                    if (existUser.username === username) throw clientError('该用户名已被占用');
                    if (existUser.email === email) throw clientError('该邮箱已注册，请直接登录');
                }

                // 3. 消费验证码
                await verifyCode.update({ used: true }, { transaction });

                // 4. 创建用户
                return User.create({
                    username,
                    email,
                    password,
                    nickname: username,
                    patientType: '其他'
                }, { transaction });
            });
        } catch (err) {
            if (err?.isClientError) {
                return Response.error(ctx, err.message);
            }
            if (isUniqueConstraintError(err)) {
                return Response.error(ctx, '该用户名或邮箱已注册');
            }
            throw err;
        }

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

        try {
            await sequelize.transaction(async (transaction) => {
                await findOrCreateSendLock('sms', phone, transaction);

                const recentCode = await VerifyCode.findOne({
                    where: {
                        target: phone,
                        targetType: 'sms',
                        createdAt: { [Op.gte]: new Date(Date.now() - 60000) }
                    },
                    transaction
                });

                if (recentCode) {
                    throw clientError('验证码发送太频繁，请1分钟后再试');
                }

                const code = SmsService.generateCode(6);

                if (process.env.NODE_ENV === 'development' && !process.env.SMS_APP_ID) {
                    console.log(`[开发模式] 手机号 ${phone} 的验证码是: ${code}`);
                } else {
                    try {
                        await SmsService.sendCode(phone, code);
                    } catch (err) {
                        console.error('[短信] 发送失败:', err.message);
                        throw clientError('验证码发送失败，请稍后重试');
                    }
                }

                const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效
                await VerifyCode.create({
                    target: phone,
                    code,
                    type,
                    targetType: 'sms',
                    expireAt
                }, { transaction });
            });
        } catch (err) {
            if (err?.isClientError) return Response.error(ctx, err.message);
            throw err;
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

        // 校验并消费验证码放在同一个事务里加行锁，避免同一验证码被并发请求重复使用
        let user;
        let isNewUser = false;
        try {
            ({ user, isNewUser } = await sequelize.transaction(async (transaction) => {
                const verifyCode = await VerifyCode.findOne({
                    where: {
                        target: phone,
                        code,
                        targetType: 'sms',
                        used: false,
                        expireAt: { [Op.gte]: new Date() }
                    },
                    order: [['createdAt', 'DESC']],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!verifyCode) {
                    throw clientError('验证码错误或已过期');
                }

                await verifyCode.update({ used: true }, { transaction });

                let found = await User.findOne({ where: { phone }, transaction });
                let created = false;

                if (!found) {
                    found = await User.create({
                        phone,
                        nickname: nickname || `甲友${phone.slice(-4)}`,
                        patientType: '其他'
                    }, { transaction });
                    created = true;
                }

                return { user: found, isNewUser: created };
            }));
        } catch (err) {
            if (err?.isClientError) return Response.error(ctx, err.message);
            if (isUniqueConstraintError(err)) return Response.error(ctx, '该手机号已注册，请重试');
            throw err;
        }

        // 更新最后登录时间
        await user.update({ lastLoginAt: new Date() });

        const token = AuthController.generateToken(user);

        Response.success(ctx, {
            token,
            userInfo: AuthController.formatUserInfo(user),
            isNewUser
        }, isNewUser ? '注册成功' : '登录成功');
        logAction(ctx, isNewUser ? '手机注册' : '手机登录', '认证', `用户 ${user.phone} 登录成功`, 'success', user);
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

        let newUser;
        try {
            newUser = await sequelize.transaction(async (transaction) => {
                // 验证验证码
                const verifyCode = await VerifyCode.findOne({
                    where: {
                        target: phone,
                        code,
                        targetType: 'sms',
                        used: false,
                        expireAt: { [Op.gte]: new Date() }
                    },
                    order: [['createdAt', 'DESC']],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!verifyCode) {
                    throw clientError('验证码错误或已过期');
                }

                // 检查用户是否已存在
                const existUser = await User.findOne({
                    where: { phone },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (existUser) {
                    throw clientError('该手机号已注册，请直接登录');
                }

                // 标记验证码已使用
                await verifyCode.update({ used: true }, { transaction });

                // 创建新用户
                return User.create({
                    phone,
                    password, // 模型钩子会自动加密
                    username: phone, // 默认用户名同手机号
                    nickname: nickname || `甲友${phone.slice(-4)}`,
                    patientType: '其他'
                }, { transaction });
            });
        } catch (err) {
            if (err?.isClientError) {
                return Response.error(ctx, err.message);
            }
            if (isUniqueConstraintError(err)) {
                return Response.error(ctx, '该手机号已注册，请直接登录');
            }
            throw err;
        }

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
        const { nickname, avatar, patientType, treatmentStage, diagnosisDate, birthDate, gender, trendIndicators, referenceRanges } = ctx.request.body;

        const user = await User.findByPk(id);
        if (!user) {
            return Response.error(ctx, '用户不存在', 404);
        }

        const nextPatientType = patientType || user.patientType || '其他';
        const updateData = {
            nickname: nickname || user.nickname,
            avatar: avatar || user.avatar,
            patientType: nextPatientType,
            treatmentStage: treatmentStage || user.treatmentStage || '日常随访',
            diagnosisDate: diagnosisDate || user.diagnosisDate,
            birthDate: birthDate || user.birthDate,
            gender: gender || user.gender
        };

        if (Object.prototype.hasOwnProperty.call(ctx.request.body, 'trendIndicators')) {
            updateData.trendIndicators = JSON.stringify(parseTrendIndicators(trendIndicators, nextPatientType));
        }

        if (Object.prototype.hasOwnProperty.call(ctx.request.body, 'referenceRanges')) {
            updateData.referenceRanges = JSON.stringify(normalizeReferenceRanges(referenceRanges));
        }

        await user.update(updateData);
        invalidateUserCache(id);

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

        // 占用检查、验证码消费和绑定放在同一事务里，避免两个账号并发绑同一号码
        let user;
        try {
            user = await sequelize.transaction(async (transaction) => {
                const existUser = await User.findOne({
                    where: { phone },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (existUser && existUser.id !== id) {
                    throw clientError('该手机号已被其他账号绑定');
                }

                const verifyCode = await VerifyCode.findOne({
                    where: {
                        target: phone,
                        code,
                        targetType: 'sms',
                        used: false,
                        expireAt: { [Op.gte]: new Date() }
                    },
                    order: [['createdAt', 'DESC']],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!verifyCode) {
                    throw clientError('验证码错误或已过期');
                }

                await verifyCode.update({ used: true }, { transaction });

                const target = await User.findByPk(id, { transaction });
                if (!target) {
                    throw clientError('用户不存在');
                }
                await target.update({ phone }, { transaction });
                return target;
            });
        } catch (err) {
            if (err?.isClientError) return Response.error(ctx, err.message);
            if (isUniqueConstraintError(err)) return Response.error(ctx, '该手机号已被其他账号绑定');
            throw err;
        }

        invalidateUserCache(id);
        Response.success(ctx, AuthController.formatUserInfo(user), '手机号绑定成功');
    }

    /**
     * 设置/修改密码
     * POST /api/auth/setPassword
     */
    static async setPassword(ctx) {
        const { id } = ctx.state.user;
        const { newPassword, oldPassword } = ctx.request.body;

        if (!newPassword || newPassword.length < 6) {
            return Response.error(ctx, '新密码长度至少6位');
        }

        const user = await User.findByPk(id);
        if (!user) {
            return Response.error(ctx, '用户不存在', 404);
        }

        // 如果已有密码（非第三方登录直接进入的情况），需要验证旧密码
        if (user.password) {
            if (!oldPassword) {
                return Response.error(ctx, '请输入原密码');
            }
            if (!(await user.comparePassword(oldPassword))) {
                return Response.error(ctx, '原密码错误');
            }
        }

        // 改密后让此前签发的所有令牌失效，避免旧设备继续保持登录。
        // 当前请求用的令牌也会一起失效，所以下发一个新令牌让本机免于重新登录。
        const invalidBefore = new Date();
        await user.update({ password: newPassword, tokenInvalidBefore: invalidBefore });
        invalidateUserCache(id);

        const token = AuthController.generateToken(user);

        Response.success(ctx, { token }, '密码修改成功');
        logAction(ctx, '修改密码', '认证', `用户 ${user.username || user.phone || 'ID:'+id} 修改了登录密码`);
    }

    /**
     * 退出登录：作废当前用户此前签发的全部令牌
     * POST /api/auth/logout
     */
    static async logout(ctx) {
        const { id } = ctx.state.user;

        const user = await User.findByPk(id);
        if (!user) {
            return Response.error(ctx, '用户不存在', 404);
        }

        await user.update({ tokenInvalidBefore: new Date() });
        invalidateUserCache(id);

        Response.success(ctx, null, '已退出登录');
        logAction(ctx, '退出登录', '认证', `用户 ${user.username || user.phone || 'ID:' + id} 退出登录`);
    }


    /**
     * 注销账号：删除该账号的全部个人数据
     * POST /api/auth/account/delete
     *
     * 这是不可逆操作，所以要求三重条件同时满足：
     *  1. 已登录（路由上的 auth 中间件）；
     *  2. 手输确认短语，防止误触；
     *  3. 二次身份校验——有密码的账号必须输密码，
     *     纯验证码登录（微信/短信）的账号必须提供发送到本人手机/邮箱的验证码。
     *     只靠"持有令牌"是不够的：手机被临时借用或令牌泄露都能一键删光健康数据。
     */
    static async deleteAccount(ctx) {
        const { id } = ctx.state.user;
        const { confirmText, password, code } = ctx.request.body || {};

        if (String(confirmText || '').trim() !== DELETE_ACCOUNT_CONFIRM_TEXT) {
            return Response.error(ctx, `请输入“${DELETE_ACCOUNT_CONFIRM_TEXT}”以确认此操作`, 400);
        }

        const user = await User.findByPk(id);
        if (!user) {
            return Response.error(ctx, '用户不存在', 404);
        }

        if (user.password) {
            if (!password) {
                return Response.error(ctx, '请输入登录密码以确认注销', 400);
            }
            if (!(await user.comparePassword(password))) {
                // 刻意用 400 而不是 401：前端拦截器把所有 401 一律当成"登录已过期"，
                // 会强制登出并跳回登录页。注销流程里用户是登录着的，
                // 输错一次密码就被踢出去、还提示"登录已过期"，既误导又要重来一遍。
                return Response.error(ctx, '密码错误，请重新输入', 400);
            }
        } else {
            // 没有设置密码的账号只能走验证码，且目标必须是账号自己绑定的手机/邮箱
            const target = user.phone || user.email;
            const targetType = user.phone ? 'sms' : 'email';
            if (!target) {
                return Response.error(ctx, '当前账号未设置密码且未绑定手机/邮箱，请先设置密码后再注销', 400);
            }
            if (!code || !/^\d{6}$/.test(String(code))) {
                return Response.error(ctx, '请输入发送到本人手机/邮箱的6位验证码', 400);
            }

            const consumed = await sequelize.transaction(async (transaction) => {
                const verifyCode = await VerifyCode.findOne({
                    where: {
                        target,
                        code: String(code),
                        targetType,
                        used: false,
                        expireAt: { [Op.gte]: new Date() }
                    },
                    order: [['createdAt', 'DESC']],
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });
                if (!verifyCode) return false;
                await verifyCode.update({ used: true }, { transaction });
                return true;
            });

            if (!consumed) {
                // 同上，不用 401，避免被前端当成会话失效
                return Response.error(ctx, '验证码错误或已过期', 400);
            }
        }

        const result = await AccountDeletionService.deleteAccount(id);
        if (!result) {
            return Response.error(ctx, '用户不存在', 404);
        }

        invalidateUserCache(id);

        // 账号行已经删掉，日志里的 userId 只能显式传：ctx.state.user 指向的已是不存在的账号
        logAction(
            ctx,
            '注销账号',
            '认证',
            `账号 ${result.identity.username || result.identity.phone || result.identity.email || `ID:${id}`} 已注销：${JSON.stringify(result.summary)}`,
            'success',
            { id: null, username: DELETED_ACCOUNT_LOG_NAME }
        );

        Response.success(ctx, { deleted: result.summary }, '账号及全部数据已删除');
    }

    /**
     * 获取公开系统配置
     * GET /api/common/config
     */
    static async getPublicConfig(ctx) {
        Response.success(ctx, {
            supportEmail: process.env.SUPPORT_EMAIL || 'support@jiayoule.com',
            wechatSupport: process.env.WECHAT_SUPPORT || 'JYL_Support',
            version: pkg.version,
            apkDownloadUrl: normalizePublicUrl(ctx, resolveDefaultApkDownloadUrl())
        });
    }
}

module.exports = AuthController;
module.exports.DELETE_ACCOUNT_CONFIRM_TEXT = DELETE_ACCOUNT_CONFIRM_TEXT;


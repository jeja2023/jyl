const User = require('../models/User');
const { Op } = require('sequelize');

class UserService {
    /**
     * 通过手机号创建用户 (如果不存在)
     * @param {Object} data - { phone, nickname... }
     */
    static async findOrCreateByPhone(phone, additionalData = {}) {
        let user = await User.findOne({ where: { phone } });
        let isNewUser = false;

        if (!user) {
            user = await User.create({
                phone,
                nickname: additionalData.nickname || `甲友${phone.slice(-4)}`,
                patientType: '其他',
                ...additionalData
            });
            isNewUser = true;
        }

        return { user, isNewUser };
    }

    /**
     * 微信小程序登录：通过 openid 查找或创建用户
     * @param {string} openid
     * @param {string} unionid
     * @param {Object} userInfo - 微信用户信息
     */
    static async findOrCreateByWechat(openid, unionid, userInfo) {
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
                password: Math.random().toString(36).substring(2, 12) + '!' // 随机密码
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

        return { user, isNewUser };
    }

    /**
     * 微信手机号登录：优先匹配手机号，其次匹配 openid
     * @param {string} phone
     * @param {string} openid
     * @param {string} unionid
     */
    static async handleWechatPhoneLogin(phone, openid, unionid) {
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
                password: Math.random().toString(36).substring(2, 12) + '!'
            });
            isNewUser = true;
        } else {
            // 已有用户，补全信息
            await user.update({
                phone: user.phone || phone,
                openid: user.openid || openid,
                unionid: user.unionid || unionid
            });
        }

        return { user, isNewUser };
    }
}

module.exports = UserService;

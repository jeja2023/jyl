const { DataTypes } = require('sequelize');
const sequelize = require('../db');

/**
 * 验证码模型
 * 支持手机号/邮箱 登录/注册/绑定的验证码存储
 */
const VerifyCode = sequelize.define('VerifyCode', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    target: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '发送目标 (手机号或邮箱)'
    },
    code: {
        type: DataTypes.STRING(6),
        allowNull: false,
        comment: '验证码'
    },
    type: {
        type: DataTypes.ENUM('login', 'register', 'bind'),
        defaultValue: 'login',
        comment: '验证码类型'
    },
    targetType: {
        type: DataTypes.ENUM('sms', 'email'),
        defaultValue: 'sms',
        comment: '目标类型'
    },
    expireAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '过期时间'
    },
    used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否已使用'
    }
}, {
    timestamps: true,
    comment: '验证码存储表'
});

module.exports = VerifyCode;

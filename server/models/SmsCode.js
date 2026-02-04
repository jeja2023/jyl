const { DataTypes } = require('sequelize');
const sequelize = require('../db');

/**
 * 短信验证码模型
 * 用于手机号登录/注册的验证码存储
 */
const SmsCode = sequelize.define('SmsCode', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    phone: {
        type: DataTypes.STRING(11),
        allowNull: false,
        comment: '手机号码'
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
    comment: '短信验证码表'
});

module.exports = SmsCode;

const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '用户ID'
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,  // 允许为空，支持微信/手机号登录
        comment: '用户名'
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,  // 允许为空，微信登录不需要密码
        comment: '加密后的密码'
    },
    phone: {
        type: DataTypes.STRING(11),
        unique: true,
        allowNull: true,
        comment: '手机号码'
    },
    openid: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        comment: '微信小程序openid'
    },
    unionid: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
        comment: '微信unionid（跨应用）'
    },
    nickname: {
        type: DataTypes.STRING,
        comment: '昵称'
    },
    avatar: {
        type: DataTypes.STRING,
        comment: '头像URL'
    },
    // --- 甲状腺专属字段 ---
    patientType: {
        type: DataTypes.ENUM('甲减', '甲亢', '甲状腺结节', '甲癌术后', '桥本氏甲状腺炎', '其他'),
        defaultValue: '其他',
        comment: '疾病类型'
    },
    diagnosisDate: {
        type: DataTypes.DATEONLY,
        comment: '确诊日期'
    },
    birthDate: {
        type: DataTypes.DATEONLY,
        comment: '出生日期'
    },
    gender: {
        type: DataTypes.ENUM('男', '女'),
        comment: '性别(影响参考值)'
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        defaultValue: 'user',
        comment: '用户角色'
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        comment: '最后登录时间'
    }
}, {
    timestamps: true,
    comment: '甲友用户基础档案表'
});

const bcrypt = require('bcryptjs');

// 钩子：创建前哈希密码
User.beforeCreate(async (user) => {
    if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

// 钩子：更新前如果修改了密码则重新哈希
User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

// 实例方法：校验密码
User.prototype.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = User;

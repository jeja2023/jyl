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
        unique: 'idx_user_username',
        allowNull: true,
        comment: '用户名'
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,  // 允许为空，微信登录不需要密码
        comment: '加密后的密码'
    },
    phone: {
        type: DataTypes.STRING(11),
        unique: 'idx_user_phone',
        allowNull: true,
        comment: '手机号码'
    },
    email: {
        type: DataTypes.STRING,
        unique: 'idx_user_email',
        allowNull: true,
        comment: '电子邮箱'
    },
    openid: {
        type: DataTypes.STRING,
        unique: 'idx_user_openid',
        allowNull: true,
        comment: '微信小程序openid'
    },
    unionid: {
        type: DataTypes.STRING,
        unique: 'idx_user_unionid',
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
        type: DataTypes.STRING(64),
        defaultValue: '其他',
        comment: '疾病类型'
    },
    treatmentStage: {
        type: DataTypes.STRING(64),
        defaultValue: '日常随访',
        comment: '治疗阶段/随访阶段'
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
    },
    loginFailCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '登录失败次数'
    },
    loginLockedUntil: {
        type: DataTypes.DATE,
        comment: '登录锁定截止时间'
    },
    tokenInvalidBefore: {
        // DATE(3) 保留毫秒：默认 DATETIME 精度到秒，
        // 会把登出时刻截成整秒，同一秒内签发的令牌就判不出失效
        type: DataTypes.DATE(3),
        allowNull: true,
        comment: '此时间之前签发的令牌一律失效(登出/改密时更新)'
    },
    wikiReadCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '百科阅读数'
    },
    trendIndicators: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '用户自定义趋势指标(JSON数组)'
    },
    referenceRanges: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '用户自定义指标参考范围(JSON)'
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

// 序列化时默认去除 password，防止意外泄露
User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
};

module.exports = User;

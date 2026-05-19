const { DataTypes } = require('sequelize');
const sequelize = require('../db');

/**
 * 验证码发送锁
 * 用于串行化同一手机号/邮箱的验证码发送流程，避免并发绕过冷却时间。
 */
const VerifySendLock = sequelize.define('VerifySendLock', {
    targetKey: {
        type: DataTypes.STRING(160),
        primaryKey: true,
        comment: '发送目标唯一键，例如 email:user@example.com'
    }
}, {
    timestamps: true,
    comment: '验证码发送并发锁表'
});

module.exports = VerifySendLock;

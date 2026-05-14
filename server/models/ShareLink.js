const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const HealthRecord = require('./HealthRecord');

const ShareLink = sequelize.define('ShareLink', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '分享链接ID'
    },
    tokenHash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
        comment: '分享令牌哈希'
    },
    type: {
        type: DataTypes.ENUM('record'),
        allowNull: false,
        defaultValue: 'record',
        comment: '分享类型'
    },
    resourceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '分享资源ID'
    },
    expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '过期时间'
    },
    revokedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '撤销时间'
    },
    accessCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '访问次数'
    },
    lastAccessAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '最近访问时间'
    },
    lastAccessIp: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: '最近访问IP'
    },
    options: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '分享脱敏与字段配置(JSON)'
    }
}, {
    timestamps: true,
    indexes: [
        { name: 'idx_share_token_hash', fields: ['tokenHash'] },
        { name: 'idx_share_owner_resource', fields: ['UserId', 'resourceId'] },
        { name: 'idx_share_expires', fields: ['expiresAt', 'revokedAt'] }
    ],
    comment: '用户分享链接表'
});

User.hasMany(ShareLink);
ShareLink.belongsTo(User);
HealthRecord.hasMany(ShareLink, { foreignKey: 'resourceId', constraints: false });
ShareLink.belongsTo(HealthRecord, { foreignKey: 'resourceId', constraints: false });

module.exports = ShareLink;

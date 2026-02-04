const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID'
    },
    type: {
        type: DataTypes.ENUM('system', 'checkup', 'medication'),
        defaultValue: 'system',
        comment: '消息类型: system-系统通知, checkup-复查提醒, medication-用药提醒'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '标题'
    },
    content: {
        type: DataTypes.TEXT,
        comment: '内容'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否已读'
    },
    targetDate: {
        type: DataTypes.DATE,
        comment: '关联时间(如复查日期)'
    }
}, {
    timestamps: true,
    comment: '系统通知表'
});

// 建立关联
User.hasMany(Notification);
Notification.belongsTo(User);

module.exports = Notification;

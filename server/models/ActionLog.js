const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ActionLog = sequelize.define('ActionLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '日志ID'
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '操作用户ID'
    },
    username: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '用户名'
    },
    action: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '操作行为'
    },
    module: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '所属模块'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '详情描述或参数'
    },
    ip: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '操作IP'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'success',
        comment: '操作结果'
    }
}, {
    timestamps: true,
    updatedAt: false, // 只有创建时间
    comment: '系统操作日志表'
});

module.exports = ActionLog;

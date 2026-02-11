const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const CheckupReminder = sequelize.define('CheckupReminder', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '复查日期'
    },
    note: {
        type: DataTypes.STRING,
        comment: '复查备注'
    },
    isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否已完成'
    }
}, {
    timestamps: true,
    comment: '复查提醒表'
});

// 建立关联
User.hasMany(CheckupReminder);
CheckupReminder.belongsTo(User);

module.exports = CheckupReminder;

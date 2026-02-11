const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const MedicationPlan = sequelize.define('MedicationPlan', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID'
    },
    medicineName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '药品名称 (如: 优甲乐)'
    },
    dosage: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '服用剂量 (如: 1.5片 / 75ug)'
    },
    takeTime: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: '每日服药时间 (如: 06:30:00)'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '是否开启提醒'
    },
    notes: {
        type: DataTypes.STRING,
        comment: '备注 (如: 需空腹, 早餐前半小时)'
    },
    lastTakenDate: {
        type: DataTypes.DATEONLY,
        comment: '上次服药日期'
    }
}, {
    timestamps: true,
    comment: '用户服药提醒计划表' // 表级注释
});

User.hasMany(MedicationPlan);
MedicationPlan.belongsTo(User);

module.exports = MedicationPlan;

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
    weeklyDosage: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '按星期覆盖剂量，JSON对象，键为0-6（周日-周六）'
    },
    scheduleType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'weekly',
        comment: '服药规则：weekly-按星期，interval-按间隔天数'
    },
    intervalDays: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '间隔服药天数'
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: '服药计划开始日期'
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
    comment: '用户服药提醒计划表', // 表级注释
    indexes: [
        { name: 'idx_med_plans_user_active_time', fields: ['UserId', 'isActive', 'takeTime'] }
    ]
});

User.hasMany(MedicationPlan);
MedicationPlan.belongsTo(User);

module.exports = MedicationPlan;

const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const MedicationPlan = require('./MedicationPlan');

const MedicationLog = sequelize.define('MedicationLog', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '记录ID'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '服药日期'
    },
    takenAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '服药时间'
    },
    source: {
        type: DataTypes.ENUM('normal', 'makeup'),
        allowNull: false,
        defaultValue: 'normal',
        comment: '记录来源：normal-当天打卡，makeup-补签'
    },
    note: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: '补签或服药备注'
    },
    medicineNameSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '服药时药品名称快照'
    },
    dosageSnapshot: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '服药时剂量快照'
    }
}, {
    timestamps: true,
    updatedAt: false,
    comment: '服药打卡记录'
});

User.hasMany(MedicationLog);
MedicationLog.belongsTo(User);
MedicationPlan.hasMany(MedicationLog, { onDelete: 'CASCADE' });
MedicationLog.belongsTo(MedicationPlan, { onDelete: 'CASCADE' });

module.exports = MedicationLog;

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

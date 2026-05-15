const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const MedicationPlan = require('./MedicationPlan');

const MedicationAdjustment = sequelize.define('MedicationAdjustment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '调整记录ID'
    },
    adjustmentDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '调整日期'
    },
    medicineName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '药品名称'
    },
    fromDosage: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '调整前剂量'
    },
    toDosage: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '调整后剂量'
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '调整原因'
    }
}, {
    timestamps: true,
    comment: '用药剂量调整历史'
});

User.hasMany(MedicationAdjustment);
MedicationAdjustment.belongsTo(User);
MedicationPlan.hasMany(MedicationAdjustment);
MedicationAdjustment.belongsTo(MedicationPlan);

module.exports = MedicationAdjustment;

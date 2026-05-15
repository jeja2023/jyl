const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const FamilyMember = sequelize.define('FamilyMember', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '成员ID'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '成员姓名'
    },
    relation: {
        type: DataTypes.STRING,
        comment: '与本人关系'
    },
    gender: {
        type: DataTypes.ENUM('男', '女'),
        comment: '性别'
    },
    birthDate: {
        type: DataTypes.DATEONLY,
        comment: '出生日期'
    },
    patientType: {
        type: DataTypes.STRING(64),
        defaultValue: '其他',
        comment: '疾病类型'
    },
    treatmentStage: {
        type: DataTypes.STRING(64),
        defaultValue: '日常随访',
        comment: '治疗阶段/随访阶段'
    },
    note: {
        type: DataTypes.STRING,
        comment: '备注'
    },
    referenceRanges: {
        type: DataTypes.TEXT,
        comment: '自定义指标参考范围(JSON)'
    },
    checkupIntervalDays: {
        type: DataTypes.INTEGER,
        comment: '个性化复查周期(天)'
    }
}, {
    timestamps: true,
    comment: '家庭成员表'
});

User.hasMany(FamilyMember);
FamilyMember.belongsTo(User);

module.exports = FamilyMember;

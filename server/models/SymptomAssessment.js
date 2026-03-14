const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const SymptomAssessment = sequelize.define('SymptomAssessment', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID'
    },
    totalScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '综合评分'
    },
    resultLevel: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '结果等级: normal, mild, moderate, severe'
    },
    activityStatus: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '活跃度状态: 倾向性描述'
    },
    hyperScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '甲亢倾向得分'
    },
    hypoScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '甲减倾向得分'
    },
    categoryScores: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '各维度评分详情 (JSON 字符串)'
    },
    answers: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '原始答题详情 (JSON 字符串)'
    },
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '关联用户ID'
    }
}, {
    timestamps: true,
    comment: '症状自测记录表'
});

// 建立关联
User.hasMany(SymptomAssessment);
SymptomAssessment.belongsTo(User);

module.exports = SymptomAssessment;

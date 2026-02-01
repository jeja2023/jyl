const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const HealthRecord = sequelize.define('HealthRecord', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: '主键ID'
    },
    recordDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '记录/化验日期'
    },
    // --- 核心甲功指标 (甲功五项/七项) ---
    TSH: {
        type: DataTypes.FLOAT,
        comment: '促甲状腺激素 (mIU/L)'
    },
    FT3: {
        type: DataTypes.FLOAT,
        comment: '游离三碘甲状腺原氨酸 (pmol/L)'
    },
    FT4: {
        type: DataTypes.FLOAT,
        comment: '游离甲状腺素 (pmol/L)'
    },
    T3: {
        type: DataTypes.FLOAT,
        comment: '三碘甲状腺原氨酸 (nmol/L)'
    },
    T4: {
        type: DataTypes.FLOAT,
        comment: '总甲状腺素 (nmol/L)'
    },
    TGAb: {
        type: DataTypes.FLOAT,
        comment: '甲状腺球蛋白抗体 (IU/mL)'
    },
    TPOAb: {
        type: DataTypes.FLOAT,
        comment: '甲状腺过氧化物酶抗体 (IU/mL)'
    },
    // --- 进阶/特定病种指标 ---
    TRAb: {
        type: DataTypes.FLOAT,
        comment: '促甲状腺素受体抗体 (IU/L) - 甲亢/Graves关键'
    },
    Tg: {
        type: DataTypes.FLOAT,
        comment: '甲状腺球蛋白 (ng/mL) - 甲癌术后复发监测'
    },
    Calcitonin: {
        type: DataTypes.FLOAT,
        comment: '降钙素 (pg/mL) - 髓样癌筛查'
    },
    // --- 电解质与甲状旁腺 (术后低钙关注) ---
    Calcium: {
        type: DataTypes.FLOAT,
        comment: '血钙 (mmol/L) - 术后手麻抽筋关注'
    },
    Magnesium: {
        type: DataTypes.FLOAT,
        comment: '血镁 (mmol/L)'
    },
    Phosphorus: {
        type: DataTypes.FLOAT,
        comment: '血磷 (mmol/L)'
    },
    PTH: {
        type: DataTypes.FLOAT,
        comment: '甲状旁腺激素 (pg/mL) - 调节钙磷代谢'
    },
    // --- 身体状态 ---
    weight: {
        type: DataTypes.FLOAT,
        comment: '体重 (kg)'
    },
    heartRate: {
        type: DataTypes.INTEGER,
        comment: '静息心率 (bpm)'
    },
    feeling: {
        type: DataTypes.STRING,
        comment: '自我感觉/备注'
    },
    reportImage: {
        type: DataTypes.STRING,
        comment: '化验单图片路径'
    }
}, {
    timestamps: true,
    comment: '甲友健康指标监测记录表' // 表级注释
});

// 建立关联
User.hasMany(HealthRecord);
HealthRecord.belongsTo(User);

module.exports = HealthRecord;

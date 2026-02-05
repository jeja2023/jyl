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
    // --- 核心甲功指标 (甲功五项/七项) ---
    TSH: {
        type: DataTypes.DOUBLE,
        comment: '促甲状腺激素 (mIU/L)'
    },
    FT3: {
        type: DataTypes.DOUBLE,
        comment: '游离三碘甲状腺原氨酸 (pmol/L)'
    },
    FT4: {
        type: DataTypes.DOUBLE,
        comment: '游离甲状腺素 (pmol/L)'
    },
    T3: {
        type: DataTypes.DOUBLE,
        comment: '三碘甲状腺原氨酸 (nmol/L)'
    },
    T4: {
        type: DataTypes.DOUBLE,
        comment: '总甲状腺素 (nmol/L)'
    },
    TGAb: {
        type: DataTypes.DOUBLE,
        comment: '甲状腺球蛋白抗体 (IU/mL)'
    },
    TPOAb: {
        type: DataTypes.DOUBLE,
        comment: '甲状腺过氧化物酶抗体 (IU/mL)'
    },
    // --- 进阶/特定病种指标 ---
    TRAb: {
        type: DataTypes.DOUBLE,
        comment: '促甲状腺素受体抗体 (IU/L) - 甲亢/Graves关键'
    },
    Tg: {
        type: DataTypes.DOUBLE,
        comment: '甲状腺球蛋白 (ng/mL) - 甲癌术后复发监测'
    },
    Calcitonin: {
        type: DataTypes.DOUBLE,
        comment: '降钙素 (pg/mL) - 髓样癌筛查'
    },
    // --- 电解质与甲状旁腺 (术后低钙关注) ---
    Calcium: {
        type: DataTypes.DOUBLE,
        comment: '血钙 (mmol/L) - 术后手麻抽筋关注'
    },
    Magnesium: {
        type: DataTypes.DOUBLE,
        comment: '血镁 (mmol/L)'
    },
    Phosphorus: {
        type: DataTypes.DOUBLE,
        comment: '血磷 (mmol/L)'
    },
    PTH: {
        type: DataTypes.DOUBLE,
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
    // --- B超报告相关 ---
    ultrasoundDate: {
        type: DataTypes.DATEONLY,
        comment: 'B超检查日期 (可与化验日期不同)'
    },
    thyroidLeft: {
        type: DataTypes.STRING,
        comment: '左叶大小 (如: 45×15×13mm)'
    },
    thyroidRight: {
        type: DataTypes.STRING,
        comment: '右叶大小 (如: 46×16×14mm)'
    },
    isthmus: {
        type: DataTypes.STRING,
        comment: '峡部厚度 (mm 或 状态描述)'
    },
    noduleCount: {
        type: DataTypes.STRING,
        comment: '结节数量'
    },
    noduleMaxSize: {
        type: DataTypes.STRING,
        comment: '最大结节尺寸 (如: 8×6mm)'
    },
    noduleLocation: {
        type: DataTypes.STRING,
        comment: '结节位置 (如: 左叶中部)'
    },
    tiradsLevel: {
        type: DataTypes.STRING,
        comment: 'TI-RADS分级 (1-5级)'
    },
    noduleFeatures: {
        type: DataTypes.STRING,
        comment: '结节特征 (如: 低回声、边界清晰、无钙化)'
    },
    lymphNode: {
        type: DataTypes.STRING,
        comment: '淋巴结情况'
    },
    ultrasoundNote: {
        type: DataTypes.TEXT,
        comment: 'B超报告原文/备注'
    },
    reportImage: {
        type: DataTypes.TEXT,
        comment: '化验单图片路径 (JSON数组)'
    },
    ultrasoundImage: {
        type: DataTypes.TEXT,
        comment: 'B超报告图片路径 (JSON数组)'
    }
}, {
    timestamps: true,
    comment: '甲友健康指标监测记录表', // 表级注释
    indexes: [
        {
            fields: ['UserId']
        },
        {
            fields: ['recordDate']
        },
        {
            fields: ['UserId', 'recordDate']
        }
    ]
});

// 建立关联
User.hasMany(HealthRecord);
HealthRecord.belongsTo(User);

module.exports = HealthRecord;

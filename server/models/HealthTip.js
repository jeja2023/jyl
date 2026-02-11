const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const HealthTip = sequelize.define('HealthTip', {
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '贴士内容'
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'general',
        comment: '分类: medication, diet, lifestyle'
    }
});

module.exports = HealthTip;

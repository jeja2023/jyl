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
        type: DataTypes.ENUM('甲减', '甲亢', '甲状腺结节', '甲癌术后', '桥本氏甲状腺炎', '其他'),
        defaultValue: '其他',
        comment: '疾病类型'
    },
    note: {
        type: DataTypes.STRING,
        comment: '备注'
    }
}, {
    timestamps: true,
    comment: '家庭成员表'
});

User.hasMany(FamilyMember);
FamilyMember.belongsTo(User);

module.exports = FamilyMember;

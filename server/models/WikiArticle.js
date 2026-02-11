const { DataTypes } = require('sequelize');
const sequelize = require('../db');

/**
 * 百科文章模型
 */
const WikiArticle = sequelize.define('WikiArticle', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: '文章标题'
    },
    summary: {
        type: DataTypes.STRING(500),
        comment: '文章摘要'
    },
    content: {
        type: DataTypes.TEXT('long'),
        comment: '文章内容(HTML)'
    },
    category: {
        type: DataTypes.STRING(50),
        defaultValue: '疾病知识',
        comment: '分类：疾病知识/用药指南/饮食调理/生活方式/检查解读'
    },
    cover: {
        type: DataTypes.STRING(500),
        comment: '封面图片URL'
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '阅读量'
    },
    status: {
        type: DataTypes.ENUM('draft', 'pending', 'published', 'rejected', 'archived'),
        defaultValue: 'pending',
        comment: '状态：草稿/待审核/已发布/已拒绝/已归档'
    },
    authorId: {
        type: DataTypes.INTEGER,
        comment: '作者ID'
    },
    authorName: {
        type: DataTypes.STRING(50),
        comment: '作者昵称'
    },
    rejectReason: {
        type: DataTypes.STRING(500),
        comment: '拒绝原因'
    },
    isTop: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否置顶'
    },
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '排序权重'
    }
}, {
    tableName: 'wiki_articles',
    timestamps: true,
    comment: '百科文章表'
});

module.exports = WikiArticle;

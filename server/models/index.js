const fs = require('fs');
const path = require('path');
const sequelize = require('../db');

/**
 * 模型统一注册入口。
 *
 * 之前每个需要"全部模型"的地方（DbService.sync、迁移自检）都自己维护一份
 * require 清单，WikiArticle 就曾经漏在 DbService 里，靠路由加载顺序才碰巧建了表。
 * 这里改成扫描目录自动加载：新增模型文件即自动纳入，不存在漏登记这回事。
 *
 * 注意必须整目录一次性加载完，关联（hasMany/belongsTo）产生的外键字段
 * 是在模型模块执行时才挂到 rawAttributes 上的，少加载一个模型就会少一批外键列。
 */
const loadModels = () => {
    const files = fs.readdirSync(__dirname)
        .filter((file) => file.endsWith('.js') && file !== 'index.js')
        .sort();

    const models = {};
    for (const file of files) {
        const model = require(path.join(__dirname, file));
        if (model && typeof model.getAttributes === 'function' && model.name) {
            models[model.name] = model;
        }
    }
    return models;
};

const models = loadModels();

/**
 * 取模型声明的全部数据库列名（含 timestamps 和关联生成的外键）。
 * 有 field 映射时以 field 为准，那才是真实列名。
 */
const getModelColumns = (model) => {
    const attributes = model.getAttributes();
    return Object.entries(attributes).map(([name, attribute]) => attribute?.field || name);
};

module.exports = { sequelize, models, getModelColumns };

const test = require('node:test');
const assert = require('node:assert/strict');
const { Sequelize, DataTypes } = require('sequelize');
const { hasValue, anyHasValue } = require('../utils/recordQuery');

/**
 * 化验指标是字符串列，Excel 导入过的历史数据里可能是空字符串。
 * 这里断言生成的 SQL 同时排除 NULL 和空串——只写 IS NOT NULL 是不够的。
 */

const buildWhereSql = (where) => {
    const sequelize = new Sequelize('db', 'u', 'p', { dialect: 'mysql', logging: false });
    const Model = sequelize.define('R', { TSH: DataTypes.STRING, FT4: DataTypes.STRING }, { timestamps: false });
    const sql = sequelize.getQueryInterface().queryGenerator.selectQuery(
        'Rs',
        { where, attributes: ['id'] },
        Model
    );
    return sql.match(/WHERE (.*);/)[1];
};

test('hasValue 同时排除 NULL 和空字符串', () => {
    const sql = buildWhereSql(hasValue('TSH'));
    assert.match(sql, /IS NOT NULL/);
    assert.match(sql, /!= ''/);
});

test('anyHasValue 用 OR 串联多个指标', () => {
    const sql = buildWhereSql(anyHasValue(['TSH', 'FT4']));
    assert.match(sql, /`TSH`/);
    assert.match(sql, /`FT4`/);
    assert.match(sql, / OR /);
    // 每个指标都要带上空串判断，不能只判 NULL
    assert.equal((sql.match(/!= ''/g) || []).length, 2);
});

test('anyHasValue 可与其他条件合并而不互相覆盖', () => {
    const sql = buildWhereSql({ UserId: 7, ...anyHasValue(['TSH']) });
    assert.match(sql, /`UserId` = 7/);
    assert.match(sql, /IS NOT NULL/);
    assert.match(sql, /!= ''/);
});

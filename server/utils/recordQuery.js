const { Op } = require('sequelize');

/**
 * 化验指标以字符串存储，Excel 导入等路径会写入空字符串。
 * 只用 `IS NOT NULL` 判断会把空字符串算成"填了值"，
 * 导致统计化验份数、hasLab 过滤和趋势查询都把空记录算进去。
 */
const hasValue = (key) => ({
    [key]: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] }
});

/** 给定指标里任意一项有有效值 */
const anyHasValue = (keys) => ({ [Op.or]: keys.map(hasValue) });

module.exports = { hasValue, anyHasValue };

const test = require('node:test');
const assert = require('node:assert/strict');
const RecordController = require('../controllers/RecordController');

/**
 * 导入时用 (日期, 成员) 做去重键判断是新增还是覆盖。
 * Excel 里的日期写法五花八门，数据库 DATEONLY 回来的固定是 YYYY-MM-DD，
 * 两边对不齐就会把同一天导成两条记录。
 */

test('补零：Excel 的 2026-7-6 与数据库的 2026-07-06 视为同一天', () => {
    assert.equal(
        RecordController.normalizeDateKey('2026-7-6'),
        RecordController.normalizeDateKey('2026-07-06')
    );
});

test('兼容斜杠与点号分隔', () => {
    assert.equal(RecordController.normalizeDateKey('2026/07/06'), '2026-07-06');
    assert.equal(RecordController.normalizeDateKey('2026.7.6'), '2026-07-06');
});

test('Date 对象归一到同一个键', () => {
    const date = new Date(Date.UTC(2026, 6, 6));
    assert.equal(RecordController.normalizeDateKey(date), '2026-07-06');
});

test('带时间部分只取日期', () => {
    assert.equal(RecordController.normalizeDateKey('2026-07-06 10:30:00'), '2026-07-06');
});

test('不同日期不会被归并', () => {
    assert.notEqual(
        RecordController.normalizeDateKey('2026-07-06'),
        RecordController.normalizeDateKey('2026-07-07')
    );
});

test('空值与无法识别的输入不抛异常', () => {
    assert.equal(RecordController.normalizeDateKey(null), '');
    assert.equal(RecordController.normalizeDateKey(''), '');
    assert.equal(RecordController.normalizeDateKey('不是日期'), '不是日期');
});

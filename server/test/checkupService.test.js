const test = require('node:test');
const assert = require('node:assert/strict');
const { suggestNextDate } = require('../services/CheckupService');

test('suggestNextDate returns future date based on intervals', () => {
  const recordDates = ['2026-01-01', '2026-02-01', '2026-03-01'];
  const result = suggestNextDate(recordDates, '甲减');

  assert.ok(result.nextDate, 'nextDate should exist');
  assert.ok(result.intervalDays >= 30, 'intervalDays should be >= 30');
  assert.equal(result.baseDays, 60);
});

test('suggestNextDate falls back to base interval with no history', () => {
  const result = suggestNextDate([], '甲状腺结节');
  assert.equal(result.baseDays, 180);
  assert.ok(result.intervalDays >= 30);
});

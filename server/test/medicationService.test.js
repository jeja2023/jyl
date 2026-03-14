const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAdherence } = require('../services/MedicationService');

test('computeAdherence calculates rate and streak', () => {
  const logs = [
    { date: '2026-03-14' },
    { date: '2026-03-14' },
    { date: '2026-03-13' },
    { date: '2026-03-13' }
  ];
  const today = new Date('2026-03-14T00:00:00Z');
  const { expected, taken, adherence, streak } = computeAdherence(2, logs, 2, today);

  assert.equal(expected, 4);
  assert.equal(taken, 4);
  assert.equal(adherence, 100);
  assert.equal(streak, 2);
});

test('computeAdherence handles zero plans', () => {
  const today = new Date('2026-03-14T00:00:00Z');
  const { expected, taken, adherence, streak } = computeAdherence(0, [], 7, today);
  assert.equal(expected, 0);
  assert.equal(taken, 0);
  assert.equal(adherence, 0);
  assert.equal(streak, 0);
});

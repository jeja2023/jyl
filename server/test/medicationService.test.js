const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAdherence } = require('../services/MedicationService');
const { getPlanDosageForDate, stringifyWeeklyDosage } = require('../utils/medicationDosage');

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

test('computeAdherence counts makeup doses separately', () => {
  const logs = [
    { date: '2026-03-14', source: 'normal' },
    { date: '2026-03-13', source: 'makeup' }
  ];
  const today = new Date('2026-03-14T00:00:00Z');
  const { expected, taken, makeupTaken, adherence, streak } = computeAdherence(1, logs, 2, today);

  assert.equal(expected, 2);
  assert.equal(taken, 2);
  assert.equal(makeupTaken, 1);
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

test('getPlanDosageForDate applies weekday-specific dosage with default fallback', () => {
  const plan = {
    dosage: '1片',
    weeklyDosage: JSON.stringify({ 1: '半片' })
  };

  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-30T08:00:00+08:00')), '半片');
  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-31T08:00:00+08:00')), '1片');
});

test('stringifyWeeklyDosage removes blank weekday overrides', () => {
  assert.equal(stringifyWeeklyDosage({ 1: '半片', 2: '   ' }), '{"1":"半片"}');
  assert.equal(stringifyWeeklyDosage({ 1: '' }), null);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_RANGES,
  METRIC_KEYS,
  TREND_KEYS,
  analyzeRecord,
  getDefaultTrendKeys,
  getDiseaseIndicatorProfile
} = require('../utils/indicatorAnalysis');

test('indicatorAnalysis includes expanded thyroid-related blood markers', () => {
  for (const key of ['TSI', 'TBAb', 'CEA', 'VitaminD', 'Albumin', 'ALP', 'ALT', 'AST', 'WBC', 'Neutrophils', 'ESR', 'CRP']) {
    assert.ok(DEFAULT_RANGES[key], `${key} should have a default range`);
    assert.ok(METRIC_KEYS.includes(key), `${key} should be a metric key`);
  }
});

test('disease profiles expose disease-specific default trend keys', () => {
  const gravesKeys = getDefaultTrendKeys('Graves病');
  assert.ok(gravesKeys.includes('TRAb'));
  assert.ok(gravesKeys.includes('TSI'));
  assert.ok(gravesKeys.includes('weight'));
  assert.ok(gravesKeys.includes('WBC'));
  assert.ok(gravesKeys.includes('ALT'));
  assert.ok(gravesKeys.includes('AST'));
  assert.ok(TREND_KEYS.includes('weight'));

  const calciumProfile = getDiseaseIndicatorProfile('甲状腺术后低钙');
  assert.ok(calciumProfile.recommended.includes('ALP'));
});

test('analyzeRecord marks expanded marker roles and abnormalities', () => {
  const result = analyzeRecord({ TSH: '0.01', TRAb: '3.2', WBC: '2.4', ALT: '80' }, {}, null, 'Graves病');
  const trab = result.items.find(item => item.key === 'TRAb');
  const wbc = result.items.find(item => item.key === 'WBC');
  const alt = result.items.find(item => item.key === 'ALT');

  assert.equal(trab.status, 'high');
  assert.equal(trab.role, 'core');
  assert.equal(wbc.status, 'low');
  assert.equal(wbc.role, 'core');
  assert.equal(wbc.riskLevel, 'urgent');
  assert.equal(alt.status, 'high');
  assert.equal(alt.riskLevel, 'high');
});

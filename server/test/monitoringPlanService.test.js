const test = require('node:test');
const assert = require('node:assert/strict');

const records = [];
const plans = [];
const users = new Map();
const members = new Map();

require.cache[require.resolve('../models/HealthRecord')] = {
  exports: {
    findAll: async () => records.map(row => ({ toJSON: () => row }))
  }
};

require.cache[require.resolve('../models/MedicationPlan')] = {
  exports: {
    findAll: async () => plans
  }
};

require.cache[require.resolve('../models/User')] = {
  exports: {
    findByPk: async (id) => users.get(id) || null
  }
};

require.cache[require.resolve('../models/FamilyMember')] = {
  exports: {
    findOne: async ({ where }) => members.get(where.id) || null
  }
};

const { buildMonitoringPlan } = require('../services/MonitoringPlanService');

test('buildMonitoringPlan adds antithyroid drug safety monitoring', async () => {
  users.set(1, { id: 1, patientType: 'Graves病', trendIndicators: null });
  records.splice(0, records.length, { TSH: '0.01', FT4: '26', WBC: '2.8', ALT: '70', recordDate: '2026-05-01' });
  plans.splice(0, plans.length, { medicineName: '甲巯咪唑', dosage: '10mg', notes: '' });

  const result = await buildMonitoringPlan(1);

  assert.ok(result.coreKeys.includes('weight'));
  assert.ok(result.coreKeys.includes('WBC'));
  assert.ok(result.coreKeys.includes('ALT'));
  assert.ok(result.treatmentRules.some(rule => rule.id === 'antithyroid-drug'));
  assert.ok(result.intervalDays <= 30);
});

test('buildMonitoringPlan adapts to replacement and calcium scenarios', async () => {
  users.set(2, { id: 2, patientType: '甲状腺术后低钙', trendIndicators: '["TSH","weight"]' });
  records.splice(0, records.length, { Calcium: '1.9', PTH: '8', recordDate: '2026-05-02' });
  plans.splice(0, plans.length, { medicineName: '优甲乐', dosage: '75ug', notes: '' }, { medicineName: '碳酸钙D3', dosage: '1片', notes: '' });

  const result = await buildMonitoringPlan(2);

  assert.ok(result.defaultTrendKeys.includes('Calcium'));
  assert.ok(result.defaultTrendKeys.includes('PTH'));
  assert.ok(result.defaultTrendKeys.includes('VitaminD'));
  assert.ok(result.defaultTrendKeys.includes('weight'));
  assert.ok(result.treatmentRules.some(rule => rule.id === 'thyroxine-replacement'));
  assert.ok(result.treatmentRules.some(rule => rule.id === 'postoperative-calcium'));
});

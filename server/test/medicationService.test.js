const test = require('node:test');
const assert = require('node:assert/strict');
const { computeAdherence, MAX_STATS_DAYS } = require('../services/MedicationService');
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

test('getPlanDosageForDate applies weekday-specific dosage with default fallback when no weekly plan exists', () => {
  const plan = {
    dosage: '1片',
    weeklyDosage: null
  };

  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-31T08:00:00+08:00')), '1片');
});

test('getPlanDosageForDate skips unconfigured weekdays when weekly dosage exists', () => {
  const plan = {
    dosage: '半片',
    weeklyDosage: JSON.stringify({ 1: '半片', 3: '1片' })
  };

  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-30T08:00:00+08:00')), '半片');
  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-31T08:00:00+08:00')), '');
});

test('computeAdherence uses weekday-specific expected dose count', () => {
  const plans = [
    {
      isActive: true,
      dosage: '半片',
      weeklyDosage: JSON.stringify({ 1: '半片', 3: '1片' }),
      createdAt: '2026-03-29T00:00:00+08:00'
    }
  ];
  const logs = [
    { date: '2026-03-30', source: 'normal' },
    { date: '2026-04-01', source: 'normal' }
  ];
  const today = new Date('2026-04-01T00:00:00+08:00');
  const { expected, taken, adherence, streak, missedDates } = computeAdherence(plans, logs, 3, today);

  assert.equal(expected, 2);
  assert.equal(taken, 2);
  assert.equal(adherence, 100);
  assert.equal(streak, 2);
  assert.deepEqual(missedDates, []);
});

test('computeAdherence ignores dates before medication plan start date', () => {
  const plans = [
    {
      isActive: true,
      dosage: '1片',
      scheduleType: 'weekly',
      weeklyDosage: null,
      startDate: '2026-03-31',
      createdAt: '2026-03-29T00:00:00+08:00'
    }
  ];
  const logs = [
    { date: '2026-03-31', source: 'normal' }
  ];
  const today = new Date('2026-03-31T00:00:00+08:00');
  const { expected, taken, adherence, missedDates } = computeAdherence(plans, logs, 3, today);

  assert.equal(expected, 1);
  assert.equal(taken, 1);
  assert.equal(adherence, 100);
  assert.deepEqual(missedDates, []);
});

test('getPlanDosageForDate supports interval schedule from start date', () => {
  const plan = {
    isActive: true,
    dosage: '半片',
    scheduleType: 'interval',
    intervalDays: 2,
    startDate: '2026-03-30'
  };

  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-29T08:00:00+08:00')), '');
  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-30T08:00:00+08:00')), '半片');
  assert.equal(getPlanDosageForDate(plan, new Date('2026-03-31T08:00:00+08:00')), '');
  assert.equal(getPlanDosageForDate(plan, new Date('2026-04-01T08:00:00+08:00')), '半片');
});

test('stringifyWeeklyDosage removes blank weekday overrides', () => {
  assert.equal(stringifyWeeklyDosage({ 1: '半片', 2: '   ' }), '{"1":"半片"}');
  assert.equal(stringifyWeeklyDosage({ 1: '' }), null);
});

// ==================== 依从率失真回归 ====================
//
// 下面这组用例锁死一个曾经能在完全合法的数据下返回 200% / 300% 的缺陷：
// 分子是"窗口内全部打卡记录数"，分母只按"当前仍启用的计划"逐日推算，
// 两边口径不一致，而且结果不做上限截断。

const dayStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const buildDailyLogs = (today, days, planIds) => {
  const logs = [];
  for (let i = 0; i < days; i++) {
    const date = dayStr(new Date(today.getTime() - i * 86400000));
    planIds.forEach((planId) => logs.push({ date, source: 'normal', MedicationPlanId: planId }));
  }
  return logs;
};

test('停用其中一个计划后依从率不会翻倍', () => {
  const today = new Date('2026-06-30T00:00:00+08:00');
  const startDate = dayStr(new Date(today.getTime() - 60 * 86400000));
  // 曾经有两个计划、30 天里每天各打卡一次，共 60 条记录
  const logs = buildDailyLogs(today, 30, [1, 2]);
  // 之后停用了计划 2，只剩计划 1 还在启用
  const activePlans = [
    { id: 1, isActive: true, dosage: '1片', scheduleType: 'weekly', weeklyDosage: null, startDate }
  ];

  const { expected, taken, adherence } = computeAdherence(activePlans, logs, 30, today);

  assert.equal(expected, 30, '分母只按启用中的计划算');
  assert.equal(taken, 30, '已停用计划留下的打卡不能计入分子');
  assert.equal(adherence, 100, '修复前这里是 200%');
});

test('把计划改成隔 3 天一次后，历史依从率不会被追溯放大', () => {
  const today = new Date('2026-06-30T00:00:00+08:00');
  const startDate = dayStr(new Date(today.getTime() - 60 * 86400000));
  const logs = buildDailyLogs(today, 30, [1]);
  const activePlans = [
    { id: 1, isActive: true, dosage: '1片', scheduleType: 'interval', intervalDays: 3, startDate }
  ];

  const { expected, taken, adherence } = computeAdherence(activePlans, logs, 30, today);

  assert.ok(expected > 0 && expected < 30, '隔日计划的应服天数应少于自然日数');
  assert.equal(taken, expected, '非服药日的打卡不计入分子');
  assert.equal(adherence, 100, '修复前这里是 300%');
});

test('同一天对同一计划重复打卡不会让依从率超过 100%', () => {
  const today = new Date('2026-06-30T00:00:00+08:00');
  const ds = dayStr(today);
  const activePlans = [
    { id: 1, isActive: true, dosage: '1片', scheduleType: 'weekly', weeklyDosage: null, startDate: ds }
  ];
  const logs = [
    { date: ds, source: 'normal', MedicationPlanId: 1 },
    { date: ds, source: 'normal', MedicationPlanId: 1 },
    { date: ds, source: 'makeup', MedicationPlanId: 1 }
  ];

  const { expected, taken, adherence } = computeAdherence(activePlans, logs, 1, today);

  assert.equal(expected, 1);
  assert.equal(taken, 1);
  assert.equal(adherence, 100);
});

test('固定应服次数口径下，多打的卡同样不会溢出分子', () => {
  const today = new Date('2026-03-14T00:00:00Z');
  const logs = [
    { date: '2026-03-14' }, { date: '2026-03-14' }, { date: '2026-03-14' },
    { date: '2026-03-13' }
  ];

  const { expected, taken, adherence } = computeAdherence(1, logs, 2, today);

  assert.equal(expected, 2);
  assert.equal(taken, 2, '03-14 打了三次也只按一次计入');
  assert.equal(adherence, 100);
});

test('漏服会如实反映在依从率里，不会被无关计划的打卡掩盖', () => {
  const today = new Date('2026-06-30T00:00:00+08:00');
  const startDate = dayStr(new Date(today.getTime() - 10 * 86400000));
  const activePlans = [
    { id: 1, isActive: true, dosage: '1片', scheduleType: 'weekly', weeklyDosage: null, startDate }
  ];
  // 只在最近 5 天打了卡，另外 5 天漏服；同期还有一堆属于已停用计划 99 的记录
  const logs = [
    ...buildDailyLogs(today, 5, [1]),
    ...buildDailyLogs(today, 10, [99])
  ];

  const { expected, taken, adherence, missedDates } = computeAdherence(activePlans, logs, 10, today);

  assert.equal(expected, 10);
  assert.equal(taken, 5, '已停用计划的 10 条记录必须被忽略');
  assert.equal(adherence, 50);
  assert.equal(missedDates.length, 5);
});

test('缺少 MedicationPlanId 的历史打卡按天补配，不会被误判成漏服', () => {
  const today = new Date('2026-06-30T00:00:00+08:00');
  const ds = dayStr(today);
  const activePlans = [
    { id: 1, isActive: true, dosage: '1片', scheduleType: 'weekly', weeklyDosage: null, startDate: ds }
  ];
  const logs = [{ date: ds, source: 'normal' }];

  const { expected, taken, adherence } = computeAdherence(activePlans, logs, 1, today);

  assert.equal(expected, 1);
  assert.equal(taken, 1);
  assert.equal(adherence, 100);
});

test('统计天数超过上限时被截断，不会拖出天文数字的循环', () => {
  const today = new Date('2026-06-30T00:00:00+08:00');
  const activePlans = [
    { id: 1, isActive: true, dosage: '1片', scheduleType: 'weekly', weeklyDosage: null, startDate: '2000-01-01' }
  ];

  const { expected } = computeAdherence(activePlans, [], 10 ** 9, today);

  assert.equal(expected, MAX_STATS_DAYS);
});

const test = require('node:test');
const assert = require('node:assert/strict');

const HealthRecord = require('../models/HealthRecord');
const CheckupReminder = require('../models/CheckupReminder');
const MedicationPlan = require('../models/MedicationPlan');
const MedicationLog = require('../models/MedicationLog');
const MedicationAdjustment = require('../models/MedicationAdjustment');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const InsightService = require('../services/InsightService');

/**
 * 洞察服务的成员隔离回归测试。
 *
 * 修复前：buildDashboard 取最近记录时完全不带成员条件，
 * buildMonthlyInsights 的守卫又把 undefined / null / 空串全排除在过滤之外，
 * 于是"看本人"实际是"看全家"——拿家人的化验单套账号主人的病种和参考范围判异常。
 * 同时本人档案只 SELECT 了 ['id','patientType']，自定义参考范围恒为空。
 *
 * 这里断言的就是这两点：查询条件必须显式限定归属，档案必须带上参考范围。
 */

const originals = {
    recordFindAll: HealthRecord.findAll,
    checkupFindAll: CheckupReminder.findAll,
    planCount: MedicationPlan.count,
    planFindAll: MedicationPlan.findAll,
    logCount: MedicationLog.count,
    adjustmentFindAll: MedicationAdjustment.findAll,
    userFindByPk: User.findByPk,
    memberFindAll: FamilyMember.findAll,
    memberFindOne: FamilyMember.findOne
};

let recordQueries = [];
let userQueries = [];

/** 三条记录：本人一条，家庭成员 5 两条 */
const ROWS = [
    { id: 1, recordDate: '2026-05-10', memberId: null, TSH: '3.0' },
    { id: 2, recordDate: '2026-05-12', memberId: 5, TSH: '9.9' },
    { id: 3, recordDate: '2026-05-20', memberId: 5, TSH: '8.8' }
];

const asRow = (row) => ({ ...row, toJSON: () => ({ ...row }) });

/** 按查询条件真实过滤，这样断言才有意义（而不是无论条件如何都返回全部） */
const filterRows = (where) => ROWS
    .filter((row) => {
        if (!Object.prototype.hasOwnProperty.call(where, 'memberId')) return true;
        return (row.memberId ?? null) === (where.memberId ?? null);
    })
    .map(asRow);

test.beforeEach(() => {
    recordQueries = [];
    userQueries = [];

    HealthRecord.findAll = async (options) => {
        recordQueries.push(options);
        const rows = filterRows(options.where || {});
        return options.limit ? rows.slice().reverse().slice(0, options.limit) : rows;
    };
    CheckupReminder.findAll = async () => [];
    MedicationPlan.count = async () => 0;
    MedicationPlan.findAll = async () => [];
    MedicationLog.count = async () => 0;
    MedicationAdjustment.findAll = async () => [];
    User.findByPk = async (id, options) => {
        userQueries.push(options);
        return {
            toJSON: () => ({
                id,
                patientType: '甲减',
                treatmentStage: '日常随访',
                trendIndicators: null,
                referenceRanges: JSON.stringify({ TSH: { min: 0.5, max: 4.5 } })
            })
        };
    };
    FamilyMember.findAll = async () => [{
        id: 5,
        toJSON: () => ({ id: 5, name: '母亲', patientType: '甲亢', referenceRanges: null })
    }];
    FamilyMember.findOne = async () => ({
        id: 5,
        toJSON: () => ({ id: 5, name: '母亲', patientType: '甲亢', referenceRanges: null })
    });
});

test.afterEach(() => {
    HealthRecord.findAll = originals.recordFindAll;
    CheckupReminder.findAll = originals.checkupFindAll;
    MedicationPlan.count = originals.planCount;
    MedicationPlan.findAll = originals.planFindAll;
    MedicationLog.count = originals.logCount;
    MedicationAdjustment.findAll = originals.adjustmentFindAll;
    User.findByPk = originals.userFindByPk;
    FamilyMember.findAll = originals.memberFindAll;
    FamilyMember.findOne = originals.memberFindOne;
});

test('月度洞察不传 memberId 时只算本人，查询条件必须带 memberId: null', async () => {
    const result = await InsightService.buildMonthlyInsights(1, 6);

    const recordQuery = recordQueries[0];
    assert.equal(recordQuery.where.memberId, null, '不传成员时必须显式限定 memberId IS NULL');
    assert.equal(result.totals.recordCount, 1, '只应统计本人那一条记录，修复前会把家人的两条也算进来');
    assert.equal(result.scope.mode, 'self');
});

test('月度洞察传 memberId 时只算该成员', async () => {
    const result = await InsightService.buildMonthlyInsights(1, 6, 5);

    assert.equal(recordQueries[0].where.memberId, 5);
    assert.equal(result.totals.recordCount, 2);
    assert.equal(result.scope.mode, 'member');
    assert.equal(result.scope.memberId, 5);
});

test('只有显式 memberId=all 才跨成员汇总', async () => {
    const result = await InsightService.buildMonthlyInsights(1, 6, 'all');

    assert.equal(
        Object.prototype.hasOwnProperty.call(recordQueries[0].where, 'memberId'),
        false,
        'all 模式下才不加成员条件'
    );
    assert.equal(result.totals.recordCount, 3);
    assert.equal(result.scope.mode, 'all');
});

test('跨成员汇总时异常项带上归属，便于前端区分是谁的指标', async () => {
    const result = await InsightService.buildMonthlyInsights(1, 6, 'all');
    const items = result.months.flatMap((month) => month.abnormalItems);

    // 只要有异常项，就必须能追溯归属；memberId 字段本身必须存在
    items.forEach((item) => {
        assert.ok(Object.prototype.hasOwnProperty.call(item, 'memberId'), '异常项必须带 memberId');
    });
});

test('首页概览默认只看本人，且档案查询必须带上 referenceRanges', async () => {
    const result = await InsightService.buildDashboard(1);

    const latestQuery = recordQueries.find((query) => query.limit === 2);
    assert.ok(latestQuery, '概览应有一次取最近两条记录的查询');
    assert.equal(latestQuery.where.memberId, null, '最近记录必须限定本人，否则会拿家人的化验单当"我的最新"');

    assert.equal(result.latest?.memberId ?? null, null, '返回的最新记录必须属于本人');
    assert.equal(result.scope.mode, 'self');

    // 本人档案过去只查 ['id','patientType']，导致自定义参考范围恒为 undefined
    const profileQuery = userQueries.find((query) => Array.isArray(query?.attributes));
    assert.ok(profileQuery, '应查询本人档案');
    assert.ok(
        profileQuery.attributes.includes('referenceRanges'),
        '本人档案必须取出 referenceRanges，否则自定义参考范围静默失效'
    );
});

const { Op } = require('sequelize');
const HealthRecord = require('../models/HealthRecord');
const CheckupReminder = require('../models/CheckupReminder');
const MedicationPlan = require('../models/MedicationPlan');
const MedicationLog = require('../models/MedicationLog');
const MedicationAdjustment = require('../models/MedicationAdjustment');
const { analyzeRecord, parseRanges, getDiseaseIndicatorProfile, TREND_KEYS } = require('../utils/indicatorAnalysis');
const { resolveMemberScope, buildMemberWhere, ALL } = require('../utils/memberScope');
const { loadOwnerProfile, loadOwnerProfileMap, ownerKeyOf } = require('./OwnerProfileService');
const { suggestForUser } = require('./CheckupService');
const { calculateStats } = require('./MedicationService');
const { buildMonitoringPlan } = require('./MonitoringPlanService');

const monthKey = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'unknown';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * 按月汇总健康记录。
 *
 * 成员作用域缺省是"本人"（memberId IS NULL）。原先的写法是
 * "memberId 有值才加过滤"，不传 / null / 空串都落到不过滤的分支，
 * 于是本人的月度洞察把全家的记录都算进 recordCount 和 abnormalCount，
 * 而异常判定用的却是账号主人的病种与参考范围。
 *
 * 即使显式请求 all，也逐条记录按归属取档案，绝不跨人套标准；
 * "较上次变化"也按归属各自维护上一条，不会拿家人的值当基线。
 */
const buildMonthlyInsights = async (userId, months = 6, rawMemberId = undefined) => {
    const scope = resolveMemberScope(rawMemberId);

    const start = new Date();
    start.setMonth(start.getMonth() - Math.max(1, months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const where = {
        UserId: userId,
        recordDate: { [Op.gte]: start.toISOString().split('T')[0] },
        ...buildMemberWhere(scope)
    };

    const records = await HealthRecord.findAll({
        where,
        order: [['recordDate', 'ASC'], ['id', 'ASC']]
    });

    // 跨成员汇总时需要每个人的档案；单一作用域只取一份
    const profiles = scope.mode === ALL
        ? await loadOwnerProfileMap(userId)
        : new Map([[scope.memberId === null ? 'self' : String(scope.memberId), await loadOwnerProfile(userId, scope)]]);
    const fallbackProfile = profiles.get('self') || [...profiles.values()][0] || null;

    const buckets = {};
    const previousByOwner = new Map();

    for (const record of records) {
        const row = record.toJSON();
        const key = monthKey(row.recordDate);
        if (!buckets[key]) {
            buckets[key] = {
                month: key,
                recordCount: 0,
                abnormalCount: 0,
                abnormalItems: [],
                latestRecordDate: null
            };
        }

        const ownerKey = ownerKeyOf(row.memberId);
        const profile = profiles.get(ownerKey) || fallbackProfile;
        const previous = previousByOwner.get(ownerKey) || null;

        const analysis = analyzeRecord(row, parseRanges(profile?.referenceRanges), previous, profile?.patientType || '其他');
        buckets[key].recordCount += 1;
        buckets[key].abnormalCount += analysis.abnormalCount;
        buckets[key].abnormalItems.push(...analysis.abnormal.map(item => ({
            key: item.key,
            label: item.label,
            status: item.status,
            value: item.value,
            recordDate: row.recordDate,
            memberId: row.memberId || null
        })));
        buckets[key].latestRecordDate = row.recordDate;
        previousByOwner.set(ownerKey, row);
    }

    // 用药与复查目前只有账号维度，没有成员维度，保持账号级统计
    const medication = await calculateStats(userId, 30).catch(() => ({
        adherence: 0,
        streak: 0,
        takenDoses: 0,
        makeupDoses: 0,
        activePlans: 0
    }));

    const checkups = await CheckupReminder.findAll({
        where: { UserId: userId, date: { [Op.gte]: start.toISOString().split('T')[0] } }
    });

    const completed = checkups.filter(item => item.isCompleted).length;
    const checkupCompletionRate = checkups.length ? Math.round((completed / checkups.length) * 100) : 0;

    return {
        scope: { mode: scope.mode, memberId: scope.memberId },
        months: Object.values(buckets).sort((a, b) => a.month.localeCompare(b.month)),
        totals: {
            recordCount: records.length,
            abnormalCount: Object.values(buckets).reduce((sum, item) => sum + item.abnormalCount, 0),
            medicationAdherence: medication.adherence || 0,
            medicationStreak: medication.streak || 0,
            checkupCount: checkups.length,
            checkupCompletionRate
        },
        medication,
        checkups: {
            total: checkups.length,
            completed,
            completionRate: checkupCompletionRate
        }
    };
};

/**
 * 首页概览。默认只看本人（memberId IS NULL）。
 *
 * 原先取最近两条记录时完全不带成员条件，"最新记录"可能是家人的化验单，
 * 却拿账号主人的 patientType 去判异常；参考范围又因为只 SELECT 了
 * ['id','patientType'] 而恒为空。两个问题都在这里一并修掉。
 */
const buildDashboard = async (userId, rawMemberId = undefined) => {
    const scope = resolveMemberScope(rawMemberId);
    const memberWhere = buildMemberWhere(scope);

    const latestRecords = await HealthRecord.findAll({
        where: { UserId: userId, ...memberWhere },
        order: [['recordDate', 'DESC'], ['id', 'DESC']],
        limit: 2
    });
    const latest = latestRecords[0]?.toJSON() || null;
    const previous = latestRecords[1]?.toJSON() || null;

    const owner = await loadOwnerProfile(userId, scope);
    const patientType = owner?.patientType || '其他';
    const analysis = latest
        ? analyzeRecord(latest, parseRanges(owner?.referenceRanges), previous, patientType)
        : null;

    const checkupSuggestion = await suggestForUser(userId, rawMemberId);
    const monitoringPlan = await buildMonitoringPlan(userId, rawMemberId);
    const monthly = await buildMonthlyInsights(userId, 6, rawMemberId);
    const activePlans = await MedicationPlan.count({ where: { UserId: userId, isActive: true } });
    const today = new Date().toISOString().split('T')[0];
    const takenToday = await MedicationLog.count({ where: { UserId: userId, date: today } });
    const recentAdjustments = await MedicationAdjustment.findAll({
        where: { UserId: userId },
        order: [['adjustmentDate', 'DESC'], ['createdAt', 'DESC']],
        limit: 5
    }).catch(() => []);

    return {
        scope: { mode: scope.mode, memberId: scope.memberId },
        latest,
        analysis,
        indicatorProfile: {
            patientType,
            disease: getDiseaseIndicatorProfile(patientType),
            selectedTrendKeys: (() => {
                try {
                    const parsed = JSON.parse(owner?.trendIndicators || '[]');
                    const valid = Array.isArray(parsed) ? parsed.filter(key => TREND_KEYS.includes(key)) : [];
                    return valid.length ? valid : monitoringPlan.defaultTrendKeys;
                } catch (e) {
                    return monitoringPlan.defaultTrendKeys;
                }
            })()
        },
        monitoringPlan,
        checkupSuggestion,
        monthly,
        medicationToday: {
            activePlans,
            takenToday,
            completed: activePlans > 0 && takenToday >= activePlans
        },
        recentMedicationAdjustments: recentAdjustments
    };
};

module.exports = {
    buildDashboard,
    buildMonthlyInsights
};

const { Op } = require('sequelize');
const HealthRecord = require('../models/HealthRecord');
const CheckupReminder = require('../models/CheckupReminder');
const MedicationPlan = require('../models/MedicationPlan');
const MedicationLog = require('../models/MedicationLog');
const MedicationAdjustment = require('../models/MedicationAdjustment');
const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');
const { analyzeRecord, parseRanges, getDiseaseIndicatorProfile, getDefaultTrendKeys, TREND_KEYS } = require('../utils/indicatorAnalysis');
const { suggestForUser } = require('./CheckupService');
const { calculateStats } = require('./MedicationService');
const { buildMonitoringPlan } = require('./MonitoringPlanService');

const monthKey = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'unknown';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getOwnerProfile = async (userId, memberId) => {
    if (memberId) {
        const member = await FamilyMember.findOne({ where: { id: memberId, UserId: userId } });
        return member ? member.toJSON() : null;
    }
    const user = await User.findByPk(userId, { attributes: ['id', 'patientType'] });
    return user ? user.toJSON() : null;
};

const buildMonthlyInsights = async (userId, months = 6, memberId = null) => {
    const start = new Date();
    start.setMonth(start.getMonth() - Math.max(1, months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const where = {
        UserId: userId,
        recordDate: { [Op.gte]: start.toISOString().split('T')[0] }
    };
    if (memberId !== null && memberId !== undefined && memberId !== '') {
        where.memberId = memberId || null;
    }

    const records = await HealthRecord.findAll({
        where,
        order: [['recordDate', 'ASC']]
    });

    const profile = await getOwnerProfile(userId, memberId);
    const customRanges = parseRanges(profile?.referenceRanges);

    const buckets = {};
    let previous = null;
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

        const analysis = analyzeRecord(row, customRanges, previous, profile?.patientType || '其他');
        buckets[key].recordCount += 1;
        buckets[key].abnormalCount += analysis.abnormalCount;
        buckets[key].abnormalItems.push(...analysis.abnormal.map(item => ({
            key: item.key,
            label: item.label,
            status: item.status,
            value: item.value,
            recordDate: row.recordDate
        })));
        buckets[key].latestRecordDate = row.recordDate;
        previous = row;
    }

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

const buildDashboard = async (userId) => {
    const latestRecords = await HealthRecord.findAll({
        where: { UserId: userId },
        order: [['recordDate', 'DESC']],
        limit: 2
    });
    const latest = latestRecords[0]?.toJSON() || null;
    const previous = latestRecords[1]?.toJSON() || null;
    const user = await User.findByPk(userId, { attributes: ['id', 'patientType', 'trendIndicators'] });
    const analysis = latest ? analyzeRecord(latest, parseRanges(user?.referenceRanges), previous, user?.patientType || '其他') : null;
    const checkupSuggestion = await suggestForUser(userId);
    const monitoringPlan = await buildMonitoringPlan(userId);
    const monthly = await buildMonthlyInsights(userId, 6);
    const activePlans = await MedicationPlan.count({ where: { UserId: userId, isActive: true } });
    const today = new Date().toISOString().split('T')[0];
    const takenToday = await MedicationLog.count({ where: { UserId: userId, date: today } });
    const recentAdjustments = await MedicationAdjustment.findAll({
        where: { UserId: userId },
        order: [['adjustmentDate', 'DESC'], ['createdAt', 'DESC']],
        limit: 5
    }).catch(() => []);

    return {
        latest,
        analysis,
        indicatorProfile: {
            patientType: user?.patientType || '其他',
            disease: getDiseaseIndicatorProfile(user?.patientType || '其他'),
            selectedTrendKeys: (() => {
                try {
                    const parsed = JSON.parse(user?.trendIndicators || '[]');
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

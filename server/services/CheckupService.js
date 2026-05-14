const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const MedicationPlan = require('../models/MedicationPlan');
const { analyzeRecord, parseRanges } = require('../utils/indicatorAnalysis');

const PATIENT_BASE_DAYS = {
    '甲亢': 45,
    '甲减': 60,
    '甲状腺结节': 180,
    '甲癌术后': 90,
    '桥本氏甲状腺炎': 120,
    '其他': 90
};

const parseDate = (str) => {
    const d = new Date(str);
    return Number.isNaN(d.getTime()) ? null : d;
};

const median = (arr) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const suggestNextDate = (recordDates, patientType, options = {}) => {
    const baseDays = options.checkupIntervalDays || PATIENT_BASE_DAYS[patientType] || PATIENT_BASE_DAYS['其他'];
    const dates = recordDates.map(parseDate).filter(Boolean).sort((a, b) => a - b);

    let interval = baseDays;
    if (dates.length >= 2) {
        const diffs = [];
        for (let i = 1; i < dates.length; i++) {
            const days = Math.round((dates[i] - dates[i - 1]) / (1000 * 3600 * 24));
            if (days > 0) diffs.push(days);
        }
        const med = median(diffs);
        if (med) interval = Math.round((med + baseDays) / 2);
    }

    if (options.hasAbnormal) interval = Math.round(interval * 0.6);
    if (options.hasActiveMedication) interval = Math.min(interval, 60);

    interval = clamp(interval, 14, 365);
    const lastDate = dates.length ? dates[dates.length - 1] : new Date();
    const next = new Date(lastDate.getTime() + interval * 24 * 3600 * 1000);
    return {
        nextDate: next.toISOString().split('T')[0],
        intervalDays: interval,
        baseDays
    };
};

const suggestForUser = async (userId, memberId = null) => {
    const owner = memberId
        ? await FamilyMember.findOne({ where: { id: memberId, UserId: userId } })
        : await User.findByPk(userId, { attributes: ['id', 'patientType'] });

    const where = { UserId: userId };
    if (memberId) where.memberId = memberId;

    const records = await HealthRecord.findAll({
        where,
        order: [['recordDate', 'ASC']]
    });

    const rows = records.map(r => r.toJSON());
    const latest = rows[rows.length - 1] || null;
    const previous = rows[rows.length - 2] || null;
    const analysis = latest ? analyzeRecord(latest, parseRanges(owner?.referenceRanges), previous) : null;
    const hasAbnormal = (analysis?.abnormalCount || 0) > 0;
    const hasActiveMedication = await MedicationPlan.count({ where: { UserId: userId, isActive: true } }) > 0;

    const patientType = owner?.patientType || '其他';
    const { nextDate, intervalDays, baseDays } = suggestNextDate(
        rows.map(r => r.recordDate),
        patientType,
        {
            hasAbnormal,
            hasActiveMedication,
            checkupIntervalDays: owner?.checkupIntervalDays
        }
    );

    const reasons = [];
    reasons.push(`病种基础周期 ${baseDays} 天`);
    if (rows.length >= 2) reasons.push('已结合历史复查间隔');
    if (hasAbnormal) reasons.push('最近存在异常指标，建议缩短间隔');
    if (hasActiveMedication) reasons.push('存在启用中的用药计划');

    return {
        nextDate,
        intervalDays,
        baseDays,
        patientType,
        memberId: memberId || null,
        abnormalCount: analysis?.abnormalCount || 0,
        reasons,
        note: `智能复查建议：${nextDate} 左右复查（间隔约 ${intervalDays} 天）。${reasons.join('；')}`
    };
};

module.exports = { suggestNextDate, suggestForUser };

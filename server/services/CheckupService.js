const HealthRecord = require('../models/HealthRecord');
const MedicationPlan = require('../models/MedicationPlan');
const { analyzeRecord, parseRanges } = require('../utils/indicatorAnalysis');
const { resolveMemberScope, buildMemberWhere } = require('../utils/memberScope');
const { loadOwnerProfile } = require('./OwnerProfileService');

const PATIENT_BASE_DAYS = {
    '甲亢': 45,
    'Graves病': 45,
    '亚临床甲亢': 60,
    '抗甲状腺药物治疗': 30,
    '甲减': 60,
    '亚临床甲减': 90,
    '中枢性甲减': 60,
    '甲状腺结节': 180,
    '甲癌术后': 90,
    '甲状腺髓样癌': 60,
    '甲状腺术后低钙': 30,
    '桥本氏甲状腺炎': 120,
    '亚急性甲状腺炎': 30,
    '产后甲状腺炎': 60,
    '妊娠甲状腺管理': 30,
    '碘131治疗后': 45,
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

/**
 * 智能复查建议。
 *
 * 成员作用域缺省是"本人"。原先写的是 `if (memberId) where.memberId = memberId`，
 * memberId 为空时不加任何成员条件，本人的复查建议实际是拿全家最近一条记录
 * 算出来的：异常判定、历史间隔中位数、下次复查日期全都被家人的数据带偏。
 * 同时档案只 SELECT 了 ['id','patientType']，参考范围恒为空。
 */
const suggestForUser = async (userId, rawMemberId = undefined) => {
    const scope = resolveMemberScope(rawMemberId);
    const owner = await loadOwnerProfile(userId, scope);

    const where = { UserId: userId, ...buildMemberWhere(scope) };

    const records = await HealthRecord.findAll({
        where,
        order: [['recordDate', 'ASC'], ['id', 'ASC']]
    });

    const rows = records.map(r => r.toJSON());
    const latest = rows[rows.length - 1] || null;
    const previous = rows[rows.length - 2] || null;
    const patientType = owner?.patientType || '其他';
    const analysis = latest
        ? analyzeRecord(latest, parseRanges(owner?.referenceRanges), previous, patientType)
        : null;
    const hasAbnormal = (analysis?.abnormalCount || 0) > 0;
    const hasActiveMedication = await MedicationPlan.count({ where: { UserId: userId, isActive: true } }) > 0;

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
        scope: { mode: scope.mode, memberId: scope.memberId },
        memberId: scope.memberId,
        abnormalCount: analysis?.abnormalCount || 0,
        reasons,
        note: `智能复查建议：${nextDate} 左右复查（间隔约 ${intervalDays} 天）。${reasons.join('；')}`
    };
};


module.exports = { suggestNextDate, suggestForUser };

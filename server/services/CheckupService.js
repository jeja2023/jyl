const HealthRecord = require('../models/HealthRecord');
const User = require('../models/User');

const PATIENT_BASE_DAYS = {
    '甲亢': 60,
    '甲减': 60,
    '甲状腺结节': 180,
    '甲癌术后': 180,
    '桥本氏甲状腺炎': 120,
    '其他': 90
};

const parseDate = (str) => {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
};

const median = (arr) => {
    if (!arr.length) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

const suggestNextDate = (recordDates, patientType) => {
    const baseDays = PATIENT_BASE_DAYS[patientType] || PATIENT_BASE_DAYS['其他'];
    const dates = recordDates
        .map(parseDate)
        .filter(Boolean)
        .sort((a, b) => a - b);

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

    interval = clamp(interval, 30, 365);

    const lastDate = dates.length ? dates[dates.length - 1] : new Date();
    const next = new Date(lastDate.getTime() + interval * 24 * 3600 * 1000);
    const nextStr = next.toISOString().split('T')[0];

    return { nextDate: nextStr, intervalDays: interval, baseDays };
};

const suggestForUser = async (userId) => {
    const user = await User.findByPk(userId, { attributes: ['id', 'patientType'] });
    const records = await HealthRecord.findAll({
        where: { UserId: userId },
        attributes: ['recordDate'],
        order: [['recordDate', 'ASC']]
    });
    const dates = records.map(r => r.recordDate);
    const { nextDate, intervalDays, baseDays } = suggestNextDate(dates, user?.patientType || '其他');

    const note = `智能建议：间隔${intervalDays}天（基础间隔${baseDays}天）`;
    return { nextDate, intervalDays, baseDays, note };
};

module.exports = { suggestNextDate, suggestForUser };

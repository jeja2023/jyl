const WEEKDAY_KEYS = ['0', '1', '2', '3', '4', '5', '6'];

const parseWeeklyDosage = (value) => {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (e) {
        return {};
    }
};

const sanitizeWeeklyDosage = (value) => {
    const parsed = parseWeeklyDosage(value);
    const result = {};

    WEEKDAY_KEYS.forEach((key) => {
        const dosage = typeof parsed[key] === 'string' ? parsed[key].trim() : '';
        if (dosage) result[key] = dosage;
    });

    return result;
};

const stringifyWeeklyDosage = (value) => {
    const sanitized = sanitizeWeeklyDosage(value);
    return Object.keys(sanitized).length ? JSON.stringify(sanitized) : null;
};

const toDateKey = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const startOfDay = (date) => {
    let d;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        d = new Date(`${date}T00:00:00`);
    } else {
        d = date instanceof Date ? new Date(date) : new Date(date);
    }
    d.setHours(0, 0, 0, 0);
    return d;
};

const getPlanStartDate = (plan) => {
    if (!plan) return null;
    const raw = plan.startDate || plan.createdAt;
    return raw ? startOfDay(raw) : null;
};

const isBeforePlanStart = (plan, date) => {
    const startDate = getPlanStartDate(plan);
    return startDate ? startOfDay(date) < startDate : false;
};

const normalizeScheduleType = (value) => (value === 'interval' ? 'interval' : 'weekly');

const isIntervalDoseDate = (plan, date = new Date()) => {
    if (!plan) return false;
    const startDate = getPlanStartDate(plan);
    if (!startDate) return true;

    const targetDate = startOfDay(date);
    if (targetDate < startDate) return false;

    const intervalDays = Math.max(parseInt(plan.intervalDays, 10) || 1, 1);
    const diffDays = Math.floor((targetDate - startDate) / 86400000);
    return diffDays % intervalDays === 0;
};

const isPlanDoseDate = (plan, date = new Date()) => {
    if (!plan || plan.isActive === false || isBeforePlanStart(plan, date)) return false;
    const scheduleType = normalizeScheduleType(plan.scheduleType);
    if (scheduleType === 'interval') return isIntervalDoseDate(plan, date);

    const weeklyDosage = parseWeeklyDosage(plan.weeklyDosage);
    if (Object.keys(weeklyDosage).length === 0) return Boolean(plan.dosage);
    const weekday = String((date instanceof Date ? date : new Date(date)).getDay());
    return typeof weeklyDosage[weekday] === 'string' && Boolean(weeklyDosage[weekday].trim());
};

const getPlanDosageForDate = (plan, date = new Date()) => {
    if (!plan) return '';
    if (!isPlanDoseDate(plan, date)) return '';
    if (normalizeScheduleType(plan.scheduleType) === 'interval') return plan.dosage || '';

    const weeklyDosage = parseWeeklyDosage(plan.weeklyDosage);
    const weekday = String(date.getDay());
    if (Object.keys(weeklyDosage).length > 0 && !Object.prototype.hasOwnProperty.call(weeklyDosage, weekday)) {
        return '';
    }
    const dosage = typeof weeklyDosage[weekday] === 'string' ? weeklyDosage[weekday].trim() : '';
    return dosage || plan.dosage || '';
};

module.exports = {
    getPlanDosageForDate,
    getPlanStartDate,
    isPlanDoseDate,
    parseWeeklyDosage,
    sanitizeWeeklyDosage,
    stringifyWeeklyDosage,
    toDateKey
};

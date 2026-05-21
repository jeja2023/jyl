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

const getPlanDosageForDate = (plan, date = new Date()) => {
    if (!plan) return '';
    const weeklyDosage = parseWeeklyDosage(plan.weeklyDosage);
    const weekday = String(date.getDay());
    const dosage = typeof weeklyDosage[weekday] === 'string' ? weeklyDosage[weekday].trim() : '';
    return dosage || plan.dosage || '';
};

module.exports = {
    getPlanDosageForDate,
    parseWeeklyDosage,
    sanitizeWeeklyDosage,
    stringifyWeeklyDosage
};

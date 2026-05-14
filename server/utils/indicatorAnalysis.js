const DEFAULT_RANGES = {
    TSH: { min: 0.27, max: 4.2, unit: 'mIU/L', label: '促甲状腺激素' },
    FT3: { min: 3.1, max: 6.8, unit: 'pmol/L', label: '游离T3' },
    FT4: { min: 12, max: 22, unit: 'pmol/L', label: '游离T4' },
    T3: { min: 1.3, max: 3.1, unit: 'nmol/L', label: '总T3' },
    T4: { min: 66, max: 181, unit: 'nmol/L', label: '总T4' },
    TPOAb: { max: 34, unit: 'IU/mL', label: 'TPO抗体' },
    TGAb: { max: 115, unit: 'IU/mL', label: 'TG抗体' },
    TRAb: { max: 1.75, unit: 'IU/L', label: 'TRAb' },
    Tg: { max: 77, unit: 'ng/mL', label: '甲状腺球蛋白' },
    Calcitonin: { max: 9.52, unit: 'pg/mL', label: '降钙素' },
    Calcium: { min: 2.11, max: 2.52, unit: 'mmol/L', label: '血钙' },
    PTH: { min: 15, max: 65, unit: 'pg/mL', label: 'PTH' }
};

const METRIC_KEYS = Object.keys(DEFAULT_RANGES);

const parseNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const match = String(value).replace(',', '.').match(/[<>]?\s*(-?\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
};

const parseRanges = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
};

const getRange = (key, customRanges = {}) => {
    return { ...DEFAULT_RANGES[key], ...(customRanges[key] || {}) };
};

const analyzeValue = (key, value, customRanges = {}, previousValue = null) => {
    const range = getRange(key, customRanges);
    const numeric = parseNumber(value);
    const previous = parseNumber(previousValue);
    if (numeric === null) return null;

    let status = 'normal';
    if (typeof range.min === 'number' && numeric < range.min) status = 'low';
    if (typeof range.max === 'number' && numeric > range.max) status = 'high';

    let trend = 'flat';
    if (previous !== null) {
        const delta = numeric - previous;
        const tolerance = Math.max(Math.abs(previous) * 0.03, 0.01);
        if (delta > tolerance) trend = 'up';
        if (delta < -tolerance) trend = 'down';
    }

    const advice = buildAdvice(key, status, trend);
    return {
        key,
        label: range.label || key,
        value,
        numeric,
        unit: range.unit || '',
        range,
        status,
        trend,
        advice
    };
};

const buildAdvice = (key, status, trend) => {
    if (status === 'normal') {
        return trend === 'flat' ? '本次结果位于参考范围内。' : '本次结果位于参考范围内，建议继续观察趋势。';
    }
    if (key === 'TSH' && status === 'high') return 'TSH 偏高，常见于甲减控制不足或替代剂量不足，建议结合 FT3/FT4 与医生沟通。';
    if (key === 'TSH' && status === 'low') return 'TSH 偏低，常见于甲亢倾向或替代剂量偏高，建议结合症状和医生意见复核。';
    if (['FT3', 'FT4', 'T3', 'T4'].includes(key) && status === 'high') return '甲状腺激素偏高，若伴心悸、手抖、体重下降，建议尽快复查或就医。';
    if (['FT3', 'FT4', 'T3', 'T4'].includes(key) && status === 'low') return '甲状腺激素偏低，若伴乏力、怕冷、浮肿，建议关注甲减控制情况。';
    if (['TPOAb', 'TGAb', 'TRAb'].includes(key) && status === 'high') return '抗体指标升高，提示自身免疫或 Graves 活动相关风险，建议结合病史观察。';
    if (['Tg', 'Calcitonin'].includes(key) && status === 'high') return '肿瘤相关标志物高于参考范围，建议结合术后状态、影像和医生意见解读。';
    if (['Calcium', 'PTH'].includes(key)) return '钙磷/甲旁腺相关指标异常，术后或补钙人群建议重点关注。';
    return '该指标超出参考范围，建议结合症状、用药和复查计划综合判断。';
};

const analyzeRecord = (record, customRanges = {}, previousRecord = null) => {
    const items = [];
    for (const key of METRIC_KEYS) {
        const result = analyzeValue(key, record?.[key], customRanges, previousRecord?.[key]);
        if (result) items.push(result);
    }
    const abnormal = items.filter(item => item.status !== 'normal');
    return {
        recordId: record?.id,
        recordDate: record?.recordDate,
        items,
        abnormal,
        abnormalCount: abnormal.length,
        summary: abnormal.length ? `发现 ${abnormal.length} 项异常指标` : '本次核心指标未见明显异常'
    };
};

module.exports = {
    DEFAULT_RANGES,
    METRIC_KEYS,
    analyzeRecord,
    analyzeValue,
    parseNumber,
    parseRanges
};

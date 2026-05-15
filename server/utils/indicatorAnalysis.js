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
    Magnesium: { min: 0.75, max: 1.02, unit: 'mmol/L', label: '血镁' },
    Phosphorus: { min: 0.85, max: 1.51, unit: 'mmol/L', label: '血磷' },
    PTH: { min: 15, max: 65, unit: 'pg/mL', label: 'PTH' },
    TSI: { max: 0.55, unit: 'IU/L', label: 'TSI' },
    TBAb: { max: 1.75, unit: 'IU/L', label: 'TBAb' },
    CEA: { max: 5, unit: 'ng/mL', label: 'CEA' },
    VitaminD: { min: 30, max: 100, unit: 'ng/mL', label: '25-OH-D' },
    Albumin: { min: 35, max: 55, unit: 'g/L', label: '白蛋白' },
    ALP: { min: 45, max: 125, unit: 'U/L', label: 'ALP' },
    ALT: { max: 40, unit: 'U/L', label: 'ALT' },
    AST: { max: 40, unit: 'U/L', label: 'AST' },
    GGT: { max: 50, unit: 'U/L', label: 'GGT' },
    Bilirubin: { min: 3.4, max: 20.5, unit: 'umol/L', label: '总胆红素' },
    WBC: { min: 3.5, max: 9.5, unit: '10^9/L', label: '白细胞' },
    Neutrophils: { min: 1.8, max: 6.3, unit: '10^9/L', label: '中性粒' },
    TC: { max: 5.2, unit: 'mmol/L', label: '总胆固醇' },
    LDL: { max: 3.4, unit: 'mmol/L', label: 'LDL-C' },
    HDL: { min: 1.0, unit: 'mmol/L', label: 'HDL-C' },
    Triglyceride: { max: 1.7, unit: 'mmol/L', label: '甘油三酯' },
    CK: { min: 40, max: 200, unit: 'U/L', label: 'CK' },
    ESR: { max: 20, unit: 'mm/h', label: 'ESR' },
    CRP: { max: 10, unit: 'mg/L', label: 'CRP' }
};

const METRIC_KEYS = Object.keys(DEFAULT_RANGES);
const TREND_EXTRA_RANGES = {
    weight: { unit: 'kg', label: '体重' },
    heartRate: { unit: '次/分', label: '心率' }
};
const TREND_KEYS = [...METRIC_KEYS, ...Object.keys(TREND_EXTRA_RANGES)];
const TREND_RANGES = { ...DEFAULT_RANGES, ...TREND_EXTRA_RANGES };

const DISEASE_INDICATOR_PROFILES = {
    甲减: {
        core: ['TSH', 'FT4'],
        recommended: ['FT3', 'TPOAb', 'TGAb', 'TC', 'LDL', 'Triglyceride', 'CK'],
        note: '甲减重点看 TSH 与 FT4，合并自身免疫时关注 TPOAb/TGAb。'
    },
    亚临床甲减: {
        core: ['TSH', 'FT4'],
        recommended: ['TPOAb', 'TGAb', 'TC', 'LDL', 'Triglyceride'],
        note: '亚临床甲减重点看 TSH 持续升高、FT4 是否仍正常，以及抗体和血脂变化。'
    },
    中枢性甲减: {
        core: ['FT4', 'TSH'],
        recommended: ['FT3', 'T3', 'T4'],
        note: '中枢性甲减不能只看 TSH，FT4 水平和临床状态更关键。'
    },
    甲亢: {
        core: ['TSH', 'FT4', 'FT3', 'weight', 'WBC', 'Neutrophils', 'ALT', 'AST'],
        recommended: ['TRAb', 'TSI', 'T3', 'T4', 'GGT', 'Bilirubin', 'heartRate'],
        note: '甲亢尤其用药期需同时关注甲功、体重、白细胞/中性粒和肝功能。'
    },
    Graves病: {
        core: ['TSH', 'FT4', 'FT3', 'TRAb', 'weight', 'WBC', 'Neutrophils', 'ALT', 'AST'],
        recommended: ['TSI', 'TPOAb', 'TGAb', 'GGT', 'Bilirubin', 'heartRate'],
        note: 'Graves 病需看甲功、TRAb/TSI 活动度，同时监测体重、血常规和肝功能。'
    },
    亚临床甲亢: {
        core: ['TSH', 'FT4', 'FT3'],
        recommended: ['TRAb', 'TSI', 'T3', 'T4'],
        note: '亚临床甲亢重点看 TSH 抑制是否持续，以及 FT3/FT4 是否仍在参考范围。'
    },
    抗甲状腺药物治疗: {
        core: ['TSH', 'FT4', 'FT3', 'weight', 'WBC', 'Neutrophils', 'ALT', 'AST', 'GGT', 'Bilirubin'],
        recommended: ['TRAb', 'TSI', 'T3', 'T4', 'heartRate'],
        note: '甲亢用药期除甲功外，体重、白细胞/中性粒和肝功能是默认随访重点。'
    },
    甲状腺结节: {
        core: ['TSH', 'FT4'],
        recommended: ['Calcitonin', 'CEA', 'Tg', 'TPOAb', 'TGAb'],
        note: '结节随访以甲功基础指标为底，必要时关注降钙素、Tg 与抗体。'
    },
    甲癌术后: {
        core: ['TSH', 'Tg', 'TGAb'],
        recommended: ['FT4', 'FT3', 'Calcium', 'PTH', 'Magnesium', 'Phosphorus'],
        note: '甲癌术后重点看 TSH 抑制、Tg/TGAb 复发风险线索和术后钙磷代谢。'
    },
    甲状腺髓样癌: {
        core: ['Calcitonin', 'CEA'],
        recommended: ['TSH', 'FT4', 'Calcium', 'PTH'],
        note: '髓样癌更关注降钙素和 CEA 动态，甲功和钙磷代谢作为辅助随访。'
    },
    甲状腺术后低钙: {
        core: ['Calcium', 'PTH'],
        recommended: ['Phosphorus', 'Magnesium', 'VitaminD', 'Albumin', 'ALP'],
        note: '术后低钙重点看血钙、PTH，并结合白蛋白、维生素D、血镁/血磷综合判断。'
    },
    桥本氏甲状腺炎: {
        core: ['TSH', 'FT4', 'TPOAb', 'TGAb'],
        recommended: ['FT3', 'T3', 'T4', 'TC', 'LDL'],
        note: '桥本重点看甲功是否转向甲减，以及 TPOAb/TGAb 免疫活动度。'
    },
    亚急性甲状腺炎: {
        core: ['TSH', 'FT4', 'FT3'],
        recommended: ['ESR', 'CRP', 'TPOAb', 'TGAb', 'WBC'],
        note: '亚急性甲状腺炎常伴炎症指标升高，需同时观察甲功阶段变化。'
    },
    产后甲状腺炎: {
        core: ['TSH', 'FT4', 'FT3'],
        recommended: ['TPOAb', 'TGAb'],
        note: '产后甲状腺炎重点看甲亢期/甲减期转换，并关注自身抗体。'
    },
    妊娠甲状腺管理: {
        core: ['TSH', 'FT4'],
        recommended: ['FT3', 'TPOAb', 'TGAb'],
        note: '妊娠期甲状腺管理重点看 TSH 和 FT4，并结合孕期专用参考范围。'
    },
    碘131治疗后: {
        core: ['TSH', 'FT4', 'FT3'],
        recommended: ['TRAb', 'TPOAb', 'TGAb', 'WBC', 'ALT', 'AST'],
        note: '碘131治疗后重点看甲功从亢进到减退的变化，并关注抗体和安全指标。'
    },
    其他: {
        core: ['TSH', 'FT4', 'FT3'],
        recommended: ['TPOAb', 'TGAb'],
        note: '默认展示甲功核心三项，可按报告内容自行增减。'
    }
};

const getDiseaseIndicatorProfile = (patientType = '其他') => (
    DISEASE_INDICATOR_PROFILES[patientType] || DISEASE_INDICATOR_PROFILES.其他
);

const getDefaultTrendKeys = (patientType = '其他') => {
    const profile = getDiseaseIndicatorProfile(patientType);
    return [...new Set([...profile.core, ...profile.recommended])].filter(key => TREND_KEYS.includes(key));
};

const getTrendMeta = (key) => {
    const range = TREND_RANGES[key] || {};
    return {
        key,
        label: range.label || key,
        unit: range.unit || '',
        range,
        type: METRIC_KEYS.includes(key) ? 'lab' : 'body'
    };
};

const getMetricRole = (key, patientType = '其他') => {
    const profile = getDiseaseIndicatorProfile(patientType);
    if (profile.core.includes(key)) return 'core';
    if (profile.recommended.includes(key)) return 'recommended';
    return 'optional';
};

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

const buildRisk = (key, status, numeric, range) => {
    if (status === 'normal') {
        return { level: 'normal', score: 0, label: '正常', action: '继续观察趋势' };
    }

    let score = 1;
    if (status === 'high' && typeof range.max === 'number' && range.max > 0) {
        const ratio = numeric / range.max;
        if (ratio >= 3) score = 4;
        else if (ratio >= 2) score = 3;
        else if (ratio >= 1.3) score = 2;
    }
    if (status === 'low' && typeof range.min === 'number' && range.min > 0) {
        const ratio = numeric / range.min;
        if (ratio <= 0.5) score = 4;
        else if (ratio <= 0.75) score = 3;
        else if (ratio <= 0.9) score = 2;
    }

    if (key === 'Neutrophils' && status === 'low') {
        if (numeric < 1.0) score = 4;
        else if (numeric < 1.5) score = Math.max(score, 3);
    }
    if (key === 'WBC' && status === 'low') {
        if (numeric < 2.5) score = Math.max(score, 4);
        else if (numeric < 3.0) score = Math.max(score, 3);
    }
    if (['ALT', 'AST'].includes(key) && status === 'high' && typeof range.max === 'number') {
        if (numeric >= range.max * 3) score = Math.max(score, 4);
        else if (numeric >= range.max * 2) score = Math.max(score, 3);
    }
    if (key === 'Calcium' && status === 'low') {
        if (numeric < 1.8) score = Math.max(score, 4);
        else if (numeric < 2.0) score = Math.max(score, 3);
    }
    if (['Calcitonin', 'CEA', 'Tg'].includes(key) && status === 'high') {
        score = Math.max(score, 3);
    }

    const map = {
        1: { level: 'mild', label: '轻度异常', action: '建议按计划复查并观察趋势' },
        2: { level: 'moderate', label: '明显异常', action: '建议缩短复查间隔' },
        3: { level: 'high', label: '重点异常', action: '建议尽快复核并咨询医生' },
        4: { level: 'urgent', label: '需尽快处理', action: '建议尽快联系医生或就医评估' }
    };
    return { score, ...map[Math.min(score, 4)] };
};

const analyzeValue = (key, value, customRanges = {}, previousValue = null, patientType = '其他') => {
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
    const risk = buildRisk(key, status, numeric, range);
    return {
        key,
        label: range.label || key,
        value,
        numeric,
        unit: range.unit || '',
        range,
        status,
        risk,
        riskLevel: risk.level,
        riskLabel: risk.label,
        action: risk.action,
        trend,
        role: getMetricRole(key, patientType),
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
    if (['TPOAb', 'TGAb', 'TRAb', 'TSI', 'TBAb'].includes(key) && status === 'high') return '抗体指标升高，提示自身免疫或 Graves 活动相关风险，建议结合病史观察。';
    if (['Tg', 'Calcitonin', 'CEA'].includes(key) && status === 'high') return '肿瘤相关标志物高于参考范围，建议结合术后状态、影像和医生意见解读。';
    if (['Calcium', 'Magnesium', 'Phosphorus', 'PTH'].includes(key)) return '钙磷/甲旁腺相关指标异常，术后或补钙人群建议重点关注。';
    if (['ALT', 'AST', 'ALP', 'GGT', 'Bilirubin', 'WBC', 'Neutrophils'].includes(key)) return '用药安全相关指标异常，使用抗甲状腺药物或近期治疗调整时建议及时复核。';
    if (['ESR', 'CRP'].includes(key)) return '炎症指标升高，若伴颈部疼痛、发热或甲功波动，建议结合医生评估。';
    if (['TC', 'LDL', 'HDL', 'Triglyceride', 'CK'].includes(key)) return '代谢或肌酶指标异常，甲减控制不佳时可能伴随波动，建议结合甲功趋势观察。';
    return '该指标超出参考范围，建议结合症状、用药和复查计划综合判断。';
};

const analyzeRecord = (record, customRanges = {}, previousRecord = null, patientType = '其他') => {
    const items = [];
    for (const key of METRIC_KEYS) {
        const result = analyzeValue(key, record?.[key], customRanges, previousRecord?.[key], patientType);
        if (result) items.push(result);
    }
    const abnormal = items.filter(item => item.status !== 'normal');
    const coreAbnormal = abnormal.filter(item => item.role === 'core');
    const maxRiskScore = abnormal.reduce((max, item) => Math.max(max, item.risk?.score || 0), 0);
    return {
        recordId: record?.id,
        recordDate: record?.recordDate,
        patientType,
        diseaseProfile: getDiseaseIndicatorProfile(patientType),
        items,
        abnormal,
        abnormalCount: abnormal.length,
        coreAbnormalCount: coreAbnormal.length,
        maxRiskScore,
        riskLevel: maxRiskScore >= 4 ? 'urgent' : maxRiskScore >= 3 ? 'high' : maxRiskScore >= 2 ? 'moderate' : maxRiskScore === 1 ? 'mild' : 'normal',
        summary: coreAbnormal.length
            ? `发现 ${coreAbnormal.length} 项病种核心指标异常`
            : (abnormal.length ? `发现 ${abnormal.length} 项异常指标` : '本次病种核心指标未见明显异常')
    };
};

module.exports = {
    DEFAULT_RANGES,
    DISEASE_INDICATOR_PROFILES,
    METRIC_KEYS,
    TREND_KEYS,
    TREND_RANGES,
    analyzeRecord,
    analyzeValue,
    getDefaultTrendKeys,
    getDiseaseIndicatorProfile,
    getMetricRole,
    getTrendMeta,
    parseNumber,
    parseRanges
};

/**
 * 指标判断工具类
 */

export const getIndicatorInfo = (val, min, max) => {
    if (val === undefined || val === null || val === '') {
        return { status: '未录入', color: 'gray', icon: '' };
    }
    
    // 处理包含 < 或 > 的字符串
    let cleanVal = String(val).trim();
    const hasLess = cleanVal.startsWith('<');
    const hasGreater = cleanVal.startsWith('>');
    if (hasLess || hasGreater) {
        cleanVal = cleanVal.substring(1).trim();
    }

    const floatVal = parseFloat(cleanVal);
    if (isNaN(floatVal)) {
        return { status: '无效', color: 'gray', icon: '' };
    }

    // 如果是 <X，且 X 小于等于最小值，通常被视为正常（在低端）；
    // 如果是 <X，且 X 大于最大值，逻辑上不常见，此处按 X 本身进行判断
    if (floatVal > max && !hasLess) {
        return { status: '偏高', color: 'error', icon: 'arrow-up-fill' };
    }
    if (floatVal < min && !hasGreater) {
        return { status: '偏低', color: 'warning', icon: 'arrow-down-fill' };
    }
    return { status: '正常', color: 'success', icon: '' };
};

export const getIndicatorInfoFromRef = (val, refStr) => {
    if (!val || !refStr) {
        return { status: '未录入', color: 'gray', icon: '' };
    }

    const rangeMatch = refStr.match(/([\d\.]+)\s*-\s*([\d\.]+)/);
    if (rangeMatch) {
        return getIndicatorInfo(val, parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2]));
    }

    if (refStr.startsWith('<')) {
        const max = parseFloat(refStr.substring(1).trim());
        return getIndicatorInfo(val, 0, max);
    }

    if (refStr.startsWith('>')) {
        const min = parseFloat(refStr.substring(1).trim());
        return getIndicatorInfo(val, min, Infinity);
    }

    return { status: '未知', color: 'gray', icon: '' };
};

export const INDICATOR_REFS = {
    TSH:       { min: 0.27,  max: 4.2,   unit: 'mIU/L',  name: '促甲状腺激素' },
    FT4:       { min: 12,    max: 22,     unit: 'pmol/L', name: '游离甲状腺素' },
    FT3:       { min: 3.1,   max: 6.8,   unit: 'pmol/L', name: '游离三碘甲状腺原氨酸' },
    T3:        { min: 1.3,   max: 3.1,   unit: 'nmol/L', name: '三碘甲状腺原氨酸' },
    T4:        { min: 66,    max: 181,   unit: 'nmol/L', name: '总甲状腺素' },
    Tg:        { min: 0,     max: 77,    unit: 'ng/mL',  name: '甲状腺球蛋白' },
    TPOAb:     { min: 0,     max: 34,    unit: 'IU/mL',  name: '抗甲状腺过氧化物酶抗体' },
    TGAb:      { min: 0,     max: 115,   unit: 'IU/mL',  name: '抗甲状腺球蛋白抗体' },
    TRAb:      { min: 0,     max: 1.75,  unit: 'IU/L',   name: '促甲状腺激素受体抗体' },
    Calcitonin:{ min: 0,     max: 10,    unit: 'pg/mL',  name: '降钙素' },
    Calcium:   { min: 2.11,  max: 2.52,  unit: 'mmol/L', name: '血钙' },
    Magnesium: { min: 0.75,  max: 1.02,  unit: 'mmol/L', name: '血镁' },
    Phosphorus:{ min: 0.85,  max: 1.51,  unit: 'mmol/L', name: '血磷' },
    PTH:       { min: 15,    max: 65,    unit: 'pg/mL',  name: '甲状旁腺激素' },
    TSI:       { min: 0,     max: 0.55,  unit: 'IU/L',   name: '甲状腺刺激免疫球蛋白' },
    TBAb:      { min: 0,     max: 1.75,  unit: 'IU/L',   name: '促甲状腺素受体阻断抗体' },
    CEA:       { min: 0,     max: 5,     unit: 'ng/mL',  name: '癌胚抗原' },
    VitaminD:  { min: 30,    max: 100,   unit: 'ng/mL',  name: '25羟维生素D' },
    Albumin:   { min: 35,    max: 55,    unit: 'g/L',    name: '血清白蛋白' },
    ALP:       { min: 45,    max: 125,   unit: 'U/L',    name: '碱性磷酸酶' },
    ALT:       { min: 0,     max: 40,    unit: 'U/L',    name: '丙氨酸氨基转移酶' },
    AST:       { min: 0,     max: 40,    unit: 'U/L',    name: '天门冬氨酸氨基转移酶' },
    GGT:       { min: 0,     max: 50,    unit: 'U/L',    name: '谷氨酰转肽酶' },
    Bilirubin: { min: 3.4,   max: 20.5,  unit: 'umol/L', name: '总胆红素' },
    WBC:       { min: 3.5,   max: 9.5,   unit: '10^9/L', name: '白细胞计数' },
    Neutrophils: { min: 1.8, max: 6.3,   unit: '10^9/L', name: '中性粒细胞计数' },
    TC:        { min: 0,     max: 5.2,   unit: 'mmol/L', name: '总胆固醇' },
    LDL:       { min: 0,     max: 3.4,   unit: 'mmol/L', name: '低密度脂蛋白胆固醇' },
    HDL:       { min: 1.0,   max: Infinity, unit: 'mmol/L', name: '高密度脂蛋白胆固醇' },
    Triglyceride: { min: 0,  max: 1.7,   unit: 'mmol/L', name: '甘油三酯' },
    CK:        { min: 40,    max: 200,   unit: 'U/L',    name: '肌酸激酶' },
    ESR:       { min: 0,     max: 20,    unit: 'mm/h',   name: '红细胞沉降率' },
    CRP:       { min: 0,     max: 10,    unit: 'mg/L',   name: 'C反应蛋白' }
};

export const checkIndicator = (key, val) => {
    const ref = INDICATOR_REFS[key];
    if (!ref) {
        return { status: '未知', color: 'gray', icon: '' };
    }
    return getIndicatorInfo(val, ref.min, ref.max);
};

const DEFAULT_ADVICE = {
    high: '偏高，请结合症状与医生建议调整用药或复查。',
    low: '偏低，请结合症状与医生建议调整用药或复查。',
    normal: '在参考范围内，继续保持。'
};

const INDICATOR_ADVICE = {
    TSH: {
        high: {
            default: 'TSH偏高，可能提示甲状腺功能偏低。',
            甲减: 'TSH偏高，可能提示甲减控制不足。',
            甲亢: 'TSH偏高，可能提示治疗过度或药量偏大。'
        },
        low: {
            default: 'TSH偏低，可能提示甲状腺功能偏亢。',
            甲亢: 'TSH偏低，可能提示甲亢控制不足。',
            甲减: 'TSH偏低，可能提示药量偏大。'
        }
    },
    FT3: {
        high: { default: 'FT3偏高，提示甲状腺激素偏高。' },
        low: { default: 'FT3偏低，提示甲状腺激素偏低。' }
    },
    FT4: {
        high: { default: 'FT4偏高，提示甲状腺激素偏高。' },
        low: { default: 'FT4偏低，提示甲状腺激素偏低。' }
    },
    T3: {
        high: { default: 'T3偏高，提示甲状腺激素偏高。' },
        low: { default: 'T3偏低，提示甲状腺激素偏低。' }
    },
    T4: {
        high: { default: 'T4偏高，提示甲状腺激素偏高。' },
        low: { default: 'T4偏低，提示甲状腺激素偏低。' }
    },
    Tg: {
        high: { default: 'Tg偏高，建议结合病史与随访。' },
        low: { default: 'Tg偏低，通常无明显异常意义。' }
    },
    TPOAb: {
        high: { default: 'TPOAb偏高，提示免疫相关性增高。' },
        low: { default: 'TPOAb偏低。' }
    },
    TGAb: {
        high: { default: 'TGAb偏高，提示免疫相关性增高。' },
        low: { default: 'TGAb偏低。' }
    },
    TRAb: {
        high: { default: 'TRAb偏高，常见于甲亢相关。' },
        low: { default: 'TRAb偏低。' }
    },
    Calcitonin: {
        high: { default: '降钙素偏高，建议结合医生评估。' },
        low: { default: '降钙素偏低。' }
    },
    Calcium: {
        high: { default: '血钙偏高，建议复查或咨询医生。' },
        low: { default: '血钙偏低，注意补钙与维生素D。' }
    },
    Magnesium: {
        high: { default: '血镁偏高，建议复查。' },
        low: { default: '血镁偏低，注意补充。' }
    },
    Phosphorus: {
        high: { default: '血磷偏高，建议复查。' },
        low: { default: '血磷偏低，注意补充。' }
    },
    PTH: {
        high: { default: 'PTH偏高，建议结合钙磷代谢评估。' },
        low: { default: 'PTH偏低，注意钙磷代谢。' }
    },
    TSI: {
        high: { default: 'TSI偏高，提示Graves活动度相关风险。' },
        low: { default: 'TSI偏低。' }
    },
    TBAb: {
        high: { default: 'TBAb偏高，建议结合TRAb和甲功综合判断。' },
        low: { default: 'TBAb偏低。' }
    },
    CEA: {
        high: { default: 'CEA偏高，髓样癌随访人群建议及时咨询医生。' },
        low: { default: 'CEA偏低。' }
    },
    VitaminD: {
        high: { default: '维生素D偏高，建议结合补充剂剂量评估。' },
        low: { default: '维生素D偏低，术后低钙或补钙人群建议关注。' }
    },
    Albumin: {
        high: { default: '白蛋白偏高，建议结合脱水等情况判断。' },
        low: { default: '白蛋白偏低，解读血钙时需考虑校正血钙。' }
    },
    ALP: {
        high: { default: 'ALP偏高，建议结合肝胆和骨代谢指标评估。' },
        low: { default: 'ALP偏低，建议结合营养和代谢状态评估。' }
    },
    ALT: {
        high: { default: 'ALT偏高，使用抗甲状腺药物时需重点关注肝功能。' },
        low: { default: 'ALT偏低。' }
    },
    AST: {
        high: { default: 'AST偏高，建议结合ALT、GGT和用药情况评估。' },
        low: { default: 'AST偏低。' }
    },
    GGT: {
        high: { default: 'GGT偏高，建议关注肝胆功能和近期用药。' },
        low: { default: 'GGT偏低。' }
    },
    Bilirubin: {
        high: { default: '胆红素偏高，建议结合肝功能和医生意见复核。' },
        low: { default: '胆红素偏低。' }
    },
    WBC: {
        high: { default: '白细胞偏高，建议结合感染或炎症情况判断。' },
        low: { default: '白细胞偏低，使用抗甲状腺药物时需尽快复核。' }
    },
    Neutrophils: {
        high: { default: '中性粒偏高，建议结合感染或炎症情况判断。' },
        low: { default: '中性粒偏低，使用抗甲状腺药物时需尽快咨询医生。' }
    },
    TC: {
        high: { default: '总胆固醇偏高，甲减控制不佳时可能伴随升高。' },
        low: { default: '总胆固醇偏低。' }
    },
    LDL: {
        high: { default: 'LDL-C偏高，建议结合甲功和心血管风险管理。' },
        low: { default: 'LDL-C偏低。' }
    },
    HDL: {
        high: { default: 'HDL-C偏高。' },
        low: { default: 'HDL-C偏低，建议关注代谢风险。' }
    },
    Triglyceride: {
        high: { default: '甘油三酯偏高，建议结合饮食、体重和甲功状态管理。' },
        low: { default: '甘油三酯偏低。' }
    },
    CK: {
        high: { default: 'CK偏高，甲减或肌肉损伤时可能升高，建议结合症状复核。' },
        low: { default: 'CK偏低。' }
    },
    ESR: {
        high: { default: 'ESR偏高，亚急性甲状腺炎等炎症状态需关注。' },
        low: { default: 'ESR偏低。' }
    },
    CRP: {
        high: { default: 'CRP偏高，提示炎症活动，建议结合症状和医生评估。' },
        low: { default: 'CRP偏低。' }
    }
};

export const getIndicatorAdvice = (key, val, refStr, profile = {}) => {
    const statusInfo = getIndicatorInfoFromRef(val, refStr);
    if (!statusInfo || statusInfo.status === '未知' || statusInfo.status === '未录入') return '';

    const status = statusInfo.status === '偏高' ? 'high' : statusInfo.status === '偏低' ? 'low' : 'normal';
    if (status === 'normal') return '';

    const patientType = profile?.patientType;
    const adviceBlock = INDICATOR_ADVICE[key]?.[status];
    if (adviceBlock) {
        if (patientType && adviceBlock[patientType]) return adviceBlock[patientType];
        if (adviceBlock.default) return adviceBlock.default;
    }

    return DEFAULT_ADVICE[status] || '';
};

/**
 * 指标判断工具类
 */

export const getIndicatorInfo = (val, min, max) => {
    if (val === undefined || val === null || val === '') {
        return { status: '未录入', color: 'gray', icon: '' };
    }
    const floatVal = parseFloat(val);
    if (isNaN(floatVal)) {
        return { status: '无效', color: 'gray', icon: '' };
    }
    if (floatVal > max) {
        return { status: '偏高', color: 'error', icon: 'arrow-up-fill' };
    }
    if (floatVal < min) {
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
    TPOAb:     { min: 0,     max: 34,    unit: 'IU/mL',  name: '甲状腺过氧化物酶抗体' },
    TGAb:      { min: 0,     max: 115,   unit: 'IU/mL',  name: '甲状腺球蛋白抗体' },
    TRAb:      { min: 0,     max: 1.75,  unit: 'IU/L',   name: '促甲状腺激素受体抗体' },
    Calcitonin:{ min: 0,     max: 10,    unit: 'pg/mL',  name: '降钙素' },
    Calcium:   { min: 2.11,  max: 2.52,  unit: 'mmol/L', name: '血钙' },
    Magnesium: { min: 0.75,  max: 1.02,  unit: 'mmol/L', name: '血镁' },
    Phosphorus:{ min: 0.85,  max: 1.51,  unit: 'mmol/L', name: '血磷' },
    PTH:       { min: 15,    max: 65,    unit: 'pg/mL',  name: '甲状旁腺激素' }
};

export const checkIndicator = (key, val) => {
    const ref = INDICATOR_REFS[key];
    if (!ref) {
        return { status: '未知', color: 'gray', icon: '' };
    }
    return getIndicatorInfo(val, ref.min, ref.max);
};

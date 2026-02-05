/**
 * 指标判断工具类
 * 用于判断甲功指标是否在正常范围内
 */

/**
 * 根据值和参考范围判断状态
 * @param {number|string} val - 指标值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {{ status: string, color: string, icon: string }}
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

/**
 * 根据参考范围字符串判断状态
 * @param {number|string} val - 指标值
 * @param {string} refStr - 参考范围字符串，如 "0.27 - 4.2" 或 "< 34"
 * @returns {{ status: string, color: string, icon: string }}
 */
export const getIndicatorInfoFromRef = (val, refStr) => {
    if (!val || !refStr) {
        return { status: '正常', color: 'success', icon: '' };
    }

    // 匹配 "min - max" 格式
    const rangeMatch = refStr.match(/([\d\.]+)\s*-\s*([\d\.]+)/);
    if (rangeMatch) {
        return getIndicatorInfo(val, parseFloat(rangeMatch[1]), parseFloat(rangeMatch[2]));
    }

    // 匹配 "< max" 格式
    if (refStr.startsWith('<')) {
        const max = parseFloat(refStr.substring(1).trim());
        return getIndicatorInfo(val, 0, max);
    }

    // 匹配 "> min" 格式
    if (refStr.startsWith('>')) {
        const min = parseFloat(refStr.substring(1).trim());
        return getIndicatorInfo(val, min, Infinity);
    }

    return { status: '正常', color: 'success', icon: '' };
};

/**
 * 常见指标的参考范围
 */
export const INDICATOR_REFS = {
    TSH: { min: 0.27, max: 4.2, unit: 'mIU/L', name: '促甲状腺激素' },
    FT4: { min: 12, max: 22, unit: 'pmol/L', name: '游离甲状腺素' },
    FT3: { min: 3.1, max: 6.8, unit: 'pmol/L', name: '游离三碘甲状腺原氨酸' },
    T3: { min: 1.3, max: 3.1, unit: 'nmol/L', name: '三碘甲状腺原氨酸' },
    T4: { min: 66, max: 181, unit: 'nmol/L', name: '总甲状腺素' },
    Tg: { min: 0, max: 77, unit: 'ng/mL', name: '甲状腺球蛋白' },
    Calcium: { min: 2.11, max: 2.52, unit: 'mmol/L', name: '血钙' }
};

/**
 * 快速判断指标状态（使用预设参考范围）
 * @param {string} key - 指标键名，如 'TSH'
 * @param {number|string} val - 指标值
 * @returns {{ status: string, color: string, icon: string }}
 */
export const checkIndicator = (key, val) => {
    const ref = INDICATOR_REFS[key];
    if (!ref) {
        return { status: '未知', color: 'gray', icon: '' };
    }
    return getIndicatorInfo(val, ref.min, ref.max);
};

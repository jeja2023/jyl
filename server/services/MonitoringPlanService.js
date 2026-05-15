const HealthRecord = require('../models/HealthRecord');
const MedicationPlan = require('../models/MedicationPlan');
const User = require('../models/User');
const FamilyMember = require('../models/FamilyMember');
const {
    METRIC_KEYS,
    TREND_KEYS,
    analyzeRecord,
    getDefaultTrendKeys,
    getDiseaseIndicatorProfile,
    getMetricRole,
    getTrendMeta,
    parseRanges
} = require('../utils/indicatorAnalysis');

const TREATMENT_RULES = [
    {
        id: 'antithyroid-drug',
        name: '抗甲状腺药物安全监测',
        match: ({ patientType, treatmentStage, medicationText }) => (
            ['甲亢', 'Graves病', '抗甲状腺药物治疗'].includes(patientType) ||
            ['抗甲状腺药物治疗中', '减药期'].includes(treatmentStage) ||
            /甲巯咪唑|赛治|他巴唑|丙硫氧嘧啶|PTU|methimazole|propylthiouracil/i.test(medicationText)
        ),
        core: ['weight', 'WBC', 'Neutrophils', 'ALT', 'AST', 'GGT', 'Bilirubin'],
        recommended: ['heartRate', 'TRAb', 'TSI'],
        intervalDays: 30,
        reason: '甲亢用药期间需关注体重变化、白细胞/中性粒和肝功能安全。'
    },
    {
        id: 'thyroxine-replacement',
        name: '甲状腺素替代治疗监测',
        match: ({ patientType, treatmentStage, medicationText }) => (
            ['甲减', '亚临床甲减', '中枢性甲减', '桥本氏甲状腺炎', '甲癌术后'].includes(patientType) ||
            ['甲状腺素替代治疗', '术后随访', '减药期'].includes(treatmentStage) ||
            /左甲状腺素|优甲乐|雷替斯|L-T4|levothyroxine/i.test(medicationText)
        ),
        core: ['TSH', 'FT4', 'weight'],
        recommended: ['FT3', 'TC', 'LDL', 'Triglyceride', 'CK'],
        intervalDays: 60,
        reason: '替代治疗需要结合甲功、体重和代谢指标观察剂量是否合适。'
    },
    {
        id: 'postoperative-calcium',
        name: '术后钙磷代谢监测',
        match: ({ patientType, treatmentStage, medicationText }) => (
            ['甲状腺术后低钙', '甲癌术后', '甲状腺髓样癌'].includes(patientType) ||
            ['术后低钙管理', '术后随访'].includes(treatmentStage) ||
            /钙|碳酸钙|骨化三醇|维生素D|calcitriol/i.test(medicationText)
        ),
        core: ['Calcium', 'PTH'],
        recommended: ['Phosphorus', 'Magnesium', 'VitaminD', 'Albumin', 'ALP'],
        intervalDays: 45,
        reason: '术后或补钙人群需关注血钙、PTH 以及维生素D/白蛋白等校正因素。'
    },
    {
        id: 'inflammation',
        name: '炎症活动监测',
        match: ({ patientType, treatmentStage }) => ['亚急性甲状腺炎'].includes(patientType) || treatmentStage === '炎症活动期',
        core: ['TSH', 'FT4', 'FT3', 'ESR', 'CRP'],
        recommended: ['WBC'],
        intervalDays: 30,
        reason: '亚急性甲状腺炎需要同时观察炎症活动和甲功阶段变化。'
    },
    {
        id: 'cancer-followup',
        name: '甲状腺肿瘤随访监测',
        match: ({ patientType, treatmentStage }) => ['甲癌术后', '甲状腺髓样癌'].includes(patientType) || treatmentStage === '肿瘤术后随访',
        core: ['TSH', 'Tg', 'TGAb', 'Calcitonin', 'CEA'],
        recommended: ['FT4', 'FT3'],
        intervalDays: 90,
        reason: '术后肿瘤随访需关注 TSH 控制和肿瘤相关标志物动态。'
    }
];

const unique = (items) => [...new Set(items)].filter(key => TREND_KEYS.includes(key));

const parseTrendIndicators = (raw) => {
    if (!raw) return [];
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed.filter(key => TREND_KEYS.includes(key)) : [];
    } catch (e) {
        return [];
    }
};

const medicationTextFromPlans = (plans) => plans
    .map(plan => [plan.medicineName, plan.dosage, plan.notes].filter(Boolean).join(' '))
    .join(' ');

const buildMonitoringPlan = async (userId, memberId = null) => {
    const owner = memberId
        ? await FamilyMember.findOne({ where: { id: memberId, UserId: userId } })
        : await User.findByPk(userId, { attributes: ['id', 'patientType', 'trendIndicators'] });
    const patientType = owner?.patientType || '其他';
    const treatmentStage = owner?.treatmentStage || '日常随访';

    const where = { UserId: userId };
    if (memberId !== null && memberId !== undefined && memberId !== '') where.memberId = memberId || null;

    const records = await HealthRecord.findAll({
        where,
        order: [['recordDate', 'DESC']],
        limit: 2
    });
    const latest = records[0]?.toJSON() || null;
    const previous = records[1]?.toJSON() || null;
    const analysis = latest ? analyzeRecord(latest, parseRanges(owner?.referenceRanges), previous, patientType) : null;

    const medicationPlans = await MedicationPlan.findAll({
        where: { UserId: userId, isActive: true },
        order: [['createdAt', 'DESC']]
    });
    const medicationText = medicationTextFromPlans(medicationPlans);

    const diseaseProfile = getDiseaseIndicatorProfile(patientType);
    const diseaseCore = unique(diseaseProfile.core || []);
    const diseaseRecommended = unique(diseaseProfile.recommended || []);
    const matchedRules = TREATMENT_RULES.filter(rule => rule.match({ patientType, treatmentStage, medicationText }));
    const abnormalKeys = unique((analysis?.abnormal || []).map(item => item.key));
    const selectedKeys = parseTrendIndicators(owner?.trendIndicators);

    const coreKeys = unique([
        ...diseaseCore,
        ...matchedRules.flatMap(rule => rule.core || []),
        ...abnormalKeys.filter(key => getMetricRole(key, patientType) === 'core')
    ]);
    const recommendedKeys = unique([
        ...diseaseRecommended,
        ...matchedRules.flatMap(rule => rule.recommended || []),
        ...abnormalKeys,
        ...selectedKeys
    ]).filter(key => !coreKeys.includes(key));
    const defaultTrendKeys = unique([...coreKeys, ...recommendedKeys]);

    const intervalCandidates = matchedRules.map(rule => rule.intervalDays).filter(Boolean);
    const intervalDays = intervalCandidates.length
        ? Math.min(...intervalCandidates)
        : (patientType === '甲状腺结节' ? 180 : patientType === '其他' ? 90 : 60);

    const groups = [
        {
            id: 'disease',
            title: '病种核心',
            keys: diseaseCore,
            reason: diseaseProfile.note
        },
        ...matchedRules.map(rule => ({
            id: rule.id,
            title: rule.name,
            keys: unique([...(rule.core || []), ...(rule.recommended || [])]),
            reason: rule.reason
        })),
        {
            id: 'abnormal',
            title: '最近异常追踪',
            keys: abnormalKeys,
            reason: abnormalKeys.length ? '最近异常指标会自动进入重点跟踪。' : '暂无最近异常指标。'
        }
    ].filter(group => group.keys.length);

    const keyReasonMap = {};
    groups.forEach(group => {
        group.keys.forEach(key => {
            if (!keyReasonMap[key]) keyReasonMap[key] = [];
            keyReasonMap[key].push(group.title);
        });
    });

    const items = defaultTrendKeys.map(key => ({
        ...getTrendMeta(key),
        role: coreKeys.includes(key) ? 'core' : 'recommended',
        reasons: keyReasonMap[key] || []
    }));

    const latestCoverageKeys = latest
        ? defaultTrendKeys.filter(key => latest[key] !== null && latest[key] !== undefined && latest[key] !== '')
        : [];
    const missingCoreKeys = latest
        ? coreKeys.filter(key => latest[key] === null || latest[key] === undefined || latest[key] === '')
        : coreKeys;
    const qualityScore = defaultTrendKeys.length
        ? Math.round((latestCoverageKeys.length / defaultTrendKeys.length) * 100)
        : 0;

    return {
        patientType,
        treatmentStage,
        activeMedicationCount: medicationPlans.length,
        diseaseProfile,
        treatmentRules: matchedRules.map(rule => ({
            id: rule.id,
            name: rule.name,
            reason: rule.reason,
            intervalDays: rule.intervalDays
        })),
        coreKeys,
        recommendedKeys,
        defaultTrendKeys: defaultTrendKeys.length ? defaultTrendKeys : getDefaultTrendKeys(patientType),
        groups,
        items,
        abnormalKeys,
        dataQuality: {
            score: qualityScore,
            coveredKeys: latestCoverageKeys,
            missingCoreKeys,
            message: missingCoreKeys.length
                ? `最近记录缺少 ${missingCoreKeys.length} 项核心监测项`
                : '最近记录已覆盖核心监测项'
        },
        intervalDays,
        summary: matchedRules.length
            ? `${patientType} · 已结合 ${matchedRules.length} 个治疗/风险场景生成监测方案`
            : `${patientType} · 已按病种和最近异常生成监测方案`
    };
};

module.exports = {
    buildMonitoringPlan,
    TREATMENT_RULES
};

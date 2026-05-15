export const ALL_INDICATORS = [
  { key: 'TSH', name: 'TSH', fullName: '促甲状腺激素', unit: 'mIU/L', ref: '0.27 - 4.2', color: '#3E7BFF' },
  { key: 'FT4', name: 'FT4', fullName: '游离甲状腺素', unit: 'pmol/L', ref: '12 - 22', color: '#FF7D00' },
  { key: 'FT3', name: 'FT3', fullName: '游离三碘甲状腺原氨酸', unit: 'pmol/L', ref: '3.1 - 6.8', color: '#F53F3F' },
  { key: 'T3', name: 'T3', fullName: '三碘甲状腺原氨酸', unit: 'nmol/L', ref: '1.3 - 3.1', color: '#722ED1' },
  { key: 'T4', name: 'T4', fullName: '总甲状腺素', unit: 'nmol/L', ref: '66 - 181', color: '#13C2C2' },
  { key: 'TPOAb', name: 'TPO-Ab', fullName: '抗甲状腺过氧化物酶抗体', unit: 'IU/mL', ref: '< 34', color: '#EB2F96' },
  { key: 'TGAb', name: 'TG-Ab', fullName: '抗甲状腺球蛋白抗体', unit: 'IU/mL', ref: '< 115', color: '#2F54EB' },
  { key: 'TRAb', name: 'TRAb', fullName: '促甲状腺激素受体抗体', unit: 'IU/L', ref: '< 1.75', color: '#00B42A' },
  { key: 'Tg', name: 'Tg', fullName: '甲状腺球蛋白', unit: 'ng/mL', ref: '< 77', color: '#FAAD14' },
  { key: 'Calcitonin', name: '降钙素', fullName: '降钙素', unit: 'pg/mL', ref: '< 9.52', color: '#A0D911' },
  { key: 'Calcium', name: '血钙', fullName: '血钙', unit: 'mmol/L', ref: '2.11 - 2.52', color: '#FA541C' },
  { key: 'Magnesium', name: '血镁', fullName: '血镁', unit: 'mmol/L', ref: '0.75 - 1.02', color: '#13C2C2' },
  { key: 'Phosphorus', name: '血磷', fullName: '血磷', unit: 'mmol/L', ref: '0.85 - 1.51', color: '#722ED1' },
  { key: 'PTH', name: 'PTH', fullName: '甲状旁腺激素', unit: 'pg/mL', ref: '15 - 65', color: '#2F54EB' },
  { key: 'TSI', name: 'TSI', fullName: '甲状腺刺激免疫球蛋白', unit: 'IU/L', ref: '< 0.55', color: '#00B42A' },
  { key: 'TBAb', name: 'TBAb', fullName: '促甲状腺素受体阻断抗体', unit: 'IU/L', ref: '< 1.75', color: '#14C9C9' },
  { key: 'CEA', name: 'CEA', fullName: '癌胚抗原', unit: 'ng/mL', ref: '< 5', color: '#F77234' },
  { key: 'VitaminD', name: '25-OH-D', fullName: '25羟维生素D', unit: 'ng/mL', ref: '30 - 100', color: '#F7BA1E' },
  { key: 'Albumin', name: '白蛋白', fullName: '血清白蛋白', unit: 'g/L', ref: '35 - 55', color: '#3491FA' },
  { key: 'ALP', name: 'ALP', fullName: '碱性磷酸酶', unit: 'U/L', ref: '45 - 125', color: '#A0D911' },
  { key: 'ALT', name: 'ALT', fullName: '丙氨酸氨基转移酶', unit: 'U/L', ref: '< 40', color: '#F53F3F' },
  { key: 'AST', name: 'AST', fullName: '天门冬氨酸氨基转移酶', unit: 'U/L', ref: '< 40', color: '#FF7D00' },
  { key: 'GGT', name: 'GGT', fullName: '谷氨酰转肽酶', unit: 'U/L', ref: '< 50', color: '#F77234' },
  { key: 'Bilirubin', name: '总胆红素', fullName: '总胆红素', unit: 'umol/L', ref: '3.4 - 20.5', color: '#F7BA1E' },
  { key: 'WBC', name: '白细胞', fullName: '白细胞计数', unit: '10^9/L', ref: '3.5 - 9.5', color: '#722ED1' },
  { key: 'Neutrophils', name: '中性粒', fullName: '中性粒细胞计数', unit: '10^9/L', ref: '1.8 - 6.3', color: '#2F54EB' },
  { key: 'TC', name: '总胆固醇', fullName: '总胆固醇', unit: 'mmol/L', ref: '< 5.2', color: '#86909C' },
  { key: 'LDL', name: 'LDL-C', fullName: '低密度脂蛋白胆固醇', unit: 'mmol/L', ref: '< 3.4', color: '#F53F3F' },
  { key: 'HDL', name: 'HDL-C', fullName: '高密度脂蛋白胆固醇', unit: 'mmol/L', ref: '> 1.0', color: '#00B42A' },
  { key: 'Triglyceride', name: '甘油三酯', fullName: '甘油三酯', unit: 'mmol/L', ref: '< 1.7', color: '#FF7D00' },
  { key: 'CK', name: 'CK', fullName: '肌酸激酶', unit: 'U/L', ref: '40 - 200', color: '#A0D911' },
  { key: 'ESR', name: 'ESR', fullName: '红细胞沉降率', unit: 'mm/h', ref: '< 20', color: '#EB2F96' },
  { key: 'CRP', name: 'CRP', fullName: 'C反应蛋白', unit: 'mg/L', ref: '< 10', color: '#F53F3F' }
];

export const TREND_INDICATORS = [
  ...ALL_INDICATORS,
  { key: 'weight', name: '体重', fullName: '体重', unit: 'kg', ref: '', color: '#3491FA', type: 'body' },
  { key: 'heartRate', name: '心率', fullName: '静息心率', unit: '次/分', ref: '', color: '#F77234', type: 'body' }
];

export const DISEASE_INDICATOR_PROFILES = {
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

export const PATIENT_TYPES = Object.keys(DISEASE_INDICATOR_PROFILES);

export const TREATMENT_STAGES = [
  '日常随访',
  '初诊评估',
  '抗甲状腺药物治疗中',
  '减药期',
  '停药观察期',
  '甲状腺素替代治疗',
  '碘131治疗后',
  '术后随访',
  '术后低钙管理',
  '炎症活动期',
  '肿瘤术后随访',
  '妊娠/备孕管理'
];

const allTrendKeys = TREND_INDICATORS.map(item => item.key);

export const getDiseaseIndicatorProfile = (patientType = '其他') => {
  return DISEASE_INDICATOR_PROFILES[patientType] || DISEASE_INDICATOR_PROFILES.其他;
};

export const getDefaultTrendKeys = (patientType = '其他') => {
  const profile = getDiseaseIndicatorProfile(patientType);
  return [...new Set([...profile.core, ...profile.recommended])].filter(key => allTrendKeys.includes(key));
};

export const normalizeTrendKeys = (keys, patientType = '其他') => {
  const parsed = Array.isArray(keys) ? keys : [];
  const valid = parsed.filter(key => allTrendKeys.includes(key));
  return valid.length ? [...new Set(valid)] : getDefaultTrendKeys(patientType);
};

const sequelize = require('../db');

const REQUIRED_COLUMNS = {
  Users: ['patientType', 'treatmentStage', 'trendIndicators'],
  FamilyMembers: ['patientType', 'treatmentStage', 'referenceRanges', 'checkupIntervalDays'],
  HealthRecords: ['TSI', 'TBAb', 'CEA', 'VitaminD', 'Albumin', 'ALP', 'ALT', 'AST', 'GGT', 'Bilirubin', 'WBC', 'Neutrophils', 'TC', 'LDL', 'HDL', 'Triglyceride', 'CK', 'ESR', 'CRP'],
  ShareLinks: ['tokenHash', 'expiresAt', 'revokedAt', 'accessCount', 'options'],
  VerifySendLocks: ['targetKey'],
  MedicationAdjustments: ['adjustmentDate', 'medicineName', 'fromDosage', 'toDosage', 'reason'],
  MedicationLogs: ['date', 'takenAt', 'source', 'note', 'medicineNameSnapshot', 'dosageSnapshot']
};

const main = async () => {
  const qi = sequelize.getQueryInterface();
  const missing = [];

  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    let desc;
    try {
      desc = await qi.describeTable(table);
    } catch (e) {
      missing.push(`${table}.*`);
      continue;
    }
    columns.forEach(column => {
      if (!desc[column]) missing.push(`${table}.${column}`);
    });
  }

  if (missing.length) {
    console.error('数据库迁移自检失败，缺少字段/表：');
    missing.forEach(item => console.error(`- ${item}`));
    process.exitCode = 1;
  } else {
    console.log('数据库迁移自检通过。');
  }

  await sequelize.close();
};

main().catch(async (err) => {
  console.error('数据库迁移自检异常：', err.message);
  await sequelize.close().catch(() => {});
  process.exit(1);
});

'use strict';

const LAB_COLUMNS = [
  'TSI', 'TBAb', 'CEA', 'VitaminD', 'Albumin', 'ALP',
  'ALT', 'AST', 'GGT', 'Bilirubin',
  'WBC', 'Neutrophils',
  'TC', 'LDL', 'HDL', 'Triglyceride', 'CK',
  'ESR', 'CRP'
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const userTable = await queryInterface.describeTable('Users');
    if (userTable.patientType) {
      await queryInterface.changeColumn('Users', 'patientType', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: '其他'
      });
    }

    const familyTable = await queryInterface.describeTable('FamilyMembers').catch(() => null);
    if (familyTable?.patientType) {
      await queryInterface.changeColumn('FamilyMembers', 'patientType', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: '其他'
      });
    }

    const recordTable = await queryInterface.describeTable('HealthRecords');
    for (const key of LAB_COLUMNS) {
      if (!recordTable[key]) {
        await queryInterface.addColumn('HealthRecords', key, {
          type: Sequelize.STRING(20),
          allowNull: true
        });
      }
    }
  },

  async down(queryInterface) {
    const recordTable = await queryInterface.describeTable('HealthRecords');
    for (const key of LAB_COLUMNS) {
      if (recordTable[key]) {
        await queryInterface.removeColumn('HealthRecords', key);
      }
    }
  }
};

'use strict';

/** Sequelize CLI 迁移脚本 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FamilyMembers', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      relation: { type: Sequelize.STRING },
      gender: { type: Sequelize.ENUM('男', '女') },
      birthDate: { type: Sequelize.DATEONLY },
      patientType: { type: Sequelize.ENUM('甲减', '甲亢', '甲状腺结节', '甲癌术后', '桥本氏甲状腺炎', '其他'), defaultValue: '其他' },
      note: { type: Sequelize.STRING },
      UserId: { type: Sequelize.INTEGER },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addColumn('HealthRecords', 'memberId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.createTable('MedicationLogs', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      takenAt: { type: Sequelize.DATE, allowNull: false },
      UserId: { type: Sequelize.INTEGER },
      MedicationPlanId: { type: Sequelize.INTEGER },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('MedicationLogs');
    await queryInterface.removeColumn('HealthRecords', 'memberId');
    await queryInterface.dropTable('FamilyMembers');
  }
};

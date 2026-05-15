'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const userTable = await queryInterface.describeTable('Users');
    if (!userTable.treatmentStage) {
      await queryInterface.addColumn('Users', 'treatmentStage', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: '日常随访'
      });
    }

    const familyTable = await queryInterface.describeTable('FamilyMembers').catch(() => null);
    if (familyTable && !familyTable.treatmentStage) {
      await queryInterface.addColumn('FamilyMembers', 'treatmentStage', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: '日常随访'
      });
    }

    const tables = (await queryInterface.showAllTables()).map(item => typeof item === 'string' ? item : item.tableName);
    if (!tables.includes('MedicationAdjustments')) {
      await queryInterface.createTable('MedicationAdjustments', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        adjustmentDate: { type: Sequelize.DATEONLY, allowNull: false },
        medicineName: { type: Sequelize.STRING, allowNull: false },
        fromDosage: { type: Sequelize.STRING, allowNull: true },
        toDosage: { type: Sequelize.STRING, allowNull: false },
        reason: { type: Sequelize.STRING, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
        UserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onDelete: 'CASCADE'
        },
        MedicationPlanId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'MedicationPlans', key: 'id' },
          onDelete: 'CASCADE'
        }
      });
      await queryInterface.addIndex('MedicationAdjustments', ['UserId', 'adjustmentDate'], {
        name: 'idx_med_adjust_user_date'
      });
      await queryInterface.addIndex('MedicationAdjustments', ['MedicationPlanId', 'adjustmentDate'], {
        name: 'idx_med_adjust_plan_date'
      });
    }
  },

  async down(queryInterface) {
    const tables = (await queryInterface.showAllTables()).map(item => typeof item === 'string' ? item : item.tableName);
    if (tables.includes('MedicationAdjustments')) {
      await queryInterface.dropTable('MedicationAdjustments');
    }

    const familyTable = await queryInterface.describeTable('FamilyMembers').catch(() => null);
    if (familyTable?.treatmentStage) await queryInterface.removeColumn('FamilyMembers', 'treatmentStage');

    const userTable = await queryInterface.describeTable('Users');
    if (userTable.treatmentStage) await queryInterface.removeColumn('Users', 'treatmentStage');
  }
};

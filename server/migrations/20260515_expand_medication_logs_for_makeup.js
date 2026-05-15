'use strict';

const ensureColumn = async (queryInterface, Sequelize, table, column, definition) => {
  const desc = await queryInterface.describeTable(table);
  if (!desc[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await ensureColumn(queryInterface, Sequelize, 'MedicationLogs', 'source', {
      type: Sequelize.ENUM('normal', 'makeup'),
      allowNull: false,
      defaultValue: 'normal'
    });
    await ensureColumn(queryInterface, Sequelize, 'MedicationLogs', 'note', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await ensureColumn(queryInterface, Sequelize, 'MedicationLogs', 'medicineNameSnapshot', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await ensureColumn(queryInterface, Sequelize, 'MedicationLogs', 'dosageSnapshot', {
      type: Sequelize.STRING,
      allowNull: true
    });

    const indexes = await queryInterface.showIndex('MedicationLogs');
    const hasUserDatePlan = indexes.some(index => index.name === 'idx_medication_logs_user_date_plan');
    if (!hasUserDatePlan) {
      await queryInterface.addIndex('MedicationLogs', ['UserId', 'date', 'MedicationPlanId'], {
        name: 'idx_medication_logs_user_date_plan'
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('MedicationLogs');
    if (indexes.some(index => index.name === 'idx_medication_logs_user_date_plan')) {
      await queryInterface.removeIndex('MedicationLogs', 'idx_medication_logs_user_date_plan');
    }
    const desc = await queryInterface.describeTable('MedicationLogs');
    if (desc.dosageSnapshot) await queryInterface.removeColumn('MedicationLogs', 'dosageSnapshot');
    if (desc.medicineNameSnapshot) await queryInterface.removeColumn('MedicationLogs', 'medicineNameSnapshot');
    if (desc.note) await queryInterface.removeColumn('MedicationLogs', 'note');
    if (desc.source) await queryInterface.removeColumn('MedicationLogs', 'source');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_MedicationLogs_source";');
    }
  }
};

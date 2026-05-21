'use strict';

const ensureColumn = async (queryInterface, Sequelize, table, column, definition) => {
  const desc = await queryInterface.describeTable(table);
  if (!desc[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await ensureColumn(queryInterface, Sequelize, 'MedicationPlans', 'weeklyDosage', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('MedicationPlans');
    if (desc.weeklyDosage) {
      await queryInterface.removeColumn('MedicationPlans', 'weeklyDosage');
    }
  }
};

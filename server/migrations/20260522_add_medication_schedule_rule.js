'use strict';

const ensureColumn = async (queryInterface, Sequelize, table, column, definition) => {
  const desc = await queryInterface.describeTable(table);
  if (!desc[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    await ensureColumn(queryInterface, Sequelize, 'MedicationPlans', 'scheduleType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'weekly'
    });

    await ensureColumn(queryInterface, Sequelize, 'MedicationPlans', 'intervalDays', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await ensureColumn(queryInterface, Sequelize, 'MedicationPlans', 'startDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('MedicationPlans');
    if (desc.startDate) await queryInterface.removeColumn('MedicationPlans', 'startDate');
    if (desc.intervalDays) await queryInterface.removeColumn('MedicationPlans', 'intervalDays');
    if (desc.scheduleType) await queryInterface.removeColumn('MedicationPlans', 'scheduleType');
  }
};

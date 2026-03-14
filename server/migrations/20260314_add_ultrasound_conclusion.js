'use strict';

/** Sequelize CLI 迁移脚本 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('HealthRecords', 'conclusion', {
      type: Sequelize.TEXT
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('HealthRecords', 'conclusion');
  }
};

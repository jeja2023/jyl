'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const userTable = await queryInterface.describeTable('Users');
    if (!userTable.trendIndicators) {
      await queryInterface.addColumn('Users', 'trendIndicators', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const userTable = await queryInterface.describeTable('Users');
    if (userTable.trendIndicators) {
      await queryInterface.removeColumn('Users', 'trendIndicators');
    }
  }
};


'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const userTable = await queryInterface.describeTable('Users');
    if (!userTable.referenceRanges) {
      await queryInterface.addColumn('Users', 'referenceRanges', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const userTable = await queryInterface.describeTable('Users');
    if (userTable.referenceRanges) {
      await queryInterface.removeColumn('Users', 'referenceRanges');
    }
  }
};

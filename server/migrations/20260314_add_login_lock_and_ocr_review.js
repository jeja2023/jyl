'use strict';

/** Sequelize CLI 迁移脚本 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userTable = await queryInterface.describeTable('Users');
    if (!userTable.loginFailCount) {
      await queryInterface.addColumn('Users', 'loginFailCount', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!userTable.loginLockedUntil) {
      await queryInterface.addColumn('Users', 'loginLockedUntil', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }

    const recordTable = await queryInterface.describeTable('HealthRecords');
    if (!recordTable.ocrReview) {
      await queryInterface.addColumn('HealthRecords', 'ocrReview', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const userTable = await queryInterface.describeTable('Users');
    if (userTable.loginFailCount) {
      await queryInterface.removeColumn('Users', 'loginFailCount');
    }
    if (userTable.loginLockedUntil) {
      await queryInterface.removeColumn('Users', 'loginLockedUntil');
    }

    const recordTable = await queryInterface.describeTable('HealthRecords');
    if (recordTable.ocrReview) {
      await queryInterface.removeColumn('HealthRecords', 'ocrReview');
    }
  }
};

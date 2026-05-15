'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const familyTable = await queryInterface.describeTable('FamilyMembers');
    if (!familyTable.referenceRanges) {
      await queryInterface.addColumn('FamilyMembers', 'referenceRanges', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
    if (!familyTable.checkupIntervalDays) {
      await queryInterface.addColumn('FamilyMembers', 'checkupIntervalDays', {
        type: Sequelize.INTEGER,
        allowNull: true
      });
    }

    const shareTable = await queryInterface.describeTable('ShareLinks').catch(() => null);
    if (shareTable && !shareTable.options) {
      await queryInterface.addColumn('ShareLinks', 'options', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }

    const userTable = await queryInterface.describeTable('Users');
    if (!userTable.trendIndicators) {
      await queryInterface.addColumn('Users', 'trendIndicators', {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const familyTable = await queryInterface.describeTable('FamilyMembers');
    if (familyTable.referenceRanges) await queryInterface.removeColumn('FamilyMembers', 'referenceRanges');
    if (familyTable.checkupIntervalDays) await queryInterface.removeColumn('FamilyMembers', 'checkupIntervalDays');

    const shareTable = await queryInterface.describeTable('ShareLinks').catch(() => null);
    if (shareTable && shareTable.options) await queryInterface.removeColumn('ShareLinks', 'options');

    const userTable = await queryInterface.describeTable('Users');
    if (userTable.trendIndicators) await queryInterface.removeColumn('Users', 'trendIndicators');
  }
};

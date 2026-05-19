'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = (await queryInterface.showAllTables()).map(item => (
      typeof item === 'string' ? item : item.tableName
    ));

    if (!tables.includes('VerifySendLocks')) {
      await queryInterface.createTable('VerifySendLocks', {
        targetKey: {
          type: Sequelize.STRING(160),
          allowNull: false,
          primaryKey: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    }
  },

  async down(queryInterface) {
    const tables = (await queryInterface.showAllTables()).map(item => (
      typeof item === 'string' ? item : item.tableName
    ));

    if (tables.includes('VerifySendLocks')) {
      await queryInterface.dropTable('VerifySendLocks');
    }
  }
};

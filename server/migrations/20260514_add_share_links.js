'use strict';

const ensureIndex = async (queryInterface, table, fields, name) => {
  const indexes = await queryInterface.showIndex(table).catch(() => []);
  if (!indexes.some(index => index.name === name)) {
    await queryInterface.addIndex(table, fields, { name });
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const shareTable = await queryInterface.describeTable('ShareLinks').catch(() => null);
    if (!shareTable) {
      await queryInterface.createTable('ShareLinks', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        tokenHash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        type: { type: Sequelize.ENUM('record'), allowNull: false, defaultValue: 'record' },
        resourceId: { type: Sequelize.INTEGER, allowNull: false },
        expiresAt: { type: Sequelize.DATE, allowNull: false },
        revokedAt: { type: Sequelize.DATE, allowNull: true },
        accessCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        lastAccessAt: { type: Sequelize.DATE, allowNull: true },
        lastAccessIp: { type: Sequelize.STRING(64), allowNull: true },
        options: { type: Sequelize.TEXT, allowNull: true },
        UserId: { type: Sequelize.INTEGER },
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false }
      });
    }

    await ensureIndex(queryInterface, 'ShareLinks', ['tokenHash'], 'idx_share_token_hash');
    await ensureIndex(queryInterface, 'ShareLinks', ['UserId', 'resourceId'], 'idx_share_owner_resource');
    await ensureIndex(queryInterface, 'ShareLinks', ['expiresAt', 'revokedAt'], 'idx_share_expires');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ShareLinks');
  }
};

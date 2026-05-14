'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
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
      UserId: { type: Sequelize.INTEGER },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    await queryInterface.addIndex('ShareLinks', ['tokenHash'], { name: 'idx_share_token_hash' });
    await queryInterface.addIndex('ShareLinks', ['UserId', 'resourceId'], { name: 'idx_share_owner_resource' });
    await queryInterface.addIndex('ShareLinks', ['expiresAt', 'revokedAt'], { name: 'idx_share_expires' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ShareLinks');
  }
};

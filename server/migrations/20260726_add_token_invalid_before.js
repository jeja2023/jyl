'use strict';

/**
 * JWT 签发后在过期前无法失效：登出只是前端删本地 token，
 * 改密后旧设备上的 token 也照样能用。
 * 加一个"此刻之前签发的 token 全部作废"的时间戳，
 * 登出和改密时更新它，认证中间件比对 token 的 iat。
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const userTable = await queryInterface.describeTable('Users');
    if (!userTable.tokenInvalidBefore) {
      await queryInterface.addColumn('Users', 'tokenInvalidBefore', {
        // 必须带毫秒精度：默认的 DATETIME 只到秒，
        // 会把登出时刻截断成整秒，导致同一秒内签发的令牌判不出失效。
        type: Sequelize.DATE(3),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const userTable = await queryInterface.describeTable('Users');
    if (userTable.tokenInvalidBefore) {
      await queryInterface.removeColumn('Users', 'tokenInvalidBefore');
    }
  }
};

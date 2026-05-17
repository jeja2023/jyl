'use strict';

const ensureIndex = async (queryInterface, table, fields, name) => {
  const indexes = await queryInterface.showIndex(table).catch(() => []);
  if (!indexes.some(index => index.name === name)) {
    await queryInterface.addIndex(table, fields, { name });
  }
};

const removeIndexIfExists = async (queryInterface, table, name) => {
  const indexes = await queryInterface.showIndex(table).catch(() => []);
  if (indexes.some(index => index.name === name)) {
    await queryInterface.removeIndex(table, name);
  }
};

module.exports = {
  async up(queryInterface) {
    await ensureIndex(queryInterface, 'HealthRecords', ['UserId', 'memberId', 'recordDate'], 'idx_hr_user_member_date');
    await ensureIndex(queryInterface, 'Notifications', ['UserId', 'createdAt'], 'idx_notifications_user_created');
    await ensureIndex(queryInterface, 'Notifications', ['UserId', 'isRead', 'createdAt'], 'idx_notifications_user_read_created');
    await ensureIndex(queryInterface, 'CheckupReminders', ['UserId', 'isCompleted', 'date'], 'idx_checkups_user_completed_date');
    await ensureIndex(queryInterface, 'MedicationPlans', ['UserId', 'isActive', 'takeTime'], 'idx_med_plans_user_active_time');
    await ensureIndex(queryInterface, 'ActionLogs', ['createdAt'], 'idx_action_logs_created');
    await ensureIndex(queryInterface, 'ActionLogs', ['action', 'createdAt'], 'idx_action_logs_action_created');
    await ensureIndex(queryInterface, 'ActionLogs', ['username', 'createdAt'], 'idx_action_logs_username_created');
  },

  async down(queryInterface) {
    await removeIndexIfExists(queryInterface, 'ActionLogs', 'idx_action_logs_username_created');
    await removeIndexIfExists(queryInterface, 'ActionLogs', 'idx_action_logs_action_created');
    await removeIndexIfExists(queryInterface, 'ActionLogs', 'idx_action_logs_created');
    await removeIndexIfExists(queryInterface, 'MedicationPlans', 'idx_med_plans_user_active_time');
    await removeIndexIfExists(queryInterface, 'CheckupReminders', 'idx_checkups_user_completed_date');
    await removeIndexIfExists(queryInterface, 'Notifications', 'idx_notifications_user_read_created');
    await removeIndexIfExists(queryInterface, 'Notifications', 'idx_notifications_user_created');
    await removeIndexIfExists(queryInterface, 'HealthRecords', 'idx_hr_user_member_date');
  }
};

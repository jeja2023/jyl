const sequelize = require('../db');
const User = require('../models/User');
require('dotenv').config();

/**
 * 管理员密码重置与账户解锁维护脚本
 */
const main = async () => {
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || '123456';

    const user = await User.findOne({ where: { username: adminUser } });

    if (!user) {
        // 如果账户不存在，直接创建
        await User.create({
            username: adminUser,
            password: adminPass,
            nickname: '系统管理员',
            role: 'admin',
            patientType: '其他'
        });
        console.log(`[维护] 管理员账户不存在，已为您重新创建。`);
        console.log(`[维护] 账号: ${adminUser} | 密码: ${adminPass}`);
    } else {
        // 如果已存在，强制重置其密码、角色并清空锁定状态
        await user.update({
            password: adminPass,
            role: 'admin',
            loginFailCount: 0,
            loginLockedUntil: null
        });
        console.log(`[维护] 已检测到存在的管理员账户，已成功重置密码！`);
        console.log(`[维护] 账号: ${adminUser} | 密码已强制更新为: ${adminPass} 并且已被成功解锁！`);
    }
};

main()
    .catch((err) => {
        console.error('[维护] 重置管理员账户失败:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });

const sequelize = require('../db');
const User = require('../models/User');

const identifier = process.argv[2];

const main = async () => {
    if (!identifier) {
        console.error('用法: npm run unlock:user -- <用户名/邮箱/手机号>');
        process.exitCode = 1;
        return;
    }

    const user = await User.findOne({
        where: {
            [sequelize.Sequelize.Op.or]: [
                { username: identifier },
                { email: identifier },
                { phone: identifier }
            ]
        }
    });

    if (!user) {
        console.error(`未找到账号: ${identifier}`);
        process.exitCode = 1;
        return;
    }

    await user.update({
        loginFailCount: 0,
        loginLockedUntil: null
    });

    console.log(`账号已解锁: ${user.username || user.email || user.phone || user.id}`);
};

main()
    .catch((err) => {
        console.error('解锁失败:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await sequelize.close();
    });

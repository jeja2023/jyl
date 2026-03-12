const sequelize = require('./server/db');
const HealthRecord = require('./server/models/HealthRecord');
const User = require('./server/models/User');

async function checkData() {
    try {
        await sequelize.authenticate();
        console.log('--- 数据库内容诊断 ---');
        
        const users = await User.findAll({ attributes: ['id', 'username', 'nickname'] });
        console.log('所有用户:', JSON.stringify(users, null, 2));
        
        for (const user of users) {
            const count = await HealthRecord.count({ where: { UserId: user.id } });
            const records = await HealthRecord.findAll({ 
                where: { UserId: user.id }, 
                attributes: ['id', 'recordDate', 'TSH'],
                limit: 5 
            });
            console.log(`用户 ID ${user.id} (${user.username}): 记录总数 ${count}`);
            console.log('前几条记录:', JSON.stringify(records, null, 2));
        }

        const orphanCount = await HealthRecord.count({ where: { UserId: null } });
        console.log('无主记录数:', orphanCount);

    } catch (err) {
        console.error('诊断出错:', err);
    } finally {
        await sequelize.close();
    }
}

checkData();

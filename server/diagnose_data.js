const sequelize = require('./db');
const HealthRecord = require('./models/HealthRecord');
const User = require('./models/User');
const logger = require('./utils/logger');

async function checkData() {
    if (process.env.ALLOW_DATA_DIAGNOSE !== 'true') {
        console.error('Refusing to run data diagnostics. Set ALLOW_DATA_DIAGNOSE=true in a controlled local environment.');
        process.exit(1);
    }

    try {
        await sequelize.authenticate();
        console.log('--- 数据库内容诊断 ---');
        
        const users = await User.findAll({ attributes: ['id', 'username', 'nickname'] });
        console.log('用户数量:', users.length);
        
        for (const user of users) {
            const count = await HealthRecord.count({ where: { UserId: user.id } });
            const records = await HealthRecord.findAll({ 
                where: { UserId: user.id }, 
                attributes: ['id', 'recordDate', 'TSH'],
                limit: 5 
            });
            console.log(`用户 ID ${user.id}: 记录总数 ${count}`);
            console.log('前几条记录:', JSON.stringify(records.map(record => ({
                id: record.id,
                recordDate: record.recordDate,
                hasTSH: record.TSH !== null && record.TSH !== undefined
            })), null, 2));
        }

        const orphanCount = await HealthRecord.count({ where: { UserId: null } });
        console.log('无主记录数:', orphanCount);

    } catch (err) {
        logger.error('诊断出错', { message: err.message });
    } finally {
        await sequelize.close();
    }
}

checkData();

const sequelize = require('./server/db');
const HealthRecord = require('./server/models/HealthRecord');

async function diagnose() {
    try {
        await sequelize.authenticate();
        console.log('DB Connected.');
        
        const description = await HealthRecord.describe();
        console.log('Table structure of HealthRecord:', JSON.stringify(description, null, 2));
        
        const testCount = await HealthRecord.count();
        console.log('Total records:', testCount);
        
        console.log('Diagnosis finished successfully.');
    } catch (err) {
        console.error('DIAGNOSIS FAILED:', err);
    } finally {
        await sequelize.close();
    }
}

diagnose();

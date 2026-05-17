const sequelize = require('../db');
require('dotenv').config();

/**
 * 冗余/重复索引自动清理工具
 * 用于解决 Sequelize 在开发环境下启用 alter: true 时重复创建索引导致 64 个上限锁死的经典 Bug
 */
const TABLES = [
    'HealthRecords',
    'Notifications',
    'CheckupReminders',
    'MedicationPlans',
    'ActionLogs',
    'Users',
    'MedicationLogs',
    'MedicationAdjustments',
    'SymptomAssessments',
    'ShareLinks',
    'VerifyCodes',
    'HealthTips'
];

const main = async () => {
    const queryInterface = sequelize.getQueryInterface();
    console.log('[维护] 开始扫描并清理开发数据库中的重复冗余索引...');

    for (const table of TABLES) {
        try {
            const indexes = await queryInterface.showIndex(table).catch(() => []);
            
            const toRemove = [];
            for (const idx of indexes) {
                const name = idx.name;
                
                // 如果索引名字含有 Sequelize 自动生成的 alter 后缀（如 _1, _2, _3 等）
                const hasAlterSuffix = /_\d+$/.test(name);
                
                if (hasAlterSuffix) {
                    toRemove.push(name);
                }
            }

            if (toRemove.length > 0) {
                console.log(`[维护] 表 "${table}" 发现 ${toRemove.length} 个冗余索引，正在执行清理...`);
                for (const idxName of toRemove) {
                    await queryInterface.removeIndex(table, idxName).catch(err => {
                        console.warn(`[维护] 清理索引 ${idxName} 失败:`, err.message);
                    });
                }
                console.log(`[维护] 表 "${table}" 冗余索引清理完毕！`);
            } else {
                console.log(`[维护] 表 "${table}" 索引状态健康 (共有 ${indexes.length} 个索引)`);
            }
        } catch (err) {
            console.warn(`[维护] 扫描表 "${table}" 失败:`, err.message);
        }
    }
    console.log('[维护] 数据库冗余索引清理任务全部完成！');
};

main()
    .catch((err) => {
        console.error('[维护] 清理脚本执行异常:', err.message);
    })
    .finally(async () => {
        await sequelize.close();
    });

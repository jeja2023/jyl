const { sequelize, models, getModelColumns } = require('../models');

/**
 * 数据库迁移自检。
 *
 * 旧版本手工维护一份 REQUIRED_COLUMNS 清单，每加一条迁移都得记得同步——
 * Users.tokenInvalidBefore 就漏掉了，结果自检打印"通过"，而
 * userCache 的 SELECT 因缺列报错、被认证中间件统一转成 401，
 * 所有已登录接口全线失败，报错还指向令牌本身。
 *
 * 现在改成按模型定义全量比对：模型是唯一真理来源，
 * 只要模型里声明了列而库里没有，自检必然失败，不存在"漏写清单"这回事。
 */

/** 库里多出来的列不算错误：可能是历史遗留或人工加的，只提示 */
const IGNORE_EXTRA_COLUMNS = new Set([]);

const main = async () => {
    const qi = sequelize.getQueryInterface();
    const missingTables = [];
    const missingColumns = [];
    const extraColumns = [];

    const modelEntries = Object.entries(models).sort(([a], [b]) => a.localeCompare(b));

    for (const [modelName, model] of modelEntries) {
        const table = model.getTableName();
        const tableName = typeof table === 'string' ? table : table.tableName;

        let desc;
        try {
            desc = await qi.describeTable(table);
        } catch (e) {
            missingTables.push(`${tableName} (模型 ${modelName})`);
            continue;
        }

        const declared = getModelColumns(model);
        declared.forEach((column) => {
            if (!desc[column]) missingColumns.push(`${tableName}.${column}`);
        });

        const declaredSet = new Set(declared);
        Object.keys(desc).forEach((column) => {
            if (!declaredSet.has(column) && !IGNORE_EXTRA_COLUMNS.has(`${tableName}.${column}`)) {
                extraColumns.push(`${tableName}.${column}`);
            }
        });
    }

    const failed = missingTables.length > 0 || missingColumns.length > 0;

    if (missingTables.length) {
        console.error('缺少数据表：');
        missingTables.forEach((item) => console.error(`- ${item}`));
    }
    if (missingColumns.length) {
        console.error('缺少字段：');
        missingColumns.forEach((item) => console.error(`- ${item}`));
    }

    if (failed) {
        console.error('');
        console.error(`数据库迁移自检失败，共比对 ${modelEntries.length} 个模型。请先执行 npm run migrate。`);
        process.exitCode = 1;
    } else {
        console.log(`数据库迁移自检通过：${modelEntries.length} 个模型的字段全部存在。`);
    }

    if (extraColumns.length) {
        console.log('');
        console.log('提示：库中存在模型未声明的列（不影响运行，仅供核对）：');
        extraColumns.forEach((item) => console.log(`- ${item}`));
    }

    await sequelize.close();
};

main().catch(async (err) => {
    console.error('数据库迁移自检异常：', err.message);
    await sequelize.close().catch(() => { });
    process.exit(1);
});

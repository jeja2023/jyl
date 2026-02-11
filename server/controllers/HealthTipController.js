const HealthTip = require('../models/HealthTip');
const Response = require('../utils/response');
const sequelize = require('../db');

// 默认健康贴士数据（共用，避免重复）
const DEFAULT_TIPS = [
    { content: '固定时间（如早起空腹）服用优甲乐效果最佳，服药后1小时内避免进食。', category: 'medication' },
    { content: '优甲乐应避开豆浆、牛奶等高钙高蛋白食物同服，间隔至少4小时。', category: 'medication' },
    { content: '定期复查甲状腺功能（TSH、FT3、FT4）是调整药量的关键。', category: 'checkup' },
    { content: '保持良好的作息习惯，避免过度劳累，有助于甲状腺健康。', category: 'lifestyle' },
    { content: '含碘食物摄入需根据医嘱，甲亢需忌碘，甲减视情况而定。', category: 'diet' }
];

class HealthTipController {
    /**
     * 获取随机一条贴士
     * GET /api/tip/random
     */
    static async random(ctx) {
        // 检查是否有数据，无数据则初始化
        const count = await HealthTip.count();
        if (count === 0) {
            await HealthTip.bulkCreate(DEFAULT_TIPS);
        }

        // 随机获取一个
        const tip = await HealthTip.findOne({
            order: sequelize.random()
        });

        // 兜底
        const defaultTip = {
            content: '固定时间（如早起空腹）服用优甲乐效果最佳，服药后1小时内避免进食。'
        };

        Response.success(ctx, tip || defaultTip);
    }

    /**
     * 初始化/添加贴士 (管理员用，或者种子数据)
     * POST /api/tip/seed
     */
    static async seed(ctx) {
        const count = await HealthTip.count();
        if (count === 0) {
            await HealthTip.bulkCreate(DEFAULT_TIPS);
        }
        Response.success(ctx, null, '种子数据已初始化');
    }
}

module.exports = HealthTipController;

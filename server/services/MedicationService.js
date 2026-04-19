const MedicationLog = require('../models/MedicationLog');
const MedicationPlan = require('../models/MedicationPlan');
const { Op } = require('sequelize');

const dateToStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const computeAdherence = (activeCount, logs, days, today = new Date()) => {
    const expected = activeCount * days;
    const taken = logs.length;
    
    let streak = 0;
    const missedDates = [];
    const base = new Date(today);
    
    // 计算连续打卡和记录漏服日期
    let streakBroken = false;
    for (let i = 0; i < days; i++) {
        const d = new Date(base.getTime() - i * 24 * 3600 * 1000);
        const ds = dateToStr(d);
        
        // 只有当前有激活计划时才检查
        if (activeCount > 0) {
            const dayTaken = logs.filter(l => l.date === ds).length;
            if (dayTaken >= activeCount) {
                if (!streakBroken) {
                    streak += 1;
                }
            } else {
                // 如果是今天，且还没打完卡，先不打断连续打卡，也不计入漏服
                if (i === 0) {
                    // 今天还没打完卡，不增加 streak，但也不设置 streakBroken = true
                    // 这样 streak 就等于截至昨天的值
                } else {
                    streakBroken = true;
                    missedDates.push(ds);
                }
            }
        }
    }

    return { expected, taken, streak, missedDates };
};

const calculateStats = async (userId, daysInput = 0) => {
    // 找出所有曾经有的计划，确定最早开始日期
    const allPlans = await MedicationPlan.findAll({
        where: { UserId: userId },
        order: [['createdAt', 'ASC']]
    });

    if (allPlans.length === 0) {
        return {
            days: 0,
            activePlans: 0,
            takenDoses: 0,
            streak: 0,
            missedDates: []
        };
    }

    const activePlans = allPlans.filter(p => p.isActive);
    const activeCount = activePlans.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 统一日期基准
    
    // 如果没有输入天数，默认从第一个计划创建日开始算（有一算一）
    let start;
    if (daysInput > 0) {
        start = new Date(today.getTime() - (daysInput - 1) * 24 * 3600 * 1000);
    } else {
        const firstCreated = new Date(allPlans[0].createdAt);
        firstCreated.setHours(0, 0, 0, 0);
        start = firstCreated;
    }

    // 计算实际跨越的天数
    const diffTime = Math.abs(today - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const logs = await MedicationLog.findAll({
        where: {
            UserId: userId,
            date: {
                [Op.between]: [dateToStr(start), dateToStr(today)]
            }
        }
    });

    // 累计服用次数：查询该用户所有的打卡记录（包含已删除计划的记录）
    const totalTakenCount = await MedicationLog.count({
        where: { UserId: userId }
    });

    const { streak, missedDates } = computeAdherence(activeCount, logs, totalDays, today);

    return {
        days: totalDays,
        totalPlans: allPlans.length,
        activePlans: activeCount,
        takenDoses: totalTakenCount,
        streak,
        missedDates: missedDates.reverse() // 按日期顺序排列
    };
};

module.exports = { calculateStats, computeAdherence };

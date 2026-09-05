const MedicationLog = require('../models/MedicationLog');
const MedicationPlan = require('../models/MedicationPlan');
const { Op } = require('sequelize');
const { getPlanDosageForDate } = require('../utils/medicationDosage');

const dateToStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 统计窗口上限，避免 days 参数被传成天文数字后把逐日循环拖成 DoS */
const MAX_STATS_DAYS = 3650;

const getExpectedCountForDate = (activePlansOrCount, date) => {
    if (typeof activePlansOrCount === 'number') return activePlansOrCount;

    return (activePlansOrCount || []).filter((plan) => {
        if (!plan || plan.isActive === false) return false;
        return Boolean(getPlanDosageForDate(plan, date));
    }).length;
};

/**
 * 计算服药依从率、连续打卡与漏服日期。
 *
 * 这里修的是一个会给出荒谬数字的老问题：分子曾经是"窗口内全部打卡记录数"
 * （logs.length），分母却只按"当前仍启用的计划"逐日推算。于是
 *   - 停用一个计划后：分母减半、分子照旧，依从率变 200%；
 *   - 把计划改成隔 3 天一次：历史应服量被追溯重算，依从率变 300%，
 *     还会凭空造出一批"漏服日"。
 * 而且结果完全不做上限截断。
 *
 * 现在的口径：分子分母必须来自同一个计划、同一天。
 *   - 逐个计划核对当天是否应服、是否有该计划的打卡记录；
 *   - 已停用/已删除计划留下的打卡记录既不进分母也不进分子，直接忽略；
 *   - 早期没写 MedicationPlanId 的历史记录按天补配，不至于凭空算成漏服；
 *   - 最后仍然 clamp 到 100%，任何口径漏洞都不会再表现成超过 100 的数字。
 *
 * @param {Array|number} activePlansOrCount 计划数组（推荐）或固定的每日应服次数
 * @param {Array} logs 窗口内的打卡记录
 * @param {number} days 统计天数
 * @param {Date} today 统计基准日
 */
const computeAdherence = (activePlansOrCount, logs, days, today = new Date()) => {
    const allLogs = Array.isArray(logs) ? logs : [];
    const makeupTaken = allLogs.filter((log) => log && log.source === 'makeup').length;

    // 先按日期建索引：原实现每一天都 filter 一遍全量日志，是 O(days × logs)
    const logsByDate = new Map();
    for (const log of allLogs) {
        if (!log?.date) continue;
        const key = String(log.date);
        if (!logsByDate.has(key)) logsByDate.set(key, []);
        logsByDate.get(key).push(log);
    }

    const usingPlans = Array.isArray(activePlansOrCount);
    const plans = usingPlans ? activePlansOrCount.filter((plan) => plan && plan.isActive !== false) : [];
    const fixedCount = usingPlans ? 0 : Math.max(parseInt(activePlansOrCount, 10) || 0, 0);

    const windowDays = Math.min(Math.max(parseInt(days, 10) || 0, 0), MAX_STATS_DAYS);

    let expected = 0;
    let taken = 0;
    let streak = 0;
    let streakBroken = false;
    const missedDates = [];

    const base = new Date(today);
    for (let i = 0; i < windowDays; i++) {
        const day = new Date(base.getTime() - i * 24 * 3600 * 1000);
        const dayStr = dateToStr(day);
        const dayLogs = logsByDate.get(dayStr) || [];

        let expectedToday = 0;
        let takenToday = 0;

        if (usingPlans) {
            // 没有计划归属的历史记录可以按天补配；归属到已停用计划的记录直接丢弃
            let spareLegacyLogs = dayLogs.filter((log) => log?.MedicationPlanId === null || log?.MedicationPlanId === undefined).length;

            for (const plan of plans) {
                if (!getPlanDosageForDate(plan, day)) continue;
                expectedToday += 1;

                const hit = dayLogs.some((log) => (
                    log?.MedicationPlanId !== null
                    && log?.MedicationPlanId !== undefined
                    && String(log.MedicationPlanId) === String(plan.id)
                ));

                if (hit) {
                    takenToday += 1;
                } else if (spareLegacyLogs > 0) {
                    spareLegacyLogs -= 1;
                    takenToday += 1;
                }
            }
        } else {
            expectedToday = fixedCount;
            // 同一天重复打卡不能让分子超过分母
            takenToday = Math.min(dayLogs.length, expectedToday);
        }

        expected += expectedToday;
        taken += takenToday;

        // 只有当天有应服计划时才判断连续/漏服
        if (expectedToday > 0) {
            if (takenToday >= expectedToday) {
                if (!streakBroken) {
                    streak += 1;
                }
            } else if (i === 0) {
                // 今天还没打完卡：不增加 streak，但也不算漏服、不打断连续记录，
                // streak 就等于截至昨天的值
            } else {
                streakBroken = true;
                missedDates.push(dayStr);
            }
        }
    }

    const adherence = expected > 0 ? Math.min(Math.round((taken / expected) * 100), 100) : 0;
    return { expected, taken, makeupTaken, adherence, streak, missedDates };
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
            makeupDoses: 0,
            adherence: 0,
            streak: 0,
            missedDates: []
        };
    }

    const activePlans = allPlans.filter(p => p.isActive);
    const activeCount = activePlans.length;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 统一日期基准

    // 如果没有输入天数，默认从第一个计划创建日开始算（有一算一）
    const requestedDays = Math.min(Math.max(parseInt(daysInput, 10) || 0, 0), MAX_STATS_DAYS);
    let start;
    if (requestedDays > 0) {
        start = new Date(today.getTime() - (requestedDays - 1) * 24 * 3600 * 1000);
    } else {
        const firstCreated = new Date(allPlans[0].createdAt);
        firstCreated.setHours(0, 0, 0, 0);
        start = firstCreated;
    }

    // 计算实际跨越的天数，同样受窗口上限约束
    const diffTime = Math.abs(today - start);
    const totalDays = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, MAX_STATS_DAYS);

    const logs = await MedicationLog.findAll({
        where: {
            UserId: userId,
            date: {
                [Op.between]: [dateToStr(start), dateToStr(today)]
            }
        },
        attributes: ['id', 'date', 'source', 'MedicationPlanId']
    });

    // 累计服用次数：查询该用户所有的打卡记录（包含已删除计划的记录）。
    // 这是"历史累计"展示项，与依从率的口径不同，不参与依从率计算。
    const totalTakenCount = await MedicationLog.count({
        where: { UserId: userId }
    });

    const makeupTakenCount = await MedicationLog.count({
        where: { UserId: userId, source: 'makeup' }
    });

    const { expected, taken, adherence, streak, missedDates } = computeAdherence(activePlans, logs, totalDays, today);

    return {
        days: totalDays,
        totalPlans: allPlans.length,
        activePlans: activeCount,
        takenDoses: totalTakenCount,
        makeupDoses: makeupTakenCount,
        // 依从率窗口内的应服/实服，便于前端解释这个百分比是怎么来的
        expectedDosesInWindow: expected,
        takenDosesInWindow: taken,
        adherence,
        streak,
        missedDates: missedDates.reverse() // 按日期顺序排列
    };
};

module.exports = { calculateStats, computeAdherence, getExpectedCountForDate, MAX_STATS_DAYS };

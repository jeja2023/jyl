const MedicationLog = require('../models/MedicationLog');
const MedicationPlan = require('../models/MedicationPlan');
const { Op } = require('sequelize');

const dateToStr = (d) => d.toISOString().split('T')[0];

const computeAdherence = (activeCount, logs, days, today = new Date()) => {
    const expected = activeCount * days;
    const taken = logs.length;
    const adherence = expected > 0 ? Math.round((taken / expected) * 100) : 0;

    let streak = 0;
    const base = new Date(today);
    for (let i = 0; i < days; i++) {
        const d = new Date(base.getTime() - i * 24 * 3600 * 1000);
        const ds = dateToStr(d);
        if (activeCount === 0) break;
        const dayTaken = logs.filter(l => l.date === ds).length;
        if (dayTaken >= activeCount) {
            streak += 1;
        } else {
            break;
        }
    }

    return { expected, taken, adherence, streak };
};

const calculateStats = async (userId, days = 7) => {
    const activePlans = await MedicationPlan.findAll({
        where: { UserId: userId, isActive: true }
    });

    const totalPlans = await MedicationPlan.count({ where: { UserId: userId } });
    const activeCount = activePlans.length;

    const today = new Date();
    const start = new Date(today.getTime() - (days - 1) * 24 * 3600 * 1000);

    const logs = await MedicationLog.findAll({
        where: {
            UserId: userId,
            date: {
                [Op.between]: [dateToStr(start), dateToStr(today)]
            }
        }
    });

    const { expected, taken, adherence, streak } = computeAdherence(activeCount, logs, days, today);

    return {
        days,
        totalPlans,
        activePlans: activeCount,
        expectedDoses: expected,
        takenDoses: taken,
        adherenceRate: adherence,
        streak
    };
};

module.exports = { calculateStats, computeAdherence };

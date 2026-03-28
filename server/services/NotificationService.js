const UPCOMING_MEDICATION_MINUTES = 60;
const CHECKUP_UNREAD_DAYS = 3;

const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeTime = (time) => {
    if (!time) return '00:00';
    return String(time).slice(0, 5);
};

const withTimeToday = (time, now = new Date()) => {
    const [hours = '0', minutes = '0'] = normalizeTime(time).split(':');
    const date = new Date(now);
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date;
};

const startOfDay = (date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const appendNote = (notes) => (notes ? `，${notes}` : '');

const buildMedicationNotice = (plan, now = new Date()) => {
    if (!plan || !plan.isActive) return null;

    const today = toDateKey(now);
    if (plan.lastTakenDate === today) {
        return null;
    }

    const remindAt = withTimeToday(plan.takeTime, now);
    const diffMinutes = Math.ceil((remindAt.getTime() - now.getTime()) / 60000);

    if (diffMinutes > UPCOMING_MEDICATION_MINUTES) {
        return null;
    }

    const timeText = normalizeTime(plan.takeTime);
    if (diffMinutes >= 0) {
        return {
            id: `medication_${plan.id}_${today}`,
            type: 'medication',
            title: '用药提醒',
            content: `${plan.medicineName} ${plan.dosage} 将在 ${timeText} 服用，请提前准备${appendNote(plan.notes)}`,
            createdAt: remindAt,
            remindAt,
            targetDate: remindAt,
            isRead: false,
            actionUrl: '/pages/medication/plan'
        };
    }

    return {
        id: `medication_${plan.id}_${today}`,
        type: 'medication',
        title: '待服药提醒',
        content: `今天 ${timeText} 的 ${plan.medicineName} ${plan.dosage} 还未打卡，请及时确认服药${appendNote(plan.notes)}`,
        createdAt: remindAt,
        remindAt,
        targetDate: remindAt,
        isRead: false,
        actionUrl: '/pages/medication/plan'
    };
};

const buildMedicationNotices = (plans, now = new Date()) => {
    return plans.map((plan) => buildMedicationNotice(plan, now)).filter(Boolean);
};

const buildCheckupNotice = (checkup, now = new Date()) => {
    const targetDate = new Date(`${checkup.date}T09:00:00`);
    const dayDiff = Math.floor((startOfDay(targetDate).getTime() - startOfDay(now).getTime()) / 86400000);

    return {
        id: `checkup_${checkup.id}`,
        type: 'checkup',
        title: '复查提醒',
        content: `您预约了 ${checkup.date} 的复查，请按时前往。${checkup.note ? `备注：${checkup.note}` : ''}`,
        createdAt: checkup.createdAt,
        remindAt: targetDate,
        targetDate,
        isRead: !(dayDiff >= 0 && dayDiff <= CHECKUP_UNREAD_DAYS),
        actionUrl: '/pages/checkup/calendar'
    };
};

const sortNotifications = (a, b) => {
    const aUnread = a.isRead === false ? 1 : 0;
    const bUnread = b.isRead === false ? 1 : 0;
    if (aUnread !== bUnread) {
        return bUnread - aUnread;
    }

    const aTime = new Date(a.remindAt || a.targetDate || a.createdAt || 0).getTime();
    const bTime = new Date(b.remindAt || b.targetDate || b.createdAt || 0).getTime();

    if (aUnread && bUnread) {
        return aTime - bTime;
    }

    return bTime - aTime;
};

module.exports = {
    buildCheckupNotice,
    buildMedicationNotices,
    sortNotifications,
    toDateKey
};

import http from '@/utils/request.js';
import { useUserStore } from '@/store/index.js';
import { getCache, setCache } from '@/utils/cache.js';

const CHECK_INTERVAL_MS = 60 * 1000;
const POPUP_CACHE_PREFIX = 'reminder_popup_';
const SKIP_ROUTES = new Set([
  'pages/login',
  'pages/login/index',
  'pages/notification/index',
  'pages/medication/plan',
  'pages/checkup/calendar'
]);

let timer = null;
let checking = false;
let modalVisible = false;

const getCurrentRoute = () => {
  const pages = getCurrentPages();
  if (!pages || !pages.length) return '';
  return pages[pages.length - 1].route || '';
};

const shouldSkipCurrentRoute = () => {
  const route = getCurrentRoute();
  return SKIP_ROUTES.has(route);
};

const getTodayEndTtl = () => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.max(60, Math.ceil((end.getTime() - now.getTime()) / 1000));
};

const hasShownPopup = (id) => {
  return !!getCache(`${POPUP_CACHE_PREFIX}${id}`);
};

const rememberPopup = (id) => {
  setCache(`${POPUP_CACHE_PREFIX}${id}`, true, getTodayEndTtl());
};

const parseTime = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pickDueReminder = (list) => {
  const now = Date.now();
  const candidates = (list || []).filter((item) => {
    if (!item || item.isRead) return false;
    if (!['medication', 'checkup'].includes(item.type)) return false;
    if (!item.id || hasShownPopup(item.id)) return false;

    const remindAt = parseTime(item.remindAt || item.targetDate || item.createdAt);
    if (!remindAt) return false;

    return remindAt.getTime() <= now;
  });

  candidates.sort((a, b) => {
    const aTime = parseTime(a.remindAt || a.targetDate || a.createdAt)?.getTime() || 0;
    const bTime = parseTime(b.remindAt || b.targetDate || b.createdAt)?.getTime() || 0;
    return aTime - bTime;
  });

  return candidates[0] || null;
};

const showReminderModal = (item) => {
  if (modalVisible) return;

  modalVisible = true;
  rememberPopup(item.id);

  uni.showModal({
    title: item.title || '提醒',
    content: item.content || '您有一条新的提醒',
    confirmText: '立即查看',
    cancelText: '稍后',
    success: (res) => {
      if (res.confirm && item.actionUrl) {
        uni.navigateTo({ url: item.actionUrl });
      }
    },
    complete: () => {
      modalVisible = false;
    }
  });
};

export const checkDueReminders = async () => {
  if (checking || modalVisible || shouldSkipCurrentRoute()) return;

  const userStore = useUserStore();
  if (!userStore.isLogin) return;

  checking = true;
  try {
    const res = await http.get('/api/notification/list', { params: { pageSize: 10 } });
    const item = pickDueReminder(res.list);
    if (item) {
      showReminderModal(item);
    }
  } catch (e) {
    // Quietly ignore reminder polling failures to avoid disturbing the user.
  } finally {
    checking = false;
  }
};

export const startReminderPolling = () => {
  if (timer) return;

  checkDueReminders();
  timer = setInterval(() => {
    checkDueReminders();
  }, CHECK_INTERVAL_MS);
};

export const stopReminderPolling = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};

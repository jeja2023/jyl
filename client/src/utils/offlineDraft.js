const DRAFT_PREFIX = 'jyl_draft_';
const QUEUE_KEY = 'jyl_sync_queue';

export const saveDraft = (key, data) => {
  uni.setStorageSync(DRAFT_PREFIX + key, {
    data,
    updatedAt: Date.now()
  });
};

export const loadDraft = (key) => {
  return uni.getStorageSync(DRAFT_PREFIX + key) || null;
};

export const clearDraft = (key) => {
  uni.removeStorageSync(DRAFT_PREFIX + key);
};

export const enqueueSync = (task) => {
  const queue = uni.getStorageSync(QUEUE_KEY) || [];
  queue.push({ ...task, createdAt: Date.now() });
  uni.setStorageSync(QUEUE_KEY, queue);
};

export const getSyncQueue = () => uni.getStorageSync(QUEUE_KEY) || [];

export const setSyncQueue = (queue) => {
  uni.setStorageSync(QUEUE_KEY, queue || []);
};

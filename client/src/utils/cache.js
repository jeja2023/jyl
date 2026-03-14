const CACHE_PREFIX = 'jyl_cache_';

export const setCache = (key, data, ttlSeconds = 3600) => {
  try {
    const payload = {
      data,
      expireAt: Date.now() + ttlSeconds * 1000
    };
    uni.setStorageSync(CACHE_PREFIX + key, payload);
  } catch (e) {}
};

export const getCache = (key) => {
  try {
    const payload = uni.getStorageSync(CACHE_PREFIX + key);
    if (!payload || !payload.expireAt) return null;
    if (Date.now() > payload.expireAt) return null;
    return payload.data;
  } catch (e) {
    return null;
  }
};

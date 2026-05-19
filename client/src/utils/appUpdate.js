import { getBaseURL } from './config.js';

const CHECK_INTERVAL = 6 * 60 * 60 * 1000;
const LAST_CHECK_KEY = 'jyl_app_update_last_check';
const INSTALLING_KEY = 'jyl_app_update_installing';

const semverToCode = (versionName = '') => {
  const parts = String(versionName).split('.').map((part) => parseInt(part, 10) || 0);
  return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
};

const plusReady = () => new Promise((resolve) => {
  if (typeof plus !== 'undefined') {
    resolve();
    return;
  }

  document.addEventListener('plusready', resolve, false);
});

const getAppInfo = () => new Promise((resolve, reject) => {
  plus.runtime.getProperty(plus.runtime.appid, (info) => {
    if (!info) {
      reject(new Error('Unable to read app info'));
      return;
    }

    const versionName = info.version || info.versionName || '0.0.0';
    const versionCode = parseInt(info.versionCode, 10) || semverToCode(versionName);
    resolve({ versionName, versionCode });
  });
});

const requestUpdateInfo = (url) => new Promise((resolve, reject) => {
  uni.request({
    url,
    method: 'GET',
    timeout: 8000,
    success: (res) => {
      if (res.statusCode !== 200 || res.data?.code !== 200) {
        reject(new Error('Update check failed'));
        return;
      }
      resolve(res.data.data);
    },
    fail: reject
  });
});

const downloadFile = (url, onProgress) => new Promise((resolve, reject) => {
  const task = uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && res.tempFilePath) {
        resolve(res.tempFilePath);
        return;
      }
      reject(new Error(`Download failed: ${res.statusCode}`));
    },
    fail: reject
  });

  if (task?.onProgressUpdate && typeof onProgress === 'function') {
    task.onProgressUpdate((progress) => onProgress(progress.progress || 0));
  }
});

const installWgt = (filePath) => new Promise((resolve, reject) => {
  plus.runtime.install(filePath, { force: true }, resolve, reject);
});

const shouldSkipCheck = (forceCheck) => {
  if (forceCheck) return false;

  const lastCheck = parseInt(uni.getStorageSync(LAST_CHECK_KEY), 10) || 0;
  return Date.now() - lastCheck < CHECK_INTERVAL;
};

const isTrustedUpdateUrl = (downloadUrl, baseURL) => {
  try {
    const parsed = new URL(downloadUrl);
    const base = new URL(baseURL);
    return parsed.protocol === 'https:' || parsed.origin === base.origin;
  } catch (err) {
    return false;
  }
};

export const checkAppUpdate = async ({ forceCheck = false } = {}) => {
  // #ifdef APP-PLUS
  if (shouldSkipCheck(forceCheck)) return;
  if (uni.getStorageSync(INSTALLING_KEY) === '1') return;

  try {
    await plusReady();
    uni.setStorageSync(LAST_CHECK_KEY, String(Date.now()));

    const systemInfo = uni.getSystemInfoSync();
    const platform = (systemInfo.platform || 'android').toLowerCase();
    const appInfo = await getAppInfo();
    const baseURL = getBaseURL();
    const query = [
      `platform=${encodeURIComponent(platform)}`,
      `versionName=${encodeURIComponent(appInfo.versionName)}`,
      `versionCode=${encodeURIComponent(appInfo.versionCode)}`
    ].join('&');

    const updateInfo = await requestUpdateInfo(`${baseURL}/api/app/update/check?${query}`);

    if (!updateInfo?.hasUpdate || !updateInfo.downloadUrl) return;
    if (!isTrustedUpdateUrl(updateInfo.downloadUrl, baseURL)) {
      throw new Error('Untrusted update package url');
    }

    const startUpdate = async () => {
      uni.setStorageSync(INSTALLING_KEY, '1');
      uni.showLoading({ title: '准备更新', mask: true });

      try {
        const tempFilePath = await downloadFile(updateInfo.downloadUrl, (progress) => {
          uni.showLoading({
            title: `正在更新 ${Math.min(progress, 99)}%`,
            mask: true
          });
        });

        uni.showLoading({ title: '正在安装', mask: true });
        await installWgt(tempFilePath);
        uni.removeStorageSync(INSTALLING_KEY);
        uni.hideLoading();
        plus.runtime.restart();
      } catch (err) {
        uni.removeStorageSync(INSTALLING_KEY);
        uni.hideLoading();
        uni.showToast({
          title: '更新失败，请稍后重试',
          icon: 'none'
        });
        if (import.meta.env.DEV) console.error('App update failed:', err);
      }
    };

    if (updateInfo.force) {
      uni.showModal({
        title: '发现新版本',
        content: '需要更新后继续使用',
        showCancel: false,
        confirmText: '立即更新',
        success: () => startUpdate()
      });
      return;
    }

    uni.showModal({
      title: `发现新版本 ${updateInfo.versionName || ''}`,
      content: (updateInfo.releaseNotes || []).slice(0, 3).join('\n') || '是否立即更新？',
      confirmText: '立即更新',
      cancelText: '稍后',
      success: (res) => {
        if (res.confirm) startUpdate();
      }
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('App update check skipped:', err);
  }
  // #endif
};

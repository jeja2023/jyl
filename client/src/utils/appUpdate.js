import { getBaseURL } from './config.js';

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

const getErrorMessage = (err) => {
  if (!err) return '未知错误';
  if (typeof err === 'string') return err;
  return err.message || err.errMsg || JSON.stringify(err);
};

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

/**
 * 额外允许的更新包来源（例如官方 CDN），构建时通过 VITE_UPDATE_ORIGINS 逗号分隔配置。
 * 不配置时只接受与 API 同源的地址。
 */
const EXTRA_TRUSTED_ORIGINS = String(import.meta.env.VITE_UPDATE_ORIGINS || '')
  .split(',')
  .map((item) => item.trim().toLowerCase().replace(/\/+$/, ''))
  .filter(Boolean);

// 兼容部分移动端 JS 引擎中 URL 构造函数不可用或缺失的情况，使用高鲁棒性的正则解析
const getOrigin = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return null;
  const match = urlStr.match(/^(https?:)\/\/([^/?#]+)/i);
  if (!match) return null;
  return `${match[1].toLowerCase()}//${match[2].toLowerCase()}`;
};

/**
 * 把服务端返回的包地址补成可下载的绝对地址。
 *
 * 服务端在未配置公开域名时会回传相对路径（它不再用 Host / x-forwarded-host
 * 拼绝对地址，那些头在没有可信代理时由客户端完全控制）。
 * 相对路径在这里用客户端自己构建时写入的 baseURL 补齐，天然同源。
 */
const resolveUpdateUrl = (downloadUrl, baseURL) => {
  const raw = String(downloadUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  // 只接受根相对路径，`../` 之类的相对写法一律拒绝
  if (!raw.startsWith('/')) return '';
  return `${String(baseURL || '').replace(/\/+$/, '')}${raw}`;
};

/**
 * 校验包地址来源。
 *
 * 只接受与 API 同源的地址或构建时显式配置的白名单来源。
 * 旧逻辑是"只要协议是 https 就视为可信"，那样一旦服务端被 Host 头注入，
 * 攻击者域名下的 https 安装包会直接通过校验并被 plus.runtime.install 装上。
 */
const isTrustedUpdateUrl = (resolvedUrl, baseURL) => {
  try {
    const target = getOrigin(resolvedUrl);
    if (!target) return false;

    const base = getOrigin(baseURL);
    if (base && target === base) return true;

    return EXTRA_TRUSTED_ORIGINS.includes(target);
  } catch (err) {
    return false;
  }
};

export const checkAppUpdate = async ({ forceCheck = false } = {}) => {
  // #ifdef APP-PLUS
  if (uni.getStorageSync(INSTALLING_KEY) === '1') return;

  try {
    await plusReady();

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
    const downloadUrl = resolveUpdateUrl(updateInfo.downloadUrl, baseURL);
    if (!downloadUrl || !isTrustedUpdateUrl(downloadUrl, baseURL)) {
      throw new Error('Untrusted update package url');
    }

    const startUpdate = async () => {
      uni.setStorageSync(INSTALLING_KEY, '1');
      uni.showLoading({ title: '准备更新', mask: true });

      try {
        const tempFilePath = await downloadFile(downloadUrl, (progress) => {
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
      uni.showToast({
        title: `发现新版本 ${updateInfo.versionName || ''}，正在更新`,
        icon: 'none'
      });
      startUpdate();
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
    const message = getErrorMessage(err);
    if (forceCheck) {
      uni.showToast({
        title: `更新检查失败：${message}`.slice(0, 60),
        icon: 'none'
      });
    }
    if (import.meta.env.DEV) console.warn('App update check skipped:', err);
  }
  // #endif
};

// 获取由编译端注入的全局应用版本号，作为缓存清理版本标识，默认回退至 1.8.0
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.8.0';
const PWA_CLEANUP_KEY = `jyl_pwa_cleanup_v_${appVersion}`;

/**
 * 清理历史 PWA 残留缓存与服务工作线程，确保新发布的前端版本立刻生效
 */
export const cleanupPwaCache = async () => {
  // #ifdef H5
  if (typeof window === 'undefined') return;
  
  // 若当前版本已完成清理，则不再重复执行，避免循环刷新
  if (window.localStorage?.getItem(PWA_CLEANUP_KEY) === 'done') return;

  try {
    // 1. 清理浏览器 Cache Storage 中的所有旧静态资源缓存
    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }

    // 2. 卸载所有已注册的 Service Worker 实例
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    // 清理旧版本可能残留的 localStorage 清理标识，防止垃圾数据堆积
    if (window.localStorage) {
      const keysToRemove = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('jyl_pwa_cleanup_') && key !== PWA_CLEANUP_KEY) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    }

    // 3. 标记当前版本的清理工作已完成
    window.localStorage?.setItem(PWA_CLEANUP_KEY, 'done');
    
    // 4. 如果当前有正在控制页面的 Service Worker，或刚刚完成重置，强刷页面以获取服务器最新资源
    if (navigator.serviceWorker?.controller || window.caches) {
      window.location.reload();
    }
  } catch (e) {
    // 异常捕获，避免清理过程崩溃影响页面加载
    console.warn('清理 PWA 缓存失败:', e);
  }
  // #endif
};

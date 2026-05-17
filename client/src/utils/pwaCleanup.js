const PWA_CLEANUP_KEY = 'jyl_pwa_cleanup_v2';

export const cleanupPwaCache = async () => {
  // #ifdef H5
  if (typeof window === 'undefined') return;
  if (window.localStorage?.getItem(PWA_CLEANUP_KEY) === 'done') return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    }

    window.localStorage?.setItem(PWA_CLEANUP_KEY, 'done');
    if (navigator.serviceWorker?.controller) {
      window.location.reload();
    }
  } catch (e) {
    console.warn('PWA cleanup failed:', e);
  }
  // #endif
};

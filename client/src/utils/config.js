/**
 * 获取 API 基础路径
 * 兼容 H5 生产环境、本地环境及小程序/App 环境
 */
export const getBaseURL = () => {
    let baseURL = import.meta.env.VITE_API_BASE || '';

    // #ifdef H5
    const { protocol, hostname, origin } = window.location;
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);

    if (isLocalhost) {
        return 'http://localhost:3000';
    }

    if (!baseURL) {
        if (import.meta.env.DEV) {
            baseURL = `${protocol}//${hostname}:3000`;
        } else {
            baseURL = origin;
        }
    }
    // #endif

    if (!baseURL) {
        baseURL = 'http://localhost:3000';
    }
    
    return baseURL;
};

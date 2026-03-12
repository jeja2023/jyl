/**
 * 获取 API 基础路径
 * 兼容 H5 生产环境、本地环境及小程序/App 环境
 */
export const getBaseURL = () => {
    // 优先使用构建时手动注入的环境变量
    let baseURL = import.meta.env.VITE_API_BASE || '';
    
    // 如果没有环境变量，且在 H5 环境下，根据当前域名自动判定
    // #ifdef H5
    if (!baseURL) {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            baseURL = 'http://localhost:3000';
        } else {
            // 生产环境：使用当前页面的域名
            baseURL = window.location.origin;
        }
    }
    // #endif
    
    // 如果是 App/小程序且没有配置环境变量，则回退到开发环境地址（提醒开发者配置）
    if (!baseURL) {
        baseURL = 'http://localhost:3000';
    }
    
    return baseURL;
};

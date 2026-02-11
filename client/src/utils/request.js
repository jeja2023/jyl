import Request from 'luch-request';
import { useUserStore } from '@/store/index.js';

const http = new Request();

/**
 * 自动获取基础URL
 */
const getBaseURL = () => {
    // 默认开发环境地址
    let baseURL = 'http://localhost:3000';

    // #ifdef H5
    // H5环境下优先根据当前域名动态调整，解决局域网真机调试问题
    if (typeof window !== 'undefined' && window.location.hostname) {
        const { hostname, protocol } = window.location;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            baseURL = `${protocol}//${hostname}:3000`;
        }
    }
    // #endif

    return baseURL;
};

/* config */
http.setConfig((config) => {
    config.baseURL = getBaseURL();
    config.timeout = 15000; // OCR请求可能较慢，增加超时时间
    return config;
});

/* request interceptor */
http.interceptors.request.use((config) => {
    // 设置请求头
    config.header = {
        ...config.header,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    // 注入 JWT Token
    const userStore = useUserStore();
    if (userStore.token) {
        config.header.Authorization = `Bearer ${userStore.token}`;
    }

    return config;
}, (config) => {
    return Promise.reject(config);
});

/* response interceptor */
http.interceptors.response.use((response) => {
    const res = response.data;

    // 统一处理后端返回的标准格式
    if (res.code === 200) {
        return res.data;
    } else {
        // 后端业务级错误提示
        if (res.message) {
            uni.showToast({
                title: res.message,
                icon: 'none',
                duration: 2000
            });
        }
        return Promise.reject(res);
    }
}, (error) => {
    // 处理 HTTP 状态码错误 (4xx, 5xx)
    const { statusCode, data } = error;

    let errMsg = '服务调用失败';

    if (statusCode === 401) {
        errMsg = '登录已失效，请重新登录';
        const userStore = useUserStore();
        userStore.logout();

        // 避免重复跳转
        const pages = getCurrentPages();
        const currentPage = pages[pages.length - 1];
        if (currentPage && currentPage.route !== 'pages/login/login') {
            setTimeout(() => {
                uni.reLaunch({ url: '/pages/login/login' });
            }, 1000);
        }
    } else if (statusCode === 403) {
        errMsg = '暂无操作权限';
    } else if (statusCode === 429) {
        errMsg = '请求过于频繁，请稍后再试';
    } else if (data && data.message) {
        errMsg = data.message;
    }

    uni.showToast({
        title: errMsg,
        icon: 'none',
        duration: 2000
    });

    return Promise.reject(error);
});

export default http;

import Request from 'luch-request';
import { useUserStore } from '@/store/index.js';

import { getBaseURL } from './config.js';

const http = new Request();

/* config */
http.setConfig((config) => {
    config.baseURL = getBaseURL();
    config.timeout = 10000;
    return config;
});

/* request interceptor */
http.interceptors.request.use((config) => {
    config.header = {
        ...config.header,
    };

    // 从 Pinia 获取 Token
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

    // 统一处理后端返回的 code
    if (res.code === 200) {
        return res.data; // 直接返回 data 部分
    } else {
        // 如果有错误消息，自动弹出提示
        if (res.message) {
            uni.showToast({
                title: res.message,
                icon: 'none'
            });
        }
        return Promise.reject(res);
    }
}, (response) => {
    // 处理 HTTP 状态码错误
    const { status, data } = response;

    // 防止多个并发请求 401 时弹出多个提示和执行多次跳转
    if (status === 401) {
        if (!window._isRedirecting) {
            window._isRedirecting = true;
            const errMsg = (data && data.message) ? data.message : '登录已过期';
            
            uni.showToast({
                title: errMsg,
                icon: 'none'
            });

            const userStore = useUserStore();
            userStore.logout();

            // 延迟跳转，让用户看清提示
            setTimeout(() => {
                window._isRedirecting = false;
                uni.reLaunch({ url: '/pages/login' });
            }, 1500);
        }
        return Promise.reject(data || 'Unauthorized');
    }

    let errMsg = '服务器异常';
    if (data && data.message) {
        errMsg = data.message;
    }

    uni.showToast({
        title: errMsg,
        icon: 'none'
    });

    return Promise.reject(data || errMsg);
});

export default http;

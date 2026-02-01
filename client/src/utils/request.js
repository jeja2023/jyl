import Request from 'luch-request';
import { useUserStore } from '@/store/index.js';

const http = new Request();

/* config */
http.setConfig((config) => {
    // 默认地址
    let baseURL = 'http://localhost:3000';

    // #ifdef H5
    //如果是H5环境，且是局域网访问，自动替换为当前Host IP
    if (window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        baseURL = `http://${window.location.hostname}:3000`;
    }
    // #endif

    config.baseURL = baseURL;
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

    let errMsg = '服务器异常';
    if (data && data.message) {
        errMsg = data.message;
    } else if (status === 401) {
        errMsg = '登录已过期';
        const userStore = useUserStore();
        userStore.logout();
        // 延迟跳转，让用户看清提示
        setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/login' });
        }, 1500);
    }

    uni.showToast({
        title: errMsg,
        icon: 'none'
    });

    return Promise.reject(data || errMsg);
});

export default http;

import { defineStore } from 'pinia';

/**
 * 用户状态管理
 * 包含用户信息、登录状态、Token 等
 */
export const useUserStore = defineStore('user', {
    state: () => {
        // 从本地存储恢复状态
        const savedToken = uni.getStorageSync('token') || '';
        const savedUserInfo = uni.getStorageSync('userInfo') || null;

        return {
            userInfo: savedUserInfo,
            token: savedToken,
            isLogin: !!savedToken
        };
    },
    actions: {
        // 设置用户信息
        setUserInfo(info) {
            this.userInfo = info;
            this.isLogin = true;
            uni.setStorageSync('userInfo', info);
        },
        // 设置 Token
        setToken(token) {
            this.token = token;
            uni.setStorageSync('token', token);
        },
        // 退出登录
        logout() {
            this.userInfo = null;
            this.token = '';
            this.isLogin = false;
            uni.removeStorageSync('token');
            uni.removeStorageSync('userInfo');
        }
    }
});

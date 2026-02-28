import http from '@/utils/request.js';

/**
 * 全局业务配置
 * 统一管理联系方式、版本号等非敏感信息
 */
const config = {
    // 默认值（当后端尚未加载完成或失败时使用）
    SUPPORT_EMAIL: 'support@jiayoule.com',
    WECHAT_SUPPORT: 'JYL_Support',
    VERSION: '1.4.0',

    /**
     * 从后端同步最新配置
     */
    async fetchSystemConfig() {
        try {
            const res = await http.get('/api/common/config');
            if (res) {
                this.SUPPORT_EMAIL = res.supportEmail || this.SUPPORT_EMAIL;
                this.WECHAT_SUPPORT = res.wechatSupport || this.WECHAT_SUPPORT;
                console.log('✅ 系统业务配置同步成功');
            }
        } catch (err) {
            console.error('❌ 系统配置同步失败，使用内置默认值', err);
        }
    }
};

export default config;

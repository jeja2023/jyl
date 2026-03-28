<script>
import config from '@/config/index.js';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { startReminderPolling, stopReminderPolling } from '@/utils/reminder.js';

export default {
  onLaunch: function () {
    // 应用启动时自动从后端获取最新业务配置
    config.fetchSystemConfig();

    // 如果存有 Token，在启动时校验有效性并同步用户信息
    const userStore = useUserStore();
    if (userStore.token) {
      http.get('/api/auth/profile').then(res => {
        userStore.setUserInfo(res);
      }).catch(err => {
        // 请求失败由 request.js 拦截器统一处理 401 跳转
        console.warn('启动时 Token 校验异常:', err);
      });
    }
  },
  onShow: function () {
    // 应用进入前台后检查到点提醒
    startReminderPolling();
  },
  onHide: function () {
    // 应用进入后台时暂停轮询
    stopReminderPolling();
  },
}
</script>

<style lang="scss">
	/* 引入 uview-plus 样式 */
	@import "uview-plus/index.scss";
	
	/* 全局公共样式 */
	page {
		background-color: #F6F8FC;
	}
	
	/* 安全区域适配 */
	.safe-area-bottom {
		padding-bottom: constant(safe-area-inset-bottom);
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>

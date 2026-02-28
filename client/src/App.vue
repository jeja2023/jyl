<script>
import config from '@/config/index.js';

export default {
  onLaunch: function () {
    // 应用启动时自动从后端获取最新业务配置
    config.fetchSystemConfig();
  },
  onShow: function () {
    // 应用进入前台
  },
  onHide: function () {
    // 应用进入后台
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

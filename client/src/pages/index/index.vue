<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { wikiArticles } from '@/utils/wiki-data.js';
import IndicatorCard from './components/IndicatorCard.vue';

const userStore = useUserStore();
const lastRecord = ref(null);
const showWikiDetail = ref(false);
const currentWiki = ref({});
const hasNotice = ref(false);

const articles = ref([]);

const fetchArticles = async () => {
    try {
        const res = await http.get('/api/wiki/list', {
            params: { page: 1, pageSize: 2 }
        });
        articles.value = res.list;
    } catch (e) {
        console.error('获取百科文章失败', e);
    }
};

const checkReminders = async () => {
  if (!userStore.isLogin) {
    hasNotice.value = false;
    return;
  }
  try {
    // 检查是否有开启中的服药计划
    const res = await http.get('/api/medication/list');
    hasNotice.value = res.some(item => item.isActive);
  } catch (err) {
    // console.error('检查提醒失败:', err);
  }
};

const fetchLastRecord = async () => {
  if (!userStore.isLogin) return;
  try {
    // 增加 hasLab 参数，由后端过滤掉纯 B 超记录，确保显示的是最后一次真实血检
    const res = await http.get('/api/record/list', { params: { limit: 1, hasLab: 1 } });
    if (res.list && res.list.length > 0) {
      lastRecord.value = res.list[0];
    } else {
      lastRecord.value = null;
    }
  } catch (err) {
    console.error(err);
  }
};

// 页面显示时刷新数据
onShow(() => {
  // 始终刷新文章
  fetchArticles();
  // 登录用户的数据并行获取
  if (userStore.isLogin) {
    Promise.all([fetchLastRecord(), checkReminders()]);
  }
});

const goToLogin = () => {
  uni.navigateTo({ url: '/pages/login/login' });
};

const navigateToAdd = () => {
  if (!userStore.isLogin) return goToLogin();
  uni.navigateTo({ url: '/pages/record/add' });
};

const goToMedication = () => {
  if (!userStore.isLogin) return goToLogin();
  uni.navigateTo({ url: '/pages/medication/plan' });
};

const goToCalendar = () => {
  if (!userStore.isLogin) return goToLogin();
  uni.navigateTo({ url: '/pages/checkup/calendar' });
};

const goToAssess = () => {
  if (!userStore.isLogin) return goToLogin();
  uni.navigateTo({ url: '/pages/assess/symptom' });
};

const goToWiki = () => {
  uni.navigateTo({ url: '/pages/wiki/list' });
};

const goToDetail = (id) => {
  if (!id) return;
  uni.navigateTo({ url: `/pages/record/detail?id=${id}` });
};

const viewDetail = async (item) => {
  uni.showLoading({ title: '加载中' });
  try {
      const res = await http.get(`/api/wiki/${item.id}`);
      currentWiki.value = res;
      showWikiDetail.value = true;
  } catch(e) {
      // 捕获异常
  } finally {
      uni.hideLoading();
  }
};

const goToNotification = () => {
    if (!userStore.isLogin) return goToLogin();
    uni.navigateTo({ url: '/pages/notification/index' });
};

// 功能开发中提示
const processRecordClick = () => {
    if (lastRecord.value) {
        goToDetail(lastRecord.value.id);
    } else {
        navigateToAdd();
    }
};

onMounted(() => {
  // 首次加载时 onShow 会触发，这里不需要重复调用
});
</script>

<template>
  <view class="home-container">
    <!-- 顶部状态栏 - 增加安全区适配 -->
    <view class="premium-header">
      <view class="status-bar-placeholder"></view>
      
      <!-- 背景品牌水印 -->
      <view class="brand-watermark">甲友乐</view>

      <view class="content-box">
        <view class="user-section" v-if="userStore.isLogin">
          <view class="avatar-box">
             <u-avatar :text="userStore.userInfo && userStore.userInfo.nickname ? userStore.userInfo.nickname.substring(0,1) : '友'" fontSize="20" bg-color="#ffffff" color="#3E7BFF" size="48"></u-avatar>
          </view>
          <view class="text-info">
            <view class="welcome-box">
               <text class="greeting">你好, {{ userStore.userInfo ? userStore.userInfo.nickname : '甲友' }}</text>
               <view class="status-dot pulsed"></view>
            </view>
          </view>
        </view>
        <view class="user-section" v-else @click="goToLogin">
          <view class="avatar-box bg-placeholder">
             <u-icon name="account-fill" size="24" color="rgba(255,255,255,0.8)"></u-icon>
          </view>
          <view class="text-info">
            <text class="greeting">点击登录</text>
            <text class="subtitle">开启健康之旅</text>
          </view>
        </view>
        <view class="action-icons">
           <view class="icon-circle" @click="goToNotification">
              <u-icon name="bell" size="22" color="#fff"></u-icon>
              <view class="red-dot" v-if="hasNotice"></view>
           </view>
        </view>
      </view>
    </view>

    <view class="main-body">

      <!-- 核心指标卡片 -->
      <IndicatorCard 
        :record="lastRecord" 
        @click="processRecordClick" 
        @add="navigateToAdd"
      />

      <!-- 磁贴式快捷入口 -->
      <view class="shortcut-grid">
         <view class="grid-card" @click="navigateToAdd">
            <view class="icon-bg blue-gradient"><u-icon name="edit-pen" color="#fff" size="24"></u-icon></view>
            <text>指标录入</text>
         </view>
         <view class="grid-card" @click="goToMedication">
            <view class="icon-bg orange-gradient"><u-icon name="bell-fill" color="#fff" size="24"></u-icon></view>
            <text>用药提醒</text>
         </view>
         <view class="grid-card" @click="goToCalendar">
            <view class="icon-bg green-gradient"><u-icon name="calendar-fill" color="#fff" size="24"></u-icon></view>
            <text>复查日历</text>
         </view>
         <view class="grid-card" @click="goToAssess">
            <view class="icon-bg purple-gradient"><u-icon name="eye-fill" color="#fff" size="24"></u-icon></view>
            <text>症状自测</text>
         </view>
      </view>

      <!-- 健康百科 - 采用卡片流设计 -->
      <view class="section-title">
        <text>甲友百科</text>
        <view class="more-btn" @click="goToWiki">
          <text>更多</text>
          <u-icon name="arrow-right" size="12"></u-icon>
        </view>
      </view>

      <view class="article-track">
        <view class="article-card" v-for="(item, index) in articles.slice(0, 2)" :key="index" @click="viewDetail(item)">
          <image v-if="item.cover" :src="item.cover" mode="aspectFill" class="article-img"></image>
          <view v-else class="article-img placeholder">
             <u-icon name="image" size="30" color="#E5E6EB"></u-icon>
          </view>
          
          <view class="article-content">
            <text class="a-title">{{ item.title }}</text>
            <text class="a-summary">{{ item.summary }}</text>
            <view class="a-footer">
               <view class="a-tag">{{ item.category }}</view>
               <text class="a-read">{{ item.views > 1000 ? (item.views/1000).toFixed(1) + 'k' : item.views }}+ 阅读</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 文章详情弹窗 -->
      <u-popup :show="showWikiDetail" mode="bottom" round="20" @close="showWikiDetail = false" :closeOnClickOverlay="true">
        <view class="detail-popup">
          <view class="detail-header">
            <view class="detail-title">{{ currentWiki.title }}</view>
            <u-icon name="close" size="24" color="#86909C" @click="showWikiDetail = false"></u-icon>
          </view>
          <scroll-view scroll-y="true" class="detail-content-scroll">
            <view class="detail-meta">
              <view class="tag">{{ currentWiki.category || '科普' }}</view>
              <text class="date">{{ currentWiki.createdAt ? new Date(currentWiki.createdAt).toLocaleDateString() : '' }}</text>
            </view>
            <view class="detail-body">
                <u-parse :content="currentWiki.content"></u-parse>
            </view>
            <view class="disclaimer">
              <u-icon name="info-circle" size="14" color="#C9CDD4"></u-icon>
              <text>本内容仅供科普参考，不能替代医生诊断</text>
            </view>
          </scroll-view>
        </view>
      </u-popup>
    </view>
  </view>
</template>

<style lang="scss" scoped>
/* 页面基础背景 */
page {
  background: #F8FAFF;
}

.home-container {
  background: #F8FAFF;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding-bottom: calc(env(safe-area-inset-bottom) + 120rpx);
}

/* 顶部品牌区域 */
.premium-header {
  height: 380rpx;
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
  position: relative;
  padding: 0 40rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0 0 60rpx 60rpx;
  box-shadow: 0 10rpx 30rpx rgba(62, 123, 255, 0.2);
  
  &::before {
    content: '';
    position: absolute;
    top: -150rpx;
    right: -100rpx;
    width: 450rpx;
    height: 450rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -80rpx;
    left: -40rpx;
    width: 280rpx;
    height: 280rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    border-radius: 50%;
  }
  
  .status-bar-placeholder {
    height: var(--status-bar-height);
    width: 100%;
  }

  .brand-watermark {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 140rpx;
    font-size: 140rpx;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.05);
    pointer-events: none;
    z-index: 1;
    letter-spacing: 30rpx;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .content-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 10;
    margin-top: 40rpx;
  }
  
  .user-section {
    display: flex;
    align-items: center;
    
    .avatar-box {
      width: 110rpx;
      height: 110rpx;
      border: 4rpx solid rgba(255,255,255,0.8);
      border-radius: 50%;
      margin-right: 28rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 12rpx 32rpx rgba(0,0,0,0.2);
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(10rpx);

      &.bg-placeholder {
        background: rgba(255,255,255,0.3);
      }
    }
    
    .text-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;

      .greeting {
        font-size: 38rpx;
        font-weight: 800;
        color: #FFFFFF;
        text-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);
        margin-bottom: 4rpx;
      }
      
      .subtitle {
        font-size: 24rpx;
        color: rgba(255,255,255,0.7);
        font-weight: 400;
      }
    }
  }
  
  .icon-circle {
    width: 90rpx;
    height: 90rpx;
    background: rgba(255,255,255,0.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    backdrop-filter: blur(15rpx);
    border: 1rpx solid rgba(255,255,255,0.3);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    
    &:active {
      transform: scale(0.9);
      background: rgba(255,255,255,0.25);
    }
    
    .red-dot {
      position: absolute;
      top: 18rpx;
      right: 18rpx;
      width: 18rpx;
      height: 18rpx;
      background: #FF5C5C;
      border: 4rpx solid #3E7BFF;
      border-radius: 50%;
      box-shadow: 0 0 10rpx rgba(255,92,92,0.8);
    }
  }
}

.disclaimer-bar {
  margin-bottom: 32rpx;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(245, 63, 63, 0.05);
}

/* 主体内容区域 */
.main-body {
  flex: 1;
  padding: 0 32rpx;
  position: relative;
  margin-top: -100rpx;
  z-index: 20;
}


/* 快捷金刚区 */
.shortcut-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 48rpx;
  padding: 10rpx 0;
  
  .grid-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    .icon-bg {
      width: 110rpx;
      height: 110rpx;
      border-radius: 38rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20rpx;
      box-shadow: 0 15rpx 30rpx rgba(0,0,0,0.1);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      
      &:active { transform: scale(0.9); }
      
      &.blue-gradient { background: linear-gradient(135deg, #6FA3FF 0%, #3E7BFF 100%); }
      &.orange-gradient { background: linear-gradient(135deg, #FFC069 0%, #FF9500 100%); }
      &.green-gradient { background: linear-gradient(135deg, #73D13D 0%, #2ED477 100%); }
      &.purple-gradient { background: linear-gradient(135deg, #B37FEB 0%, #9D68FF 100%); }
    }
    
    text {
      font-size: 26rpx;
      font-weight: 700;
      color: #4E5969;
    }
  }
}

/* 百科板块 */
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30rpx;
  padding: 0 10rpx;
  
  text { 
    font-size: 38rpx; 
    font-weight: 900; 
    color: #1D2129; 
    position: relative;
    &::after {
      content: '';
      position: absolute;
      bottom: 4rpx;
      left: 0;
      width: 100%;
      height: 12rpx;
      background: rgba(62, 123, 255, 0.15);
      z-index: -1;
    }
  }
  
  .more-btn {
    display: flex;
    align-items: center;
    font-size: 26rpx;
    color: #86909C;
    font-weight: 600;
  }
}

.article-track {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.article-card {
  background: #FFFFFF;
  border-radius: 36rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.03);
  transition: all 0.3s;
  
  &:active {
    transform: translateY(-4rpx);
    box-shadow: 0 15rpx 35rpx rgba(0,0,0,0.08);
  }
  
  .article-img {
    width: 200rpx;
    height: 160rpx;
    border-radius: 24rpx;
    margin-right: 24rpx;
    background: #F2F3F5;
    object-fit: cover;
    &.placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .article-content {
    flex: 1;
    height: 160rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    
    .a-title {
      font-size: 30rpx;
      font-weight: 800;
      color: #1D2129;
      line-height: 1.3;
    }
    
    .a-summary {
      font-size: 22rpx;
      color: #86909C;
      font-weight: 500;
    }
    
    .a-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .a-tag {
        font-size: 18rpx;
        padding: 4rpx 16rpx;
        background: #F2F7FF;
        color: #3E7BFF;
        border-radius: 40rpx;
        font-weight: 700;
      }
      .a-read {
        font-size: 20rpx;
        color: #C9CDD4;
        font-weight: 600;
      }
    }
  }
}

/* 详情弹窗 */
.detail-popup {
  background: #FFFFFF;
  border-radius: 50rpx 50rpx 0 0;
  overflow: hidden;
  max-height: 85vh;
  
  .detail-header {
    padding: 45rpx 40rpx 30rpx;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1rpx solid #F2F3F5;
    .detail-title {
      font-size: 38rpx;
      font-weight: 900;
      color: #1D2129;
      line-height: 1.4;
      flex: 1;
    }
  }
  
  .detail-content-scroll {
    padding: 30rpx 40rpx 80rpx;
    .detail-meta {
      display: flex;
      align-items: center;
      margin-bottom: 30rpx;
      .tag {
        padding: 6rpx 20rpx;
        background: #3E7BFF;
        color: #FFF;
        font-size: 22rpx;
        border-radius: 50rpx;
        font-weight: 700;
        margin-right: 20rpx;
      }
      .date { font-size: 24rpx; color: #86909C; }
    }
    .detail-body { font-size: 32rpx; line-height: 1.8; color: #4E5969; }
    .disclaimer {
      margin-top: 40rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10rpx;
      font-size: 24rpx;
      color: #C9CDD4;
    }
  }
}

/* 颜色工具 */
.color-gray { color: #C9CDD4 !important; }
.color-success { color: #00B42A !important; }
.color-warning { color: #FF7D00 !important; }
.color-error { color: #F53F3F !important; }

.color-success-bg { background: linear-gradient(135deg, rgba(74, 230, 138, 0.12) 0%, rgba(74, 230, 138, 0.08) 100%); color: #2ED477; }
.color-warning-bg { background: #FFF7E8; color: #FF7D00; }
.color-error-bg { background: #FFECE8; color: #F53F3F; }
.gray-bg { background: #F2F3F8; color: #86909C; }

@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(74, 230, 138, 0.4); }
  70% { box-shadow: 0 0 0 15rpx rgba(74, 230, 138, 0); }
  100% { box-shadow: 0 0 0 0 rgba(74, 230, 138, 0); }
}

@keyframes ripple-rotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

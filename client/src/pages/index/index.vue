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
             <u-avatar :text="userStore.userInfo.nickname.substring(0,1)" fontSize="20" bg-color="#ffffff" color="#3E7BFF" size="48"></u-avatar>
          </view>
          <view class="text-info">
            <view class="welcome-box">
               <text class="greeting">你好, {{ userStore.userInfo.nickname }}</text>
               <view class="status-dot pulsed"></view>
            </view>
            <view class="badge">{{ userStore.userInfo.patientType }}</view>
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
           <view class="icon-circle" @click="goToMedication">
              <u-icon name="bell" size="22" color="#fff"></u-icon>
              <view class="red-dot"></view>
           </view>
        </view>
      </view>
    </view>

    <view class="main-body">
      <!-- 核心指标卡片 -->
      <view class="premium-card indicator-card">
        <view class="card-header">
          <view class="title-row">
            <u-icon name="order" size="20" color="#3E7BFF"></u-icon>
            <text class="label">最近一次化验记录</text>
          </view>
          <view class="header-right" @click="navigateToAdd">
            <text class="empty-link">去记录化验单</text>
            <u-icon name="arrow-right" size="12" color="#3E7BFF"></u-icon>
          </view>
        </view>
        
        <view class="indicator-values" v-if="lastRecord">
          <view class="v-item">
            <text class="v-label">TSH</text>
            <view class="v-main">
               <text class="v-num" :class="getTshColor(lastRecord.TSH)">{{ lastRecord.TSH || '-' }}</text>
               <text class="v-unit">mIU/L</text>
            </view>
            <view class="v-tag" :class="getTshColor(lastRecord.TSH) + '-bg'">{{ getTshStatus(lastRecord.TSH) }}</view>
          </view>
          <view class="v-divider"></view>
          <view class="v-item">
            <text class="v-label">FT4</text>
            <view class="v-main">
               <text class="v-num">{{ lastRecord.FT4 || '-' }}</text>
               <text class="v-unit">pmol/L</text>
            </view>
            <view class="v-tag gray-bg">{{ getFt4Status(lastRecord.FT4) }}</view>
          </view>
          <view class="v-item">
            <text class="v-label">FT3</text>
            <view class="v-main">
               <text class="v-num">{{ lastRecord.FT3 || '-' }}</text>
               <text class="v-unit">pmol/L</text>
            </view>
            <view class="v-tag gray-bg">{{ getFt3Status(lastRecord.FT3) }}</view>
          </view>
        </view>
        
        <view class="empty-box" v-else @click="navigateToAdd">
          <view class="plus-anim-box">
             <view class="circle-btn">
                <u-icon name="plus" color="#3E7BFF" size="26"></u-icon>
             </view>
             <view class="ripple"></view>
          </view>
          <text class="tip">还没有数据，点击录入第一份化验单</text>
        </view>
      </view>

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
          <image :src="item.cover" mode="aspectFill" class="article-img"></image>
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
              <text class="date">2024-01-20</text>
            </view>
            <view class="detail-body" v-html="currentWiki.content"></view>
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

<style>
/* 页面基础样式 */
page {
  min-height: 100%;
  background: linear-gradient(180deg, #F0F5FF 0%, #F6F8FC 30%);
}
</style>

<script setup>
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { wikiArticles } from '@/utils/wiki-data.js';

const userStore = useUserStore();
const lastRecord = ref(null);
const showWikiDetail = ref(false);
const currentWiki = ref({});

const articles = wikiArticles;

const fetchLastRecord = async () => {
  if (!userStore.isLogin) return;
  try {
    const res = await http.get('/api/record/list', { params: { limit: 1 } });
    if (res.list && res.list.length > 0) {
      lastRecord.value = res.list[0];
    }
  } catch (err) {
    console.error(err);
  }
};

import { onShow } from '@dcloudio/uni-app';
onShow(() => {
  if (userStore.isLogin) {
    fetchLastRecord();
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

const viewDetail = (item) => {
  currentWiki.value = item;
  showWikiDetail.value = true;
};

// 功能开发中提示
const showTip = (msg) => {
  uni.$u.toast(msg);
};

const getTshColor = (tsh) => {
  if (!tsh) return 'color-gray';
  if (tsh > 4.2) return 'color-error';
  if (tsh < 0.27) return 'color-warning';
  return 'color-success';
};

const getTshStatus = (tsh) => {
  if (!tsh) return '未录入';
  if (tsh > 4.2) return '偏高';
  if (tsh < 0.27) return '偏低';
  return '正常';
};

// FT4 正常范围：12-22 pmol/L
const getFt4Status = (ft4) => {
  if (!ft4) return '未录入';
  if (ft4 > 22) return '偏高';
  if (ft4 < 12) return '偏低';
  return '正常';
};

// FT3 正常范围：3.1-6.8 pmol/L
const getFt3Status = (ft3) => {
  if (!ft3) return '未录入';
  if (ft3 > 6.8) return '偏高';
  if (ft3 < 3.1) return '偏低';
  return '正常';
};

onMounted(() => {
  fetchLastRecord();
});
</script>

<style lang="scss" scoped>
.home-container {
  background: linear-gradient(180deg, #F0F5FF 0%, #F6F8FC 30%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding-bottom: calc(env(safe-area-inset-bottom) + 120rpx);
}

.premium-header {
  height: 280rpx;
  background: linear-gradient(145deg, #4A89FF 0%, #3E7BFF 40%, #6FA3FF 100%);
  position: relative;
  padding: 0 36rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  // 装饰性光效
  &::before {
    content: '';
    position: absolute;
    top: -100rpx;
    right: -80rpx;
    width: 320rpx;
    height: 320rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }
  
  &::after {
    content: '';
    position: absolute;
    bottom: -50rpx;
    left: -60rpx;
    width: 200rpx;
    height: 200rpx;
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
    bottom: 50rpx;
    font-size: 120rpx;
    font-weight: 900;
    color: rgba(255, 255, 255, 0.04);
    pointer-events: none;
    z-index: 1;
    letter-spacing: 20rpx;
    white-space: nowrap;
  }

  .content-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    z-index: 10;
    margin-top: 32rpx;
  }
  
  .user-section {
    display: flex;
    align-items: center;
    
    .avatar-box {
      width: 96rpx;
      height: 96rpx;
      border: 3rpx solid rgba(255,255,255,0.5);
      border-radius: 50%;
      margin-right: 24rpx;
      @include flex-center;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.15);
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10rpx);

      &.bg-placeholder {
        background: rgba(255,255,255,0.2);
      }
    }
    
    .text-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .welcome-box {
        display: flex;
        align-items: center;
        margin-bottom: 8rpx;
      }
      
      .greeting {
        font-size: 38rpx;
        font-weight: 700;
        color: #FFFFFF;
        text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.12);
        line-height: 1.3;
        letter-spacing: 1rpx;
      }
      
      .status-dot {
        width: 12rpx;
        height: 12rpx;
        background: #4AE68A;
        border-radius: 50%;
        margin-left: 14rpx;
        box-shadow: 0 0 12rpx #4AE68A, 0 0 24rpx rgba(74, 230, 138, 0.4);
      }
      
      .pulsed {
        animation: pulse-green 2s infinite;
      }
      
      .badge {
        display: inline-flex;
        align-items: center;
        background: rgba(255,255,255,0.2);
        padding: 6rpx 18rpx;
        border-radius: 30rpx;
        font-size: 22rpx;
        color: #FFFFFF;
        backdrop-filter: blur(10rpx);
        width: fit-content;
        border: 1rpx solid rgba(255,255,255,0.25);
      }
      
      .subtitle {
        font-size: 26rpx;
        color: rgba(255,255,255,0.9);
        margin-top: 6rpx;
      }
    }
  }
  
  .icon-circle {
    width: 84rpx;
    height: 84rpx;
    background: rgba(255,255,255,0.18);
    border-radius: 50%;
    @include flex-center;
    position: relative;
    backdrop-filter: blur(10rpx);
    border: 1rpx solid rgba(255,255,255,0.2);
    transition: all 0.3s;
    
    &:active {
      transform: scale(0.92);
      background: rgba(255,255,255,0.25);
    }
    
    .red-dot {
      position: absolute;
      top: 16rpx;
      right: 16rpx;
      width: 16rpx;
      height: 16rpx;
      background: #FF5C5C;
      border: 3rpx solid rgba(255,255,255,0.9);
      border-radius: 50%;
      box-shadow: 0 2rpx 8rpx rgba(255,92,92,0.5);
    }
  }
}

.main-body {
  flex: 1;
  padding: 0 28rpx;
  position: relative;
  margin-top: -65rpx;
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.indicator-card {
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  flex-shrink: 0;
  background: #FFFFFF;
  border-radius: 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(62, 123, 255, 0.08), 0 2rpx 8rpx rgba(0,0,0,0.04);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .title-row {
      display: flex;
      align-items: center;
      
      .label {
        font-size: 30rpx;
        font-weight: 700;
        color: #1D2129;
        margin-left: 14rpx;
        letter-spacing: 1rpx;
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
      padding: 8rpx 16rpx;
      background: linear-gradient(135deg, #EEF4FF 0%, #E8F0FF 100%);
      border-radius: 30rpx;
      transition: all 0.3s;
      
      &:active {
        transform: scale(0.96);
      }
      
      .empty-link { 
        font-size: 24rpx; 
        color: #3E7BFF; 
        margin-right: 6rpx;
        font-weight: 500;
      }
    }
  }

  .indicator-values {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 16rpx 0;
    background: linear-gradient(135deg, #FAFBFF 0%, #F8FAFF 100%);
    border-radius: 20rpx;

    .v-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;

      .v-label {
        font-size: 24rpx;
        color: #86909C;
        margin-bottom: 14rpx;
        font-weight: 500;
      }

      .v-main {
        display: flex;
        align-items: baseline;
        margin-bottom: 14rpx;
        
        .v-num {
          font-size: 40rpx;
          font-weight: 800;
          color: #1D2129;
          margin-right: 6rpx;
          font-family: 'DIN Alternate', -apple-system, sans-serif;
        }
        .v-unit {
          font-size: 20rpx;
          color: #A0A8B5;
        }
      }

      .v-tag {
        font-size: 20rpx;
        padding: 6rpx 16rpx;
        border-radius: 12rpx;
        font-weight: 600;
      }
    }

    .v-divider {
      width: 2rpx;
      height: 70rpx;
      background: linear-gradient(180deg, transparent 0%, #E8EBF0 50%, transparent 100%);
    }
  }
  
  .empty-box {
    padding: 30rpx 0;
    @include flex-center;
    flex-direction: column;
    background: linear-gradient(135deg, #FAFBFF 0%, #F5F8FF 100%);
    border-radius: 20rpx;
    margin-top: 8rpx;

    .plus-anim-box {
      width: 120rpx;
      height: 120rpx;
      position: relative;
      @include flex-center;
      margin-bottom: 20rpx;

      .circle-btn {
        width: 96rpx;
        height: 96rpx;
        background: linear-gradient(145deg, #FFFFFF 0%, #F0F4FF 100%);
        border-radius: 50%;
        @include flex-center;
        z-index: 2;
        transition: all 0.3s;
        box-shadow: 0 6rpx 20rpx rgba(62, 123, 255, 0.15);
        border: 2rpx solid rgba(62, 123, 255, 0.1);
        
        &:active { 
          transform: scale(0.9); 
          box-shadow: 0 4rpx 12rpx rgba(62, 123, 255, 0.2);
        }
      }

      .ripple {
        position: absolute;
        width: 90rpx;
        height: 90rpx;
        background: rgba(62, 123, 255, 0.15);
        border-radius: 50%;
        animation: ripple 2.5s infinite;
      }
    }
    
    .tip { 
      font-size: 26rpx; 
      color: #86909C; 
      letter-spacing: 1rpx;
    }
  }
}

@keyframes ripple {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
}

.shortcut-grid {
  display: flex;
  justify-content: space-between;
  margin-bottom: 28rpx;
  flex-shrink: 0;
  
  .grid-card {
    width: 160rpx;
    @include flex-center;
    flex-direction: column;
    text-align: center;
    transition: all 0.3s;
    
    &:active {
      transform: translateY(-4rpx);
    }
    
    .icon-bg {
      width: 100rpx;
      height: 100rpx;
      border-radius: 32rpx;
      @include flex-center;
      margin-bottom: 14rpx;
      box-shadow: 0 12rpx 28rpx rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
      
      // 光泽效果
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50%;
        background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%);
        border-radius: 32rpx 32rpx 0 0;
      }
    }
    
    .blue-gradient { 
      background: linear-gradient(145deg, #5A93FF 0%, #3E7BFF 100%); 
      box-shadow: 0 12rpx 28rpx rgba(62, 123, 255, 0.35);
    }
    .orange-gradient { 
      background: linear-gradient(145deg, #FFAD33 0%, #FF9500 100%); 
      box-shadow: 0 12rpx 28rpx rgba(255, 149, 0, 0.35);
    }
    .green-gradient { 
      background: linear-gradient(145deg, #4DE89A 0%, #2ED477 100%); 
      box-shadow: 0 12rpx 28rpx rgba(46, 212, 119, 0.35);
    }
    .purple-gradient { 
      background: linear-gradient(145deg, #B380FF 0%, #9D68FF 100%); 
      box-shadow: 0 12rpx 28rpx rgba(157, 104, 255, 0.35);
    }
    
    text {
      font-size: 26rpx;
      font-weight: 600;
      color: #1D2129;
      letter-spacing: 1rpx;
    }
  }
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  flex-shrink: 0;
  
  text { 
    font-size: 32rpx; 
    font-weight: 800; 
    color: #1D2129; 
    letter-spacing: 2rpx;
  }
  
  .more-btn {
    display: flex;
    align-items: center;
    padding: 8rpx 16rpx;
    background: #F5F7FA;
    border-radius: 24rpx;
    transition: all 0.3s;
    
    &:active {
      background: #E8EBF0;
    }
    
    text { 
      font-size: 24rpx; 
      color: #86909C; 
      font-weight: 500; 
      margin-right: 4rpx; 
    }
  }
}

.article-track {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.article-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.05);
  padding: 16rpx;
  display: flex;
  align-items: center;
  min-height: 140rpx;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: all 0.3s;
  
  &:active {
    transform: scale(0.98);
    box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
  }
  
  .article-img {
    width: 180rpx;
    height: 140rpx;
    border-radius: 14rpx;
    margin-right: 20rpx;
    flex-shrink: 0;
    background: linear-gradient(135deg, #F5F7FA 0%, #E8EBF0 100%);
    object-fit: cover;
  }
  
  .article-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 140rpx;
    overflow: hidden;
    padding: 2rpx 0;
    
    .a-title {
      font-size: 26rpx;
      font-weight: 700;
      color: #1D2129;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      letter-spacing: 0.5rpx;
    }
    
    .a-summary {
      font-size: 22rpx;
      color: #86909C;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-top: 4rpx;
      line-height: 1.3;
    }
    
    .a-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      
      .a-tag {
        font-size: 18rpx;
        color: #3E7BFF;
        background: linear-gradient(135deg, #EEF4FF 0%, #E6EDFF 100%);
        padding: 4rpx 10rpx;
        border-radius: 8rpx;
        font-weight: 500;
      }
      
      .a-read { 
        font-size: 18rpx;  
        color: #B8BFC9; 
      }
    }
  }
}

// 详情弹窗样式优化
.detail-popup {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 32rpx;
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 24rpx;
    border-bottom: 1rpx solid #F2F3F5;
    
    .detail-title {
      font-size: 36rpx;
      font-weight: 700;
      color: #1D2129;
      flex: 1;
      line-height: 1.4;
      padding-right: 20rpx;
    }
  }
  
  .detail-content-scroll {
    height: 70vh; /* 设置固定高度确保滚动生效 */
    padding-top: 24rpx;
    overflow-y: scroll;
    -webkit-overflow-scrolling: touch; /* 增强iOS滚动流畅度 */
    
    .detail-meta {
      display: flex;
      align-items: center;
      margin-bottom: 24rpx;
      
      .tag {
        background: linear-gradient(135deg, #EEF4FF 0%, #E6EDFF 100%);
        color: #3E7BFF;
        padding: 8rpx 20rpx;
        border-radius: 12rpx;
        font-size: 24rpx;
        font-weight: 500;
        margin-right: 16rpx;
      }
      
      .date {
        font-size: 24rpx;
        color: #A0A8B5;
      }
    }
    
    .detail-body {
      font-size: 28rpx;
      color: #4E5969;
      line-height: 1.8;
    }
    
    .disclaimer {
      display: flex;
      align-items: center;
      margin-top: 32rpx;
      padding: 20rpx;
      background: #F8FAFC;
      border-radius: 16rpx;
      
      text {
        font-size: 24rpx;
        color: #A0A8B5;
        margin-left: 10rpx;
      }
    }
  }
}

// 颜色工具 - 优化配色
.color-error { color: #FF5C5C !important; }
.color-warning { color: #FFAD33 !important; }
.color-success { color: #4AE68A !important; }
.color-gray { color: #86909C !important; }

.color-error-bg { 
  background: linear-gradient(135deg, rgba(255, 92, 92, 0.12) 0%, rgba(255, 92, 92, 0.08) 100%); 
  color: #FF5C5C; 
}
.color-warning-bg { 
  background: linear-gradient(135deg, rgba(255, 173, 51, 0.12) 0%, rgba(255, 173, 51, 0.08) 100%); 
  color: #FFAD33; 
}
.color-success-bg { 
  background: linear-gradient(135deg, rgba(74, 230, 138, 0.12) 0%, rgba(74, 230, 138, 0.08) 100%); 
  color: #2ED477; 
}
.color-gray-bg { background: #F2F3F8; color: #86909C; }
.gray-bg { background: #F2F3F8; color: #86909C; }

@keyframes pulse-green {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 230, 138, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 12rpx rgba(74, 230, 138, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 230, 138, 0); }
}
</style>

<template>
  <view class="admin-page">
    <!-- 顶部背景装饰 -->
    <view class="top-bg"></view>
    
    <u-navbar 
      title="系统管理" 
      :autoBack="true" 
      placeholder 
      bgColor="transparent"
      titleStyle="font-weight: 800; color: #1D2129;"
    ></u-navbar>
    
    <view class="admin-container">
      <!-- 统计看板 -->
      <view class="stats-board">
        <view class="stats-item">
          <text class="num">{{ stats.userCount }}</text>
          <text class="label">总用户数</text>
        </view>
        <view class="divider"></view>
        <view class="stats-item">
          <text class="num">{{ stats.logCount }}</text>
          <text class="label">今日日志</text>
        </view>
      </view>

      <!-- 功能菜单卡片 -->
      <view class="menu-card">
        <view class="menu-group-title">管理核心</view>
        <view class="menu-item" @click="navTo('/pages/admin/users')">
          <view class="menu-icon blue-gradient">
            <u-icon name="account" size="20" color="#FFFFFF"></u-icon>
          </view>
          <text class="menu-title">用户管理</text>
          <u-icon name="arrow-right" size="16" color="#C9CDD4"></u-icon>
        </view>
        
        <view class="menu-item" @click="navTo('/pages/admin/logs')">
          <view class="menu-icon orange-gradient">
            <u-icon name="order" size="20" color="#FFFFFF"></u-icon>
          </view>
          <text class="menu-title">操作日志</text>
          <u-icon name="arrow-right" size="16" color="#C9CDD4"></u-icon>
        </view>

        <view class="menu-group-title">内容运维</view>
        <view class="menu-item" @click="navTo('/pages/wiki/list')">
          <view class="menu-icon green-gradient">
            <u-icon name="list-dot" size="20" color="#FFFFFF"></u-icon>
          </view>
          <text class="menu-title">百科文章管理</text>
          <u-icon name="arrow-right" size="16" color="#C9CDD4"></u-icon>
        </view>
      </view>

      <!-- 底部版权或版本 -->
      <view class="admin-footer">
        <text>JYL 管理后台</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '@/utils/request.js';

const stats = ref({
  userCount: '-',
  logCount: '-'
});

const navTo = (url) => {
  uni.navigateTo({ url });
};

const fetchStats = async () => {
  try {
    const usersRes = await http.get('/api/admin/users', { page: 1, pageSize: 1 });
    const logsRes = await http.get('/api/admin/logs', { page: 1, pageSize: 1 });
    stats.value.userCount = usersRes.total || 0;
    stats.value.logCount = logsRes.total || 0;
  } catch (err) {
    console.error('获取管理统计失败', err);
  }
};

onMounted(() => {
  fetchStats();
});
</script>

<style lang="scss" scoped>
.admin-page {
  min-height: 100vh;
  background-color: #F8FAFF;
  position: relative;
}

.top-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 360rpx;
  background: linear-gradient(135deg, #EEF4FF 0%, #E0E9FF 100%);
  border-radius: 0 0 80rpx 80rpx;
  z-index: 0;
}

.admin-container {
  position: relative;
  z-index: 1;
  padding: 20rpx 32rpx;
}

// 统计看板
.stats-board {
  margin: 20rpx 0 40rpx;
  display: flex;
  justify-content: space-around;
  padding: 40rpx 30rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 15rpx 35rpx rgba(62, 123, 255, 0.08);
  
  .stats-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    .num {
      font-size: 44rpx;
      font-weight: 900;
      color: #3E7BFF;
      margin-bottom: 8rpx;
    }
    .label {
      font-size: 24rpx;
      color: #86909C;
      font-weight: 600;
    }
  }
  .divider {
    width: 2rpx;
    height: 50rpx;
    background: #F2F3F5;
    align-self: center;
  }
}

// 菜单卡片
.menu-card {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 20rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.02);
  
  .menu-group-title {
    font-size: 24rpx;
    font-weight: 700;
    color: #C9CDD4;
    padding: 20rpx 24rpx 10rpx;
    letter-spacing: 2rpx;
  }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-radius: 24rpx;
  transition: all 0.2s;
  
  &:active {
    background: #F8FAFF;
  }
  
  .menu-icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.05);
    
    &.blue-gradient { background: linear-gradient(135deg, #6FA3FF 0%, #3E7BFF 100%); }
    &.orange-gradient { background: linear-gradient(135deg, #FFC069 0%, #FF9500 100%); }
    &.green-gradient { background: linear-gradient(135deg, #73D13D 0%, #2ED477 100%); }
  }
  
  .menu-title {
    flex: 1;
    margin-left: 28rpx;
    font-size: 32rpx;
    font-weight: 700;
    color: #1D2129;
  }
}

.admin-footer {
  text-align: center;
  margin-top: 80rpx;
  font-size: 22rpx;
  color: #C9CDD4;
}
</style>

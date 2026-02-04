<template>
  <view class="my-page">
    <!-- 顶部背景装饰 -->
    <view class="top-bg"></view>
    
    <!-- 用户信息区域 -->
    <view class="user-section">
      <view class="avatar-wrapper">
        <u-avatar :src="userInfo?.avatar" size="72" shape="circle" :text="avatarText"></u-avatar>
      </view>
      <view class="user-info">
        <text class="nickname">{{ displayName }}</text>
        <text class="phone">{{ maskedPhone }}</text>
      </view>
      <view class="edit-btn" @click="goProfile">
        <u-icon name="edit-pen" size="16" color="#3E7BFF"></u-icon>
      </view>
    </view>

    <!-- 统计信息看板 -->
    <view class="stats-board">
      <view class="stats-item">
        <text class="num">12</text>
        <text class="label">记录天数</text>
      </view>
      <view class="divider"></view>
      <view class="stats-item">
        <text class="num">5</text>
        <text class="label">化验份数</text>
      </view>
      <view class="divider"></view>
      <view class="stats-item">
        <text class="num">28</text>
        <text class="label">百科阅读</text>
      </view>
    </view>

    <!-- 疾病类型标签 -->
    <view class="type-badge" v-if="userInfo?.patientType && userInfo.patientType !== '其他'">
      <u-icon name="heart-fill" size="18" color="#FFFFFF"></u-icon>
      <text>{{ userInfo.patientType }}</text>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-card">
      <view class="menu-item" @click="goProfile">
        <view class="menu-icon" style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);">
          <u-icon name="account" size="20" color="#FFFFFF"></u-icon>
        </view>
        <text class="menu-title">个人信息</text>
        <u-icon name="arrow-right" size="16" color="#C9CDD4"></u-icon>
      </view>
      
      <view class="menu-item" @click="goSettings">
        <view class="menu-icon" style="background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);">
          <u-icon name="setting" size="20" color="#FFFFFF"></u-icon>
        </view>
        <text class="menu-title">账号设置</text>
        <u-icon name="arrow-right" size="16" color="#C9CDD4"></u-icon>
      </view>
      
      <view class="menu-item" @click="goAbout">
        <view class="menu-icon" style="background: linear-gradient(135deg, #10B981 0%, #34D399 100%);">
          <u-icon name="info-circle" size="20" color="#FFFFFF"></u-icon>
        </view>
        <text class="menu-title">关于甲友乐</text>
        <u-icon name="arrow-right" size="16" color="#C9CDD4"></u-icon>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @click="handleLogout">
      <text>退出登录</text>
    </view>
    
    <!-- 版本信息 -->
    <view class="version-info">
      <text>甲友乐 v1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { useUserStore } from '@/store/index.js';

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

// 显示名称：优先昵称，其次手机号后4位
const displayName = computed(() => {
  if (userInfo.value?.nickname) return userInfo.value.nickname;
  if (userInfo.value?.phone) return `甲友${userInfo.value.phone.slice(-4)}`;
  return '未登录';
});

// 头像文字（无头像时显示）
const avatarText = computed(() => {
  return displayName.value.slice(0, 1);
});

// 手机号脱敏 138****1234
const maskedPhone = computed(() => {
  const phone = userInfo.value?.phone;
  if (!phone) return '未绑定手机';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
});

const goProfile = () => {
  uni.navigateTo({ url: '/pages/my/profile' });
};

const goSettings = () => {
  uni.navigateTo({ url: '/pages/my/settings' });
};

const goAbout = () => {
  uni.navigateTo({ url: '/pages/my/about' });
};

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    success: function (res) {
      if (res.confirm) {
        userStore.logout();
        uni.reLaunch({
          url: '/pages/login/login'
        });
      }
    }
  });
};
</script>

<style lang="scss" scoped>
.my-page {
  min-height: 100vh;
  background-color: #F8FAFF;
  padding-bottom: calc(env(safe-area-inset-bottom) + 120rpx);
}

// 顶部背景装饰升级 - 更加沉浸
.top-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 480rpx;
  background: linear-gradient(135deg, #EEF4FF 0%, #E0E9FF 100%);
  border-radius: 0 0 100rpx 100rpx;
  &::before {
    content: '';
    position: absolute;
    top: -50rpx;
    right: -50rpx;
    width: 300rpx;
    height: 300rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%);
    border-radius: 50%;
  }
}

// 用户信息区域升级
.user-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx 40rpx;
  
  .avatar-wrapper {
    position: relative;
    padding: 10rpx;
    background: #FFFFFF;
    border-radius: 50%;
    box-shadow: 0 15rpx 35rpx rgba(62, 123, 255, 0.15);
    margin-bottom: 24rpx;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 15rpx;
      right: 15rpx;
      width: 28rpx;
      height: 28rpx;
      background: #4AE68A;
      border-radius: 50%;
      border: 6rpx solid #FFFFFF;
      box-shadow: 0 0 10rpx rgba(74, 230, 138, 0.5);
    }
  }
  
  .user-info {
    text-align: center;
    
    .nickname {
      display: block;
      font-size: 44rpx;
      font-weight: 900;
      color: #1D2129;
      margin-bottom: 12rpx;
      letter-spacing: 1rpx;
    }
    
    .phone {
      font-size: 26rpx;
      color: #86909C;
      background: rgba(255, 255, 255, 0.5);
      padding: 4rpx 20rpx;
      border-radius: 30rpx;
      font-weight: 600;
    }
  }
  
  .edit-btn {
    position: absolute;
    top: 100rpx;
    right: 40rpx;
    width: 80rpx;
    height: 80rpx;
    background: #FFFFFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.05);
    transition: all 0.3s;
    &:active { transform: scale(0.9); }
  }
}

// 统计信息看板
.stats-board {
  position: relative;
  margin: 0 40rpx 40rpx;
  display: flex;
  justify-content: space-around;
  padding: 30rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(62, 123, 255, 0.05);
  
  .stats-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    .num {
      font-size: 36rpx;
      font-weight: 900;
      color: #1D2129;
      margin-bottom: 4rpx;
    }
    .label {
      font-size: 22rpx;
      color: #86909C;
      font-weight: 600;
    }
  }
  .divider {
    width: 2rpx;
    height: 40rpx;
    background: #F2F3F5;
    align-self: center;
  }
}

// 疾病类型标签升级
.type-badge {
  position: relative;
  margin: 0 40rpx 40rpx;
  padding: 20rpx 32rpx;
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 10rpx 25rpx rgba(62, 123, 255, 0.2);
  
  text {
    font-size: 28rpx;
    color: #FFFFFF;
    margin-left: 16rpx;
    font-weight: 700;
  }
}

// 功能菜单卡片升级
.menu-card {
  position: relative;
  margin: 0 32rpx;
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 20rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.02);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 24rpx;
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
    box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.05);
  }
  
  .menu-title {
    flex: 1;
    margin-left: 28rpx;
    font-size: 32rpx;
    font-weight: 700;
    color: #1D2129;
  }
}

// 退出登录按钮美化
.logout-btn {
  margin: 60rpx 32rpx 0;
  padding: 32rpx;
  background: #FFF7F7;
  border-radius: 24rpx;
  text-align: center;
  border: 1px solid #FFEBEB;
  
  text {
    font-size: 32rpx;
    color: #F53F3F;
    font-weight: 800;
  }
  
  &:active {
    background: #FFECEC;
  }
}

// 版本信息
.version-info {
  text-align: center;
  margin-top: 60rpx;
  padding-bottom: 40rpx;
  
  text {
    font-size: 24rpx;
    color: #C9CDD4;
    font-weight: 500;
  }
}
</style>

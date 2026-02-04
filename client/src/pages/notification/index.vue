<template>
  <view class="notification-page">
    <u-navbar title="消息中心" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="msg-list">
      <view class="msg-item" v-for="(item, index) in list" :key="item.id || index">
        <view class="icon-box" :class="item.type">
          <!-- 系统通知图标 -->
          <u-icon v-if="item.type === 'system'" name="volume-fill" color="#fff" size="24"></u-icon>
          <!-- 复查提醒图标 -->
          <u-icon v-else-if="item.type === 'checkup'" name="calendar-fill" color="#fff" size="24"></u-icon>
          <!-- 默认图标 -->
          <u-icon v-else name="bell-fill" color="#fff" size="24"></u-icon>
        </view>
        <view class="content">
          <view class="header">
            <text class="title">{{ item.title }}</text>
            <text class="time">{{ formatTime(item.createdAt) }}</text>
          </view>
          <text class="desc">{{ item.content }}</text>
        </view>
      </view>
      
      <u-empty v-if="list.length === 0" mode="message" text="暂无消息" marginTop="100"></u-empty>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const list = ref([]);

const fetchList = async () => {
  try {
    const res = await http.get('/api/notification/list');
    list.value = res || [];
  } catch (e) {
    console.error(e);
  }
};

const formatTime = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  const now = new Date();
  const diff = now - date;
  
  // 1小时内
  if (diff < 3600000) {
    return '刚刚';
  }
  // 24小时内
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  // 昨天
  if (diff < 172800000) {
    return '昨天';
  }
  // 日期
  return `${date.getMonth() + 1}-${date.getDate()}`;
};

onShow(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
.notification-page {
  min-height: 100vh;
  background-color: #F8FAFF;
}

.msg-list {
  padding: 20rpx;
}

.msg-item {
  display: flex;
  background: #FFFFFF;
  padding: 30rpx;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.02);
  
  .icon-box {
    width: 90rpx;
    height: 90rpx;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    flex-shrink: 0;
    
    &.system {
      background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
      box-shadow: 0 8rpx 20rpx rgba(62, 123, 255, 0.3);
    }
    
    &.checkup {
      background: linear-gradient(135deg, #FFC069 0%, #FF9500 100%);
      box-shadow: 0 8rpx 20rpx rgba(255, 149, 0, 0.3);
    }
  }
  
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8rpx;
      
      .title {
        font-size: 30rpx;
        font-weight: 700;
        color: #1D2129;
      }
      
      .time {
        font-size: 22rpx;
        color: #C9CDD4;
      }
    }
    
    .desc {
      font-size: 26rpx;
      color: #86909C;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }
  }
  
  &:active {
    background: #F8FAFF;
  }
}
</style>

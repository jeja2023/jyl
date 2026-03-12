<template>
  <view class="admin-logs">
    <u-navbar 
      title="系统审计日志" 
      :autoBack="true" 
      placeholder 
      border
      titleStyle="font-weight: 800; color: #1D2129;"
    ></u-navbar>
    
    <view class="filter-header">
      <view class="search-box">
        <u-search 
          placeholder="搜索操作人/操作描述" 
          v-model="keyword" 
          @search="onSearch" 
          @clear="onSearch"
          :show-action="false"
          bgColor="#F2F3F5"
        ></u-search>
      </view>
    </view>

    <scroll-view 
      scroll-y 
      class="list-container" 
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="log-card" v-for="log in logList" :key="log.id" @click="showDetail(log)">
        <view class="log-meta">
          <view class="user-info">
             <view class="user-avatar">{{ log.username?.slice(0,1) || '统' }}</view>
             <text class="username">{{ log.username || '系统' }}</text>
          </view>
          <text class="log-time">{{ formatTime(log.createdAt) }}</text>
        </view>
        
        <view class="log-main">
          <view class="action-tag" :class="log.status">{{ log.action }}</view>
          <text class="log-desc u-line-1">{{ log.content }}</text>
        </view>
        
        <view class="log-footer">
          <view class="footer-left">
            <u-tag :text="log.module" size="mini" plain type="info" shape="circle"></u-tag>
            <text class="ip-addr">{{ log.ip }}</text>
          </view>
          <view class="status-indicator" :class="log.status">
            <u-icon :name="log.status === 'success' ? 'checkmark-circle-fill' : 'close-circle-fill'" size="14"></u-icon>
            <text>{{ log.status === 'success' ? '执行成功' : '执行失败' }}</text>
          </view>
        </view>
      </view>
      
      <u-loadmore :status="loadStatus" marginTop="30" marginBottom="30"></u-loadmore>
      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- 详情弹窗 -->
    <u-modal :show="detailShow" title="日志审计详情" @confirm="detailShow = false" confirmColor="#3E7BFF">
      <view class="log-detail" v-if="currentLog">
        <view class="detail-section">
          <view class="detail-row">
            <text class="label">操作主体</text>
            <text class="value">{{ currentLog.username || '系统内置' }} (UID: {{ currentLog.userId || '-' }})</text>
          </view>
          <view class="detail-row">
            <text class="label">操作类型</text>
            <text class="value highlight">{{ currentLog.action }}</text>
          </view>
          <view class="detail-row">
            <text class="label">所属模块</text>
            <text class="value">{{ currentLog.module }}</text>
          </view>
          <view class="detail-row">
            <text class="label">执行时间</text>
            <text class="value">{{ formatFullTime(currentLog.createdAt) }}</text>
          </view>
          <view class="detail-row">
            <text class="label">终端 IP</text>
            <text class="value">{{ currentLog.ip }}</text>
          </view>
          <view class="detail-row vertical">
            <text class="label">详细载荷/描述</text>
            <scroll-view scroll-y class="content-payload">
              <text class="payload-text">{{ currentLog.content }}</text>
            </scroll-view>
          </view>
        </view>
      </view>
    </u-modal>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '@/utils/request.js';
import dayjs from 'dayjs';

const keyword = ref('');
const logList = ref([]);
const page = ref(1);
const loadStatus = ref('loadmore');
const refreshing = ref(false);

const detailShow = ref(false);
const currentLog = ref(null);

const fetchLogs = async (isRefresh = false) => {
  if (isRefresh) {
    page.value = 1;
    loadStatus.value = 'loadmore';
  }
  
  if (loadStatus.value === 'nomore' && !isRefresh) return;
  loadStatus.value = 'loading';

  try {
    const res = await http.get('/api/admin/logs', {
      page: page.value,
      pageSize: 20,
      username: keyword.value,
    });

    if (isRefresh) {
      logList.value = res.list;
    } else {
      logList.value = [...logList.value, ...res.list];
    }

    if (logList.value.length >= res.total) {
      loadStatus.value = 'nomore';
    } else {
      loadStatus.value = 'loadmore';
      page.value++;
    }
  } catch (err) {
    uni.$u.toast('获取日志失败');
    loadStatus.value = 'loadmore';
  } finally {
    refreshing.value = false;
  }
};

const onSearch = () => {
  fetchLogs(true);
};

const onRefresh = () => {
  refreshing.value = true;
  fetchLogs(true);
};

const loadMore = () => {
  fetchLogs();
};

const formatTime = (date) => {
  return dayjs(date).format('MM-DD HH:mm');
};

const formatFullTime = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

const showDetail = (log) => {
  currentLog.value = log;
  detailShow.value = true;
};

onMounted(() => {
  fetchLogs(true);
});
</script>

<style lang="scss" scoped>
.admin-logs {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #F8FAFF;
}

.filter-header {
  background: #FFFFFF;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #F2F3F5;
}

.list-container {
  flex: 1;
  padding: 24rpx 28rpx;
  box-sizing: border-box;
}

.log-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  padding: 28rpx 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.02);
  width: 100%;
  box-sizing: border-box;
  
  .log-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    
    .user-info {
      display: flex;
      align-items: center;
      
      .user-avatar {
        width: 40rpx;
        height: 40rpx;
        background: #F2F7FF;
        color: #3E7BFF;
        border-radius: 50%;
        font-size: 20rpx;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12rpx;
      }
      
      .username {
        font-size: 26rpx;
        color: #1D2129;
        font-weight: 700;
      }
    }
    
    .log-time {
      font-size: 22rpx;
      color: #C9CDD4;
      font-weight: 500;
    }
  }
  
  .log-main {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
    background: #F8FAFF;
    padding: 16rpx 20rpx;
    border-radius: 12rpx;
    
    .action-tag {
      font-size: 22rpx;
      padding: 2rpx 12rpx;
      border-radius: 6rpx;
      font-weight: 800;
      margin-right: 16rpx;
      flex-shrink: 0;
      
      &.success { background: #3E7BFF; color: #FFFFFF; }
      &.fail { background: #F53F3F; color: #FFFFFF; }
    }
    
    .log-desc {
      font-size: 26rpx;
      color: #4E5969;
      font-weight: 500;
    }
  }
  
  .log-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .footer-left {
      display: flex;
      align-items: center;
      gap: 16rpx;
      
      .ip-addr {
        font-size: 20rpx;
        color: #C9CDD4;
        font-weight: 400;
      }
    }
    
    .status-indicator {
      display: flex;
      align-items: center;
      font-size: 22rpx;
      font-weight: 700;
      gap: 6rpx;
      
      &.success { color: #52C41A; }
      &.fail { color: #F5222D; }
    }
  }
}

.log-detail {
  padding: 20rpx 10rpx;
  
  .detail-section {
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24rpx;
      
      .label {
        font-size: 24rpx;
        color: #86909C;
        font-weight: 500;
      }
      
      .value {
        font-size: 26rpx;
        color: #1D2129;
        font-weight: 700;
        text-align: right;
        
        &.highlight { color: #3E7BFF; }
      }
      
      &.vertical {
        flex-direction: column;
        
        .value { text-align: left; }
      }
    }
    
    .content-payload {
      margin-top: 12rpx;
      background: #F7F8FA;
      padding: 20rpx;
      border-radius: 12rpx;
      max-height: 240rpx;
      
      .payload-text {
        font-size: 24rpx;
        color: #4E5969;
        line-height: 1.6;
        word-break: break-all;
      }
    }
  }
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}
</style>

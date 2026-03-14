<template>
  <view class="history-page">
    <u-navbar title="测评详情" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="history-list" v-if="list.length > 0">
      <view class="history-card" v-for="item in list" :key="item.id" @click="viewDetail(item)">
        <view class="card-head">
          <view class="date-box">
            <u-icon name="calendar" size="16" color="#86909C"></u-icon>
            <text class="date">{{ formatDate(item.createdAt) }}</text>
          </view>
          <view class="level-tag" :class="item.resultLevel">{{ formatLevel(item.resultLevel) }}</view>
        </view>
        
        <view class="card-content">
          <view class="score-display">
            <text class="score-val">{{ item.totalScore }}</text>
            <text class="score-unit">分</text>
          </view>
          <view class="status-info">
             <view class="status-title">{{ item.activityStatus }}</view>
             <view class="tendency-text">甲亢倾向: {{ item.hyperScore }} | 甲减倾向: {{ item.hypoScore }}</view>
          </view>
        </view>
        
        <view class="card-footer">
          <text class="view-btn">查看完整分析</text>
          <u-icon name="arrow-right" size="12" color="#3E7BFF"></u-icon>
        </view>
      </view>
      
      <u-loadmore :status="loadStatus" v-if="list.length >= 10"></u-loadmore>
    </view>
    
    <view class="empty-box" v-else>
      <u-empty mode="list" text="暂无测评历史记录"></u-empty>
      <u-button text="立即去测评" type="primary" shape="circle" class="start-btn" @click="goTest"></u-button>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onReachBottom } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const goBack = () => uni.navigateBack();
const goTest = () => uni.redirectTo({ url: '/pages/assess/symptom' });

const list = ref([]);
const page = ref(1);
const limit = 20;
const total = ref(0);
const loadStatus = ref('loadmore');

const fetchHistory = async (reset = false) => {
  if (reset) {
    page.value = 1;
    list.value = [];
  }
  
  loadStatus.value = 'loading';
  try {
    const res = await http.get('/api/assess/history', {
      params: {
        limit,
        offset: (page.value - 1) * limit
      }
    });
    
    const rows = res.list || [];
    list.value = reset ? rows : [...list.value, ...rows];
    total.value = res.total || 0;
    
    if (list.value.length >= total.value) {
      loadStatus.value = 'nomore';
    } else {
      loadStatus.value = 'loadmore';
    }
  } catch (e) {
    loadStatus.value = 'loadmore';
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatLevel = (level) => {
  const map = { normal: '状态良好', mild: '轻度风险', moderate: '中度风险', severe: '高度预警' };
  return map[level] || '未知';
};

const viewDetail = (item) => {
    uni.navigateTo({
        url: `/pages/assess/symptom?id=${item.id}`
    });
};

onMounted(() => {
  fetchHistory(true);
});

onReachBottom(() => {
  if (loadStatus.value === 'loadmore') {
    page.value++;
    fetchHistory();
  }
});
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #F6F8FC;
}

.history-list {
  padding: 32rpx;
}

.history-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(62, 123, 255, 0.05);

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .date-box {
      display: flex;
      align-items: center;
      gap: 12rpx;
      .date { font-size: 24rpx; color: #86909C; font-weight: 500; }
    }
    
    .level-tag {
      font-size: 20rpx;
      padding: 6rpx 20rpx;
      border-radius: 12rpx;
      font-weight: 800;
      
      &.normal { background: #E8FFEA; color: #00B42A; }
      &.mild { background: #E8F4FF; color: #1890FF; }
      &.moderate { background: #FFF7E8; color: #FF7D00; }
      &.severe { background: #FFECE8; color: #F53F3F; }
    }
  }

  .card-content {
    display: flex;
    align-items: center;
    gap: 30rpx;
    padding: 10rpx 0;
    
    .score-display {
      text-align: center;
      padding-right: 30rpx;
      border-right: 2rpx solid #F0F2F5;
      .score-val { font-size: 56rpx; font-weight: 900; color: #1D2129; line-height: 1; }
      .score-unit { font-size: 20rpx; color: #86909C; margin-left: 4rpx; font-weight: 600; }
    }
    
    .status-info {
      .status-title { font-size: 28rpx; font-weight: 800; color: #1D2129; margin-bottom: 8rpx; }
      .tendency-text { font-size: 22rpx; color: #86909C; font-weight: 500; }
    }
  }

  .card-footer {
    border-top: 2rpx solid #F8FAFF;
    margin-top: 24rpx;
    padding-top: 24rpx;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8rpx;
    
    .view-btn { font-size: 24rpx; color: #3E7BFF; font-weight: 700; }
  }
}

.empty-box {
  padding-top: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  .start-btn { width: 320rpx; margin-top: 60rpx; }
}
</style>

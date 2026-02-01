<template>
  <view class="list-wrapper">
    <u-navbar title="趋势追踪" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="list-header">
       <view class="stat-box">
          <text class="num">{{ list.length }}</text>
          <text class="unit">份报告</text>
       </view>
       <view class="filter-pill">
          <text>全部指标</text>
          <u-icon name="arrow-down-fill" size="10" color="#3E7BFF"></u-icon>
       </view>
    </view>

    <view class="timeline-body">
      <view class="record-item" v-for="(item, index) in list" :key="index">
        <!-- 时间轴线 -->
        <view class="line-container">
           <view class="dot" :class="{newest: index === 0}"></view>
           <view class="line" v-if="index !== list.length - 1"></view>
        </view>

        <view class="card-content">
           <view class="card-top">
              <text class="date">{{ item.recordDate }}</text>
              <view class="status-tag" :class="getTshStatus(item.TSH).type + '-bg'">
                 {{ getTshStatus(item.TSH).text }}
              </view>
           </view>

           <view class="metrics-row">
              <view class="m-box">
                 <text class="m-val">{{ item.TSH || '-' }}</text>
                 <text class="m-label">TSH</text>
              </view>
              <view class="m-box">
                 <text class="m-val">{{ item.FT4 || '-' }}</text>
                 <text class="m-label">FT4</text>
              </view>
              <view class="m-box">
                 <text class="m-val">{{ (item.Calcium) || '-' }}</text>
                 <text class="m-label">血钙</text>
              </view>
              <view class="m-box">
                 <text class="m-val">{{ item.Tg || '-' }}</text>
                 <text class="m-label">Tg</text>
              </view>
           </view>

           <view class="card-footer" v-if="item.feeling">
              <u-icon name="edit-pen" size="14" color="#86909C"></u-icon>
              <text class="memo">{{ item.feeling }}</text>
           </view>
        </view>
      </view>

      <u-empty v-if="list.length === 0" mode="data" text="暂未录入化验数据" marginTop="100"></u-empty>
    </view>

    <view class="premium-fab" @click="navigateToAdd">
       <u-icon name="plus" color="#fff" size="28" bold></u-icon>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onPullDownRefresh } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const list = ref([]);

const fetchList = async () => {
  if (!userStore.isLogin) return;
  try {
    const res = await http.get('/api/record/list');
    list.value = res.list;
  } catch (err) {
    console.error(err);
  } finally {
    uni.stopPullDownRefresh();
  }
};

onPullDownRefresh(() => {
  fetchList();
});

const getTshStatus = (tsh) => {
  if (!tsh) return { text: '未录入TSH', type: 'info' };
  if (tsh > 4.2) return { text: 'TSH 偏高', type: 'error' };
  if (tsh < 0.27) return { text: 'TSH 偏低', type: 'warning' };
  return { text: '指标正常', type: 'success' };
};

const navigateToAdd = () => {
  uni.navigateTo({ url: '/pages/record/add' });
};

onMounted(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>


.list-wrapper {
  background-color: #F6F8FC;
  min-height: 100vh;
  display: flex; /* Flexbox layout */
  flex-direction: column;
  box-sizing: border-box;
}

.list-header {
  padding: 40rpx 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-shrink: 0; /* Don't shrink header */
  
  .stat-box {
    display: flex;
    align-items: baseline;
    .num { font-size: 56rpx; font-weight: 800; color: #3E7BFF; }
    .unit { font-size: 26rpx; color: #86909C; margin-left: 8rpx; }
  }
  
  .filter-pill {
    background: #FFFFFF;
    padding: 12rpx 24rpx;
    border-radius: 40rpx;
    display: flex;
    align-items: center;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
    text { font-size: 24rpx; color: #4E5969; margin-right: 8rpx; }
  }
}

.timeline-body {
  padding: 0 32rpx 200rpx 48rpx;
  flex: 1; /* Take remaining space */
  box-sizing: border-box;
  /* Removed min-height: 100% to prevent overflow */
}

.record-item {
  display: flex;
  margin-bottom: 48rpx;
  
  .line-container {
    width: 40rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 20rpx;
    flex-shrink: 0;
    
    .dot {
      width: 16rpx;
      height: 16rpx;
      background: #E5E6EB;
      border-radius: 50%;
      z-index: 10;
      &.newest { 
        background: #3E7BFF; 
        box-shadow: 0 0 12rpx #3E7BFF;
        transform: scale(1.2);
      }
    }
    .line {
      width: 2rpx;
      flex: 1;
      background: #E5E6EB;
    }
  }
  
  .card-content {
    flex: 1;
    @include premium-card;
    padding: 32rpx;
    
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24rpx;
      .date { font-size: 28rpx; font-weight: 700; color: #1D2129; }
      .status-tag {
        font-size: 20rpx;
        padding: 4rpx 16rpx;
        border-radius: 6rpx;
      }
    }
    
    .metrics-row {
      display: flex;
      justify-content: space-between;
      .m-box {
        text-align: center;
        .m-val { font-size: 32rpx; font-weight: 800; color: #1D2129; display: block; margin-bottom: 4rpx; }
        .m-label { font-size: 22rpx; color: #86909C; }
      }
    }
    
    .card-footer {
      margin-top: 24rpx;
      background: #F8F9FB;
      padding: 16rpx 20rpx;
      border-radius: 12rpx;
      display: flex;
      align-items: flex-start;
      .memo { font-size: 24rpx; color: #4E5969; margin-left: 12rpx; line-height: 1.4; }
    }
  }
}

.premium-fab {
  position: fixed;
  bottom: calc(var(--window-bottom) + 40rpx);
  right: 40rpx;
  width: 110rpx;
  height: 110rpx;
  background: $jyl-gradient;
  border-radius: 55rpx;
  @include flex-center;
  box-shadow: 0 12rpx 24rpx rgba(62, 123, 255, 0.3);
  z-index: 999;
}

// 状态卡片背景
.info-bg { background: #F2F3F5; color: #86909C; }
.success-bg { background: rgba(39, 194, 76, 0.1); color: #27C24C; }
.warning-bg { background: rgba(255, 144, 43, 0.1); color: #FF902B; }
.error-bg { background: rgba(240, 80, 80, 0.1); color: #F05050; }
</style>

<style lang="scss">
page {
  height: 100%;
}
</style>

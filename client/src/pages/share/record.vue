<template>
  <view class="share-page">
    <u-navbar title="报告分享" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    <view class="share-body" v-if="record">
      <view class="card">
        <view class="title">检查摘要</view>
        <view class="line"><text class="label">日期</text><text class="val">{{ record.recordDate || '-' }}</text></view>
        <view class="line"><text class="label">对象</text><text class="val">{{ memberName }}</text></view>
        <view class="block" v-if="metricText">
          <text class="label">化验</text>
          <text class="val">{{ metricText }}</text>
        </view>
        <view class="block" v-if="record.tiradsLevel">
          <text class="label">TI-RADS</text>
          <text class="val">{{ record.tiradsLevel }}</text>
        </view>
        <view class="block" v-if="record.ultrasoundNote">
          <text class="label">超声所见</text>
          <text class="val">{{ record.ultrasoundNote }}</text>
        </view>
        <view class="block" v-if="record.conclusion">
          <text class="label">超声提示</text>
          <text class="val">{{ record.conclusion }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <u-empty mode="data" text="分享链接已失效或不可用"></u-empty>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getBaseURL } from '@/utils/config.js';

const record = ref(null);
const token = ref('');

const memberName = computed(() => {
  const m = record.value?.FamilyMember;
  if (!m) return '本人';
  return `${m.name}${m.relation ? ' · ' + m.relation : ''}`;
});

const metricText = computed(() => {
  if (!record.value) return '';
  const metrics = ['TSH','FT3','FT4','T3','T4','TPOAb','TGAb','TRAb','Tg','Calcitonin','Calcium','PTH'];
  return metrics
    .filter(k => record.value[k] !== undefined && record.value[k] !== null && record.value[k] !== '')
    .map(k => `${k}: ${record.value[k]}`)
    .join('，');
});

const loadShare = async () => {
  if (!token.value) return;
  const baseUrl = getBaseURL();
  uni.request({
    url: `${baseUrl}/api/share/record/${token.value}`,
    method: 'GET',
    success: (res) => {
      if (res.data && res.data.code === 200) {
        record.value = res.data.data;
      } else {
        record.value = null;
      }
    },
    fail: () => {
      record.value = null;
    }
  });
};

onLoad((options) => {
  token.value = options.token || '';
  loadShare();
});

onMounted(() => {});
</script>

<style lang="scss" scoped>
.share-page {
  min-height: 100vh;
  background: #F6F8FC;
}

.share-body {
  padding: 32rpx;
}

.card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
}

.title {
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 24rpx;
}

.line, .block {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .label {
    color: #86909C;
    font-size: 24rpx;
  }
  .val {
    color: #1D2129;
    font-size: 26rpx;
    text-align: right;
    max-width: 70%;
  }
}

.block {
  flex-direction: column;
  .val {
    margin-top: 6rpx;
    text-align: left;
  }
}

.empty {
  padding: 80rpx 32rpx;
}
</style>

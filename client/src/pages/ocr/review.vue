<template>
  <view class="page">
    <u-navbar title="OCR复核台" autoBack placeholder :titleStyle="{ fontWeight: '700' }"></u-navbar>

    <view class="toolbar">
      <view class="chip" :class="{ active: status === 'pending' }" @click="changeStatus('pending')">待复核</view>
      <view class="chip" :class="{ active: status === 'all' }" @click="changeStatus('all')">全部</view>
      <view class="refresh" @click="fetchList">
        <u-icon name="reload" size="16" color="#3E7BFF"></u-icon>
      </view>
    </view>

    <view class="list" v-if="records.length">
      <view class="card" v-for="item in records" :key="item.id">
        <view class="top">
          <view>
            <text class="date">{{ item.recordDate || '-' }}</text>
            <text class="meta">记录 #{{ item.id }}</text>
          </view>
          <view class="open" @click="openRecord(item)">打开记录</view>
        </view>

        <view class="review-block" v-for="type in reviewTypes(item)" :key="type">
          <view class="review-head">
            <text class="review-title">{{ type === 'lab' ? '化验单识别' : '超声识别' }}</text>
            <text class="status" :class="{ done: item.ocrReview[type].reviewed }">
              {{ item.ocrReview[type].reviewed ? '已复核' : '待复核' }}
            </text>
          </view>
          <view class="kv" v-for="entry in previewEntries(item.ocrReview[type])" :key="entry.key">
            <text class="k">{{ entry.key }}</text>
            <text class="v">{{ entry.value }}</text>
          </view>
          <view class="confirm" v-if="!item.ocrReview[type].reviewed" @click="confirmReview(item, type)">确认复核</view>
        </view>
      </view>
    </view>

    <view class="empty" v-else>
      <u-empty mode="data" text="暂无待复核记录"></u-empty>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const records = ref([]);
const status = ref('pending');

const fetchList = async () => {
  const res = await http.get('/api/ocr/review/list', { params: { status: status.value } });
  records.value = Array.isArray(res) ? res : [];
};

const changeStatus = (value) => {
  status.value = value;
  fetchList();
};

const reviewTypes = (item) => {
  return ['lab', 'ultrasound'].filter(type => item.ocrReview && item.ocrReview[type]);
};

const previewEntries = (review) => {
  const data = review.applied || review.recognized || {};
  return Object.entries(data).slice(0, 6).map(([key, value]) => ({ key, value }));
};

const confirmReview = async (item, type) => {
  await http.post('/api/ocr/review/confirm', { id: item.id, type });
  uni.$u.toast('已确认');
  await fetchList();
};

const openRecord = (item) => {
  uni.navigateTo({ url: `/pages/record/detail?id=${item.id}` });
};

onShow(fetchList);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #F6F8FC; padding-bottom: 40rpx; }
.toolbar { display: flex; gap: 14rpx; padding: 28rpx 32rpx 18rpx; align-items: center; }
.chip { padding: 12rpx 24rpx; border-radius: 999rpx; background: #fff; color: #4E5969; font-size: 24rpx; border: 1rpx solid #E5E8EF; }
.chip.active { background: #EEF4FF; color: #3E7BFF; font-weight: 800; border-color: #CFE0FF; }
.refresh { margin-left: auto; background: #fff; width: 64rpx; height: 64rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.list { padding: 0 32rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 26rpx; margin-bottom: 20rpx; box-shadow: 0 8rpx 22rpx rgba(35,70,130,.05); }
.top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20rpx; }
.date { display: block; color: #1D2129; font-size: 30rpx; font-weight: 900; }
.meta { display: block; color: #86909C; margin-top: 6rpx; font-size: 22rpx; }
.open { color: #3E7BFF; background: #EEF4FF; border-radius: 999rpx; padding: 10rpx 18rpx; font-size: 24rpx; font-weight: 700; }
.review-block { background: #F8FAFF; border-radius: 16rpx; padding: 18rpx; margin-top: 14rpx; }
.review-head { display: flex; justify-content: space-between; margin-bottom: 12rpx; }
.review-title { color: #1D2129; font-size: 26rpx; font-weight: 800; }
.status { color: #F53F3F; font-size: 22rpx; }
.status.done { color: #00A870; }
.kv { display: flex; justify-content: space-between; gap: 20rpx; padding: 8rpx 0; border-bottom: 1rpx solid #EEF1F6; }
.kv:last-child { border-bottom: none; }
.k { color: #86909C; font-size: 22rpx; }
.v { color: #1D2129; font-size: 22rpx; font-weight: 700; text-align: right; }
.confirm { margin-top: 16rpx; text-align: center; color: #fff; background: #3E7BFF; border-radius: 999rpx; padding: 12rpx; font-size: 24rpx; font-weight: 800; }
.empty { padding: 120rpx 32rpx; }
</style>

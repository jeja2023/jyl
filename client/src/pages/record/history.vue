<template>
  <view class="history-page">
    <view class="summary-panel">
      <view>
        <text class="summary-title">检查记录</text>
        <text class="summary-sub">按时间查看全部化验、超声与体征记录</text>
      </view>
      <button class="add-btn" @click="navigateToAdd">
        <u-icon name="plus" size="16" color="#FFFFFF"></u-icon>
        <text>新增</text>
      </button>
    </view>

    <view class="stats-row">
      <view class="stat-cell">
        <text class="stat-num">{{ recordDays }}</text>
        <text class="stat-label">记录天数</text>
      </view>
      <view class="stat-cell">
        <text class="stat-num">{{ labCount }}</text>
        <text class="stat-label">化验份数</text>
      </view>
      <view class="stat-cell">
        <text class="stat-num">{{ ultrasoundCount }}</text>
        <text class="stat-label">超声份数</text>
      </view>
    </view>

    <view class="filter-row">
      <view
        v-for="item in filters"
        :key="item.key"
        class="filter-chip"
        :class="{ active: activeFilter === item.key }"
        @click="activeFilter = item.key"
      >
        {{ item.label }}
      </view>
    </view>

    <view class="record-list" v-if="filteredList.length">
      <view class="record-item" v-for="item in filteredList" :key="item.id" @click="navigateToDetail(item.id)">
        <view class="date-box">
          <text class="day">{{ formatDate(item.recordDate).slice(5) }}</text>
          <text class="year">{{ formatDate(item.recordDate).slice(0, 4) }}</text>
        </view>
        <view class="record-main">
          <view class="record-head">
            <text class="record-title">{{ getRecordTitle(item) }}</text>
            <text class="member" v-if="item.FamilyMember">{{ formatMember(item.FamilyMember) }}</text>
          </view>
          <view class="metric-row" v-if="getVisibleMetrics(item).length">
            <view class="metric-pill" v-for="metric in getVisibleMetrics(item)" :key="metric.key">
              <text class="metric-name">{{ metric.name }}</text>
              <text class="metric-value">{{ item[metric.key] }}</text>
              <text class="metric-unit" v-if="item.units?.[metric.key]">{{ item.units[metric.key] }}</text>
            </view>
          </view>
          <view class="tag-row">
            <text class="tag lab" v-if="hasLabData(item)">化验</text>
            <text class="tag us" v-if="hasUltrasoundData(item)">超声</text>
            <text class="tag body" v-if="hasBodyData(item)">体征</text>
          </view>
        </view>
        <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
      </view>
    </view>

    <u-empty v-else mode="data" text="暂无检查记录" marginTop="90"></u-empty>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { setCache, getCache } from '@/utils/cache.js';
import { ALL_INDICATORS } from '@/utils/thyroidIndicators.js';

const userStore = useUserStore();
const list = ref([]);
const activeFilter = ref('all');

const filters = [
  { key: 'all', label: '全部' },
  { key: 'lab', label: '化验' },
  { key: 'ultrasound', label: '超声' },
  { key: 'body', label: '体征' }
];

const preferredMetricKeys = ['TSH', 'FT4', 'FT3', 'TRAb', 'Tg', 'Calcium', 'ALT', 'AST', 'WBC', 'Neutrophils'];
const indicatorMap = ALL_INDICATORS.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

const parseUnits = (item) => {
  if (!item.indicatorUnits) return {};
  if (typeof item.indicatorUnits === 'object') return item.indicatorUnits;
  try {
    return JSON.parse(item.indicatorUnits);
  } catch (e) {
    return {};
  }
};

const normalizeRecord = (item) => ({
  ...item,
  units: parseUnits(item)
});

const hasValue = (value) => value !== undefined && value !== null && value !== '' && value !== 'null';
const hasLabData = (item) => ALL_INDICATORS.some(metric => hasValue(item[metric.key]));
const hasBodyData = (item) => hasValue(item.weight) || hasValue(item.heartRate);
const hasUltrasoundData = (item) => hasValue(item.thyroidLeft) || hasValue(item.noduleCount) || hasValue(item.tiradsLevel) || hasImages(item.ultrasoundImage);

const hasImages = (imgData) => {
  if (!imgData) return false;
  if (Array.isArray(imgData)) return imgData.length > 0;
  try {
    const arr = JSON.parse(imgData);
    return Array.isArray(arr) ? arr.length > 0 : !!imgData;
  } catch (e) {
    return !!imgData;
  }
};

const filteredList = computed(() => {
  if (activeFilter.value === 'lab') return list.value.filter(hasLabData);
  if (activeFilter.value === 'ultrasound') return list.value.filter(hasUltrasoundData);
  if (activeFilter.value === 'body') return list.value.filter(hasBodyData);
  return list.value;
});

const recordDays = computed(() => new Set(list.value.map(item => item.recordDate).filter(Boolean)).size);
const labCount = computed(() => list.value.filter(hasLabData).length);
const ultrasoundCount = computed(() => list.value.filter(hasUltrasoundData).length);

const getVisibleMetrics = (item) => {
  const keys = preferredMetricKeys.filter(key => hasValue(item[key]));
  return keys.slice(0, 4).map(key => ({
    key,
    name: indicatorMap[key]?.name || key
  }));
};

const getRecordTitle = (item) => {
  const types = [];
  if (hasLabData(item)) types.push('化验');
  if (hasUltrasoundData(item)) types.push('超声');
  if (hasBodyData(item)) types.push('体征');
  return types.length ? `${types.join(' + ')}记录` : '检查记录';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '----.--.--';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const formatMember = (member) => member ? `${member.name}${member.relation ? ' · ' + member.relation : ''}` : '';

const fetchList = async () => {
  if (!userStore.isLogin) return;
  try {
    const res = await http.get('/api/record/list');
    list.value = (res.list || []).map(normalizeRecord);
    setCache('record_history_list', list.value, 1800);
  } catch (err) {
    const cached = getCache('record_history_list');
    if (cached) list.value = cached;
  }
};

const navigateToAdd = () => uni.navigateTo({ url: '/pages/record/add' });
const navigateToDetail = (id) => uni.navigateTo({ url: `/pages/record/detail?id=${id}` });

onShow(() => {
  if (!userStore.isLogin) {
    uni.reLaunch({ url: '/pages/login' });
    return;
  }
  fetchList();
});
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #F8FAFF;
  padding: 28rpx 28rpx calc(env(safe-area-inset-bottom) + 40rpx);
}

.summary-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 34rpx;
  color: #FFFFFF;
  background: linear-gradient(135deg, #3E7BFF 0%, #2657D9 100%);
  border-radius: 24rpx;
}

.summary-title {
  display: block;
  font-size: 38rpx;
  font-weight: 900;
}

.summary-sub {
  display: block;
  margin-top: 10rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 24rpx;
}

.add-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  height: 64rpx;
  padding: 0 22rpx;
  border: 0;
  border-radius: 32rpx;
  color: #FFFFFF;
  font-size: 24rpx;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.18);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: -22rpx 18rpx 24rpx;
  padding: 26rpx 0;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 12rpx 32rpx rgba(62, 123, 255, 0.12);
}

.stat-cell {
  text-align: center;
  border-right: 1px solid #F2F3F5;
}

.stat-cell:last-child {
  border-right: 0;
}

.stat-num {
  display: block;
  color: #1D2129;
  font-size: 34rpx;
  font-weight: 900;
}

.stat-label {
  display: block;
  margin-top: 6rpx;
  color: #86909C;
  font-size: 22rpx;
  font-weight: 700;
}

.filter-row {
  display: flex;
  gap: 14rpx;
  margin-bottom: 20rpx;
  overflow-x: auto;
}

.filter-chip {
  flex: 0 0 auto;
  padding: 14rpx 28rpx;
  color: #4E5969;
  font-size: 24rpx;
  font-weight: 800;
  background: #FFFFFF;
  border: 1px solid #E5E6EB;
  border-radius: 28rpx;
}

.filter-chip.active {
  color: #FFFFFF;
  background: #3E7BFF;
  border-color: #3E7BFF;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 26rpx 24rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(15, 35, 80, 0.05);
}

.date-box {
  flex: 0 0 96rpx;
  text-align: center;
}

.day {
  display: block;
  color: #1D2129;
  font-size: 28rpx;
  font-weight: 900;
}

.year {
  display: block;
  margin-top: 4rpx;
  color: #86909C;
  font-size: 22rpx;
}

.record-main {
  flex: 1;
  min-width: 0;
}

.record-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 14rpx;
}

.record-title {
  color: #1D2129;
  font-size: 28rpx;
  font-weight: 900;
}

.member {
  color: #3E7BFF;
  font-size: 22rpx;
  font-weight: 700;
}

.metric-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 14rpx;
}

.metric-pill {
  display: inline-flex;
  align-items: baseline;
  gap: 6rpx;
  padding: 8rpx 12rpx;
  background: #F6F8FF;
  border-radius: 12rpx;
}

.metric-name {
  color: #3E7BFF;
  font-size: 20rpx;
  font-weight: 900;
}

.metric-value {
  color: #1D2129;
  font-size: 22rpx;
  font-weight: 900;
}

.metric-unit {
  color: #86909C;
  font-size: 18rpx;
}

.tag-row {
  display: flex;
  gap: 10rpx;
}

.tag {
  padding: 6rpx 12rpx;
  border-radius: 10rpx;
  font-size: 20rpx;
  font-weight: 800;
}

.tag.lab {
  color: #3E7BFF;
  background: #EDF3FF;
}

.tag.us {
  color: #722ED1;
  background: #F5EDFF;
}

.tag.body {
  color: #00A870;
  background: #EAFBF4;
}
</style>

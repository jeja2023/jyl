<template>
  <view class="page">
    <u-navbar title="智能洞察" autoBack placeholder :titleStyle="{ fontWeight: '700' }"></u-navbar>

    <view class="hero">
      <view>
        <text class="hero-title">本月健康雷达</text>
        <text class="hero-sub">趋势、用药、复查和异常指标集中看</text>
      </view>
      <view class="hero-score">{{ dashboard?.monthly?.totals?.medicationAdherence || 0 }}%</view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">智能复查计划</text>
        <view class="link-btn" @click="generateCheckup">生成提醒</view>
      </view>
      <view class="suggest-card">
        <text class="suggest-date">{{ dashboard?.checkupSuggestion?.nextDate || '-' }}</text>
        <text class="suggest-note">{{ dashboard?.checkupSuggestion?.note || '暂无建议，请先录入检查记录。' }}</text>
      </view>
    </view>

    <view class="section" v-if="monitoringPlan">
      <view class="section-head">
        <text class="section-title">个性化监测方案</text>
        <text class="muted">建议 {{ monitoringPlan.intervalDays || '-' }} 天</text>
      </view>
      <view class="plan-card">
        <text class="plan-summary">{{ monitoringPlan.summary }}</text>
        <view class="quality-row" v-if="monitoringPlan.dataQuality">
          <text>数据完整度 {{ monitoringPlan.dataQuality.score }}%</text>
          <text>{{ monitoringPlan.dataQuality.message }}</text>
        </view>
        <view class="plan-tags">
          <view
            v-for="item in monitoringItems"
            :key="item.key"
            class="plan-tag"
            :class="item.role"
          >
            <text>{{ item.label || item.key }}</text>
            <text v-if="item.role === 'core'" class="tag-role">核心</text>
          </view>
        </view>
      </view>
      <view class="plan-group" v-for="group in monitoringGroups" :key="group.id">
        <view class="group-top">
          <text class="group-title">{{ group.title }}</text>
          <text class="group-count">{{ group.keys.length }} 项</text>
        </view>
        <text class="group-reason">{{ group.reason }}</text>
      </view>
    </view>

    <view class="section" v-if="recentAdjustments.length">
      <view class="section-head">
        <text class="section-title">药量变化时间线</text>
        <text class="muted">最近 {{ recentAdjustments.length }} 次</text>
      </view>
      <view class="adjust-card" v-for="item in recentAdjustments" :key="item.id">
        <view>
          <text class="adjust-name">{{ item.medicineName }}</text>
          <text class="adjust-meta">{{ item.adjustmentDate }} · {{ item.reason || '剂量调整' }}</text>
        </view>
        <text class="adjust-dose">{{ item.fromDosage || '新增' }} → {{ item.toDosage }}</text>
      </view>
    </view>

    <view class="section" v-if="analysis">
      <view class="section-head">
        <text class="section-title">指标解释与异常标记</text>
        <text class="muted">{{ analysis.summary }}</text>
      </view>
      <view class="metric-row" v-for="item in analysis.items" :key="item.key">
        <view>
          <text class="metric-name">{{ item.key }}</text>
          <text class="metric-advice">{{ item.advice }}</text>
        </view>
        <view class="metric-status" :class="item.status">
          {{ item.riskLabel || statusText(item.status) }} · {{ trendText(item.trend) }}
        </view>
        <text class="metric-action" v-if="item.action">{{ item.action }}</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">月度数据洞察</text>
        <text class="muted">近 6 个月</text>
      </view>
      <view class="month-card" v-for="item in months" :key="item.month">
        <view class="month-top">
          <text class="month-name">{{ item.month }}</text>
          <text class="abnormal">{{ item.abnormalCount }} 项异常</text>
        </view>
        <view class="bar"><view class="bar-fill" :style="{ width: monthWidth(item) }"></view></view>
        <text class="month-meta">{{ item.recordCount }} 条记录 · 最近 {{ item.latestRecordDate || '-' }}</text>
      </view>
    </view>

    <view class="grid">
      <view class="stat">
        <text class="num">{{ totals.recordCount || 0 }}</text>
        <text class="label">检查记录</text>
      </view>
      <view class="stat">
        <text class="num">{{ totals.abnormalCount || 0 }}</text>
        <text class="label">异常次数</text>
      </view>
      <view class="stat">
        <text class="num">{{ totals.checkupCompletionRate || 0 }}%</text>
        <text class="label">复查完成率</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const dashboard = ref(null);

const analysis = computed(() => dashboard.value?.analysis || null);
const months = computed(() => dashboard.value?.monthly?.months || []);
const totals = computed(() => dashboard.value?.monthly?.totals || {});
const monitoringPlan = computed(() => dashboard.value?.monitoringPlan || null);
const monitoringItems = computed(() => monitoringPlan.value?.items || []);
const monitoringGroups = computed(() => monitoringPlan.value?.groups || []);
const recentAdjustments = computed(() => dashboard.value?.recentMedicationAdjustments || []);

const fetchDashboard = async () => {
  dashboard.value = await http.get('/api/insight/dashboard');
};

const generateCheckup = async () => {
  const res = await http.post('/api/checkup/generate', {});
  uni.$u.toast(res?.created ? '已生成复查提醒' : '复查提醒已存在');
  await fetchDashboard();
};

const statusText = (status) => {
  const map = { normal: '正常', high: '偏高', low: '偏低' };
  return map[status] || status;
};

const trendText = (trend) => {
  const map = { up: '上升', down: '下降', flat: '平稳' };
  return map[trend] || '平稳';
};

const monthWidth = (item) => {
  const max = Math.max(...months.value.map(m => m.abnormalCount), 1);
  return `${Math.max(8, Math.round((item.abnormalCount / max) * 100))}%`;
};

onShow(fetchDashboard);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #F6F8FC; padding-bottom: 40rpx; }
.hero {
  margin: 28rpx 32rpx;
  padding: 34rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(35, 70, 130, .06);
}
.hero-title { display: block; font-size: 36rpx; font-weight: 900; color: #1D2129; }
.hero-sub { display: block; margin-top: 8rpx; color: #86909C; font-size: 24rpx; }
.hero-score { color: #3E7BFF; font-size: 42rpx; font-weight: 900; }
.section { margin: 0 32rpx 24rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14rpx; gap: 18rpx; }
.section-title { color: #1D2129; font-size: 30rpx; font-weight: 800; }
.muted { color: #86909C; font-size: 22rpx; text-align: right; }
.link-btn { color: #3E7BFF; background: #EEF4FF; padding: 10rpx 18rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 700; }
.suggest-card, .metric-row, .month-card, .stat, .plan-card, .plan-group, .adjust-card {
  background: #FFFFFF;
  border-radius: 18rpx;
  padding: 24rpx;
  box-shadow: 0 6rpx 18rpx rgba(35, 70, 130, .04);
}
.suggest-date { display: block; font-size: 34rpx; font-weight: 900; color: #3E7BFF; margin-bottom: 10rpx; }
.suggest-note { display: block; color: #4E5969; font-size: 24rpx; line-height: 1.5; }
.plan-summary { display: block; color: #1D2129; font-size: 26rpx; font-weight: 800; line-height: 1.45; }
.quality-row {
  margin-top: 16rpx;
  padding: 16rpx;
  border-radius: 14rpx;
  background: #F7FAFF;
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  color: #4E5969;
  font-size: 22rpx;
}
.plan-tags { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 20rpx; }
.plan-tag {
  min-height: 48rpx;
  padding: 0 16rpx;
  border-radius: 24rpx;
  background: #F2F7FF;
  color: #3E7BFF;
  font-size: 22rpx;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}
.plan-tag.core { background: #E8FFF5; color: #00A870; }
.tag-role { font-size: 18rpx; }
.plan-group { margin-top: 14rpx; }
.group-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.group-title { color: #1D2129; font-size: 26rpx; font-weight: 900; }
.group-count { color: #3E7BFF; font-size: 22rpx; font-weight: 800; }
.group-reason { display: block; color: #4E5969; font-size: 22rpx; line-height: 1.5; }
.metric-row { margin-bottom: 14rpx; display: flex; justify-content: space-between; gap: 20rpx; }
.metric-name { display: block; font-size: 28rpx; font-weight: 800; color: #1D2129; }
.metric-advice { display: block; margin-top: 6rpx; color: #4E5969; font-size: 22rpx; line-height: 1.45; }
.metric-action { display: block; width: 100%; color: #86909C; font-size: 22rpx; margin-top: 8rpx; }
.metric-status { flex-shrink: 0; align-self: flex-start; padding: 8rpx 14rpx; border-radius: 999rpx; font-size: 22rpx; }
.metric-status.normal { color: #00A870; background: #E8FFF5; }
.metric-status.high, .metric-status.low { color: #F53F3F; background: #FFF1F0; }
.adjust-card { margin-bottom: 14rpx; display: flex; justify-content: space-between; align-items: center; gap: 16rpx; }
.adjust-name { display: block; color: #1D2129; font-size: 26rpx; font-weight: 900; }
.adjust-meta { display: block; color: #86909C; font-size: 22rpx; margin-top: 6rpx; }
.adjust-dose { flex-shrink: 0; color: #3E7BFF; background: #EEF4FF; border-radius: 999rpx; padding: 8rpx 14rpx; font-size: 22rpx; font-weight: 800; }
.month-card { margin-bottom: 14rpx; }
.month-top { display: flex; justify-content: space-between; margin-bottom: 14rpx; }
.month-name { font-weight: 800; color: #1D2129; font-size: 26rpx; }
.abnormal { color: #F53F3F; font-size: 22rpx; }
.bar { height: 12rpx; background: #EDF1F7; border-radius: 999rpx; overflow: hidden; }
.bar-fill { height: 100%; background: #3E7BFF; border-radius: 999rpx; }
.month-meta { display: block; margin-top: 10rpx; color: #86909C; font-size: 22rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; margin: 0 32rpx; }
.stat { text-align: center; }
.num { display: block; color: #1D2129; font-size: 32rpx; font-weight: 900; }
.label { display: block; margin-top: 6rpx; color: #86909C; font-size: 22rpx; }
</style>

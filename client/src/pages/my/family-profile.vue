<template>
  <view class="page">
    <u-navbar title="健康档案增强" autoBack placeholder :titleStyle="{ fontWeight: '700' }"></u-navbar>

    <view class="member-list" v-if="members.length">
      <view class="card" v-for="member in members" :key="member.id">
        <view class="top">
          <view>
            <text class="name">{{ member.name }}</text>
            <text class="meta">{{ member.relation || '成员' }} · {{ member.patientType || '其他' }}</text>
          </view>
          <view class="edit" @click="edit(member)">配置</view>
        </view>
        <view class="profile-line">
          <text>复查周期</text>
          <text>{{ member.checkupIntervalDays || '跟随病种默认' }}{{ member.checkupIntervalDays ? ' 天' : '' }}</text>
        </view>
        <view class="profile-line">
          <text>自定义参考范围</text>
          <text>{{ rangeCount(member.referenceRanges) }} 项</text>
        </view>
      </view>
    </view>

    <view class="empty" v-else>
      <u-empty mode="data" text="请先添加家庭成员"></u-empty>
    </view>

    <u-popup :show="showEditor" mode="bottom" round="24" @close="showEditor = false">
      <view class="editor">
        <view class="editor-head">
          <text class="editor-title">{{ current?.name || '' }}</text>
          <text class="editor-sub">独立设置病种、参考范围与复查周期</text>
        </view>

        <view class="field">
          <text class="label">复查周期（天）</text>
          <u--input v-model="form.checkupIntervalDays" type="number" placeholder="例如 60" border="surround"></u--input>
        </view>

        <view class="range-row" v-for="item in rangeRows" :key="item.key">
          <view class="range-title">
            <text>{{ item.key }}</text>
            <text>{{ item.label }}</text>
          </view>
          <view class="range-inputs">
            <u--input v-model="item.min" placeholder="下限" border="surround"></u--input>
            <u--input v-model="item.max" placeholder="上限" border="surround"></u--input>
          </view>
        </view>

        <view class="save" @click="save">保存配置</view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const members = ref([]);
const ranges = ref({});
const showEditor = ref(false);
const current = ref(null);
const rangeRows = ref([]);
const form = reactive({ checkupIntervalDays: '' });

const load = async () => {
  const [memberList, defaultRanges] = await Promise.all([
    http.get('/api/family/list'),
    http.get('/api/family/ranges')
  ]);
  members.value = memberList || [];
  ranges.value = defaultRanges || {};
};

const parseRanges = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch (e) { return {}; }
};

const rangeCount = (value) => Object.keys(parseRanges(value)).length;

const edit = (member) => {
  current.value = member;
  form.checkupIntervalDays = member.checkupIntervalDays || '';
  const custom = parseRanges(member.referenceRanges);
  rangeRows.value = Object.entries(ranges.value).slice(0, 8).map(([key, item]) => ({
    key,
    label: item.label || key,
    min: custom[key]?.min ?? item.min ?? '',
    max: custom[key]?.max ?? item.max ?? ''
  }));
  showEditor.value = true;
};

const save = async () => {
  const referenceRanges = {};
  rangeRows.value.forEach(row => {
    referenceRanges[row.key] = {
      min: row.min === '' ? undefined : Number(row.min),
      max: row.max === '' ? undefined : Number(row.max)
    };
  });
  await http.post('/api/family/update', {
    id: current.value.id,
    checkupIntervalDays: form.checkupIntervalDays ? Number(form.checkupIntervalDays) : null,
    referenceRanges: JSON.stringify(referenceRanges)
  });
  uni.$u.toast('已保存');
  showEditor.value = false;
  await load();
};

onShow(load);
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #F6F8FC; padding-bottom: 40rpx; }
.member-list { padding: 28rpx 32rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 26rpx; margin-bottom: 20rpx; box-shadow: 0 8rpx 22rpx rgba(35,70,130,.05); }
.top { display: flex; justify-content: space-between; margin-bottom: 20rpx; }
.name { display: block; color: #1D2129; font-size: 30rpx; font-weight: 900; }
.meta { display: block; margin-top: 6rpx; color: #86909C; font-size: 22rpx; }
.edit { color: #3E7BFF; background: #EEF4FF; border-radius: 999rpx; padding: 10rpx 18rpx; font-size: 24rpx; font-weight: 700; height: 34rpx; }
.profile-line { display: flex; justify-content: space-between; padding: 12rpx 0; color: #4E5969; font-size: 24rpx; border-top: 1rpx solid #F0F2F5; }
.empty { padding: 120rpx 32rpx; }
.editor { padding: 34rpx; max-height: 78vh; overflow-y: auto; background: #fff; }
.editor-head { margin-bottom: 28rpx; }
.editor-title { display: block; color: #1D2129; font-size: 34rpx; font-weight: 900; }
.editor-sub { display: block; margin-top: 8rpx; color: #86909C; font-size: 24rpx; }
.field { margin-bottom: 24rpx; }
.label { display: block; color: #4E5969; font-size: 24rpx; font-weight: 700; margin-bottom: 12rpx; }
.range-row { background: #F8FAFF; border-radius: 16rpx; padding: 18rpx; margin-bottom: 14rpx; }
.range-title { display: flex; justify-content: space-between; color: #1D2129; font-size: 24rpx; font-weight: 800; margin-bottom: 12rpx; }
.range-inputs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14rpx; }
.save { margin-top: 28rpx; background: #3E7BFF; color: #fff; text-align: center; border-radius: 999rpx; padding: 24rpx; font-size: 30rpx; font-weight: 900; }
</style>

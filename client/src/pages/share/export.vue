<template>
  <view class="export-page">
    <u-navbar title="报告导出与分享" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>

    <view class="header-card">
      <view class="header-top">
        <view class="header-title">
          <u-icon name="edit-pen" size="18" color="#3E7BFF"></u-icon>
          <text>一键导出</text>
        </view>
        <view class="quick-export-btn" @click="exportAll">
          <u-icon name="download" size="14" color="#FFF"></u-icon>
          <text>导出全部数据</text>
        </view>
      </view>
      <view class="header-tip">导出为 Excel 或生成分享链接，便于发送给医生/家人查看。</view>
    </view>

    <view class="record-list" v-if="records.length">
      <view class="record-card" v-for="item in records" :key="item.id">
        <view class="record-head">
          <text class="record-date">{{ item.recordDate || '-' }}</text>
          <view class="member-tag" v-if="item.FamilyMember">
            <u-icon name="account" size="12" color="#3E7BFF"></u-icon>
            <text>{{ formatMember(item.FamilyMember) }}</text>
          </view>
        </view>

        <text class="record-summary">{{ getSummary(item) }}</text>

        <view class="record-actions">
          <view class="action-btn" @click="exportOne(item)">导出</view>
          <view class="action-btn" @click="copySummary(item)">复制摘要</view>
          <view class="action-btn" @click="copyShareLink(item)">复制链接</view>
          <view class="action-btn ghost" @click="openPreview(item)">预览</view>
        </view>
      </view>
    </view>

    <view class="empty-box" v-else>
      <u-empty mode="list" text="暂无可导出的记录"></u-empty>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { getBaseURL } from '@/utils/config.js';

const userStore = useUserStore();
const records = ref([]);

// 获取记录列表
const fetchRecords = async () => {
  if (!userStore.isLogin) {
    uni.reLaunch({ url: '/pages/login' });
    return;
  }
  try {
    const res = await http.get('/api/record/list', { params: { limit: 50 } });
    records.value = res.list || [];
  } catch (e) {
    records.value = [];
  }
};

// 家庭成员格式化
const formatMember = (member) => {
  if (!member) return '本人';
  return `${member.name}${member.relation ? '·' + member.relation : ''}`;
};

// 生成摘要文本
const getSummary = (item) => {
  const parts = [];
  const memberText = item.FamilyMember ? formatMember(item.FamilyMember) : '本人';
  parts.push(`对象: ${memberText}`);

  const metrics = ['TSH','FT3','FT4','T3','T4','TPOAb','TGAb','TRAb','Tg','Calcitonin','Calcium','PTH'];
  const metricText = metrics
    .filter(k => item[k] !== undefined && item[k] !== null && item[k] !== '')
    .map(k => `${k} ${item[k]}`)
    .join('；');
  if (metricText) parts.push(`化验: ${metricText}`);
  if (item.tiradsLevel) parts.push(`TI-RADS ${item.tiradsLevel}`);
  if (item.ultrasoundNote) parts.push(`超声所见: ${item.ultrasoundNote}`);
  if (item.conclusion) parts.push(`超声提示: ${item.conclusion}`);
  if (item.feeling) parts.push(`备注: ${item.feeling}`);

  return parts.join(' | ');
};

// 导出全部记录
const exportAll = () => {
  doExport();
};

// 导出单条记录
const exportOne = (item) => {
  if (!item?.id) return;
  doExport(item.id);
};

// 执行导出
const doExport = (id) => {
  const token = userStore.token;
  const baseUrl = getBaseURL();
  const url = `${baseUrl}/api/record/export?token=${token}${id ? `&id=${id}` : ''}`;

  // #ifdef H5
  window.location.href = url;
  // #endif

  // #ifndef H5
  uni.showLoading({ title: '准备导出...' });
  uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          success: () => uni.hideLoading(),
          fail: () => {
            uni.hideLoading();
            uni.$u.toast('预览失败，请尝试在浏览器打开');
          }
        });
      }
    },
    fail: () => {
      uni.hideLoading();
      uni.$u.toast('导出失败');
    }
  });
  // #endif
};

// 复制摘要
const copySummary = (item) => {
  const text = `报告摘要｜${item.recordDate || '-'}\n${getSummary(item)}`;
  uni.setClipboardData({
    data: text,
    success: () => uni.$u.toast('摘要已复制')
  });
};

// 复制分享链接
const copyShareLink = async (item) => {
  if (!item?.id) return;
  try {
    const res = await http.post('/api/share/record', { id: item.id });
    const token = res?.token;
    if (!token) return uni.$u.toast('生成分享链接失败');
    const url = `${getBaseURL()}/#/pages/share/record?token=${token}`;
    uni.setClipboardData({
      data: url,
      success: () => uni.$u.toast('分享链接已复制')
    });
  } catch (e) {
    uni.$u.toast('生成分享链接失败');
  }
};

// 预览分享页面
const openPreview = async (item) => {
  if (!item?.id) return;
  try {
    const res = await http.post('/api/share/record', { id: item.id });
    const token = res?.token;
    if (!token) return uni.$u.toast('生成分享链接失败');
    uni.navigateTo({ url: `/pages/share/record?token=${token}` });
  } catch (e) {
    uni.$u.toast('生成分享链接失败');
  }
};

onShow(() => {
  fetchRecords();
});
</script>

<style lang="scss" scoped>
.export-page {
  min-height: 100vh;
  background: #F6F8FC;
}

.header-card {
  margin: 32rpx;
  padding: 32rpx;
  background: #FFFFFF;
  border-radius: 28rpx;
  box-shadow: 0 10rpx 30rpx rgba(62, 123, 255, 0.08);
  border: 1px solid rgba(62, 123, 255, 0.05);

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 32rpx;
    font-weight: 900;
    color: #1D2129;
    white-space: nowrap;
  }

  .quick-export-btn {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 28rpx;
    background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
    border-radius: 40rpx;
    color: #FFFFFF;
    font-size: 24rpx;
    font-weight: 700;
    box-shadow: 0 8rpx 16rpx rgba(62, 123, 255, 0.2);
    transition: all 0.2s;
    white-space: nowrap;
    
    &:active {
      transform: scale(0.96);
      opacity: 0.9;
    }
  }

  .header-tip {
    font-size: 22rpx;
    color: #86909C;
    line-height: 1.4;
  }
}

.record-list {
  padding: 0 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.04);
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;

  .record-date {
    font-size: 28rpx;
    font-weight: 700;
    color: #1D2129;
  }

  .member-tag {
    display: flex;
    align-items: center;
    gap: 6rpx;
    padding: 6rpx 12rpx;
    border-radius: 16rpx;
    background: #F2F7FF;
    color: #3E7BFF;
    font-size: 22rpx;
  }
}

.record-summary {
  font-size: 24rpx;
  color: #4E5969;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.record-actions {
  margin-top: 16rpx;
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;

  .action-btn {
    padding: 12rpx 20rpx;
    background: #3E7BFF;
    color: #FFFFFF;
    border-radius: 20rpx;
    font-size: 24rpx;

    &.ghost {
      background: #EEF4FF;
      color: #3E7BFF;
    }
  }
}

.empty-box {
  padding: 120rpx 32rpx;
}
</style>

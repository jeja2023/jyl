<template>
  <view class="share-page animate-fade-in">
    <u-navbar title="报告分享" @leftClick="handleBack" placeholder :titleStyle="{fontWeight: '700', color: '#1D2129'}"></u-navbar>

    <view class="share-body" v-if="record">
      <!-- 头部精美摘要卡片 -->
      <view class="header-card">
        <view class="brand-bar">
          <text class="brand-name">甲友乐 JYL</text>
          <view class="share-badge">
            <u-icon name="share-fill" color="#3B82F6" size="12"></u-icon>
            <text class="share-badge-text">专属健康报告</text>
          </view>
        </view>
        <view class="info-grid">
          <view class="info-item">
            <text class="info-label">报告日期</text>
            <text class="info-value">{{ record.recordDate || '-' }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">记录对象</text>
            <text class="info-value">{{ memberName }}</text>
          </view>
        </view>
      </view>

      <!-- 血液化验指标精美网格 -->
      <view class="card" v-if="activeMetrics.length > 0">
        <view class="card-header">
          <view class="indicator-bar blue"></view>
          <text class="card-title">血液化验指标</text>
          <text class="indicator-count">共 {{ activeMetrics.length }} 项</text>
        </view>
        <view class="metrics-grid">
          <view class="metric-card animate-scale-up" v-for="item in activeMetrics" :key="item.key">
            <text class="metric-name">{{ item.name }}</text>
            <view class="metric-value-wrap">
              <text class="metric-value">{{ item.val }}</text>
              <text class="metric-unit" v-if="item.unit">{{ item.unit }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 腺体彩超结论区域 -->
      <view class="card" v-if="record.tiradsLevel || record.ultrasoundNote || record.conclusion || (record.ultrasoundImage && record.ultrasoundImage.length > 0)">
        <view class="card-header">
          <view class="indicator-bar green"></view>
          <text class="card-title">甲状腺彩超结论</text>
        </view>

        <!-- TI-RADS 评级胶囊 -->
        <view class="tirads-panel" v-if="record.tiradsLevel">
          <text class="tirads-label">C-TIRADS 评级</text>
          <view class="tirads-badge">
            <text class="tirads-val">{{ record.tiradsLevel }} 类</text>
          </view>
        </view>

        <!-- 超声所见气泡框 -->
        <view class="detail-section" v-if="record.ultrasoundNote">
          <text class="section-title">超声所见</text>
          <view class="section-content-box">
            <text class="section-content">{{ record.ultrasoundNote }}</text>
          </view>
        </view>

        <!-- 超声提示气泡框（警告红微透明底色） -->
        <view class="detail-section" v-if="record.conclusion">
          <text class="section-title alert-title">超声提示</text>
          <view class="section-content-box alert-box">
            <text class="section-content">{{ record.conclusion }}</text>
          </view>
        </view>

        <!-- 超声化验单原始图像 -->
        <view class="detail-section" v-if="record.ultrasoundImage && record.ultrasoundImage.length > 0">
          <text class="section-title">超声图像</text>
          <view class="image-gallery">
            <image
              v-for="(img, idx) in record.ultrasoundImage"
              :key="idx"
              :src="getImageUrl(img)"
              mode="aspectFill"
              class="gallery-image"
              @click="previewImage(record.ultrasoundImage, idx)"
            ></image>
          </view>
        </view>
      </view>

      <!-- 底部温馨医嘱提示 -->
      <view class="footer-note">
        <text class="note-text">甲友乐仅提供客观数据记录与管理，数据分享仅供随访参考</text>
        <text class="note-text">本报告不作为诊断及临床依据，具体诊疗请严格遵循医嘱</text>
      </view>
    </view>

    <!-- 链接失效状态 -->
    <view v-else class="empty animate-fade-in">
      <u-empty mode="data" icon="http://cdn.uviewui.com/uview/empty/data.png" text="该分享已撤销或已过期失效"></u-empty>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getBaseURL } from '@/utils/config.js';
import { ALL_INDICATORS } from '@/utils/thyroidIndicators.js';

const record = ref(null);
const token = ref('');

const handleBack = () => {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({
      url: '/pages/login'
    });
  }
};

const memberName = computed(() => {
  const m = record.value?.FamilyMember;
  if (!m) return '本人';
  return `${m.name}${m.relation ? ' · ' + m.relation : ''}`;
});

// 解析血液化验指标，智能提取数据库自定义单位或默认单位
const activeMetrics = computed(() => {
  if (!record.value) return [];

  let customUnits = {};
  if (record.value.indicatorUnits) {
    try {
      customUnits = typeof record.value.indicatorUnits === 'object'
        ? record.value.indicatorUnits
        : JSON.parse(record.value.indicatorUnits);
    } catch (e) {
      customUnits = {};
    }
  }

  return ALL_INDICATORS
    .filter(item => record.value[item.key] !== undefined && record.value[item.key] !== null && record.value[item.key] !== '')
    .map(item => {
      const unit = customUnits[item.key] || item.unit || '';
      return {
        key: item.key,
        name: item.name,
        val: record.value[item.key],
        unit: unit
      };
    });
});

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  const baseUrl = getBaseURL();
  return `${baseUrl}${path}`;
};

const previewImage = (images, currentIdx) => {
  const urls = images.map(img => getImageUrl(img));
  uni.previewImage({
    urls,
    current: currentIdx
  });
};

const loadShare = async () => {
  if (!token.value) return;
  const baseUrl = getBaseURL();
  uni.request({
    url: `${baseUrl}/api/share/record/${encodeURIComponent(token.value)}`,
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
</script>

<style lang="scss" scoped>
.share-page {
  min-height: 100vh;
  background: #F4F6FA;
}

.share-body {
  padding: 28rpx;
}

/* 顶部品牌摘要卡片 */
.header-card {
  background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(160, 175, 192, 0.08);
  margin-bottom: 24rpx;
  border: 1rpx solid rgba(226, 232, 240, 0.8);
}

.brand-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
  border-bottom: 2rpx dashed #E2E8F0;
  padding-bottom: 18rpx;
}

.brand-name {
  font-size: 32rpx;
  font-weight: 800;
  color: #1E3A8A;
  letter-spacing: 1rpx;
}

.share-badge {
  display: flex;
  align-items: center;
  background: rgba(59, 130, 246, 0.08);
  padding: 6rpx 16rpx;
  border-radius: 100rpx;
}

.share-badge-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #3B82F6;
  margin-left: 6rpx;
}

.info-grid {
  display: flex;
  justify-content: space-between;
}

.info-item {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.info-item:last-child {
  align-items: flex-end;
}

.info-label {
  font-size: 22rpx;
  color: #94A3B8;
  margin-bottom: 6rpx;
}

.info-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #334155;
}

/* 模块容器卡片 */
.card {
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 36rpx;
  box-shadow: 0 12rpx 36rpx rgba(160, 175, 192, 0.08);
  margin-bottom: 28rpx;
  border: 1rpx solid rgba(226, 232, 240, 0.5);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 32rpx;
}

.indicator-bar {
  width: 8rpx;
  height: 28rpx;
  border-radius: 4rpx;
  margin-right: 14rpx;

  &.blue {
    background: #3B82F6;
  }
  &.green {
    background: #10B981;
  }
}

.card-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1E293B;
  flex: 1;
}

.indicator-count {
  font-size: 22rpx;
  font-weight: 600;
  color: #94A3B8;
  background: #F1F5F9;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

/* 化验指标网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.metric-card {
  background: #F8FAFC;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  border: 1rpx solid rgba(241, 245, 249, 0.9);
}

.metric-name {
  font-size: 22rpx;
  font-weight: 600;
  color: #64748B;
  margin-bottom: 10rpx;
  word-break: break-all;
}

.metric-value-wrap {
  display: flex;
  align-items: baseline;
}

.metric-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #0F172A;
}

.metric-unit {
  font-size: 20rpx;
  font-weight: 500;
  color: #94A3B8;
  margin-left: 8rpx;
}

/* TI-RADS 评级面板 */
.tirads-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(249, 115, 22, 0.04);
  border: 1rpx solid rgba(249, 115, 22, 0.12);
  padding: 16rpx 28rpx;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
}

.tirads-label {
  font-size: 26rpx;
  font-weight: 700;
  color: #EA580C;
}

.tirads-badge {
  background: #EA580C;
  padding: 4rpx 20rpx;
  border-radius: 100rpx;
}

.tirads-val {
  font-size: 24rpx;
  font-weight: 700;
  color: #FFFFFF;
}

/* 超声描述性段落 */
.detail-section {
  display: flex;
  flex-direction: column;
  margin-bottom: 28rpx;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #475569;
  margin-bottom: 12rpx;

  &.alert-title {
    color: #DC2626;
  }
}

.section-content-box {
  background: #F8FAFC;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 1rpx solid #F1F5F9;

  &.alert-box {
    background: rgba(239, 68, 68, 0.02);
    border: 1rpx dashed rgba(239, 68, 68, 0.15);
  }
}

.section-content {
  font-size: 25rpx;
  color: #334155;
  line-height: 1.6;
  text-align: justify;
}

/* 超声大图画廊 */
.image-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 6rpx;
}

.gallery-image {
  width: 140rpx;
  height: 140rpx;
  border-radius: 12rpx;
  border: 1rpx solid #E2E8F0;
}

/* 底部免责 */
.footer-note {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 16rpx 64rpx 16rpx;
}

.note-text {
  font-size: 20rpx;
  color: #94A3B8;
  line-height: 1.6;
  text-align: center;
}

/* 微动画效果 */
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}

.animate-scale-up {
  animation: scaleUp 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8rpx); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scaleUp {
  from { transform: scale(0.96); opacity: 0.8; }
  to { transform: scale(1); opacity: 1; }
}

.empty {
  padding: 120rpx 32rpx;
}
</style>

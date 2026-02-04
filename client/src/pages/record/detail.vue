<template>
  <view class="detail-wrapper">
    <u-navbar title="记录详情" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="detail-body">
      <!-- 日期头部 -->
      <view class="date-header">
        <text class="date">{{ record.recordDate }}</text>
        <view class="status-tag" :class="getTshStatus(record.TSH).type + '-bg'">
          {{ getTshStatus(record.TSH).text }}
        </view>
      </view>

      <!-- 化验指标区域 -->
      <view class="section-card">
        <view class="section-title">
          <u-icon name="file-text" size="18" color="#3E7BFF"></u-icon>
          <text>血液化验指标</text>
        </view>
        
        <view class="metrics-grid">
          <view class="metric-item" v-for="item in labMetrics" :key="item.key">
            <text class="val">{{ record[item.key] || '-' }}</text>
            <text class="label">{{ item.label }}</text>
          </view>
        </view>
        
        <!-- 化验单原图 -->
        <view class="images-area" v-if="record.reportImage && record.reportImage.length">
          <text class="img-title">化验单原件</text>
          <view class="img-list">
            <image 
              v-for="(img, idx) in record.reportImage" 
              :key="idx" 
              :src="getImageUrl(img)" 
              mode="aspectFill"
              @click="previewImage(record.reportImage, idx)"
            ></image>
          </view>
        </view>
      </view>

      <!-- B超报告区域 -->
      <view class="section-card" v-if="hasUltrasoundData">
        <view class="section-title">
          <u-icon name="scan" size="18" color="#3E7BFF"></u-icon>
          <text>B超报告</text>
          <text class="sub-date" v-if="record.ultrasoundDate">{{ record.ultrasoundDate }}</text>
        </view>
        
        <view class="us-info">
          <view class="us-row" v-if="record.thyroidLeft">
            <text class="us-label">左叶：</text>
            <text class="us-val">{{ record.thyroidLeft }}</text>
          </view>
          <view class="us-row" v-if="record.thyroidRight">
            <text class="us-label">右叶：</text>
            <text class="us-val">{{ record.thyroidRight }}</text>
          </view>
          <view class="us-row" v-if="record.isthmus">
            <text class="us-label">峡部：</text>
            <text class="us-val">{{ record.isthmus }}</text>
          </view>
          <view class="us-row" v-if="record.noduleCount">
            <text class="us-label">结节数量：</text>
            <text class="us-val">{{ record.noduleCount }}</text>
          </view>
          <view class="us-row" v-if="record.noduleSize">
            <text class="us-label">最大结节：</text>
            <text class="us-val">{{ record.noduleSize }}</text>
          </view>
          <view class="us-row" v-if="record.tiradsLevel">
            <text class="us-label">TI-RADS：</text>
            <text class="us-val highlight">{{ record.tiradsLevel }}</text>
          </view>
        </view>
        
        <!-- B超报告原文 -->
        <view class="raw-note" v-if="record.ultrasoundNote">
          <text class="note-label">报告原文：</text>
          <text class="note-content">{{ record.ultrasoundNote }}</text>
        </view>
        
        <!-- B超报告原图 -->
        <view class="images-area" v-if="record.ultrasoundImage && record.ultrasoundImage.length">
          <text class="img-title">B超报告原件</text>
          <view class="img-list">
            <image 
              v-for="(img, idx) in record.ultrasoundImage" 
              :key="idx" 
              :src="getImageUrl(img)" 
              mode="aspectFill"
              @click="previewImage(record.ultrasoundImage, idx)"
            ></image>
          </view>
        </view>
      </view>

      <!-- 备注区域 -->
      <view class="section-card" v-if="record.feeling">
        <view class="section-title">
          <u-icon name="edit-pen" size="18" color="#3E7BFF"></u-icon>
          <text>自我感觉</text>
        </view>
        <text class="feeling-text">{{ record.feeling }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import http from '@/utils/request.js';

const props = defineProps({
  id: { type: [String, Number], required: true }
});

const record = ref({});

const labMetrics = [
  { key: 'TSH', label: 'TSH' },
  { key: 'FT4', label: 'FT4' },
  { key: 'FT3', label: 'FT3' },
  { key: 'T3', label: 'T3' },
  { key: 'T4', label: 'T4' },
  { key: 'TPOAb', label: 'TPOAb' },
  { key: 'TGAb', label: 'TGAb' },
  { key: 'Tg', label: 'Tg' },
  { key: 'Calcitonin', label: '降钙素' },
  { key: 'Calcium', label: '血钙' },
  { key: 'PTH', label: 'PTH' }
];

const hasUltrasoundData = computed(() => {
  return record.value.thyroidLeft || record.value.noduleCount || record.value.ultrasoundImage?.length;
});

const getTshStatus = (tsh) => {
  if (!tsh) return { text: '未录入TSH', type: 'info' };
  if (tsh > 4.2) return { text: 'TSH 偏高', type: 'error' };
  if (tsh < 0.27) return { text: 'TSH 偏低', type: 'warning' };
  return { text: '指标正常', type: 'success' };
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `http://localhost:3000${path}`;
};

const previewImage = (images, current) => {
  const urls = images.map(img => getImageUrl(img));
  uni.previewImage({
    urls,
    current: urls[current]
  });
};

const fetchDetail = async () => {
  try {
    const res = await http.get(`/api/record/${props.id}`);
    record.value = res;
  } catch (err) {
    uni.$u.toast('获取记录失败');
    console.error(err);
  }
};

onMounted(() => {
  fetchDetail();
});
</script>

<style lang="scss" scoped>
.detail-wrapper {
  background-color: #F6F8FC;
  min-height: 100vh;
}

.detail-body {
  padding: 32rpx;
}

.date-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
  
  .date {
    font-size: 36rpx;
    font-weight: 800;
    color: #1D2129;
  }
  
  .status-tag {
    font-size: 22rpx;
    padding: 8rpx 20rpx;
    border-radius: 8rpx;
  }
}

.section-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  
  text {
    font-size: 30rpx;
    font-weight: 700;
    color: #1D2129;
    margin-left: 12rpx;
  }
  
  .sub-date {
    font-size: 24rpx;
    color: #86909C;
    margin-left: auto;
    font-weight: 400;
  }
}

.metrics-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  
  .metric-item {
    width: calc(33.33% - 12rpx);
    background: #F6F8FC;
    border-radius: 12rpx;
    padding: 20rpx;
    text-align: center;
    
    .val {
      display: block;
      font-size: 32rpx;
      font-weight: 800;
      color: #1D2129;
      margin-bottom: 8rpx;
    }
    
    .label {
      font-size: 22rpx;
      color: #86909C;
    }
  }
}

.us-info {
  .us-row {
    display: flex;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #F2F3F5;
    
    &:last-child { border-bottom: none; }
    
    .us-label {
      font-size: 26rpx;
      color: #86909C;
      width: 160rpx;
    }
    
    .us-val {
      font-size: 26rpx;
      color: #1D2129;
      flex: 1;
      
      &.highlight {
        color: #3E7BFF;
        font-weight: 700;
      }
    }
  }
}

.raw-note {
  margin-top: 24rpx;
  background: #F8FAFF;
  border-radius: 12rpx;
  padding: 20rpx;
  
  .note-label {
    font-size: 24rpx;
    color: #86909C;
    display: block;
    margin-bottom: 12rpx;
  }
  
  .note-content {
    font-size: 26rpx;
    color: #4E5969;
    line-height: 1.6;
  }
}

.images-area {
  margin-top: 24rpx;
  
  .img-title {
    font-size: 24rpx;
    color: #86909C;
    display: block;
    margin-bottom: 16rpx;
  }
  
  .img-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    
    image {
      width: 160rpx;
      height: 160rpx;
      border-radius: 12rpx;
      object-fit: cover;
    }
  }
}

.feeling-text {
  font-size: 28rpx;
  color: #4E5969;
  line-height: 1.6;
}

// 状态标签样式
.info-bg { background: #F2F3F5; color: #86909C; }
.success-bg { background: rgba(39, 194, 76, 0.1); color: #27C24C; }
.warning-bg { background: rgba(255, 144, 43, 0.1); color: #FF902B; }
.error-bg { background: rgba(240, 80, 80, 0.1); color: #F05050; }
</style>

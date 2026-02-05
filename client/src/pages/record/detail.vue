<template>
  <view class="detail-wrapper">
    <u-navbar title="记录详情" autoBack placeholder :titleStyle="{fontWeight: '700'}">
      <template #right>
        <view class="nav-right" @click="showAction = true">
          <u-icon name="more-dot-fill" size="24" color="#1D2129"></u-icon>
        </view>
      </template>
    </u-navbar>
    
    <view class="detail-body">
      <!-- 日期头部 -->
      <view class="date-header">
        <text class="date">{{ record.recordDate }}</text>
      </view>

      <!-- 化验指标区域 -->
      <view class="section-card" v-if="hasLabData">
        <view class="section-title">
          <u-icon name="file-text" size="18" color="#3E7BFF"></u-icon>
          <text>血液化验指标</text>
        </view>
        
        <view class="metrics-grid">
          <view class="metric-item" v-for="item in visibleLabMetrics" :key="item.key">
            <view class="val-box">
              <text class="val" :style="{color: getIndicatorInfo(record[item.key], item.ref).color}">{{ record[item.key] }}</text>
              <u-icon v-if="getIndicatorInfo(record[item.key], item.ref).icon" :name="getIndicatorInfo(record[item.key], item.ref).icon" size="12" :color="getIndicatorInfo(record[item.key], item.ref).color"></u-icon>
            </view>
            <view class="label-group">
              <text class="label">{{ item.label }}</text>
              <text class="unit" v-if="item.unit">{{ item.unit }}</text>
            </view>
            <text class="ref-text" v-if="item.ref">参考: {{ item.ref }}</text>
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
          <view class="us-row" v-if="record.noduleMaxSize">
            <text class="us-label">最大结节：</text>
            <text class="us-val">{{ record.noduleMaxSize }}</text>
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



      <!-- 操作菜单 -->
      <u-action-sheet
        :show="showAction"
        :actions="actions"
        @close="showAction = false"
        @select="onActionSelect"
        cancelText="取消"
      ></u-action-sheet>

      <!-- 删除确认对话框 -->
      <u-modal
        :show="showDeleteConfirm"
        title="确认删除"
        content="删除后记录将无法恢复，确定要删除吗？"
        showCancelButton
        @confirm="confirmDelete"
        @cancel="showDeleteConfirm = false"
      ></u-modal>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';
import { getIndicatorInfoFromRef } from '@/utils/indicator.js';

const props = defineProps({
  id: { type: [String, Number], required: true }
});

const onBack = () => {
  uni.navigateBack();
};

const record = ref({});
const showAction = ref(false);
const showDeleteConfirm = ref(false);

const actions = ref([
  { name: '编辑记录', value: 'edit', color: '#3E7BFF' },
  { name: '删除记录', value: 'delete', color: '#F53F3F' }
]);

const onActionSelect = (e) => {
  if (e.value === 'edit') {
    uni.navigateTo({
      url: `/pages/record/add?id=${props.id}`
    });
  } else if (e.value === 'delete') {
    showDeleteConfirm.value = true;
  }
};

const confirmDelete = async () => {
  try {
    await http.delete(`/api/record/${props.id}`);
    uni.$u.toast('已删除');
    setTimeout(() => {
      uni.navigateBack();
    }, 1000);
  } catch (err) {
    uni.$u.toast('删除失败');
    console.error(err);
  } finally {
    showDeleteConfirm.value = false;
  }
};

const labMetrics = [
  { key: 'TSH', label: 'TSH', unit: 'mIU/L', ref: '0.27 - 4.2' },
  { key: 'FT4', label: 'FT4', unit: 'pmol/L', ref: '12 - 22' },
  { key: 'FT3', label: 'FT3', unit: 'pmol/L', ref: '3.1 - 6.8' },
  { key: 'T3', label: 'T3', unit: 'nmol/L', ref: '1.3 - 3.1' },
  { key: 'T4', label: 'T4', unit: 'nmol/L', ref: '66 - 181' },
  { key: 'TPOAb', label: 'TPOAb', unit: 'IU/mL', ref: '< 34' },
  { key: 'TGAb', label: 'TGAb', unit: 'IU/mL', ref: '< 115' },
  { key: 'Tg', label: 'Tg', unit: 'ng/mL', ref: '< 77' },
  { key: 'Calcitonin', label: '降钙素', unit: 'pg/mL', ref: '< 9.52' },
  { key: 'Calcium', label: '血钙', unit: 'mmol/L', ref: '2.11 - 2.52' },
  { key: 'PTH', label: 'PTH', unit: 'pg/mL', ref: '15 - 65' }
];

const hasUltrasoundData = computed(() => {
  return record.value.thyroidLeft || record.value.noduleCount || record.value.ultrasoundImage?.length || record.value.tiradsLevel;
});

const hasLabData = computed(() => {
  return labMetrics.some(item => record.value[item.key] !== undefined && record.value[item.key] !== null && record.value[item.key] !== '');
});

const visibleLabMetrics = computed(() => {
  return labMetrics.filter(item => record.value[item.key] !== undefined && record.value[item.key] !== null && record.value[item.key] !== '');
});

// 指标判断方法，转换颜色格式以适配本组件的显示需求
const getIndicatorInfo = (val, refStr) => {
  const result = getIndicatorInfoFromRef(val, refStr);
  // 转换为十六进制颜色值
  const colorMap = {
    'error': '#F53F3F',
    'warning': '#FF7D00',
    'success': '#00B42A',
    'gray': '#86909C'
  };
  return {
    ...result,
    color: colorMap[result.color] || '#86909C'
  };
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

onShow(() => {
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
  padding-bottom: calc(env(safe-area-inset-bottom) + 40rpx);
}

.nav-right {
  padding-right: 32rpx;
  display: flex;
  align-items: center;
  
  .edit-text {
    font-size: 28rpx;
    color: #3E7BFF;
    font-weight: 700;
  }
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  
  .metric-item {
    background: #F8FAFF;
    border-radius: 16rpx;
    padding: 16rpx 8rpx;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 1rpx solid #F0F5FF;
    min-width: 0; // 防止内容撑开容器
    
    .val-box {
      display: flex;
      align-items: center;
      gap: 4rpx;
      margin-bottom: 4rpx;
      
      .val {
        font-size: 30rpx;
        font-weight: 900;
        font-family: 'DIN Condensed', sans-serif;
      }
    }
    
    .label-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 6rpx;
      line-height: 1.2;
      
      .label {
        font-size: 20rpx;
        color: #1D2129;
        font-weight: 700;
      }
      
      .unit {
        font-size: 16rpx;
        color: #C9CDD4;
        font-weight: 500;
      }
    }
    
    .ref-text {
      font-size: 14rpx;
      color: #86909C;
      font-weight: 400;
      white-space: nowrap;
      transform: scale(0.85);
      margin-top: 2rpx;
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

.danger-zone {
  margin-top: 60rpx;
  padding: 20rpx 0;
  display: flex;
  justify-content: center;
  
  .delete-btn {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 30rpx;
    background: #F2F3F5;
    border-radius: 40rpx;
    
    text {
      font-size: 24rpx;
      color: #86909C;
      font-weight: 600;
    }
    
    &:active {
      background: #E5E6EB;
    }
  }
}

// 状态标签样式
.info-bg { background: #F2F3F5; color: #86909C; }
.success-bg { background: rgba(39, 194, 76, 0.1); color: #27C24C; }
.warning-bg { background: rgba(255, 144, 43, 0.1); color: #FF902B; }
.error-bg { background: rgba(240, 80, 80, 0.1); color: #F05050; }

/* 底部固定操作栏已移除，统一使用顶部菜单 */
</style>

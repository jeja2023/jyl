<template>
  <view class="trend-wrapper">
    <!-- 顶部切换 -->
    <view class="trend-header">
      <view class="tab-bar">
        <view 
          v-for="tab in tabs" 
          :key="tab.key" 
          class="tab-item"
          :class="{active: currentTab === tab.key}"
          @click="currentTab = tab.key"
        >
          {{ tab.name }}
        </view>
      </view>
    </view>

    <!-- 趋势图表区域 -->
    <view class="chart-section" v-if="list.length > 0">
      <view class="chart-card">
        <view class="chart-title">
          <text class="title">{{ currentTabName }}趋势</text>
          <text class="sub">近{{ chartData.labels.length }}次检查</text>
        </view>
        
        <!-- 简易折线图 (使用 Canvas) -->
        <view class="chart-container">
          <canvas canvas-id="trendChart" class="trend-canvas" :style="{width: canvasWidth + 'px', height: '200px'}"></canvas>
        </view>
        
        <!-- 最新值显示 -->
        <view class="latest-value" v-if="latestValue">
          <text class="label">最新值</text>
          <text class="value" :class="valueStatus">{{ latestValue }}</text>
          <text class="unit">{{ currentUnit }}</text>
        </view>
      </view>
      
      <!-- 参考范围 -->
      <view class="ref-card">
        <text class="ref-title">参考范围</text>
        <view class="ref-range">
          <text>{{ currentRefRange }}</text>
        </view>
      </view>
    </view>

    <!-- 历史记录列表 -->
    <view class="history-section">
      <view class="section-header">
        <text class="title">检查记录</text>
        <text class="count">共{{ list.length }}条</text>
      </view>
      
      <view class="record-list" v-if="list.length > 0">
        <view class="record-item" v-for="(item, index) in list" :key="index" @click="navigateToDetail(item.id)">
          <view class="record-date">{{ formatDate(item.recordDate) }}</view>
          <view class="record-values">
            <view class="val-item">
              <text class="val">{{ item.TSH || '-' }}</text>
              <text class="label">TSH</text>
            </view>
            <view class="val-item">
              <text class="val">{{ item.FT4 || '-' }}</text>
              <text class="label">FT4</text>
            </view>
            <view class="val-item">
              <text class="val">{{ item.FT3 || '-' }}</text>
              <text class="label">FT3</text>
            </view>
          </view>
          <u-icon name="arrow-right" size="16" color="#C9CDD4"></u-icon>
        </view>
      </view>
      
      <u-empty v-else mode="data" text="暂无检查记录" marginTop="60"></u-empty>
    </view>

    <!-- 悬浮按钮 -->
    <view class="fab-btn" @click="navigateToAdd">
      <u-icon name="plus" color="#fff" size="28"></u-icon>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const list = ref([]);
const currentTab = ref('TSH');
const canvasWidth = ref(300);

const tabs = [
  { key: 'TSH', name: 'TSH', unit: 'mIU/L', ref: '0.27 - 4.2' },
  { key: 'FT4', name: 'FT4', unit: 'pmol/L', ref: '12 - 22' },
  { key: 'FT3', name: 'FT3', unit: 'pmol/L', ref: '3.1 - 6.8' },
  { key: 'Tg', name: 'Tg', unit: 'ng/mL', ref: '< 77' },
  { key: 'Calcium', name: '血钙', unit: 'mmol/L', ref: '2.11 - 2.52' }
];

const currentTabName = computed(() => tabs.find(t => t.key === currentTab.value)?.name || '');
const currentUnit = computed(() => tabs.find(t => t.key === currentTab.value)?.unit || '');
const currentRefRange = computed(() => tabs.find(t => t.key === currentTab.value)?.ref || '');

// 图表数据
const chartData = computed(() => {
  const reversed = [...list.value].reverse().slice(-12); // 最近12条，按时间升序
  const labels = reversed.map(item => {
    const d = new Date(item.recordDate);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const values = reversed.map(item => parseFloat(item[currentTab.value]) || null);
  return { labels, values };
});

// 最新值
const latestValue = computed(() => {
  if (list.value.length === 0) return null;
  return list.value[0][currentTab.value] || null;
});

// 值状态（正常/偏高/偏低）
const valueStatus = computed(() => {
  const val = latestValue.value;
  if (!val) return '';
  if (currentTab.value === 'TSH') {
    if (val > 4.2) return 'high';
    if (val < 0.27) return 'low';
  }
  return 'normal';
});

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// 绘制图表
const drawChart = () => {
  const ctx = uni.createCanvasContext('trendChart');
  const { labels, values } = chartData.value;
  
  if (labels.length === 0) return;
  
  const width = canvasWidth.value;
  const height = 200;
  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // 计算数据范围
  const validValues = values.filter(v => v !== null);
  if (validValues.length === 0) return;
  
  const minVal = Math.min(...validValues) * 0.8;
  const maxVal = Math.max(...validValues) * 1.2;
  const range = maxVal - minVal || 1;
  
  // 清空画布
  ctx.clearRect(0, 0, width, height);
  
  // 绘制网格线
  ctx.setStrokeStyle('#F2F3F5');
  ctx.setLineWidth(1);
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  
  // 绘制折线
  ctx.setStrokeStyle('#3E7BFF');
  ctx.setLineWidth(2);
  ctx.beginPath();
  
  let firstPoint = true;
  const points = [];
  
  for (let i = 0; i < values.length; i++) {
    if (values[i] === null) continue;
    
    const x = padding.left + (chartWidth / (labels.length - 1 || 1)) * i;
    const y = padding.top + chartHeight - ((values[i] - minVal) / range) * chartHeight;
    
    points.push({ x, y, value: values[i], label: labels[i] });
    
    if (firstPoint) {
      ctx.moveTo(x, y);
      firstPoint = false;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  // 绘制数据点
  points.forEach((p, idx) => {
    ctx.setFillStyle('#FFFFFF');
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.setStrokeStyle('#3E7BFF');
    ctx.setLineWidth(2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // 最后一个点高亮
    if (idx === points.length - 1) {
      ctx.setFillStyle('#3E7BFF');
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  
  // 绘制X轴标签
  ctx.setFillStyle('#86909C');
  ctx.setFontSize(10);
  ctx.setTextAlign('center');
  labels.forEach((label, i) => {
    const x = padding.left + (chartWidth / (labels.length - 1 || 1)) * i;
    ctx.fillText(label, x, height - 15);
  });
  
  ctx.draw();
};

// 获取数据
const fetchList = async () => {
  if (!userStore.isLogin) return;
  try {
    const res = await http.get('/api/record/list');
    list.value = res.list;
    await nextTick();
    drawChart();
  } catch (err) {
    console.error(err);
  }
};

// 监听 tab 切换重绘图表
watch(currentTab, () => {
  nextTick(() => drawChart());
});

const navigateToAdd = () => {
  uni.navigateTo({ url: '/pages/record/add' });
};

const navigateToDetail = (id) => {
  uni.navigateTo({ url: `/pages/record/detail?id=${id}` });
};

onMounted(() => {
  // 获取屏幕宽度
  const sysInfo = uni.getSystemInfoSync();
  canvasWidth.value = sysInfo.windowWidth - 64;
  fetchList();
});

onShow(() => {
  fetchList();
});
</script>

<style lang="scss" scoped>
.trend-wrapper {
  min-height: 100vh;
  background-color: #F8FAFF;
  padding-bottom: calc(env(safe-area-inset-bottom) + 140rpx);
}

// 顶部头部升级
.trend-header {
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
  padding: 40rpx 32rpx 80rpx;
  border-radius: 0 0 40rpx 40rpx;
  
  .tab-bar {
    display: flex;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(10px);
    border-radius: 20rpx;
    padding: 6rpx;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    .tab-item {
      flex: 1;
      text-align: center;
      padding: 18rpx 0;
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.8);
      border-radius: 16rpx;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
      
      &.active {
        background: #FFFFFF;
        color: #3E7BFF;
        font-weight: 800;
        box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
      }
    }
  }
}

// 图表区域升级 - 浮动效果
.chart-section {
  padding: 0 32rpx;
  margin-top: -50rpx;
}

.chart-card {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 36rpx;
  box-shadow: 0 15rpx 40rpx rgba(62, 123, 255, 0.1);
  border: 1px solid rgba(62, 123, 255, 0.05);
  
  .chart-title {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .title {
      font-size: 34rpx;
      font-weight: 900;
      color: #1D2129;
    }
    
    .sub {
      font-size: 22rpx;
      color: #86909C;
      background: #F2F7FF;
      padding: 4rpx 16rpx;
      border-radius: 30rpx;
      font-weight: 600;
    }
  }
  
  .chart-container {
    width: 100%;
    height: 200px;
    margin: 20rpx 0;
  }
  
  .trend-canvas {
    width: 100%;
    height: 200px;
  }
  
  .latest-value {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 30rpx;
    padding-top: 30rpx;
    border-top: 1px dashed #F2F3F5;
    
    .label {
      font-size: 26rpx;
      color: #86909C;
      margin-right: 20rpx;
      font-weight: 500;
    }
    
    .value {
      font-size: 56rpx;
      font-weight: 900;
      color: #4AE68A;
      font-family: 'DIN Condensed', -apple-system, sans-serif;
      line-height: 1;
      
      &.high { color: #F53F3F; }
      &.low { color: #FF7D00; }
    }
    
    .unit {
      font-size: 24rpx;
      color: #C9CDD4;
      margin-left: 10rpx;
      align-self: flex-end;
      margin-bottom: 8rpx;
      font-weight: 700;
    }
  }
}

.ref-card {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #F8FAFF 0%, #F2F7FF 100%);
  border-radius: 20rpx;
  padding: 24rpx 36rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(62, 123, 255, 0.05);
  
  .ref-title {
    font-size: 26rpx;
    color: #86909C;
    font-weight: 600;
  }
  
  .ref-range text {
    font-size: 30rpx;
    color: #3E7BFF;
    font-weight: 800;
    font-family: 'DIN Condensed', sans-serif;
  }
}

// 历史记录列表升级
.history-section {
  padding: 40rpx 32rpx;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 24rpx;
    padding: 0 8rpx;
    
    .title {
      font-size: 36rpx;
      font-weight: 900;
      color: #1D2129;
      position: relative;
      &::after {
        content: '';
        position: absolute;
        bottom: 4rpx;
        left: 0;
        width: 100%;
        height: 12rpx;
        background: rgba(62, 123, 255, 0.1);
        z-index: -1;
      }
    }
    
    .count {
      font-size: 24rpx;
      color: #C9CDD4;
      font-weight: 700;
    }
  }
}

.record-list {
  background: #FFFFFF;
  border-radius: 36rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.02);
}

.record-item {
  display: flex;
  align-items: center;
  padding: 36rpx 28rpx;
  border-bottom: 1px solid #F8FAFF;
  
  &:last-child { border-bottom: none; }
  &:active { background: #F2F7FF; }
  
  .record-date {
    display: flex;
    flex-direction: column;
    width: 160rpx;
    
    font-size: 28rpx;
    color: #4E5969;
    font-weight: 700;
    font-family: 'DIN Condensed', sans-serif;
  }
  
  .record-values {
    flex: 1;
    display: flex;
    
    .val-item {
      flex: 1;
      text-align: center;
      
      .val {
        display: block;
        font-size: 32rpx;
        font-weight: 800;
        color: #1D2129;
        font-family: 'DIN Condensed', sans-serif;
      }
      
      .label {
        font-size: 18rpx;
        color: #C9CDD4;
        font-weight: 700;
        text-transform: uppercase;
      }
    }
  }
}

// 悬浮按钮美化
.fab-btn {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom) + 160rpx);
  right: 40rpx;
  width: 110rpx;
  height: 110rpx;
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 15rpx 35rpx rgba(62, 123, 255, 0.4);
  border: 4rpx solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s;
  
  &:active {
    transform: scale(0.9) rotate(90deg);
  }
}
</style>

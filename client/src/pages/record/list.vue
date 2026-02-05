<template>
  <view class="trend-wrapper">
    <!-- 顶部切换 -->
    <view class="trend-header">
      <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
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
      </scroll-view>
    </view>

    <!-- 趋势图表区域 -->
    <view class="chart-section" v-if="list.length > 0">
      <view class="chart-card">
        <view class="chart-title">
          <view class="title-left">
            <text class="title">{{ currentTabName }}趋势</text>
            <text class="full">{{ currentFullName }}</text>
          </view>
          <view class="title-right">
            <view class="zoom-btn" @click="changeCount('zoomIn')"><u-icon name="minus" size="12"></u-icon></view>
            <text class="sub">显示{{ chartData.labels.length }}次</text>
            <view class="zoom-btn" @click="changeCount('zoomOut')"><u-icon name="plus" size="12"></u-icon></view>
          </view>
        </view>
        
        <!-- 简易折线图 (使用 Canvas) -->
        <view class="chart-container">
          <canvas canvas-id="trendChart" class="trend-canvas" :style="{width: canvasWidth + 'px', height: '200px'}"></canvas>
        </view>
        
        <!-- 最新值显示 -->
        <view class="latest-value" v-if="latestValue">
          <text class="label">最新值</text>
          <view class="value-box">
             <u-icon v-if="valueStatusInfo.icon" :name="valueStatusInfo.icon" size="18" :color="valueStatusInfo.color === 'error' ? '#F53F3F' : '#FF7D00'"></u-icon>
             <text class="value" :class="'color-' + valueStatusInfo.color">{{ latestValue }}</text>
          </view>
          <text class="unit">{{ currentUnit }}</text>
        </view>
      </view>
      
      <!-- 参考范围 -->
      <view class="ref-card">
        <text class="ref-title">参考范围</text>
        <view class="ref-range">
          <text>{{ currentRefRange }} <text class="ref-unit">{{ currentUnit }}</text></text>
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
          <view class="item-inner">
            <view class="record-left">
              <view class="record-date">{{ formatDate(item.recordDate).substring(5) }}</view>
              <view class="record-year">{{ formatDate(item.recordDate).substring(0,4) }}</view>
            </view>
            
            <view class="record-center">
              <!-- 血检数据部分 -->
              <view class="blood-metrics" v-if="item.TSH || item.FT4 || item.FT3">
                <view class="val-item">
                  <text class="val" :class="'color-' + getIndicatorInfo(item.TSH, 0.27, 4.2).color">{{ item.TSH || '-' }}</text>
                  <text class="label">TSH</text>
                  <u-icon v-if="getIndicatorInfo(item.TSH, 0.27, 4.2).icon" :name="getIndicatorInfo(item.TSH, 0.27, 4.2).icon" size="8" :color="getIndicatorInfo(item.TSH, 0.27, 4.2).color === 'error' ? '#F53F3F' : '#FF7D00'" class="mini-arrow"></u-icon>
                </view>
                <view class="val-item">
                  <text class="val" :class="'color-' + getIndicatorInfo(item.FT4, 12, 22).color">{{ item.FT4 || '-' }}</text>
                  <text class="label">FT4</text>
                  <u-icon v-if="getIndicatorInfo(item.FT4, 12, 22).icon" :name="getIndicatorInfo(item.FT4, 12, 22).icon" size="8" :color="getIndicatorInfo(item.FT4, 12, 22).color === 'error' ? '#F53F3F' : '#FF7D00'" class="mini-arrow"></u-icon>
                </view>
                <view class="val-item">
                  <text class="val" :class="'color-' + getIndicatorInfo(item.FT3, 3.1, 6.8).color">{{ item.FT3 || '-' }}</text>
                  <text class="label">FT3</text>
                  <u-icon v-if="getIndicatorInfo(item.FT3, 3.1, 6.8).icon" :name="getIndicatorInfo(item.FT3, 3.1, 6.8).icon" size="8" :color="getIndicatorInfo(item.FT3, 3.1, 6.8).color === 'error' ? '#F53F3F' : '#FF7D00'" class="mini-arrow"></u-icon>
                </view>
              </view>

              <!-- B超状态标记 (如果是混合录入或纯B超) -->
              <view class="us-entry" v-if="item.thyroidLeft || item.noduleCount || item.tiradsLevel || hasUltrasoundImages(item.ultrasoundImage)">
                 <view class="us-tag" :class="{'mini': item.TSH || item.FT4 || item.FT3}">
                    <u-icon name="photo-fill" size="14" :color="item.TSH ? '#86909C' : '#3E7BFF'"></u-icon>
                    <text>B超报告</text>
                    <text class="level" v-if="item.tiradsLevel">TI-RADS {{ item.tiradsLevel }}</text>
                 </view>
              </view>
            </view>

            <u-icon name="arrow-right" size="14" color="#E5E6EB"></u-icon>
          </view>
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
import { getIndicatorInfo, getIndicatorInfoFromRef } from '@/utils/indicator.js';

const userStore = useUserStore();
const list = ref([]);
const currentTab = ref('TSH');
const canvasWidth = ref(300);

const displayCount = ref(6); // 默认显示近6次

const changeCount = (type) => {
  if (type === 'zoomOut') {
    if (displayCount.value < 20) displayCount.value += 2;
  } else {
    if (displayCount.value > 2) displayCount.value -= 2;
  }
};

const tabs = [
  { key: 'TSH', name: 'TSH', fullName: '促甲状腺激素', unit: 'mIU/L', ref: '0.27 - 4.2', color: '#3E7BFF' },
  { key: 'FT4', name: 'FT4', fullName: '游离甲状腺素', unit: 'pmol/L', ref: '12 - 22', color: '#FF7D00' },
  { key: 'FT3', name: 'FT3', fullName: '游离三碘甲状腺原氨酸', unit: 'pmol/L', ref: '3.1 - 6.8', color: '#F53F3F' },
  { key: 'T3', name: 'T3', fullName: '三碘甲状腺原氨酸', unit: 'nmol/L', ref: '1.3 - 3.1', color: '#722ED1' },
  { key: 'T4', name: 'T4', fullName: '总甲状腺素', unit: 'nmol/L', ref: '66 - 181', color: '#13C2C2' },
  { key: 'TPOAb', name: 'TPOAb', fullName: '甲状腺过氧化物酶抗体', unit: 'IU/mL', ref: '< 34', color: '#EB2F96' },
  { key: 'TGAb', name: 'TGAb', fullName: '甲状腺球蛋白抗体', unit: 'IU/mL', ref: '< 115', color: '#2F54EB' },
  { key: 'Tg', name: 'Tg', fullName: '甲状腺球蛋白', unit: 'ng/mL', ref: '< 77', color: '#FAAD14' },
  { key: 'Calcitonin', name: '降钙素', fullName: '降钙素', unit: 'pg/mL', ref: '< 9.52', color: '#A0D911' },
  { key: 'Calcium', name: '血钙', fullName: '血钙', unit: 'mmol/L', ref: '2.11 - 2.52', color: '#FA541C' },
  { key: 'PTH', name: 'PTH', fullName: '甲状旁腺激素', unit: 'pg/mL', ref: '15 - 65', color: '#2F54EB' }
];

const currentTabItem = computed(() => tabs.find(t => t.key === currentTab.value));
const currentTabName = computed(() => currentTabItem.value?.name || '');
const currentFullName = computed(() => currentTabItem.value?.fullName || '');
const currentUnit = computed(() => currentTabItem.value?.unit || '');
const currentRefRange = computed(() => currentTabItem.value?.ref || '');
const currentThemeColor = computed(() => currentTabItem.value?.color || '#3E7BFF');

// 图表数据
const chartData = computed(() => {
  const reversed = [...list.value].reverse().slice(-displayCount.value); // 按当前显示数量切片
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

// getIndicatorInfo 和 getIndicatorInfoFromRef 已从 @/utils/indicator.js 导入

// 值状态提示
const valueStatusInfo = computed(() => {
  return getIndicatorInfoFromRef(latestValue.value, currentRefRange.value);
});

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

// 安全检查是否有B超图片
const hasUltrasoundImages = (imgData) => {
  if (!imgData) return false;
  if (Array.isArray(imgData)) return imgData.length > 0;
  try {
    const arr = JSON.parse(imgData);
    return Array.isArray(arr) && arr.length > 0;
  } catch (e) {
    return !!imgData; // 如果是单字符串路径也认为有图片
  }
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
  ctx.setStrokeStyle(currentThemeColor.value);
  ctx.setLineWidth(2);
  ctx.beginPath();
  
  let firstPoint = true;
  const points = [];
  
  for (let i = 0; i < values.length; i++) {
    if (values[i] === null) continue;
    
    const x = padding.left + (chartWidth / (labels.length - 1 || 1)) * i;
    const y = padding.top + chartHeight - ((values[i] - minVal) / range) * chartHeight;
    
    // 判定异常颜色
    const status = getIndicatorInfoFromRef(values[i], currentRefRange.value);
    
    points.push({ x, y, value: values[i], label: labels[i], status });
    
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
    
    // 设置点的主色：如果是最后一个点且没有异常，用主题色；如果有异常，用异常色
    let dotColor = currentThemeColor.value;
    if (p.status.color === 'error') dotColor = '#F53F3F';
    else if (p.status.color === 'warning') dotColor = '#FF7D00';

    ctx.setStrokeStyle(dotColor);
    ctx.setLineWidth(2);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    
    // 高亮核心点
    if (p.status.color !== 'success' || idx === points.length - 1) {
      ctx.setFillStyle(dotColor);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制异常箭头
    if (p.status.icon) {
      ctx.setFillStyle(dotColor);
      ctx.setFontSize(10);
      const arrow = p.status.icon === 'arrow-up-fill' ? '↑' : '↓';
      ctx.fillText(arrow, p.x, p.y - 10);
    }

    // 绘制具体数值
    ctx.setFillStyle(p.status.color !== 'success' ? dotColor : '#86909C');
    ctx.setFontSize(10);
    ctx.setTextAlign('center');
    // 如果有箭头，数值放在箭头上方
    const textOffset = p.status.icon ? 22 : 12;
    ctx.fillText(p.value, p.x, p.y - textOffset);
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

watch(displayCount, () => {
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
  
  .tab-scroll {
    width: 100%;
    white-space: nowrap;
  }
  
  .tab-bar {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(10px);
    border-radius: 20rpx;
    padding: 6rpx;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    .tab-item {
      padding: 18rpx 32rpx;
      font-size: 26rpx;
      color: rgba(255, 255, 255, 0.8);
      border-radius: 16rpx;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
      flex-shrink: 0;
      
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
    
    .title-left {
      display: flex;
      flex-direction: column;
      
      .title {
        font-size: 34rpx;
        font-weight: 900;
        color: #1D2129;
      }
      
      .full {
        font-size: 20rpx;
        color: #86909C;
        margin-top: 4rpx;
        font-weight: 500;
      }
    }
    
    .title-right {
      display: flex;
      align-items: center;
      background: #F2F7FF;
      padding: 6rpx 12rpx;
      border-radius: 30rpx;
      gap: 12rpx;
      
      .sub {
        font-size: 22rpx;
        color: #3E7BFF;
        font-weight: 800;
        min-width: 80rpx;
        text-align: center;
      }
      
      .zoom-btn {
        width: 40rpx;
        height: 40rpx;
        background: #FFFFFF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2rpx 8rpx rgba(62, 123, 255, 0.1);
        
        &:active {
          transform: scale(0.9);
          background: #EEF4FF;
        }
      }
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

.value-box {
  display: flex;
  align-items: center;
  gap: 8rpx;
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
  padding: 32rpx 24rpx;
  border-bottom: 1px solid #F8FAFF;
  position: relative;
  
  &:last-child { border-bottom: none; }
  &:active { background: #F8FAFF; }
  
  // 左侧指示条
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 40%;
    background: #3E7BFF;
    border-radius: 0 4rpx 4rpx 0;
    opacity: 0;
    transition: all 0.3s;
  }
  
  &:active::before {
    opacity: 1;
    height: 60%;
  }

  .item-inner {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }
  
  .record-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100rpx;
    
    .record-date {
      font-size: 32rpx;
      font-weight: 900;
      color: #1D2129;
      font-family: 'DIN Condensed', sans-serif;
      line-height: 1;
    }
    
    .record-year {
      font-size: 20rpx;
      color: #C9CDD4;
      font-weight: 700;
      margin-top: 4rpx;
    }
  }
  
  .record-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
  }

  .blood-metrics {
    display: flex;
    justify-content: flex-start;
    gap: 40rpx;
    
    .val-item {
      display: flex;
      flex-direction: column;
      position: relative;
      
      .val {
        font-size: 32rpx;
        font-weight: 900;
        font-family: 'DIN Condensed', sans-serif;
        line-height: 1.2;
      }
      
      .label {
        font-size: 18rpx;
        color: #C9CDD4;
        font-weight: 700;
        margin-top: -2rpx;
      }
      
      .mini-arrow {
        position: absolute;
        top: -4rpx;
        right: -12rpx;
      }
    }
  }

  .us-entry {
    display: flex;
    
    .us-tag {
      display: flex;
      align-items: center;
      gap: 8rpx;
      background: #F2F7FF;
      padding: 8rpx 20rpx;
      border-radius: 12rpx;
      
      text {
        font-size: 24rpx;
        color: #3E7BFF;
        font-weight: 800;
      }
      
      .level {
        margin-left: 12rpx;
        font-size: 20rpx;
        color: #F53F3F;
        font-weight: 900;
        background: #FFF2F0;
        padding: 2rpx 10rpx;
        border-radius: 4rpx;
      }
      
      &.mini {
        background: #F8FAFF;
        padding: 4rpx 12rpx;
        border-radius: 8rpx;
        
        text {
          font-size: 22rpx;
          color: #86909C;
          font-weight: 700;
        }
        
        .level {
          font-weight: 700;
        }
      }
    }
  }
}

/* 颜色工具 */
.color-success { color: #00B42A !important; }
.color-warning { color: #FF7D00 !important; }
.color-error { color: #F53F3F !important; }
.color-gray { color: #C9CDD4 !important; }

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

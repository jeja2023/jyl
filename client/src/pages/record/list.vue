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
            <view class="zoom-btn" @click="changeCount('zoomOut')"><u-icon name="minus" size="12"></u-icon></view>
            <text class="sub">显示{{ chartData.labels.length }}次</text>
            <view class="zoom-btn" @click="changeCount('zoomIn')"><u-icon name="plus" size="12"></u-icon></view>
          </view>
        </view>
        
        <!-- 简易折线图 (使用 Canvas) -->
        <view class="chart-container" v-show="hasValidChartData">
          <canvas canvas-id="trendChart" class="trend-canvas" :style="{width: canvasWidth + 'px', height: '200px'}"></canvas>
        </view>
        <view class="empty-chart-box" v-show="!hasValidChartData">
           <text style="color: #C9CDD4; font-size: 26rpx;">近期记录中无此指标数据</text>
        </view>
        
        <!-- 最新值显示 -->
        <view class="latest-value" v-if="latestValue">
          <text class="label">最新值</text>
          <view class="value-box">
             <u-icon v-if="valueStatusInfo.icon" :name="valueStatusInfo.icon" size="18" :color="valueStatusInfo.color === 'error' ? '#F53F3F' : '#FF7D00'"></u-icon>
             <text class="value" :class="'color-' + valueStatusInfo.color">{{ latestValue }}</text>
          </view>
          <text class="unit" :class="{'detected': latestRecordWithTab?.units?.[currentTab]}">{{ latestUnit }}</text>
        </view>
      </view>
      
      <!-- 参考范围 -->
      <view class="ref-card">
        <text class="ref-title">参考范围</text>
        <view class="ref-range">
          <text>{{ currentRefRange }} <text class="ref-unit">{{ currentUnit }}</text></text>
        </view>
        <text class="ref-mid" v-if="refMidValue">参考中值：{{ refMidValue }}</text>
      </view>
    </view>

    <!-- 历史记录列表 -->
    <view class="history-section">
      <view class="section-header">
        <view class="title-info">
          <text class="title">检查记录</text>
          <text class="count">共{{ list.length }}条</text>
        </view>
        <view class="action-btns">
          <view class="export-btn import-btn" @click="handleImport()">
            <u-icon name="file-text" size="14" color="#722ED1"></u-icon>
            <text>导入数据</text>
          </view>
          <view class="export-btn" @click="handleExport()">
            <u-icon name="download" size="14" color="#3E7BFF"></u-icon>
            <text>导出记录</text>
          </view>
        </view>
      </view>
      
      <view class="record-list" v-if="list.length > 0">
        <view class="record-item" v-for="(item, index) in list" :key="index" @click="navigateToDetail(item.id)">
          <view class="item-inner">
            <view class="record-left">
              <view class="record-date">{{ formatDate(item.recordDate).substring(5) }}</view>
              <view class="record-year">{{ formatDate(item.recordDate).substring(0,4) }}</view>
            </view>
            
            <view class="record-center">
              <view class="member-tag" v-if="item.FamilyMember">
                <u-icon name="account" size="12" color="#3E7BFF"></u-icon>
                <text>{{ formatMember(item.FamilyMember) }}</text>
              </view>
              <!-- 血检数据部分 -->
              <view class="blood-metrics" v-if="hasBloodData(item)">
                <view class="val-item" v-for="metricKey in visibleListMetrics" :key="metricKey" v-show="item[metricKey] !== undefined && item[metricKey] !== null && item[metricKey] !== ''">
                  <text class="val" :class="'color-' + getIndicatorInfo(item[metricKey], getRefRange(metricKey)).color">{{ item[metricKey] }}</text>
                  <view class="label-row">
                    <text class="label" :class="{ 'active-tab-text': metricKey === currentTab }">{{ metricKey }}</text>
                    <text class="mini-unit" v-if="item.units?.[metricKey]">{{ item.units[metricKey] }}</text>
                  </view>
                  <u-icon v-if="getIndicatorInfo(item[metricKey], getRefRange(metricKey)).icon" :name="getIndicatorInfo(item[metricKey], getRefRange(metricKey)).icon" size="8" :color="getIndicatorInfo(item[metricKey], getRefRange(metricKey)).color === 'error' ? '#F53F3F' : '#FF7D00'" class="mini-arrow"></u-icon>
                </view>
              </view>

              <!-- B超状态标记 (如果是混合录入或纯B超) -->
              <view class="us-entry" v-if="item.thyroidLeft || item.noduleCount || item.tiradsLevel || hasUltrasoundImages(item.ultrasoundImage)">
                 <view class="us-tag" :class="{'mini': hasBloodData(item)}">
                    <u-icon name="photo-fill" size="14" :color="hasBloodData(item) ? '#86909C' : '#3E7BFF'"></u-icon>
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
import { getBaseURL } from '@/utils/config.js';
import { getIndicatorInfo, getIndicatorInfoFromRef } from '@/utils/indicator.js';
import { setCache, getCache } from '@/utils/cache.js';

const userStore = useUserStore();
const list = ref([]);
const currentTab = ref('TSH');
const canvasWidth = ref(300);
const displayCount = ref(6);

// 核心过滤逻辑：仅保留含有当前选定指标的记录用于趋势展示
const filteredList = computed(() => {
  return list.value.filter(item => {
    const val = item[currentTab.value];
    return val !== null && val !== undefined && val !== '' && val !== 'null';
  });
});

const changeCount = (type) => {
  const maxAvailable = filteredList.value.length;
  // 当切换指标时，如果当前显示点数超过了该指标的总记录数，先进行修正
  if (displayCount.value > maxAvailable && maxAvailable >= 2) {
    displayCount.value = maxAvailable;
  }

  if (type === 'zoomOut') {
    if (displayCount.value > 2) {
      displayCount.value -= 1;
    } else {
      uni.$u.toast('最少要求显示2次数据以构成趋势');
    }
  } else {
    if (displayCount.value < 20 && displayCount.value < maxAvailable) {
      displayCount.value += 1;
    } else if (displayCount.value >= maxAvailable) {
      uni.$u.toast('已是该指标的全部记录');
    } else {
      uni.$u.toast('最多支持查看近20次的数据');
    }
  }
};

const handleExport = (id) => {
  const token = userStore.token;
  const baseUrl = getBaseURL();
  let url = `${baseUrl}/api/record/export?token=${token}`;
  if (id) url += `&id=${id}`;
  
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
             uni.$u.toast('暂不支持此格式预览，请通过浏览器打开');
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

const handleImport = () => {
  // #ifdef H5
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx, .xls';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      await uploadImportData(event.target.result);
    };
    reader.readAsDataURL(file);
  };
  input.click();
  // #endif
  
  // #ifndef H5
  uni.chooseFile({
    count: 1,
    extension: ['.xlsx', '.xls'],
    success: (res) => {
      const fs = uni.getFileSystemManager();
      const base64 = fs.readFileSync(res.tempFilePaths[0], 'base64');
      uploadImportData('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + base64);
    }
  });
  // #endif
};

const uploadImportData = async (base64) => {
  uni.showLoading({ title: '正在导入...' });
  try {
    const res = await http.post('/api/record/import', { fileData: base64 });
    uni.hideLoading();
    uni.showModal({
      title: '导入成功',
      content: res.message || `成功导入 ${res.successCount} 条数据`,
      showCancel: false,
      success: () => fetchList()
    });
  } catch (err) {
    uni.hideLoading();
    uni.$u.toast(err.message || '导入失败');
  }
};

const tabs = [
  { key: 'TSH', name: 'TSH', fullName: '促甲状腺激素', unit: 'mIU/L', ref: '0.27 - 4.2', color: '#3E7BFF' },
  { key: 'FT4', name: 'FT4', fullName: '游离甲状腺素', unit: 'pmol/L', ref: '12 - 22', color: '#FF7D00' },
  { key: 'FT3', name: 'FT3', fullName: '游离三碘甲状腺原氨酸', unit: 'pmol/L', ref: '3.1 - 6.8', color: '#F53F3F' },
  { key: 'T3', name: 'T3', fullName: '三碘甲状腺原氨酸', unit: 'nmol/L', ref: '1.3 - 3.1', color: '#722ED1' },
  { key: 'T4', name: 'T4', fullName: '总甲状腺素', unit: 'nmol/L', ref: '66 - 181', color: '#13C2C2' },
  { key: 'TPOAb', name: 'TPO-Ab', fullName: '抗甲状腺过氧化物酶抗体', unit: 'IU/mL', ref: '< 34', color: '#EB2F96' },
  { key: 'TGAb', name: 'TG-Ab', fullName: '抗甲状腺球蛋白抗体', unit: 'IU/mL', ref: '< 115', color: '#2F54EB' },
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

const refMidValue = computed(() => {
  const ref = currentRefRange.value;
  if (!ref || typeof ref !== 'string') return '';
  if (ref.includes('-')) {
    const parts = ref.split('-');
    const min = parseFloat(parts[0]);
    const max = parseFloat(parts[1]);
    return (isNaN(min) || isNaN(max)) ? '' : ((min + max) / 2).toFixed(2);
  }
  if (ref.includes('<')) {
    const max = parseFloat(ref.replace('<', ''));
    return isNaN(max) ? '' : (max / 2).toFixed(2);
  }
  return '';
});

// 图表数据计算
const chartData = computed(() => {
  const reversed = [...filteredList.value].reverse().slice(-displayCount.value);
  const labels = reversed.map(item => {
    const d = new Date(item.recordDate);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const values = reversed.map(item => {
    const val = item[currentTab.value];
    if (val === null || val === undefined || val === '') return null;
    const match = String(val).match(/[0-9.]+/);
    return match ? parseFloat(match[0]) : null;
  });
  return { labels, values };
});

const latestRecordWithTab = computed(() => filteredList.value[0] || null);
const latestValue = computed(() => latestRecordWithTab.value ? latestRecordWithTab.value[currentTab.value] : null);
const latestUnit = computed(() => latestRecordWithTab.value?.units?.[currentTab.value] || currentUnit.value);

const valueStatusInfo = computed(() => {
  if (latestValue.value === null) return {};
  return getIndicatorInfoFromRef(latestValue.value, currentRefRange.value);
});

const hasValidChartData = computed(() => {
  return chartData.value.values.some(v => v !== null && v !== undefined && v !== '');
});

const visibleListMetrics = computed(() => {
    const defaults = ['TSH', 'FT4', 'FT3'];
    if (!defaults.includes(currentTab.value)) {
        return ['TSH', 'FT4', currentTab.value];
    }
    return defaults;
});

const getRefRange = (key) => tabs.find(t => t.key === key)?.ref || '';

const hasBloodData = (item) => {
    return visibleListMetrics.value.some(k => item[k] !== undefined && item[k] !== null && item[k] !== '');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const hasUltrasoundImages = (imgData) => {
  if (!imgData) return false;
  if (Array.isArray(imgData)) return imgData.length > 0;
  try {
    const arr = JSON.parse(imgData);
    return Array.isArray(arr) && arr.length > 0;
  } catch (e) {
    return !!imgData;
  }
};

const drawChart = () => {
  const ctx = uni.createCanvasContext('trendChart');
  const { labels, values } = chartData.value;
  if (labels.length === 0) return;
  
  const width = canvasWidth.value;
  const height = 200;
  const padding = { top: 30, right: 20, bottom: 40, left: 65 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (validValues.length === 0) return;

  let refMin = null, refMax = null;
  if (currentRefRange.value) {
    if (currentRefRange.value.includes('-')) {
      const parts = currentRefRange.value.split('-');
      refMin = parseFloat(parts[0]);
      refMax = parseFloat(parts[1]);
    } else if (currentRefRange.value.includes('<')) {
      refMin = 0;
      refMax = parseFloat(currentRefRange.value.replace('<', ''));
    }
  }
  
  let minVal = Math.min(...validValues);
  let maxVal = Math.max(...validValues);
  if (refMin !== null && minVal > refMin) minVal = refMin;
  if (refMax !== null && maxVal < refMax) maxVal = refMax;
  
  const paddingY = (maxVal - minVal) * 0.1 || 1;
  minVal -= paddingY;
  maxVal += paddingY;
  if (minVal < 0 && Math.min(...validValues) >= 0) minVal = 0;
  const range = maxVal - minVal || 1;
  
  ctx.clearRect(0, 0, width, height);

  // 绘制正常参考带
  if (refMin !== null && refMax !== null) {
      const yTop = Math.max(padding.top, padding.top + chartHeight - ((refMax - minVal) / range) * chartHeight);
      const yBottom = Math.min(padding.top + chartHeight, padding.top + chartHeight - ((refMin - minVal) / range) * chartHeight);
      if (yBottom > yTop) {
          ctx.setFillStyle('rgba(0, 180, 42, 0.05)');
          ctx.fillRect(padding.left, yTop, chartWidth, yBottom - yTop);
          ctx.setStrokeStyle('rgba(0, 180, 42, 0.2)');
          ctx.setLineWidth(1);
          if (ctx.setLineDash) ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(padding.left, yTop); ctx.lineTo(width - padding.right, yTop);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(padding.left, yBottom); ctx.lineTo(width - padding.right, yBottom);
          ctx.stroke();
          if (ctx.setLineDash) ctx.setLineDash([]);
      }
  }

  // 计算中值线
  if (refMin !== null && refMax !== null) {
      const mid = (refMin + refMax) / 2;
      const yMid = padding.top + chartHeight - ((mid - minVal) / range) * chartHeight;
      ctx.setStrokeStyle('rgba(62, 123, 255, 0.35)');
      ctx.setLineWidth(1);
      if (ctx.setLineDash) ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, yMid); ctx.lineTo(width - padding.right, yMid);
      ctx.stroke();
      if (ctx.setLineDash) ctx.setLineDash([]);
  }
  
  // 网格线
  ctx.setStrokeStyle('#F2F3F5');
  ctx.setLineWidth(1);
  ctx.setFillStyle('#86909C');
  ctx.setFontSize(10);
  ctx.setTextAlign('right');
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    const val = maxVal - (range / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y);
    ctx.stroke();
    ctx.fillText(val.toFixed(1), padding.left - 10, y + 4);
  }
  
  // 折线
  ctx.setStrokeStyle(currentThemeColor.value);
  ctx.setLineWidth(2);
  ctx.beginPath();
  let firstPoint = true;
  const points = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] === null) continue;
    const x = padding.left + (chartWidth / (labels.length - 1 || 1)) * i;
    const y = padding.top + chartHeight - ((values[i] - minVal) / range) * chartHeight;
    const status = getIndicatorInfoFromRef(values[i], currentRefRange.value);
    points.push({ x, y, value: values[i], label: labels[i], status });
    if (firstPoint) { ctx.moveTo(x, y); firstPoint = false; } else { ctx.lineTo(x, y); }
  }
  ctx.stroke();
  
  // 数据点
  points.forEach((p, idx) => {
    ctx.setFillStyle('#FFFFFF');
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    let dotColor = currentThemeColor.value;
    if (p.status.color === 'error') dotColor = '#F53F3F';
    else if (p.status.color === 'warning') dotColor = '#FF7D00';
    ctx.setStrokeStyle(dotColor);
    ctx.setLineWidth(2);
    ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.stroke();
    if (p.status.color !== 'success' || idx === points.length - 1) {
      ctx.setFillStyle(dotColor);
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
    if (p.status.icon) {
      ctx.setFillStyle(dotColor); ctx.setFontSize(10); ctx.setTextAlign('center');
      ctx.fillText(p.status.icon === 'arrow-up-fill' ? '↑' : '↓', p.x, p.y - 10);
    }
    ctx.setFillStyle(p.status.color !== 'success' ? dotColor : '#86909C');
    ctx.setFontSize(10);
    ctx.setTextAlign(idx === 0 ? 'left' : (idx === points.length - 1 ? 'right' : 'center'));
    ctx.fillText(p.value, p.x, p.y - (p.status.icon ? 22 : 12));
  });
  
  // X 轴标签
  ctx.setFillStyle('#86909C'); ctx.setFontSize(10); ctx.setTextAlign('center');
  labels.forEach((label, i) => {
    const x = padding.left + (chartWidth / (labels.length - 1 || 1)) * i;
    ctx.fillText(label, x, height - 15);
  });
  ctx.draw();
};

const fetchList = async () => {
  if (!userStore.isLogin) return;
  try {
    const res = await http.get('/api/record/list');
    list.value = res.list.map(item => {
      item.units = {};
      if (item.indicatorUnits) {
        try {
          item.units = typeof item.indicatorUnits === 'object' ? item.indicatorUnits : JSON.parse(item.indicatorUnits);
        } catch (e) { item.units = {}; }
      }
      return item;
    });
    setCache('record_list', list.value, 1800);
    await nextTick();
    drawChart();
  } catch (err) {
    const cached = getCache('record_list');
    if (cached) { list.value = cached; await nextTick(); drawChart(); }
  }
};

watch(currentTab, () => { nextTick(() => drawChart()); });
watch(displayCount, () => { nextTick(() => drawChart()); });
watch(filteredList, (newVal) => {
  if (displayCount.value > newVal.length && newVal.length >= 2) {
    displayCount.value = newVal.length;
  }
});

const navigateToAdd = () => uni.navigateTo({ url: '/pages/record/add' });
const navigateToDetail = (id) => uni.navigateTo({ url: `/pages/record/detail?id=${id}` });
const formatMember = (m) => m ? `${m.name}${m.relation ? ' · ' + m.relation : ''}` : '';

onMounted(() => {
  const sysInfo = uni.getSystemInfoSync();
  canvasWidth.value = sysInfo.windowWidth - 64;
  fetchList();
});

onShow(() => {
  if (!userStore.isLogin) { uni.reLaunch({ url: '/pages/login' }); return; }
  fetchList();
});
</script>

<style lang="scss" scoped>
.trend-wrapper {
  min-height: 100vh;
  background-color: #F8FAFF;
  padding-bottom: calc(env(safe-area-inset-bottom) + 140rpx);
}

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
  
  .empty-chart-box {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 20rpx 0;
    background: #F8FAFF;
    border-radius: 20rpx;
    border: 1px dashed #E5E6EB;
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
      color: #00B42A;
      font-family: 'DIN Condensed', -apple-system, sans-serif;
      line-height: 1;
      
      &.color-error { color: #F53F3F !important; }
      &.color-warning { color: #FF7D00 !important; }
    }
    
    .unit {
      font-size: 24rpx;
      color: #C9CDD4;
      margin-left: 10rpx;
      align-self: flex-end;
      margin-bottom: 8rpx;
      font-weight: 700;
      
      &.detected {
        color: #3E7BFF;
      }
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

.ref-mid {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #86909C;
  font-weight: 600;
}

.value-box {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.history-section {
  padding: 40rpx 32rpx;
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    
    .title-info {
      display: flex;
      align-items: center;
      gap: 12rpx;
    }

    .title {
      font-size: 36rpx;
      font-weight: 900;
      color: #1D2129;
      position: relative;
    }
    
    .count {
      font-size: 24rpx;
      color: #C9CDD4;
      font-weight: 700;
    }

    .action-btns {
      display: flex;
      gap: 16rpx;
    }

    .export-btn {
      display: flex;
      align-items: center;
      gap: 8rpx;
      padding: 10rpx 24rpx;
      background: #EEF4FF;
      border-radius: 40rpx;
      
      text {
        font-size: 24rpx;
        color: #3E7BFF;
        font-weight: 800;
      }

      &.import-btn {
        background: #F5F1FF;
        text { color: #722ED1; }
      }
    }
  }
}

.record-list {
  background: #FFFFFF;
  border-radius: 36rpx;
  overflow: hidden;
}

.record-item {
  padding: 32rpx 24rpx;
  border-bottom: 1px solid #F8FAFF;
  position: relative;
  
  &:last-child { border-bottom: none; }
  
  .item-inner {
    display: flex;
    align-items: center;
    gap: 24rpx;
  }
  
  .record-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100rpx;
    
    .record-date {
      font-size: 32rpx;
      font-weight: 900;
      color: #1D2129;
      font-family: 'DIN Condensed', sans-serif;
    }
    
    .record-year {
      font-size: 20rpx;
      color: #C9CDD4;
    }
  }
  
  .record-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16rpx;
  }

  .member-tag {
    display: inline-flex;
    align-items: center;
    gap: 6rpx;
    background: #EEF4FF;
    color: #3E7BFF;
    font-size: 20rpx;
    padding: 2rpx 10rpx;
    border-radius: 8rpx;
    width: fit-content;
  }

  .blood-metrics {
    display: flex;
    gap: 30rpx;
    
    .val-item {
      display: flex;
      flex-direction: column;
      position: relative;
      
      .val {
        font-size: 30rpx;
        font-weight: 900;
        font-family: 'DIN Condensed', sans-serif;
      }
      
      .label-row {
        display: flex;
        flex-direction: column;
        .label {
          font-size: 18rpx;
          color: #C9CDD4;
        }
      }
      
      .mini-arrow {
        position: absolute;
        top: -4rpx;
        right: -10rpx;
      }
    }
  }

  .us-entry {
    .us-tag {
      display: inline-flex;
      align-items: center;
      gap: 6rpx;
      background: #F2F7FF;
      padding: 6rpx 16rpx;
      border-radius: 10rpx;
      width: fit-content;
      text { font-size: 22rpx; color: #3E7BFF; font-weight: 700; }
      &.mini { background: #F8FAFF; text { color: #86909C; } }
    }
  }
}

.color-success { color: #00B42A !important; }
.color-warning { color: #FF7D00 !important; }
.color-error { color: #F53F3F !important; }

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
}

.active-tab-text {
  color: #3E7BFF !important;
  font-weight: 800 !important;
  background: #EEF4FF;
  padding: 0 4rpx;
  border-radius: 4rpx;
}
</style>

<template>
  <view class="container">
    <u-navbar
      title="用药提醒"
      :safeAreaInsetTop="true"
      placeholder
      bgColor="transparent"
      leftIconColor="#000"
      titleStyle="font-weight: 600; font-size: 32rpx;"
    >
      <template #left>
        <view class="nav-back">
          <u-icon name="arrow-left" size="24" color="#333" @click="goBack"></u-icon>
        </view>
      </template>
    </u-navbar>

    <view class="content">
      <!-- 每日贴士卡片 -->
      <view class="daily-tip-card">
        <view class="tip-icon">
          <u-icon name="volume-fill" color="#ffffff" size="24"></u-icon>
        </view>
        <view class="tip-content">
          <text class="tip-title">今日贴士</text>
          <text class="tip-desc">{{ tipContent }}</text>
        </view>
        <view class="tip-decoration"></view>
      </view>

      <!-- 累计数据统计 -->
      <view class="stats-card" v-if="stats">
        <view class="stats-item clickable" @click="showMissedPopup = true">
          <text class="label">未打卡</text>
          <text class="value danger">{{ stats.missedDates?.length || 0 }}天</text>
        </view>
        <view class="stats-item">
          <text class="label">连续打卡</text>
          <text class="value">{{ stats.streak }}天</text>
        </view>
        <view class="stats-item">
          <text class="label">累计服用</text>
          <text class="value">{{ stats.takenDoses }}次</text>
        </view>
        <view class="stats-item clickable" @click="openMakeup()">
          <text class="label">补签</text>
          <text class="value warn">{{ stats.makeupDoses || 0 }}次</text>
        </view>
      </view>

      <view class="week-card">
        <view class="week-head">
          <text class="week-title">近7天打卡</text>
          <text class="week-sub">绿色为完成，橙色为部分，红色为漏服</text>
        </view>
        <view class="week-grid">
          <view
            v-for="day in weekDays"
            :key="day.date"
            class="week-day"
            :class="day.status"
            @click="day.status === 'missed' || day.status === 'partial' ? openMakeup(day.date) : null"
          >
            <text class="week-label">{{ day.label }}</text>
            <text class="week-num">{{ day.taken }}/{{ day.expected }}</text>
          </view>
        </view>
      </view>

      <!-- 列表头部 -->
      <view class="section-header">
        <view class="header-left">
          <text class="title">当前执行中</text>
          <view class="badge">{{ activeCount }}</view>
        </view>
        <view class="header-right" @click="openAdd">
          <u-icon name="plus" color="#3c9cff" size="16"></u-icon>
          <text class="add-text">新增时刻</text>
        </view>
      </view>

      <view class="adjust-section" v-if="adjustments.length">
        <view class="adjust-title">最近剂量调整</view>
        <view class="adjust-item" v-for="item in adjustments" :key="item.id">
          <view>
            <text class="adjust-name">{{ item.medicineName }}</text>
            <text class="adjust-date">{{ item.adjustmentDate }}</text>
          </view>
          <text class="adjust-dose">{{ item.fromDosage || '新增' }} → {{ item.toDosage }}</text>
        </view>
      </view>

      <!-- 计划列表 -->
      <view class="plan-list">
        <view class="list-inner">
          <view 
            class="plan-card" 
            v-for="(item, index) in plans" 
            :key="item.id || index"
            @click="editPlan(item)"
            @longpress.stop="deletePlan(item.id)"
          >
            <!-- 头部：药品名称 + 状态开关 -->
            <view class="card-header">
              <view class="medicine-info">
                <u-icon name="pushpin-fill" color="#3E7BFF" size="16"></u-icon>
                <text class="medicine-name">{{ item.medicineName }}</text>
              </view>
              <view class="status-switch" @click.stop>
                <text class="switch-label">提醒</text>
                <u-switch 
                    v-model="item.isActive" 
                    activeColor="#3E7BFF" 
                    inactiveColor="#E5E6EB" 
                    size="18"
                    @change="togglePlan(item)"
                ></u-switch>
              </view>
            </view>

            <!-- 中间：时间 + 打卡按钮 -->
            <view class="card-main">
              <view class="time-box">
                <text class="time">{{ formatTime(item.takeTime) }}</text>
                <text class="ampm">{{ getAmPm(item.takeTime) }}</text>
              </view>
              
              <view class="action-box" @click.stop>
                  <view v-if="isTakenToday(item)" class="status-badge taken">
                      <u-icon name="checkmark-circle-fill" color="#52C41A" size="20"></u-icon>
                      <text>今日已服</text>
                  </view>
                  <view v-else class="btn-take-pill" @click="takeMedicine(item)">
                      <text>服药打卡</text>
                  </view>
                  <view class="makeup-link" @click.stop="openMakeup('', item)">补签</view>
              </view>
            </view>
            
            <!-- 底部：剂量 + 备注 -->
            <view class="card-footer">
              <view class="dosage-tag">
                <text class="label">剂量：</text>
                <text class="val">{{ item.dosage }}</text>
              </view>
              <view class="note-box" v-if="item.notes">
                <u-icon name="info-circle" color="#86909C" size="14"></u-icon>
                <text class="note-text">{{ item.notes }}</text>
              </view>
            </view>
          </view>

          <!-- 空状态 -->
          <view class="empty-state" v-if="plans.length === 0">
            <u-icon name="clock" size="64" color="#e0e0e0"></u-icon>
            <text class="empty-text">暂无用药提醒，点击右上角添加</text>
          </view>
          
          <!-- 底部占位 -->
          <view style="height: 100rpx;"></view>
        </view>
      </view>

      <view class="log-section" v-if="medicationLogs.length">
        <view class="section-header compact">
          <view class="header-left">
            <text class="title">最近服药记录</text>
            <view class="badge">{{ medicationLogs.length }}</view>
          </view>
          <view class="header-right ghost" @click="openMakeup()">
            <u-icon name="edit-pen" color="#3c9cff" size="15"></u-icon>
            <text class="add-text">补签</text>
          </view>
        </view>
        <view class="log-list">
          <view class="log-item" v-for="item in medicationLogs.slice(0, 8)" :key="item.id">
            <view>
              <text class="log-name">{{ item.medicineNameSnapshot || item.MedicationPlan?.medicineName || '用药记录' }}</text>
              <text class="log-meta">{{ item.date }} · {{ formatTakenAt(item.takenAt) }}</text>
            </view>
            <view class="log-right">
              <text class="log-dose">{{ item.dosageSnapshot || item.MedicationPlan?.dosage || '-' }}</text>
              <text class="log-source" :class="{ makeup: item.source === 'makeup' }">{{ item.source === 'makeup' ? '补签' : '打卡' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加计划弹窗 -->
    <u-popup :show="showAdd" @close="closePopup" mode="bottom" round="24" :lockScroll="true">
      <view class="popup-container">
        <view class="popup-header">
          <text class="popup-title">{{ editingId ? '编辑用药提醒' : '添加用药提醒' }}</text>
          <view class="close-icon" @click="closePopup">
            <u-icon name="close" size="20" color="#999"></u-icon>
          </view>
        </view>
        
        <view class="form-container">
          <view class="form-item">
            <text class="label">药品名称</text>
            <u--input
              v-model="newPlan.medicineName"
              placeholder="请输入药品名称，如优甲乐"
              border="surround"
              shape="circle"
            ></u--input>
          </view>
          
          <view class="form-row">
            <view class="form-item half">
              <text class="label">服用剂量</text>
              <u--input
                v-model="newPlan.dosage"
                placeholder="如 1片"
                border="surround"
                shape="circle"
              ></u--input>
            </view>
            <view class="form-item half">
              <text class="label">提醒时间</text>
              <view class="time-picker-trigger" @click="showTime = true">
                <text>{{ newPlan.takeTime }}</text>
                <u-icon name="arrow-right" size="16" color="#999"></u-icon>
              </view>
            </view>
          </view>
          
          <view class="form-item">
            <text class="label">备注说明</text>
            <u--input
              v-model="newPlan.notes"
              placeholder="选填，如空腹服用"
              border="surround"
              shape="circle"
            ></u--input>
          </view>
          <view class="form-item">
            <text class="label">调整原因</text>
            <u--input
              v-model="newPlan.adjustReason"
              placeholder="选填，如医生建议减量/复查后调整"
              border="surround"
              shape="circle"
            ></u--input>
          </view>

          <u-button 
            type="primary" 
            text="保存设置" 
            shape="circle" 
            customStyle="margin-top: 40rpx; height: 88rpx; box-shadow: 0 8rpx 16rpx rgba(60, 156, 255, 0.25);"
            @click="savePlan"
          ></u-button>
        </view>
      </view>
    </u-popup>

    <u-popup :show="showMakeup" @close="closeMakeup" mode="bottom" round="28" :lockScroll="true">
      <view class="popup-container makeup-popup">
        <view class="popup-header">
          <text class="popup-title">补签服药记录</text>
          <view class="close-icon" @click="closeMakeup">
            <u-icon name="close" size="20" color="#999"></u-icon>
          </view>
        </view>
        <view class="form-container">
          <view class="form-item">
            <text class="label">补签药品</text>
            <view class="plan-select-list">
              <view
                v-for="item in activePlans"
                :key="item.id"
                class="plan-select"
                :class="{ active: makeupForm.id === item.id }"
                @click="makeupForm.id = item.id"
              >
                <text>{{ item.medicineName }}</text>
                <text>{{ item.dosage }}</text>
              </view>
            </view>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="label">服药日期</text>
              <view class="time-picker-trigger" @click="showMakeupDate = true">
                <text>{{ makeupForm.date }}</text>
                <u-icon name="arrow-right" size="16" color="#999"></u-icon>
              </view>
            </view>
            <view class="form-item half">
              <text class="label">实际时间</text>
              <view class="time-picker-trigger" @click="showMakeupTime = true">
                <text>{{ makeupForm.takenTime }}</text>
                <u-icon name="arrow-right" size="16" color="#999"></u-icon>
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="label">备注</text>
            <u--input
              v-model="makeupForm.note"
              placeholder="选填，如实际已服，忘记打卡"
              border="surround"
              shape="circle"
            ></u--input>
          </view>
          <view class="makeup-tip">最多支持补签最近30天；补签会单独标记，依从性统计会保留补签次数。</view>
          <u-button
            type="primary"
            text="确认补签"
            shape="circle"
            customStyle="margin-top: 30rpx; height: 88rpx;"
            @click="submitMakeup"
          ></u-button>
        </view>
      </view>
    </u-popup>

    <u-datetime-picker
      :show="showMakeupDate"
      mode="date"
      v-model="makeupDateValue"
      :maxDate="makeupMaxDate"
      @confirm="confirmMakeupDate"
      @cancel="showMakeupDate = false"
    ></u-datetime-picker>

    <u-datetime-picker
      :show="showMakeupTime"
      mode="time"
      v-model="makeupForm.takenTime"
      @confirm="confirmMakeupTime"
      @cancel="showMakeupTime = false"
    ></u-datetime-picker>

    <u-datetime-picker
      :show="showTime"
      mode="time"
      v-model="timeValue"
      @confirm="confirmTime"
      @cancel="showTime = false"
    ></u-datetime-picker>

    <!-- 漏服日历弹窗 -->
    <u-popup :show="showMissedPopup" @close="showMissedPopup = false" mode="bottom" round="32" :lockScroll="true">
      <view class="calendar-popup" @touchmove.stop.prevent>
        <view class="calendar-header">
          <view class="header-left" @click="prevMonth">
            <u-icon name="arrow-left" size="18" color="#999"></u-icon>
          </view>
          <text class="month-title">{{ viewYear }}年{{ viewMonth + 1 }}月</text>
          <view class="header-right" @click="nextMonth">
            <u-icon name="arrow-right" size="18" color="#999"></u-icon>
          </view>
        </view>
        
        <view class="calendar-weekdays">
          <text v-for="d in ['日', '一', '二', '三', '四', '五', '六']" :key="d">{{ d }}</text>
        </view>
        
        <view class="calendar-body">
          <view 
            class="day-cell" 
            v-for="(day, idx) in calendarDays" 
            :key="idx"
            :class="{ 'other-month': !day.isCurrent, 'is-missed': day.isMissed, 'is-today': day.isToday }"
            @click="day.isCurrent && day.isMissed ? openMakeup(day.date) : null"
          >
            <text class="day-num">{{ day.num }}</text>
            <view class="missed-tag" v-if="day.isMissed">漏服</view>
          </view>
        </view>
        
        <view class="calendar-footer">
          <view class="legend">
            <view class="legend-item"><view class="dot missed"></view><text>漏服日期</text></view>
            <view class="legend-item"><view class="dot today"></view><text>今日</text></view>
          </view>
          <u-button type="primary" text="我知道了" shape="circle" @click="showMissedPopup = false" customStyle="height: 80rpx;"></u-button>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { setCache, getCache } from '@/utils/cache.js';

const userStore = useUserStore();
const showAdd = ref(false);
const showTime = ref(false);
const showMissedPopup = ref(false);
const showMakeup = ref(false);
const showMakeupDate = ref(false);
const showMakeupTime = ref(false);
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());
const timeValue = ref('06:30');
const makeupDateValue = ref(Date.now());
const makeupMaxDate = Date.now();
const editingId = ref(null);
const tipContent = ref('加载中...');
// 立即尝试从缓存恢复，实现“秒开”体验
const stats = ref(getCache('medication_stats'));
const plans = ref(getCache('medication_plans') || []);
const adjustments = ref(getCache('medication_adjustments') || []);
const medicationLogs = ref(getCache('medication_logs') || []);

const newPlan = reactive({
  medicineName: '',
  dosage: '',
  takeTime: '06:30',
  notes: '',
  adjustReason: '',
  isActive: true
});

const makeupForm = reactive({
  id: null,
  date: '',
  takenTime: '08:00',
  note: ''
});

const activeCount = computed(() => {
  return plans.value.filter(p => p.isActive).length;
});

const activePlans = computed(() => plans.value.filter(p => p.isActive));

const dateToStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const todayStr = () => dateToStr(new Date());

const logsByDate = computed(() => {
  const grouped = {};
  medicationLogs.value.forEach(log => {
    if (!grouped[log.date]) grouped[log.date] = [];
    grouped[log.date].push(log);
  });
  return grouped;
});

const weekDays = computed(() => {
  const result = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const date = new Date(base.getTime() - i * 24 * 3600 * 1000);
    const ds = dateToStr(date);
    const taken = logsByDate.value[ds]?.length || 0;
    const expected = activeCount.value;
    let status = 'none';
    if (expected === 0) status = 'none';
    else if (taken >= expected) status = 'done';
    else if (taken > 0) status = 'partial';
    else if (i !== 0) status = 'missed';
    result.push({ date: ds, label: `${date.getMonth() + 1}/${date.getDate()}`, taken, expected, status });
  }
  return result;
});

const goBack = () => {
    uni.navigateBack();
};

const fetchPlans = async () => {
  try {
    if (userStore.isLogin) {
       const res = await http.get('/api/medication/list');
       if(res) {
           plans.value = res;
           setCache('medication_plans', plans.value, 1800);
       }
    }
  } catch (err) {
    const cached = getCache('medication_plans');
    if (cached) {
      plans.value = cached;
      uni.$u.toast('当前为离线数据');
    } else {
      console.error(err);
    }
  }

};

const fetchStats = async () => {
  try {
    if (userStore.isLogin) {
      const res = await http.get('/api/medication/stats?days=0');
      if (res) {
          stats.value = res;
          setCache('medication_stats', stats.value, 900);
      }
    }
  } catch (e) {
    const cached = getCache('medication_stats');
    if (cached) stats.value = cached;
  }
};

const fetchAdjustments = async () => {
  try {
    if (userStore.isLogin) {
      const res = await http.get('/api/medication/adjustments?limit=5');
      adjustments.value = res || [];
      setCache('medication_adjustments', adjustments.value, 900);
    }
  } catch (e) {
    const cached = getCache('medication_adjustments');
    if (cached) adjustments.value = cached;
  }
};

const fetchLogs = async () => {
  try {
    if (userStore.isLogin) {
      const res = await http.get('/api/medication/logs?days=30');
      medicationLogs.value = res || [];
      setCache('medication_logs', medicationLogs.value, 900);
    }
  } catch (e) {
    const cached = getCache('medication_logs');
    if (cached) medicationLogs.value = cached;
  }
};

const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
};

const formatDateWithYear = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

// 日历逻辑
const calendarDays = computed(() => {
    const year = viewYear.value;
    const month = viewMonth.value;
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();
    
    const days = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 上月补充
    for (let i = firstDay - 1; i >= 0; i--) {
        days.push({ num: prevLastDate - i, isCurrent: false });
    }
    
    // 本月日期
    for (let i = 1; i <= lastDate; i++) {
        const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        days.push({
            num: i,
            date: ds,
            isCurrent: true,
            isMissed: stats.value?.missedDates?.includes(ds),
            isToday: ds === todayStr
        });
    }
    
    // 下月补充
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
        days.push({ num: i, isCurrent: false });
    }
    
    return days;
});

const prevMonth = () => {
    if (viewMonth.value === 0) {
        viewYear.value--;
        viewMonth.value = 11;
    } else {
        viewMonth.value--;
    }
};

const nextMonth = () => {
    if (viewMonth.value === 11) {
        viewYear.value++;
        viewMonth.value = 0;
    } else {
        viewMonth.value++;
    }
};

const fetchTip = async () => {
    try {
        if (userStore.isLogin) {
            const res = await http.get('/api/tip/random');
            if(res && res.content) {
                tipContent.value = res.content;
            }
        }
    } catch (err) {
        console.error(err);
        tipContent.value = '固定时间（如早起空腹）服用优甲乐效果最佳。';
    }
};

onShow(() => {
    fetchPlans();
    fetchStats();
    fetchAdjustments();
    fetchLogs();
    fetchTip();
});

onPullDownRefresh(async () => {
    await Promise.all([fetchPlans(), fetchStats(), fetchAdjustments(), fetchLogs(), fetchTip()]);
    uni.stopPullDownRefresh();
});

const openAdd = () => {
    editingId.value = null;
    newPlan.medicineName = '';
    newPlan.dosage = '';
    newPlan.notes = '';
    newPlan.adjustReason = '';
    newPlan.takeTime = '06:30';
    showAdd.value = true;
};

const formatTime = (time) => {
  if (!time) return '';
  return time.length > 5 ? time.slice(0, 5) : time;
};

const getAmPm = (time) => {
  if (!time) return '';
  const hour = parseInt(time.split(':')[0]);
  return hour >= 12 ? '下午' : '上午';
};

const confirmTime = (e) => {
  newPlan.takeTime = e.value;
  showTime.value = false;
};

const savePlan = async () => {
  if (!newPlan.medicineName || !newPlan.dosage) return uni.$u.toast('请填写完整信息');
  
  try {
    if (editingId.value) {
        await http.post('/api/medication/update', {
            id: editingId.value,
            ...newPlan
        });
        uni.$u.toast('修改成功');
    } else {
        await http.post('/api/medication/add', newPlan);
        uni.$u.toast('添加成功');
    }
    
    closePopup();
    await Promise.all([fetchPlans(), fetchStats()]);
    await fetchAdjustments();
  } catch (err) {
    console.error(err);
  }
};

const editPlan = (item) => {
    editingId.value = item.id;
    newPlan.medicineName = item.medicineName;
    newPlan.dosage = item.dosage;
    newPlan.takeTime = item.takeTime;
    newPlan.notes = item.notes;
    newPlan.adjustReason = '';
    newPlan.isActive = item.isActive;
    showAdd.value = true;
};

const closePopup = () => {
    showAdd.value = false;
    // 延迟清空，避免UI闪烁
    setTimeout(() => {
        editingId.value = null;
        newPlan.medicineName = '';
        newPlan.dosage = '';
        newPlan.notes = '';
        newPlan.adjustReason = '';
        newPlan.takeTime = '06:30';
    }, 300);
};

const deletePlan = (id) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条提醒吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await http.delete(`/api/medication/delete?id=${id}`);
          uni.$u.toast('已删除');
          await Promise.all([fetchPlans(), fetchStats(), fetchAdjustments()]);
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
};

const takeMedicine = async (item) => {
    const prevDate = item.lastTakenDate;
    const date = new Date();
    item.lastTakenDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    try {
    await http.post('/api/medication/take', { id: item.id });
    uni.$u.toast('已确认服药');
    await Promise.all([fetchStats(), fetchLogs()]);
  } catch (err) {
    item.lastTakenDate = prevDate;
    uni.$u.toast('操作失败');
  }
};

const isTakenToday = (item) => {
    if (!item.lastTakenDate) return false;
    const date = new Date();
    const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return item.lastTakenDate === today;
};

const openMakeup = (date = '', plan = null) => {
  const targetPlan = plan || activePlans.value[0] || plans.value[0];
  if (!targetPlan) {
    uni.$u.toast('请先添加用药提醒');
    return;
  }
  makeupForm.id = targetPlan.id;
  makeupForm.date = date || todayStr();
  makeupForm.takenTime = formatTime(targetPlan.takeTime) || '08:00';
  makeupForm.note = '';
  makeupDateValue.value = new Date(`${makeupForm.date}T00:00:00`).getTime();
  showMissedPopup.value = false;
  showMakeup.value = true;
};

const closeMakeup = () => {
  showMakeup.value = false;
};

const confirmMakeupDate = (e) => {
  const date = new Date(e.value);
  makeupForm.date = dateToStr(date);
  makeupDateValue.value = e.value;
  showMakeupDate.value = false;
};

const confirmMakeupTime = (e) => {
  makeupForm.takenTime = e.value;
  showMakeupTime.value = false;
};

const submitMakeup = async () => {
  if (!makeupForm.id || !makeupForm.date) {
    uni.$u.toast('请选择补签药品和日期');
    return;
  }
  try {
    await http.post('/api/medication/makeup', { ...makeupForm });
    uni.$u.toast('补签成功');
    showMakeup.value = false;
    await Promise.all([fetchPlans(), fetchStats(), fetchLogs()]);
  } catch (err) {
    uni.$u.toast(err.message || '补签失败');
  }
};

const formatTakenAt = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const togglePlan = async (item) => {
  // 乐观更新
  // item.isActive 已经在 v-model 中改变了，这里只需要发送请求
  console.log('Toggle:', item.isActive);
  try {
    await http.post('/api/medication/toggle', {
      id: item.id,
      isActive: item.isActive // 此时已经是切换后的状态
    });
    await fetchStats();
  } catch (err) {
      // 失败回滚
      item.isActive = !item.isActive;
      uni.$u.toast('操作失败');
  }
};


onMounted(() => {
    // 基础初始化可放此处，数据加载已移至 onShow
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #F8FAFF;
  display: flex;
  flex-direction: column;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 32rpx;
}

/* 每日贴士卡片升级 */
.daily-tip-card {
  position: relative;
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
  border-radius: 40rpx;
  padding: 48rpx;
  display: flex;
  align-items: flex-start;
  margin-bottom: 48rpx;
  box-shadow: 0 20rpx 40rpx rgba(62, 123, 255, 0.2);
  overflow: hidden;
  
  .tip-icon {
    width: 80rpx;
    height: 80rpx;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border-radius: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    flex-shrink: 0;
    box-shadow: 0 8rpx 16rpx rgba(0,0,0,0.1);
  }
  
  .tip-content {
    flex: 1;
    z-index: 1;
    
    .tip-title {
      color: #FFFFFF;
      font-size: 34rpx;
      font-weight: 900;
      margin-bottom: 12rpx;
      display: block;
      letter-spacing: 2rpx;
    }
    
    .tip-desc {
      color: rgba(255, 255, 255, 0.9);
      font-size: 26rpx;
      line-height: 1.6;
      font-weight: 500;
    }
  }
  
  .tip-decoration {
    position: absolute;
    right: -40rpx;
    top: -40rpx;
    width: 240rpx;
    height: 240rpx;
    background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
    border-radius: 50%;
  }
}

.stats-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 28rpx;
  margin-bottom: 32rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(62, 123, 255, 0.08);

  .stats-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;

    .label {
      font-size: 22rpx;
      color: #86909C;
      margin-bottom: 6rpx;
      font-weight: 600;
    }

    .value {
      font-size: 32rpx;
      font-weight: 900;
      color: #3E7BFF;
      font-family: 'DIN Condensed', sans-serif;
      
      &.danger {
          color: #FF4D4F;
      }

      &.warn {
          color: #FF7D00;
      }
    }
    
    &.clickable:active {
        opacity: 0.7;
    }
  }
}

.week-card,
.log-section {
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(62, 123, 255, 0.08);
}

.week-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.week-title {
  color: #1D2129;
  font-size: 28rpx;
  font-weight: 900;
}

.week-sub {
  color: #86909C;
  font-size: 20rpx;
}

.week-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10rpx;
}

.week-day {
  min-height: 82rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #F7F8FA;
  border: 1px solid #EEF0F4;
}

.week-day.done {
  background: #EAFBF4;
  border-color: #B7EBD3;
}

.week-day.partial {
  background: #FFF7E8;
  border-color: #FFD591;
}

.week-day.missed {
  background: #FFF1F0;
  border-color: #FFA39E;
}

.week-label {
  color: #4E5969;
  font-size: 20rpx;
  font-weight: 700;
}

.week-num {
  margin-top: 4rpx;
  color: #1D2129;
  font-size: 22rpx;
  font-weight: 900;
}

.adjust-section {
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(62, 123, 255, 0.08);
}

.adjust-title {
  color: #1D2129;
  font-size: 28rpx;
  font-weight: 900;
  margin-bottom: 16rpx;
}

.adjust-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 14rpx 0;
  border-top: 1px solid #F2F3F5;
}

.adjust-name {
  display: block;
  color: #1D2129;
  font-size: 24rpx;
  font-weight: 800;
}

.adjust-date {
  display: block;
  color: #86909C;
  font-size: 20rpx;
  margin-top: 4rpx;
}

.adjust-dose {
  flex-shrink: 0;
  color: #3E7BFF;
  background: #EEF4FF;
  border-radius: 999rpx;
  padding: 8rpx 14rpx;
  font-size: 22rpx;
  font-weight: 800;
}

.calendar-popup {
    background: #fff;
    padding: 40rpx;
    
    .calendar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 40rpx;
        
        .month-title {
            font-size: 34rpx;
            font-weight: 900;
            color: #1D2129;
        }
        
        .header-left, .header-right {
            padding: 10rpx 20rpx;
        }
    }
    
    .calendar-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        margin-bottom: 20rpx;
        
        text {
            text-align: center;
            font-size: 24rpx;
            color: #86909C;
            font-weight: 600;
        }
    }
    
    .calendar-body {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 12rpx;
        margin-bottom: 40rpx;
        
        .day-cell {
            height: 90rpx;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            border-radius: 16rpx;
            
            .day-num {
                font-size: 28rpx;
                color: #1D2129;
                font-weight: 700;
            }
            
            &.other-month {
                opacity: 0.3;
            }
            
            &.is-today {
                background: #F2F3F5;
                .day-num { color: #3E7BFF; }
            }
            
            &.is-missed {
                background: #FFF1F0;
                border: 1px solid #FFA39E;
                
                .day-num { color: #CF1322; }
                
                .missed-tag {
                    font-size: 16rpx;
                    color: #F5222D;
                    font-weight: 900;
                    margin-top: 4rpx;
                }
            }
        }
    }
    
    .calendar-footer {
        .legend {
            display: flex;
            gap: 30rpx;
            margin-bottom: 40rpx;
            justify-content: center;
            
            .legend-item {
                display: flex;
                align-items: center;
                font-size: 22rpx;
                color: #86909C;
                
                .dot {
                    width: 12rpx;
                    height: 12rpx;
                    border-radius: 50%;
                    margin-right: 8rpx;
                    
                    &.missed { background: #F5222D; }
                    &.today { background: #3E7BFF; }
                }
            }
        }
    }
}

/* 列表头部 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
  padding: 0 8rpx;
  
  .header-left {
    display: flex;
    align-items: flex-end;
    
    .title {
      font-size: 36rpx;
      font-weight: 900;
      color: #1D2129;
      margin-right: 16rpx;
    }
    
    .badge {
      background: #EEF4FF;
      color: #3E7BFF;
      font-size: 24rpx;
      padding: 4rpx 20rpx;
      border-radius: 30rpx;
      font-weight: 800;
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    background: #FFFFFF;
    padding: 12rpx 24rpx;
    border-radius: 30rpx;
    box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.03);
    
    .add-text {
      font-size: 26rpx;
      color: #3E7BFF;
      font-weight: 800;
      margin-left: 10rpx;
    }

    &.ghost {
      background: #F6F8FF;
      box-shadow: none;
    }
  }

  &.compact {
    margin-bottom: 20rpx;
    padding: 0;

    .header-left .title {
      font-size: 30rpx;
    }
  }
}

/* 计划卡片全新改版 */
.plan-card {
  background: #FFFFFF;
  border-radius: 36rpx;
  padding: 32rpx;
  margin-bottom: 28rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.02);
  
  &:active {
    transform: scale(0.98);
    transition: all 0.2s;
  }

  /* 头部：药品与开关分离 */
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;
    padding-bottom: 20rpx;
    border-bottom: 1px solid #F2F3F5;

    .medicine-info {
      display: flex;
      align-items: center;
      .medicine-name {
        font-size: 32rpx;
        font-weight: 800;
        color: #1D2129;
        margin-left: 10rpx;
      }
    }

    .status-switch {
      display: flex;
      align-items: center;
      background: #F8FAFF;
      padding: 6rpx 16rpx;
      border-radius: 40rpx;
      .switch-label {
        font-size: 22rpx;
        color: #86909C;
        margin-right: 12rpx;
        font-weight: 600;
      }
    }
  }

  /* 中间：核心展示区 */
  .card-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10rpx 0 20rpx;

    .time-box {
      display: flex;
      align-items: flex-end;
      .time {
        font-size: 64rpx;
        font-weight: 900;
        color: #1D2129;
        font-family: 'DIN Condensed', sans-serif;
        line-height: 1;
      }
      .ampm {
        font-size: 24rpx;
        color: #86909C;
        margin-left: 12rpx;
        font-weight: 700;
        margin-bottom: 6rpx;
      }
    }

    .action-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10rpx;

      /* 打卡按钮 */
      .btn-take-pill {
        background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
        padding: 14rpx 32rpx;
        border-radius: 32rpx;
        box-shadow: 0 8rpx 16rpx rgba(62, 123, 255, 0.2);
        text {
          color: #FFFFFF;
          font-size: 26rpx;
          font-weight: 700;
        }
      }

      /* 已服状态 */
      .status-badge {
        display: flex;
        align-items: center;
        background: #F6FFED;
        border: 1px solid #B7EB8F;
        padding: 10rpx 24rpx;
        border-radius: 32rpx;
        text {
          color: #52C41A;
          font-size: 24rpx;
          font-weight: 800;
          margin-left: 8rpx;
        }
      }

      .makeup-link {
        color: #3E7BFF;
        font-size: 22rpx;
        font-weight: 800;
      }
    }
  }

  /* 底部：辅助信息 */
  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10rpx;

    .dosage-tag {
      background: #EEF4FF;
      padding: 6rpx 20rpx;
      border-radius: 12rpx;
      .label {
        font-size: 22rpx;
        color: #3E7BFF;
        font-weight: 600;
      }
      .val {
        font-size: 24rpx;
        color: #3E7BFF;
        font-weight: 800;
      }
    }

    .note-box {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      margin-left: 20rpx;
      .note-text {
        font-size: 22rpx;
        color: #86909C;
        margin-left: 8rpx;
        max-width: 300rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: #C9CDD4;
    margin-top: 32rpx;
    font-weight: 600;
  }
}

/* 弹窗升级 */
.popup-container {
  padding: 60rpx 48rpx;
  background: #FFFFFF;
  border-radius: 50rpx 50rpx 0 0;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 48rpx;
  
  .popup-title {
    font-size: 40rpx;
    font-weight: 900;
    color: #1D2129;
  }
}

.form-container {
    .form-item {
        margin-bottom: 40rpx;
        
        .label {
            font-size: 28rpx;
            color: #1D2129;
            font-weight: 800;
            margin-bottom: 20rpx;
            display: block;
        }
        
        &.half { flex: 1; }
    }
    
    .form-row { display: flex; gap: 32rpx; }
}

.makeup-popup {
  max-height: 86vh;
}

.plan-select-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  max-height: 280rpx;
  overflow-y: auto;
}

.plan-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx 24rpx;
  color: #4E5969;
  background: #F8FAFF;
  border: 1px solid #E5E6EB;
  border-radius: 20rpx;
  font-size: 26rpx;
  font-weight: 800;
}

.plan-select.active {
  color: #3E7BFF;
  background: #EEF4FF;
  border-color: #3E7BFF;
}

.makeup-tip {
  color: #86909C;
  font-size: 22rpx;
  line-height: 1.6;
  background: #F7F8FA;
  padding: 18rpx 22rpx;
  border-radius: 18rpx;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.log-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 16rpx 0;
  border-top: 1px solid #F2F3F5;
}

.log-name {
  display: block;
  color: #1D2129;
  font-size: 25rpx;
  font-weight: 900;
}

.log-meta {
  display: block;
  margin-top: 4rpx;
  color: #86909C;
  font-size: 21rpx;
}

.log-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}

.log-dose {
  color: #3E7BFF;
  font-size: 23rpx;
  font-weight: 900;
}

.log-source {
  color: #00A870;
  background: #EAFBF4;
  border-radius: 999rpx;
  padding: 4rpx 12rpx;
  font-size: 20rpx;
  font-weight: 800;
}

.log-source.makeup {
  color: #FF7D00;
  background: #FFF7E8;
}

.time-picker-trigger {
    height: 100rpx;
    background: #F8FAFF;
    border: none;
    border-radius: 50rpx;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 40rpx;
    color: #1D2129;
    font-size: 32rpx;
    font-weight: 800;
    font-family: 'DIN Condensed', sans-serif;
}

/* 隐藏滚动条 */
::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
}
</style>

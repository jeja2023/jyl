<template>
  <view class="calendar-wrapper">
    <u-navbar title="复查日历" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="main-body">
      <!-- 日历组件 -->
      <u-calendar 
        :show="showCalendar" 
        mode="single" 
        :monthNum="3"
        color="#3E7BFF"
        @confirm="selectDate"
        @close="showCalendar = false"
      ></u-calendar>
      
      <!-- 添加复查提醒 -->
      <view class="add-section" @click="showCalendar = true">
        <u-icon name="plus-circle" size="22" color="#3E7BFF"></u-icon>
        <text>添加下一次复查日期</text>
      </view>
      
      <!-- 提醒列表 -->
      <view class="remind-list" v-if="reminders.length > 0">
        <view class="list-title">我的复查计划</view>
        <view class="remind-item" v-for="(item, index) in reminders" :key="index">
          <view class="remind-left">
            <view class="remind-date">{{ formatDate(item.date) }}</view>
            <view class="remind-note">{{ item.note || '常规复查' }}</view>
          </view>
          <view class="remind-right">
            <view class="countdown" :class="getCountdownClass(item.date)">
              {{ getCountdown(item.date) }}
            </view>
            <u-icon name="trash" size="18" color="#86909C" @click="deleteReminder(item)"></u-icon>
          </view>
        </view>
      </view>
      
      <view class="empty-state" v-else>
        <u-icon name="calendar" size="60" color="#E5E6EB"></u-icon>
        <text>暂无复查计划</text>
        <text class="sub">点击上方添加您的下次复查日期</text>
      </view>
    </view>
    
    <!-- 添加弹窗 -->
    <u-popup :show="showAdd" mode="bottom" round="20" @close="showAdd = false">
      <view class="popup-content">
        <view class="popup-title">添加复查提醒</view>
        <view class="form-item">
          <text class="label">复查日期</text>
          <view class="date-input" @click="showCalendar = true">
            <text>{{ newReminder.date || '请选择日期' }}</text>
            <u-icon name="calendar" size="18" color="#86909C"></u-icon>
          </view>
        </view>
        <view class="form-item">
          <text class="label">备注说明</text>
          <u--textarea v-model="newReminder.note" placeholder="如：甲功五项复查、B超检查等" maxlength="50" count></u--textarea>
        </view>
        <u-button type="primary" text="保存提醒" shape="circle" @click="saveReminder"></u-button>
      </view>
    </u-popup>
    
      <!-- 移除冗余的 datetime-picker，统一使用 u-calendar -->
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import http from '@/utils/request.js';

const goBack = () => {
  uni.navigateBack();
};

const showCalendar = ref(false);
const showAdd = ref(false);
const reminders = ref([]);
const newReminder = reactive({
  date: '',
  note: ''
});

// 加载数据
const loadReminders = async () => {
  try {
    const res = await http.get('/api/checkup/list');
    reminders.value = res || [];
  } catch (e) {
    console.error(e);
  }
};

onMounted(() => {
  loadReminders();
});

const openAddModal = () => {
  newReminder.date = '';
  newReminder.note = '';
  showAdd.value = true;
};

const selectDate = (e) => {
  if (e && e.length > 0) {
    newReminder.date = e[0];
    showCalendar.value = false;
    // 如果还没打开备注弹窗，则打开它
    if (!showAdd.value) {
      showAdd.value = true;
    }
  }
};

const saveReminder = async () => {
  if (!newReminder.date) {
    return uni.$u.toast('请选择复查日期');
  }
  
  try {
    await http.post('/api/checkup/add', {
      date: newReminder.date,
      note: newReminder.note
    });
    
    uni.$u.toast('提醒已保存');
    showAdd.value = false;
    loadReminders(); // 刷新列表
  } catch (e) {
    console.error(e);
  }
};

const deleteReminder = (item) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条复查提醒吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          // 修改：使用 DELETE /api/checkup/:id
          await http.delete(`/api/checkup/${item.id}`);
          uni.$u.toast('删除成功');
          loadReminders();
        } catch (e) {
          console.error(e);
        }
      }
    }
  });
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekDays[date.getDay()]}`;
};

const getCountdown = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  
  if (diff < 0) return '已过期';
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return `${diff}天后`;
};

const getCountdownClass = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  
  if (diff < 0) return 'expired';
  if (diff <= 3) return 'urgent';
  return 'normal';
};
</script>

<style lang="scss" scoped>
.calendar-wrapper {
  background: #F6F8FC;
  min-height: 100vh;
}

.main-body {
  padding: 20rpx 32rpx;
}

.calendar-section {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
}

.add-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 28rpx;
  margin-top: 24rpx;
  background: linear-gradient(135deg, #EEF4FF 0%, #F8FAFF 100%);
  border-radius: 20rpx;
  border: 2rpx dashed #3E7BFF;
  color: #3E7BFF;
  font-size: 28rpx;
}

.remind-list {
  margin-top: 32rpx;
  
  .list-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1D2129;
    margin-bottom: 20rpx;
  }
}

.remind-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04);
  
  .remind-left {
    .remind-date {
      font-size: 30rpx;
      font-weight: 600;
      color: #1D2129;
    }
    .remind-note {
      font-size: 24rpx;
      color: #86909C;
      margin-top: 8rpx;
    }
  }
  
  .remind-right {
    display: flex;
    align-items: center;
    gap: 20rpx;
    
    .countdown {
      font-size: 24rpx;
      padding: 8rpx 16rpx;
      border-radius: 20rpx;
      
      &.normal {
        background: #E8F5E9;
        color: #27C24C;
      }
      &.urgent {
        background: #FFF3E0;
        color: #FF902B;
      }
      &.expired {
        background: #FFEBEE;
        color: #F05050;
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  color: #86909C;
  font-size: 28rpx;
  
  .sub {
    font-size: 24rpx;
    margin-top: 12rpx;
    color: #C9CDD4;
  }
}

.popup-content {
  padding: 40rpx;
  
  .popup-title {
    font-size: 34rpx;
    font-weight: 700;
    text-align: center;
    margin-bottom: 40rpx;
  }
  
  .form-item {
    margin-bottom: 32rpx;
    
    .label {
      display: block;
      font-size: 28rpx;
      color: #4E5969;
      margin-bottom: 16rpx;
    }
    
    .date-input {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24rpx;
      background: #F6F8FC;
      border-radius: 16rpx;
      font-size: 28rpx;
      color: #1D2129;
    }
  }
}
</style>

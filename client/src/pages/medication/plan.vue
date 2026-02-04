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
            <view class="card-main">
              <view class="time-wrapper">
                <text class="time">{{ formatTime(item.takeTime) }}</text>
                <text class="ampm">{{ getAmPm(item.takeTime) }}</text>
              </view>
              <u-switch 
                v-model="item.isActive" 
                activeColor="#3c9cff" 
                inactiveColor="#e6e6e6" 
                size="24"
                @change="togglePlan(item)"
                @click.stop
              ></u-switch>
            </view>
            
            <view class="card-info">
              <view class="info-item">
                <text class="info-label">药品</text>
                <text class="info-value">{{ item.medicineName }}</text>
              </view>
              <view class="info-divider"></view>
              <view class="info-item">
                <text class="info-label">剂量</text>
                <text class="info-value">{{ item.dosage }}</text>
              </view>
            </view>

            <view class="card-note" v-if="item.notes">
              <u-icon name="info-circle" color="#909399" size="14"></u-icon>
              <text class="note-text">{{ item.notes }}</text>
            </view>
          </view>

          <!-- 空状态 -->
          <view class="empty-state" v-if="plans.length === 0">
            <image src="/static/empty-medication.png" mode="widthFix" class="empty-img" v-if="false"></image>
            <u-icon name="calendar" size="64" color="#e0e0e0"></u-icon>
            <text class="empty-text">暂无用药计划，点击右上角添加</text>
          </view>
          
          <!-- 底部占位，防止被最后的内容遮挡 -->
          <view style="height: 100rpx;"></view>
        </view>
      </view>
    </view>

    <!-- 添加计划弹窗 -->
    <u-popup :show="showAdd" @close="closePopup" mode="bottom" round="24">
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

    <u-datetime-picker
      :show="showTime"
      mode="time"
      v-model="timeValue"
      @confirm="confirmTime"
      @cancel="showTime = false"
    ></u-datetime-picker>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const plans = ref([]);
const showAdd = ref(false);
const showTime = ref(false);
const timeValue = ref('06:30');
const editingId = ref(null);
const tipContent = ref('加载中...');

const newPlan = reactive({
  medicineName: '',
  dosage: '',
  takeTime: '06:30',
  notes: '',
  isActive: true
});

const activeCount = computed(() => {
  return plans.value.filter(p => p.isActive).length;
});

const goBack = () => {
    uni.navigateBack();
};

const fetchPlans = async () => {
  try {
    if (userStore.isLogin) {
       const res = await http.get('/api/medication/list');
       if(res) plans.value = res;
    }
  } catch (err) {
    console.error(err);
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

const openAdd = () => {
    editingId.value = null;
    newPlan.medicineName = '';
    newPlan.dosage = '';
    newPlan.notes = '';
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
    fetchPlans();
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
    // item.isActive 不在编辑表单中，保持原样或另行处理，这里暂不包含在编辑表单中
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
          await http.delete('/api/medication/delete', { params: { id } });
          uni.$u.toast('已删除');
          fetchPlans();
        } catch (err) {
          console.error(err);
        }
      }
    }
  });
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
  } catch (err) {
      // 失败回滚
      item.isActive = !item.isActive;
      uni.$u.toast('操作失败');
  }
};

onMounted(() => {
  fetchPlans();
  fetchTip();
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
  }
}

/* 计划卡片升级 */
.plan-card {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(62, 123, 255, 0.05);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  
  &:active {
    transform: scale(0.97);
  }
  
  .card-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx;
    
    .time-wrapper {
        display: flex;
        align-items: baseline;
        
        .time {
            font-size: 64rpx;
            font-weight: 900;
            color: #1D2129;
            font-family: 'DIN Condensed', sans-serif;
            line-height: 1;
        }
        
        .ampm {
            font-size: 26rpx;
            color: #86909C;
            margin-left: 16rpx;
            font-weight: 700;
        }
    }
  }
  
  .card-info {
    display: flex;
    align-items: center;
    background: #F8FAFF;
    border-radius: 24rpx;
    padding: 24rpx 32rpx;
    
    .info-item {
        display: flex;
        flex-direction: column;
        flex: 1;
        
        .info-label {
            font-size: 20rpx;
            color: #C9CDD4;
            margin-bottom: 4rpx;
            font-weight: 700;
            text-transform: uppercase;
        }
        
        .info-value {
            font-size: 30rpx;
            color: #1D2129;
            font-weight: 800;
        }
    }
    
    .info-divider {
        width: 2rpx;
        height: 48rpx;
        background: #EEF4FF;
        margin: 0 32rpx;
    }
  }
  
  .card-note {
    margin-top: 24rpx;
    display: flex;
    align-items: center;
    padding: 12rpx 20rpx;
    background: rgba(144, 147, 153, 0.05);
    border-radius: 12rpx;
    
    .note-text {
        font-size: 24rpx;
        color: #86909C;
        margin-left: 12rpx;
        font-weight: 500;
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

<template>
  <view class="profile-page">
    <u-navbar title="个人信息" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="profile-body">
      <!-- 头像区域 -->
      <view class="avatar-section">
        <u-avatar :src="userInfo?.avatar" size="100" shape="circle" :text="avatarText"></u-avatar>
        <text class="change-avatar">点击更换头像</text>
      </view>

      <!-- 信息列表 -->
      <view class="info-card">
        <view class="info-item">
          <text class="label">昵称</text>
          <view class="value-area" @click="editField('nickname')">
            <text class="value">{{ userInfo?.nickname || '未设置' }}</text>
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
        
        <view class="info-item">
          <text class="label">手机号</text>
          <view class="value-area">
            <text class="value">{{ maskedPhone }}</text>
            <u-icon name="checkmark-circle" size="16" color="#27C24C" v-if="userInfo?.phone"></u-icon>
          </view>
        </view>
        
        <view class="info-item">
          <text class="label">性别</text>
          <view class="value-area" @click="editField('gender')">
            <text class="value">{{ genderText }}</text>
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
        
        <view class="info-item">
          <text class="label">出生日期</text>
          <view class="value-area" @click="editField('birthday')">
            <text class="value">{{ userInfo?.birthday || '未设置' }}</text>
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
        
        <view class="info-item">
          <text class="label">疾病类型</text>
          <view class="value-area" @click="editField('patientType')">
            <text class="value highlight">{{ userInfo?.patientType || '未设置' }}</text>
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
        
        <view class="info-item">
          <text class="label">确诊时间</text>
          <view class="value-area" @click="editField('diagnosisDate')">
            <text class="value">{{ userInfo?.diagnosisDate || '未设置' }}</text>
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
      </view>
      
      <!-- 提示 -->
      <view class="tips">
        <u-icon name="info-circle" size="14" color="#86909C"></u-icon>
        <text>完善个人信息有助于获得更精准的健康建议</text>
      </view>
    </view>

    <!-- 编辑昵称弹窗 -->
    <u-popup :show="showNicknameEdit" mode="center" round="20" @close="showNicknameEdit = false">
      <view class="edit-popup">
        <text class="popup-title">修改昵称</text>
        <u--input v-model="editForm.nickname" placeholder="请输入昵称" border="surround" class="edit-input"></u--input>
        <u-button type="primary" text="保存" shape="circle" @click="saveNickname" :loading="saving"></u-button>
      </view>
    </u-popup>

    <!-- 选择性别弹窗 -->
    <u-action-sheet :show="showGenderPicker" :actions="genderActions" @select="onGenderSelect" @close="showGenderPicker = false"></u-action-sheet>

    <!-- 选择疾病类型弹窗 -->
    <u-action-sheet :show="showTypePicker" :actions="typeActions" @select="onTypeSelect" @close="showTypePicker = false"></u-action-sheet>

    <!-- 日期选择器 -->
    <u-datetime-picker :show="showDatePicker" v-model="datePickerValue" mode="date" @confirm="onDateConfirm" @cancel="showDatePicker = false"></u-datetime-picker>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

const saving = ref(false);
const showNicknameEdit = ref(false);
const showGenderPicker = ref(false);
const showTypePicker = ref(false);
const showDatePicker = ref(false);
const currentDateField = ref('');
const datePickerValue = ref(Date.now());

const editForm = ref({ nickname: '' });

const avatarText = computed(() => {
  const name = userInfo.value?.nickname || '甲';
  return name.slice(0, 1);
});

const maskedPhone = computed(() => {
  const phone = userInfo.value?.phone;
  if (!phone) return '未绑定';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
});

const genderText = computed(() => {
  const gender = userInfo.value?.gender;
  if (gender === 'male') return '男';
  if (gender === 'female') return '女';
  return '未设置';
});

const genderActions = [
  { name: '男', value: 'male' },
  { name: '女', value: 'female' }
];

const typeActions = [
  { name: '甲减' },
  { name: '甲亢' },
  { name: '甲状腺结节' },
  { name: '甲癌术后' },
  { name: '桥本氏甲状腺炎' },
  { name: '其他' }
];

const editField = (field) => {
  if (field === 'nickname') {
    editForm.value.nickname = userInfo.value?.nickname || '';
    showNicknameEdit.value = true;
  } else if (field === 'gender') {
    showGenderPicker.value = true;
  } else if (field === 'patientType') {
    showTypePicker.value = true;
  } else if (field === 'birthday' || field === 'diagnosisDate') {
    currentDateField.value = field;
    showDatePicker.value = true;
  }
};

const saveNickname = async () => {
  if (!editForm.value.nickname.trim()) {
    return uni.$u.toast('请输入昵称');
  }
  saving.value = true;
  try {
    await http.post('/api/auth/profile/update', { nickname: editForm.value.nickname });
    await refreshUserInfo();
    showNicknameEdit.value = false;
    uni.$u.toast('修改成功');
  } catch (e) {
    // failed
  } finally {
    saving.value = false;
  }
};

const onGenderSelect = async (item) => {
  try {
    await http.post('/api/auth/profile/update', { gender: item.value });
    await refreshUserInfo();
    uni.$u.toast('修改成功');
  } catch (e) {
    // failed
  }
  showGenderPicker.value = false;
};

const onTypeSelect = async (item) => {
  try {
    await http.post('/api/auth/profile/update', { patientType: item.name });
    await refreshUserInfo();
    uni.$u.toast('修改成功');
  } catch (e) {
    // failed
  }
  showTypePicker.value = false;
};

const onDateConfirm = async (e) => {
  const date = new Date(e.value);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  try {
    await http.post('/api/auth/profile/update', { [currentDateField.value]: dateStr });
    await refreshUserInfo();
    uni.$u.toast('修改成功');
  } catch (e) {
    // failed
  }
  showDatePicker.value = false;
};

const refreshUserInfo = async () => {
  try {
    const res = await http.get('/api/auth/profile');
    userStore.setUserInfo(res);
  } catch (e) {
    // failed
  }
};

onMounted(() => {
  refreshUserInfo();
});
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background-color: #F6F8FC;
}

.profile-body {
  padding: 32rpx;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
  
  .change-avatar {
    margin-top: 16rpx;
    font-size: 24rpx;
    color: #3E7BFF;
  }
}

.info-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #F2F3F5;
  
  &:last-child { border-bottom: none; }
  
  .label {
    font-size: 28rpx;
    color: #4E5969;
  }
  
  .value-area {
    display: flex;
    align-items: center;
    
    .value {
      font-size: 28rpx;
      color: #1D2129;
      margin-right: 8rpx;
      
      &.highlight {
        color: #3E7BFF;
        font-weight: 600;
      }
    }
  }
}

.tips {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  
  text {
    font-size: 24rpx;
    color: #86909C;
    margin-left: 8rpx;
  }
}

.edit-popup {
  padding: 48rpx 40rpx;
  width: 560rpx;
  
  .popup-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #1D2129;
    text-align: center;
    display: block;
    margin-bottom: 40rpx;
  }
  
  .edit-input {
    margin-bottom: 40rpx;
  }
}
</style>

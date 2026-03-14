<template>
  <view class="family-page">
    <u-navbar title="家庭成员" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>

    <view class="family-body">
      <view class="section-header">
        <text class="title">成员列表</text>
        <view class="add-btn" @click="openAdd">
          <u-icon name="plus" size="14" color="#3E7BFF"></u-icon>
          <text>新增成员</text>
        </view>
      </view>

      <view v-if="members.length" class="member-list">
        <view class="member-card" v-for="item in members" :key="item.id">
          <view class="card-decorator"></view>
          <view class="member-avatar">
            <u-icon name="account-fill" size="24" color="#3E7BFF"></u-icon>
          </view>
          <view class="member-main">
            <view class="name-row">
              <text class="name">{{ item.name }}</text>
              <text class="relation-tag">{{ item.relation || '成员' }}</text>
            </view>
            <view class="meta-row">
              <text class="gender">{{ item.gender || '未知' }}</text>
              <text class="split">|</text>
              <text class="birth">{{ item.birthDate || '暂未录入' }}</text>
            </view>
            <view class="patient-tag" :class="item.patientType">{{ item.patientType || '其他' }}</view>
          </view>
          <view class="member-actions">
            <view class="action-item edit" @click="editMember(item)">
              <u-icon name="edit-pen" size="18" color="#3E7BFF"></u-icon>
            </view>
            <view class="action-item del" @click="deleteMember(item)">
              <u-icon name="trash" size="18" color="#FF4D4F"></u-icon>
            </view>
          </view>
        </view>
      </view>

      <u-empty v-else mode="data" text="暂无成员" marginTop="60"></u-empty>
    </view>

    <u-popup :show="showForm" mode="bottom" round="32" @close="closeForm" :lockScroll="true">
      <view class="popup-box">
        <view class="popup-header">
          <view class="title">{{ editingId ? '编辑成员' : '新增成员' }}</view>
          <view class="subtitle">记录家人的健康足迹</view>
        </view>
        <view class="form-body">
          <view class="form-item">
            <text class="label">姓名</text>
            <u--input v-model="form.name" placeholder="请输入姓名" border="none" class="custom-input"></u--input>
          </view>
          <view class="form-item">
            <text class="label">关系</text>
            <u--input v-model="form.relation" placeholder="如：父亲/母亲/孩子" border="none" class="custom-input"></u--input>
          </view>
          <view class="form-row">
            <view class="form-item half">
              <text class="label">性别</text>
              <view class="select-box" @click="showGender = true">
                <text :class="{placeholder: !form.gender}">{{ form.gender || '请选择' }}</text>
                <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
              </view>
            </view>
            <view class="form-item half">
              <text class="label">出生日期</text>
              <view class="select-box" @click="showBirth = true">
                <text :class="{placeholder: !form.birthDate}">{{ form.birthDate || '请选择' }}</text>
                <u-icon name="calendar" size="14" color="#C9CDD4"></u-icon>
              </view>
            </view>
          </view>
          <view class="form-item">
            <text class="label">疾病类型</text>
            <view class="select-box" @click="showType = true">
              <text>{{ form.patientType || '其他' }}</text>
              <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
            </view>
          </view>
          <view class="form-item">
            <text class="label">备注</text>
            <u--input v-model="form.note" placeholder="选填" border="none" class="custom-input"></u--input>
          </view>
        </view>

        <view class="footer-actions">
          <u-button type="primary" text="保存成员信息" shape="circle" class="save-btn" @click="saveMember"></u-button>
        </view>
      </view>
    </u-popup>

    <u-action-sheet :show="showGender" :actions="genderActions" @select="onGenderSelect" @close="showGender = false"></u-action-sheet>
    <u-action-sheet :show="showType" :actions="typeActions" @select="onTypeSelect" @close="showType = false"></u-action-sheet>
    <u-datetime-picker 
      :show="showBirth" 
      v-model="birthValue" 
      mode="date" 
      :minDate="new Date('1920-01-01').getTime()"
      :maxDate="Date.now()" 
      @confirm="onBirthConfirm" 
      @cancel="showBirth = false"
    ></u-datetime-picker>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import http from '@/utils/request.js';

const members = ref([]);
const showForm = ref(false);
const editingId = ref(null);
const showGender = ref(false);
const showType = ref(false);
const showBirth = ref(false);
const birthValue = ref(Date.now());

const form = reactive({
  name: '',
  relation: '',
  gender: '',
  birthDate: '',
  patientType: '其他',
  note: ''
});

const genderActions = [
  { name: '男', value: '男' },
  { name: '女', value: '女' }
];

const typeActions = [
  { name: '甲减', value: '甲减' },
  { name: '甲亢', value: '甲亢' },
  { name: '甲状腺结节', value: '甲状腺结节' },
  { name: '甲癌术后', value: '甲癌术后' },
  { name: '桥本氏甲状腺炎', value: '桥本氏甲状腺炎' },
  { name: '其他', value: '其他' }
];

const loadMembers = async () => {
  try {
    members.value = await http.get('/api/family/list') || [];
  } catch (e) {
    members.value = [];
  }
};

const openAdd = () => {
  editingId.value = null;
  Object.assign(form, { name: '', relation: '', gender: '', birthDate: '', patientType: '其他', note: '' });
  showForm.value = true;
};

const editMember = (item) => {
  editingId.value = item.id;
  Object.assign(form, {
    name: item.name || '',
    relation: item.relation || '',
    gender: item.gender || '',
    birthDate: item.birthDate || '',
    patientType: item.patientType || '其他',
    note: item.note || ''
  });
  showForm.value = true;
};

const saveMember = async () => {
  if (!form.name) return uni.$u.toast('请填写姓名');
  if (editingId.value) {
    await http.post('/api/family/update', { id: editingId.value, ...form });
  } else {
    await http.post('/api/family/add', form);
  }
  showForm.value = false;
  loadMembers();
};

const deleteMember = (item) => {
  uni.showModal({
    title: '删除成员',
    content: `确认删除 ${item.name} 吗？`,
    success: async (res) => {
      if (res.confirm) {
        await http.post('/api/family/delete', { id: item.id });
        loadMembers();
      }
    }
  });
};

const closeForm = () => {
  showForm.value = false;
};

const onGenderSelect = (e) => {
  form.gender = e.value;
  showGender.value = false;
};

const onTypeSelect = (e) => {
  form.patientType = e.value;
  showType.value = false;
};

const onBirthConfirm = (e) => {
  const date = new Date(e.value);
  form.birthDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  showBirth.value = false;
};

onMounted(loadMembers);
</script>

<style lang="scss" scoped>
.family-page {
  min-height: 100vh;
  background: #F6F8FC;
}

.family-body {
  padding: 32rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  .title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1D2129;
  }
  .add-btn {
    display: flex;
    align-items: center;
    gap: 8rpx;
    background: #EEF4FF;
    padding: 8rpx 16rpx;
    border-radius: 20rpx;
    color: #3E7BFF;
    font-size: 24rpx;
    font-weight: 700;
  }
}

.member-card {
  background: #FFFFFF;
  border-radius: 30rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(62, 123, 255, 0.04);
  border: 1px solid rgba(62, 123, 255, 0.05);

  .card-decorator {
    position: absolute;
    left: 0;
    top: 0;
    width: 10rpx;
    height: 100%;
    background: linear-gradient(to bottom, #3E7BFF, #689DFF);
    opacity: 0.8;
  }

  .member-avatar {
    width: 90rpx;
    height: 90rpx;
    background: #F0F5FF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 28rpx;
    flex-shrink: 0;
  }

  .member-main {
    flex: 1;
    overflow: hidden;
    
    .name-row {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-bottom: 8rpx;
      .name { font-size: 32rpx; font-weight: 800; color: #1D2129; }
      .relation-tag { 
        font-size: 20rpx; 
        color: #3E7BFF; 
        background: rgba(62, 123, 255, 0.08); 
        padding: 4rpx 12rpx; 
        border-radius: 8rpx; 
        font-weight: 700; 
      }
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 12rpx;
      margin-bottom: 12rpx;
      font-size: 24rpx;
      color: #86909C;
      font-weight: 500;
      .split { color: #E5E6EB; }
    }

    .patient-tag {
      display: inline-block;
      font-size: 20rpx;
      font-weight: 800;
      padding: 4rpx 16rpx;
      border-radius: 12rpx;
      
      &.甲减 { background: #E8F4FF; color: #1890FF; }
      &.甲亢 { background: #FFF7E8; color: #FF7D00; }
      &.其他, &.甲状腺结节, &.甲癌术后, &.桥本氏甲状腺炎 { background: #F5F5F5; color: #86909C; }
    }
  }

  .member-actions {
    display: flex;
    gap: 12rpx;
    padding-left: 20rpx;
    
    .action-item {
      width: 64rpx;
      height: 64rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 16rpx;
      transition: all 0.2s;
      
      &.edit { background: rgba(62, 123, 255, 0.05); }
      &.del { background: rgba(255, 77, 79, 0.05); }
      
      &:active { transform: scale(0.9); }
    }
  }
}

.popup-box {
  background: #FFFFFF;
  padding: 40rpx;
}

.popup-header {
  text-align: center;
  margin-bottom: 48rpx;
  .title {
    font-size: 36rpx;
    font-weight: 800;
    color: #1D2129;
  }
  .subtitle {
    font-size: 24rpx;
    color: #86909C;
    margin-top: 8rpx;
    font-weight: 500;
  }
}

.form-body {
  .form-item {
    margin-bottom: 32rpx;
    .label {
      display: block;
      font-size: 26rpx;
      color: #4E5969;
      font-weight: 700;
      margin-bottom: 16rpx;
      margin-left: 8rpx;
    }
  }
}

.custom-input {
  background: #F6F8FC;
  border-radius: 20rpx;
  padding: 12rpx 28rpx !important;
  height: 96rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.form-row {
  display: flex;
  gap: 24rpx;
  .half { flex: 1; }
}

.select-box {
  background: #F6F8FC;
  border-radius: 20rpx;
  padding: 0 32rpx;
  height: 96rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #1D2129;
  
  text.placeholder {
    color: #C9CDD4;
    font-weight: 500;
  }
}

.footer-actions {
  margin-top: 50rpx;
  padding-bottom: 30rpx;
  .save-btn {
    height: 100rpx !important;
    font-size: 32rpx !important;
    font-weight: 800 !important;
    background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%) !important;
    box-shadow: 0 12rpx 30rpx rgba(62, 123, 255, 0.25) !important;
    border: none !important;
  }
}
</style>

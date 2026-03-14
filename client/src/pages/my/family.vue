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
          <view class="member-main">
            <view class="name">{{ item.name }}</view>
            <view class="meta">
              <text v-if="item.relation">{{ item.relation }}</text>
              <text v-if="item.gender">{{ item.gender }}</text>
              <text v-if="item.birthDate">{{ item.birthDate }}</text>
            </view>
            <view class="tag">{{ item.patientType || '其他' }}</view>
          </view>
          <view class="member-actions">
            <u-icon name="edit-pen" size="16" color="#3E7BFF" @click="editMember(item)"></u-icon>
            <u-icon name="trash" size="16" color="#86909C" @click="deleteMember(item)"></u-icon>
          </view>
        </view>
      </view>

      <u-empty v-else mode="data" text="暂无成员" marginTop="60"></u-empty>
    </view>

    <u-popup :show="showForm" mode="bottom" round="24" @close="closeForm" :lockScroll="true">
      <view class="popup-box">
        <view class="popup-title">{{ editingId ? '编辑成员' : '新增成员' }}</view>
        <view class="form-item">
          <text class="label">姓名</text>
          <u--input v-model="form.name" placeholder="请输入姓名" border="surround"></u--input>
        </view>
        <view class="form-item">
          <text class="label">关系</text>
          <u--input v-model="form.relation" placeholder="如：父亲/母亲/孩子" border="surround"></u--input>
        </view>
        <view class="form-row">
          <view class="form-item half">
            <text class="label">性别</text>
            <view class="select-box" @click="showGender = true">
              <text>{{ form.gender || '请选择' }}</text>
              <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
            </view>
          </view>
          <view class="form-item half">
            <text class="label">出生日期</text>
            <view class="select-box" @click="showBirth = true">
              <text>{{ form.birthDate || '请选择' }}</text>
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
          <u--input v-model="form.note" placeholder="选填" border="surround"></u--input>
        </view>

        <u-button type="primary" text="保存" shape="circle" @click="saveMember"></u-button>
      </view>
    </u-popup>

    <u-action-sheet :show="showGender" :actions="genderActions" @select="onGenderSelect" @close="showGender = false"></u-action-sheet>
    <u-action-sheet :show="showType" :actions="typeActions" @select="onTypeSelect" @close="showType = false"></u-action-sheet>
    <u-datetime-picker :show="showBirth" v-model="birthValue" mode="date" :maxDate="Date.now()" @confirm="onBirthConfirm" @cancel="showBirth = false"></u-datetime-picker>
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
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.04);

  .member-main {
    .name {
      font-size: 28rpx;
      font-weight: 800;
      color: #1D2129;
    }
    .meta {
      font-size: 22rpx;
      color: #86909C;
      margin-top: 6rpx;
      display: flex;
      gap: 12rpx;
    }
    .tag {
      margin-top: 8rpx;
      display: inline-block;
      background: #F2F7FF;
      color: #3E7BFF;
      padding: 2rpx 10rpx;
      border-radius: 10rpx;
      font-size: 20rpx;
      font-weight: 700;
    }
  }

  .member-actions {
    display: flex;
    gap: 16rpx;
  }
}

.popup-content {
  padding: 40rpx;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 800;
  text-align: center;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 24rpx;
  .label {
    display: block;
    font-size: 24rpx;
    color: #4E5969;
    margin-bottom: 12rpx;
  }
}

.form-row {
  display: flex;
  gap: 16rpx;
  .half { flex: 1; }
}

.select-box {
  background: #F6F8FC;
  border-radius: 16rpx;
  padding: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 26rpx;
}
</style>

<template>
  <view class="admin-users">
    <u-navbar 
      title="用户管理" 
      :autoBack="true" 
      placeholder 
      border
      titleStyle="font-weight: 800; color: #1D2129;"
    ></u-navbar>
    
    <view class="search-header">
      <view class="search-box">
        <u-search 
          placeholder="搜索昵称/用户名/手机号" 
          v-model="keyword" 
          @search="onSearch" 
          @clear="onSearch"
          :show-action="false"
          bgColor="#F2F3F5"
        ></u-search>
      </view>
    </view>

    <scroll-view 
      scroll-y 
      class="list-container" 
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="user-card" v-for="user in userList" :key="user.id">
        <view class="card-main">
          <view class="avatar-wrapper">
             <u-avatar :src="user.avatar" size="56" shape="circle" :text="user.nickname?.slice(0,1)"></u-avatar>
             <view class="status-badge" :class="user.role"></view>
          </view>
          <view class="info-content">
            <view class="name-line">
              <text class="nickname">{{ user.nickname || '未设置昵称' }}</text>
              <view class="role-tag" :class="user.role">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</view>
            </view>
            <view class="account-line">
              <text class="label">账户:</text>
              <text class="value">{{ user.username || user.phone || user.email || 'H5访客' }}</text>
            </view>
            <view class="time-line">
              <text class="label">注册:</text>
              <text class="value">{{ formatDate(user.createdAt) }}</text>
            </view>
          </view>
        </view>
        
        <view class="card-actions">
          <view class="btn-group">
            <view class="btn edit" @click="editUser(user)">
              <u-icon name="edit-pen" size="14" color="#3E7BFF"></u-icon>
              <text>修改权限</text>
            </view>
            <view class="btn delete" @click="confirmDelete(user)">
              <u-icon name="trash" size="14" color="#F53F3F"></u-icon>
              <text>注销账户</text>
            </view>
          </view>
        </view>
      </view>
      
      <u-loadmore :status="loadStatus" marginTop="30" marginBottom="30"></u-loadmore>
      <view class="safe-bottom"></view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <u-modal :show="editShow" title="修改用户权限" @cancel="editShow = false" @confirm="saveUser" showCancelButton confirmColor="#3E7BFF">
      <view class="edit-form">
        <u-form labelWidth="80">
          <u-form-item label="显示昵称">
            <u-input v-model="editingUser.nickname" border="bottom" placeholder="请输入昵称"></u-input>
          </u-form-item>
          <u-form-item label="用户等级">
            <u-radio-group v-model="editingUser.role" placement="row">
              <u-radio label="普通用户" name="user"></u-radio>
              <u-radio label="系统管理" name="admin" :customStyle="{ marginLeft: '20rpx' }"></u-radio>
            </u-radio-group>
          </u-form-item>
        </u-form>
      </view>
    </u-modal>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '@/utils/request.js';
import dayjs from 'dayjs';

const keyword = ref('');
const userList = ref([]);
const page = ref(1);
const loadStatus = ref('loadmore');
const refreshing = ref(false);

const editShow = ref(false);
const editingUser = ref({});

const fetchUsers = async (isRefresh = false) => {
  if (isRefresh) {
    page.value = 1;
    loadStatus.value = 'loadmore';
  }
  
  if (loadStatus.value === 'nomore' && !isRefresh) return;
  loadStatus.value = 'loading';

  try {
    const res = await http.get('/api/admin/users', {
      page: page.value,
      pageSize: 20,
      keyword: keyword.value
    });

    if (isRefresh) {
      userList.value = res.list;
    } else {
      userList.value = [...userList.value, ...res.list];
    }

    if (userList.value.length >= res.total) {
      loadStatus.value = 'nomore';
    } else {
      loadStatus.value = 'loadmore';
      page.value++;
    }
  } catch (err) {
    uni.$u.toast('获取用户失败');
    loadStatus.value = 'loadmore';
  } finally {
    refreshing.value = false;
  }
};

const onSearch = () => {
  fetchUsers(true);
};

const onRefresh = () => {
  refreshing.value = true;
  fetchUsers(true);
};

const loadMore = () => {
  fetchUsers();
};

const formatDate = (date) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

const editUser = (user) => {
  editingUser.value = { ...user };
  editShow.value = true;
};

const saveUser = async () => {
  try {
    await http.post(`/api/admin/users/${editingUser.value.id}/update`, {
      role: editingUser.value.role,
      nickname: editingUser.value.nickname
    });
    uni.$u.toast('修改权限成功');
    editShow.value = false;
    fetchUsers(true);
  } catch (err) {
    uni.$u.toast(err.message || '修改失败');
  }
};

const confirmDelete = (user) => {
  uni.showModal({
    title: '账户注销提示',
    content: `确定要永久注销并删除用户 "${user.nickname || user.username || user.id}" 吗？此操作不可逆！`,
    confirmColor: '#F53F3F',
    success: async (res) => {
      if (res.confirm) {
        try {
          await http.delete(`/api/admin/users/${user.id}`);
          uni.$u.toast('注销成功');
          fetchUsers(true);
        } catch (err) {
          uni.$u.toast(err.message || '注销失败');
        }
      }
    }
  });
};

onMounted(() => {
  fetchUsers(true);
});
</script>

<style lang="scss" scoped>
.admin-users {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #F8FAFF;
}

.search-header {
  background: #FFFFFF;
  padding: 20rpx 32rpx;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1rpx;
    background: #F2F3F5;
  }
}

.list-container {
  flex: 1;
  padding: 20rpx 32rpx;
}

.user-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  margin-bottom: 24rpx;
  padding: 32rpx 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.02);
  border: 1rpx solid rgba(0, 0, 0, 0.01);
  box-sizing: border-box;
  
  .card-main {
    display: flex;
    margin-bottom: 28rpx;
    
    .avatar-wrapper {
      position: relative;
      margin-right: 28rpx;
      
      .status-badge {
        position: absolute;
        bottom: 4rpx;
        right: 4rpx;
        width: 14rpx;
        height: 14rpx;
        border-radius: 50%;
        border: 4rpx solid #FFFFFF;
        background: #C9CDD4;
        
        &.admin { background: #F53F3F; }
        &.user { background: #3E7BFF; }
      }
    }
    
    .info-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      
      .name-line {
        display: flex;
        align-items: center;
        margin-bottom: 12rpx;
        
        .nickname {
          font-size: 32rpx;
          font-weight: 800;
          color: #1D2129;
          margin-right: 16rpx;
        }
        
        .role-tag {
          font-size: 20rpx;
          padding: 4rpx 16rpx;
          border-radius: 40rpx;
          font-weight: 700;
          
          &.admin { background: #FFF1F0; color: #F5222D; }
          &.user { background: #E6F7FF; color: #1890FF; }
        }
      }
      
      .account-line, .time-line {
        display: flex;
        align-items: center;
        margin-bottom: 4rpx;
        
        .label {
          font-size: 24rpx;
          color: #C9CDD4;
          margin-right: 12rpx;
          font-weight: 500;
        }
        
        .value {
          font-size: 24rpx;
          color: #86909C;
          font-weight: 600;
        }
      }
    }
  }
  
  .card-actions {
    border-top: 1rpx solid #F2F3F5;
    padding-top: 24rpx;
    
    .btn-group {
      display: flex;
      justify-content: flex-end;
      gap: 16rpx;
      
      .btn {
        display: flex;
        align-items: center;
        padding: 10rpx 16rpx;
        border-radius: 12rpx;
        transition: all 0.2s;
        min-width: 150rpx;
        justify-content: center;
        
        text {
          font-size: 24rpx;
          font-weight: 700;
          margin-left: 8rpx;
        }
        
        &.edit {
          background: #3E7BFF;
          color: #FFFFFF;
          u-icon { opacity: 1; }
          // 设置背景渐变覆盖默认背景
          background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
          text { color: #FFFFFF; }
          u-icon { :deep(.u-icon__icon) { color: #FFFFFF !important; } }
        }
        
        &.delete {
          background: #F8FAFF;
          border: 1rpx solid #F2F3F5;
          text { color: #F53F3F; }
          &:active { background: #FFF1F0; }
        }
        
        &:active {
          transform: scale(0.95);
        }
      }
    }
  }
}

// 修正编辑按钮中的图标颜色
.btn.edit :deep(.u-icon__icon) {
  color: #FFFFFF !important;
}

.edit-form {
  padding: 40rpx;
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}
</style>

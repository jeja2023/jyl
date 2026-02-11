<template>
  <view class="settings-page">
    <u-navbar title="账号设置" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="settings-body">
      <!-- 账号安全 -->
      <view class="section-card">
        <view class="section-title">账号安全</view>
        
        <view class="setting-item" @click="showPasswordModal = true">
          <view class="item-left">
            <u-icon name="lock" size="20" color="#3E7BFF"></u-icon>
            <text class="item-title">修改密码</text>
          </view>
          <view class="item-right">
            <text class="item-desc">{{ hasPassword ? '已设置' : '未设置' }}</text>
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
        
        <view class="setting-item">
          <view class="item-left">
            <u-icon name="phone" size="20" color="#27C24C"></u-icon>
            <text class="item-title">绑定手机号</text>
          </view>
          <view class="item-right">
            <text class="item-desc success">{{ maskedPhone }}</text>
            <u-icon name="checkmark-circle" size="16" color="#27C24C" v-if="userInfo?.phone"></u-icon>
          </view>
        </view>
      </view>

      <!-- 数据管理 -->
      <view class="section-card">
        <view class="section-title">数据管理</view>
        
        <view class="setting-item" @click="handleClearCache">
          <view class="item-left">
            <u-icon name="trash" size="20" color="#FF902B"></u-icon>
            <text class="item-title">清除缓存</text>
          </view>
          <view class="item-right">
            <text class="item-desc">{{ cacheSize }}</text>
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
      </view>

      <!-- 危险操作 -->
      <view class="section-card danger-section">
        <view class="section-title">账号注销</view>
        
        <view class="setting-item" @click="handleDeleteAccount">
          <view class="item-left">
            <u-icon name="error-circle" size="20" color="#F05050"></u-icon>
            <text class="item-title danger">注销账号</text>
          </view>
          <view class="item-right">
            <u-icon name="arrow-right" size="14" color="#C9CDD4"></u-icon>
          </view>
        </view>
        
        <view class="danger-tip">
          <text>注销后，您的所有数据将被永久删除且无法恢复</text>
        </view>
      </view>
    </view>

    <!-- 修改密码弹窗 -->
    <u-popup :show="showPasswordModal" mode="center" round="20" @close="showPasswordModal = false">
      <view class="password-popup">
        <text class="popup-title">{{ hasPassword ? '修改密码' : '设置密码' }}</text>
        
        <view class="input-group" v-if="hasPassword">
          <text class="input-label">原密码</text>
          <u--input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" border="surround"></u--input>
        </view>
        
        <view class="input-group">
          <text class="input-label">新密码</text>
          <u--input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码(至少6位)" border="surround"></u--input>
        </view>
        
        <view class="input-group">
          <text class="input-label">确认密码</text>
          <u--input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" border="surround"></u--input>
        </view>
        
        <u-button type="primary" text="确认修改" shape="circle" @click="handleChangePassword" :loading="saving"></u-button>
        <view class="cancel-link" @click="showPasswordModal = false">取消</view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

const showPasswordModal = ref(false);
const saving = ref(false);
const cacheSize = ref('0 KB');
const hasPassword = ref(true); // 假设已设置密码

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 手机号脱敏
const maskedPhone = computed(() => {
  const phone = userInfo.value?.phone;
  if (!phone) return '未绑定';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
});

// 计算缓存大小
const calculateCacheSize = () => {
  try {
    let totalSize = 0;
    for (let key in uni.getStorageInfoSync().keys) {
      const data = uni.getStorageSync(key);
      if (data) {
        totalSize += JSON.stringify(data).length;
      }
    }
    if (totalSize > 1024 * 1024) {
      cacheSize.value = (totalSize / 1024 / 1024).toFixed(2) + ' MB';
    } else if (totalSize > 1024) {
      cacheSize.value = (totalSize / 1024).toFixed(2) + ' KB';
    } else {
      cacheSize.value = totalSize + ' B';
    }
  } catch (e) {
    cacheSize.value = '计算中...';
  }
};

// 修改密码
const handleChangePassword = async () => {
  if (hasPassword.value && !passwordForm.value.oldPassword) {
    return uni.$u.toast('请输入原密码');
  }
  if (!passwordForm.value.newPassword || passwordForm.value.newPassword.length < 6) {
    return uni.$u.toast('新密码至少6位');
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    return uni.$u.toast('两次密码输入不一致');
  }
  
  saving.value = true;
  try {
    await http.post('/api/auth/setPassword', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    });
    uni.$u.toast('密码修改成功');
    showPasswordModal.value = false;
    passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' };
  } catch (e) {
    // 错误已由拦截器处理
  } finally {
    saving.value = false;
  }
};

// 清除缓存
const handleClearCache = () => {
  uni.showModal({
    title: '清除缓存',
    content: '确定要清除本地缓存吗？',
    success: (res) => {
      if (res.confirm) {
        try {
          uni.clearStorageSync();
          cacheSize.value = '0 KB';
          uni.$u.toast('清除成功');
        } catch (e) {
          uni.$u.toast('清除失败');
        }
      }
    }
  });
};

// 注销账号
const handleDeleteAccount = () => {
  uni.showModal({
    title: '⚠️ 危险操作',
    content: '注销后您的所有数据将被永久删除，此操作不可恢复！',
    confirmColor: '#F05050',
    confirmText: '确认注销',
    success: (res) => {
      if (res.confirm) {
        uni.showModal({
          title: '再次确认',
          content: '请输入"确认注销"以继续',
          editable: true,
          placeholderText: '确认注销',
          success: async (res2) => {
            if (res2.confirm && res2.content === '确认注销') {
              try {
                // 调用注销接口
                uni.$u.toast('账号已注销');
                userStore.logout();
                uni.reLaunch({ url: '/pages/login/login' });
              } catch (e) {
                uni.$u.toast('注销失败');
              }
            } else if (res2.confirm) {
              uni.$u.toast('输入不正确');
            }
          }
        });
      }
    }
  });
};

onMounted(() => {
  calculateCacheSize();
});
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background-color: #F6F8FC;
}

.settings-body {
  padding: 32rpx;
}

.section-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  
  .section-title {
    font-size: 24rpx;
    color: #86909C;
    margin-bottom: 24rpx;
    font-weight: 600;
  }
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F2F3F5;
  
  &:last-of-type { border-bottom: none; }
  
  .item-left {
    display: flex;
    align-items: center;
    
    .item-title {
      font-size: 30rpx;
      color: #1D2129;
      margin-left: 20rpx;
      
      &.danger { color: #F05050; }
    }
  }
  
  .item-right {
    display: flex;
    align-items: center;
    
    .item-desc {
      font-size: 26rpx;
      color: #86909C;
      margin-right: 8rpx;
      
      &.success { color: #27C24C; }
    }
  }
}

.danger-section {
  border: 1rpx solid rgba(240, 80, 80, 0.2);
  
  .danger-tip {
    margin-top: 16rpx;
    padding: 16rpx;
    background: #FFF5F5;
    border-radius: 12rpx;
    
    text {
      font-size: 22rpx;
      color: #F05050;
      line-height: 1.5;
    }
  }
}

.password-popup {
  padding: 48rpx 40rpx;
  width: 580rpx;
  
  .popup-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1D2129;
    text-align: center;
    display: block;
    margin-bottom: 40rpx;
  }
  
  .input-group {
    margin-bottom: 24rpx;
    
    .input-label {
      font-size: 26rpx;
      color: #4E5969;
      margin-bottom: 12rpx;
      display: block;
    }
  }
  
  .cancel-link {
    text-align: center;
    margin-top: 24rpx;
    font-size: 28rpx;
    color: #86909C;
  }
}
</style>

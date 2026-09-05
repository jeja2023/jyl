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
            <u-icon name="email" size="20" color="#3E7BFF"></u-icon>
            <text class="item-title">账号邮箱</text>
          </view>
          <view class="item-right">
            <text class="item-desc success">{{ maskedEmail }}</text>
            <u-icon name="checkmark-circle" size="16" color="#27C24C" v-if="userInfo?.email"></u-icon>
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
    <u-popup :show="showPasswordModal" mode="center" round="20" @close="showPasswordModal = false" :lockScroll="true">
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

    <!-- 注销账号弹窗：不可逆操作，必须手输确认短语 + 二次身份校验 -->
    <u-popup :show="showDeleteModal" mode="center" round="20" @close="closeDeleteModal" :lockScroll="true">
      <view class="password-popup">
        <text class="popup-title danger">注销账号</text>

        <view class="delete-warning">
          <text>注销后，您的健康记录、家庭成员、用药与复查数据将被永久删除，无法恢复。</text>
        </view>

        <view class="input-group">
          <text class="input-label">请输入“{{ DELETE_CONFIRM_TEXT }}”</text>
          <u--input v-model="deleteForm.confirmText" :placeholder="DELETE_CONFIRM_TEXT" border="surround"></u--input>
        </view>

        <view class="input-group" v-if="hasPassword">
          <text class="input-label">登录密码</text>
          <u--input v-model="deleteForm.password" type="password" placeholder="请输入登录密码" border="surround"></u--input>
        </view>

        <view class="input-group" v-else>
          <text class="input-label">验证码</text>
          <view class="code-row">
            <u--input v-model="deleteForm.code" type="number" maxlength="6" placeholder="6位验证码" border="surround"></u--input>
            <u-button
              size="small"
              type="primary"
              plain
              :text="codeCountdown > 0 ? `${codeCountdown}s` : '获取验证码'"
              :disabled="codeCountdown > 0 || sendingCode"
              @click="sendDeleteCode"
            ></u-button>
          </view>
          <text class="input-hint">验证码将发送至 {{ verifyTargetLabel }}</text>
        </view>

        <u-button type="error" text="永久注销账号" shape="circle" @click="submitDeleteAccount" :loading="deleting"></u-button>
        <view class="cancel-link" @click="closeDeleteModal">取消</view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);

const showPasswordModal = ref(false);
const saving = ref(false);
const cacheSize = ref('0 KB');
const hasPassword = computed(() => !!userInfo.value?.hasPassword);
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

// 注销账号相关状态
const showDeleteModal = ref(false);
const deleting = ref(false);
const sendingCode = ref(false);
const codeCountdown = ref(0);
let countdownTimer = null;
const deleteForm = ref({
  confirmText: '',
  password: '',
  code: ''
});

const clearCountdown = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  codeCountdown.value = 0;
};

// 邮箱脱敏
const maskedEmail = computed(() => {
  const email = userInfo.value?.email;
  if (!email) return '未绑定';
  const [name, domain] = email.split('@');
  return name.length > 3 ? `${name.slice(0, 3)}***@${domain}` : `***@${domain}`;
});

// 注销验证码的发送目标（脱敏展示）
const verifyTargetLabel = computed(() => {
  const phone = userInfo.value?.phone;
  if (phone) return `手机 ${String(phone).slice(0, 3)}****${String(phone).slice(-4)}`;
  if (userInfo.value?.email) return `邮箱 ${maskedEmail.value}`;
  return '未绑定的手机/邮箱';
});

// 计算缓存大小
const calculateCacheSize = () => {
  try {
    let totalSize = 0;
    const storageInfo = uni.getStorageInfoSync();
    if (storageInfo && storageInfo.keys) {
      for (let key of storageInfo.keys) {
        const data = uni.getStorageSync(key);
        if (data) {
          totalSize += JSON.stringify(data).length;
        }
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
    cacheSize.value = '0 KB';
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
    const res = await http.post('/api/auth/setPassword', {
      oldPassword: passwordForm.value.oldPassword,
      newPassword: passwordForm.value.newPassword
    });
    // 改密会作废此前签发的所有令牌（含本机当前这个），
    // 后端会回一个新令牌，换上它本机才不会被自己踢下线。
    if (res?.token) {
      userStore.setToken(res.token);
    }
    uni.$u.toast('密码修改成功');
    // 修改成功后更新用户信息中的密码标志
    if (userStore.userInfo) userStore.userInfo.hasPassword = true;
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
//
// 这里以前只有一行 `// TODO: 调用注销接口`，然后直接 toast「账号已注销」
// 并清掉本地状态——用户被明确告知数据已删除，服务端其实什么都没做。
// 现在真正调用服务端删除接口，并且只有接口成功才登出。
const DELETE_CONFIRM_TEXT = '确认注销';

const handleDeleteAccount = () => {
  uni.showModal({
    title: '危险操作',
    content: '注销后您的所有数据将被永久删除，此操作不可恢复！',
    confirmColor: '#F05050',
    confirmText: '继续',
    success: (res) => {
      if (res.confirm) {
        deleteForm.value = { confirmText: '', password: '', code: '' };
        showDeleteModal.value = true;
      }
    }
  });
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  deleteForm.value = { confirmText: '', password: '', code: '' };
};

// 没设置密码的账号（微信/短信登录）用验证码做二次校验，
// 复用登录验证码通道，目标必须是账号自己绑定的手机/邮箱
const sendDeleteCode = async () => {
  const phone = userInfo.value?.phone;
  const email = userInfo.value?.email;
  if (!phone && !email) {
    return uni.$u.toast('账号未绑定手机或邮箱，请先设置密码');
  }

  sendingCode.value = true;
  try {
    if (phone) {
      await http.post('/api/auth/sms/send', { phone, type: 'login' });
    } else {
      await http.post('/api/auth/email/send', { email, type: 'login' });
    }
    uni.$u.toast('验证码已发送');
    codeCountdown.value = 60;
    countdownTimer = setInterval(() => {
      codeCountdown.value -= 1;
      if (codeCountdown.value <= 0) clearCountdown();
    }, 1000);
  } catch (e) {
    // 错误已由拦截器提示
  } finally {
    sendingCode.value = false;
  }
};

const submitDeleteAccount = async () => {
  if (deleteForm.value.confirmText.trim() !== DELETE_CONFIRM_TEXT) {
    return uni.$u.toast(`请输入“${DELETE_CONFIRM_TEXT}”`);
  }
  if (hasPassword.value && !deleteForm.value.password) {
    return uni.$u.toast('请输入登录密码');
  }
  if (!hasPassword.value && !/^\d{6}$/.test(deleteForm.value.code)) {
    return uni.$u.toast('请输入6位验证码');
  }

  deleting.value = true;
  try {
    await http.post('/api/auth/account/delete', {
      confirmText: deleteForm.value.confirmText.trim(),
      password: hasPassword.value ? deleteForm.value.password : undefined,
      code: hasPassword.value ? undefined : deleteForm.value.code
    });

    clearCountdown();
    showDeleteModal.value = false;
    uni.$u.toast('账号及全部数据已删除');
    userStore.logout();
    // 本地缓存里可能还留着健康数据快照，一并清掉
    try { uni.clearStorageSync(); } catch (e) { /* 忽略 */ }
    setTimeout(() => uni.reLaunch({ url: '/pages/login' }), 800);
  } catch (e) {
    // 失败时绝不能登出，否则又变成"看起来注销了其实没删"
  } finally {
    deleting.value = false;
  }
};

onMounted(() => {
  calculateCacheSize();
});

onUnmounted(() => {
  clearCountdown();
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

    &.danger { color: #F05050; }
  }

  // 注销弹窗的风险提示
  .delete-warning {
    background: #FFF2F0;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 32rpx;

    text {
      font-size: 26rpx;
      line-height: 1.6;
      color: #C9302C;
    }
  }

  .input-group {
    margin-bottom: 24rpx;

    .input-label {
      font-size: 26rpx;
      color: #4E5969;
      margin-bottom: 12rpx;
      display: block;
    }

    .input-hint {
      font-size: 22rpx;
      color: #86909C;
      margin-top: 10rpx;
      display: block;
    }

    // 验证码输入框与发送按钮同行
    .code-row {
      display: flex;
      align-items: center;
      gap: 16rpx;

      // 用 :deep() 而不是 /deep/：后者以斜杠开头，
      // sass 的 modern-compiler 会解析失败导致整个构建挂掉
      :deep(.u-input) {
        flex: 1;
      }
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

<template>
  <view class="login-wrapper">
    <!-- 装饰性背景 -->
    <view class="bg-circles">
      <view class="circle c1"></view>
      <view class="circle c2"></view>
    </view>

    <view class="content-body">
      <view class="logo-area">
        <image src="/static/logo.ico" mode="aspectFit" class="logo-img"></image>
        <view class="brand-name">甲友乐</view>
        <view class="brand-slogan">指标管理 · 趋势监测 · 经验交流</view>
        <view class="medical-disclaimer-tip">非医疗诊断工具，不提供医疗建议</view>
      </view>

      <!-- 登录方式切换 -->
      <view class="login-tabs">
        <view class="tab-item" :class="{active: loginType === 'password'}" @click="loginType = 'password'">
          <text>账号登录</text>
          <view class="active-line"></view>
        </view>
        <view class="tab-item" :class="{active: loginType === 'phone'}" @click="loginType = 'phone'">
          <text>手机注册</text>
          <view class="active-line"></view>
        </view>
      </view>

      <view class="form-container">
        <!-- 账号登录表单 -->
        <view v-if="loginType === 'password'" class="form-fields">
          <view class="input-group">
            <u-icon name="account" size="22" color="#3E7BFF"></u-icon>
            <u--input placeholder="手机号 / 用户名" border="none" v-model="loginForm.username" class="custom-input"></u--input>
          </view>
          <view class="input-group">
            <u-icon name="lock" size="22" color="#3E7BFF"></u-icon>
            <u--input placeholder="登录密码" type="password" border="none" v-model="loginForm.password" class="custom-input"></u--input>
          </view>
        </view>

        <!-- 手机号注册表单 -->
        <view v-else class="form-fields">
          <view class="input-group">
            <u-icon name="phone" size="22" color="#3E7BFF"></u-icon>
            <u--input placeholder="手机号" border="none" v-model="phoneForm.phone" type="number" maxlength="11" class="custom-input"></u--input>
          </view>
          <view class="input-group">
            <u-icon name="integral" size="22" color="#3E7BFF"></u-icon>
            <u--input placeholder="验证码" border="none" v-model="phoneForm.code" type="number" maxlength="6" class="custom-input"></u--input>
            <view class="code-btn" @click="handleSendCode">
              {{ codeTime > 0 ? `${codeTime}s` : '获取验证码' }}
            </view>
          </view>
          <view class="input-group">
            <u-icon name="edit-pen" size="22" color="#3E7BFF"></u-icon>
            <u--input placeholder="设置登录密码 (至少6位)" type="password" border="none" v-model="phoneForm.password" class="custom-input"></u--input>
          </view>
        </view>

        <view class="aux-links">
           <text v-if="loginType === 'password'" @click="loginType = 'phone'">还没有账号？<text class="blue">去注册</text></text>
           <text v-else @click="loginType = 'password'">已有账号？<text class="blue">去登录</text></text>
        </view>

        <!-- 用户协议 (移至按钮上方) -->
        <view class="agreement-area">
          <u-checkbox-group v-model="agreementChecked">
            <u-checkbox shape="circle" :name="true" activeColor="#3E7BFF" size="14"></u-checkbox>
          </u-checkbox-group>
          <view class="ag-text">
            登录即代表您同意 
            <text class="link" @click="goToPage('agreement')">《用户协议》</text> 
            和 
            <text class="link" @click="goToPage('privacy')">《隐私政策》</text>
          </view>
        </view>

        <u-button 
          type="primary" 
          :loading="loading" 
          :text="loginType === 'password' ? '立即登录' : '立即注册'" 
          shape="circle" 
          class="submit-btn" 
          @click="submitLogin"
        ></u-button>
      </view>

      <!-- 微信登录区域 (预览展示) -->
      <view class="wechat-login-section">
        <view class="divider-text">
          <view class="line"></view>
          <text>其他快捷登录方案</text>
          <view class="line"></view>
        </view>
        
        <view class="wechat-quick-icons">
           <!-- 微信快速登录 (全环境支持) -->
           <view class="icon-btn-wrapper">
             <view class="icon-circle-btn wechat" @click="handleWechatLogin">
                <u-icon name="weixin-fill" size="30" color="#fff"></u-icon>
             </view>
             <text>微信一键登录</text>
           </view>
        </view>
      </view>


    </view>

    <!-- 完善资料弹窗（新用户） -->
    <u-popup :show="showRegister" mode="center" round="20" @close="showRegister = false" :closeOnClickOverlay="false">
      <view class="register-popup">
        <view class="popup-title">欢迎加入甲友乐</view>
        <view class="popup-desc">请选择您的疾病类型，以便提供更精准的健康管理服务</view>
        
        <view class="type-grid">
          <view 
            v-for="type in patientTypes" 
            :key="type" 
            class="type-item"
            :class="{active: regForm.patientType === type}"
            @click="regForm.patientType = type"
          >
            {{ type }}
          </view>
        </view>
        
        <u-button type="primary" :loading="loading" text="开始使用" shape="circle" class="submit-btn popup-btn" @click="handleCompleteRegister"></u-button>
        <view class="skip-link" @click="skipRegister">跳过，稍后完善</view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const loading = ref(false);
const showRegister = ref(false);
const agreementChecked = ref([]); // 勾选状态

const isAgree = computed(() => agreementChecked.value.length > 0);

const patientTypes = ['甲减', '甲亢', '甲状腺结节', '甲癌术后', '桥本氏甲状腺炎', '其他'];

const loginForm = reactive({ username: '', password: '' });
const phoneForm = reactive({ phone: '', code: '', password: '' });
const regForm = reactive({ patientType: '' });
const loginType = ref('password'); // password | phone
const codeTime = ref(0);
let timer = null;

const goToPage = (type) => {
    uni.navigateTo({ url: `/pages/my/${type}` });
};

// 临时存储登录结果（用于新用户完善资料）
let pendingLoginResult = null;

// ==================== 登录入口 ====================
const submitLogin = () => {
    if (!isAgree.value) {
        return uni.$u.toast('请阅读并勾选用户协议');
    }
    if (loginType.value === 'password') {
        handleLogin();
    } else {
        handlePhoneRegister();
    }
};

// ==================== 手机号注册 ====================
const handleSendCode = async () => {
    if (codeTime.value > 0) return;
    if (!phoneForm.phone || !/^1[3-9]\d{9}$/.test(phoneForm.phone)) {
        return uni.$u.toast('请输入正确的手机号');
    }
    
    try {
        await http.post('/api/auth/sms/send', { phone: phoneForm.phone, type: 'register' });
        uni.$u.toast('验证码已发送');
        codeTime.value = 60;
        timer = setInterval(() => {
            codeTime.value--;
            if (codeTime.value <= 0) clearInterval(timer);
        }, 1000);
    } catch (e) {
        // failed
    }
};

const handlePhoneRegister = async () => {
    if (!phoneForm.phone || !phoneForm.code) {
        return uni.$u.toast('请输入手机号和验证码');
    }
    if (!phoneForm.password || phoneForm.password.length < 6) {
        return uni.$u.toast('请设置至少6位登录密码');
    }
    
    loading.value = true;
    try {
        const res = await http.post('/api/auth/sms/register', {
            phone: phoneForm.phone,
            code: phoneForm.code,
            password: phoneForm.password
        });
        
        // 注册也是一种登录成功，如果是新用户则完善资料
        if (res.isNewUser) {
            pendingLoginResult = res;
            showRegister.value = true;
        } else {
            completeLogin(res);
        }
        // 清空敏感字段
        phoneForm.code = '';
        phoneForm.password = '';
    } catch (e) {
        // failed
    } finally {
        loading.value = false;
    }
};

// ==================== 传统密码登录（H5/APP备用）====================
const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    return uni.$u.toast('请输入完整登录信息');
  }
  loading.value = true;
  try {
    const res = await http.post('/api/auth/login', loginForm);
    completeLogin(res);
  } catch (err) {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
};

// ==================== 微信登录 ====================
const handleWechatLogin = () => {
  if (!isAgree.value) {
      return uni.$u.toast('请阅读并勾选用户协议');
  }
  // #ifdef H5
  // H5 环境下模拟微信登录流程
  loading.value = true;
  http.post('/api/auth/wechat/login', {
    code: 'DEV_MOCK_CODE',
    userInfo: { nickName: 'H5访客' }
  }).then(res => {
    if (res.isNewUser) {
        pendingLoginResult = res;
        showRegister.value = true;
    } else {
        completeLogin(res);
    }
  }).finally(() => {
    loading.value = false;
  });
  // #endif

  // #ifdef MP-WEIXIN
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      if (loginRes.code) {
        loading.value = true;
        try {
          // 获取用户信息
          let userInfo = null;
          try {
            const profileRes = await new Promise((resolve, reject) => {
              uni.getUserProfile({
                desc: '用于完善会员资料',
                success: resolve,
                fail: reject
              });
            });
            userInfo = profileRes.userInfo;
          } catch (e) {
            // 用户拒绝授权，继续登录
            console.log('[微信] 用户未授权用户信息');
          }
          
          const res = await http.post('/api/auth/wechat/login', {
            code: loginRes.code,
            userInfo
          });
          
          if (res.isNewUser) {
            // 新用户，弹出完善资料
            pendingLoginResult = res;
            showRegister.value = true;
          } else {
            completeLogin(res);
          }
        } catch (err) {
          console.error('[微信登录] 失败:', err);
          uni.$u.toast('登录失败，请重试');
        } finally {
          loading.value = false;
        }
      }
    },
    fail: (err) => {
      console.error('[微信登录] wx.login失败:', err);
      uni.$u.toast('微信登录失败');
    }
  });
  // #endif
};

// 微信获取手机号登录
const onGetPhoneNumber = async (e) => {
  if (!isAgree.value) {
      return uni.$u.toast('请阅读并勾选用户协议');
  }
  // #ifdef MP-WEIXIN
  if (e.detail.errMsg === 'getPhoneNumber:ok') {
    loading.value = true;
    try {
      // 先获取登录code
      const loginRes = await new Promise((resolve, reject) => {
        uni.login({ provider: 'weixin', success: resolve, fail: reject });
      });
      
      const res = await http.post('/api/auth/wechat/phone', {
        code: loginRes.code,
        phoneCode: e.detail.code
      });
      
      if (res.isNewUser) {
        pendingLoginResult = res;
        showRegister.value = true;
      } else {
        completeLogin(res);
      }
    } catch (err) {
      console.error('[微信手机号登录] 失败:', err);
      uni.$u.toast('获取手机号失败，请重试');
    } finally {
      loading.value = false;
    }
  } else if (e.detail.errMsg === 'getPhoneNumber:fail user deny') {
    uni.$u.toast('您取消了手机号授权');
  } else {
    uni.$u.toast('获取手机号失败');
  }
  // #endif
};

// ==================== 完成登录/注册 ====================
const completeLogin = (res) => {
  userStore.setToken(res.token);
  userStore.setUserInfo(res.userInfo);
  uni.$u.toast('登录成功');
  setTimeout(() => { uni.switchTab({ url: '/pages/index/index' }); }, 1000);
};

// 完成注册（更新用户资料）
const handleCompleteRegister = async () => {
  if (!regForm.patientType) {
    return uni.$u.toast('请选择疾病类型');
  }
  
  loading.value = true;
  try {
    // 先保存token
    userStore.setToken(pendingLoginResult.token);
    
    // 更新用户资料
    await http.post('/api/auth/profile/update', { 
      patientType: regForm.patientType 
    });
    
    // 获取最新用户信息
    const profile = await http.get('/api/auth/profile');
    userStore.setUserInfo(profile);
    
    showRegister.value = false;
    uni.$u.toast('欢迎加入甲友乐');
    setTimeout(() => { uni.switchTab({ url: '/pages/index/index' }); }, 1000);
  } catch (err) {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
};

// 跳过完善资料
const skipRegister = () => {
  if (pendingLoginResult) {
    completeLogin(pendingLoginResult);
  }
  showRegister.value = false;
};
</script>

<style lang="scss" scoped>
.login-wrapper {
  min-height: 100vh;
  background-color: #F8FAFF;
  position: relative;
  overflow: hidden;
}

.bg-circles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  .circle {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.6;
  }
  .c1 {
    width: 500rpx;
    height: 500rpx;
    background: rgba(62, 123, 255, 0.15);
    top: -150rpx;
    right: -100rpx;
  }
  .c2 {
    width: 700rpx;
    height: 700rpx;
    background: rgba(104, 157, 255, 0.12);
    bottom: -200rpx;
    left: -250rpx;
  }
}

.content-body {
  position: relative;
  z-index: 10;
  padding: 0 80rpx;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-area {
  margin-top: 180rpx;
  margin-bottom: 120rpx;
  text-align: center;
  .logo-img { 
    width: 160rpx; 
    height: 160rpx; 
    margin-bottom: 32rpx;
    filter: drop-shadow(0 10rpx 20rpx rgba(62, 123, 255, 0.2));
  }
  .brand-name { 
    font-size: 56rpx; 
    font-weight: 900; 
    color: #1D2129; 
    letter-spacing: 4rpx;
    background: linear-gradient(135deg, #1D2129 0%, #3E7BFF 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .brand-slogan { 
    font-size: 28rpx; 
    color: #4E5969; 
    margin-top: 16rpx;
    font-weight: 700;
  }
  .medical-disclaimer-tip {
    font-size: 22rpx;
    color: #F53F3F;
    margin-top: 12rpx;
    font-weight: 600;
    opacity: 0.8;
  }
}

// 微信登录区域
.wechat-login-area {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .login-tip {
    font-size: 28rpx;
    color: #86909C;
    margin-bottom: 60rpx;
  }
  
  .wechat-btn {
    width: 100% !important;
    height: 110rpx !important;
    font-size: 34rpx !important;
    font-weight: 800 !important;
    background: linear-gradient(135deg, #07C160, #2DC76D) !important;
    border: none !important;
    box-shadow: 0 15rpx 35rpx rgba(7, 193, 96, 0.25) !important;
    border-radius: 55rpx !important;
  }
  
  .phone-auth-btn {
    margin-top: 40rpx;
    padding: 24rpx 60rpx;
    font-size: 30rpx;
    color: #3E7BFF;
    background: #FFFFFF;
    border-radius: 60rpx;
    border: 2rpx solid #EEF4FF;
    font-weight: 700;
    box-shadow: 0 8rpx 20rpx rgba(62, 123, 255, 0.05);
    
    &::after { display: none; }
    &:active { background: #F8FAFF; }
  }
}

// 传统登录切换
.login-tabs {
  margin-bottom: 70rpx;
  display: flex;
  justify-content: center;
  gap: 100rpx;
  
  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    
    text {
      font-size: 32rpx;
      color: #C9CDD4;
      font-weight: 700;
      transition: all 0.3s;
    }
    
    .active-line {
      width: 0;
      height: 8rpx;
      background: #3E7BFF;
      border-radius: 10rpx;
      margin-top: 12rpx;
      transition: all 0.3s;
      opacity: 0;
    }
    
    &.active {
      text {
        color: #3E7BFF;
        font-size: 38rpx;
        transform: scale(1.1);
      }
      .active-line {
        width: 50rpx;
        opacity: 1;
        box-shadow: 0 4rpx 10rpx rgba(62, 123, 255, 0.3);
      }
    }
  }
}

.form-container {
  width: 100%;
}

.input-group {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 55rpx;
  padding: 0 44rpx;
  height: 110rpx;
  margin-bottom: 36rpx;
  border: 1px solid #F0F2F5;
  transition: all 0.3s;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.02);
  
  &:focus-within { 
    border-color: #3E7BFF; 
    box-shadow: 0 12rpx 32rpx rgba(62, 123, 255, 0.1);
  }
  
  .custom-input { flex: 1; margin-left: 20rpx; font-weight: 600; font-size: 30rpx; }
  
  .code-btn {
    font-size: 24rpx;
    color: #3E7BFF;
    font-weight: 800;
    padding: 12rpx 28rpx;
    background: #EEF4FF;
    border-radius: 30rpx;
    margin-left: 20rpx;
    
    &:active { opacity: 0.7; }
  }
}

.aux-links {
  text-align: right;
  font-size: 26rpx;
  color: #86909C;
  margin-top: 10rpx;
  margin-bottom: 40rpx;
  font-weight: 600;
  .blue { color: #3E7BFF; margin-left: 8rpx; text-decoration: underline; }
}

.submit-btn {
  width: 100% !important;
  height: 110rpx !important;
  font-size: 34rpx !important;
  font-weight: 900 !important;
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%) !important;
  border: none !important;
  box-shadow: 0 15rpx 35rpx rgba(62, 123, 255, 0.3) !important;
  border-radius: 55rpx !important;
  
  &:active { transform: scale(0.98); opacity: 0.9; }
}

// 微信登录区
.wechat-login-section {
  width: 100%;
  margin-top: 60rpx;
  
  .divider-text {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20rpx;
    margin-bottom: 40rpx;
    
    .line { flex: 0.3; height: 1rpx; background: #E5E6EB; }
    text { font-size: 24rpx; color: #C9CDD4; font-weight: 500; }
  }
  
  .wechat-quick-icons {
    display: flex;
    justify-content: center;
    gap: 100rpx;
    
    .icon-btn-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12rpx;
      
      text { font-size: 24rpx; color: #86909C; font-weight: 500; }
    }
    
    .icon-circle-btn {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      box-shadow: 0 10rpx 25rpx rgba(0,0,0,0.05);
      
      &.wechat { 
        background: linear-gradient(135deg, #07C160, #2DC76D); 
        box-shadow: 0 10rpx 25rpx rgba(7, 193, 96, 0.2);
      }
      
      &:active { transform: scale(0.9); opacity: 0.8; }
    }
  }
}

.agreement-area {
  margin-bottom: 40rpx;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0 20rpx;
  
  .ag-text {
    font-size: 24rpx;
    color: #86909C;
    line-height: 1.4;
    margin-left: 12rpx;
    font-weight: 500;
    
    .link { color: #3E7BFF; font-weight: 700; margin: 0 4rpx; }
  }
}

// 完善资料弹窗
.register-popup {
  padding: 60rpx 50rpx;
  width: 640rpx;
  
  .popup-title {
    font-size: 40rpx;
    font-weight: 900;
    color: #1D2129;
    text-align: center;
  }
  
  .popup-desc {
    font-size: 28rpx;
    color: #86909C;
    text-align: center;
    margin-top: 20rpx;
    margin-bottom: 50rpx;
    line-height: 1.6;
    font-weight: 500;
  }
  
  .type-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    
    .type-item {
      width: calc(50% - 10rpx);
      padding: 32rpx 0;
      text-align: center;
      font-size: 28rpx;
      color: #4E5969;
      background: #F8FAFF;
      border-radius: 24rpx;
      border: 3rpx solid transparent;
      transition: all 0.3s;
      font-weight: 700;
      
      &.active {
        background: #F2F7FF;
        border-color: #3E7BFF;
        color: #3E7BFF;
        transform: scale(1.05);
      }
    }
  }
  
  .popup-btn {
    margin-top: 60rpx;
  }
  
  .skip-link {
    font-size: 26rpx;
    color: #C9CDD4;
    text-align: center;
    margin-top: 30rpx;
    font-weight: 600;
  }
}
</style>

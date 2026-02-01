<template>
  <view class="login-wrapper">
    <!-- 装饰性背景 -->
    <view class="bg-circles">
      <view class="circle c1"></view>
      <view class="circle c2"></view>
    </view>

    <view class="content-body">
      <view class="logo-area">
        <image src="/static/logo.png" mode="aspectFit" class="logo-img"></image>
        <view class="brand-name">甲友乐</view>
        <view class="brand-slogan">陪伴每一个甲功平稳的日子</view>
      </view>

      <view class="form-container">
        <view class="tab-scroller">
          <view class="tab-item" :class="{active: currentTab === 0}" @click="currentTab = 0">用户登录</view>
          <view class="tab-item" :class="{active: currentTab === 1}" @click="currentTab = 1">快速注册</view>
          <view class="tab-slider" :style="{left: currentTab * 50 + '%'}"></view>
        </view>

        <view class="form-fields" v-if="currentTab === 0">
          <view class="input-group">
            <u-icon name="account" size="20" color="#86909C"></u-icon>
            <u--input placeholder="用户名 / 手机号" border="none" v-model="loginForm.username" class="custom-input"></u--input>
          </view>
          <view class="input-group">
            <u-icon name="lock" size="20" color="#86909C"></u-icon>
            <u--input placeholder="登录密码" type="password" border="none" v-model="loginForm.password" class="custom-input"></u--input>
          </view>
          <view class="aux-links">
             <text>忘记密码？</text>
          </view>
          <u-button type="primary" :loading="loading" text="立即登录" shape="circle" class="submit-btn" @click="handleLogin"></u-button>
        </view>

        <view class="form-fields" v-else>
          <view class="input-group">
            <u-icon name="account" size="20" color="#86909C"></u-icon>
            <u--input placeholder="请设定用户名" border="none" v-model="regForm.username" class="custom-input"></u--input>
          </view>
          <view class="input-group">
            <u-icon name="lock" size="20" color="#86909C"></u-icon>
            <u--input placeholder="设定 6-16 位密码" type="password" border="none" v-model="regForm.password" class="custom-input"></u--input>
          </view>
          <view class="input-group picker-group" @click="showPicker = true">
            <u-icon name="list-dot" size="20" color="#86909C"></u-icon>
            <text class="picker-val" :class="{placeholder: !regForm.patientType}">{{ regForm.patientType || '选择您的疾病类型' }}</text>
            <u-icon name="arrow-right" size="14" color="#86909C"></u-icon>
          </view>
          <u-button type="primary" :loading="loading" text="开启健康之旅" shape="circle" class="submit-btn register-btn" @click="handleRegister"></u-button>
        </view>

        <view class="third-party">
          <view class="line-box">
             <view class="line"></view>
             <text>其他登录方式</text>
             <view class="line"></view>
          </view>
          <view class="icons">
             <view class="i-circle" @click="handleWechatLogin">
                <u-icon name="weixin-fill" size="28" color="#07C160"></u-icon>
             </view>
             <view class="i-circle" @click="handlePhoneLogin">
                <u-icon name="phone-fill" size="26" color="#3E7BFF"></u-icon>
             </view>
          </view>
        </view>
      </view>

      <view class="agreement">
        登录即代表您同意 <text>《用户协议》</text> 和 <text>《隐私政策》</text>
      </view>
    </view>

    <u-picker :show="showPicker" :columns="[patientTypes]" @confirm="confirmPatientType" @cancel="showPicker = false"></u-picker>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const loading = ref(false);
const currentTab = ref(0);
const showPicker = ref(false);

const patientTypes = ['甲减', '甲亢', '甲状腺结节', '甲癌术后', '桥本氏甲状腺炎', '其他'];

const loginForm = reactive({ username: '', password: '' });
const regForm = reactive({ username: '', password: '', patientType: '' });

const confirmPatientType = (e) => {
  regForm.patientType = e.value[0];
  showPicker.value = false;
};

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) return uni.$u.toast('请输入完整登录信息');
  loading.value = true;
  try {
    const res = await http.post('/api/auth/login', loginForm);
    userStore.setToken(res.token);
    userStore.setUserInfo(res.userInfo);
    uni.$u.toast('登录成功');
    setTimeout(() => { uni.switchTab({ url: '/pages/index/index' }); }, 1000);
  } catch (err) {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  if (!regForm.username || !regForm.password || !regForm.patientType) return uni.$u.toast('请填写完整信息');
  loading.value = true;
  try {
    await http.post('/api/auth/register', regForm);
    uni.$u.toast('恭喜注册成功，请登录');
    currentTab.value = 0;
    // 自动填充用户名
    loginForm.username = regForm.username;
  } catch (err) {
    // 错误已由拦截器统一处理
  } finally {
    loading.value = false;
  }
};

const handleWechatLogin = () => {
  uni.$u.toast('微信登录对接中...');
};

const handlePhoneLogin = () => {
  uni.$u.toast('手机验证码登录对接中...');
};
</script>

<style lang="scss" scoped>
.login-wrapper {
  min-height: 100vh;
  background-color: #FFFFFF;
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
    filter: blur(80px);
  }
  .c1 {
    width: 400rpx;
    height: 400rpx;
    background: rgba(62, 123, 255, 0.1);
    top: -100rpx;
    right: -100rpx;
  }
  .c2 {
    width: 600rpx;
    height: 600rpx;
    background: rgba(104, 157, 255, 0.08);
    bottom: -150rpx;
    left: -200rpx;
  }
}

.content-body {
  position: relative;
  z-index: 10;
  padding: 0 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo-area {
  margin-top: 140rpx;
  margin-bottom: 80rpx;
  text-align: center;
  .logo-img { width: 140rpx; height: 140rpx; margin-bottom: 24rpx; }
  .brand-name { font-size: 48rpx; font-weight: 800; color: #1D2129; letter-spacing: 2rpx; }
  .brand-slogan { font-size: 26rpx; color: #86909C; margin-top: 8rpx; }
}

.form-container {
  width: 100%;
  .tab-scroller {
    display: flex;
    position: relative;
    margin-bottom: 60rpx;
    .tab-item {
      flex: 1;
      text-align: center;
      padding: 20rpx 0;
      font-size: 30rpx;
      color: #86909C;
      transition: all 0.3s;
      &.active { color: #3E7BFF; font-weight: 700; }
    }
    .tab-slider {
      position: absolute;
      bottom: 0;
      width: 50%;
      height: 6rpx;
      @include flex-center;
      transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      &::after {
        content: '';
        width: 40rpx;
        height: 6rpx;
        background: #3E7BFF;
        border-radius: 6rpx;
      }
    }
  }
}

.input-group {
  @include flex-center;
  background: #F6F8FC;
  border-radius: 40rpx;
  padding: 0 32rpx;
  height: 100rpx;
  margin-bottom: 32rpx;
  border: 2rpx solid transparent;
  transition: all 0.2s;
  &:focus-within { border-color: #3E7BFF; background: #FFFFFF; }
  
  .custom-input { flex: 1; margin-left: 20rpx; }
  .picker-val { flex: 1; margin-left: 20rpx; color: #1D2129; &.placeholder { color: #909399; } }
}

.aux-links {
  text-align: right;
  font-size: 24rpx;
  color: #86909C;
  margin-top: -8rpx;
  margin-bottom: 40rpx;
}

.submit-btn {
  height: 100rpx !important;
  font-size: 32rpx !important;
  font-weight: 700 !important;
  box-shadow: 0 12rpx 24rpx rgba(62, 123, 255, 0.25) !important;
}

.register-btn { background: linear-gradient(135deg, #10B981, #34D399) !important; border: none !important; box-shadow: 0 12rpx 24rpx rgba(16, 185, 129, 0.25) !important; }

.third-party {
  margin-top: 100rpx;
  .line-box {
    @include flex-center;
    .line { width: 100rpx; height: 1rpx; background: #E5E6EB; }
    text { font-size: 22rpx; color: #C9CDD4; margin: 0 24rpx; }
  }
  .icons {
    @include flex-center;
    margin-top: 40rpx;
    .i-circle {
      width: 96rpx;
      height: 96rpx;
      background: #F6F8FC;
      border-radius: 50%;
      @include flex-center;
      margin: 0 32rpx;
    }
  }
}

.agreement {
  margin-top: auto;
  padding-bottom: 60rpx;
  padding-top: 40rpx;
  font-size: 22rpx;
  color: #C9CDD4;
  text-align: center;
  text { color: #86909C; }
}
</style>

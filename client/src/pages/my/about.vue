<template>
  <view class="about-wrapper">
    <u-navbar title="关于甲友乐" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="logo-section">
      <image src="/static/logo.ico" mode="aspectFit" class="logo-img"></image>
      <view class="brand-name">甲友乐</view>
      <view class="version">Version 1.0.0</view>
    </view>

    <view class="content-section">
      <view class="about-card">
        <view class="card-title">产品使命</view>
        <view class="card-text">
          甲友乐是一款专为甲状腺疾病患者设计的健康管理工具。我们致力于通过技术手段，帮助每一位“甲友”更科学、更轻松地管理化验指标、用药计划和复查行程。
        </view>
      </view>

      <view class="about-card">
        <view class="card-title">核心功能</view>
        <view class="feature-list">
          <view class="feature-item">
            <u-icon name="checkmark-circle-fill" color="#3E7BFF" size="16"></u-icon>
            <text>化验单OCR识别：告别繁琐手动录入</text>
          </view>
          <view class="feature-item">
            <u-icon name="checkmark-circle-fill" color="#3E7BFF" size="16"></u-icon>
            <text>指标趋势分析：直观掌握病程变化</text>
          </view>
          <view class="feature-item">
            <u-icon name="checkmark-circle-fill" color="#3E7BFF" size="16"></u-icon>
            <text>智能用药提醒：确保服药科学规律</text>
          </view>
          <view class="feature-item">
            <u-icon name="checkmark-circle-fill" color="#3E7BFF" size="16"></u-icon>
            <text>权威甲功百科：获取专业健康知识</text>
          </view>
        </view>
      </view>

      <view class="about-card disclaimer-card">
        <view class="card-title">医疗免责声明</view>
        <view class="card-text highlight">
          甲友乐仅作为病友健康指标的管理与监测工具，不属于医疗器械软件，不具有任何医疗诊断作用。
        </view>
        <view class="card-text">
          本应用提供的所有数据分析、百科知识、健康贴士等内容均仅供个人参考，不构成任何医疗建议或诊疗方案。在做出任何医疗决策前，请务必咨询专业医生。
        </view>
      </view>

      <view class="about-card">
        <view class="card-title">联系我们</view>
        <view class="contact-item">
          <u-icon name="email" size="18" color="#3E7BFF"></u-icon>
          <text class="label">官方邮箱：</text>
          <text class="value">{{ config.SUPPORT_EMAIL }}</text>
        </view>
        <view class="contact-item">
          <u-icon name="weixin-fill" size="18" color="#3E7BFF"></u-icon>
          <text class="label">微信客服：</text>
          <text class="value">{{ config.WECHAT_SUPPORT }}</text>
        </view>
      </view>
    </view>

    <view class="footer-section">
      <view class="copyright">© 2026 甲友乐健康科技 版权所有</view>
      <view class="agreement-links">
        <text>用户协议</text>
        <view class="divider"></view>
        <text>隐私政策</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import config from '@/config/index.js';
// 基础关于页面，逻辑简单
</script>

<style lang="scss" scoped>
.about-wrapper {
  min-height: 100vh;
  background-color: #F8FAFF;
}

.logo-section {
  padding: 80rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .logo-img {
    width: 160rpx;
    height: 160rpx;
    margin-bottom: 32rpx;
    filter: drop-shadow(0 10rpx 20rpx rgba(62, 123, 255, 0.15));
  }
  
  .brand-name {
    font-size: 48rpx;
    font-weight: 900;
    color: #1D2129;
    letter-spacing: 2rpx;
  }
  
  .version {
    font-size: 24rpx;
    color: #86909C;
    margin-top: 12rpx;
    font-weight: 600;
  }
}

.content-section {
  padding: 0 40rpx;
}

.about-card {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 40rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(62, 123, 255, 0.03);
  border: 1px solid rgba(62, 123, 255, 0.05);
  
  .card-title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1D2129;
    margin-bottom: 24rpx;
    position: relative;
    padding-left: 24rpx;
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 8rpx;
      height: 28rpx;
      background: #3E7BFF;
      border-radius: 4rpx;
    }
  }
  
  .card-text {
    font-size: 28rpx;
    color: #4E5969;
    line-height: 1.8;
  }
  
  .feature-list {
    .feature-item {
      display: flex;
      align-items: center;
      padding: 16rpx 0;
      
      text {
        font-size: 28rpx;
        color: #4E5969;
        margin-left: 16rpx;
        font-weight: 500;
      }
    }
  }
  
.disclaimer-card {
  background: #FFF7F7;
  border: 1px solid #FFEBEB;
  
  .card-title {
    color: #F53F3F;
    &::before {
      background: #F53F3F;
    }
  }
  
  .highlight {
    color: #F53F3F;
    font-weight: 800;
    margin-bottom: 16rpx;
  }
}

.contact-item {
    display: flex;
    padding: 12rpx 0;
    font-size: 28rpx;
    
    .label {
      color: #86909C;
      width: 140rpx;
    }
    
    .value {
      color: #3E7BFF;
      font-weight: 600;
      text-decoration: underline;
    }
  }
}

.footer-section {
  margin-top: 80rpx;
  padding-bottom: 60rpx;
  text-align: center;
  
  .copyright {
    font-size: 22rpx;
    color: #C9CDD4;
    margin-bottom: 16rpx;
  }
  
  .agreement-links {
    display: flex;
    justify-content: center;
    align-items: center;
    
    text {
      font-size: 24rpx;
      color: #86909C;
      font-weight: 600;
    }
    
    .divider {
      width: 2rpx;
      height: 20rpx;
      background: #E5E6EB;
      margin: 0 24rpx;
    }
  }
}
</style>

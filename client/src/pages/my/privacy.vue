<template>
  <view class="agreement-page">
    <u-navbar title="隐私政策" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    <scroll-view scroll-y class="content-scroll">
      <view class="article">
        <view class="h1">甲友乐隐私政策</view>
        <view class="meta">最后更新日期：2026年2月4日</view>
        
        <view class="section">
          <view class="h2">1. 我们收集的信息</view>
          <view class="p">为了向您提供核心服务，我们需要收集以下信息：</view>
          <view class="p">· <text class="bold">账号信息</text>：您的昵称、头像（由微信授权提供）以及手机号码。</view>
          <view class="p">· <text class="bold">健康记录</text>：您主动上传的甲功指标（TSH/FT3等）、化验单照片、症状自测结果等。</view>
          <view class="p">· <text class="bold">设备信息</text>：包括设备型号、操作系统版本、唯一设备标识符等，用于系统维护和推送通知。</view>
        </view>

        <view class="section">
          <view class="h2">2. 信息的用途</view>
          <view class="p">收集信息的目的是为了分析您的健康趋势，提供用药提醒，展示科普内容。我们不会向任何第三方出售您的个人信息。</view>
        </view>

        <view class="section">
          <view class="h2">3. 权限说明</view>
          <view class="p">· <text class="bold">相册/相机</text>：用于上传化验单或头像图片。</view>
          <view class="p">· <text class="bold">通知权限</text>：用于向您发送服药提醒和复查通知。</view>
          <view class="p">· <text class="bold">手机号授权</text>：用于快捷登录及账号安全校验。</view>
        </view>

        <view class="section">
          <view class="h2">4. 您的权利</view>
          <view class="p">您可以通过“账号设置”注销您的账号。一旦注销，您的所有个人数据将根据法律要求进行删除或匿名化处理。</view>
        </view>

        <view class="section">
          <view class="h2">5. 未成年人保护</view>
          <view class="p">本应用主要面向成年甲状腺疾病患者。未成年人应在监护人指导下使用。</view>
        </view>

        <view class="section">
          <view class="h2">6. 联系我们</view>
          <view class="p">如果您对隐私政策有任何疑虑，请通过应用内的“关于甲友乐”联系我们。</view>
        </view>
        
        <view class="footer-tip">
           甲友乐运营团队 
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.agreement-page {
  background: #FFFFFF;
  min-height: 100vh;
}
.article {
  padding: 40rpx;
  
  .h1 { font-size: 44rpx; font-weight: 900; color: #1D2129; margin-bottom: 20rpx; text-align: center; }
  .meta { font-size: 24rpx; color: #86909C; text-align: center; margin-bottom: 60rpx; }
  
  .section {
    margin-bottom: 48rpx;
    
    .h2 { font-size: 32rpx; font-weight: 800; color: #1D2129; margin-bottom: 20rpx; }
    .p { font-size: 28rpx; color: #4E5969; line-height: 1.8; margin-bottom: 16rpx; text-align: justify; }
    
    .bold { font-weight: 800; color: #1D2129; }
  }
}
.footer-tip {
  margin-top: 100rpx;
  text-align: right;
  font-size: 26rpx;
  color: #86909C;
  padding-bottom: 80rpx;
}
</style>

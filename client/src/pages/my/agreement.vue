<template>
  <view class="agreement-page">
    <u-navbar title="用户协议" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    <scroll-view scroll-y class="content-scroll">
      <view class="article">
        <view class="h1">甲友乐用户协议</view>
        <view class="meta">最后更新日期：2026年2月28日</view>
        
        <view class="section">
          <view class="h2">1. 协议确认与接受</view>
          <view class="p">欢迎您使用“甲友乐”移动应用（以下简称“本服务”）。在您注册、登录、使用本服务前，请认真阅读本《用户协议》。</view>
          <view class="p">如果您对本协议有任何疑问，请联系我们。当您按照注册页面提示填写信息、阅读并同意本协议且完成全部注册程序后，即表示您已充分阅读、理解并接受本协议的全部内容。</view>
        </view>

        <view class="section">
          <view class="h2">2. 服务说明</view>
          <view class="p">“甲友乐”是一款为甲状腺健康管理设计的辅助工具，提供健康数据记录、趋势分析、百科科普、用药提醒等功能。</view>
          <view class="important">【特别提醒】本应用提供的所有内容（包括但不限于百科、趋势建议、自测结果）仅供科普参考，不作为临床诊断、医疗建议或治疗方案。在使用本应用的基础上，如需进行医疗决策，请务必咨询专业医生。</view>
        </view>

        <view class="section">
          <view class="h2">3. 账号管理</view>
          <view class="p">您应当妥善保管您的账号及密码。您应当对以其账号进行的所有活动和事件负法律责任。</view>
          <view class="p">为提供更好的服务，您需要通过电子邮箱进行注册或登录。电子邮箱将作为您的身份标识及找回密码的凭证。</view>
        </view>

        <view class="section">
          <view class="h2">4. 用户行为规范</view>
          <view class="p">用户在使用本服务期间，须遵守法律法规，不得利用本服务制作、上传、复制、发布、传播干扰本服务正常运营，以及侵犯其他用户或第三方合法权益的内容。</view>
        </view>

        <view class="section">
          <view class="h2">5. 知识产权</view>
          <view class="p">本应用的所有内容，包括但不限于文本、图片、图表、软件、算法、界面设计等的知识产权均归“甲友乐”平台所有。未经许可，任何个人或组织不得擅自引用、复制、传播。</view>
        </view>

        <view class="section">
          <view class="h2">6. 协议修改</view>
          <view class="p">我们可能根据法律法规的变化、业务形态的调整不时修改本协议，修改后的协议一经公布即生效。</view>
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
    
    .important {
      background: #FFF2F0;
      border: 1px solid #FFCCC7;
      border-radius: 12rpx;
      padding: 24rpx;
      font-size: 26rpx;
      color: #F53F3F;
      line-height: 1.6;
      font-weight: 600;
    }
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

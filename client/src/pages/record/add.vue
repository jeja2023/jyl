<template>
  <view class="record-wrapper">
    <u-navbar title="指标录入" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="progress-bar" :style="{width: progress + '%'}"></view>

    <view class="form-body">
      <u--form labelPosition="top" :model="form" ref="formRef" labelWidth="auto">
        
        <!-- 基础信息卡片 -->
        <view class="form-card">
          <view class="card-title">基础档案</view>
          <view class="input-cell" @click="showCalendar = true">
            <view class="cell-label">报告日期</view>
            <view class="cell-val">
               <text>{{ form.recordDate }}</text>
               <u-icon name="calendar" color="#86909C"></u-icon>
            </view>
          </view>
          <view class="input-cell no-border">
            <view class="cell-label">报告附件</view>
            <view class="uploader-box">
              <u-icon name="camera-fill" size="24" color="#86909C"></u-icon>
              <text>上传纸质报告照片</text>
            </view>
          </view>
        </view>

        <!-- 核心甲功指标 -->
        <view class="form-card">
          <view class="card-title header-with-tag">
             <text>核心指标 (常规五项/七项)</text>
             <view class="essential-tag">必填</view>
          </view>
          <view class="grid-inputs">
            <view class="grid-cell">
              <text class="tiny-label">TSH (促甲状腺)</text>
              <u--input v-model="form.TSH" type="digit" placeholder="数值" border="bottom" class="tiny-input"></u--input>
            </view>
            <view class="grid-cell">
              <text class="tiny-label">FT4 (游离T4)</text>
              <u--input v-model="form.FT4" type="digit" placeholder="数值" border="bottom" class="tiny-input"></u--input>
            </view>
            <view class="grid-cell">
              <text class="tiny-label">FT3 (游离T3)</text>
              <u--input v-model="form.FT3" type="digit" placeholder="数值" border="bottom" class="tiny-input"></u--input>
            </view>
            <view class="grid-cell">
              <text class="tiny-label">TPOAb (抗体)</text>
              <u--input v-model="form.TPOAb" type="digit" placeholder="数值" border="bottom" class="tiny-input"></u--input>
            </view>
          </view>
        </view>

        <!-- 术后/特殊监测折叠项 -->
        <view class="premium-collapse" :class="{expanded: showMore}">
           <view class="collapse-header" @click="showMore = !showMore">
              <u-icon name="plus-circle" size="20" color="#3E7BFF"></u-icon>
              <text>详细指标 (降钙素/Tg/T3/T4)</text>
              <u-icon :name="showMore ? 'arrow-up' : 'arrow-down'" size="16" color="#C9CDD4" class="arrow"></u-icon>
           </view>
           <view class="collapse-body" v-if="showMore">
              <view class="input-cell horizontal">
                 <text class="cell-label">降钙素 (CT)</text>
                 <u--input v-model="form.Calcitonin" type="digit" placeholder="pg/mL" text-align="right" border="none"></u--input>
              </view>
              <view class="input-cell horizontal">
                 <text class="cell-label">甲状腺球蛋白 (Tg)</text>
                 <u--input v-model="form.Tg" type="digit" placeholder="ng/mL" text-align="right" border="none"></u--input>
              </view>
              <view class="input-cell horizontal">
                 <text class="cell-label">TRAb (受体抗体)</text>
                 <u--input v-model="form.TRAb" type="digit" placeholder="IU/L" text-align="right" border="none"></u--input>
              </view>
           </view>
        </view>

        <!-- 电解质折叠项 -->
        <view class="premium-collapse" :class="{expanded: showCalcium}">
           <view class="collapse-header" @click="showCalcium = !showCalcium">
              <u-icon name="heart" size="20" color="#F05050"></u-icon>
              <text>旁腺与钙镁 (术后手麻关注)</text>
              <u-icon :name="showCalcium ? 'arrow-up' : 'arrow-down'" size="16" color="#C9CDD4" class="arrow"></u-icon>
           </view>
           <view class="collapse-body" v-if="showCalcium">
              <view class="grid-inputs">
                <view class="grid-cell">
                  <text class="tiny-label">血钙 (Ca)</text>
                  <u--input v-model="form.Calcium" type="digit" placeholder="mmol/L" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">血镁 (Mg)</text>
                  <u--input v-model="form.Magnesium" type="digit" placeholder="mmol/L" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">血磷 (P)</text>
                  <u--input v-model="form.Phosphorus" type="digit" placeholder="mmol/L" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">PTH (旁腺素)</text>
                  <u--input v-model="form.PTH" type="digit" placeholder="pg/mL" border="bottom" class="tiny-input"></u--input>
                </view>
              </view>
           </view>
        </view>

        <!-- 备注信息 -->
        <view class="form-card">
           <view class="card-title">补充说明</view>
           <u--textarea v-model="form.feeling" placeholder="记录您最近的体感，如: 睡眠质量、是否有心悸、手抖或水肿等..." border="none" count confirmType="done"></u--textarea>
        </view>

        <view class="footer-area">
           <u-button type="primary" text="保存化验记录" shape="circle" class="submit-btn" :loading="loading" @click="submit"></u-button>
        </view>

      </u--form>
    </view>

    <u-calendar :show="showCalendar" @confirm="confirmDate" @close="showCalendar = false" color="#3E7BFF"></u-calendar>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const loading = ref(false);
const showCalendar = ref(false);
const showMore = ref(false);
const showCalcium = ref(false);

const form = reactive({
  recordDate: uni.$u.timeFormat(new Date(), 'yyyy-mm-dd'),
  TSH: '', FT3: '', FT4: '', TPOAb: '', TGAb: '', TRAb: '', Tg: '', 
  Calcitonin: '', Calcium: '', Magnesium: '', Phosphorus: '', PTH: '',
  T3: '', T4: '', weight: '', heartRate: '', feeling: ''
});

const progress = computed(() => {
    const fields = ['TSH', 'FT3', 'FT4'];
    let filled = 1; // date is filled
    fields.forEach(f => { if(form[f]) filled++; });
    return (filled / (fields.length + 1)) * 100;
});

const confirmDate = (e) => {
  form.recordDate = e[0];
  showCalendar.value = false;
};

const submit = async () => {
  if(!form.TSH && !form.FT3 && !form.FT4) {
      return uni.$u.toast('请填写核心指标');
  }
  loading.value = true;
  try {
    await http.post('/api/record/add', form);
    uni.$u.toast('记录成功，已为您保存至档案');
    setTimeout(() => { uni.navigateBack(); }, 1500);
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>

<style>
page {
  overflow: auto !important; /* 强制覆盖全局的 hidden */
  height: auto !important;
}
</style>

<style lang="scss" scoped>
.record-wrapper {
  background-color: #F6F8FC;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.progress-bar {
  height: 6rpx;
  background: $jyl-gradient;
  transition: width 0.3s;
}

.form-body {
  padding: 32rpx;
}

.form-card {
  @include premium-card;
  padding: 32rpx;
  margin-bottom: 32rpx;
  
  .card-title {
    font-size: 32rpx;
    font-weight: 800;
    color: #1D2129;
    margin-bottom: 32rpx;
    &.header-with-tag { display: flex; align-items: center; justify-content: space-between; }
  }
  
  .essential-tag {
    font-size: 20rpx;
    background: #FFECE8;
    color: #F05050;
    padding: 2rpx 12rpx;
    border-radius: 6rpx;
    font-weight: 400;
  }
}

.input-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2rpx solid #F2F3F5;
  padding: 24rpx 0;
  &.no-border { border: none; }
  &.horizontal { padding: 32rpx 0; }
  
  .cell-label { font-size: 28rpx; color: #4E5969; }
  .cell-val { display: flex; align-items: center; text { margin-right: 12rpx; font-weight: 700; color: #1D2129; } }
}

.uploader-box {
  @include flex-center;
  flex-direction: column;
  width: 100%;
  height: 200rpx;
  background: #F7F8FA;
  border: 2rpx dashed #E5E6EB;
  border-radius: 16rpx;
  margin-top: 20rpx;
  text { font-size: 24rpx; color: #86909C; margin-top: 12rpx; }
}

.grid-inputs {
  display: flex;
  flex-wrap: wrap;
  .grid-cell {
    width: 50%;
    padding: 20rpx;
    box-sizing: border-box;
    .tiny-label { font-size: 22rpx; color: #86909C; margin-bottom: 8rpx; display: block; }
    .tiny-input { background: #FFFFFF; font-weight: 700; height: 60rpx; }
  }
}

.premium-collapse {
  @include premium-card;
  margin-bottom: 32rpx;
  overflow: hidden;
  transition: all 0.3s;
  
  .collapse-header {
    padding: 32rpx;
    display: flex;
    align-items: center;
    text { flex: 1; margin-left: 20rpx; font-size: 28rpx; font-weight: 700; color: #4E5969; }
    .arrow { transition: transform 0.3s; }
  }
  
  &.expanded {
    .collapse-header text { color: #1D2129; }
    .arrow { transform: rotate(180deg); }
  }
  
  .collapse-body {
    padding: 0 32rpx 32rpx;
    border-top: 2rpx solid #F2F3F5;
  }
}

.footer-area {
  margin-top: 60rpx;
  padding-bottom: 80rpx;
}

.submit-btn {
  height: 100rpx !important;
  font-size: 32rpx !important;
  font-weight: 700 !important;
  box-shadow: 0 12rpx 24rpx rgba(62, 123, 255, 0.25) !important;
}
</style>

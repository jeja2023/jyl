<script setup>
import MetricItem from '@/components/MetricItem.vue';
import { getIndicatorInfo } from '@/utils/indicator.js';

defineProps({
  record: {
    type: Object,
    default: null
  }
});

const emits = defineEmits(['click', 'add']);

const handleClick = () => {
    emits('click');
};

const handleAdd = () => {
    emits('add');
};
</script>

<template>
  <view class="premium-card indicator-card" @click="handleClick">
    <view class="card-header">
      <view class="title-row">
        <u-icon name="order" size="20" color="#3E7BFF"></u-icon>
        <text class="label">最近一次化验记录</text>
      </view>
      <view class="header-right" v-if="!record" @click.stop="handleAdd">
        <text class="empty-link">去记录化验单</text>
        <u-icon name="arrow-right" size="12" color="#3E7BFF"></u-icon>
      </view>
      <view class="record-date-tag" v-else>
        <text>{{ record.recordDate }}</text>
      </view>
    </view>
    
    <view class="indicator-values" v-if="record">
      <view class="indicator-grid">
        <!-- TSH -->
        <MetricItem :value="record.TSH" label="TSH" unit="mIU/L" :min="0.27" :max="4.2" :isSmall="true" />
        
        <!-- FT4 -->
        <MetricItem :value="record.FT4" label="FT4" unit="pmol/L" :min="12" :max="22" :isSmall="true" />
        
        <!-- FT3 -->
        <MetricItem :value="record.FT3" label="FT3" unit="pmol/L" :min="3.1" :max="6.8" :isSmall="true" />

        <!-- T4 -->
        <MetricItem :value="record.T4" label="T4" unit="nmol/L" :min="66" :max="181" :isSmall="true" />

        <!-- T3 -->
        <MetricItem :value="record.T3" label="T3" unit="nmol/L" :min="1.3" :max="3.1" :isSmall="true" />

        <!-- Tg/Cal if exists -->
        <view class="v-item primary" v-if="record.Tg">
           <view class="v-main">
              <!-- 这里由于 getIndicatorInfo 逻辑比较简单，直接内联或者也可以封装，考虑到特殊性暂时保留原逻辑的一半 -->
              <!-- 为了统一，建议也将 Tg 封装进去，或者手动调用 -->
               <MetricItem :value="record.Tg" label="Tg" unit="ng/mL" :min="0" :max="77" :isSmall="true" />
           </view>
        </view>
        <view class="v-item primary" v-else-if="record.Calcium">
             <MetricItem :value="record.Calcium" label="血钙" unit="mmol/L" :min="2.11" :max="2.52" :isSmall="true" />
        </view>
      </view>
    </view>
    
    <view class="empty-box" v-else @click.stop="handleAdd">
      <view class="plus-anim-box">
         <view class="circle-btn">
            <u-icon name="plus" color="#3E7BFF" size="26"></u-icon>
         </view>
         <view class="ripple"></view>
      </view>
      <text class="tip">还没有数据，点击录入第一份化验单</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
  /* 指标卡片 */
  .indicator-card {
    padding: 36rpx;
    margin-bottom: 32rpx;
    background: #FFFFFF;
    border-radius: 40rpx;
    box-shadow: 0 20rpx 40rpx rgba(62, 123, 255, 0.1);
    border: 1rpx solid rgba(62, 123, 255, 0.05);

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32rpx;

      .title-row {
        display: flex;
        align-items: center;
        .label {
          font-size: 32rpx;
          font-weight: 800;
          color: #1D2129;
          margin-left: 16rpx;
        }
      }

      .header-right {
        display: flex;
        align-items: center;
        padding: 10rpx 24rpx;
        background: #F2F7FF;
        border-radius: 40rpx;

        .empty-link {
          font-size: 24rpx;
          color: #3E7BFF;
          font-weight: 600;
        }
      }
      
      .record-date-tag {
          font-size: 24rpx;
          color: #86909C;
          background: #F7F8FA;
          padding: 6rpx 16rpx;
          border-radius: 8rpx;
      }
    }

    .indicator-values {
      padding: 10rpx 0;

      .indicator-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        row-gap: 32rpx;
        column-gap: 20rpx;
      }
      
      /* 复用 MetricItem 内部样式会有 scoped 隔离问题，所以 MetricItem 自带了样式，
         这里只需要布局 grid 即可。
         特殊处理 Tg/Calcium 的外层容器为了保持 grid 结构
      */
      .v-item {
          /* 使得内部组件填满格子 */
          width: 100%; 
          display: flex;
          justify-content: center;
          
           /* 强行覆盖 MetricItem 的样式以适应这里的 Grid? 
              MetricItem 已经是 flex columns center 了，应该可以直接用。
           */
      }
    }

    .empty-box {
      padding: 40rpx 0;
      display: flex;
      flex-direction: column;
      align-items: center;

      .plus-anim-box {
        position: relative;
        width: 120rpx;
        height: 120rpx;
        margin-bottom: 24rpx;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .circle-btn {
        width: 100rpx;
        height: 100rpx;
        background: #F2F7FF;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        z-index: 2;
      }

      .ripple {
        position: absolute;
        width: 130rpx;
        height: 130rpx;
        border: 2rpx dashed #3E7BFF;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        animation: ripple-rotate 10s linear infinite;
        z-index: 1;
        box-sizing: border-box;
        opacity: 0.5;
      }

      .tip {
        font-size: 28rpx;
        color: #86909C;
        font-weight: 500;
      }
    }
  }
  
  @keyframes ripple-rotate {
      0% { transform: translate(-50%, -50%) rotate(0deg); }
      100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
</style>

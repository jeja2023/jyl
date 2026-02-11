<script setup>
import { computed } from 'vue';
import { getIndicatorInfo } from '@/utils/indicator.js';

const props = defineProps({
  value: {
    type: [Number, String],
    default: null
  },
  label: {
    type: String,
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  min: {
    type: Number,
    required: true
  },
  max: {
    type: Number,
    required: true
  },
  isSmall: {
    type: Boolean,
    default: false
  }
});

const indicatorInfo = computed(() => {
  return getIndicatorInfo(props.value, props.min, props.max);
});

// 计算颜色类名
const colorClass = computed(() => {
  return 'color-' + indicatorInfo.value.color;
});

// 计算图标颜色值
const iconColor = computed(() => {
  return indicatorInfo.value.color === 'error' ? '#F53F3F' : '#FF7D00';
});
</script>

<template>
  <view class="v-item primary">
    <view class="v-main">
       <text class="v-num" :class="[colorClass, { small: isSmall }]">{{ value || '-' }}</text>
       <u-icon 
         v-if="indicatorInfo.icon" 
         :name="indicatorInfo.icon" 
         :size="isSmall ? 8 : 10" 
         :color="iconColor" 
         class="v-icon-abs"
         :class="{ 'small-icon': isSmall }"
       ></u-icon>
    </view>
    <text class="v-label">{{ label }}</text>
    <text class="v-unit">{{ unit }}</text>
  </view>
</template>

<style lang="scss" scoped>
.v-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding: 10rpx 0;

  &.primary {
    background: #F8FAFF;
    border-radius: 20rpx;
  }

  .v-label {
    font-size: 20rpx;
    color: #86909C;
    margin-top: 4rpx;
    font-weight: 700;
    letter-spacing: 1rpx;
    transform: scale(0.95);
  }

  .v-main {
    display: flex;
    align-items: baseline;
    position: relative;

    .v-num {
      font-size: 40rpx;
      font-weight: 900;
      color: #1D2129;
      font-family: 'DIN Condensed', -apple-system, sans-serif;

      &.small {
        font-size: 30rpx;
      }
      
      &.color-gray { color: #C9CDD4; }
      &.color-success { color: #1D2129; }
      &.color-warning { color: #FF7D00; }
      &.color-error { color: #F53F3F; }
    }

    .v-icon-abs {
      position: absolute;
      top: -4rpx;
      right: -16rpx;
      
      &.small-icon {
        top: -2rpx;
        right: -12rpx;
      }
    }
  }

  .v-unit {
    font-size: 14rpx;
    color: #C9CDD4;
    font-weight: 500;
    transform: scale(0.9);
  }
}
</style>

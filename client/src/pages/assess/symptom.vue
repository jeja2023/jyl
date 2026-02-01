<template>
  <view class="assess-wrapper">
    <u-navbar title="症状自测" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="main-body" v-if="!showResult">
      <!-- 进度指示 -->
      <view class="progress-section">
        <view class="progress-text">问题 {{ currentIndex + 1 }} / {{ questions.length }}</view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{width: ((currentIndex + 1) / questions.length * 100) + '%'}"></view>
        </view>
      </view>
      
      <!-- 问题卡片 -->
      <view class="question-card">
        <view class="q-category">{{ questions[currentIndex].category }}</view>
        <view class="q-title">{{ questions[currentIndex].question }}</view>
        <view class="q-hint">{{ questions[currentIndex].hint }}</view>
        
        <view class="options">
          <view 
            class="option-item" 
            v-for="(opt, idx) in questions[currentIndex].options" 
            :key="idx"
            :class="{selected: answers[currentIndex] === idx}"
            @click="selectOption(idx)"
          >
            <view class="opt-radio" :class="{checked: answers[currentIndex] === idx}"></view>
            <text>{{ opt.text }}</text>
          </view>
        </view>
      </view>
      
      <!-- 导航按钮 -->
      <view class="nav-buttons">
        <u-button 
          v-if="currentIndex > 0" 
          text="上一题" 
          type="info" 
          plain 
          shape="circle"
          @click="prevQuestion"
        ></u-button>
        <view v-else></view>
        <u-button 
          :text="currentIndex === questions.length - 1 ? '查看结果' : '下一题'" 
          type="primary" 
          shape="circle"
          :disabled="answers[currentIndex] === undefined"
          @click="nextQuestion"
        ></u-button>
      </view>
    </view>
    
    <!-- 结果页 -->
    <view class="result-body" v-else>
      <view class="result-card" :class="resultLevel">
        <view class="result-icon">
          <u-icon :name="resultIcon" size="60" color="#fff"></u-icon>
        </view>
        <view class="result-title">{{ resultTitle }}</view>
        <view class="result-score">综合评分：{{ totalScore }} 分</view>
      </view>
      
      <view class="result-detail">
        <view class="detail-title">评估详情</view>
        <view class="detail-item" v-for="(cat, idx) in categoryScores" :key="idx">
          <view class="cat-name">{{ cat.name }}</view>
          <view class="cat-bar">
            <view class="cat-fill" :style="{width: cat.percent + '%'}" :class="cat.level"></view>
          </view>
          <view class="cat-label" :class="cat.level">{{ cat.label }}</view>
        </view>
      </view>
      
      <view class="result-tips">
        <view class="tips-title">健康建议</view>
        <view class="tips-content">{{ resultTips }}</view>
      </view>
      
      <view class="result-actions">
        <u-button text="重新测评" type="info" plain shape="circle" @click="resetTest"></u-button>
        <u-button text="记录化验单" type="primary" shape="circle" @click="goToRecord"></u-button>
      </view>
      
      <view class="disclaimer">
        <u-icon name="info-circle" size="14" color="#C9CDD4"></u-icon>
        <text>本测评仅供参考，不能替代专业医生的诊断</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const goBack = () => {
  uni.navigateBack();
};

const currentIndex = ref(0);
const showResult = ref(false);
const answers = reactive({});

// 问题库 - 甲状腺症状评估
const questions = [
  {
    category: '能量与代谢',
    question: '您近期是否经常感到疲劳乏力？',
    hint: '即使休息充足也感觉精力不足',
    options: [
      { text: '从不', score: 0 },
      { text: '偶尔', score: 1 },
      { text: '经常', score: 2 },
      { text: '总是如此', score: 3 }
    ]
  },
  {
    category: '能量与代谢',
    question: '您的体重近期有明显变化吗？',
    hint: '未刻意减肥或增重的情况下',
    options: [
      { text: '稳定', score: 0 },
      { text: '略有波动', score: 1 },
      { text: '明显增加', score: 2 },
      { text: '明显减少', score: 3 }
    ]
  },
  {
    category: '心血管系统',
    question: '您是否经常感到心跳加速或心悸？',
    hint: '在静息状态下也能感觉到心跳',
    options: [
      { text: '从不', score: 0 },
      { text: '偶尔', score: 1 },
      { text: '经常', score: 2 },
      { text: '总是如此', score: 3 }
    ]
  },
  {
    category: '心血管系统',
    question: '您是否怕热或怕冷？',
    hint: '对温度变化特别敏感',
    options: [
      { text: '正常', score: 0 },
      { text: '略有感觉', score: 1 },
      { text: '比较明显', score: 2 },
      { text: '非常敏感', score: 3 }
    ]
  },
  {
    category: '神经精神',
    question: '您近期情绪状态如何？',
    hint: '是否容易焦虑、烦躁或情绪低落',
    options: [
      { text: '平稳', score: 0 },
      { text: '偶有波动', score: 1 },
      { text: '经常焦虑/低落', score: 2 },
      { text: '情绪很不稳定', score: 3 }
    ]
  },
  {
    category: '神经精神',
    question: '您的睡眠质量如何？',
    hint: '入睡困难、多梦或早醒',
    options: [
      { text: '很好', score: 0 },
      { text: '一般', score: 1 },
      { text: '较差', score: 2 },
      { text: '严重失眠', score: 3 }
    ]
  },
  {
    category: '皮肤与外观',
    question: '您的皮肤状态如何？',
    hint: '是否干燥、粗糙或水肿',
    options: [
      { text: '正常', score: 0 },
      { text: '略有干燥', score: 1 },
      { text: '比较干燥', score: 2 },
      { text: '明显异常', score: 3 }
    ]
  },
  {
    category: '皮肤与外观',
    question: '您近期是否有脱发现象？',
    hint: '头发比以前更容易掉落',
    options: [
      { text: '没有', score: 0 },
      { text: '轻微', score: 1 },
      { text: '比较明显', score: 2 },
      { text: '严重脱发', score: 3 }
    ]
  },
  {
    category: '消化系统',
    question: '您的排便情况如何？',
    hint: '便秘或腹泻',
    options: [
      { text: '正常', score: 0 },
      { text: '偶有异常', score: 1 },
      { text: '经常异常', score: 2 },
      { text: '非常不规律', score: 3 }
    ]
  },
  {
    category: '肌肉骨骼',
    question: '您是否有肌肉酸痛或关节不适？',
    hint: '无明确原因的肌肉无力或疼痛',
    options: [
      { text: '没有', score: 0 },
      { text: '偶尔', score: 1 },
      { text: '经常', score: 2 },
      { text: '非常明显', score: 3 }
    ]
  }
];

const selectOption = (idx) => {
  answers[currentIndex.value] = idx;
};

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const nextQuestion = () => {
  if (currentIndex.value < questions.length - 1) {
    currentIndex.value++;
  } else {
    showResult.value = true;
  }
};

// 计算总分
const totalScore = computed(() => {
  let sum = 0;
  Object.keys(answers).forEach(key => {
    const idx = parseInt(key);
    sum += questions[idx].options[answers[idx]].score;
  });
  return sum;
});

// 分类统计
const categoryScores = computed(() => {
  const cats = {};
  questions.forEach((q, idx) => {
    if (!cats[q.category]) {
      cats[q.category] = { total: 0, max: 0 };
    }
    cats[q.category].max += 3;
    if (answers[idx] !== undefined) {
      cats[q.category].total += q.options[answers[idx]].score;
    }
  });
  
  return Object.keys(cats).map(name => {
    const percent = Math.round(cats[name].total / cats[name].max * 100);
    let level = 'good';
    let label = '正常';
    if (percent > 60) {
      level = 'bad';
      label = '需关注';
    } else if (percent > 30) {
      level = 'warn';
      label = '轻微';
    }
    return { name, percent, level, label };
  });
});

// 结果等级
const resultLevel = computed(() => {
  if (totalScore.value >= 20) return 'severe';
  if (totalScore.value >= 12) return 'moderate';
  if (totalScore.value >= 5) return 'mild';
  return 'normal';
});

const resultTitle = computed(() => {
  const map = {
    normal: '状态良好',
    mild: '轻微症状',
    moderate: '中度症状',
    severe: '建议就医'
  };
  return map[resultLevel.value];
});

const resultIcon = computed(() => {
  const map = {
    normal: 'checkmark-circle',
    mild: 'info-circle',
    moderate: 'warning',
    severe: 'close-circle'
  };
  return map[resultLevel.value];
});

const resultTips = computed(() => {
  const map = {
    normal: '您目前的症状评估结果良好，请继续保持健康的生活方式，定期复查甲功指标。',
    mild: '您有轻微的不适症状，建议关注自身状态变化，如持续不适建议检查甲功。',
    moderate: '您的症状评估显示中度异常，建议尽快进行甲功检查，并咨询内分泌科医生。',
    severe: '您的症状评估结果显示需要重视，强烈建议尽快就医，进行全面的甲状腺功能检查。'
  };
  return map[resultLevel.value];
});

const resetTest = () => {
  currentIndex.value = 0;
  Object.keys(answers).forEach(key => delete answers[key]);
  showResult.value = false;
};

const goToRecord = () => {
  uni.navigateTo({ url: '/pages/record/add' });
};
</script>

<style lang="scss" scoped>
.assess-wrapper {
  background: #F6F8FC;
  min-height: 100vh;
}

.main-body {
  padding: 32rpx;
}

.progress-section {
  margin-bottom: 32rpx;
  
  .progress-text {
    font-size: 26rpx;
    color: #86909C;
    margin-bottom: 12rpx;
  }
  
  .progress-bar {
    height: 8rpx;
    background: #E5E6EB;
    border-radius: 4rpx;
    overflow: hidden;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3E7BFF, #689DFF);
      border-radius: 4rpx;
      transition: width 0.3s;
    }
  }
}

.question-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.05);
  
  .q-category {
    display: inline-block;
    padding: 8rpx 20rpx;
    background: linear-gradient(135deg, #EEF4FF, #F8FAFF);
    color: #3E7BFF;
    font-size: 24rpx;
    border-radius: 20rpx;
    margin-bottom: 20rpx;
  }
  
  .q-title {
    font-size: 34rpx;
    font-weight: 600;
    color: #1D2129;
    line-height: 1.5;
    margin-bottom: 12rpx;
  }
  
  .q-hint {
    font-size: 26rpx;
    color: #86909C;
    margin-bottom: 40rpx;
  }
}

.options {
  .option-item {
    display: flex;
    align-items: center;
    padding: 28rpx;
    background: #F6F8FC;
    border-radius: 16rpx;
    margin-bottom: 16rpx;
    border: 2rpx solid transparent;
    transition: all 0.2s;
    
    &.selected {
      background: #EEF4FF;
      border-color: #3E7BFF;
    }
    
    .opt-radio {
      width: 36rpx;
      height: 36rpx;
      border: 2rpx solid #C9CDD4;
      border-radius: 50%;
      margin-right: 20rpx;
      position: relative;
      
      &.checked {
        border-color: #3E7BFF;
        
        &::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20rpx;
          height: 20rpx;
          background: #3E7BFF;
          border-radius: 50%;
        }
      }
    }
    
    text {
      font-size: 28rpx;
      color: #1D2129;
    }
  }
}

.nav-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 40rpx;
  gap: 20rpx;
  
  :deep(.u-button) {
    flex: 1;
  }
}

// 结果页样式
.result-body {
  padding: 32rpx;
}

.result-card {
  text-align: center;
  padding: 60rpx 40rpx;
  border-radius: 24rpx;
  color: #fff;
  
  &.normal { background: linear-gradient(135deg, #27C24C, #4CD964); }
  &.mild { background: linear-gradient(135deg, #23B7E5, #5BC0DE); }
  &.moderate { background: linear-gradient(135deg, #FF902B, #FFB74D); }
  &.severe { background: linear-gradient(135deg, #F05050, #FF6B6B); }
  
  .result-icon {
    margin-bottom: 20rpx;
  }
  
  .result-title {
    font-size: 40rpx;
    font-weight: 700;
    margin-bottom: 12rpx;
  }
  
  .result-score {
    font-size: 28rpx;
    opacity: 0.9;
  }
}

.result-detail {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-top: 24rpx;
  
  .detail-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1D2129;
    margin-bottom: 24rpx;
  }
  
  .detail-item {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    
    .cat-name {
      width: 160rpx;
      font-size: 26rpx;
      color: #4E5969;
    }
    
    .cat-bar {
      flex: 1;
      height: 12rpx;
      background: #E5E6EB;
      border-radius: 6rpx;
      overflow: hidden;
      margin: 0 16rpx;
      
      .cat-fill {
        height: 100%;
        border-radius: 6rpx;
        transition: width 0.5s;
        
        &.good { background: #27C24C; }
        &.warn { background: #FF902B; }
        &.bad { background: #F05050; }
      }
    }
    
    .cat-label {
      width: 100rpx;
      font-size: 24rpx;
      text-align: right;
      
      &.good { color: #27C24C; }
      &.warn { color: #FF902B; }
      &.bad { color: #F05050; }
    }
  }
}

.result-tips {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-top: 24rpx;
  
  .tips-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1D2129;
    margin-bottom: 16rpx;
  }
  
  .tips-content {
    font-size: 28rpx;
    color: #4E5969;
    line-height: 1.6;
  }
}

.result-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
  
  :deep(.u-button) {
    flex: 1;
  }
}

.disclaimer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-top: 32rpx;
  font-size: 24rpx;
  color: #C9CDD4;
}
</style>

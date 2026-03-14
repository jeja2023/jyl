<template>
  <view class="assess-wrapper">
    <u-navbar title="症状自测" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}">
       <template #right>
         <view @click="goToHistory" style="font-size: 26rpx; color: #3E7BFF; font-weight: 700; padding: 0 10rpx;">历史记录</view>
       </template>
    </u-navbar>
    
    <!-- 1. 开始页面 -->
    <view class="start-body" v-if="viewState === 'start'">
      <view class="start-content">
        <view class="hero-image">
          <u-icon name="heart-fill" size="80" color="#3E7BFF"></u-icon>
          <view class="hero-ripple"></view>
        </view>
        <view class="start-title">甲状腺健康自评</view>
        <view class="start-desc">通过 12 个维度的深度测评，帮助您初步评估甲状腺健康状态，识别甲亢或甲减的潜在风险。</view>
        
        <view class="start-features">
          <view class="feature-item">
            <u-icon name="checkmark-circle-fill" size="18" color="#3E7BFF"></u-icon>
            <text>多维度综合评分</text>
          </view>
          <view class="feature-item">
            <u-icon name="checkmark-circle-fill" size="18" color="#3E7BFF"></u-icon>
            <text>个性化健康建议</text>
          </view>
          <view class="feature-item">
            <u-icon name="checkmark-circle-fill" size="18" color="#3E7BFF"></u-icon>
            <text>临床医学逻辑参考</text>
          </view>
        </view>
        
        <u-button text="开始测评" type="primary" shape="circle" class="start-btn pulse-blue" @click="startAssess"></u-button>
        
        <view class="disclaimer-mini">
          <u-icon name="info-circle" size="12" color="#C9CDD4"></u-icon>
          <text>本测评仅供健康参考，不可作为临床诊断依据</text>
        </view>
      </view>
    </view>

    <!-- 2. 测评页面 -->
    <view class="main-body" v-else-if="viewState === 'assess'">
      <!-- 进度指示 -->
      <view class="progress-section">
        <view class="progress-header">
          <text class="progress-text">问题 {{ currentIndex + 1 }} / {{ questions.length }}</text>
          <text class="progress-percent">{{ Math.round((currentIndex + 1) / questions.length * 100) }}%</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{width: ((currentIndex + 1) / questions.length * 100) + '%'}"></view>
        </view>
      </view>
      
      <!-- 问题卡片 (带切换动画) -->
      <transition name="fade-slide" mode="out-in">
        <view class="question-card" :key="currentIndex">
          <view class="q-header">
            <view class="q-category">{{ questions[currentIndex].category }}</view>
            <view class="q-tag" :class="questions[currentIndex].type">{{ questions[currentIndex].type === 'hyper' ? '甲亢相关' : '甲减相关' }}</view>
          </view>
          <view class="q-title">{{ questions[currentIndex].question }}</view>
          <view class="q-hint" v-if="questions[currentIndex].hint">{{ questions[currentIndex].hint }}</view>
          
          <view class="options">
            <view 
              class="option-item" 
              v-for="(opt, idx) in questions[currentIndex].options" 
              :key="idx"
              :class="{selected: answers[currentIndex] === idx}"
              @click="selectOption(idx)"
            >
              <view class="opt-left">
                <view class="opt-letter">{{ String.fromCharCode(65 + idx) }}</view>
                <text>{{ opt.text }}</text>
              </view>
              <u-icon name="checkmark-circle-fill" size="20" color="#3E7BFF" v-if="answers[currentIndex] === idx"></u-icon>
            </view>
          </view>
        </view>
      </transition>
      
      <!-- 导航按钮 -->
      <view class="nav-buttons">
        <view class="prev-box">
          <u-button 
            v-if="currentIndex > 0" 
            text="上一题" 
            type="info" 
            plain 
            shape="circle"
            @click="prevQuestion"
          ></u-button>
        </view>
        <view class="next-box">
          <u-button 
            :text="currentIndex === questions.length - 1 ? '提交评估' : '下一题'" 
            type="primary" 
            shape="circle"
            :disabled="answers[currentIndex] === undefined"
            @click="nextQuestion"
          ></u-button>
        </view>
      </view>
    </view>
    
    <!-- 3. 结果页 -->
    <view class="result-body" v-else>
      <view class="result-hero" :class="resultLevel">
        <view class="hero-top">
          <view class="result-icon-box">
            <u-icon :name="resultIcon" size="44" color="#fff"></u-icon>
          </view>
          <view class="score-main">
            <text class="score-num">{{ totalScore }}</text>
            <text class="score-unit">分</text>
          </view>
        </view>
        <view class="result-title">{{ resultTitle }}</view>
        <view class="result-summary">您的甲状腺活跃度评估为：{{ activityStatus }}</view>
      </view>
      
      <!-- 倾向性分析 -->
      <view class="premium-card analysis-card">
        <view class="card-title">症状倾向性分析</view>
        <view class="tendency-grid">
          <view class="tendency-item hyper">
            <view class="t-label">甲亢倾向</view>
            <view class="t-value">{{ hyperScore }}</view>
            <view class="t-bar">
               <view class="t-fill" :style="{width: (hyperScore / maxHyperScore * 100) + '%'}"></view>
            </view>
          </view>
          <view class="tendency-divider"></view>
          <view class="tendency-item hypo">
            <view class="t-label">甲减倾向</view>
            <view class="t-value">{{ hypoScore }}</view>
            <view class="t-bar">
               <view class="t-fill" :style="{width: (hypoScore / maxHypoScore * 100) + '%'}"></view>
            </view>
          </view>
        </view>
        <view class="tendency-tip">注：得分越高表示相关症状越明显</view>
      </view>
      
      <!-- 维度 breakdown -->
      <view class="premium-card detail-card">
        <view class="card-title">多维度详情</view>
        <view class="dimension-list">
          <view class="dim-item" v-for="(cat, idx) in categoryScores" :key="idx">
            <view class="dim-info">
              <text class="dim-name">{{ cat.name }}</text>
              <text class="dim-label" :class="cat.level">{{ cat.label }}</text>
            </view>
            <view class="dim-progress">
              <view class="dim-fill" :style="{width: cat.percent + '%'}" :class="cat.level"></view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 建议卡片 -->
      <view class="premium-card tips-card">
        <view class="tips-header">
          <u-icon name="chat-fill" size="20" color="#3E7BFF"></u-icon>
          <text>专家健康建议</text>
        </view>
        <view class="tips-text">{{ resultTips }}</view>
      </view>
      
      <view class="result-actions">
        <u-button v-if="!isFromHistory" text="重新测评" type="info" plain shape="circle" class="action-btn" @click="resetTest"></u-button>
        <u-button v-else text="返回列表" type="info" plain shape="circle" class="action-btn" @click="goBack"></u-button>
        <u-button text="记录化验单" type="primary" shape="circle" class="action-btn" @click="goToRecord"></u-button>
      </view>
      
      <view class="disclaimer-final">
        <u-icon name="warning-fill" size="14" color="#F53F3F"></u-icon>
        <text>警告：测评结果不作为医疗诊断依据，请务必咨询专业医生。</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const goBack = () => {
  uni.navigateBack();
};

const viewState = ref('start'); // start | assess | result
const currentIndex = ref(0);
const answers = reactive({});
const isFromHistory = ref(false);

onLoad(async (options) => {
  if (options.id) {
    isFromHistory.value = true;
    await fetchDetail(options.id);
  }
});

const fetchDetail = async (id) => {
  uni.showLoading({ title: '加载中...' });
  try {
    const res = await http.get(`/api/assess/${id}`);
    if (res) {
        // 后端返回的是原始 assessment 对象
        const remoteAnswers = typeof res.answers === 'string' ? JSON.parse(res.answers) : res.answers;
        Object.assign(answers, remoteAnswers);
        viewState.value = 'result';
    }
  } catch (e) {
    uni.$u.toast('获取测评记录失败');
  } finally {
    uni.hideLoading();
  }
};

// ==================== 问题库优化 (12题，涵盖甲亢/甲减) ====================
const questions = [
  {
    category: '能量状态',
    type: 'hypo',
    question: '您是否经常感到难以解释的疲劳和嗜睡？',
    hint: '即使保证了充足的睡眠，醒来仍觉疲惫不堪',
    options: [{ text: '精神饱满', score: 0 }, { text: '偶有疲劳', score: 1 }, { text: '精力明显下降', score: 2 }, { text: '极度疲乏嗜睡', score: 3 }]
  },
  {
    category: '体重代谢',
    type: 'hypo',
    question: '您的体重在饮食习惯未变的情况下是否有所增加？',
    hint: '尤其是腹部、面部容易出现虚肿或体重难以减轻',
    options: [{ text: '稳定或减轻', score: 0 }, { text: '轻微波动', score: 1 }, { text: '明显增加', score: 2 }, { text: '持续且难以控制', score: 3 }]
  },
  {
    category: '心血管',
    type: 'hyper',
    question: '您静息状态下（如坐着或躺着）是否感到心跳过快？',
    hint: '心跳次数明显高于以往，或有胸闷、心慌感',
    options: [{ text: '从无及正常', score: 0 }, { text: '偶尔感觉到', score: 1 }, { text: '经常心慌', score: 2 }, { text: '严重且持续心动过速', score: 3 }]
  },
  {
    category: '温度适应',
    type: 'hyper',
    question: '您是否比周围的人更怕热，或手脚经常出汗？',
    hint: '在凉爽的环境中也容易出汗，皮肤发烫',
    options: [{ text: '正常', score: 0 }, { text: '略微怕热', score: 1 }, { text: '明显怕热多汗', score: 2 }, { text: '极度无法耐热', score: 3 }]
  },
  {
    category: '温度适应',
    type: 'hypo',
    question: '您是否感到异常畏寒，比一般人更容易手脚冰凉？',
    hint: '即使是在温暖的室内也需要穿更多的衣服',
    options: [{ text: '正常', score: 0 }, { text: '微怕冷', score: 1 }, { text: '明显怕冷', score: 2 }, { text: '穿再多也感觉寒冷', score: 3 }]
  },
  {
    category: '神经精神',
    type: 'hyper',
    question: '您近期是否经常感到莫名的焦虑、焦虑或易怒？',
    hint: '情绪难以控制，容易为小事发脾气或感到坐立不安',
    options: [{ text: '平稳', score: 0 }, { text: '偶有烦躁', score: 1 }, { text: '经常焦虑易怒', score: 2 }, { text: '极度敏感躁动', score: 3 }]
  },
  {
    category: '神经精神',
    type: 'hypo',
    question: '您是否感到记忆力减退、反应迟钝或思考困难？',
    hint: '感觉思维好像“卡住了”，难以集中注意力',
    options: [{ text: '头脑清晰', score: 0 }, { text: '偶有分心', score: 1 }, { text: '反应明显变慢', score: 2 }, { text: '大脑常处于“迷雾”状态', score: 3 }]
  },
  {
    category: '消化系统',
    type: 'hypo',
    question: '您近期是否有严重的便秘问题？',
    hint: '排便次数明显减少，或排便过程非常困难',
    options: [{ text: '每日正常', score: 0 }, { text: '偶有不畅', score: 1 }, { text: '持续性便秘', score: 2 }, { text: '严重依赖通便物', score: 3 }]
  },
  {
    category: '皮肤发质',
    type: 'hypo',
    question: '您的皮肤是否变得干燥粗糙，头发变得干枯易断？',
    hint: '即使使用护肤品也难以缓解，或出现不明原因脱毛',
    options: [{ text: '良好', score: 0 }, { text: '轻微干燥', score: 1 }, { text: '明显粗糙干枯', score: 2 }, { text: '异常干燥碎裂', score: 3 }]
  },
  {
    category: '手部体征',
    type: 'hyper',
    question: '您的双手是否会出现细微的、不自主的颤抖？',
    hint: '伸平双手时观察手指尖，是否有微微抖动',
    options: [{ text: '完全平稳', score: 0 }, { text: '极轻微', score: 1 }, { text: '肉眼可见抖动', score: 2 }, { text: '抖动影响书写拿捏', score: 3 }]
  },
  {
    category: '眼部征象',
    type: 'hyper',
    question: '您是否感到眼睛干涩、流泪，或观察到眼球较以前突出？',
    hint: '家人是否提到您的眼神看起来“很凶”或盯着人看',
    options: [{ text: '正常', score: 0 }, { text: '偶有不适', score: 1 }, { text: '明显干涩突眼', score: 2 }, { text: '有重影或明显病变', score: 3 }]
  },
  {
    category: '颈部体征',
    type: 'common',
    question: '您是否有感觉到脖子（甲状腺区域）肿大或有压迫感？',
    hint: '穿高领衣服感到不适，或吞咽时有异物感',
    options: [{ text: '无感觉', score: 0 }, { text: '偶尔紧绷', score: 1 }, { text: '可见或可摸到肿大', score: 2 }, { text: '气促或明显隆起', score: 3 }]
  }
];

const startAssess = () => {
  viewState.value = 'assess';
};

const selectOption = (idx) => {
  answers[currentIndex.value] = idx;
};

const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const nextQuestion = async () => {
  if (currentIndex.value < questions.length - 1) {
    currentIndex.value++;
  } else {
    // 提交前进行保存
    uni.showLoading({ title: '计算中...' });
    try {
      await http.post('/api/assess/save', {
        totalScore: totalScore.value,
        resultLevel: resultLevel.value,
        activityStatus: activityStatus.value,
        hyperScore: hyperScore.value,
        hypoScore: hypoScore.value,
        categoryScores: categoryScores.value,
        answers: answers
      });
      uni.hideLoading();
      viewState.value = 'result';
    } catch (e) {
      uni.hideLoading();
      uni.$u.toast('结果保存失败，但不影响本次查看');
      viewState.value = 'result';
    }
  }
};

const goToHistory = () => {
  uni.navigateTo({ url: '/pages/assess/history' });
};

// ==================== 评分系统优化 ====================

// 总分
const totalScore = computed(() => {
  return Object.values(answers).reduce((sum, idx, i) => sum + questions[i].options[idx].score, 0);
});

// 甲亢倾向分
const hyperScore = computed(() => {
  return questions.reduce((sum, q, i) => {
    if (q.type === 'hyper' && answers[i] !== undefined) {
      return sum + q.options[answers[i]].score;
    }
    return sum;
  }, 0);
});

// 甲减倾向分
const hypoScore = computed(() => {
  return questions.reduce((sum, q, i) => {
    if (q.type === 'hypo' && answers[i] !== undefined) {
      return sum + q.options[answers[i]].score;
    }
    return sum;
  }, 0);
});

const maxHyperScore = questions.filter(q => q.type === 'hyper').length * 3;
const maxHypoScore = questions.filter(q => q.type === 'hypo').length * 3;

// 甲状腺活跃度描述
const activityStatus = computed(() => {
  if (hyperScore.value > hypoScore.value + 3) return '功能亢进倾向';
  if (hypoScore.value > hyperScore.value + 3) return '功能减退倾向';
  return '相对平衡';
});

// 分类统计
const categoryScores = computed(() => {
  const cats = {};
  questions.forEach((q, idx) => {
    if (!cats[q.category]) {
      cats[q.category] = { total: 0, count: 0 };
    }
    cats[q.category].count++;
    if (answers[idx] !== undefined) {
      cats[q.category].total += q.options[answers[idx]].score;
    }
  });
  
  return Object.keys(cats).map(name => {
    const percent = Math.round(cats[name].total / (cats[name].count * 3) * 100);
    let level = 'good';
    let label = '正常';
    if (percent > 60) {
      level = 'bad';
      label = '临床意义明显';
    } else if (percent > 20) {
      level = 'warn';
      label = '需关注';
    }
    return { name, percent, level, label };
  });
});

const resultLevel = computed(() => {
  const score = totalScore.value;
  if (score >= 24) return 'severe';
  if (score >= 15) return 'moderate';
  if (score >= 7) return 'mild';
  return 'normal';
});

const resultTitle = computed(() => {
  const map = { normal: '状态极佳', mild: '轻度紊乱', moderate: '中度风险', severe: '高度预警' };
  return map[resultLevel.value];
});

const resultIcon = computed(() => {
  const map = { normal: 'checkmark-circle-fill', mild: 'info-circle-fill', moderate: 'warning-fill', severe: 'close-circle-fill' };
  return map[resultLevel.value];
});

const resultTips = computed(() => {
  if (resultLevel.value === 'normal') return '您目前的甲状腺相关体征非常健康。请继续保持良好的生活作息，建议每年进行一次例行甲功检查。';
  if (resultLevel.value === 'mild') return '测评显示您存在一些轻微的甲状腺功能波动征兆。建议近期关注心率、体重变化，并考虑去医院进行抽血化验 TSH 和 FT4。';
  if (resultLevel.value === 'moderate') {
    let advice = '您的症状表现较为典型，存在一定的甲状腺功能异常风险。';
    if (activityStatus.value.includes('亢进')) advice += ' 建议尽快化验甲功，并着重检查 TRAb 等亢进指标。';
    else if (activityStatus.value.includes('减退')) advice += ' 建议化验甲功五项，并关注 TPOAb 抗体情况。';
    return advice;
  }
  return '您的综合评分非常高，身体多项指标反映出明显的甲状腺疾病体征。请不要拖延，务必在近期前往正规医院内分泌科进行全面检查。';
});

const resetTest = () => {
  currentIndex.value = 0;
  Object.keys(answers).forEach(key => delete answers[key]);
  viewState.value = 'start';
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

// 共通卡片样式
.premium-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 10rpx 30rpx rgba(62, 123, 255, 0.05);
  border: 1px solid rgba(62, 123, 255, 0.04);
}

.card-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #1D2129;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  &::before {
    content: '';
    width: 8rpx;
    height: 32rpx;
    background: #3E7BFF;
    border-radius: 4rpx;
    margin-right: 16rpx;
  }
}

// 1. 开始页
.start-body {
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .start-content {
    text-align: center;
    width: 100%;
  }

  .hero-image {
    position: relative;
    width: 240rpx;
    height: 240rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 60rpx;
    
    .hero-ripple {
      position: absolute;
      width: 100%;
      height: 100%;
      background: rgba(62, 123, 255, 0.08);
      border-radius: 50%;
      animation: ripple 2s infinite;
    }
  }

  .start-title {
    font-size: 52rpx;
    font-weight: 900;
    color: #1D2129;
    margin-bottom: 24rpx;
  }

  .start-desc {
    font-size: 28rpx;
    color: #86909C;
    line-height: 1.6;
    margin-bottom: 60rpx;
    padding: 0 40rpx;
  }

  .start-features {
    margin-bottom: 80rpx;
    .feature-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12rpx;
      margin-bottom: 20rpx;
      font-size: 26rpx;
      color: #4E5969;
      font-weight: 600;
    }
  }

  .start-btn {
    width: 400rpx !important;
    height: 110rpx !important;
    font-size: 36rpx !important;
    font-weight: 800 !important;
    box-shadow: 0 20rpx 40rpx rgba(62, 123, 255, 0.25) !important;
  }

  .disclaimer-mini {
    margin-top: 40rpx;
    font-size: 22rpx;
    color: #C9CDD4;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8rpx;
  }
}

// 2. 测评页
.main-body {
  padding: 40rpx;
}

.progress-section {
  margin-bottom: 40rpx;
  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16rpx;
    .progress-text { font-size: 24rpx; color: #86909C; font-weight: 600; }
    .progress-percent { font-size: 24rpx; color: #3E7BFF; font-weight: 800; }
  }
  .progress-bar {
    height: 10rpx;
    background: #E5E6EB;
    border-radius: 10rpx;
    overflow: hidden;
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3E7BFF, #689DFF);
      transition: width 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    }
  }
}

.question-card {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 48rpx;
  box-shadow: 0 12rpx 40rpx rgba(0,0,0,0.03);
  min-height: 500rpx;

  .q-header {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
  }

  .q-category {
    font-size: 22rpx;
    color: #3E7BFF;
    background: rgba(62, 123, 255, 0.08);
    padding: 6rpx 20rpx;
    border-radius: 10rpx;
    font-weight: 800;
  }

  .q-tag {
    font-size: 20rpx;
    padding: 6rpx 16rpx;
    border-radius: 10rpx;
    font-weight: 600;
    &.hyper { background: rgba(255, 125, 0, 0.08); color: #FF7D00; }
    &.hypo { background: rgba(144, 147, 153, 0.08); color: #909399; }
    &.common { background: rgba(114, 46, 209, 0.08); color: #722ED1; }
  }

  .q-title {
    font-size: 40rpx;
    font-weight: 800;
    color: #1D2129;
    line-height: 1.4;
    margin-bottom: 16rpx;
  }

  .q-hint {
    font-size: 26rpx;
    color: #818D9C;
    line-height: 1.5;
    margin-bottom: 48rpx;
    padding-left: 12rpx;
    border-left: 4rpx solid #E5E6EB;
  }
}

.options {
  .option-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx 36rpx;
    background: #F8FAFF;
    border: 3rpx solid #F0F2F5;
    border-radius: 28rpx;
    margin-bottom: 20rpx;
    transition: all 0.2s ease;

    .opt-left {
      display: flex;
      align-items: center;
      gap: 24rpx;
      .opt-letter {
        width: 44rpx;
        height: 44rpx;
        background: #FFFFFF;
        border: 2rpx solid #E5E6EB;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24rpx;
        font-weight: 800;
        color: #86909C;
      }
      text { font-size: 30rpx; color: #4E5969; font-weight: 600; }
    }

    &.selected {
      background: rgba(62, 123, 255, 0.05);
      border-color: #3E7BFF;
      .opt-left {
        .opt-letter { background: #3E7BFF; border-color: #3E7BFF; color: #FFF; }
        text { color: #3E7BFF; }
      }
    }
    
    &:active { transform: scale(0.98); }
  }
}

.nav-buttons {
  display: flex;
  margin-top: 50rpx;
  gap: 20rpx;
  .prev-box { flex: 0.4; }
  .next-box { flex: 0.6; }
}

// 3. 结果页
.result-body {
  padding: 32rpx;
}

.result-hero {
  padding: 80rpx 40rpx;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
  color: #FFFFFF;
  margin-bottom: 32rpx;
  text-align: center;
  box-shadow: 0 20rpx 50rpx rgba(62, 123, 255, 0.2);
  
  &.normal { background: linear-gradient(135deg, #2ED477 0%, #00B42A 100%); }
  &.mild { background: linear-gradient(135deg, #1890FF 0%, #13C2C2 100%); }
  &.moderate { background: linear-gradient(135deg, #FF9500 0%, #FF7D00 100%); }
  &.severe { background: linear-gradient(135deg, #F53F3F 0%, #B71C1C 100%); }

  .hero-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 30rpx;
    margin-bottom: 24rpx;
    
    .result-icon-box {
      width: 100rpx;
      height: 100rpx;
      background: rgba(255,255,255,0.2);
      border-radius: 30rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .score-main {
      .score-num { font-size: 100rpx; font-weight: 900; line-height: 1; }
      .score-unit { font-size: 30rpx; font-weight: 800; margin-left: 8rpx; }
    }
  }

  .result-title {
    font-size: 52rpx;
    font-weight: 900;
    margin-bottom: 12rpx;
  }
  .result-summary { font-size: 28rpx; opacity: 0.85; font-weight: 600; }
}

.tendency-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 20rpx 0;
  
  .tendency-item {
    flex: 1;
    text-align: center;
    .t-label { font-size: 24rpx; color: #86909C; margin-bottom: 8rpx; }
    .t-value { font-size: 40rpx; font-weight: 900; margin-bottom: 12rpx; }
    .t-bar {
      width: 120rpx;
      height: 8rpx;
      background: #F0F2F5;
      border-radius: 4rpx;
      margin: 0 auto;
      overflow: hidden;
      .t-fill { height: 100%; border-radius: 4rpx; }
    }
    
    &.hyper { 
      .t-value { color: #FF7043; }
      .t-fill { background: #FF7043; }
    }
    &.hypo { 
      .t-value { color: #5C6BC0; }
      .t-fill { background: #5C6BC0; }
    }
  }
  .tendency-divider { width: 2rpx; height: 100rpx; background: #F0F2F5; }
}
.tendency-tip { font-size: 20rpx; color: #C9CDD4; text-align: center; margin-top: 24rpx; }

.dimension-list {
  .dim-item {
    margin-bottom: 30rpx;
    &:last-child { margin-bottom: 0; }
    
    .dim-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12rpx;
      .dim-name { font-size: 26rpx; color: #4E5969; font-weight: 700; }
      .dim-label { font-size: 22rpx; font-weight: 800; }
    }
    .dim-progress {
      height: 10rpx;
      background: #F0F2F5;
      border-radius: 5rpx;
      overflow: hidden;
      .dim-fill {
        height: 100%;
        border-radius: 5rpx;
        &.good { background: #2ED477; }
        &.warn { background: #FF9500; }
        &.bad { background: #F53F3F; }
      }
    }
  }
}

.tips-card {
  .tips-header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 16rpx;
    text { font-size: 28rpx; font-weight: 800; color: #1D2129; }
  }
  .tips-text { font-size: 28rpx; color: #4E5969; line-height: 1.6; }
}

.result-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
  .action-btn { flex: 1; height: 100rpx !important; }
}

.disclaimer-final {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 30rpx;
  background: rgba(245, 63, 63, 0.05);
  border-radius: 20rpx;
  margin-top: 40rpx;
  text { font-size: 22rpx; color: #F53F3F; line-height: 1.4; font-weight: 500; }
}

// 动画
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateX(30rpx); }
.fade-slide-leave-to { opacity: 0; transform: translateX(-30rpx); }

@keyframes ripple {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

.pulse-blue {
  &:active { transform: scale(0.96); }
}
</style>

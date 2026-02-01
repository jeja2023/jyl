<template>
  <view class="wiki-wrapper" :class="{'lock-scroll': showDetail}">
    <u-navbar title="甲友百科" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <!-- 搜索框 -->
    <view class="search-section">
      <u-search 
        v-model="keyword" 
        placeholder="搜索甲状腺健康知识" 
        shape="round"
        bgColor="#F6F8FC"
        @search="onSearch"
      ></u-search>
    </view>
    
    <!-- 分类标签 -->
    <view class="category-tabs">
      <scroll-view scroll-x class="tabs-scroll">
        <view 
          class="tab-item" 
          v-for="(cat, idx) in categories" 
          :key="idx"
          :class="{active: currentCategory === idx}"
          @click="currentCategory = idx"
        >
          {{ cat }}
        </view>
      </scroll-view>
    </view>
    
    <!-- 文章列表 -->
    <view class="article-list">
      <view 
        class="article-card" 
        v-for="(article, idx) in filteredArticles" 
        :key="idx"
        @click="viewArticle(article)"
      >
        <image :src="article.cover" mode="aspectFill" class="article-cover"></image>
        <view class="article-info">
          <view class="article-title">{{ article.title }}</view>
          <view class="article-desc">{{ article.summary }}</view>
          <view class="article-meta">
            <view class="tag">{{ article.category }}</view>
            <view class="read-info">
              <u-icon name="eye" size="14" color="#C9CDD4"></u-icon>
              <text>{{ article.views }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 文章详情弹窗 -->
    <u-popup :show="showDetail" mode="bottom" round="20" @close="showDetail = false" :closeOnClickOverlay="true">
      <view class="detail-popup">
        <view class="detail-header">
          <view class="detail-title">{{ currentArticle.title }}</view>
          <u-icon name="close" size="24" color="#86909C" @click="showDetail = false"></u-icon>
        </view>
        <scroll-view scroll-y class="detail-content">
          <view class="detail-meta">
            <view class="tag">{{ currentArticle.category }}</view>
            <text class="date">{{ currentArticle.date }}</text>
          </view>
          <view class="detail-body" v-html="currentArticle.content"></view>
          <view class="disclaimer">
            <u-icon name="info-circle" size="14" color="#C9CDD4"></u-icon>
            <text>本内容仅供科普参考，不能替代医生诊断</text>
          </view>
        </scroll-view>
      </view>
    </u-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { onLoad } from '@dcloudio/uni-app';

const goBack = () => {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({
      url: '/pages/index/index'
    });
  }
};

const keyword = ref('');
const currentCategory = ref(0);
const showDetail = ref(false);
const currentArticle = ref({});

const categories = ['全部', '疾病知识', '用药指南', '饮食调理', '生活方式', '检查解读'];

// 模拟文章数据
const articles = ref([
  {
    id: 1,
    title: '甲状腺功能减退症的症状与治疗',
    summary: '了解甲减的常见症状、诊断方法和治疗方案',
    category: '疾病知识',
    cover: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400',
    views: 3256,
    date: '2024-01-15',
    content: `<h3>什么是甲状腺功能减退症？</h3>
<p>甲状腺功能减退症（简称甲减）是由于甲状腺激素分泌不足导致的内分泌疾病。</p>

<h3>常见症状</h3>
<ul>
<li>疲劳乏力、嗜睡</li>
<li>怕冷、皮肤干燥</li>
<li>体重增加</li>
<li>便秘</li>
<li>记忆力下降</li>
<li>情绪低落</li>
</ul>

<h3>诊断方法</h3>
<p>主要通过血液检查测定TSH和FT4水平来诊断。TSH升高、FT4降低是甲减的典型表现。</p>

<h3>治疗方案</h3>
<p>甲减的治疗主要是补充甲状腺激素，最常用的药物是左甲状腺素钠片（优甲乐）。需要在医生指导下调整剂量，定期复查甲功。</p>`
  },
  {
    id: 2,
    title: '优甲乐的正确服用方法',
    summary: '掌握左甲状腺素钠片的服用技巧和注意事项',
    category: '用药指南',
    cover: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400',
    views: 5621,
    date: '2024-01-12',
    content: `<h3>服药时间</h3>
<p>建议早晨空腹服用，服药后30-60分钟内避免进食，以确保药物充分吸收。</p>

<h3>注意事项</h3>
<ul>
<li>避免与钙剂、铁剂同服，间隔至少4小时</li>
<li>避免与豆浆、牛奶同服</li>
<li>不可自行调整剂量</li>
<li>不可突然停药</li>
</ul>

<h3>漏服处理</h3>
<p>如果漏服，发现后尽快补服。如果已接近下次服药时间，则跳过这次，下次按时服用，切勿加倍服用。</p>

<h3>定期复查</h3>
<p>治疗初期每4-6周复查甲功，剂量稳定后可延长至3-6个月复查一次。</p>`
  },
  {
    id: 3,
    title: '甲状腺患者的饮食建议',
    summary: '科学饮食帮助维护甲状腺健康',
    category: '饮食调理',
    cover: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
    views: 4532,
    date: '2024-01-10',
    content: `<h3>碘的摄入</h3>
<p>甲减患者通常可正常摄入碘盐，但甲亢患者需要限制碘摄入，避免海带、紫菜等高碘食物。</p>

<h3>推荐食物</h3>
<ul>
<li>富含硒的食物：巴西坚果、鸡蛋</li>
<li>优质蛋白：鱼肉、鸡肉、豆腐</li>
<li>新鲜蔬果：绿叶蔬菜、浆果类</li>
</ul>

<h3>避免食物</h3>
<ul>
<li>生的十字花科蔬菜（如生卷心菜）</li>
<li>过度加工食品</li>
<li>高糖食物</li>
</ul>

<h3>服药期间注意</h3>
<p>服用优甲乐期间，避免与大豆制品、高纤维食物同时食用，会影响药物吸收。</p>`
  },
  {
    id: 4,
    title: '甲状腺术后注意事项',
    summary: '手术后的康复护理和生活指导',
    category: '生活方式',
    cover: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400',
    views: 2876,
    date: '2024-01-08',
    content: `<h3>术后护理</h3>
<p>手术后需要注意伤口护理，保持伤口干燥清洁，按医嘱换药。</p>

<h3>饮食调整</h3>
<ul>
<li>术后6小时开始少量饮水</li>
<li>逐渐过渡到流质、半流质饮食</li>
<li>避免辛辣刺激食物</li>
</ul>

<h3>定期复查</h3>
<p>术后1个月、3个月、6个月需要复查甲功，根据结果调整用药剂量。</p>

<h3>生活建议</h3>
<ul>
<li>保持规律作息</li>
<li>适度运动，避免剧烈运动</li>
<li>保持心情愉悦</li>
<li>戒烟限酒</li>
</ul>`
  },
  {
    id: 5,
    title: '如何看懂甲功报告单',
    summary: '详解TSH、FT3、FT4等指标的含义',
    category: '检查解读',
    cover: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400',
    views: 6789,
    date: '2024-01-05',
    content: `<h3>核心指标说明</h3>

<h4>TSH（促甲状腺激素）</h4>
<p>正常范围：0.27-4.2 mIU/L</p>
<p>TSH升高提示甲减，降低提示甲亢。这是最敏感的甲状腺功能指标。</p>

<h4>FT4（游离甲状腺素）</h4>
<p>正常范围：12-22 pmol/L</p>
<p>直接反映甲状腺分泌功能。</p>

<h4>FT3（游离三碘甲状腺原氨酸）</h4>
<p>正常范围：3.1-6.8 pmol/L</p>
<p>T3是活性形式的甲状腺激素。</p>

<h3>常见情况判断</h3>
<ul>
<li>TSH↑ + FT4↓ = 甲减</li>
<li>TSH↓ + FT4↑ = 甲亢</li>
<li>TSH↑ + FT4正常 = 亚临床甲减</li>
<li>TSH↓ + FT4正常 = 亚临床甲亢</li>
</ul>`
  },
  {
    id: 6,
    title: '甲状腺功能亢进症的症状与管理',
    summary: '认识甲亢的典型表现和日常管理要点',
    category: '疾病知识',
    cover: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=400',
    views: 3421,
    date: '2024-01-03',
    content: `<h3>什么是甲亢？</h3>
<p>甲状腺功能亢进症（甲亢）是由于甲状腺激素分泌过多引起的代谢亢进综合征。</p>

<h3>典型症状</h3>
<ul>
<li>心悸、心跳加快</li>
<li>手抖</li>
<li>怕热、多汗</li>
<li>体重下降</li>
<li>情绪易激动</li>
<li>眼突（Graves病）</li>
</ul>

<h3>日常管理</h3>
<ul>
<li>限制碘摄入</li>
<li>避免咖啡、浓茶等刺激性饮品</li>
<li>保持情绪稳定</li>
<li>规律作息，避免熬夜</li>
<li>适度运动，避免剧烈运动</li>
</ul>`
  }
]);

// 过滤文章
const filteredArticles = computed(() => {
  let result = articles.value;
  
  // 分类过滤
  if (currentCategory.value > 0) {
    const catName = categories[currentCategory.value];
    result = result.filter(a => a.category === catName);
  }
  
  // 关键词过滤
  if (keyword.value) {
    const kw = keyword.value.toLowerCase();
    result = result.filter(a => 
      a.title.toLowerCase().includes(kw) || 
      a.summary.toLowerCase().includes(kw)
    );
  }
  
  return result;
});

const onSearch = () => {
  // 搜索触发
};

onLoad((options) => {
  if (options && options.id) {
    const articleId = parseInt(options.id);
    const target = articles.value.find(a => a.id === articleId);
    if (target) {
      viewArticle(target);
    }
  }
});

const viewArticle = (article) => {
  currentArticle.value = article;
  showDetail.value = true;
};
</script>

<style lang="scss" scoped>
.wiki-wrapper {
  background: #F6F8FC;
  min-height: 100vh;
  
  &.lock-scroll {
    height: 100vh;
    overflow: hidden;
  }
}    

.search-section {
  padding: 20rpx 32rpx;
  background: #fff;
}

.category-tabs {
  background: #fff;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F3F5;
  
  .tabs-scroll {
    white-space: nowrap;
    padding: 0 24rpx;
  }
  
  .tab-item {
    display: inline-block;
    padding: 12rpx 28rpx;
    margin-right: 16rpx;
    font-size: 26rpx;
    color: #4E5969;
    background: #F6F8FC;
    border-radius: 28rpx;
    transition: all 0.2s;
    
    &.active {
      background: linear-gradient(135deg, #3E7BFF, #689DFF);
      color: #fff;
    }
  }
}

.article-list {
  padding: 24rpx 32rpx;
}

.article-card {
  display: flex;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  
  .article-cover {
    width: 240rpx;
    height: 200rpx;
    flex-shrink: 0;
  }
  
  .article-info {
    flex: 1;
    padding: 24rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    
    .article-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #1D2129;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .article-desc {
      font-size: 24rpx;
      color: #86909C;
      margin-top: 8rpx;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .article-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12rpx;
      
      .tag {
        font-size: 22rpx;
        color: #3E7BFF;
        background: #EEF4FF;
        padding: 6rpx 16rpx;
        border-radius: 16rpx;
      }
      
      .read-info {
        display: flex;
        align-items: center;
        gap: 6rpx;
        font-size: 22rpx;
        color: #C9CDD4;
      }
    }
  }
}

.detail-popup {
  height: 80vh;
  display: flex;
  flex-direction: column;
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 40rpx;
    border-bottom: 1rpx solid #F2F3F5;
    
    .detail-title {
      flex: 1;
      font-size: 36rpx;
      font-weight: 700;
      color: #1D2129;
      line-height: 1.4;
      padding-right: 20rpx;
    }
  }
  
  .detail-content {
    height: 70vh;
    padding: 32rpx 40rpx;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    
    .detail-meta {
      display: flex;
      align-items: center;
      gap: 16rpx;
      margin-bottom: 32rpx;
      
      .tag {
        font-size: 24rpx;
        color: #3E7BFF;
        background: #EEF4FF;
        padding: 8rpx 20rpx;
        border-radius: 20rpx;
      }
      
      .date {
        font-size: 24rpx;
        color: #C9CDD4;
      }
    }
    
    .detail-body {
      font-size: 30rpx;
      color: #4E5969;
      line-height: 1.8;
      
      :deep(h3) {
        font-size: 32rpx;
        font-weight: 600;
        color: #1D2129;
        margin: 32rpx 0 16rpx;
      }
      
      :deep(h4) {
        font-size: 30rpx;
        font-weight: 600;
        color: #1D2129;
        margin: 24rpx 0 12rpx;
      }
      
      :deep(p) {
        margin-bottom: 16rpx;
      }
      
      :deep(ul) {
        padding-left: 32rpx;
        margin-bottom: 16rpx;
        
        li {
          margin-bottom: 8rpx;
          position: relative;
          
          &::before {
            content: '';
            position: absolute;
            left: -20rpx;
            top: 14rpx;
            width: 8rpx;
            height: 8rpx;
            background: #3E7BFF;
            border-radius: 50%;
          }
        }
      }
    }
    
    .disclaimer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8rpx;
      margin-top: 40rpx;
      padding-top: 32rpx;
      border-top: 1rpx solid #F2F3F5;
      font-size: 24rpx;
      color: #C9CDD4;
    }
  }
}
</style>

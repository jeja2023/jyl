<template>
  <view class="wiki-wrapper" :class="{'lock-scroll': showDetail}">
    <u-navbar title="甲友百科" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}">
        <template #right>
            <view class="nav-right" @click="openMenu" v-if="userStore.isLogin">
                <u-icon name="list-dot" size="24" color="#333"></u-icon>
            </view>
        </template>
    </u-navbar>

    <!-- 搜索框 -->
    <view class="search-section">
      <u-search 
        v-model="keyword" 
        placeholder="搜索甲状腺健康知识" 
        shape="round"
        bgColor="#F6F8FC"
        @search="onSearch"
        @custom="onSearch"
        @clear="onClear"
      ></u-search>
    </view>
    
    <!-- 分类标签 -->
    <view class="category-tabs">
      <scroll-view scroll-x class="tabs-scroll">
        <view 
          class="tab-item" 
          v-for="(cat, idx) in categories" 
          :key="idx"
          :class="{active: currentCategory === cat}"
          @click="changeCategory(cat)"
        >
          {{ cat }}
        </view>
      </scroll-view>
    </view>
    
    <!-- 文章列表 -->
    <view class="article-list">
      <u-empty v-if="articles.length === 0 && !loading" mode="search" text="暂无相关文章"></u-empty>
      
      <view 
        class="article-card" 
        v-for="(article, idx) in articles" 
        :key="idx"
        @click="viewArticle(article)"
      >
        <image v-if="article.cover" :src="article.cover" mode="aspectFill" class="article-cover"></image>
        <view v-else class="article-cover placeholder">
            <u-icon name="image" size="40" color="#E5E6EB"></u-icon>
        </view>
        
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
      
      <u-loadmore :status="loadStatus" v-if="articles.length > 0" @loadmore="loadMore" />
    </view>
    
    <!-- 文章详情弹窗 -->
    <u-popup :show="showDetail" mode="bottom" round="20" @close="showDetail = false" :closeOnClickOverlay="true">
      <view class="detail-popup" v-if="currentArticle">
        <view class="detail-header">
          <view class="detail-title">{{ currentArticle.title }}</view>
          <u-icon name="close" size="24" color="#86909C" @click="showDetail = false"></u-icon>
        </view>
        <scroll-view scroll-y class="detail-content">
          <view class="detail-meta">
            <view class="tag">{{ currentArticle.category }}</view>
            <text class="date">{{ formatDate(currentArticle.createdAt) }}</text>
            <text class="author">作者: {{ currentArticle.authorName || '甲友百科' }}</text>
          </view>
          
          <view style="margin-bottom: 20rpx;">
             <u-image v-if="currentArticle.cover" :src="currentArticle.cover" width="100%" height="200" radius="8"></u-image>
          </view>
          
          <view class="detail-body">
            <u-parse :content="currentArticle.content"></u-parse>
          </view>
          
          <view class="disclaimer">
            <u-icon name="info-circle" size="14" color="#C9CDD4"></u-icon>
            <text>本内容仅供科普参考，不能替代医生诊断</text>
          </view>
        </scroll-view>
      </view>
    </u-popup>

    <!-- 操作菜单 -->
    <u-action-sheet 
       :show="showActionSheet" 
       :actions="actions" 
       title="更多操作" 
       :zIndex="10090"
       @close="showActionSheet = false" 
       @select="onActionSelect"
       cancelText="取消"
    ></u-action-sheet>
    
  </view>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue';
import { onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app';
import http from '@/utils/request.js';
import { useUserStore } from '@/store/index.js';

const userStore = useUserStore();

const keyword = ref('');
const currentCategory = ref('全部');
const showDetail = ref(false);
const showActionSheet = ref(false);
const currentArticle = ref(null);
const articles = ref([]);
const loading = ref(false);
const loadStatus = ref('loadmore');
const page = ref(1);
const pageSize = 10;
const total = ref(0);

const categories = ['全部', '疾病知识', '用药指南', '饮食调理', '生活方式', '检查解读', '经验分享'];

const actions = computed(() => {
    const list = [
        { name: '我要投稿', value: 'submit' },
        { name: '我的投稿', value: 'mine' }
    ];
    if (userStore.userInfo?.role === 'admin') {
        list.push({ name: '内容审核', value: 'review', color: '#ff9900' });
    }
    return list;
});

const goBack = () => {
    uni.switchTab({ url: '/pages/index/index' });
};

const formatDate = (dateStr) => {
    if(!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
}

// 获取文章列表
const fetchList = async (isLoadMore = false) => {
    if (loading.value) return;
    loading.value = true;
    if (!isLoadMore) loadStatus.value = 'loading';
    
    try {
        const res = await http.get('/api/wiki/list', {
            params: {
                page: page.value,
                pageSize: pageSize,
                category: currentCategory.value,
                keyword: keyword.value
            }
        });
        
        if (isLoadMore) {
            articles.value = [...articles.value, ...res.list];
        } else {
            articles.value = res.list;
        }
        
        total.value = res.total;
        
        if (articles.value.length >= total.value) {
            loadStatus.value = 'nomore';
        } else {
            loadStatus.value = 'loadmore';
        }
    } catch(e) {
        loadStatus.value = 'nomore';
    } finally {
        loading.value = false;
    }
}

// 标签切换
const changeCategory = (cat) => {
    if (currentCategory.value === cat) return;
    currentCategory.value = cat;
    page.value = 1;
    fetchList();
};

const openMenu = () => {
    console.log('Open Menu Clicked');
    showActionSheet.value = true;
};

// 搜索
const onSearch = () => {
    page.value = 1;
    fetchList();
};

const onClear = () => {
    keyword.value = '';
    onSearch();
}

// 加载更多
const loadMore = () => {
    if (loadStatus.value === 'nomore' || loading.value) return;
    page.value++;
    fetchList(true);
}

onReachBottom(() => {
    loadMore();
});

onPullDownRefresh(() => {
    page.value = 1;
    fetchList().then(() => {
        uni.stopPullDownRefresh();
    });
});

// 查看详情
const viewArticle = async (article) => {
    uni.showLoading({ title: '加载中' });
    try {
        // 获取详情（包含完整content）
        const res = await http.get(`/api/wiki/${article.id}`);
        // 增加阅读数显示（虽然列表页数据没变，这不重要）
        article.views++; 
        currentArticle.value = res;
        showDetail.value = true;
    } catch(e) {
        // fail
    } finally {
        uni.hideLoading();
    }
};

// 操作菜单
const onActionSelect = (e) => {
    if (e.value === 'submit') {
        uni.navigateTo({ url: '/pages/wiki/submission' });
    } else if (e.value === 'mine') {
        uni.navigateTo({ url: '/pages/wiki/my-articles' });
    } else if (e.value === 'review') {
        uni.navigateTo({ url: '/pages/wiki/review' });
    }
    // showActionSheet.value = false; // u-action-sheet 自动关闭
};

// 初始化
onLoad((options) => {
    // 检查是否有 id 传参
    if (options && options.id) {
        // 延迟一下确保组件加载
        setTimeout(() => {
             viewArticle({ id: options.id });
        }, 500);
    }
    fetchList();
});
</script>

<style lang="scss" scoped>
.wiki-wrapper {
  background: #F8FAFF;
  min-height: 100vh;
  padding-bottom: 40rpx;
  
  &.lock-scroll {
    height: 100vh;
    overflow: hidden;
  }
}    

.search-section {
  padding: 30rpx 40rpx;
  background: #FFFFFF;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.02);
}

.category-tabs {
  background: #FFFFFF;
  padding: 24rpx 0;
  border-bottom: 1px solid #F2F5FA;
  
  .tabs-scroll {
    white-space: nowrap;
    padding: 0 32rpx;
  }
  
  .tab-item {
    display: inline-block;
    padding: 14rpx 36rpx;
    margin-right: 20rpx;
    font-size: 26rpx;
    color: #86909C;
    background: #F6F8FC;
    border-radius: 30rpx;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    font-weight: 600;
    
    &.active {
      background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%);
      color: #FFFFFF;
      box-shadow: 0 8rpx 20rpx rgba(62, 123, 255, 0.25);
      transform: scale(1.05);
    }
  }
}

.article-list {
  padding: 32rpx 32rpx calc(env(safe-area-inset-bottom) + 20rpx);
}

.article-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 36rpx;
  overflow: hidden;
  margin-bottom: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.03);
  transition: all 0.3s;
  
  &:active {
    transform: translateY(-4rpx);
    box-shadow: 0 12rpx 32rpx rgba(0,0,0,0.06);
  }
  
  .article-cover {
    width: 220rpx;
    height: 180rpx;
    flex-shrink: 0;
    object-fit: cover;
    background: #F2F3F5;
    
    &.placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
    }
  }
  
  .article-info {
    flex: 1;
    padding: 24rpx 28rpx;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    
    .article-title {
      font-size: 32rpx;
      font-weight: 800;
      color: #1D2129;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      line-clamp: 1;
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
      font-weight: 500;
    }
    
    .article-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 16rpx;
      
      .tag {
        font-size: 20rpx;
        color: #3E7BFF;
        background: #F2F7FF;
        padding: 6rpx 20rpx;
        border-radius: 40rpx;
        font-weight: 700;
      }
      
      .read-info {
        display: flex;
        align-items: center;
        gap: 8rpx;
        font-size: 22rpx;
        color: #C9CDD4;
        font-weight: 600;
      }
    }
  }
}

.detail-popup {
  height: 85vh;
  display: flex;
  flex-direction: column;
  background: #FFFFFF;
  border-radius: 50rpx 50rpx 0 0;
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 45rpx 40rpx 30rpx;
    border-bottom: 1px solid #F2F3F5;
    
    .detail-title {
      flex: 1;
      font-size: 40rpx;
      font-weight: 900;
      color: #1D2129;
      line-height: 1.4;
      padding-right: 20rpx;
    }
  }
  
  .detail-content {
    flex: 1;
    padding: 32rpx 40rpx;
    overflow-y: auto;
    
    .detail-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 20rpx;
      margin-bottom: 40rpx;
      
      .tag {
        font-size: 22rpx;
        color: #FFFFFF;
        background: #3E7BFF;
        padding: 6rpx 24rpx;
        border-radius: 50rpx;
        font-weight: 700;
      }
      
      .date, .author {
        font-size: 24rpx;
        color: #86909C;
        font-weight: 500;
      }
    }
    
    .detail-body {
      font-size: 32rpx;
      color: #4E5969;
      line-height: 1.8;
      
      :deep(h3) { font-size: 34rpx; font-weight: 800; color: #1D2129; margin: 40rpx 0 20rpx; }
      :deep(p) { margin-bottom: 24rpx; }
      :deep(img) { border-radius: 20rpx; margin: 20rpx 0; }
    }
    
    .disclaimer {
      margin-top: 60rpx;
      padding-top: 40rpx;
      padding-bottom: 80rpx;
      border-top: 1px solid #F2F3F5;
      text-align: center;
      font-size: 24rpx;
      color: #C9CDD4;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10rpx;
    }
  }
}

.nav-right { padding: 0 32rpx; }
</style>

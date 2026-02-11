<template>
  <view class="container">
    <u-navbar title="我的投稿" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="list-container">
      <u-empty v-if="articles.length === 0 && !loading" mode="list" text="暂无投稿记录"></u-empty>
      
      <view class="article-item" v-for="item in articles" :key="item.id" @click="editArticle(item)">
        <view class="header">
          <text class="title">{{ item.title }}</text>
          <u-tag :text="getStatusText(item.status)" :type="getStatusType(item.status)" size="mini"></u-tag>
        </view>
        
        <view class="summary">{{ item.summary }}</view>
        
        <view class="footer">
          <text class="time">{{ formatDate(item.createdAt) }}</text>
          <view class="actions" v-if="['pending', 'rejected', 'draft'].includes(item.status)">
             <u-icon name="trash" size="18" color="#FF4D4F" @click.stop="deleteArticle(item)"></u-icon>
          </view>
        </view>
        
        <!-- 拒绝原因 -->
        <view class="reject-reason" v-if="item.status === 'rejected' && item.rejectReason">
          <u-icon name="info-circle-fill" color="#FF4D4F" size="14"></u-icon>
          <text>拒绝原因：{{ item.rejectReason }}</text>
        </view>
      </view>
    </view>
    
    <!-- 悬浮按钮 -->
    <view class="fab-btn" @click="goToSubmit">
      <u-icon name="plus" color="#fff" size="24"></u-icon>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const articles = ref([]);
const loading = ref(true);

const goBack = () => uni.navigateBack();

const getStatusText = (status) => {
  const map = {
    'pending': '审核中',
    'published': '已发布',
    'rejected': '未通过',
    'draft': '草稿'
  };
  return map[status] || status;
};

const getStatusType = (status) => {
  const map = {
    'pending': 'warning',
    'published': 'success',
    'rejected': 'error',
    'draft': 'info'
  };
  return map[status] || 'info';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
};

const fetchList = async () => {
    loading.value = true;
    try {
        const res = await http.get('/api/wiki/mine');
        articles.value = res.list;
    } catch(e) {
        // quiet
    } finally {
        loading.value = false;
    }
};

const goToSubmit = () => {
    uni.navigateTo({ url: '/pages/wiki/submission' });
};

const editArticle = (item) => {
    if (['published'].includes(item.status)) {
        // 已发布的文章跳转到详情页查看
        uni.navigateTo({
            url: `/pages/wiki/list?id=${item.id}`
        });
    } else {
        // 跳转去编辑
        // 下一步我会修改 submission 支持传入 id
        uni.navigateTo({
            url: `/pages/wiki/submission?id=${item.id}`
        });
    }
}

const deleteArticle = async (item) => {
    uni.showModal({
        title: '提示',
        content: '确定要删除这篇投稿吗？',
        success: async (res) => {
            if (res.confirm) {
                await http.post('/api/wiki/remove', { id: item.id });
                uni.showToast({ title: '已删除', icon: 'none' });
                fetchList();
            }
        }
    })
}

onShow(() => {
    fetchList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #F6F8FC;
  padding-bottom: 40rpx;
}

.list-container {
    padding: 24rpx;
}

.article-item {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 24rpx;
    
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12rpx;
        
        .title {
            font-size: 30rpx;
            font-weight: 600;
            color: #1D2129;
            flex: 1;
            margin-right: 16rpx;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
    
    .summary {
        font-size: 26rpx;
        color: #86909C;
        margin-bottom: 16rpx;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    
    .footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .time {
            font-size: 24rpx;
            color: #C9CDD4;
        }
    }
    
    .reject-reason {
        margin-top: 16rpx;
        background: #FFF0F0;
        padding: 12rpx;
        border-radius: 8rpx;
        font-size: 24rpx;
        color: #FF4D4F;
        display: flex;
        align-items: flex-start;
        gap: 8rpx;
    }
}

.fab-btn {
    position: fixed;
    right: 40rpx;
    bottom: 100rpx;
    width: 96rpx;
    height: 96rpx;
    background: #3E7BFF;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 8rpx 20rpx rgba(62, 123, 255, 0.4);
    z-index: 99;
    transition: transform 0.2s;
    
    &:active {
        transform: scale(0.9);
    }
}
</style>

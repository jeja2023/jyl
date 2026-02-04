<template>
  <view class="container">
    <u-navbar title="内容审核" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="list-container">
       <u-empty v-if="list.length === 0 && !loading" mode="list" text="暂无待审核内容"></u-empty>
       
       <view class="card" v-for="item in list" :key="item.id" @click="checkDetail(item)">
           <view class="card-header">
               <text class="title">{{ item.title }}</text>
               <text class="time">{{ formatDate(item.createdAt) }}</text>
           </view>
           <view class="author">
               <u-icon name="account" size="14" color="#86909C"></u-icon>
               <text>{{ item.authorName || '匿名用户' }}</text>
           </view>
           <view class="card-footer">
               <u-tag text="待审核" type="warning" size="mini" plain></u-tag>
               <view class="btn-group">
                   <u-button type="success" size="mini" :plain="true" text="通过" @click.stop="approve(item)"></u-button>
                   <u-button type="error" size="mini" :plain="true" text="拒绝" @click.stop="openReject(item)"></u-button>
               </view>
           </view>
       </view>
    </view>
    
    <!-- 拒绝理由弹窗 -->
    <u-modal :show="showRejectModal" title="拒绝理由" @confirm="confirmReject" @cancel="showRejectModal = false" showCancelButton>
        <view class="reject-input">
            <u-textarea v-model="rejectReason" placeholder="请输入拒绝原因，帮助作者修改..." count></u-textarea>
        </view>
    </u-modal>
    
    <!-- 文章预览弹窗 -->
    <u-popup :show="showPreview" mode="bottom" round="20" @close="showPreview = false" :closeOnClickOverlay="true">
        <view class="detail-popup">
            <view class="detail-header">
              <view class="detail-title">{{ currentItem?.title }}</view>
              <u-icon name="close" size="24" color="#86909C" @click="showPreview = false"></u-icon>
            </view>
            <scroll-view scroll-y class="detail-content">
                <view style="margin-bottom: 20rpx;">
                    <u-image v-if="currentItem?.cover" :src="currentItem.cover" width="100%" height="200" radius="8"></u-image>
                </view>
                <view class="detail-body">
                    <u-parse :content="currentItem?.content"></u-parse>
                </view>
            </scroll-view>
            <view class="detail-footer">
                 <u-button type="success" text="通过审核" @click="approve(currentItem)"></u-button>
                 <u-button type="error" text="拒绝" plain @click="openReject(currentItem)"></u-button>
            </view>
        </view>
    </u-popup>
    
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import http from '@/utils/request.js';

const list = ref([]);
const loading = ref(true);
const showRejectModal = ref(false);
const showPreview = ref(false);
const rejectReason = ref('');
const currentItem = ref(null);

const goBack = () => uni.navigateBack();

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
};

const fetchList = async () => {
    loading.value = true;
    try {
        const res = await http.get('/api/wiki/pending');
        list.value = res.list;
    } catch(e) {
        // quiet
    } finally {
        loading.value = false;
    }
};

const checkDetail = async (item) => {
    // 列表接口可能没有content，如果内容很大列表页可能会精简，这里为了保险，如果是列表没给content，最好请求下详情
    // 不过我们的后端 pendingList 为了流量确实没给 content。
    // 需要请求详情接口，但详情接口我们只给 published 或者 author 为自己的看。
    // 管理员在detail接口里已经处理了权限。
    
    uni.showLoading({ title: '加载中' });
    try {
        const res = await http.get(`/api/wiki/${item.id}`);
        currentItem.value = res;
        showPreview.value = true;
    } catch(e) {
        
    } finally {
        uni.hideLoading();
    }
};

const approve = async (item) => {
    uni.showModal({
        title: '确认',
        content: `确定通过文章《${item.title}》吗？`,
        success: async (res) => {
            if (res.confirm) {
                await http.post('/api/wiki/approve', { id: item.id });
                uni.showToast({ title: '已发布', icon: 'success' });
                showPreview.value = false;
                fetchList();
            }
        }
    })
};

const openReject = (item) => {
    currentItem.value = item;
    rejectReason.value = '';
    showRejectModal.value = true;
};

const confirmReject = async () => {
    if (!rejectReason.value) return uni.showToast({ title: '请填写理由', icon:'none' });
    
    await http.post('/api/wiki/reject', { 
        id: currentItem.value.id,
        reason: rejectReason.value 
    });
    
    uni.showToast({ title: '已拒绝', icon: 'none' });
    showRejectModal.value = false;
    showPreview.value = false;
    fetchList();
};

onShow(() => {
    fetchList();
});
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #F6F8FC;
}

.list-container {
    padding: 24rpx;
}

.card {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 24rpx;
    
    .card-header {
        display: flex;
        justify-content: space-between;
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
        .time {
            font-size: 24rpx;
            color: #C9CDD4;
        }
    }
    
    .author {
        display: flex;
        align-items: center;
        gap: 8rpx;
        font-size: 24rpx;
        color: #86909C;
        margin-bottom: 24rpx;
    }
    
    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .btn-group {
            display: flex;
            gap: 16rpx;
        }
    }
}

.reject-input {
    padding: 24rpx 0;
}

.detail-popup {
  height: 80vh;
  display: flex;
  flex-direction: column;
  background: #fff;
  
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 32rpx;
    border-bottom: 1rpx solid #F2F3F5;
    
    .detail-title {
      flex: 1;
      font-size: 34rpx;
      font-weight: 700;
      color: #1D2129;
    }
  }
  
  .detail-content {
      flex: 1;
      padding: 32rpx;
      overflow-y: auto;
      
      .detail-body {
          font-size: 30rpx;
          color: #4E5969;
          line-height: 1.8;
      }
  }
  
  .detail-footer {
      padding: 24rpx 32rpx;
      padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
      padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
      border-top: 1rpx solid #F2F3F5;
      display: flex;
      gap: 24rpx;
  }
}
</style>

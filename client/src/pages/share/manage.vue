<template>
  <view class="share-manage-page">
    <u-navbar title="分享管理" autoBack placeholder :titleStyle="{ fontWeight: '700' }">
      <template #right>
        <view class="nav-action" @click="fetchShares">
          <u-icon name="reload" size="20" color="#3E7BFF"></u-icon>
        </view>
      </template>
    </u-navbar>

    <view class="summary-band">
      <view class="summary-item">
        <text class="summary-value">{{ activeCount }}</text>
        <text class="summary-label">生效中</text>
      </view>
      <view class="summary-item">
        <text class="summary-value">{{ revokedCount }}</text>
        <text class="summary-label">已撤销</text>
      </view>
      <view class="summary-item">
        <text class="summary-value">{{ totalAccess }}</text>
        <text class="summary-label">累计访问</text>
      </view>
    </view>

    <view class="filter-row">
      <view class="filter-chip" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</view>
      <view class="filter-chip" :class="{ active: statusFilter === 'active' }" @click="statusFilter = 'active'">生效中</view>
      <view class="filter-chip" :class="{ active: statusFilter === 'revoked' }" @click="statusFilter = 'revoked'">已撤销</view>
      <view class="filter-chip" :class="{ active: statusFilter === 'expired' }" @click="statusFilter = 'expired'">已过期</view>
    </view>

    <view class="share-list" v-if="filteredShares.length">
      <view class="share-card" v-for="item in filteredShares" :key="item.id">
        <view class="card-top">
          <view>
            <view class="record-title">
              <text>{{ item.HealthRecord ? item.HealthRecord.recordDate : '健康记录 #' + item.resourceId }}</text>
              <text v-if="item.HealthRecord && item.HealthRecord.FamilyMember" class="member-sub"> ({{ item.HealthRecord.FamilyMember.name }})</text>
            </view>
            <text class="created-at">{{ formatDateTime(item.createdAt) }}</text>
          </view>
          <view class="status-pill" :class="getStatus(item).className">{{ getStatus(item).text }}</view>
        </view>

        <view class="meta-grid">
          <view class="meta-item">
            <text class="meta-label">访问次数</text>
            <text class="meta-value">{{ item.accessCount || 0 }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">有效期</text>
            <text class="meta-value">{{ formatDate(item.expiresAt) }}</text>
          </view>
          <view class="meta-item">
            <text class="meta-label">最近访问</text>
            <text class="meta-value">{{ item.lastAccessAt ? formatDateTime(item.lastAccessAt) : '暂无' }}</text>
          </view>
        </view>

        <view class="actions">
          <view class="action-btn ghost" @click="openRecord(item)">查看记录</view>
          <view class="action-btn danger" v-if="canRevoke(item)" @click="confirmRevoke(item)">撤销分享</view>
        </view>
      </view>
    </view>

    <view class="empty-box" v-else>
      <u-empty mode="list" :text="loading ? '正在加载...' : '暂无分享链接'"></u-empty>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const shares = ref([]);
const loading = ref(false);
const statusFilter = ref('all');

const now = () => Date.now();

const getStatus = (item) => {
  if (item.revokedAt) return { text: '已撤销', className: 'revoked' };
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= now()) {
    return { text: '已过期', className: 'expired' };
  }
  return { text: '生效中', className: 'active' };
};

const filteredShares = computed(() => {
  if (statusFilter.value === 'all') return shares.value;
  return shares.value.filter(item => getStatus(item).className === statusFilter.value);
});

const activeCount = computed(() => shares.value.filter(item => getStatus(item).className === 'active').length);
const revokedCount = computed(() => shares.value.filter(item => getStatus(item).className === 'revoked').length);
const totalAccess = computed(() => shares.value.reduce((sum, item) => sum + (Number(item.accessCount) || 0), 0));

const fetchShares = async () => {
  if (!userStore.isLogin) {
    uni.reLaunch({ url: '/pages/login' });
    return;
  }

  loading.value = true;
  try {
    const res = await http.get('/api/share/record/list');
    shares.value = Array.isArray(res) ? res : [];
  } catch (e) {
    shares.value = [];
  } finally {
    loading.value = false;
  }
};

const canRevoke = (item) => getStatus(item).className === 'active';

const confirmRevoke = (item) => {
  uni.showModal({
    title: '撤销分享',
    content: '撤销后，这条分享链接将无法继续访问。',
    confirmText: '撤销',
    confirmColor: '#F53F3F',
    success: async (res) => {
      if (!res.confirm) return;
      await revokeShare(item);
    }
  });
};

const revokeShare = async (item) => {
  try {
    await http.post('/api/share/record/revoke', { id: item.id });
    uni.$u.toast('已撤销');
    await fetchShares();
  } catch (e) {
    uni.$u.toast('撤销失败');
  }
};

const openRecord = (item) => {
  uni.navigateTo({ url: `/pages/record/detail?id=${item.resourceId}` });
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${formatDate(value)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const pad = (value) => String(value).padStart(2, '0');

onShow(fetchShares);
</script>

<style lang="scss" scoped>
.share-manage-page {
  min-height: 100vh;
  background: #F6F8FC;
  padding-bottom: calc(env(safe-area-inset-bottom) + 40rpx);
}

.nav-action {
  padding-right: 32rpx;
  display: flex;
  align-items: center;
}

.summary-band {
  margin: 28rpx 32rpx 20rpx;
  padding: 28rpx 16rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  box-shadow: 0 8rpx 22rpx rgba(35, 70, 130, 0.06);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
}

.summary-value {
  font-size: 36rpx;
  font-weight: 900;
  color: #1D2129;
}

.summary-label {
  font-size: 22rpx;
  color: #86909C;
}

.filter-row {
  padding: 0 32rpx 20rpx;
  display: flex;
  gap: 14rpx;
  overflow-x: auto;
}

.filter-chip {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #FFFFFF;
  color: #4E5969;
  font-size: 24rpx;
  white-space: nowrap;
  border: 1rpx solid #E5E8EF;

  &.active {
    color: #3E7BFF;
    background: #EEF4FF;
    border-color: #CFE0FF;
    font-weight: 700;
  }
}

.share-list {
  padding: 0 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.share-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 26rpx;
  box-shadow: 0 8rpx 22rpx rgba(35, 70, 130, 0.05);
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 22rpx;
}

.record-title {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 30rpx;
  color: #1D2129;
  font-weight: 800;
  margin-bottom: 8rpx;

  .member-sub {
    font-size: 24rpx;
    color: #3E7BFF;
    font-weight: normal;
  }
}

.created-at {
  display: block;
  font-size: 22rpx;
  color: #86909C;
}

.status-pill {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  white-space: nowrap;

  &.active {
    color: #00A870;
    background: #E8FFF5;
  }

  &.revoked {
    color: #F53F3F;
    background: #FFF1F0;
  }

  &.expired {
    color: #86909C;
    background: #F2F3F5;
  }
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  margin-bottom: 22rpx;
}

.meta-item {
  min-width: 0;
  background: #F8FAFF;
  border-radius: 14rpx;
  padding: 16rpx 12rpx;
}

.meta-label {
  display: block;
  color: #86909C;
  font-size: 20rpx;
  margin-bottom: 8rpx;
}

.meta-value {
  display: block;
  color: #1D2129;
  font-size: 22rpx;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 14rpx;
}

.action-btn {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 700;

  &.ghost {
    background: #EEF4FF;
    color: #3E7BFF;
  }

  &.danger {
    background: #FFF1F0;
    color: #F53F3F;
  }
}

.empty-box {
  padding: 120rpx 32rpx;
}
</style>

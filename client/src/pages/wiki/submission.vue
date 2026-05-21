<template>
  <view class="container">
    <u-navbar title="投稿文章" leftIcon="arrow-left" @leftClick="goBack" placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="form-content">
      <!-- 标题 -->
      <view class="form-item">
        <view class="label">文章标题</view>
        <u-input v-model="form.title" placeholder="请输入文章标题" border="none" clearable></u-input>
      </view>
      
      <!-- 分类 -->
      <view class="form-item" @click="showCategory = true">
        <view class="label">文章分类</view>
        <view class="picker-value">
          <text v-if="form.category">{{ form.category }}</text>
          <text v-else class="placeholder">请选择分类</text>
          <u-icon name="arrow-right" color="#C0C4CC" size="16"></u-icon>
        </view>
      </view>
      
      <!-- 封面 -->
      <view class="form-item column">
        <view class="label">封面图片 (可选)</view>
        <u-upload
          :fileList="fileList"
          @afterRead="afterRead"
          @delete="deletePic"
          name="1"
          multiple
          :maxCount="1"
          width="160"
          height="160"
        ></u-upload>
      </view>
      
      <!-- 内容编辑 -->
      <view class="editor-container">
        <view class="label">文章内容</view>
        <view class="toolbar" @tap="format">
           <view :class="['iconfont', 'icon-bold', formats.bold ? 'ql-active' : '']" data-name="bold"></view>
           <view :class="['iconfont', 'icon-italic', formats.italic ? 'ql-active' : '']" data-name="italic"></view>
           <view :class="['iconfont', 'icon-underline', formats.underline ? 'ql-active' : '']" data-name="underline"></view>
           <view :class="['iconfont', 'icon-list-ordered', formats.list === 'ordered' ? 'ql-active' : '']" data-name="list" data-value="ordered"></view>
           <view :class="['iconfont', 'icon-list-bullet', formats.list === 'bullet' ? 'ql-active' : '']" data-name="list" data-value="bullet"></view>
           <view class="iconfont icon-h2" :class="formats.header === 2 ? 'ql-active' : ''" data-name="header" :data-value="2"></view>
           <view class="iconfont icon-h3" :class="formats.header === 3 ? 'ql-active' : ''" data-name="header" :data-value="3"></view>
           <view class="iconfont icon-image" @tap="insertImage"></view>
        </view>
        <editor 
          id="editor" 
          class="ql-editor" 
          placeholder="请输入文章正文..." 
          showImgSize 
          showImgToolbar 
          showImgResize
          @statuschange="onStatusChange"
          @ready="onEditorReady"
          @input="onEditorInput"
        ></editor>
      </view>
    </view>
    
    <!-- 提交按钮 -->
    <view class="footer-btn">
      <u-button type="primary" shape="circle" text="提交审核" @click="submit" :loading="submitting"></u-button>
    </view>
    
    <!-- 分类选择器 -->
    <u-picker :show="showCategory" :columns="[categories]" @confirm="confirmCategory" @cancel="showCategory = false"></u-picker>
    
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue';
import http from '@/utils/request.js';
import { buildReportImageUrl } from '@/utils/reportImage.js';
import { useUserStore } from '@/store/index.js';

const userStore = useUserStore();

const form = reactive({
  title: '',
  category: '',
  cover: '',
  content: ''
});

const fileList = ref([]);
const showCategory = ref(false);
const submitting = ref(false);
const categories = ['疾病知识', '用药指南', '饮食调理', '生活方式', '检查解读', '经验分享'];
const formats = ref({});
let editorCtx = null;

const goBack = () => {
  uni.navigateBack();
};

const confirmCategory = (e) => {
  form.category = e.value[0];
  showCategory.value = false;
};


// 图片上传相关逻辑...
// 实际上这里应该调用后端上传接口，为了简化，这里假设上传后直接返回图片url，或者我们暂时模拟
// 在真实环境中，需要实现 uploadFile
const afterRead = async (event) => {
  // 当设置 mutiple 为 true 时, file 为数组格式，否则为对象格式
  let lists = [].concat(event.file)
  let fileListLen = fileList.value.length
  lists.map((item) => {
    fileList.value.push({
      ...item,
      status: 'uploading',
      message: '上传中'
    })
  })
  
  for (let i = 0; i < lists.length; i++) {
    const result = await uploadFilePromise(lists[i].url)
    let item = fileList.value[fileListLen]
    fileList.value.splice(fileListLen, 1, Object.assign(item, {
      status: 'success',
      message: '',
      url: result
    }))
    fileListLen++
    form.cover = result; // 保存封面URL
  }
}

const uploadFilePromise = (url) => {
  return new Promise((resolve, reject) => {
    // 读取本地文件为 base64
    uni.getFileSystemManager().readFile({
        filePath: url,
        encoding: 'base64',
        success: async (res) => {
            const base64 = 'data:image/jpeg;base64,' + res.data;
            try {
                // 调用后端接口
                const result = await http.post('/api/upload/report', { 
                    image: base64,
                    type: 'lab'
                });
                // 后端返回的是 { path: '/storage/reports/xxx.jpg', filename: '...' }
                // 需要拼接完整的 URL 供前端展示
                // 注意：后端返回的 path 是以 /storage 开头的相对路径
                // 如果是本地开发，需要加上 protocol 和 host
                // 这里的 http.config.baseURL 包含了 host
                // 但要注意后端返回的 path 是否包含开头的 /
                
                // 假设后端返回 path: "/storage/reports/..."
                let fullUrl = buildReportImageUrl(result.path, { authToken: userStore.token });
                resolve(fullUrl);
            } catch (err) {
                uni.showToast({ title: '上传失败', icon: 'none' });
                reject(err);
            }
        },
        fail: (err) => {
            uni.showToast({ title: '读取文件失败', icon: 'none' });
            reject(err);
        }
    });
  })
}


const deletePic = (event) => {
  fileList.value.splice(event.index, 1);
  form.cover = '';
};

// 编辑器初始化
const onEditorReady = () => {
  uni.createSelectorQuery().select('#editor').context((res) => {
    editorCtx = res.context;
    // 如果是编辑模式，这里可以设置内容
  }).exec();
};

const onStatusChange = (e) => {
  formats.value = e.detail;
};

const onEditorInput = (e) => {
    form.content = e.detail.html;
}

const format = (e) => {
  let { name, value } = e.target.dataset;
  if (!name) return;
  editorCtx.format(name, value);
};

const insertImage = () => {
    uni.chooseImage({
        count: 1,
        success: (res) => {
            uploadFilePromise(res.tempFilePaths[0]).then(url => {
                editorCtx.insertImage({
                    src: url,
                    alt: '图像',
                    width: '100%'
                })
            })
        }
    })
}

const submit = async () => {
    // 再次从 editor 获取最新内容，双保险
    editorCtx.getContents({
        success: async (res) => {
             form.content = res.html;
             
             if(!form.title) return uni.showToast({title: '请填写标题', icon:'none'});
             if(!form.category) return uni.showToast({title: '请选择分类', icon:'none'});
             // 处理富文本，如果为空，通常只有 <p><br></p>
             if(!form.content || form.content === '<p><br></p>') return uni.showToast({title: '请填写内容', icon:'none'});
             
             submitting.value = true;
             try {
                 if (articleId.value) {
                     // 编辑模式
                     await http.post('/api/wiki/edit', { ...form, id: articleId.value });
                     uni.showToast({title: '修改已提交审核', icon: 'success'});
                 } else {
                     // 正常投稿
                     await http.post('/api/wiki/submit', form);
                     uni.showToast({title: '投稿成功', icon: 'success'});
                 }
                 setTimeout(() => {
                     uni.navigateBack();
                 }, 1500);
             } catch(e) {
                 submitting.value = false;
             }
        }
    })
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: #F6F8FC;
  padding-bottom: 120rpx;
}

.form-content {
  padding: 24rpx;
}

.form-item {
  background: #fff;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  
  &.column {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
  }
  
  .label {
    font-size: 28rpx;
    font-weight: 600;
    color: #1D2129;
    margin-bottom: 16rpx;
  }
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 28rpx;
  color: #1D2129;
  
  .placeholder {
    color: #C0C4CC;
  }
}

.editor-container {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  min-height: 600rpx;
  display: flex;
  flex-direction: column;
  
  .label {
      font-size: 28rpx;
      font-weight: 600;
      color: #1D2129;
      margin-bottom: 16rpx;
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #ECECEC;
  margin-bottom: 16rpx;
  
  .iconfont {
    font-size: 36rpx;
    color: #666;
    padding: 8rpx;
    
    &.ql-active {
      color: #3E7BFF;
      background: #EEF4FF;
      border-radius: 8rpx;
    }
  }
}

.ql-editor {
  flex: 1;
  height: auto;
  min-height: 400rpx;
  font-size: 30rpx;
  line-height: 1.6;
}

.footer-btn {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);
  z-index: 100;
}

/* 简单的字体图标模拟，实际项目中应引入 iconfont */
.iconfont {
    font-family: Arial, sans-serif; 
    font-style: normal;
    display: inline-block;
    cursor: pointer;
}
.icon-bold::before { content: "B"; font-weight: bold; }
.icon-italic::before { content: "I"; font-style: italic; font-family: serif;}
.icon-underline::before { content: "U"; text-decoration: underline; }
.icon-list-ordered::before { content: "1."; }
.icon-list-bullet::before { content: "•"; }
.icon-h2::before { content: "H2"; font-weight: bold; font-size: 28rpx;}
.icon-h3::before { content: "H3"; font-weight: bold; font-size: 24rpx;}
.icon-image::before { content: "🖼️"; }

</style>

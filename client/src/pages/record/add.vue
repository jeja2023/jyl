<template>
  <view class="record-wrapper">
    <u-navbar title="指标录入" autoBack placeholder :titleStyle="{fontWeight: '700'}"></u-navbar>
    
    <view class="progress-bar" :style="{width: progress + '%'}"></view>

    <view class="form-body">
      <u--form labelPosition="top" :model="form" ref="formRef" labelWidth="auto">
        
        <!-- 基础信息卡片 -->
        <view class="form-card">
          <view class="card-title">基础档案</view>
          <view class="input-cell" @click="showCalendar = true">
            <view class="cell-label">报告日期</view>
            <view class="cell-val">
               <text>{{ form.recordDate }}</text>
               <u-icon name="calendar" color="#86909C"></u-icon>
            </view>
          </view>
          
          <view class="section-title">报告原单 (支持多张)</view>
          <view class="image-uploader-grid">
            <view class="image-item" v-for="(img, index) in reportImages" :key="index">
              <image :src="getImageUrl(img)" mode="aspectFill" @click="previewImage(reportImages, index)"></image>
              <view class="remove-btn" @click="removeImage('report', index)">
                <u-icon name="close" color="#fff" size="12"></u-icon>
              </view>
            </view>
            <view class="upload-btn" @click="chooseImage('lab')" v-if="reportImages.length < 9">
              <u-icon name="plus" size="24" color="#3E7BFF"></u-icon>
              <text>化验单</text>
            </view>
          </view>
          <view class="ocr-tip" v-if="ocrLoading">
            <u-loading-icon size="14"></u-loading-icon>
            <text>正在深度提取指标数据...</text>
          </view>
        </view>

        <!-- 核心甲功指标 -->
        <view class="form-card">
          <view class="card-title header-with-tag">
             <text>核心指标 (常规五项/七项)</text>
             <view class="essential-tag">必填</view>
          </view>
          <view class="grid-inputs">
            <view class="grid-cell" v-for="item in coreFields" :key="item.key">
              <text class="tiny-label">{{ item.label }}</text>
              <u--input v-model="form[item.key]" type="digit" :placeholder="item.placeholder" border="bottom" class="tiny-input"></u--input>
            </view>
          </view>
        </view>

        <!-- 术后/特殊监测折叠项 -->
        <view class="premium-collapse" :class="{expanded: showMore}">
           <view class="collapse-header" @click="showMore = !showMore">
              <u-icon name="plus-circle" size="20" color="#3E7BFF"></u-icon>
              <text>详细指标 (降钙素/Tg/TRAb等)</text>
              <u-icon :name="showMore ? 'arrow-up' : 'arrow-down'" size="16" color="#C9CDD4" class="arrow"></u-icon>
           </view>
           <view class="collapse-body" v-if="showMore">
              <view class="input-cell horizontal" v-for="item in moreFields" :key="item.key">
                 <text class="cell-label">{{ item.label }}</text>
                 <u--input v-model="form[item.key]" type="digit" :placeholder="item.unit" text-align="right" border="none"></u--input>
              </view>
           </view>
        </view>

        <!-- 电解质折叠项 -->
        <view class="premium-collapse" :class="{expanded: showCalcium}">
           <view class="collapse-header" @click="showCalcium = !showCalcium">
              <u-icon name="heart" size="20" color="#F05050"></u-icon>
              <text>旁腺与钙镁 (术后手麻关注)</text>
              <u-icon :name="showCalcium ? 'arrow-up' : 'arrow-down'" size="16" color="#C9CDD4" class="arrow"></u-icon>
           </view>
           <view class="collapse-body" v-if="showCalcium">
              <view class="grid-inputs">
                <view class="grid-cell" v-for="item in calciumFields" :key="item.key">
                  <text class="tiny-label">{{ item.label }}</text>
                  <u--input v-model="form[item.key]" type="digit" :placeholder="item.unit" border="bottom" class="tiny-input"></u--input>
                </view>
              </view>
           </view>
        </view>

        <!-- B超报告折叠项 -->
        <view class="premium-collapse" :class="{expanded: showUltrasound}">
           <view class="collapse-header" @click="showUltrasound = !showUltrasound">
              <u-icon name="photo" size="20" color="#722ED1"></u-icon>
              <text>B超报告 (结节监测)</text>
              <u-icon :name="showUltrasound ? 'arrow-up' : 'arrow-down'" size="16" color="#C9CDD4" class="arrow"></u-icon>
           </view>
           <view class="collapse-body" v-if="showUltrasound">
              <view class="section-title">B超图片 (支持多张)</view>
              <view class="image-uploader-grid">
                <view class="image-item" v-for="(img, index) in ultrasoundImages" :key="index">
                  <image :src="getImageUrl(img)" mode="aspectFill" @click="previewImage(ultrasoundImages, index)"></image>
                  <view class="remove-btn" @click="removeImage('ultrasound', index)">
                    <u-icon name="close" color="#fff" size="12"></u-icon>
                  </view>
                </view>
                <view class="upload-btn purple" @click="chooseImage('ultrasound')" v-if="ultrasoundImages.length < 9">
                  <u-icon name="plus" size="24" color="#722ED1"></u-icon>
                  <text>B超单</text>
                </view>
              </view>
              
              <view class="ocr-tip" v-if="ultrasoundLoading">
                <u-loading-icon size="14" color="#722ED1"></u-loading-icon>
                <text class="purple-text">正在深度解析B超报告内容...</text>
              </view>

              <!-- 甲状腺大小 -->
              <view class="section-title">甲状腺大小</view>
              <view class="grid-inputs">
                <view class="grid-cell">
                  <text class="tiny-label">左叶</text>
                  <u--input v-model="form.thyroidLeft" placeholder="45×15×13" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">右叶</text>
                  <u--input v-model="form.thyroidRight" placeholder="46×16×14" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">峡部厚度</text>
                  <u--input v-model="form.isthmus" type="digit" placeholder="mm" border="bottom" class="tiny-input"></u--input>
                </view>
              </view>
              
              <!-- 结节信息 -->
              <view class="section-title">结节信息</view>
              <view class="grid-inputs">
                <view class="grid-cell">
                  <text class="tiny-label">结节数量</text>
                  <u--input v-model="form.noduleCount" type="number" placeholder="个数" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">最大尺寸</text>
                  <u--input v-model="form.noduleMaxSize" placeholder="8×6mm" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">结节位置</text>
                  <u--input v-model="form.noduleLocation" placeholder="左叶中部" border="bottom" class="tiny-input"></u--input>
                </view>
                <view class="grid-cell">
                  <text class="tiny-label">TI-RADS分级</text>
                  <u--input v-model="form.tiradsLevel" placeholder="1-5级" border="bottom" class="tiny-input"></u--input>
                </view>
              </view>
              
              <view class="input-cell horizontal">
                 <text class="cell-label">结节特征</text>
                 <u--input v-model="form.noduleFeatures" placeholder="低回声、边界清" text-align="right" border="none"></u--input>
              </view>
              <view class="input-cell horizontal">
                 <text class="cell-label">淋巴结</text>
                 <u--input v-model="form.lymphNode" placeholder="未见异常" text-align="right" border="none"></u--input>
              </view>

              <view class="section-title">报告详情原文</view>
              <view class="raw-note-box">
                <u--textarea v-model="form.ultrasoundNote" placeholder="此处将显示OCR识别出的完整报告内容..." border="none" autoHeight count maxlength="-1"></u--textarea>
              </view>

              <!-- 新增：B超日期选择 -->
              <view class="input-cell" @click="showUltrasoundCalendar = true" style="margin-top:20rpx; border-top:1px dashed #eee;">
                 <view class="cell-label">检查日期 (如不同于化验)</view>
                 <view class="cell-val">
                    <text>{{ form.ultrasoundDate || '同化验日期' }}</text>
                    <u-icon name="calendar" color="#86909C"></u-icon>
                 </view>
              </view>
           </view>
        </view>

        <!-- 备注信息 -->
        <view class="form-card">
           <view class="card-title">补充说明</view>
           <u--textarea v-model="form.feeling" placeholder="记录您的体感或心情..." border="none" count confirmType="done"></u--textarea>
        </view>

        <view class="footer-area">
           <u-button type="primary" text="保存健康档案" shape="circle" class="submit-btn" :loading="loading" @click="submit"></u-button>
        </view>

      </u--form>
    </view>

    <u-calendar :show="showCalendar" @confirm="confirmDate" @close="showCalendar = false" color="#3E7BFF"></u-calendar>
    <u-calendar :show="showUltrasoundCalendar" @confirm="confirmUltrasoundDate" @close="showUltrasoundCalendar = false" color="#722ED1"></u-calendar>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';

const userStore = useUserStore();
const loading = ref(false);
const showCalendar = ref(false);
const showUltrasoundCalendar = ref(false);
const showMore = ref(false);
const showCalcium = ref(false);
const showUltrasound = ref(false);

const ocrLoading = ref(false);
const ultrasoundLoading = ref(false);

const reportImages = ref([]);
const ultrasoundImages = ref([]);

const coreFields = [
  { key: 'TSH', label: '促甲状腺 (TSH)', placeholder: 'mIU/L' },
  { key: 'FT4', label: '游离T4 (FT4)', placeholder: 'pmol/l' },
  { key: 'FT3', label: '游离T3 (FT3)', placeholder: 'pmol/l' },
  { key: 'TPOAb', label: '过氧化物酶抗体', placeholder: 'IU/ml' },
  { key: 'TGAb', label: '球蛋白抗体 (TGAb)', placeholder: 'IU/mL' },
  { key: 'T3', label: '总T3 (T3)', placeholder: 'nmol/L' },
  { key: 'T4', label: '总T4 (T4)', placeholder: 'nmol/L' }
];

const moreFields = [
  { key: 'Calcitonin', label: '降钙素 (CT)', unit: 'pg/mL' },
  { key: 'Tg', label: '甲状腺球蛋白 (Tg)', unit: 'ng/mL' },
  { key: 'TRAb', label: '受体抗体 (TRAb)', unit: 'IU/L' }
];

const calciumFields = [
  { key: 'Calcium', label: '血钙 (Ca)', unit: 'mmol/L' },
  { key: 'Magnesium', label: '血镁 (Mg)', unit: 'mmol/L' },
  { key: 'Phosphorus', label: '血磷 (P)', unit: 'mmol/L' },
  { key: 'PTH', label: '旁腺素 (PTH)', unit: 'pg/ml' }
];

const form = reactive({
  recordDate: uni.$u.timeFormat(new Date(), 'yyyy-mm-dd'),
  ultrasoundDate: '', // 默认为空，提交时如为空则取 recordDate
  TSH: '', FT3: '', FT4: '', TPOAb: '', TGAb: '', TRAb: '', Tg: '', 
  Calcitonin: '', Calcium: '', Magnesium: '', Phosphorus: '', PTH: '',
  T3: '', T4: '', weight: '', heartRate: '', feeling: '',
  thyroidLeft: '', thyroidRight: '', isthmus: '',
  noduleCount: '', noduleMaxSize: '', noduleLocation: '',
  tiradsLevel: '', noduleFeatures: '', lymphNode: '', ultrasoundNote: ''
});

const progress = computed(() => {
    const fields = ['TSH', 'FT3', 'FT4'];
    let filled = 1;
    fields.forEach(f => { if(form[f]) filled++; });
    return (filled / (fields.length + 1)) * 100;
});

const confirmDate = (e) => {
  form.recordDate = e[0];
  showCalendar.value = false;
};

const confirmUltrasoundDate = (e) => {
  form.ultrasoundDate = e[0];
  showUltrasoundCalendar.value = false;
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  // 由于采用了直接的静态服务中间件，不使用 /api 前缀
  return `http://localhost:3000${path}`;
};

const previewImage = (images, index) => {
  const urls = images.map(img => getImageUrl(img));
  uni.previewImage({ current: urls[index], urls });
};

const removeImage = (type, index) => {
  if (type === 'report') reportImages.value.splice(index, 1);
  else ultrasoundImages.value.splice(index, 1);
};

const chooseImage = (type) => {
  const isUltrasound = type === 'ultrasound';
  uni.chooseImage({
    count: 9 - (isUltrasound ? ultrasoundImages.value.length : reportImages.value.length),
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      for (const path of res.tempFilePaths) {
        await processImageData(path, type);
      }
    }
  });
};

const processImageData = async (filePath, type) => {
  const isUltrasound = type === 'ultrasound';
  if (isUltrasound) ultrasoundLoading.value = true;
  else ocrLoading.value = true;

  try {
    const base64 = await fileToBase64(filePath);
    
    // OCR识别 + 上传图片
    const [ocrResult, uploadResult] = await Promise.all([
      http.post('/api/ocr/recognize', { image: base64, type }),
      http.post('/api/upload/report', { image: base64, type })
    ]);

    // 1. 保存图片路径
    if (uploadResult && uploadResult.path) {
      if (isUltrasound) ultrasoundImages.value.push(uploadResult.path);
      else reportImages.value.push(uploadResult.path);
    }

    // 2. 提取并合并指标（不覆盖已有数据）
    if (ocrResult && ocrResult.indicators) {
      const indicators = ocrResult.indicators;
      let newCount = 0;
      
        for (const [key, value] of Object.entries(indicators)) {
          // 特殊逻辑：日期处理
          if (key === 'recordDate') {
            const defaultDate = uni.$u.timeFormat(new Date(), 'yyyy-mm-dd');
            const currentDate = form.recordDate;
            
            // 1. 如果当前还是默认的今天，直接覆盖为识别到的日期
            if (currentDate === defaultDate) {
               form.recordDate = value;
            } 
            // 2. 如果日期不同，但不是默认值，说明是多张不同日期的报告
            else if (currentDate !== value) {
               // 简单的日期差异计算
               const d1 = new Date(currentDate).getTime();
               const d2 = new Date(value).getTime();
               const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);
               
               if (diffDays > 7) {
                  uni.$u.toast(`注意：新报告日期(${value})与当前相差较大，建议分条录入`);
               } else {
                  // 同一轮检查，自动添加备注
                  const note = `[含 ${value.substring(5)} 报告]`;
                  if (!form.feeling.includes(note)) {
                      form.feeling = form.feeling ? `${form.feeling} ${note}` : note;
                      uni.$u.toast(`已自动在备注中标记日期：${value}`);
                  }
               }
            }
            continue;
          }
          
          // 通用逻辑：已有数据不覆盖 (Prevent overwriting existing data)
          if (form.hasOwnProperty(key) && value && !form[key]) {
            form[key] = value;
            newCount++;
          }
        }
      
      // 自动展开
      if (indicators.Calcitonin || indicators.Tg || indicators.TRAb || indicators.T3) showMore.value = true;
      if (indicators.Calcium || indicators.PTH) showCalcium.value = true;
      if (isUltrasound) showUltrasound.value = true;

      if (newCount > 0) {
        uni.$u.toast(`智能补全了 ${newCount} 项缺失数据`);
      }
    }
  } catch (err) {
    console.error('OCR提取失败:', err);
  } finally {
    if (isUltrasound) ultrasoundLoading.value = false;
    else ocrLoading.value = false;
  }
};

const fileToBase64 = (filePath) => {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    const xhr = new XMLHttpRequest();
    xhr.open('GET', filePath, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(xhr.response);
    };
    xhr.onerror = reject;
    xhr.send();
    // #endif
    // #ifdef MP-WEIXIN || APP-PLUS
    const fs = uni.getFileSystemManager();
    fs.readFile({
      filePath, encoding: 'base64',
      success: (res) => resolve('data:image/jpeg;base64,' + res.data),
      fail: reject
    });
    // #endif
  });
};

const submit = async () => {
  const hasLabData = form.TSH || form.FT3 || form.FT4;
  const hasUltrasoundData = form.thyroidLeft || form.noduleCount;
  
  if (!hasLabData && !hasUltrasoundData && reportImages.value.length === 0) {
      return uni.$u.toast('请上传报告图片或填写指标');
  }
  
  loading.value = true;
  try {
    const submitData = {
      ...form,
      reportImage: JSON.stringify(reportImages.value),
      ultrasoundImage: JSON.stringify(ultrasoundImages.value)
    };
    await http.post('/api/record/add', submitData);
    uni.$u.toast('健康档案已更新');
    setTimeout(() => { uni.navigateBack(); }, 1500);
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>

<style>
page { overflow: auto !important; height: auto !important; }
</style>

<style lang="scss" scoped>
.record-wrapper {
  background-color: #F8FAFF;
  min-height: 100vh;
  padding-bottom: 80rpx;
}

.progress-bar {
  height: 8rpx;
  background: linear-gradient(90deg, #3E7BFF 0%, #4AE68A 100%);
  transition: width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1);
  box-shadow: 0 2rpx 10rpx rgba(62, 123, 255, 0.2);
}

.form-body {
  padding: 32rpx;
}

.form-card {
  background: #FFFFFF;
  border-radius: 40rpx;
  padding: 36rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(62, 123, 255, 0.05);
}

.card-title {
  font-size: 34rpx;
  font-weight: 900;
  color: #1D2129;
  margin-bottom: 32rpx;
  position: relative;
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
  
  &.header-with-tag {
    justify-content: space-between;
  }
}

.essential-tag {
  font-size: 20rpx;
  background: #FFF2F0;
  color: #F53F3F;
  padding: 4rpx 16rpx;
  border-radius: 40rpx;
  font-weight: 700;
}

.image-uploader-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
  margin-top: 16rpx;
  
  .image-item {
    width: 150rpx;
    height: 150rpx;
    position: relative;
    
    image {
      width: 100%;
      height: 100%;
      border-radius: 20rpx;
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
    }
    
    .remove-btn {
      position: absolute;
      top: -12rpx;
      right: -12rpx;
      width: 40rpx;
      height: 40rpx;
      background: #F53F3F;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 4rpx solid #FFFFFF;
    }
  }
  
  .upload-btn {
    width: 150rpx;
    height: 150rpx;
    background: #F2F7FF;
    border: 2rpx dashed #3E7BFF;
    border-radius: 20rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    
    &:active {
      transform: scale(0.95);
      background: #E8F1FF;
    }
    
    text {
      font-size: 20rpx;
      color: #3E7BFF;
      margin-top: 12rpx;
      font-weight: 700;
    }
    
    &.purple {
      background: #F9F0FF;
      border-color: #722ED1;
      text { color: #722ED1; }
    }
  }
}

.ocr-tip {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  background: #F2F7FF;
  padding: 12rpx 24rpx;
  border-radius: 12rpx;
  
  text {
    font-size: 22rpx;
    color: #3E7BFF;
    margin-left: 12rpx;
    font-weight: 700;
  }
  
  .purple-text {
    color: #722ED1;
  }
}

.input-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx 0;
  border-bottom: 2rpx solid #F8FAFF;
  
  .cell-label {
    font-size: 28rpx;
    color: #4E5969;
    font-weight: 600;
  }
  
  .cell-val {
    display: flex;
    align-items: center;
    
    text {
      margin-right: 16rpx;
      font-weight: 800;
      color: #1D2129;
      font-family: 'DIN Condensed', sans-serif;
      font-size: 32rpx;
    }
  }
  
  &.horizontal {
    padding: 36rpx 0;
  }
}

.grid-inputs {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -12rpx;
  
  .grid-cell {
    width: 50%;
    padding: 12rpx;
    box-sizing: border-box;
    
    .tiny-label {
      font-size: 22rpx;
      color: #86909C;
      margin-bottom: 8rpx;
      display: block;
      font-weight: 600;
    }
    
    .tiny-input {
      background: #F8FAFF;
      border-radius: 16rpx;
      padding: 0 24rpx;
      font-weight: 800;
      height: 80rpx;
      font-family: 'DIN Condensed', sans-serif;
      font-size: 34rpx;
    }
  }
}

.premium-collapse {
  background: #FFFFFF;
  border-radius: 40rpx;
  margin-bottom: 32rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(62, 123, 255, 0.05);
  
  .collapse-header {
    padding: 36rpx;
    display: flex;
    align-items: center;
    
    text {
      flex: 1;
      margin-left: 20rpx;
      font-size: 30rpx;
      font-weight: 800;
      color: #4E5969;
    }
    
    .arrow {
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1);
    }
  }
  
  &.expanded {
    .arrow {
      transform: rotate(180deg);
    }
  }
  
  .collapse-body {
    padding: 0 36rpx 36rpx;
    border-top: 2rpx dashed #F2F3F5;
  }
}

.section-title {
  font-size: 24rpx;
  font-weight: 800;
  color: #3E7BFF;
  margin: 40rpx 0 20rpx;
  display: block;
  text-transform: uppercase;
  letter-spacing: 1rpx;
}

.raw-note-box {
  background: #F8FAFF;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 20rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #4E5969;
}

.footer-area {
  margin: 60rpx 0;
}

.submit-btn {
  height: 110rpx !important;
  font-size: 34rpx !important;
  font-weight: 900 !important;
  background: linear-gradient(135deg, #3E7BFF 0%, #2A5DDF 100%) !important;
  border: none !important;
  box-shadow: 0 15rpx 35rpx rgba(62, 123, 255, 0.3) !important;
  border-radius: 55rpx !important;
}
</style>

<template>
  <view class="record-wrapper">
    <u-navbar title="指标录入" autoBack placeholder :titleStyle="{fontWeight: '700'}" @clickLeft="uni.navigateBack()"></u-navbar>
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
          <view class="grid-inputs" style="margin-top:16rpx">
            <view class="grid-cell">
              <text class="tiny-label">体重 (kg)</text>
              <u--input v-model="form.weight" type="digit" placeholder="kg" border="bottom" class="tiny-input"></u--input>
            </view>
            <view class="grid-cell">
              <text class="tiny-label">心率 (次/分)</text>
              <u--input v-model="form.heartRate" type="digit" placeholder="次/分" border="bottom" class="tiny-input"></u--input>
            </view>
          </view>
        </view>

        <!-- Tab 切换 -->
        <view class="tab-switcher">
          <view class="tab-item" :class="{active: activeTab==='lab'}" @click="activeTab='lab'">
            <u-icon name="file-text" size="18" :color="activeTab==='lab' ? '#fff' : '#86909C'"></u-icon>
            <text>甲状腺功能</text>
          </view>
          <view class="tab-item tab-us" :class="{active: activeTab==='ultrasound'}" @click="activeTab='ultrasound'">
            <u-icon name="photo" size="18" :color="activeTab==='ultrasound' ? '#fff' : '#86909C'"></u-icon>
            <text>超声检查</text>
          </view>
        </view>

        <!-- 血检 Tab -->
        <view v-show="activeTab === 'lab'">
          <view class="form-card">
            <view class="section-title" style="margin-top:0">化验单图片 (支持多张)</view>
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

          <view class="form-card">
            <view class="card-title">甲状腺功能</view>
            <view class="grid-inputs">
              <view class="grid-cell" v-for="item in coreFields" :key="item.key">
                <text class="tiny-label">{{ item.label }}</text>
                <view class="input-container">
                  <u--input v-model="form[item.key]" type="digit" :placeholder="item.unit" border="bottom" class="tiny-input"></u--input>
                  <text class="unit-label" :class="{'detected-unit': form.units[item.key]}" v-if="form[item.key]">
                    {{ form.units[item.key] || item.unit }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <view class="premium-collapse" :class="{expanded: showMore}">
            <view class="collapse-header" @click="showMore = !showMore">
              <u-icon name="plus-circle" size="20" color="#3E7BFF"></u-icon>
              <text>肿瘤标志物 (Tg / TRAb / 降钙素)</text>
              <u-icon :name="showMore ? 'arrow-up' : 'arrow-down'" size="16" color="#C9CDD4" class="arrow"></u-icon>
            </view>
            <view class="collapse-body" v-if="showMore">
              <view class="input-cell horizontal" v-for="item in moreFields" :key="item.key">
                <text class="cell-label">{{ item.label }}</text>
                <view class="input-container flex-right">
                  <u--input v-model="form[item.key]" type="digit" :placeholder="item.unit" text-align="right" border="none"></u--input>
                  <text class="unit-label more-unit" :class="{'detected-unit': form.units[item.key]}" v-if="form[item.key]">
                    {{ form.units[item.key] || item.unit }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <view class="premium-collapse" :class="{expanded: showCalcium}">
            <view class="collapse-header" @click="showCalcium = !showCalcium">
              <u-icon name="heart" size="20" color="#F05050"></u-icon>
              <text>甲状旁腺功能 (钙磷代谢)</text>
              <u-icon :name="showCalcium ? 'arrow-up' : 'arrow-down'" size="16" color="#C9CDD4" class="arrow"></u-icon>
            </view>
            <view class="collapse-body" v-if="showCalcium">
              <view class="grid-inputs">
                <view class="grid-cell" v-for="item in calciumFields" :key="item.key">
                  <text class="tiny-label">{{ item.label }}</text>
                  <view class="input-container">
                    <u--input v-model="form[item.key]" type="digit" :placeholder="item.unit" border="bottom" class="tiny-input"></u--input>
                    <text class="unit-label" :class="{'detected-unit': form.units[item.key]}" v-if="form[item.key]">
                      {{ form.units[item.key] || item.unit }}
                    </text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- B超 Tab -->
        <view v-show="activeTab === 'ultrasound'">
          <view class="form-card">
            <view class="section-title" style="margin-top:0">超声图像 (支持多张)</view>
            <view class="image-uploader-grid">
              <view class="image-item" v-for="(img, index) in ultrasoundImages" :key="index">
                <image :src="getImageUrl(img)" mode="aspectFill" @click="previewImage(ultrasoundImages, index)"></image>
                <view class="remove-btn" @click="removeImage('ultrasound', index)">
                  <u-icon name="close" color="#fff" size="12"></u-icon>
                </view>
              </view>
              <view class="upload-btn purple" @click="chooseImage('ultrasound')" v-if="ultrasoundImages.length < 9">
                <u-icon name="plus" size="24" color="#722ED1"></u-icon>
                <text>超声单</text>
              </view>
            </view>
            <view class="ocr-tip us-tip" v-if="ultrasoundLoading">
              <u-loading-icon size="14" color="#722ED1"></u-loading-icon>
              <text>正在解析超声报告...</text>
            </view>

            <view class="section-title">甲状腺径线</view>
            <view class="grid-inputs">
              <view class="grid-cell">
                <text class="tiny-label">左叶</text>
                <u--input v-model="form.thyroidLeft" placeholder="45×15×13mm" border="bottom" class="tiny-input"></u--input>
              </view>
              <view class="grid-cell">
                <text class="tiny-label">右叶</text>
                <u--input v-model="form.thyroidRight" placeholder="46×16×14mm" border="bottom" class="tiny-input"></u--input>
              </view>
              <view class="grid-cell">
                <text class="tiny-label">峡部厚度</text>
                <u--input v-model="form.isthmus" placeholder="mm / 已切除" border="bottom" class="tiny-input"></u--input>
              </view>
            </view>

            <view class="section-title">结节特征</view>
            <view class="grid-inputs">
              <view class="grid-cell">
                <text class="tiny-label">结节数目</text>
                <u--input v-model="form.noduleCount" placeholder="个数/多发" border="bottom" class="tiny-input"></u--input>
              </view>
              <view class="grid-cell">
                <text class="tiny-label">最大径线</text>
                <u--input v-model="form.noduleMaxSize" placeholder="8×6mm" border="bottom" class="tiny-input"></u--input>
              </view>
              <view class="grid-cell">
                <text class="tiny-label">结节部位</text>
                <u--input v-model="form.noduleLocation" placeholder="左叶中部" border="bottom" class="tiny-input"></u--input>
              </view>
              <view class="grid-cell">
                <text class="tiny-label">C-TIRADS分类</text>
                <u--input v-model="form.tiradsLevel" placeholder="1-5类" border="bottom" class="tiny-input"></u--input>
              </view>
            </view>
            <view class="input-cell horizontal">
              <text class="cell-label">声像特征</text>
              <u--input v-model="form.noduleFeatures" placeholder="低回声、边界清" text-align="right" border="none"></u--input>
            </view>
            <view class="input-cell horizontal">
              <text class="cell-label">颈部淋巴结</text>
              <u--input v-model="form.lymphNode" placeholder="未见异常" text-align="right" border="none"></u--input>
            </view>

            <view class="section-title">超声所见</view>
            <view class="raw-note-box">
              <u--textarea v-model="form.ultrasoundNote" placeholder="OCR将自动提取超声所见内容..." border="none" autoHeight maxlength="-1"></u--textarea>
            </view>
            <view class="section-title" style="margin-top:20rpx">超声提示</view>
            <view class="raw-note-box">
              <u--textarea v-model="form.conclusion" placeholder="OCR将自动提取超声提示..." border="none" autoHeight maxlength="-1"></u--textarea>
            </view>

            <view class="input-cell" @click="showUltrasoundCalendar = true" style="margin-top:20rpx; border-top:1px dashed #eee;">
              <view class="cell-label">检查日期 (如不同于化验)</view>
              <view class="cell-val">
                <text>{{ form.ultrasoundDate ? fmtDate(form.ultrasoundDate) : '同化验日期' }}</text>
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { onLoad } from '@dcloudio/uni-app';

const userStore = useUserStore();
const loading = ref(false);
const showCalendar = ref(false);
const showUltrasoundCalendar = ref(false);
const showMore = ref(false);
const showCalcium = ref(false);
const showUltrasound = ref(false);
const activeTab = ref('lab');
const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d.replace(/-/g, '/'));
    return isNaN(dt.getTime()) ? d : `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;
};

const ocrLoading = ref(false);
const ultrasoundLoading = ref(false);
const recordId = ref(null);
const isEdit = computed(() => !!recordId.value);

const reportImages = ref([]);
const ultrasoundImages = ref([]);

const coreFields = [
  { key: 'TSH', label: '促甲状腺激素 (TSH)', unit: 'mIU/L' },
  { key: 'FT4', label: '游离甲状腺素 (FT4)', unit: 'pmol/L' },
  { key: 'FT3', label: '游离三碘甲腺原氨酸 (FT3)', unit: 'pmol/L' },
  { key: 'TPOAb', label: '甲状腺过氧化物酶抗体 (TPOAb)', unit: 'IU/mL' },
  { key: 'TGAb', label: '甲状腺球蛋白抗体 (TGAb)', unit: 'IU/mL' },
  { key: 'T3', label: '三碘甲腺原氨酸 (T3)', unit: 'nmol/L' },
  { key: 'T4', label: '甲状腺素 (T4)', unit: 'nmol/L' }
];

const moreFields = [
  { key: 'Calcitonin', label: '降钙素 (CT)', unit: 'pg/mL' },
  { key: 'Tg', label: '甲状腺球蛋白 (Tg)', unit: 'ng/mL' },
  { key: 'TRAb', label: '促甲状腺素受体抗体 (TRAb)', unit: 'IU/L' }
];

const calciumFields = [
  { key: 'Calcium', label: '血清钙 (Ca)', unit: 'mmol/L' },
  { key: 'Magnesium', label: '血清镁 (Mg)', unit: 'mmol/L' },
  { key: 'Phosphorus', label: '血清磷 (P)', unit: 'mmol/L' },
  { key: 'PTH', label: '甲状旁腺激素 (PTH)', unit: 'pg/mL' }
];

const form = reactive({
  recordDate: uni.$u.timeFormat(new Date(), 'yyyy-mm-dd'),
  ultrasoundDate: '', // 默认为空，提交时如为空则取 recordDate
  TSH: '', FT3: '', FT4: '', TPOAb: '', TGAb: '', TRAb: '', Tg: '', 
  Calcitonin: '', Calcium: '', Magnesium: '', Phosphorus: '', PTH: '',
  T3: '', T4: '', weight: '', heartRate: '', feeling: '',
  thyroidLeft: '', thyroidRight: '', isthmus: '',
  noduleCount: '', noduleMaxSize: '', noduleLocation: '',
  tiradsLevel: '', noduleFeatures: '', lymphNode: '', ultrasoundNote: '', conclusion: '',
  units: {} // 存放各指标对应的真实单位
});

onLoad(async (options) => {
  if (options.id) {
    recordId.value = options.id;
    uni.setNavigationBarTitle({ title: '编辑档案' });
    await fetchRecordDetail(options.id);
  }
});

const fetchRecordDetail = async (id) => {
  try {
    const res = await http.get(`/api/record/${id}`);
    // 回填表单
    Object.keys(form).forEach(key => {
      if (res[key] !== undefined && res[key] !== null) {
        form[key] = res[key];
      }
    });
    // 回填图片
    const ensureArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch(e) { return [val]; }
    };
    
    reportImages.value = ensureArray(res.reportImage);
    ultrasoundImages.value = ensureArray(res.ultrasoundImage);

    // 回填单位信息
    if (res.indicatorUnits) {
        try {
            form.units = JSON.parse(res.indicatorUnits);
        } catch (e) {
            form.units = {};
        }
    }

    // 自动展开有数据的区域
    if (form.Calcitonin || form.Tg || form.TRAb || form.T3) showMore.value = true;
    if (form.Calcium || form.Magnesium || form.PTH) showCalcium.value = true;
    if (form.thyroidLeft || form.noduleCount || form.tiradsLevel || form.ultrasoundNote || ultrasoundImages.value.length) {
      activeTab.value = 'ultrasound';
    }
  } catch (err) {
    uni.$u.toast('回填数据失败');
  }
};

const progress = computed(() => {
    // 基础进度计算：日期、任一图片、任一血检、任一B超
    let filled = 1; // 日期默认有值
    if (reportImages.value.length || ultrasoundImages.value.length) filled++;
    if (form.TSH || form.FT3 || form.FT4) filled++;
    if (form.thyroidLeft || form.noduleCount || form.tiradsLevel || form.ultrasoundNote) filled++;
    return (filled / 4) * 100;
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
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
  return `${base}${path}`;
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
      
      // 中文键名到表单变量名映射
      const toEnglishMap = {
          '报告日期': 'recordDate', '检查日期': 'ultrasoundDate',
          '促甲状腺激素': 'TSH', '游离T3': 'FT3', '游离T4': 'FT4', '总T3': 'T3', '总T4': 'T4',
          'TPO抗体': 'TPOAb', 'TG抗体': 'TGAb', 'TR抗体': 'TRAb', '甲状腺球蛋白': 'Tg',
          '降钙素': 'Calcitonin', '血钙': 'Calcium', '血镁': 'Magnesium', '血磷': 'Phosphorus', '甲状旁腺激素': 'PTH',
          '左叶': 'thyroidLeft', '右叶': 'thyroidRight', '峡部': 'isthmus',
          '结节数目': 'noduleCount', '最大径线': 'noduleMaxSize', '结节位置': 'noduleLocation',
          'TIRADS分级': 'tiradsLevel', '结节特征': 'noduleFeatures', '淋巴结': 'lymphNode',
          '超声所见': 'ultrasoundNote', '超声提示': 'conclusion'
      };

      for (let [cnKey, value] of Object.entries(indicators)) {
          // 特殊逻辑：单位处理
          if (cnKey.endsWith('单位')) {
              const baseKey = cnKey.replace('单位', '');
              const engKey = toEnglishMap[baseKey];
              if (engKey) {
                  form.units[engKey] = value;
                  console.log(`[OCR] 记录了 ${engKey} 的原始单位: ${value}`);
              }
              continue;
          }

          const key = toEnglishMap[cnKey] || cnKey; // 如果有映射则用英文，反之保持原样
          
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
               const d1 = new Date(currentDate).getTime();
               const d2 = new Date(value).getTime();
               const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);
               
               if (diffDays > 7) {
                  uni.$u.toast(`注意：新报告日期(${value})与当前相差较大，建议分条录入`);
               } else {
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
            // 判定是否为纯数字类型的字段（需截取单位或注释）
            const isNumericField = [
                'TSH', 'FT3', 'FT4', 'TPOAb', 'TGAb', 'TRAb', 'Tg', 
                'Calcitonin', 'Calcium', 'Magnesium', 'Phosphorus', 'PTH',
                'T3', 'T4', 'weight', 'heartRate'
            ].includes(key);

            if (isNumericField) {
                // 对 "0 (已切除)" 这种带单位或注释的数值，只取开头的数字部分
                const numericPrefix = String(value).match(/^[0-9.]+/)?.[0];
                form[key] = numericPrefix !== undefined ? numericPrefix : value;
            } else {
                // 日期、尺寸(40x14)、分类(4a)等字段保持原样
                form[key] = value;
            }
            newCount++;
          }
      }
      
      // 自动展开
      if (indicators.Calcitonin || indicators.Tg || indicators.TRAb || indicators.T3) showMore.value = true;
      if (indicators.Calcium || indicators.PTH) showCalcium.value = true;
      if (isUltrasound) activeTab.value = 'ultrasound';

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
    // H5 环境使用 FileReader 读取 Blob，避免 XHR 跨域问题
    fetch(filePath)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
    // #endif
    // #ifdef MP-WEIXIN || APP-PLUS
    const fs = uni.getFileSystemManager();
    fs.readFile({
      filePath, encoding: 'base64',
      success: (res) => resolve('data:image/jpeg;base64,' + res.data),
      fail: (err) => {
        uni.$u.toast('文件读取失败');
        reject(err);
      }
    });
    // #endif
  });
};

const submit = async () => {
  const hasLabData = form.TSH || form.FT3 || form.FT4 || form.TPOAb || form.TGAb || form.Tg || form.TRAb;
  const hasUltrasoundData = form.thyroidLeft || form.noduleCount || form.tiradsLevel || form.ultrasoundNote || ultrasoundImages.value.length > 0;
  const hasImages = reportImages.value.length > 0 || ultrasoundImages.value.length > 0;
  
  if (!hasLabData && !hasUltrasoundData && !hasImages) {
      return uni.$u.toast('请上传报告图片或至少填写一项指标');
  }
  
  loading.value = true;
  try {
    const submitData = {
      ...form,
      reportImage: JSON.stringify(reportImages.value),
      ultrasoundImage: JSON.stringify(ultrasoundImages.value),
      indicatorUnits: JSON.stringify(form.units)
    };
    
    if (isEdit.value) {
      await http.put(`/api/record/${recordId.value}`, submitData);
    } else {
      await http.post('/api/record/add', submitData);
    }
    
    uni.$u.toast(isEdit.value ? '档案已更新' : '健康档案已添加');
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
      padding: 0 80rpx 0 24rpx; // 预留右侧空间给单位
      font-weight: 800;
      height: 80rpx;
      font-family: 'DIN Condensed', sans-serif;
      font-size: 34rpx;
    }
  }
}

.input-container {
  position: relative;
  width: 100%;
  
  &.flex-right {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex: 1;
  }
}

.unit-label {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20rpx;
  color: #86909C;
  font-weight: bold;
  pointer-events: none;
  z-index: 10;
  
  &.detected-unit {
    color: #3E7BFF; // 识别到的单位使用蓝色高亮
  }
  
  &.more-unit {
    position: static;
    transform: none;
    margin-left: 8rpx;
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

.tab-switcher {
  display: flex;
  background: #fff;
  border-radius: 40rpx;
  padding: 8rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.02);
  border: 1px solid rgba(62,123,255,0.05);

  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    padding: 26rpx;
    border-radius: 32rpx;
    font-size: 28rpx;
    font-weight: 700;
    color: #86909C;
    transition: all 0.25s;

    &.active {
      background: #3E7BFF;
      color: #fff;
    }

    &.tab-us.active {
      background: #722ED1;
    }
  }
}

.us-tip text {
  color: #722ED1;
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

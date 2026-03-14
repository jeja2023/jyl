<template>
  <view class="record-wrapper">
    <u-navbar title="指标录入" autoBack placeholder :titleStyle="{fontWeight: '700'}" @clickLeft="uni.navigateBack()"></u-navbar>
    <view class="progress-bar" :style="{width: progress + '%'}"></view>

    <view class="form-body">
      <u--form labelPosition="top" :model="form" ref="formRef" labelWidth="auto">

        <!-- 基础信息卡片 -->
        <view class="form-card">
          <view class="card-title">基础档案</view>
          <view class="input-cell" @click="showMemberSheet = true">
            <view class="cell-label">记录对象</view>
            <view class="cell-val">
              <text>{{ currentMemberName }}</text>
              <u-icon name="arrow-right" color="#86909C"></u-icon>
            </view>
          </view>
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
              <u--input v-model="form.weight" type="text" placeholder="kg" border="bottom" class="tiny-input"></u--input>
            </view>
            <view class="grid-cell">
              <text class="tiny-label">心率 (次/分)</text>
              <u--input v-model="form.heartRate" type="text" placeholder="次/分" border="bottom" class="tiny-input"></u--input>
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
            <view class="ocr-review-banner" v-if="ocrReview.lab">
              <text class="review-text">
                {{ ocrReview.lab.reviewed ? 'OCR 已复核' : 'OCR 结果待复核' }}
              </text>
              <u-button size="mini" type="primary" text="查看/复核" @click="openOcrReview('lab')"></u-button>
            </view>
          </view>

          <view class="form-card">
            <view class="card-title">甲状腺功能</view>
            <view class="grid-inputs">
              <view class="grid-cell" v-for="item in coreFields" :key="item.key">
                <text class="tiny-label">{{ item.label }}</text>
                <view class="input-container">
                  <u--input v-model="form[item.key]" type="text" :placeholder="item.unit" border="bottom" class="tiny-input"></u--input>
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
              <view class="grid-inputs">
                <view class="grid-cell" v-for="item in moreFields" :key="item.key">
                  <text class="tiny-label">{{ item.label }}</text>
                  <view class="input-container">
                    <u--input v-model="form[item.key]" type="text" :placeholder="item.unit" border="bottom" class="tiny-input"></u--input>
                    <text class="unit-label" :class="{'detected-unit': form.units[item.key]}" v-if="form[item.key]">
                      {{ form.units[item.key] || item.unit }}
                    </text>
                  </view>
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
                    <u--input v-model="form[item.key]" type="text" :placeholder="item.unit" border="bottom" class="tiny-input"></u--input>
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
            <view class="ocr-review-banner us-review" v-if="ocrReview.ultrasound">
              <text class="review-text">
                {{ ocrReview.ultrasound.reviewed ? 'OCR 已复核' : 'OCR 结果待复核' }}
              </text>
              <u-button size="mini" type="primary" text="查看/复核" @click="openOcrReview('ultrasound')"></u-button>
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

    <u-popup :show="ocrReviewVisible" mode="bottom" :lockScroll="true" @close="closeOcrReview">
      <view class="ocr-review-popup">
        <view class="popup-header" @touchmove.stop.prevent="">
          <text>OCR 识别结果复核</text>
          <u-icon name="close" size="18" @click="closeOcrReview"></u-icon>
        </view>
        <view class="popup-sub" @touchmove.stop.prevent="">
          <text>请核对并修正后再应用到表单</text>
          <view class="overwrite-toggle">
            <text>覆盖已填</text>
            <u-switch v-model="ocrOverwrite" size="20"></u-switch>
          </view>
        </view>
        <scroll-view scroll-y class="popup-body" @touchmove.stop.prevent="">
          <view class="review-item" v-for="item in ocrReviewItems" :key="item.key">
            <text class="review-label">{{ item.label }}</text>
            <view class="review-input">
              <u--textarea v-if="item.multiline" v-model="item.value" autoHeight maxlength="-1" border="none"></u--textarea>
              <u--input v-else v-model="item.value" type="text" placeholder="请输入" border="bottom"></u--input>
              <text class="review-unit" v-if="item.unit">{{ item.unit }}</text>
            </view>
          </view>
          <view class="review-raw" v-if="ocrReviewRawText">
            <text class="raw-title">OCR 原文（节选）</text>
            <u--textarea v-model="ocrReviewRawText" disabled autoHeight maxlength="-1" border="none"></u--textarea>
          </view>
        </scroll-view>
        <view class="popup-actions">
          <u-button text="暂不应用" shape="circle" @click="closeOcrReview"></u-button>
          <u-button type="primary" text="应用并标记已复核" shape="circle" @click="applyOcrReview"></u-button>
        </view>
      </view>
    </u-popup>

    <!-- 替换为 datetime-picker 以支持超长跨度历史记录快速选择 -->
    <u-datetime-picker :show="showCalendar" v-model="datePickerValue" mode="date" :minDate="-631152000000" :maxDate="Date.now()" @confirm="confirmDate" @cancel="showCalendar = false"></u-datetime-picker>
    <u-datetime-picker :show="showUltrasoundCalendar" v-model="ultrasoundPickerValue" mode="date" :minDate="-631152000000" :maxDate="Date.now()" @confirm="confirmUltrasoundDate" @cancel="showUltrasoundCalendar = false"></u-datetime-picker>
    <u-action-sheet :show="showMemberSheet" :actions="memberActions" @select="onMemberSelect" @close="showMemberSheet = false"></u-action-sheet>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/store/index.js';
import http from '@/utils/request.js';
import { getBaseURL } from '@/utils/config.js';
import { onLoad } from '@dcloudio/uni-app';

const userStore = useUserStore();
const loading = ref(false);
const showCalendar = ref(false);
const showUltrasoundCalendar = ref(false);
const showMemberSheet = ref(false);
const showMore = ref(false);
const showCalcium = ref(false);
const showUltrasound = ref(false);
const activeTab = ref('lab');
const datePickerValue = ref(Date.now());
const ultrasoundPickerValue = ref(Date.now());
const minSelectDate = ref('1950-01-01');
const maxSelectDate = ref(uni.$u.timeFormat(new Date(), 'yyyy-mm-dd'));

const fmtDate = (d) => {
    if (!d) return '';
    // 处理可能传入的日期字符串或时间戳
    let dt;
    if (typeof d === 'string') {
        dt = new Date(d.replace(/-/g, '/'));
    } else {
        dt = new Date(d);
    }
    return isNaN(dt.getTime()) ? d : `${dt.getFullYear()}年${dt.getMonth()+1}月${dt.getDate()}日`;
};

const ocrLoading = ref(false);
const ultrasoundLoading = ref(false);
const ocrReview = reactive({ lab: null, ultrasound: null });
const ocrReviewVisible = ref(false);
const ocrReviewType = ref('lab');
const ocrReviewItems = ref([]);
const ocrReviewRawText = ref('');
const ocrOverwrite = ref(false);
const recordId = ref(null);
const isEdit = computed(() => !!recordId.value);

watch(ocrReviewVisible, (visible) => {
  // #ifdef H5
  const overflow = visible ? 'hidden' : '';
  document.body.style.overflow = overflow;
  document.documentElement.style.overflow = overflow;
  // #endif
});

const reportImages = ref([]);
const ultrasoundImages = ref([]);
const familyMembers = ref([]);

const coreFields = [
  { key: 'TSH', label: '促甲状腺激素 (TSH)', unit: 'mIU/L' },
  { key: 'FT4', label: '游离甲状腺素 (FT4)', unit: 'pmol/L' },
  { key: 'FT3', label: '游离三碘甲状腺原氨酸 (FT3)', unit: 'pmol/L' },
  { key: 'TPOAb', label: '抗甲状腺过氧化物酶抗体 (TPO-Ab)', unit: 'IU/mL' },
  { key: 'TGAb', label: '抗甲状腺球蛋白抗体 (TG-Ab)', unit: 'IU/mL' },
  { key: 'T3', label: '三碘甲状腺原氨酸 (T3)', unit: 'nmol/L' },
  { key: 'T4', label: '总甲状腺素 (T4)', unit: 'nmol/L' }
];

const moreFields = [
  { key: 'Calcitonin', label: '降钙素 (CT)', unit: 'pg/mL' },
  { key: 'Tg', label: '甲状腺球蛋白 (Tg)', unit: 'ng/mL' },
  { key: 'TRAb', label: '促甲状腺激素受体抗体 (TRAb)', unit: 'IU/L' }
];

const calciumFields = [
  { key: 'Calcium', label: '血清钙 (Ca)', unit: 'mmol/L' },
  { key: 'Magnesium', label: '血清镁 (Mg)', unit: 'mmol/L' },
  { key: 'Phosphorus', label: '血清磷 (P)', unit: 'mmol/L' },
  { key: 'PTH', label: '甲状旁腺激素 (PTH)', unit: 'pg/mL' }
];

const OCR_CN_TO_KEY = {
  '报告日期': 'recordDate',
  '检查日期': 'ultrasoundDate',
  '促甲状腺激素': 'TSH',
  '游离T3': 'FT3',
  '游离T4': 'FT4',
  '总T3': 'T3',
  '总T4': 'T4',
  'TPO抗体': 'TPOAb',
  'TG抗体': 'TGAb',
  'TR抗体': 'TRAb',
  '甲状腺球蛋白': 'Tg',
  '降钙素': 'Calcitonin',
  '血钙': 'Calcium',
  '血镁': 'Magnesium',
  '血磷': 'Phosphorus',
  '甲状旁腺激素': 'PTH',
  '左叶': 'thyroidLeft',
  '右叶': 'thyroidRight',
  '峡部': 'isthmus',
  '结节数目': 'noduleCount',
  '最大径约': 'noduleMaxSize',
  '结节位置': 'noduleLocation',
  'TIRADS分级': 'tiradsLevel',
  'TIRADS分类': 'tiradsLevel',
  '结节特征': 'noduleFeatures',
  '淋巴结': 'lymphNode',
  '超声所见': 'ultrasoundNote',
  '超声提示': 'conclusion'
};

const OCR_NUMERIC_FIELDS = new Set([
  'TSH', 'FT3', 'FT4', 'TPOAb', 'TGAb', 'TRAb', 'Tg',
  'Calcitonin', 'Calcium', 'Magnesium', 'Phosphorus', 'PTH',
  'T3', 'T4', 'weight', 'heartRate'
]);

const OCR_TEXT_FIELDS = new Set(['ultrasoundNote', 'conclusion']);

const LAB_ORDER = ['recordDate', 'TSH', 'FT4', 'FT3', 'TPOAb', 'TGAb', 'T3', 'T4', 'Calcitonin', 'Tg', 'TRAb', 'Calcium', 'Magnesium', 'Phosphorus', 'PTH'];
const US_ORDER = ['ultrasoundDate', 'thyroidLeft', 'thyroidRight', 'isthmus', 'noduleCount', 'noduleMaxSize', 'noduleLocation', 'tiradsLevel', 'noduleFeatures', 'lymphNode', 'ultrasoundNote', 'conclusion'];

const UNIT_MAP = [...coreFields, ...moreFields, ...calciumFields].reduce((acc, item) => {
  acc[item.key] = item.unit;
  return acc;
}, {});

const LABEL_MAP = [...coreFields, ...moreFields, ...calciumFields].reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {
  recordDate: '报告日期',
  ultrasoundDate: '检查日期',
  thyroidLeft: '左叶',
  thyroidRight: '右叶',
  isthmus: '峡部',
  noduleCount: '结节数目',
  noduleMaxSize: '最大径约',
  noduleLocation: '结节位置',
  tiradsLevel: 'C-TIRADS分类',
  noduleFeatures: '结节特征',
  lymphNode: '颈部淋巴结',
  ultrasoundNote: '超声所见',
  conclusion: '超声提示'
});

const form = reactive({
  memberId: null,
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

const memberActions = computed(() => {
  const actions = [{ name: '本人', value: null }];
  familyMembers.value.forEach(m => {
    actions.push({ name: `${m.name}${m.relation ? ' · ' + m.relation : ''}`, value: m.id });
  });
  return actions;
});

const currentMemberName = computed(() => {
  if (!form.memberId) return '本人';
  const m = familyMembers.value.find(i => i.id === form.memberId);
  return m ? `${m.name}${m.relation ? ' · ' + m.relation : ''}` : '本人';
});

onLoad(async (options) => {
  await loadFamilyMembers();
  if (options.id) {
    recordId.value = options.id;
    uni.setNavigationBarTitle({ title: '编辑档案' });
    await fetchRecordDetail(options.id);
  }
});

const loadFamilyMembers = async () => {
  try {
    const res = await http.get('/api/family/list');
    familyMembers.value = res || [];
  } catch (e) {
    familyMembers.value = [];
  }
};

const fetchRecordDetail = async (id) => {
  try {
    const res = await http.get(`/api/record/${id}`);
    // 回填表单
    Object.keys(form).forEach(key => {
      if (res[key] !== undefined && res[key] !== null) {
        form[key] = res[key];
        // 如果是日期字段，同步更新 Picker 的初始值
        if (key === 'recordDate') datePickerValue.value = new Date(res[key].replace(/-/g, '/')).getTime();
        if (key === 'ultrasoundDate' && res[key]) ultrasoundPickerValue.value = new Date(res[key].replace(/-/g, '/')).getTime();
      }
    });
    // 回填图片
    const normalizeImageArray = (val) => {
      if (!val) return [];
      let arr = val;
      if (!Array.isArray(arr)) {
        try {
          arr = JSON.parse(val);
        } catch (e) {
          arr = [val];
        }
      }
      if (!Array.isArray(arr)) arr = [arr];
      const result = [];
      arr.forEach((item) => {
        if (Array.isArray(item)) {
          item.forEach((sub) => {
            if (sub && typeof sub === 'string') result.push(sub);
          });
        } else if (item && typeof item === 'string') {
          result.push(item);
        }
      });
      return result;
    };
    
    reportImages.value = normalizeImageArray(res.reportImage);
    ultrasoundImages.value = normalizeImageArray(res.ultrasoundImage);

    // 回填单位信息
    if (res.indicatorUnits) {
        if (typeof res.indicatorUnits === 'object') {
            form.units = res.indicatorUnits;
        } else {
            try {
                form.units = JSON.parse(res.indicatorUnits);
            } catch (e) {
                form.units = {};
            }
        }
    }

    if (res.ocrReview) {
      try {
        const parsed = typeof res.ocrReview === 'string' ? JSON.parse(res.ocrReview) : res.ocrReview;
        ocrReview.lab = parsed?.lab || null;
        ocrReview.ultrasound = parsed?.ultrasound || null;
      } catch (e) {
        ocrReview.lab = null;
        ocrReview.ultrasound = null;
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
  const date = new Date(e.value);
  form.recordDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  showCalendar.value = false;
};

const confirmUltrasoundDate = (e) => {
  const date = new Date(e.value);
  form.ultrasoundDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  showUltrasoundCalendar.value = false;
};

const onMemberSelect = (e) => {
  form.memberId = e.value || null;
  showMemberSheet.value = false;
};

const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = getBaseURL();
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

const hasValue = (val) => val !== undefined && val !== null && val !== '';

const normalizeOcrIndicators = (indicators = {}) => {
  const normalized = {};
  const units = {};

  for (const [cnKey, value] of Object.entries(indicators)) {
    if (cnKey.endsWith('单位')) {
      const baseKey = cnKey.replace('单位', '');
      const mappedKey = OCR_CN_TO_KEY[baseKey];
      if (mappedKey) units[mappedKey] = value;
      continue;
    }

    const mappedKey = OCR_CN_TO_KEY[cnKey] || cnKey;
    normalized[mappedKey] = value;
  }

  return { normalized, units };
};

const mergeOcrReview = (type, normalized, units, rawText) => {
  if (!ocrReview[type]) {
    ocrReview[type] = {
      recognized: {},
      units: {},
      rawText: [],
      images: [],
      reviewed: false
    };
  }

  const review = ocrReview[type];

  for (const [key, value] of Object.entries(normalized || {})) {
    if (!hasValue(value)) continue;
    if (!hasValue(review.recognized[key])) {
      review.recognized[key] = value;
    }
  }

  for (const [key, value] of Object.entries(units || {})) {
    if (!hasValue(value)) continue;
    if (!review.units[key]) review.units[key] = value;
  }

  if (rawText) {
    if (!Array.isArray(review.rawText)) review.rawText = review.rawText ? [review.rawText] : [];
    review.rawText.push(rawText);
  }

  review.reviewed = false;
  review.updatedAt = new Date().toISOString();
  review.pendingCount = Object.values(review.recognized).filter(hasValue).length;

  return review;
};

const buildReviewItems = (type, recognized, units) => {
  const order = type === 'ultrasound' ? US_ORDER : LAB_ORDER;
  const items = [];
  const used = new Set();

  const pushItem = (key) => {
    const value = recognized[key];
    if (!hasValue(value)) return;
    items.push({
      key,
      label: LABEL_MAP[key] || key,
      value: String(value),
      unit: units[key] || UNIT_MAP[key] || '',
      multiline: OCR_TEXT_FIELDS.has(key)
    });
    used.add(key);
  };

  order.forEach(pushItem);
  Object.keys(recognized || {}).forEach((key) => {
    if (!used.has(key)) pushItem(key);
  });

  return items;
};

const openOcrReview = (type) => {
  const review = ocrReview[type];
  if (!review) return;

  ocrReviewType.value = type;
  ocrOverwrite.value = false;
  const displayData = review.reviewed && review.applied ? review.applied : (review.recognized || {});
  ocrReviewItems.value = buildReviewItems(type, displayData, review.units || {});
  ocrReviewRawText.value = Array.isArray(review.rawText)
    ? review.rawText.join('\n---\n')
    : (review.rawText || '');
  ocrReviewVisible.value = true;
};

const closeOcrReview = () => {
  ocrReviewVisible.value = false;
};

const normalizeNumericValue = (value) => {
  const text = String(value).trim();
  const specialMatch = text.match(/^([<>]\s*[0-9.]+)/);
  if (specialMatch) return specialMatch[1].replace(/\s+/g, '');
  const numericPrefix = text.match(/^[0-9.]+/)?.[0];
  return numericPrefix !== undefined ? numericPrefix : text;
};

const applyOcrToForm = (data, units, type, overwrite) => {
  let newCount = 0;

  for (const [key, value] of Object.entries(data || {})) {
    if (!hasValue(value)) continue;
    if (!Object.prototype.hasOwnProperty.call(form, key)) continue;

    if (key === 'recordDate') {
      const defaultDate = uni.$u.timeFormat(new Date(), 'yyyy-mm-dd');
      const currentDate = form.recordDate;
      if (overwrite || currentDate === defaultDate) {
        form.recordDate = value;
        if (currentDate === defaultDate) {
          uni.$u.toast(`已同步报告日期 ${value}`);
        }
        newCount++;
      } else if (currentDate !== value) {
        const d1 = new Date(currentDate).getTime();
        const d2 = new Date(value).getTime();
        const diffDays = Math.abs(d1 - d2) / (1000 * 3600 * 24);
        if (diffDays > 7) {
          uni.$u.toast(`注意：OCR 日期(${value})与当前差异较大，请核对`);
        }
      }
      continue;
    }

    if (key === 'ultrasoundDate') {
      if (overwrite || !hasValue(form.ultrasoundDate)) {
        form.ultrasoundDate = value;
        newCount++;
      }
      continue;
    }

    if (!overwrite && hasValue(form[key])) continue;

    const finalValue = OCR_NUMERIC_FIELDS.has(key) ? normalizeNumericValue(value) : value;
    form[key] = finalValue;
    newCount++;
  }

  for (const [key, value] of Object.entries(units || {})) {
    if (!hasValue(value)) continue;
    if (overwrite || !form.units[key]) {
      form.units[key] = value;
    }
  }

  if (data.Calcitonin || data.Tg || data.TRAb || data.T3) showMore.value = true;
  if (data.Calcium || data.PTH || data.Magnesium) showCalcium.value = true;
  if (type === 'ultrasound') activeTab.value = 'ultrasound';

  return newCount;
};

const applyOcrReview = () => {
  const type = ocrReviewType.value;
  const review = ocrReview[type];
  if (!review) return;

  const applied = {};
  ocrReviewItems.value.forEach((item) => {
    if (hasValue(item.value)) applied[item.key] = item.value;
  });

  const appliedCount = applyOcrToForm(applied, review.units || {}, type, ocrOverwrite.value);
  const corrections = {};

  for (const [key, value] of Object.entries(applied)) {
    if (!hasValue(review.recognized?.[key])) continue;
    if (String(review.recognized[key]) !== String(value)) {
      corrections[key] = { from: review.recognized[key], to: value };
    }
  }

  review.reviewed = true;
  review.reviewedAt = new Date().toISOString();
  review.applied = applied;
  review.corrections = corrections;
  review.overwrite = ocrOverwrite.value;
  review.appliedCount = appliedCount;

  ocrReviewVisible.value = false;
  uni.$u.toast(`已应用 ${appliedCount} 项并标记已复核`);
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

    console.log('[OCR] 开始识别...');
    const ocrResult = await http.post('/api/ocr/recognize', { image: base64, type });

    if (ocrResult && ocrResult.indicators) {
      const { normalized, units } = normalizeOcrIndicators(ocrResult.indicators);
      const review = mergeOcrReview(type, normalized, units, ocrResult.rawText);
      openOcrReview(type);

      if (normalized.Calcitonin || normalized.Tg || normalized.TRAb || normalized.T3) showMore.value = true;
      if (normalized.Calcium || normalized.PTH || normalized.Magnesium) showCalcium.value = true;
      if (isUltrasound) activeTab.value = 'ultrasound';

      if (review && review.pendingCount > 0) {
        uni.$u.toast(`已识别 ${review.pendingCount} 项待复核`);
      }
    }

    console.log('[上传] 开始上传图片...');
    let uploadResult;
    try {
      uploadResult = await uploadReportFile(filePath, type);
    } catch (uploadErr) {
      console.warn('uploadFile 失败，改用 base64 上传', uploadErr);
      uploadResult = await http.post('/api/upload/report', { image: base64, type });
    }

    if (uploadResult && uploadResult.path) {
      if (isUltrasound) ultrasoundImages.value.push(uploadResult.path);
      else reportImages.value.push(uploadResult.path);

      const review = ocrReview[type];
      if (review) {
        if (!review.images) review.images = [];
        review.images.push(uploadResult.path);
      }
    }
  } catch (err) {
    console.error('OCR 处理失败:', err);
  } finally {
    if (isUltrasound) ultrasoundLoading.value = false;
    else ocrLoading.value = false;
  }
};

const uploadReportFile = (filePath, type) => {
  return new Promise((resolve, reject) => {
    const baseURL = getBaseURL();
    const token = userStore.token;
    const url = `${baseURL}/api/upload/report`;

    uni.uploadFile({
      url,
      filePath,
      name: 'file',
      formData: { type },
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const payload = JSON.parse(res.data);
          if (payload && payload.code === 200) {
            resolve(payload.data);
          } else {
            reject(payload?.message || '上传失败');
          }
        } catch (e) {
          reject('上传返回解析失败');
        }
      },
      fail: (err) => reject(err)
    });
  });
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
  const hasLabData = form.TSH || form.FT3 || form.FT4 || form.TPOAb || form.TGAb || form.Tg || form.TRAb || form.T3 || form.T4 || form.Calcitonin || form.Calcium || form.PTH || form.Magnesium || form.Phosphorus;
  const hasUltrasoundData = form.thyroidLeft || form.thyroidRight || form.isthmus || form.noduleCount || form.noduleMaxSize || form.tiradsLevel || form.ultrasoundNote || ultrasoundImages.value.length > 0;
  const hasOtherData = form.weight || form.heartRate || form.feeling;
  const hasImages = reportImages.value.length > 0 || ultrasoundImages.value.length > 0;
  
  if (!hasLabData && !hasUltrasoundData && !hasOtherData && !hasImages) {
      return uni.$u.toast('请上传图片或填写至少一项数据');
  }
  
  loading.value = true;
  try {
    const submitData = {
      ...form,
      reportImage: JSON.stringify(reportImages.value),
      ultrasoundImage: JSON.stringify(ultrasoundImages.value),
      indicatorUnits: JSON.stringify(form.units),
      ocrReview: JSON.stringify(ocrReview)
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

.ocr-review-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20rpx;
  padding: 12rpx 20rpx;
  background: #F7FBFF;
  border-radius: 12rpx;
  border: 1px dashed #A9C8FF;

  .review-text {
    font-size: 22rpx;
    color: #3E7BFF;
    font-weight: 700;
  }
}

.ocr-review-banner.us-review {
  background: #FAF5FF;
  border-color: #D3ADF7;

  .review-text {
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

.ocr-review-popup {
  background: #FFFFFF;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 24rpx 32rpx;
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 30rpx;
  font-weight: 800;
  color: #1D2129;
  margin-bottom: 8rpx;
}

.popup-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 22rpx;
  color: #86909C;
  margin-bottom: 16rpx;
}

.overwrite-toggle {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 22rpx;
  color: #4E5969;
  font-weight: 700;
}

.popup-body {
  flex: 1;
  padding: 0 8rpx;
  min-height: 0;
  overscroll-behavior: contain;
}

.review-item {
  padding: 16rpx 0;
  border-bottom: 1px dashed #F2F3F5;
}

.review-label {
  font-size: 24rpx;
  color: #4E5969;
  font-weight: 700;
  margin-bottom: 8rpx;
  display: block;
}

.review-input {
  position: relative;
  padding-right: 80rpx;
}

.review-unit {
  position: absolute;
  right: 8rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 20rpx;
  color: #86909C;
  font-weight: 700;
}

.review-raw {
  margin-top: 20rpx;
  padding: 16rpx;
  background: #F8FAFF;
  border-radius: 16rpx;
}

.raw-title {
  font-size: 22rpx;
  color: #4E5969;
  font-weight: 700;
  margin-bottom: 8rpx;
  display: block;
}

.popup-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
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

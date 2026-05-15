const test = require('node:test');
const assert = require('node:assert/strict');
const OcrController = require('../controllers/OcrController');

test('parseIndicators extracts date, values, and units', () => {
  const detections = [
    { DetectedText: '报告日期 2026-03-10' },
    { DetectedText: 'TSH: 2.5 mIU/L' },
    { DetectedText: 'FT3 5.1 pmol/L' },
    { DetectedText: 'TPO抗体 <10 IU/mL' }
  ];

  const result = OcrController.parseIndicators(detections);

  assert.equal(result.indicators['报告日期'], '2026-03-10');
  assert.equal(result.indicators['促甲状腺激素'], '2.5');
  assert.equal(result.indicators['促甲状腺激素单位'], 'mIU/L');
  assert.equal(result.indicators['游离T3'], '5.1');
  assert.equal(result.indicators['总T3'], undefined);
  assert.equal(result.indicators['TPO抗体'], '<10');
});

test('parseIndicators extracts expanded thyroid-related blood markers', () => {
  const detections = [
    { DetectedText: 'TSI 0.8 IU/L' },
    { DetectedText: '癌胚抗原 3.2 ng/mL' },
    { DetectedText: '25羟维生素D 28 ng/mL' },
    { DetectedText: '碱性磷酸酶 96 U/L' },
    { DetectedText: '中性粒细胞 2.1 10^9/L' },
    { DetectedText: '甘油三酯 1.6 mmol/L' },
    { DetectedText: 'C反应蛋白 7 mg/L' }
  ];

  const result = OcrController.parseIndicators(detections);

  assert.equal(result.indicators['TSI'], '0.8');
  assert.equal(result.indicators['癌胚抗原'], '3.2');
  assert.equal(result.indicators['25羟维生素D'], '28');
  assert.equal(result.indicators['碱性磷酸酶'], '96');
  assert.equal(result.indicators['中性粒细胞'], '2.1');
  assert.equal(result.indicators['甘油三酯'], '1.6');
  assert.equal(result.indicators['C反应蛋白'], '7');
});

test('parseUltrasound extracts findings and conclusion', () => {
  const detections = [
    { DetectedText: '超声所见：甲状腺左叶见结节，大小约 8×6mm，TI-RADS 4A。' },
    { DetectedText: '超声提示：考虑结节性病变。' }
  ];

  const result = OcrController.parseUltrasound(detections);

  assert.ok(result.indicators['超声所见']);
  assert.ok(result.indicators['超声所见'].includes('甲状腺'));
  assert.equal(result.indicators['TIRADS分类'], '4A');
  assert.ok(result.indicators['超声提示'].includes('结节性病变'));
});

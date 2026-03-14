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
  assert.equal(result.indicators['TPO抗体'], '<10');
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

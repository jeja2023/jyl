const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detectImageType,
  parseBase64Image,
  validateImageBuffer
} = require('../utils/imageValidation');

const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l6Q0WQAAAABJRU5ErkJggg==';

test('detectImageType detects png signature', () => {
  const buffer = Buffer.from(tinyPngBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
  assert.deepEqual(detectImageType(buffer), { ext: 'png', mime: 'image/png' });
});

test('parseBase64Image validates declared image type', () => {
  const parsed = parseBase64Image(tinyPngBase64);
  assert.equal(parsed.ext, 'png');
  assert.equal(parsed.mime, 'image/png');
  assert.ok(parsed.buffer.length > 0);
});

test('validateImageBuffer rejects mismatched extension', () => {
  const buffer = Buffer.from(tinyPngBase64.replace(/^data:image\/png;base64,/, ''), 'base64');
  assert.throws(() => validateImageBuffer(buffer, 'jpg'), /扩展名|type/i);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const ShareController = require('../controllers/ShareController');

test('normalizeToken decodes URL encoded share tokens', () => {
  assert.equal(
    ShareController.normalizeToken('abc%2Fdef%2Bghi'),
    'abc/def+ghi'
  );
});

test('normalizeToken restores plus signs converted to spaces', () => {
  assert.equal(
    ShareController.normalizeToken('abc def'),
    'abc+def'
  );
});

test('isLegacyJwtToken only accepts three-part tokens', () => {
  assert.equal(ShareController.isLegacyJwtToken('header.payload.signature'), true);
  assert.equal(ShareController.isLegacyJwtToken('opaque-share-token'), false);
});

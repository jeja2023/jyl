const test = require('node:test');
const assert = require('node:assert/strict');
const RecordController = require('../controllers/RecordController');

test('parseImages handles json, nested arrays, and strings', () => {
  const mixed = '["/a.jpg", [\"/b.jpg\"], \"/c.jpg\"]';
  assert.deepEqual(RecordController.parseImages(mixed), ['/a.jpg', '/b.jpg', '/c.jpg']);
  assert.deepEqual(RecordController.parseImages('/single.jpg'), ['/single.jpg']);
  assert.deepEqual(RecordController.parseImages(['x.jpg', ['y.jpg']]), ['x.jpg', 'y.jpg']);
});

test('parseJson returns objects safely', () => {
  assert.deepEqual(RecordController.parseJson('{"a":1}'), { a: 1 });
  assert.deepEqual(RecordController.parseJson({ b: 2 }), { b: 2 });
  assert.equal(RecordController.parseJson('not-json'), null);
});

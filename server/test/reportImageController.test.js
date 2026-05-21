const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const ReportImageController = require('../controllers/ReportImageController');
const HealthRecord = require('../models/HealthRecord');
const ShareLink = require('../models/ShareLink');
const { generateToken, hashToken } = require('../utils/shareToken');

test('report image access allows owner token with matching filename prefix', async () => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'report-image-test-secret';
  const token = jwt.sign({ id: 42 }, process.env.JWT_SECRET);

  try {
    const allowed = await ReportImageController.canAccess({
      header: { authorization: `Bearer ${token}` },
      query: {}
    }, '42_lab_1000_test.png');
    assert.equal(allowed, true);
  } finally {
    process.env.JWT_SECRET = oldSecret;
  }
});

test('report image access rejects mismatched owner token', async () => {
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'report-image-test-secret';
  const token = jwt.sign({ id: 42 }, process.env.JWT_SECRET);

  try {
    const allowed = await ReportImageController.canAccess({
      header: { authorization: `Bearer ${token}` },
      query: {}
    }, '43_lab_1000_test.png');
    assert.equal(allowed, false);
  } finally {
    process.env.JWT_SECRET = oldSecret;
  }
});

test('report image access allows valid share token only for images in shared record', async () => {
  const token = generateToken();
  const oldFindShare = ShareLink.findOne;
  const oldFindRecord = HealthRecord.findOne;

  ShareLink.findOne = async ({ where }) => {
    assert.equal(where.tokenHash, hashToken(token));
    return {
      resourceId: 7,
      UserId: 9,
      expiresAt: new Date(Date.now() + 60000),
      options: null
    };
  };
  HealthRecord.findOne = async () => ({
    reportImage: JSON.stringify(['/storage/reports/9_lab_1000_a.png']),
    ultrasoundImage: JSON.stringify(['/storage/reports/9_ultrasound_1000_b.png'])
  });

  try {
    const allowed = await ReportImageController.canAccess({
      header: {},
      query: { shareToken: token }
    }, '9_ultrasound_1000_b.png');
    assert.equal(allowed, true);

    const denied = await ReportImageController.canAccess({
      header: {},
      query: { shareToken: token }
    }, '9_lab_1000_other.png');
    assert.equal(denied, false);
  } finally {
    ShareLink.findOne = oldFindShare;
    HealthRecord.findOne = oldFindRecord;
  }
});

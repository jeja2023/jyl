const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AppUpdateController = require('../controllers/AppUpdateController');

const updateDir = path.join(__dirname, '../../storage/app-updates');
const manifestPath = path.join(updateDir, 'manifest.json');

const createCtx = (query = {}) => ({
  query,
  origin: 'https://jyl.example.com',
  protocol: 'https',
  host: 'jyl.example.com',
  get: () => '',
  status: 0,
  body: null
});

const cleanup = () => {
  if (fs.existsSync(updateDir)) {
    fs.rmSync(updateDir, { recursive: true, force: true });
  }
};

test('app update check returns no update without manifest', async () => {
  cleanup();

  const ctx = createCtx({ platform: 'android', versionCode: '166', versionName: '1.6.7' });
  await AppUpdateController.check(ctx);

  assert.equal(ctx.status, 200);
  assert.equal(ctx.body.code, 200);
  assert.equal(ctx.body.data.hasUpdate, false);
  assert.equal(ctx.body.data.reason, 'manifest_missing');
});

test('app update check returns package info for older android app', async () => {
  cleanup();
  fs.mkdirSync(updateDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({
    enabled: true,
    platforms: ['android'],
    versionName: '1.6.8',
    versionCode: 168,
    minVersionCode: 160,
    force: false,
    wgtUrl: '/storage/app-updates/jyl-1.6.8-168.wgt',
    size: 123,
    sha256: 'abc',
    releaseNotes: ['fix login'],
    publishedAt: '2026-05-19T00:00:00.000Z'
  }));

  const ctx = createCtx({ platform: 'android', versionCode: '166', versionName: '1.6.7' });
  await AppUpdateController.check(ctx);

  assert.equal(ctx.status, 200);
  assert.equal(ctx.body.code, 200);
  assert.equal(ctx.body.data.hasUpdate, true);
  assert.equal(ctx.body.data.force, false);
  assert.equal(ctx.body.data.versionCode, 168);
  assert.equal(ctx.body.data.downloadUrl, 'https://jyl.example.com/storage/app-updates/jyl-1.6.8-168.wgt');
  assert.deepEqual(ctx.body.data.releaseNotes, ['fix login']);

  cleanup();
});

test('app update check uses forwarded https origin behind proxy', async () => {
  cleanup();
  fs.mkdirSync(updateDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({
    enabled: true,
    platforms: ['android'],
    versionName: '1.8.2',
    versionCode: 182,
    wgtUrl: '/storage/app-updates/jyl-1.8.2-182.wgt'
  }));

  const ctx = {
    ...createCtx({ platform: 'android', versionCode: '180', versionName: '1.8.0' }),
    origin: 'http://127.0.0.1:3000',
    protocol: 'http',
    host: '127.0.0.1:3000',
    get: (name) => ({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'jyl.880301.xyz'
    }[String(name).toLowerCase()] || '')
  };

  await AppUpdateController.check(ctx);

  assert.equal(ctx.body.data.hasUpdate, true);
  assert.equal(ctx.body.data.downloadUrl, 'https://jyl.880301.xyz/storage/app-updates/jyl-1.8.2-182.wgt');

  cleanup();
});

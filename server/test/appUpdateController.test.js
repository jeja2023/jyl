const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AppUpdateController = require('../controllers/AppUpdateController');

const updateDir = path.join(__dirname, '../../storage/app-updates');
const manifestPath = path.join(updateDir, 'manifest.json');
const backupDir = path.join(__dirname, '../../storage/.app-updates-test-backup');

const createCtx = (query = {}) => ({
  query,
  origin: 'https://jyl.example.com',
  protocol: 'https',
  host: 'jyl.example.com',
  get: () => '',
  status: 0,
  body: null
});

const backupPublishedUpdates = () => {
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  if (fs.existsSync(updateDir)) {
    fs.cpSync(updateDir, backupDir, { recursive: true });
  }
};

const restorePublishedUpdates = () => {
  if (fs.existsSync(updateDir)) {
    fs.rmSync(updateDir, { recursive: true, force: true });
  }
  if (fs.existsSync(backupDir)) {
    fs.cpSync(backupDir, updateDir, { recursive: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
};

const cleanup = () => {
  if (fs.existsSync(updateDir)) {
    fs.rmSync(updateDir, { recursive: true, force: true });
  }
};

backupPublishedUpdates();
process.on('exit', restorePublishedUpdates);

/** 每个用例自己决定是否信任代理，避免相互串味 */
const withEnv = async (overrides, fn) => {
  const saved = {};
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

const writeManifest = (extra = {}) => {
  cleanup();
  fs.mkdirSync(updateDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({
    enabled: true,
    platforms: ['android'],
    versionName: '1.8.2',
    versionCode: 182,
    wgtUrl: '/storage/app-updates/jyl-1.8.2-182.wgt',
    ...extra
  }));
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

  await withEnv({ TRUST_PROXY: undefined, APP_PUBLIC_BASE_URL: undefined, PUBLIC_BASE_URL: undefined }, async () => {
    const ctx = createCtx({ platform: 'android', versionCode: '166', versionName: '1.6.7' });
    await AppUpdateController.check(ctx);

    assert.equal(ctx.status, 200);
    assert.equal(ctx.body.code, 200);
    assert.equal(ctx.body.data.hasUpdate, true);
    assert.equal(ctx.body.data.force, false);
    assert.equal(ctx.body.data.versionCode, 168);
    // 未配置公开域名且不信任代理时返回相对路径，由客户端用自己的 baseURL 解析
    assert.equal(ctx.body.data.downloadUrl, '/storage/app-updates/jyl-1.6.8-168.wgt');
    assert.deepEqual(ctx.body.data.releaseNotes, ['fix login']);
  });

  cleanup();
});

test('伪造 x-forwarded-host 不会污染下载地址（未开启 TRUST_PROXY）', async () => {
  writeManifest();

  await withEnv({ TRUST_PROXY: undefined, APP_PUBLIC_BASE_URL: undefined, PUBLIC_BASE_URL: undefined, VITE_API_BASE: undefined }, async () => {
    const ctx = {
      ...createCtx({ platform: 'android', versionCode: '180', versionName: '1.8.0' }),
      host: 'evil.example.com',
      get: (name) => ({
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'evil.example.com'
      }[String(name).toLowerCase()] || '')
    };

    await AppUpdateController.check(ctx);

    assert.equal(ctx.body.data.hasUpdate, true);
    assert.equal(
      ctx.body.data.downloadUrl,
      '/storage/app-updates/jyl-1.8.2-182.wgt',
      '不信任代理时必须回退相对路径，绝不能拼出攻击者域名'
    );
    assert.ok(!String(ctx.body.data.downloadUrl).includes('evil.example.com'));
  });

  cleanup();
});

test('配置了公开域名时优先使用配置，忽略伪造的转发头', async () => {
  writeManifest();

  await withEnv({ TRUST_PROXY: 'true', APP_PUBLIC_BASE_URL: 'https://jyl.880301.xyz' }, async () => {
    const ctx = {
      ...createCtx({ platform: 'android', versionCode: '180', versionName: '1.8.0' }),
      host: 'evil.example.com',
      get: (name) => ({ 'x-forwarded-host': 'evil.example.com' }[String(name).toLowerCase()] || '')
    };

    await AppUpdateController.check(ctx);

    assert.equal(ctx.body.data.downloadUrl, 'https://jyl.880301.xyz/storage/app-updates/jyl-1.8.2-182.wgt');
  });

  cleanup();
});

test('app update check uses forwarded https origin behind trusted proxy', async () => {
  writeManifest();

  await withEnv({ TRUST_PROXY: 'true', APP_PUBLIC_BASE_URL: undefined, PUBLIC_BASE_URL: undefined, VITE_API_BASE: undefined }, async () => {
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
  });

  cleanup();
});

test('可信代理下多跳转发头只认最后一跳，忽略客户端塞在左侧的伪造值', async () => {
  writeManifest();

  await withEnv({ TRUST_PROXY: 'true', APP_PUBLIC_BASE_URL: undefined, PUBLIC_BASE_URL: undefined, VITE_API_BASE: undefined }, async () => {
    const ctx = {
      ...createCtx({ platform: 'android', versionCode: '180', versionName: '1.8.0' }),
      protocol: 'http',
      host: '127.0.0.1:3000',
      get: (name) => ({
        'x-forwarded-proto': 'https, https',
        // 左边那个是客户端自己塞的，右边才是代理追加的
        'x-forwarded-host': 'evil.example.com, jyl.880301.xyz'
      }[String(name).toLowerCase()] || '')
    };

    await AppUpdateController.check(ctx);

    assert.equal(ctx.body.data.downloadUrl, 'https://jyl.880301.xyz/storage/app-updates/jyl-1.8.2-182.wgt');
  });

  cleanup();
});

test('app update check defaults to https for production public host behind trusted proxy', async () => {
  cleanup();
  fs.mkdirSync(updateDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify({
    enabled: true,
    platforms: ['android'],
    versionName: '1.8.5',
    versionCode: 185,
    wgtUrl: '/storage/app-updates/jyl-1.8.5-185.wgt'
  }));

  await withEnv({
    NODE_ENV: 'production',
    TRUST_PROXY: 'true',
    APP_PUBLIC_BASE_URL: undefined,
    PUBLIC_BASE_URL: undefined,
    VITE_API_BASE: undefined
  }, async () => {
    const ctx = {
      ...createCtx({ platform: 'android', versionCode: '184', versionName: '1.8.4' }),
      origin: 'http://jyl.880301.xyz',
      protocol: 'http',
      host: 'jyl.880301.xyz',
      get: () => ''
    };

    await AppUpdateController.check(ctx);
    assert.equal(ctx.body.data.hasUpdate, true);
    assert.equal(ctx.body.data.downloadUrl, 'https://jyl.880301.xyz/storage/app-updates/jyl-1.8.5-185.wgt');
  });

  cleanup();
});

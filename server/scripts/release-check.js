const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../..');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const fail = (messages) => {
    messages.forEach(message => console.error(`- ${message}`));
    process.exit(1);
};

const warnings = [];
const errors = [];

const serverPkg = readJson(path.join(rootDir, 'server/package.json'));
const clientPkg = readJson(path.join(rootDir, 'client/package.json'));
const clientManifest = readJson(path.join(rootDir, 'client/src/manifest.json'));
const updateManifestPath = path.join(rootDir, 'storage/app-updates/manifest.json');

const packageUrlToLocalPath = (value) => {
    if (!value) return '';
    let packagePath = value;
    try {
        packagePath = new URL(value).pathname;
    } catch (e) {
        packagePath = value;
    }
    return path.join(rootDir, packagePath.replace(/^\/+/, '').replace(/\//g, path.sep));
};

const versionName = String(clientManifest.versionName || '');
const versionCode = parseInt(clientManifest.versionCode, 10);

if (serverPkg.version !== clientPkg.version) {
    errors.push(`server/package.json(${serverPkg.version}) 与 client/package.json(${clientPkg.version}) 版本不一致`);
}
if (serverPkg.version !== versionName) {
    errors.push(`package 版本(${serverPkg.version}) 与 client/src/manifest.json versionName(${versionName}) 不一致`);
}
if (!Number.isFinite(versionCode) || versionCode <= 0) {
    errors.push('client/src/manifest.json versionCode 必须是正整数');
}

if (!fs.existsSync(updateManifestPath)) {
    errors.push('storage/app-updates/manifest.json 缺失，App 热更新检查将返回无更新');
} else {
    const updateManifest = readJson(updateManifestPath);
    const latestCode = parseInt(updateManifest.versionCode, 10);
    const wgtUrl = updateManifest.wgtUrl || updateManifest.packageUrl;
    if (String(updateManifest.versionName || '') !== versionName) {
        errors.push(`热更新 manifest versionName(${updateManifest.versionName}) 与当前版本(${versionName}) 不一致`);
    }
    if (latestCode !== versionCode) {
        errors.push(`热更新 manifest versionCode(${latestCode}) 与当前版本(${versionCode}) 不一致`);
    }
    if (!wgtUrl) {
        errors.push('热更新 manifest 缺少 wgtUrl/packageUrl');
    } else {
        const wgtPath = packageUrlToLocalPath(wgtUrl);
        if (!fs.existsSync(wgtPath)) {
            errors.push(`热更新包不存在：${wgtUrl}`);
        }
    }
}

const storageLogsDir = path.join(rootDir, 'storage/logs');
if (fs.existsSync(storageLogsDir)) {
    warnings.push('storage/logs 存在，生产环境必须确认未通过静态服务公开');
}

if (String(clientPkg.dependencies?.['uview-plus'] || '') === 'latest') {
    warnings.push('client/package.json 中 uview-plus 使用 latest，建议锁定明确版本');
}

if (errors.length) {
    console.error('发布自检失败：');
    fail(errors);
}

console.log('发布自检通过。');
if (warnings.length) {
    console.log('发布提醒：');
    warnings.forEach(message => console.log(`- ${message}`));
}

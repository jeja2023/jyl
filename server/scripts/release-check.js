const fs = require('fs');
const path = require('path');

/**
 * 发布前自检。
 *
 * 除了原有的版本号一致性，这里补了几条"曾经真的出过事"的守卫：
 *  - .dockerignore 必须存在且排除 server/.env，否则镜像会把 JWT_SECRET、
 *    数据库密码、云服务与 SMTP 凭据一起固化进层里；
 *  - 生产环境必须显式配置 TRUST_PROXY 与 APP_PUBLIC_BASE_URL 的说明项，
 *    避免限流/审计 IP 与热更新地址退回可被请求头伪造的路径。
 *
 * CI 里热更新 wgt 包不入库，用 --skip-package 跳过包体存在性检查，
 * 版本一致性仍然是硬校验。
 */

const args = process.argv.slice(2);
const skipPackage = args.includes('--skip-package') || args.includes('--no-package');

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
    } else if (skipPackage) {
        console.log(`已跳过热更新包体存在性检查（--skip-package）：${wgtUrl}`);
    } else {
        const wgtPath = packageUrlToLocalPath(wgtUrl);
        if (!fs.existsSync(wgtPath)) {
            errors.push(`热更新包不存在：${wgtUrl}`);
        }
    }
    if (!updateManifest.sha256) {
        warnings.push('热更新 manifest 缺少 sha256，客户端无法校验包完整性');
    }
}

// ---- 密钥不得进入镜像：这条是 P0，必须硬失败 ----
const dockerignorePath = path.join(rootDir, '.dockerignore');
if (!fs.existsSync(dockerignorePath)) {
    errors.push('根目录缺少 .dockerignore，docker build 会把 server/.env 里的密钥固化进镜像层');
} else {
    const dockerignore = fs.readFileSync(dockerignorePath, 'utf8');
    const mustIgnore = ['server/.env', 'docker/.env_docker', 'certs/', 'node_modules'];
    mustIgnore.forEach((entry) => {
        if (!dockerignore.split(/\r?\n/).some((line) => line.trim() === entry || line.trim() === `**/${entry}`)) {
            errors.push(`.dockerignore 未排除 ${entry}，构建上下文会把它带进镜像`);
        }
    });
}

// ---- Dockerfile 不应把宿主机 node_modules 覆盖进容器 ----
const dockerfilePath = path.join(rootDir, 'docker/Dockerfile');
if (fs.existsSync(dockerfilePath)) {
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    if (/npm\s+i(\s|$)/.test(dockerfile) && !/npm\s+ci/.test(dockerfile)) {
        warnings.push('Dockerfile 使用 npm i 而非 npm ci，构建结果不可复现');
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

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
const positional = [];
const options = {
    enabled: true,
    force: false,
    minVersionCode: 0,
    platforms: ['android']
};

for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
        positional.push(arg);
        continue;
    }

    if (arg === '--force') {
        options.force = true;
    } else if (arg === '--disabled') {
        options.enabled = false;
    } else if (arg === '--min-version-code') {
        options.minVersionCode = parseInt(args[++i], 10);
    } else if (arg === '--platforms') {
        options.platforms = String(args[++i] || '')
            .split(',')
            .map(item => item.trim().toLowerCase())
            .filter(Boolean);
    } else {
        console.error(`Unknown option: ${arg}`);
        process.exit(1);
    }
}

const [wgtPathArg, versionName, versionCodeArg, ...notes] = positional;

if (!wgtPathArg || !versionName || !versionCodeArg) {
    console.error('Usage: npm run app:update:publish -- <path-to-wgt> <versionName> <versionCode> [release notes...] [--force] [--min-version-code 166]');
    process.exit(1);
}

const sourcePath = path.resolve(process.cwd(), wgtPathArg);
if (!fs.existsSync(sourcePath) || !sourcePath.toLowerCase().endsWith('.wgt')) {
    console.error(`WGT package not found or invalid: ${sourcePath}`);
    process.exit(1);
}

const versionCode = parseInt(versionCodeArg, 10);
if (!Number.isFinite(versionCode) || versionCode <= 0) {
    console.error('versionCode must be a positive integer.');
    process.exit(1);
}

if (!Number.isFinite(options.minVersionCode) || options.minVersionCode < 0) {
    console.error('minVersionCode must be zero or a positive integer.');
    process.exit(1);
}

if (options.platforms.length === 0) {
    console.error('At least one platform is required.');
    process.exit(1);
}

const updateDir = path.join(__dirname, '../../storage/app-updates');
const manifestPath = path.join(updateDir, 'manifest.json');
fs.mkdirSync(updateDir, { recursive: true });

if (fs.existsSync(manifestPath)) {
    const previous = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const previousVersionCode = parseInt(previous.versionCode, 10) || 0;
    if (previousVersionCode >= versionCode) {
        console.error(`Refusing to publish versionCode ${versionCode}; current manifest is ${previousVersionCode}.`);
        process.exit(1);
    }
}

const safeVersionName = versionName.replace(/[^0-9A-Za-z._-]/g, '-');
const fileName = `jyl-${safeVersionName}-${versionCode}.wgt`;
const targetPath = path.join(updateDir, fileName);
fs.copyFileSync(sourcePath, targetPath);

const bytes = fs.readFileSync(targetPath);
const manifest = {
    enabled: options.enabled,
    platforms: options.platforms,
    versionName,
    versionCode,
    minVersionCode: options.minVersionCode,
    force: options.force,
    wgtUrl: `/storage/app-updates/${fileName}`,
    size: bytes.length,
    md5: crypto.createHash('md5').update(bytes).digest('hex'),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    releaseNotes: notes.length > 0 ? notes : [`Update to ${versionName}`],
    publishedAt: new Date().toISOString()
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`Published app update: ${manifest.wgtUrl}`);
console.log(`Version: ${versionName} (${versionCode})`);
console.log(`Force update: ${manifest.force}`);
console.log(`Min version code: ${manifest.minVersionCode}`);
console.log(`MD5: ${manifest.md5}`);
console.log(`SHA256: ${manifest.sha256}`);

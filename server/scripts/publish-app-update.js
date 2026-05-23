const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

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

const readWgtManifest = (filePath) => {
    const bytes = fs.readFileSync(filePath);
    const eocdSignature = 0x06054b50;
    const centralSignature = 0x02014b50;
    const localSignature = 0x04034b50;
    let eocdOffset = -1;

    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i -= 1) {
        if (bytes.readUInt32LE(i) === eocdSignature) {
            eocdOffset = i;
            break;
        }
    }

    if (eocdOffset === -1) {
        throw new Error('Invalid WGT package: ZIP footer was not found.');
    }

    const entryCount = bytes.readUInt16LE(eocdOffset + 10);
    let cursor = bytes.readUInt32LE(eocdOffset + 16);

    for (let index = 0; index < entryCount; index += 1) {
        if (bytes.readUInt32LE(cursor) !== centralSignature) {
            throw new Error('Invalid WGT package: ZIP directory is corrupt.');
        }

        const method = bytes.readUInt16LE(cursor + 10);
        const compressedSize = bytes.readUInt32LE(cursor + 20);
        const nameLength = bytes.readUInt16LE(cursor + 28);
        const extraLength = bytes.readUInt16LE(cursor + 30);
        const commentLength = bytes.readUInt16LE(cursor + 32);
        const localOffset = bytes.readUInt32LE(cursor + 42);
        const entryName = bytes.toString('utf8', cursor + 46, cursor + 46 + nameLength);

        if (entryName === 'manifest.json') {
            if (bytes.readUInt32LE(localOffset) !== localSignature) {
                throw new Error('Invalid WGT package: manifest local header is corrupt.');
            }

            const localNameLength = bytes.readUInt16LE(localOffset + 26);
            const localExtraLength = bytes.readUInt16LE(localOffset + 28);
            const dataStart = localOffset + 30 + localNameLength + localExtraLength;
            const data = bytes.subarray(dataStart, dataStart + compressedSize);
            const manifestBytes = method === 0
                ? data
                : method === 8
                    ? zlib.inflateRawSync(data)
                    : null;

            if (!manifestBytes) {
                throw new Error(`Unsupported ZIP compression method: ${method}`);
            }

            return JSON.parse(manifestBytes.toString('utf8'));
        }

        cursor += 46 + nameLength + extraLength + commentLength;
    }

    throw new Error('manifest.json not found in WGT package.');
};

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

let wgtManifest;
try {
    wgtManifest = readWgtManifest(sourcePath);
} catch (err) {
    console.error(`Unable to inspect WGT manifest: ${err.message}`);
    process.exit(1);
}

const wgtVersionName = String(wgtManifest.version?.name || '');
const wgtVersionCode = parseInt(wgtManifest.version?.code, 10);
if (wgtVersionName !== versionName || wgtVersionCode !== versionCode) {
    console.error('WGT manifest version does not match publish arguments.');
    console.error(`Expected: ${versionName} (${versionCode})`);
    console.error(`Actual:   ${wgtVersionName} (${wgtManifest.version?.code || ''})`);
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
    if (!options.force && previousVersionCode >= versionCode) {
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

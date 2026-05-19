const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'dist/build/app');
const releaseDir = path.join(rootDir, 'dist/release');
const manifestPath = path.join(rootDir, 'src/manifest.json');

if (!fs.existsSync(appDir)) {
  console.error('App build output was not found. Run npm run build:app first.');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const versionName = String(manifest.versionName || '0.0.0');
const versionCode = String(manifest.versionCode || '0');
const fileName = `jyl-${versionName}-${versionCode}.wgt`;
const outputPath = path.join(releaseDir, fileName);

fs.mkdirSync(releaseDir, { recursive: true });

const zip = new AdmZip();
zip.addLocalFolder(appDir);
zip.writeZip(outputPath);

const bytes = fs.readFileSync(outputPath);
const size = bytes.length;
const md5 = crypto.createHash('md5').update(bytes).digest('hex');
const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');

const meta = {
  file: outputPath,
  versionName,
  versionCode: parseInt(versionCode, 10),
  size,
  md5,
  sha256,
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(`${outputPath}.json`, JSON.stringify(meta, null, 2));

console.log(`WGT package created: ${outputPath}`);
console.log(`Version: ${versionName} (${versionCode})`);
console.log(`Size: ${size}`);
console.log(`MD5: ${md5}`);
console.log(`SHA256: ${sha256}`);

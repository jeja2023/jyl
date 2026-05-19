const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(fileName) {
  const filePath = path.join(rootDir, fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile('.env.app');
loadEnvFile('.env.production');

const apiBase = (process.env.VITE_API_BASE || '').trim();

if (!apiBase) {
  console.error('VITE_API_BASE is required before building the Android app.');
  console.error('Create client/.env.app from .env.app.example and set a phone-accessible HTTPS API URL.');
  process.exit(1);
}

let parsedUrl;
try {
  parsedUrl = new URL(apiBase);
} catch (error) {
  console.error(`VITE_API_BASE is not a valid URL: ${apiBase}`);
  process.exit(1);
}

const forbiddenHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
if (forbiddenHosts.has(parsedUrl.hostname)) {
  console.error(`VITE_API_BASE cannot point to ${parsedUrl.hostname} for an Android APK.`);
  console.error('Use a deployed backend domain or a LAN IP address that the phone can reach.');
  process.exit(1);
}

console.log(`Building Android app resources with VITE_API_BASE=${apiBase}`);

const result = spawnSync('npx', ['uni', 'build', '-p', 'app'], {
  cwd: rootDir,
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status || 0);

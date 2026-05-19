const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const sourcePath = path.join(rootDir, 'src/static/logo.ico');
const outputDir = path.join(rootDir, 'src/static/app-icons');

if (!fs.existsSync(sourcePath)) {
  console.error(`Icon source not found: ${sourcePath}`);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

const script = `
from PIL import Image
from pathlib import Path

source = Path(r"${sourcePath.replace(/\\/g, '\\\\')}")
output = Path(r"${outputDir.replace(/\\/g, '\\\\')}")
sizes = {
    "icon-hdpi.png": 72,
    "icon-xhdpi.png": 96,
    "icon-xxhdpi.png": 144,
    "icon-xxxhdpi.png": 192,
}

img = Image.open(source)
try:
    img.seek(img.n_frames - 1)
except Exception:
    pass
img = img.convert("RGBA")

for name, size in sizes.items():
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(output / name, "PNG")
`;

const result = spawnSync('python', ['-c', script], {
  cwd: rootDir,
  stdio: 'inherit'
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

console.log(`Generated Android icons in ${outputDir}`);

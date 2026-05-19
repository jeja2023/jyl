import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import fs from 'fs'
import path from 'path'

// 优先从根目录“更新日志.md”中自动提取最新的版本号，以确保与更新日志完全同步；若失败则回退读取 manifest.json
let appVersion = '1.8.0'
try {
  const changelogPath = path.resolve(__dirname, '../更新日志.md')
  let found = false
  if (fs.existsSync(changelogPath)) {
    const content = fs.readFileSync(changelogPath, 'utf-8')
    const match = content.match(/##\s*\[(\d+\.\d+\.\d+)\]/)
    if (match && match[1]) {
      appVersion = match[1]
      found = true
    }
  }
  if (!found) {
    const manifestPath = path.resolve(__dirname, 'src/manifest.json')
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      appVersion = manifest.versionName || '1.8.0'
    }
  }
} catch (e) {
  // 读取异常时使用默认版本
}

// 自定义插件：将 uni-app 框架引用的 DCloud CDN 图片替换为本地资源
function replaceCdnPlugin() {
  return {
    name: 'replace-dcloud-cdn',
    enforce: 'post',
    transform(code, id) {
      if (id.endsWith('.css') || id.includes('.css')) {
        return code.replace(
          /https?:\/\/cdn\.dcloud\.net\.cn\/img\/shadow-grey\.png/g,
          '/static/shadow-grey.png'
        );
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [
    uni(),
    replaceCdnPlugin()
  ],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3000',
      '/storage': 'http://localhost:3000',
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 使用 modern-compiler 以消除 legacy-js-api 警告
        api: 'modern-compiler',
        // 忽略第三方库的废弃警告
        silenceDeprecations: ['import', 'legacy-js-api'],
      }
    }
  },
  build: {
    // 自动清理 dist 目录，防止旧的引用的旧 Hash 文件堆积
    emptyOutDir: true,
  }
})

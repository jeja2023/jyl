import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

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

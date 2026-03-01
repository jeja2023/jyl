import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import { VitePWA } from 'vite-plugin-pwa'

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
    replaceCdnPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,vue}'],
        // 关键：由于 uni-app 的 H5 产物结构特殊，需要确保缓存了 index.html
        navigateFallback: '/index.html'
      },
      manifest: {
        name: '甲友乐',
        short_name: '甲友乐',
        description: '专为甲状腺病友设计的健康管理工具',
        theme_color: '#3E7BFF',
        background_color: '#3E7BFF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'static/logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'static/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
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
  }
})

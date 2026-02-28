import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
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

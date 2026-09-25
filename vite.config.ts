import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // 关闭 sourcemap：此前 'hidden' 仍会产出 .map 并被同步进发布包，
    // 导致线上可直接下载 /assets/*.js.map 拿到完整源码（实测 200 / 860KB）
    sourcemap: false,
  },
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        // 关键：不预缓存 HTML 与图标
        // 原因：默认配置会把 index.html 也 precache，此后 Service Worker 一直
        // 拦截导航请求返回缓存的旧 HTML —— 部署再多次，用户拿到的仍是旧页面
        // （表现为：换了 favicon / 发了新版本，标签页图标和内容都不更新）
        globPatterns: ['**/*.{js,css,woff,woff2}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: '小账本 - 温暖的生活记账',
        short_name: '小账本',
        description: '记录生活的每一笔温暖',
        theme_color: '#6C63FF',
        background_color: '#F8F6FF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png?v=2',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png?v=2',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png?v=2',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

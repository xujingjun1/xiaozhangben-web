<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

const navItems = [
  { path: '/', icon: 'home', label: '首页' },
  { path: '/report', icon: 'bar_chart', label: '报表' },
  { path: '/budget', icon: 'account_balance_wallet', label: '预算' },
  { path: '/add', icon: 'add_circle', label: '记一笔' },
  { path: '/import', icon: 'document_scanner', label: '智能导入' },
  { path: '/settings', icon: 'settings', label: '设置' },
  { path: '/download', icon: 'get_app', label: '下载 App' },
]

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <aside class="desktop-sidebar">
    <div class="sidebar-logo">
      <div class="sidebar-logo-icon">
        <span class="text-2xl">💰</span>
      </div>
      <div class="sidebar-logo-text">
        <h1 class="text-lg font-bold text-txt">小账本</h1>
        <p class="text-[11px] text-txt-hint">温暖的生活记账</p>
      </div>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.path"
        @click="router.push(item.path)"
        class="sidebar-nav-item"
        :class="isActive(item.path) ? 'sidebar-nav-item--active' : ''"
      >
        <span class="material-icons-round text-xl" :class="isActive(item.path) ? 'text-primary' : 'text-txt-hint'">
          {{ item.icon }}
        </span>
        <span class="sidebar-nav-label" :class="isActive(item.path) ? 'text-txt font-semibold' : 'text-txt-secondary'">
          {{ item.label }}
        </span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-footer-item">
        <span class="material-icons-round text-lg text-txt-hint">info</span>
        <span class="text-[11px] text-txt-hint">v1.0.0</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.desktop-sidebar {
  width: 220px;
  min-width: 220px;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #f0edff;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 50;
  overflow-y: auto;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px 20px;
  border-bottom: 1px solid #f0edff;
}

.sidebar-logo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #6C63FF 0%, #9D97FF 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
}

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}

.sidebar-nav-item:hover {
  background: #f0edff;
}

.sidebar-nav-item--active {
  background: linear-gradient(135deg, rgba(108, 99, 255, 0.08) 0%, rgba(157, 151, 255, 0.08) 100%);
}

.sidebar-nav-label {
  font-size: 14px;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0edff;
}

.sidebar-footer-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

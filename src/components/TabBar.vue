<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { path: '/', icon: 'home', label: '首页' },
  { path: '/report', icon: 'bar_chart', label: '报表' },
  { path: '/budget', icon: 'account_balance_wallet', label: '预算' },
  { path: '/settings', icon: 'person', label: '我的' },
]

const addIndex = 2 // +按钮在报表之后、预算之前

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>

<template>
  <div class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-lg border-t border-black/5 z-40">
    <div class="flex items-center justify-around px-2 py-2">
      <template v-for="(tab, i) in tabs" :key="tab.path">
        <!-- Add Button (after 首页) -->
        <div v-if="i === addIndex" class="relative -mt-6">
          <button
            @click="router.push('/add')"
            class="w-13 h-13 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center shadow-lg shadow-primary/40 active:scale-95 transition-transform"
            style="width: 52px; height: 52px;"
          >
            <span class="material-icons-round text-white text-[28px]">add</span>
          </button>
        </div>

        <button
          @click="router.push(tab.path)"
          class="flex flex-col items-center py-1 px-3 transition-colors"
          :class="isActive(tab.path) ? 'text-primary' : 'text-txt-hint'"
        >
          <span class="material-icons-round text-[22px]">{{ tab.icon }}</span>
          <span class="text-[10px] mt-0.5" :class="isActive(tab.path) ? 'font-semibold' : ''">{{ tab.label }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

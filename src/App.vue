<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import Sidebar from './components/Sidebar.vue'
import { useDesktop } from './composables/useDesktop'
import { startReminderLoop, stopReminderLoop } from './utils/reminder'

const { isDesktop } = useDesktop()
const route = useRoute()

// 落地页/登录页是全屏独立页：不渲染侧边栏和底部 Tab，也不保留侧边栏的 220px 占位
const barePages = ['landing', 'login']
const isBarePage = computed(() => barePages.includes(route.name as string))
const showSidebar = computed(() => isDesktop.value && !isBarePage.value)
const showTabBar = computed(() => !isDesktop.value && !isBarePage.value)
const shellClass = computed(() =>
  showSidebar.value ? 'app-shell--desktop' : isBarePage.value ? 'app-shell--bare' : 'app-shell--mobile'
)
const mainClass = computed(() =>
  showSidebar.value ? 'app-main--desktop' : isBarePage.value ? 'app-main--bare' : 'app-main--mobile'
)

onMounted(() => startReminderLoop())
onUnmounted(() => stopReminderLoop())
</script>

<template>
  <div class="app-shell" :class="shellClass">
    <Sidebar v-if="showSidebar" />
    <main class="app-main" :class="mainClass">
      <RouterView />
    </main>
    <TabBar v-if="showTabBar" />
  </div>
</template>

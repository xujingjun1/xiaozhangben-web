<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import Sidebar from './components/Sidebar.vue'
import { useDesktop } from './composables/useDesktop'

const { isDesktop } = useDesktop()
const route = useRoute()
const hideTabBar = ['login'].includes(route.name as string)
</script>

<template>
  <div class="app-shell" :class="isDesktop ? 'app-shell--desktop' : 'app-shell--mobile'">
    <Sidebar v-if="isDesktop" />
    <main class="app-main" :class="isDesktop ? 'app-main--desktop' : 'app-main--mobile'">
      <RouterView />
    </main>
    <TabBar v-if="!isDesktop && !hideTabBar" />
  </div>
</template>
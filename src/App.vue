<script setup lang="ts">
import { RouterView } from 'vue-router'
import TabBar from './components/TabBar.vue'
</script>

<template>
  <div class="min-h-screen bg-background max-w-[480px] mx-auto relative pb-20">
    <RouterView v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </RouterView>
    <TabBar />
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

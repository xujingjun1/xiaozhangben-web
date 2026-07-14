<script setup lang="ts">
import { computed } from 'vue'
import { getCategoryInfo, formatMoney } from '@/utils/helpers'

const props = defineProps<{ categoryTotals: Record<string, number> }>()

const sorted = computed(() => {
  const entries = Object.entries(props.categoryTotals)
  entries.sort((a, b) => b[1] - a[1])
  return entries
})

const total = computed(() => sorted.value.reduce((s, e) => s + e[1], 0))

const top6 = computed(() => sorted.value.slice(0, 6))

const pieStyle = computed(() => {
  if (!top6.value.length) return {}
  let cumulative = 0
  const stops: string[] = []
  top6.value.forEach(([name, amount]) => {
    const info = getCategoryInfo(name)
    const start = cumulative
    cumulative += (amount / total.value) * 100
    stops.push(`${info.color} ${start}% ${cumulative}%`)
  })
  if (cumulative < 100) stops.push(`#F0EDFF ${cumulative}% 100%`)
  return {
    background: `conic-gradient(${stops.join(', ')})`,
    borderRadius: '50%',
  }
})
</script>

<template>
  <div class="bg-white rounded-2xl p-5">
    <!-- Donut Chart -->
    <div class="flex justify-center mb-4">
      <div class="relative w-44 h-44">
        <div class="w-44 h-44" :style="pieStyle"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center">
            <p class="text-lg font-bold text-txt">{{ formatMoney(total) }}</p>
            <p class="text-[10px] text-txt-secondary">总计</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="space-y-2.5">
      <div v-for="[name, amount] in top6" :key="name" class="flex items-center gap-2.5">
        <div class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ backgroundColor: getCategoryInfo(name).color }"></div>
        <span class="material-icons-round text-sm" :style="{ color: getCategoryInfo(name).color }">{{ getCategoryInfo(name).icon }}</span>
        <span class="text-sm text-txt font-medium flex-1">{{ name }}</span>
        <span class="text-sm font-semibold text-txt">{{ formatMoney(amount) }}</span>
        <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded"
          :style="{ backgroundColor: getCategoryInfo(name).color + '15', color: getCategoryInfo(name).color }">
          {{ total > 0 ? Math.round(amount / total * 100) : 0 }}%
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatMoneyCompact, getCategoryInfo } from '@/utils/helpers'

defineProps<{
  todayTotal: number
  monthTotal: number
  monthIncome: number
  categoryTotals: Record<string, number>
}>()

function getTopCategory(totals: Record<string, number>, total: number) {
  const entries = Object.entries(totals)
  if (!entries.length) return null
  const sorted = entries.sort((a, b) => b[1] - a[1])
  const [name, amount] = sorted[0]
  return { name, amount, percent: total > 0 ? Math.round(amount / total * 100) : 0 }
}
</script>

<template>
  <div class="bg-gradient-to-br from-[#667EEA] to-[#764BA2] rounded-3xl p-5 text-white shadow-lg shadow-[#667EEA]/30">
    <!-- Title -->
    <div class="flex items-center gap-2.5 mb-4">
      <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
        <span class="material-icons-round text-base">wb_sunny</span>
      </div>
      <span class="text-white/70 text-sm">每日消费卡片</span>
    </div>

    <!-- Today Total -->
    <div class="mb-1">
      <div class="flex items-end gap-1">
        <span class="text-lg font-semibold">¥</span>
        <span class="text-[36px] font-bold leading-none">{{ todayTotal.toFixed(2) }}</span>
      </div>
      <p class="text-white/50 text-xs mt-1">今日消费</p>
    </div>

    <hr class="border-white/20 my-3" />

    <!-- Monthly Stats -->
    <div class="flex justify-between">
      <div>
        <p class="text-white/40 text-[10px]">本月支出</p>
        <p class="text-sm font-semibold mt-0.5">{{ formatMoneyCompact(monthTotal) }}</p>
      </div>
      <div>
        <p class="text-white/40 text-[10px]">本月收入</p>
        <p class="text-sm font-semibold mt-0.5">{{ formatMoneyCompact(monthIncome) }}</p>
      </div>
      <div>
        <p class="text-white/40 text-[10px]">结余</p>
        <p class="text-sm font-semibold mt-0.5">{{ formatMoneyCompact(monthIncome - monthTotal) }}</p>
      </div>
    </div>

    <!-- Top Category -->
    <div v-if="getTopCategory(categoryTotals, monthTotal)" class="mt-3 bg-white/15 rounded-xl p-2.5 flex items-center gap-2">
      <span class="material-icons-round text-sm" :style="{ color: getCategoryInfo(getTopCategory(categoryTotals, monthTotal)!.name).color }">
        {{ getCategoryInfo(getTopCategory(categoryTotals, monthTotal)!.name).icon }}
      </span>
      <span class="text-white/70 text-xs">最大开销: {{ getTopCategory(categoryTotals, monthTotal)!.name }}</span>
      <span class="ml-auto text-xs font-semibold">{{ formatMoneyCompact(getTopCategory(categoryTotals, monthTotal)!.amount) }} ({{ getTopCategory(categoryTotals, monthTotal)!.percent }}%)</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStore } from '@/stores/expense'
import { getCategoryInfo, formatMoneyCompact } from '@/utils/helpers'

const store = useExpenseStore()
const router = useRouter()

// 是否为当前真实月份（预警只对当前月份有意义）
const isCurrentMonth = computed(() => {
  const now = new Date()
  return store.selectedYear === now.getFullYear() && store.selectedMonth === now.getMonth() + 1
})

const show = computed(() =>
  isCurrentMonth.value && store.budgetStatus.length &&
  (store.overBudgets.length > 0 || store.warningBudgets.length > 0)
)

const overallPct = computed(() =>
  store.totalBudget > 0 ? Math.min(Math.round((store.totalSpent / store.totalBudget) * 100), 999) : 0
)

// 优先展示超支项，其次预警项，最多 3 条
const items = computed(() => {
  const sorted = [...store.budgetStatus].sort((a: any, b: any) => b.pct - a.pct)
  return sorted.filter((b: any) => b.level !== 'ok').slice(0, 3) as any[]
})

const isExceeded = computed(() => store.overBudgets.length > 0)
</script>

<template>
  <div v-if="show" class="rounded-2xl p-4 mb-4 border transition-all"
    :class="isExceeded
      ? 'bg-error/5 border-error/20'
      : 'bg-amber-50 border-amber-200'">

    <!-- 标题行 -->
    <div class="flex items-center gap-2.5 mb-3">
      <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        :class="isExceeded ? 'bg-error/10' : 'bg-amber-100'">
        <span class="material-icons-round text-base" :class="isExceeded ? 'text-error' : 'text-amber-500'">
          {{ isExceeded ? 'warning' : 'notifications_active' }}
        </span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold" :class="isExceeded ? 'text-error' : 'text-amber-600'">
          {{ isExceeded ? '本月预算已超支' : '本月预算快用完了' }}
        </p>
        <p class="text-xs text-txt-secondary truncate">
          已用 {{ formatMoneyCompact(store.totalSpent) }} / 预算 {{ formatMoneyCompact(store.totalBudget) }}（{{ overallPct }}%）
        </p>
      </div>
      <button @click="router.push('/budget')"
        class="text-xs font-medium px-2.5 py-1.5 rounded-lg active:scale-95 transition"
        :class="isExceeded ? 'text-error bg-error/10' : 'text-amber-600 bg-amber-100'">
        调整预算
      </button>
    </div>

    <!-- 总进度条 -->
    <div class="h-2 rounded-full overflow-hidden mb-3"
      :class="isExceeded ? 'bg-error/10' : 'bg-amber-100'">
      <div class="h-full rounded-full transition-all duration-500"
        :class="isExceeded ? 'bg-gradient-to-r from-error to-error/70' : 'bg-gradient-to-r from-amber-400 to-amber-300'"
        :style="{ width: Math.min(overallPct, 100) + '%' }"></div>
    </div>

    <!-- 分类明细 -->
    <div class="space-y-2">
      <div v-for="b in items" :key="b.id" class="flex items-center gap-2.5">
        <span class="material-icons-round text-sm shrink-0" :style="{ color: getCategoryInfo(b.category).color }">
          {{ getCategoryInfo(b.category).icon }}
        </span>
        <span class="text-xs text-txt-secondary w-14 shrink-0 truncate">{{ b.category }}</span>
        <div class="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
            :class="b.level === 'exceeded' ? 'bg-error' : 'bg-amber-400'"
            :style="{ width: Math.min(b.pct, 100) + '%' }"></div>
        </div>
        <span class="text-xs font-semibold shrink-0" :class="b.level === 'exceeded' ? 'text-error' : 'text-amber-600'">
          {{ b.pct }}%
        </span>
        <span class="text-[11px] text-txt-hint shrink-0">
          {{ b.level === 'exceeded' ? '超 ' + formatMoneyCompact(b.spent - b.amount) : '剩 ' + formatMoneyCompact(b.amount - b.spent) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useExpenseStore } from '@/stores/expense'
import { formatMoney, getCategoryInfo, categories } from '@/utils/helpers'
import dayjs from 'dayjs'
import type { Budget } from '@/db'

const store = useExpenseStore()
const showAddModal = ref(false)
const newBudgetCategory = ref('')
const newBudgetAmount = ref('')

onMounted(() => store.init())

function prevMonth() {
  if (store.selectedMonth === 1) { store.selectedMonth = 12; store.selectedYear-- }
  else store.selectedMonth--
  store.loadBudgets()
}

function nextMonth() {
  const now = dayjs()
  if (store.selectedYear < now.year() || (store.selectedYear === now.year() && store.selectedMonth < now.month() + 1)) {
    if (store.selectedMonth === 12) { store.selectedMonth = 1; store.selectedYear++ }
    else store.selectedMonth++
    store.loadBudgets()
  }
}

function getBudgetSpent(category: string): number {
  return store.monthExpenses
    .filter(e => !e.isIncome && e.category === category)
    .reduce((s, e) => s + e.amount, 0)
}

const progressPercent = computed(() =>
  store.totalBudget > 0 ? Math.min((store.totalSpent / store.totalBudget) * 100, 100) : 0
)

const isOverBudget = computed(() => store.totalSpent > store.totalBudget && store.totalBudget > 0)

async function addBudget() {
  const num = parseFloat(newBudgetAmount.value)
  if (!newBudgetCategory.value || !num || num <= 0) return
  await store.addBudget({
    category: newBudgetCategory.value,
    amount: num,
    month: store.selectedMonth,
    year: store.selectedYear,
  })
  showAddModal.value = false
  newBudgetCategory.value = ''
  newBudgetAmount.value = ''
}

</script>

<template>
  <div class="px-5 pt-4 pb-24">
    <div class="flex justify-between items-center mb-5">
      <h1 class="text-2xl font-bold text-txt">预算管理</h1>
      <span class="material-icons-round text-primary text-[28px]">account_balance_wallet</span>
    </div>

    <!-- Month Selector -->
    <div class="flex items-center justify-between mb-5">
      <button @click="prevMonth" class="p-2 rounded-xl hover:bg-surface"><span class="material-icons-round text-txt-secondary">chevron_left</span></button>
      <span class="text-base font-semibold text-txt">{{ store.selectedYear }}年{{ store.selectedMonth }}月</span>
      <button @click="nextMonth" class="p-2 rounded-xl hover:bg-surface"><span class="material-icons-round text-txt-secondary">chevron_right</span></button>
    </div>

    <!-- Budget Overview -->
    <div class="bg-white rounded-3xl p-6 shadow-sm mb-6">
      <div class="flex justify-center mb-5">
        <div class="relative w-36 h-36">
          <svg class="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#F0EDFF" stroke-width="12" stroke-linecap="round" />
            <circle cx="60" cy="60" r="52" fill="none"
              :stroke="isOverBudget ? '#FF6B6B' : '#6C63FF'"
              stroke-width="12" stroke-linecap="round"
              :stroke-dasharray="326.7"
              :stroke-dashoffset="326.7 - (326.7 * progressPercent / 100)"
              class="transition-all duration-700"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-3xl font-bold" :class="isOverBudget ? 'text-error' : 'text-primary'">{{ Math.round(progressPercent) }}%</span>
            <span class="text-xs text-txt-secondary">{{ isOverBudget ? '已超支' : '已使用' }}</span>
          </div>
        </div>
      </div>
      <div class="flex justify-around">
        <div class="text-center">
          <p class="text-xs text-txt-secondary">总预算</p>
          <p class="text-base font-bold text-primary mt-1">{{ formatMoney(store.totalBudget) }}</p>
        </div>
        <div class="w-px bg-surface"></div>
        <div class="text-center">
          <p class="text-xs text-txt-secondary">已支出</p>
          <p class="text-base font-bold text-txt mt-1">{{ formatMoney(store.totalSpent) }}</p>
        </div>
        <div class="w-px bg-surface"></div>
        <div class="text-center">
          <p class="text-xs text-txt-secondary">剩余</p>
          <p class="text-base font-bold mt-1" :class="(store.totalBudget - store.totalSpent) > 0 ? 'text-income' : 'text-error'">{{ formatMoney(Math.max(store.totalBudget - store.totalSpent, 0)) }}</p>
        </div>
      </div>
    </div>

    <!-- Budget List -->
    <h2 class="text-base font-semibold text-txt mb-3">分类预算</h2>
    <div v-if="store.budgets.length" class="space-y-3 mb-4">
      <div v-for="budget in store.budgets" :key="budget.id"
        class="bg-white rounded-2xl p-4 shadow-sm"
        :class="getBudgetSpent(budget.category) > budget.amount ? 'border border-error/30' : ''"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center"
            :style="{ backgroundColor: getCategoryInfo(budget.category).color + '18' }">
            <span class="material-icons-round text-xl"
              :style="{ color: getCategoryInfo(budget.category).color }">{{ getCategoryInfo(budget.category).icon }}</span>
          </div>
          <div class="flex-1">
            <p class="text-sm font-semibold text-txt">{{ budget.category }}</p>
            <p class="text-xs text-txt-secondary">{{ formatMoney(getBudgetSpent(budget.category)) }} / {{ formatMoney(budget.amount) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs" :class="getBudgetSpent(budget.category) > budget.amount ? 'text-error' : 'text-txt-secondary'">
              {{ getBudgetSpent(budget.category) > budget.amount ? '超支' : '剩余' }}
            </p>
            <p class="text-sm font-bold" :class="getBudgetSpent(budget.category) > budget.amount ? 'text-error' : 'text-income'">
              {{ formatMoney(Math.max(budget.amount - getBudgetSpent(budget.category), 0)) }}
            </p>
          </div>
        </div>
        <div class="w-full h-1.5 bg-surface rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
            :class="getBudgetSpent(budget.category) > budget.amount ? 'bg-error' : 'bg-primary'"
            :style="{ width: `${Math.min((getBudgetSpent(budget.category) / budget.amount) * 100, 100)}%` }">
          </div>
        </div>
        <div v-if="getBudgetSpent(budget.category) > budget.amount" class="flex items-center gap-1 mt-2">
          <span class="material-icons-round text-error text-sm">warning</span>
          <span class="text-xs text-error font-medium">已超支 {{ formatMoney(getBudgetSpent(budget.category) - budget.amount) }}</span>
        </div>
      </div>
    </div>
    <div v-else class="bg-white rounded-2xl p-8 flex flex-col items-center mb-4">
      <span class="material-icons-round text-5xl text-txt-hint/30">savings</span>
      <p class="text-txt-hint mt-3 text-sm">还没有设置预算</p>
      <p class="text-txt-hint/70 text-xs mt-1">添加预算，让消费更有计划</p>
    </div>

    <!-- Add Button -->
    <button @click="showAddModal = true"
      class="w-full py-3.5 border-2 border-primary/30 text-primary rounded-2xl text-sm font-semibold hover:bg-primary/5 transition">
      <span class="material-icons-round text-base align-middle mr-1">add</span>添加预算
    </button>

    <!-- Add Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-end justify-center">
        <div class="absolute inset-0 bg-black/30" @click="showAddModal = false"></div>
        <div class="relative bg-white rounded-t-3xl w-full max-w-[480px] p-6 z-10">
          <h3 class="text-xl font-bold text-txt mb-5">设置预算</h3>
          <p class="text-sm text-txt-secondary mb-2">选择分类</p>
          <div class="flex flex-wrap gap-2 mb-5">
            <button v-for="cat in categories" :key="cat.name"
              @click="newBudgetCategory = cat.name"
              class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border"
              :class="newBudgetCategory === cat.name
                ? 'border-current shadow-sm'
                : 'bg-surface border-transparent text-txt-secondary'"
              :style="newBudgetCategory === cat.name ? { color: cat.color, backgroundColor: cat.color + '15' } : {}">
              <span class="material-icons-round text-base">{{ cat.icon }}</span>{{ cat.name }}
            </button>
          </div>
          <p class="text-sm text-txt-secondary mb-2">预算金额</p>
          <input v-model="newBudgetAmount" type="number" placeholder="输入月度预算金额"
            class="w-full border border-surface rounded-xl px-4 py-3 text-lg font-bold text-primary outline-none focus:border-primary mb-5" />
          <button @click="addBudget"
            class="w-full py-3.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition">
            确认
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

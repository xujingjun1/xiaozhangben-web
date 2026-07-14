<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStore } from '@/stores/expense'
import { getWeekdayName, getGreeting, formatMoney, formatMoneyCompact } from '@/utils/helpers'
import DailySummary from '@/components/DailySummary.vue'
import ExpenseCard from '@/components/ExpenseCard.vue'

const store = useExpenseStore()
const router = useRouter()

onMounted(() => store.init())

// 激励名言
const quotes = [
  { text: '省钱不是不花钱，而是把钱花在值得的地方。', source: '生活智慧' },
  { text: '理财就是理生活。', source: '经典名言' },
  { text: '不积小流，无以成江海。', source: '荀子' },
  { text: '俭以养德，静以修身。', source: '诸葛亮' },
  { text: '吃不穷，穿不穷，算计不到就受穷。', source: '民间谚语' },
  { text: '财富不是目的，而是实现自由的工具。', source: '巴菲特' },
  { text: '今天存下的每一分钱，都是未来的底气。', source: '理财箴言' },
  { text: '记账是了解自己的开始。', source: '生活哲学' },
  { text: '会赚钱是本事，会花钱是智慧。', source: '生活智慧' },
  { text: '把钱用在刀刃上，生活才会有质量。', source: '生活哲学' },
  { text: '每日三省吾身：今天花了多少？花得值吗？', source: '论语新解' },
  { text: '种一棵树最好的时间是十年前，其次是现在。', source: '非洲谚语' },
  { text: '自律给我自由。', source: '健身哲学' },
  { text: '复利是世界第八大奇迹。', source: '爱因斯坦' },
  { text: '省下来的就是赚到的。', source: '理财箴言' },
]

// 根据日期选择名言（同一天显示同一条）
const todayQuote = quotes[new Date().getDate() % quotes.length]

</script>

<template>
  <div class="px-5 pt-4">
    <!-- Header -->
    <div class="mb-4">
      <p class="text-sm text-txt-secondary">{{ getGreeting() }}</p>
      <h1 class="text-2xl font-bold text-txt mt-1">{{ store.selectedMonth }}月{{ new Date().getDate() }}日 {{ getWeekdayName(new Date()) }}</h1>
      <!-- 每日名言 -->
      <div class="mt-2 px-3 py-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/10">
        <p class="text-xs text-txt-secondary leading-relaxed">
          <span class="material-icons-round text-sm text-primary/60 align-middle mr-1">format_quote</span>
          {{ todayQuote.text }}
          <span class="text-txt-hint ml-1">—— {{ todayQuote.source }}</span>
        </p>
      </div>
    </div>

    <!-- Daily Summary -->
    <DailySummary
      :today-total="store.todayTotal"
      :month-total="store.monthTotal"
      :month-income="store.monthIncome"
      :category-totals="store.categoryTotals"
    />

    <!-- Today's Expenses -->
    <div class="flex justify-between items-center mt-5 mb-3">
      <h2 class="text-base font-semibold text-txt">今日消费</h2>
      <span class="text-base font-bold text-expense">{{ formatMoney(store.todayTotal) }}</span>
    </div>

    <!-- Expense List -->
    <div v-if="store.todayExpenses.length" class="space-y-3 pb-4">
      <ExpenseCard
        v-for="expense in store.todayExpenses"
        :key="expense.id"
        :expense="expense"
        @delete="store.deleteExpense(expense.id!)"
        @click="router.push(`/add/${expense.id}`)"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-16">
      <span class="material-icons-round text-7xl text-txt-hint/30">receipt_long</span>
      <p class="text-txt-hint mt-4">今天还没有记账哦</p>
      <p class="text-txt-hint/70 text-sm mt-1">点击下方 + 开始记录生活</p>
    </div>
  </div>
</template>

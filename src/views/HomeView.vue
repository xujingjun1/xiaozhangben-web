<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExpenseStore } from '@/stores/expense'
import { useDesktop } from '@/composables/useDesktop'
import { useSecuritySettings } from '@/composables/useSecuritySettings'
import { getWeekdayName, getGreeting, formatMoney } from '@/utils/helpers'
import DailySummary from '@/components/DailySummary.vue'
import ExpenseCard from '@/components/ExpenseCard.vue'
import BudgetAlert from '@/components/BudgetAlert.vue'

const store = useExpenseStore()
const router = useRouter()
const { isDesktop } = useDesktop()

// === 账号安全引导：未设密保或恢复码时提示，关闭后当天不再出现 ===
const {
  securityEnabled, recoveryHasCode,
  loadSecurityQuestions, loadRecoveryStatus,
} = useSecuritySettings()
const securityTipChecked = ref(false)
const securityTipDismissed = ref(false)

function todayKey() { return new Date().toDateString() }

onMounted(async () => {
  await store.init()
  securityTipDismissed.value = localStorage.getItem('security_tip_dismissed') === todayKey()
  try {
    await Promise.all([loadSecurityQuestions(), loadRecoveryStatus()])
  } finally {
    securityTipChecked.value = true
  }
})

const showSecurityTip = computed(
  () => securityTipChecked.value && !securityTipDismissed.value
    && (!securityEnabled.value || !recoveryHasCode.value)
)

function dismissSecurityTip() {
  securityTipDismissed.value = true
  localStorage.setItem('security_tip_dismissed', todayKey())
}

function gotoSsecuritySettings() {
  dismissSecurityTip()
  router.push('/settings')
}

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

const todayQuote = quotes[new Date().getDate() % quotes.length]
</script>

<template>
  <div :class="isDesktop ? 'desktop-view' : 'px-5 pt-4'">
    <!-- Header -->
    <div class="mb-4">
      <p class="text-sm text-txt-secondary">{{ getGreeting() }}</p>
      <h1 class="text-2xl font-bold text-txt mt-1">{{ store.selectedMonth }}月{{ new Date().getDate() }}日 {{ getWeekdayName(new Date()) }}</h1>
      <div class="mt-2 px-3 py-2 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/10">
        <p class="text-xs text-txt-secondary leading-relaxed">
          <span class="material-icons-round text-sm text-primary/60 align-middle mr-1">format_quote</span>
          {{ todayQuote.text }}
          <span class="text-txt-hint ml-1">—— {{ todayQuote.source }}</span>
        </p>
      </div>
    </div>

    <!-- 账号安全引导 -->
    <div v-if="showSecurityTip" class="rounded-2xl bg-primary/5 border border-primary/15 p-4 mb-4 flex items-center gap-3">
      <span class="material-icons-round text-primary">shield</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-txt">建议设置密保问题和恢复码</p>
        <p class="text-xs text-txt-secondary">忘记密码时可用来自助找回，未设置将无法找回账号</p>
      </div>
      <button @click="gotoSsecuritySettings"
        class="shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-primary active:scale-95 transition">
        去设置
      </button>
      <button @click="dismissSecurityTip" class="shrink-0 w-6 h-6 flex items-center justify-center text-txt-hint hover:text-txt transition">
        <span class="material-icons-round text-lg">close</span>
      </button>
    </div>

    <!-- 预算预警横幅 -->
    <BudgetAlert />

    <!-- 加载失败提示 -->
    <div v-if="store.loadError" class="rounded-2xl bg-error/5 border border-error/20 p-4 mb-4 flex items-center gap-3">
      <span class="material-icons-round text-error">cloud_off</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-error">数据加载失败</p>
        <p class="text-xs text-txt-secondary truncate">{{ store.loadError }}</p>
      </div>
      <button @click="store.retry()"
        class="px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-error active:scale-95 transition">
        重试
      </button>
    </div>

    <!-- Desktop: two column layout -->
    <div :class="isDesktop ? 'desktop-grid' : ''">
      <!-- Left column -->
      <div>
        <!-- Loading skeleton -->
        <div v-if="store.loading" class="space-y-3">
          <div class="bg-white rounded-3xl p-5 animate-pulse">
            <div class="h-4 w-24 bg-surface rounded mb-4"></div>
            <div class="h-9 w-40 bg-surface rounded mb-3"></div>
            <div class="h-3 w-full bg-surface rounded"></div>
          </div>
        </div>
        <DailySummary
          v-else
          :today-total="store.todayTotal"
          :month-total="store.monthTotal"
          :month-income="store.monthIncome"
          :category-totals="store.categoryTotals"
        />
      </div>

      <!-- Right column: Today's Expenses -->
      <div>
        <div class="flex justify-between items-center mt-5 mb-3" :class="isDesktop ? 'mt-0' : ''">
          <h2 class="text-base font-semibold text-txt">今日消费</h2>
          <div class="flex items-center gap-3">
            <span class="text-base font-bold text-expense">{{ formatMoney(store.todayTotal) }}</span>
            <button v-if="store.todayExpenses.length || !store.loading"
              @click="router.push('/add')"
              class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center active:scale-90 transition"
              title="记一笔">
              <span class="material-icons-round text-lg">add</span>
            </button>
          </div>
        </div>

        <!-- 今日列表骨架屏 -->
        <div v-if="store.loading" class="space-y-3 pb-4">
          <div v-for="i in 2" :key="i" class="bg-white rounded-2xl p-4 animate-pulse">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-surface"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3.5 w-24 bg-surface rounded"></div>
                <div class="h-3 w-16 bg-surface rounded"></div>
              </div>
              <div class="h-4 w-14 bg-surface rounded"></div>
            </div>
          </div>
        </div>

        <div v-else-if="store.todayExpenses.length" class="space-y-3 pb-4">
          <ExpenseCard
            v-for="expense in store.todayExpenses"
            :key="expense.id"
            :expense="expense"
            @delete="store.deleteExpense(expense.id!)"
            @click="router.push('/add')"
          />
        </div>

        <div v-else class="flex flex-col items-center justify-center py-16">
          <span class="material-icons-round text-7xl text-txt-hint/30">receipt_long</span>
          <p class="text-txt-hint mt-4">今天还没有记账哦</p>
          <button @click="router.push('/add')"
            class="mt-4 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-light shadow-lg shadow-primary/30 active:scale-95 transition">
            记一笔
          </button>
        </div>

        <!-- 本月空状态引导 -->
        <div v-if="!store.loading && !store.loadError && !store.monthExpenses.length"
          class="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] p-5 mb-4">
          <div class="flex items-center gap-3">
            <span class="material-icons-round text-primary">emoji_objects</span>
            <div class="flex-1">
              <p class="text-sm font-semibold text-txt">{{ store.selectedMonth }}月还没有记录</p>
              <p class="text-xs text-txt-secondary mt-0.5">记满 7 天，就能看到你的消费趋势图了</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

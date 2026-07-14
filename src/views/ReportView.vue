<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useExpenseStore } from '@/stores/expense'
import { formatMoney, formatMoneyCompact, formatMoneyClean, getCategoryInfo, formatDate } from '@/utils/helpers'
import CategoryChart from '@/components/CategoryChart.vue'
import dayjs from 'dayjs'

const store = useExpenseStore()

onMounted(() => store.init())

function prevMonth() {
  if (store.selectedMonth === 1) {
    store.selectedMonth = 12
    store.selectedYear--
  } else {
    store.selectedMonth--
  }
  store.loadExpenses()
  store.loadBudgets()
}

function nextMonth() {
  const now = dayjs()
  if (store.selectedYear < now.year() || (store.selectedYear === now.year() && store.selectedMonth < now.month() + 1)) {
    if (store.selectedMonth === 12) {
      store.selectedMonth = 1
      store.selectedYear++
    } else {
      store.selectedMonth++
    }
    store.loadExpenses()
    store.loadBudgets()
  }
}

const sortedDaily = computed(() => {
  const entries = Object.entries(store.dailyTotals)
  entries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  return entries
})

const maxDaily = computed(() => {
  if (!sortedDaily.value.length) return 0
  return Math.max(...sortedDaily.value.map(e => e[1]))
})

// ========== 详情弹窗 ==========
const showDetail = ref(false)
const detailTitle = ref('')
const detailExpenses = ref<any[]>([])
const detailTotal = ref(0)

// 点击分类查看详情
function showCategoryDetail(category: string) {
  console.log(`[报表-详情] 点击分类: ${category}`)
  const info = getCategoryInfo(category)
  detailTitle.value = `${info.icon} ${category}消费明细`
  detailExpenses.value = store.expenses.filter(e => e.category === category)
  detailTotal.value = detailExpenses.value.reduce((sum, e) => sum + e.amount, 0)
  console.log(`[报表-详情] 该分类共 ${detailExpenses.value.length} 笔, 总计: ¥${detailTotal.value}`)
  showDetail.value = true
}

// 点击日期查看详情
function showDayDetail(day: string) {
  console.log(`[报表-详情] 点击日期: ${store.selectedYear}-${String(store.selectedMonth).padStart(2,'0')}-${day}`)
  detailTitle.value = `${store.selectedYear}年${store.selectedMonth}月${day}日 消费明细`
  detailExpenses.value = store.expenses.filter(e => {
    const d = dayjs(e.date)
    return d.year() === store.selectedYear && d.month() + 1 === store.selectedMonth && d.date() === parseInt(day)
  })
  detailTotal.value = detailExpenses.value.reduce((sum, e) => sum + e.amount, 0)
  console.log(`[报表-详情] 该日共 ${detailExpenses.value.length} 笔, 总计: ¥${detailTotal.value}`)
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
  detailExpenses.value = []
}

// 分类列表数据（用于显示和点击）
const categoryList = computed(() => {
  const total = Object.values(store.categoryTotals).reduce((s, v) => s + v, 0)
  return Object.entries(store.categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({
      name,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      ...getCategoryInfo(name)
    }))
})

</script>

<template>
  <div class="px-5 pt-4 pb-24">
    <h1 class="text-2xl font-bold text-txt mb-5">消费报表</h1>

    <!-- Month Selector -->
    <div class="flex items-center justify-between mb-5">
      <button @click="prevMonth" class="p-2 rounded-xl hover:bg-surface">
        <span class="material-icons-round text-txt-secondary">chevron_left</span>
      </button>
      <span class="text-base font-semibold text-txt">{{ store.selectedYear }}年{{ store.selectedMonth }}月</span>
      <button @click="nextMonth" class="p-2 rounded-xl hover:bg-surface">
        <span class="material-icons-round text-txt-secondary">chevron_right</span>
      </button>
    </div>

    <!-- Overview Card -->
    <div class="bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-5 text-white shadow-lg shadow-primary/30 mb-6">
      <div class="flex items-center gap-6 mb-4">
        <div class="flex-1">
          <p class="text-white/60 text-xs">总支出</p>
          <p class="text-2xl font-bold mt-1">{{ formatMoney(store.monthTotal) }}</p>
        </div>
        <div class="w-px h-10 bg-white/20"></div>
        <div class="flex-1">
          <p class="text-white/60 text-xs">总收入</p>
          <p class="text-2xl font-bold mt-1">{{ formatMoney(store.monthIncome) }}</p>
        </div>
      </div>
      <div class="bg-white/15 rounded-xl p-3 flex justify-between items-center">
        <span class="text-white/60 text-xs">结余</span>
        <span class="text-base font-semibold">{{ formatMoney(store.monthIncome - store.monthTotal) }}</span>
      </div>
    </div>

    <!-- Category Pie Chart -->
    <div v-if="Object.keys(store.categoryTotals).length" class="mb-6">
      <h2 class="text-base font-semibold text-txt mb-3">分类占比</h2>
      <CategoryChart :category-totals="store.categoryTotals" />
      <!-- 可点击的分类列表 -->
      <div class="bg-white rounded-2xl p-4 mt-3">
        <div
          v-for="cat in categoryList"
          :key="cat.name"
          @click="showCategoryDetail(cat.name)"
          class="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-surface cursor-pointer transition active:scale-[0.98]"
        >
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" :style="{ background: cat.color + '18' }">
            <span class="material-icons-round text-lg" :style="{ color: cat.color }">{{ cat.icon }}</span>
          </div>
          <span class="flex-1 text-sm text-txt font-medium">{{ cat.name }}</span>
          <span class="text-sm text-txt-secondary font-medium">¥{{ formatMoneyClean(cat.amount) }}</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium" :style="{ background: cat.color + '18', color: cat.color }">{{ cat.percent }}%</span>
          <span class="material-icons-round text-sm text-txt-hint">chevron_right</span>
        </div>
      </div>
    </div>

    <!-- Daily Trend -->
    <div v-if="sortedDaily.length" class="mb-6">
      <h2 class="text-base font-semibold text-txt mb-3">每日消费趋势</h2>
      <div class="bg-white rounded-2xl p-4">
        <div class="overflow-x-auto scrollbar-hide">
          <div class="flex items-end gap-0 h-44" :style="{ width: `${Math.max(sortedDaily.length * 42, 300)}px` }">
            <div
              v-for="[day, total] in sortedDaily"
              :key="day"
              @click="showDayDetail(day)"
              class="flex flex-col items-center cursor-pointer hover:bg-surface/50 rounded-lg py-1 px-1 transition active:scale-95 flex-shrink-0"
              style="min-width: 42px;"
            >
              <span class="text-[9px] text-txt-hint mb-1 whitespace-nowrap">{{ formatMoneyCompact(total) }}</span>
              <div
                class="w-5 rounded-t-md bg-gradient-to-t from-primary to-primary-light transition-all duration-500"
                :style="{ height: maxDaily > 0 ? `${(total / maxDaily) * 130}px` : '4px' }"
              ></div>
              <span class="text-[10px] text-txt-hint mt-1">{{ day }}日</span>
            </div>
          </div>
        </div>
        <p class="text-xs text-txt-hint text-center mt-3">
          <span class="material-icons-round text-sm align-middle mr-1">swipe</span>左右滑动查看更多 · 点击查看当日详情
        </p>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetail" class="fixed inset-0 z-[200] flex flex-col" @click.self="closeDetail">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeDetail"></div>
          <div class="relative bg-white w-full max-w-[480px] mx-auto mt-[10vh] max-h-[75vh] rounded-t-3xl flex flex-col overflow-hidden shadow-2xl animate-slide-up">
            <!-- 头部 -->
            <div class="px-5 pt-5 pb-3 border-b border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-bold text-txt">{{ detailTitle }}</h3>
                <button @click="closeDetail" class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
                  <span class="material-icons-round text-txt-hint text-xl">close</span>
                </button>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-sm text-txt-secondary">共 <span class="text-primary font-bold">{{ detailExpenses.length }}</span> 笔</span>
                <span class="text-sm text-txt-secondary">合计 <span class="text-red-500 font-bold">¥{{ formatMoneyClean(detailTotal) }}</span></span>
              </div>
            </div>
            <!-- 列表 -->
            <div class="flex-1 overflow-y-auto px-5 py-3">
              <div v-if="!detailExpenses.length" class="flex flex-col items-center py-10">
                <span class="material-icons-round text-4xl text-txt-hint/30">receipt_long</span>
                <p class="text-txt-hint mt-2 text-sm">暂无记录</p>
              </div>
              <div v-else>
                <div
                  v-for="(item, i) in detailExpenses"
                  :key="item.id || i"
                  class="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                >
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" :style="{ background: getCategoryInfo(item.category).color + '18' }">
                    <span class="material-icons-round text-lg" :style="{ color: getCategoryInfo(item.category).color }">{{ getCategoryInfo(item.category).icon }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-txt truncate">{{ item.description || getCategoryInfo(item.category).name }}</p>
                    <p class="text-xs text-txt-hint mt-0.5">{{ formatDate(item.date) }} · {{ item.category }}</p>
                    <p v-if="item.tags && item.tags.length" class="flex flex-wrap gap-1 mt-1">
                      <span v-for="tag in item.tags" :key="tag" class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/8 text-primary">#{{ tag }}</span>
                    </p>
                  </div>
                  <span class="text-sm font-bold text-red-500 whitespace-nowrap">-¥{{ formatMoneyClean(item.amount) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Empty -->
    <div v-if="!Object.keys(store.categoryTotals).length && !sortedDaily.length"
      class="flex flex-col items-center py-12">
      <span class="material-icons-round text-5xl text-txt-hint/30">show_chart</span>
      <p class="text-txt-hint mt-3 text-sm">暂无数据</p>
    </div>
  </div>
</template>

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { api } from '@/services/api'
import type { Expense } from '@/db'

export const useExpenseStore = defineStore('expense', () => {
  const expenses = ref<Expense[]>([])
  const budgets = ref<any[]>([])
  const selectedYear = ref(dayjs().year())
  const selectedMonth = ref(dayjs().month() + 1)
  const loading = ref(false)
  const loadError = ref('')
  const budgetError = ref('')

  const todayExpenses = computed(() => {
    const today = dayjs().format('YYYY-MM-DD')
    return expenses.value
      .filter(e => dayjs(e.date).format('YYYY-MM-DD') === today)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  })

  const todayTotal = computed(() =>
    todayExpenses.value.filter(e => !e.isIncome).reduce((s, e) => s + e.amount, 0)
  )

  const monthExpenses = computed(() =>
    expenses.value.filter(e => {
      const d = dayjs(e.date)
      return d.year() === selectedYear.value && d.month() + 1 === selectedMonth.value
    })
  )

  const monthTotal = computed(() =>
    monthExpenses.value.filter(e => !e.isIncome).reduce((s, e) => s + e.amount, 0)
  )

  const monthIncome = computed(() =>
    monthExpenses.value.filter(e => e.isIncome).reduce((s, e) => s + e.amount, 0)
  )

  const categoryTotals = computed(() => {
    const map: Record<string, number> = {}
    monthExpenses.value.filter(e => !e.isIncome).forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount
    })
    return map
  })

  const dailyTotals = computed(() => {
    const map: Record<string, number> = {}
    monthExpenses.value.filter(e => !e.isIncome).forEach(e => {
      const day = dayjs(e.date).date().toString()
      map[day] = (map[day] || 0) + e.amount
    })
    return map
  })

  const totalBudget = computed(() => budgets.value.reduce((s: number, b: any) => s + b.amount, 0))

  // 预算使用状态：每个分类的已花费金额、百分比与预警级别
  const budgetStatus = computed(() => budgets.value.map((b: any) => {
    const spent = monthExpenses.value
      .filter(e => !e.isIncome && e.category === b.category)
      .reduce((sum, e) => sum + e.amount, 0)
    const pct = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0
    const level: 'ok' | 'warning' | 'exceeded' = pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok'
    return { ...b, spent, pct, level }
  }))

  const overBudgets = computed(() => budgetStatus.value.filter((b: any) => b.level === 'exceeded'))
  const warningBudgets = computed(() => budgetStatus.value.filter((b: any) => b.level === 'warning'))

  const totalSpent = computed(() => {
    return budgets.value.reduce((s: number, b: any) => {
      const spent = monthExpenses.value
        .filter(e => !e.isIncome && e.category === b.category)
        .reduce((sum, e) => sum + e.amount, 0)
      return s + spent
    }, 0)
  })

  async function loadExpenses() {
    try {
      expenses.value = await api.getExpenses()
      loadError.value = ''
    } catch (e: any) {
      expenses.value = []
      loadError.value = e?.message || '数据加载失败，请检查网络或服务器地址'
    }
  }

  async function loadBudgets() {
    try {
      budgets.value = await api.getBudgets(selectedYear.value, selectedMonth.value)
      budgetError.value = ''
    } catch {
      budgets.value = []
      budgetError.value = '预算加载失败，请检查网络或服务器地址'
    }
  }

  async function addExpense(expense: Expense) {
    await api.addExpense(expense)
    await loadExpenses()
  }

  async function updateExpense(expense: Expense) {
    if (!expense.id) throw new Error('缺少记录 ID，无法更新')
    await api.updateExpense(expense.id, expense)
    await loadExpenses()
  }

  async function deleteExpense(id: string) {
    await api.deleteExpense(id)
    await loadExpenses()
  }

  async function addBudget(budget: any) {
    await api.addBudget({ ...budget, year: selectedYear.value, month: selectedMonth.value })
    await loadBudgets()
  }

  async function deleteBudget(id: number) {
    await api.deleteBudget(id)
    await loadBudgets()
  }

  let initialized = false
  let initPromise: Promise<void> | null = null

  /** 初始化数据；重复调用会复用同一次请求，避免每次切换页面都重新拉全量数据 */
  async function init(force = false) {
    if (initialized && !force) return
    if (initPromise) return initPromise
    initPromise = (async () => {
      loading.value = true
      try {
        await loadExpenses()
        await loadBudgets()
        initialized = true
      } finally {
        loading.value = false
        initPromise = null
      }
    })()
    return initPromise
  }

  async function retry() {
    await init(true)
  }

  return {
    expenses, budgets, selectedYear, selectedMonth, loading, loadError, budgetError,
    todayExpenses, todayTotal, monthExpenses, monthTotal, monthIncome,
    categoryTotals, dailyTotals, totalBudget, totalSpent,
    budgetStatus, overBudgets, warningBudgets,
    loadExpenses, loadBudgets, addExpense, updateExpense, deleteExpense,
    addBudget, deleteBudget, init, retry,
  }
})

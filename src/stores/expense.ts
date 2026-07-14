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
    } catch { expenses.value = [] }
  }

  async function loadBudgets() {
    try {
      budgets.value = await api.getBudgets(selectedYear.value, selectedMonth.value)
    } catch { budgets.value = [] }
  }

  async function addExpense(expense: Expense) {
    await api.addExpense(expense)
    await loadExpenses()
  }

  async function updateExpense(expense: Expense) {
    await api.addExpense(expense)
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

  async function init() {
    await loadExpenses()
    await loadBudgets()
  }

  return {
    expenses, budgets, selectedYear, selectedMonth,
    todayExpenses, todayTotal, monthExpenses, monthTotal, monthIncome,
    categoryTotals, dailyTotals, totalBudget, totalSpent,
    loadExpenses, loadBudgets, addExpense, updateExpense, deleteExpense,
    addBudget, deleteBudget, init,
  }
})

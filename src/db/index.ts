import Dexie from 'dexie'

export interface Expense {
  id?: string
  amount: number
  category: string
  description?: string
  date: string
  tags: string[]
  isIncome: boolean
  createdAt: string
}

export interface Budget {
  id?: string
  category: string
  amount: number
  month: number
  year: number
}

const db = new Dexie('XiaoZhangBen')
db.version(1).stores({
  expenses: 'id, date, category, createdAt',
  budgets: '++id, category, month, year',
})

export const expensesTable = db.table<Expense & { id: string }>('expenses')
export const budgetsTable = db.table<Budget & { id: number }>('budgets')

export default db

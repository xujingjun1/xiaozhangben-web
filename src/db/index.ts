// 数据模型的类型定义（单一来源）。
// 早期版本用 Dexie（IndexedDB）做本地存储，后来数据全部迁到服务端 JSON 库，
// 这里只保留类型：运行时不再初始化任何本地数据库，避免残留一个无用的 IndexedDB 实例。

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

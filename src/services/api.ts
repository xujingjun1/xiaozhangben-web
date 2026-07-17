const isProd = import.meta.env.PROD
const BASE_URL = import.meta.env.VITE_API_URL || (isProd ? '/api' : 'http://localhost:3001/api')

function getUserId(): string | null {
  return localStorage.getItem('user_id')
}

async function request(path: string, options: RequestInit = {}) {
  const userId = getUserId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (userId) headers['X-User-Id'] = userId

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

export const api = {
  // Auth
  register: (username: string, password: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  resetPassword: (username: string, newPassword: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ username, newPassword }) }),

  // Expenses
  getExpenses: () => request('/expenses'),
  addExpense: (expense: any) => request('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
  deleteExpense: (id: string) => request(`/expenses/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: (year: number, month: number) => request(`/budgets?year=${year}&month=${month}`),
  addBudget: (budget: any) => request('/budgets', { method: 'POST', body: JSON.stringify(budget) }),
  deleteBudget: (id: number) => request(`/budgets/${id}`, { method: 'DELETE' }),

  // Profile
  getProfile: () => request('/profile'),
  updateProfile: (profile: Record<string, string>) =>
    request('/profile', { method: 'POST', body: JSON.stringify(profile) }),

  // Export
  exportData: () => request('/export'),
}

const DEFAULT_API = 'http://localhost:3001/api'

function getBaseUrl(): string {
  const saved = localStorage.getItem('api_url')
  if (saved) return saved
  const envUrl = import.meta.env.VITE_API_URL
  if (envUrl) return envUrl
  if (import.meta.env.PROD) return '/api'
  return DEFAULT_API
}

function getUserId(): string | null {
  return localStorage.getItem('user_id')
}

async function request(path: string, options: RequestInit = {}) {
  const userId = getUserId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (userId) {
    // User-Id 可穿过平台网关（X-User-Id 会被剥离、Authorization 会被改写，均仅作兼容回退）
    headers['User-Id'] = userId
    headers['Authorization'] = `Bearer ${userId}`
    headers['X-User-Id'] = userId
  }

  // 默认 15 秒超时，避免请求长时间挂起；调用方也可传入自己的 signal
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers, signal: options.signal || controller.signal })
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('请求超时，请检查网络后重试')
    throw e
  } finally {
    clearTimeout(timeout)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`请求失败(${res.status})`)
    return res.text()
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '请求失败')
  return data
}

// Expose for settings page
export function getApiUrl(): string {
  return getBaseUrl()
}

export function setApiUrl(url: string) {
  localStorage.setItem('api_url', url)
}

export function resetApiUrl() {
  localStorage.removeItem('api_url')
}

export const api = {
  // Auth
  register: (username: string, password: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  resetPassword: (username: string, newPassword: string, answers?: { question: string; answer: string }[]) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ username, newPassword, answers }) }),
  resetPasswordByCode: (username: string, newPassword: string, recoveryCode: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ username, newPassword, recoveryCode }) }),
  getSecurityQuestions: (username: string) =>
    request(`/auth/security-questions?username=${encodeURIComponent(username)}`),
  setSecurityQuestions: (currentPassword: string, questions: { question: string; answer: string }[]) =>
    request('/auth/security-questions', { method: 'POST', body: JSON.stringify({ currentPassword, questions }) }),
  getRecoveryCodeStatus: () => request('/auth/recovery-code'),
  generateRecoveryCode: () => request('/auth/recovery-code', { method: 'POST' }),

  // Expenses
  getExpenses: () => request('/expenses'),
  addExpense: (expense: any) => request('/expenses', { method: 'POST', body: JSON.stringify(expense) }),
  updateExpense: (id: string, expense: any) => request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(expense) }),
  deleteExpense: (id: string) => request(`/expenses/${id}`, { method: 'DELETE' }),
  clearExpenses: () => request('/expenses', { method: 'DELETE' }),

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

  // OCR
  getOcrConfig: () => request('/ocr/config'),
  ocrBaidu: (payload: { image: string; apiKey?: string; secretKey?: string; type?: string }) =>
    request('/ocr/baidu', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOcrKeys: (apiKey: string, secretKey: string) =>
    request('/ocr/verify', { method: 'POST', body: JSON.stringify({ apiKey, secretKey }) }),

  // Ratings / Feedback
  submitRating: (rating: number) =>
    request('/ratings', { method: 'POST', body: JSON.stringify({ rating }) }),
  submitFeedback: (payload: { type?: string; content: string; contact?: string }) =>
    request('/feedbacks', { method: 'POST', body: JSON.stringify(payload) }),
}

import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/add', name: 'add', component: () => import('@/views/AddView.vue') },
    { path: '/add/:id', name: 'edit', component: () => import('@/views/AddView.vue') },
    { path: '/report', name: 'report', component: () => import('@/views/ReportView.vue') },
    { path: '/budget', name: 'budget', component: () => import('@/views/BudgetView.vue') },
    { path: '/import', name: 'import', component: () => import('@/views/ImportView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/rating', name: 'rating', component: () => import('@/views/RatingView.vue') },
    { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
    { path: '/help', name: 'help', component: () => import('@/views/HelpView.vue') },
  ],
})

// 验证登录状态是否有效
let sessionValidated = false

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function validateSession(): Promise<boolean> {
  const userId = localStorage.getItem('user_id')
  if (!userId) return false
  
  try {
    const res = await fetch(`${API_URL}/expenses`, {
      headers: { 'X-User-Id': userId }
    })
    if (res.ok) {
      sessionValidated = true
      return true
    }
    // 无效则清除
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_info')
    localStorage.removeItem('user_avatar')
    return false
  } catch {
    // 网络错误时保留登录状态
    sessionValidated = true
    return true
  }
}

router.beforeEach(async (to) => {
  const userId = localStorage.getItem('user_id')
  
  if (!userId && to.name !== 'login') {
    return { name: 'login' }
  }
  
  if (userId && to.name === 'login') {
    return { name: 'home' }
  }
  
  // 首次访问时验证 session 是否有效
  if (userId && !sessionValidated) {
    const valid = await validateSession()
    if (!valid && to.name !== 'login') {
      return { name: 'login' }
    }
  }
})

export default router

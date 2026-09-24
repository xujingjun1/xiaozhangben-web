import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/landing', name: 'landing', component: () => import('@/views/LandingView.vue') },
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
    { path: '/download', name: 'download', component: () => import('@/views/DownloadView.vue') },
    // 兜底：未匹配的路由重定向首页（未登录时由下方守卫再转落地页）
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

// Simple auth check - do not block navigation
router.beforeEach((to) => {
  const userId = localStorage.getItem('user_id')

  // Logged-in users should not stay on landing page
  if (to.name === 'landing') {
    if (userId) return { name: 'home' }
    return
  }

  // Not logged in -> redirect to login
  if (!userId && to.name !== 'login') {
    return { name: 'landing' }
  }

  // Already logged in -> redirect away from login
  if (userId && to.name === 'login') {
    return { name: 'home' }
  }

  // Allow navigation (no async session validation to avoid blocking)
})

export default router

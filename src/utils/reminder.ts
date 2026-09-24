// 每日记账提醒：基于 Web Notification API 的轻量提醒
// 设置持久化在 localStorage，App 启动后开启轮询，命中提醒时间即弹通知

const LS_ENABLED = 'reminder_enabled'
const LS_TIME = 'reminder_time'          // 'HH:mm'
const LS_LAST_FIRED = 'reminder_last_fired' // 'YYYY-MM-DD'，防止同一分钟内重复弹

export interface ReminderConfig {
  enabled: boolean
  time: string
}

export function getReminderConfig(): ReminderConfig {
  return {
    enabled: localStorage.getItem(LS_ENABLED) === '1',
    time: localStorage.getItem(LS_TIME) || '21:00',
  }
}

export function setReminderConfig(enabled: boolean, time: string) {
  if (enabled) localStorage.setItem(LS_ENABLED, '1')
  else localStorage.removeItem(LS_ENABLED)
  localStorage.setItem(LS_TIME, time)
  // 时间变更后允许当天再次提醒（仅当时间点未到时）
  const now = new Date()
  const [h, m] = time.split(':').map(Number)
  if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
    markFired(today())
  }
}

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

function today(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function markFired(day: string) {
  localStorage.setItem(LS_LAST_FIRED, day)
}

function currentHM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function checkAndFire() {
  if (typeof document === 'undefined' || document.visibilityState === 'hidden') return
  const { enabled, time } = getReminderConfig()
  if (!enabled) return
  if (!notificationSupported() || Notification.permission !== 'granted') return
  if (currentHM() !== time) return
  if (localStorage.getItem(LS_LAST_FIRED) === today()) return

  markFired(today())
  try {
    const n = new Notification('该记账啦', {
      body: '花一分钟，记录今天的每一笔温暖',
      icon: '/pwa-192x192.png',
      tag: 'xiaozhangben-daily-reminder',
    })
    n.onclick = () => { window.focus(); n.close() }
  } catch { /* 部分环境（如安卓 WebView）不支持构造函数形式，静默忽略 */ }
}

let timer: ReturnType<typeof setInterval> | null = null

/** App 启动时调用：每 30 秒检查一次是否到达提醒时间 */
export function startReminderLoop() {
  if (timer) return
  timer = setInterval(checkAndFire, 30 * 1000)
  checkAndFire()
}

export function stopReminderLoop() {
  if (timer) { clearInterval(timer); timer = null }
}

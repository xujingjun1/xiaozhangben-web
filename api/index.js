import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

// 轻量 .env 加载：不覆盖已有环境变量，支持本地用 .env 配置 ADMIN_USER_IDS 等
function loadEnvFiles() {
  const candidates = ['.env', path.join('api', '.env')]
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue
      const text = fs.readFileSync(file, 'utf-8')
      for (const line of text.split(String.fromCharCode(10))) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
        if (!m) continue
        let value = m[2]
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (process.env[m[1]] === undefined) process.env[m[1]] = value
      }
    } catch { /* 忽略无法读取的 .env */ }
  }
}
loadEnvFiles()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// ========== FILE STORAGE ==========
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// ========== 自动备份与恢复 ==========
const BACKUP_DIR = path.join(DATA_DIR, 'backups')
const MAX_BACKUPS = 7
const BACKUP_NAME_RE = /^db-\d{4}-\d{2}-\d{2}\.json$/

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs.readdirSync(BACKUP_DIR).filter(f => BACKUP_NAME_RE.test(f)).sort()
}

// 每天备份一份 (保留当天最早版本), 最多保留最近 MAX_BACKUPS 份
function backupDB(reason = 'daily') {
  try {
    if (!fs.existsSync(DB_FILE)) return
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
    const stamp = new Date().toISOString().slice(0, 10)
    const dest = path.join(BACKUP_DIR, `db-${stamp}.json`)
    if (fs.existsSync(dest)) return
    fs.copyFileSync(DB_FILE, dest)
    const files = listBackups()
    while (files.length > MAX_BACKUPS) {
      fs.unlinkSync(path.join(BACKUP_DIR, files.shift()))
    }
    console.log(`[备份] 已创建 db-${stamp}.json (${reason})`)
  } catch (e) {
    console.error('[备份] 失败:', e.message)
  }
}

// 主文件丢失或损坏时, 从最近一份备份恢复
function restoreFromBackup() {
  try {
    const files = listBackups()
    if (!files.length) return false
    const latest = files[files.length - 1]
    fs.copyFileSync(path.join(BACKUP_DIR, latest), DB_FILE)
    console.log(`[DB] 已从备份 ${latest} 恢复`)
    return true
  } catch (e) {
    console.error('[DB] 备份恢复失败:', e.message)
    return false
  }
}

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    // 主文件不存在: 优先从备份恢复, 无备份则返回空库
    restoreFromBackup()
    if (!fs.existsSync(DB_FILE)) {
      return { users: [], expenses: [], budgets: [], ratings: [], feedbacks: [] }
    }
  }
  let db
  try {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
  } catch (e) {
    // db.json 损坏: 从最近备份恢复, 避免服务崩溃/数据清零
    console.error('[DB] db.json 损坏, 尝试从备份恢复:', e.message)
    if (!restoreFromBackup()) throw e
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
  }
  // 确保新字段存在
  // 兜底所有顶层字段：db.json 若被外部改坏（缺字段），
  // 后面 db.expenses.push(...) 之类会直接 TypeError 导致请求挂死
  if (!Array.isArray(db.users)) db.users = []
  if (!Array.isArray(db.expenses)) db.expenses = []
  if (!Array.isArray(db.budgets)) db.budgets = []
  if (!Array.isArray(db.ratings)) db.ratings = []
  if (!Array.isArray(db.feedbacks)) db.feedbacks = []
  return db
}

// 启动时立即备份一次, 之后每 24 小时备份一次
backupDB('startup')
setInterval(() => backupDB('daily'), 24 * 60 * 60 * 1000)

function saveDB(data) {
  // 原子写入: 先写临时文件再重命名, 避免写入中途崩溃损坏 db.json
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8')
  fs.renameSync(tmp, DB_FILE)
}

function genId() { return crypto.randomUUID() }

function isValidDateString(s) {
  if (typeof s !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s)
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function isValidMonthYear(month, year) {
  const m = Number(month)
  const y = Number(year)
  return Number.isInteger(m) && Number.isInteger(y) && m >= 1 && m <= 12 && y >= 2000 && y <= 2100
}

// 管理员用户ID白名单：优先读取环境变量 ADMIN_USER_IDS，其次读取 data/admin.json
// admin.json 支持三种格式：["uuid1","uuid2"]、{"adminUserIds":["uuid1"]}、"uuid1,uuid2"
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json')

function loadAdminIds() {
  const ids = new Set()
  const fromEnv = (process.env.ADMIN_USER_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  fromEnv.forEach(id => ids.add(id))
  try {
    if (fs.existsSync(ADMIN_FILE)) {
      const raw = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'))
      let list = []
      if (Array.isArray(raw)) list = raw
      else if (typeof raw === 'string') list = raw.split(',')
      else if (raw && Array.isArray(raw.adminUserIds)) list = raw.adminUserIds
      list.map(s => String(s).trim()).filter(Boolean).forEach(id => ids.add(id))
    }
  } catch (e) {
    console.warn('[ADMIN] admin.json 读取失败:', e.message)
  }
  return [...ids]
}

const ADMIN_USER_IDS = loadAdminIds()

function isAdmin(userId) {
  return ADMIN_USER_IDS.includes(userId)
}

// ========== 密码哈希 (scrypt 加盐) ==========
// 新格式: scrypt$<saltHex>$<hashHex>
// 旧格式: 无盐 sha256 hex (登录时自动升级)
function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

function isLegacyHash(stored) {
  return typeof stored === 'string' && !stored.startsWith('scrypt$')
}

function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false
  if (stored.startsWith('scrypt$')) {
    const parts = stored.split('$')
    if (parts.length !== 3) return false
    const salt = Buffer.from(parts[1], 'hex')
    const expected = Buffer.from(parts[2], 'hex')
    const actual = crypto.scryptSync(password, salt, expected.length)
    return crypto.timingSafeEqual(actual, expected)
  }
  // 旧版无盐 sha256 兼容 (存储值长度异常时直接判失败, 避免 timingSafeEqual 抛错)
  const legacy = crypto.createHash('sha256').update(password).digest('hex')
  const a = Buffer.from(legacy)
  const b = Buffer.from(stored)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function normalizeAnswer(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '')
}

// ---- 恢复码：忘记密码且未设密保时的兜底凭证 ----
// 字符集剔除易混淆的 0/O/1/I/L，避免用户手抄错
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function genRecoveryCode() {
  const bytes = crypto.randomBytes(12)
  let raw = ''
  for (let i = 0; i < 12; i++) raw += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
}
// 用户输入容错：忽略大小写、空格、连字符
function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[\s-]/g, '')
}

// ========== 速率限制 (内存实现) ==========
const rateBuckets = new Map()
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, keyFn } = {}) {
  return (req, res, next) => {
    const ip = req.socket?.remoteAddress || 'unknown'
    const key = keyFn ? String(keyFn(req)) : ip
    const now = Date.now()
    let bucket = rateBuckets.get(key)
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs }
      rateBuckets.set(key, bucket)
    }
    bucket.count++
    if (bucket.count > max) {
      const waitMin = Math.ceil((bucket.resetAt - now) / 60000)
      return res.status(429).json({ error: `尝试过于频繁，请 ${waitMin} 分钟后再试` })
    }
    next()
  }
}
// 定期清理过期桶，防止内存缓慢增长
setInterval(() => {
  const now = Date.now()
  for (const [k, b] of rateBuckets) if (now > b.resetAt) rateBuckets.delete(k)
}, 10 * 60 * 1000).unref()

// 登录/注册/重置密码共用限流: 15 分钟内每 IP 最多 15 次
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 15 })
// 密保相关接口：按 IP + 账号限流，防止暴力猜答案
const resetRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyFn: (req) => `${req.userId || req.socket?.remoteAddress || 'unknown'}:${req.body?.username || req.query?.username || ''}` })
// OCR 接口限流：登录后按用户限流，防止消耗服务端配置的百度 OCR 额度
const ocrRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyFn: (req) => req.userId || req.socket?.remoteAddress || 'unknown' })

// Auth middleware
function authMiddleware(req, res, next) {
  // 网关会剥离 X-User-Id、改写 Authorization，因此主用 User-Id 头，其余作兼容回退
  let userId = req.headers['user-id'] || req.headers['x-user-id']
  const auth = req.headers['authorization']
  if (!userId && auth && auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    // 仅当 token 形如本项目用户 ID（UUID）时才作为回退，避免把网关注入的 JWT 当作用户 ID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) userId = token
  }
  if (!userId) return res.status(401).json({ error: '未登录' })
  const db = loadDB()
  const user = db.users.find(u => u.id === userId)
  if (!user) return res.status(401).json({ error: '用户不存在' })
  req.userId = userId
  next()
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ========== AUTH ==========

// 注册
app.post('/api/auth/register', authRateLimit, (req, res) => {
  const { username, password } = req.body
  // 注意：不要在日志中输出密码（哪怕是长度），也不要输出用户 ID
  if (!username || username.trim().length < 1) return res.status(400).json({ error: '请输入昵称' })
  if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' })
  const db = loadDB()
  if (db.users.find(u => u.username === username)) return res.status(400).json({ error: '该昵称已被注册' })
  const user = { id: genId(), username: username.trim(), password: hashPassword(password), nickname: username.trim(), createdAt: new Date().toISOString() }
  db.users.push(user)
  saveDB(db)
  res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } })
})

// 登录
app.post('/api/auth/login', authRateLimit, (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '请填写完整信息' })
  const db = loadDB()
  const user = db.users.find(u => u.username === username)
  if (!user || !verifyPassword(password, user.password)) return res.status(400).json({ error: '账号或密码错误' })
  // 旧版无盐哈希自动升级为 scrypt
  if (isLegacyHash(user.password)) {
    user.password = hashPassword(password)
    saveDB(db)
  }
  res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } })
})

// 获取密保问题（公开，忘记密码流程使用）
app.get('/api/auth/security-questions', resetRateLimit, (req, res) => {
  const username = String(req.query.username || '').trim()
  if (!username) return res.status(400).json({ error: '请输入昵称' })
  const db = loadDB()
  const user = db.users.find(u => u.username === username)
  const questions = user?.security?.questions
  // 未设置时返回空数组而非 404：该接口会被设置页和首页引导条常规调用，
  // 用 404 表达"未设置"会让浏览器控制台刷屏，语义上也不算错误
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.json({ questions: [] })
  }
  res.json({ questions: questions.map(q => q.question) })
})

// 设置/更新密保问题（需登录 + 当前密码）
app.post('/api/auth/security-questions', authMiddleware, resetRateLimit, (req, res) => {
  const { currentPassword, questions } = req.body
  if (!currentPassword) return res.status(400).json({ error: '请输入当前密码' })
  if (!Array.isArray(questions) || questions.length < 2 || questions.length > 3) {
    return res.status(400).json({ error: '请设置 2-3 个密保问题' })
  }
  const normalized = questions.map(q => ({
    question: String(q?.question || '').trim(),
    answer: normalizeAnswer(q?.answer),
  }))
  if (normalized.some(q => q.question.length < 2 || q.answer.length < 1)) {
    return res.status(400).json({ error: '密保问题和答案不能为空' })
  }
  const seen = new Set()
  for (const q of normalized) {
    if (seen.has(q.question)) return res.status(400).json({ error: '密保问题不能重复' })
    seen.add(q.question)
  }
  const db = loadDB()
  const user = db.users.find(u => u.id === req.userId)
  if (!user) return res.status(401).json({ error: '用户不存在' })
  if (!verifyPassword(currentPassword, user.password)) return res.status(400).json({ error: '当前密码错误' })
  user.security = {
    questions: normalized.map(q => ({ question: q.question, answerHash: hashPassword(q.answer) })),
    updatedAt: new Date().toISOString(),
  }
  saveDB(db)
  res.json({ success: true })
})

// 生成/重置恢复码（需登录）。明文只在此次响应返回，服务端仅存 scrypt 哈希
app.post('/api/auth/recovery-code', authMiddleware, resetRateLimit, (req, res) => {
  const db = loadDB()
  const user = db.users.find(u => u.id === req.userId)
  if (!user) return res.status(401).json({ error: '用户不存在' })
  const code = genRecoveryCode()
  user.recovery = { codeHash: hashPassword(normalizeCode(code)), createdAt: new Date().toISOString() }
  saveDB(db)
  res.json({ success: true, code })
})

// 查询恢复码状态（需登录）。只回是否已有，不回明文
app.get('/api/auth/recovery-code', authMiddleware, (req, res) => {
  const db = loadDB()
  const user = db.users.find(u => u.id === req.userId)
  if (!user) return res.status(401).json({ error: '用户不存在' })
  res.json({ hasCode: !!user.recovery?.codeHash, createdAt: user.recovery?.createdAt || null })
})

// 通过密保问题 或 恢复码 重置密码
app.post('/api/auth/reset-password', resetRateLimit, (req, res) => {
  const { username, newPassword, answers, recoveryCode } = req.body
  if (!username || !newPassword) return res.status(400).json({ error: '请填写完整信息' })
  if (newPassword.length < 6) return res.status(400).json({ error: '密码至少6位' })
  const db = loadDB()
  const user = db.users.find(u => u.username === username)
  if (!user) return res.status(400).json({ error: '账号不存在' })

  // ---- 分支一：恢复码重置（一次性，成功后自动换发新码）----
  if (recoveryCode) {
    if (!user.recovery?.codeHash) return res.status(400).json({ error: '该账号未生成恢复码' })
    if (!verifyPassword(normalizeCode(recoveryCode), user.recovery.codeHash)) {
      return res.status(400).json({ error: '恢复码不正确' })
    }
    user.password = hashPassword(newPassword)
    const next = genRecoveryCode()
    user.recovery = { codeHash: hashPassword(normalizeCode(next)), createdAt: new Date().toISOString() }
    saveDB(db)
    return res.json({ success: true, message: '密码重置成功', newRecoveryCode: next })
  }

  // ---- 分支二：密保问题重置 ----
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: '请回答密保问题，或使用恢复码重置' })
  }
  const questions = user?.security?.questions
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: '该账号未设置密保问题，请使用恢复码重置' })
  }
  if (answers.length !== questions.length) {
    return res.status(400).json({ error: '密保问题答案数量不正确' })
  }
  const answerMap = new Map(answers.map(a => [String(a?.question || '').trim(), String(a?.answer || '')]))
  let allOk = true
  for (const q of questions) {
    const provided = answerMap.get(q.question)
    if (provided === undefined || !verifyPassword(normalizeAnswer(provided), q.answerHash)) {
      allOk = false
      break
    }
  }
  if (!allOk) return res.status(400).json({ error: '密保答案不正确' })
  user.password = hashPassword(newPassword)
  saveDB(db)
  res.json({ success: true, message: '密码重置成功' })
})

// ========== EXPENSES ==========

app.get('/api/expenses', authMiddleware, (req, res) => {
  const db = loadDB()
  const rows = db.expenses
    .filter(e => e.userId === req.userId)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
  res.json(rows)
})

app.post('/api/expenses', authMiddleware, (req, res) => {
  const { id, amount, category, description, date, tags, isIncome } = req.body
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ error: '金额必须是大于0的数字' })
  if (typeof category !== 'string' || !category.trim()) return res.status(400).json({ error: '请选择分类' })
  if (!isValidDateString(date)) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' })
  const db = loadDB()
  const expenseId = id || genId()

  const idx = db.expenses.findIndex(e => e.id === expenseId)
  const item = {
    id: expenseId,
    userId: req.userId,
    amount: num,
    category: category.trim(),
    description: description || '',
    date,
    tags: Array.isArray(tags) ? tags : [],
    isIncome: !!isIncome,
    createdAt: idx >= 0 ? db.expenses[idx].createdAt : new Date().toISOString(),
  }

  if (idx >= 0) db.expenses[idx] = item
  else db.expenses.push(item)

  saveDB(db)
  res.json({ success: true, id: expenseId })
})

app.put('/api/expenses/:id', authMiddleware, (req, res) => {
  const { amount, category, description, date, tags, isIncome } = req.body
  const num = Number(amount)
  if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ error: '金额必须是大于0的数字' })
  if (typeof category !== 'string' || !category.trim()) return res.status(400).json({ error: '请选择分类' })
  if (!isValidDateString(date)) return res.status(400).json({ error: '日期格式应为 YYYY-MM-DD' })
  const db = loadDB()
  const idx = db.expenses.findIndex(e => e.id === req.params.id && e.userId === req.userId)
  if (idx < 0) return res.status(404).json({ error: '记录不存在或无权修改' })
  db.expenses[idx] = {
    ...db.expenses[idx],
    amount: num,
    category: category.trim(),
    description: description || '',
    date,
    tags: Array.isArray(tags) ? tags : [],
    isIncome: !!isIncome,
  }
  saveDB(db)
  res.json({ success: true, id: req.params.id })
})

app.delete('/api/expenses/:id', authMiddleware, (req, res) => {
  const db = loadDB()
  db.expenses = db.expenses.filter(e => !(e.id === req.params.id && e.userId === req.userId))
  saveDB(db)
  res.json({ success: true })
})

// 清空当前用户全部记账数据（保留预算与个人资料）
app.delete('/api/expenses', authMiddleware, (req, res) => {
  const db = loadDB()
  const before = db.expenses.length
  db.expenses = db.expenses.filter(e => e.userId !== req.userId)
  saveDB(db)
  res.json({ success: true, deleted: before - db.expenses.length })
})

// ========== BUDGETS ==========

app.get('/api/budgets', authMiddleware, (req, res) => {
  const { year, month } = req.query
  if (!year || !month) return res.json([])
  const db = loadDB()
  const rows = db.budgets.filter(b =>
    b.userId === req.userId && b.year === parseInt(year, 10) && b.month === parseInt(month, 10)
  )
  res.json(rows)
})

app.post('/api/budgets', authMiddleware, (req, res) => {
  const { category, amount, month, year } = req.body
  const num = Number(amount)
  if (typeof category !== 'string' || !category.trim()) return res.status(400).json({ error: '请选择预算分类' })
  if (!Number.isFinite(num) || num <= 0) return res.status(400).json({ error: '预算金额必须是大于0的数字' })
  if (!isValidMonthYear(month, year)) return res.status(400).json({ error: '预算月份或年份不合法' })
  const db = loadDB()
  const m = Number(month)
  const y = Number(year)
  const cat = category.trim()

  const idx = db.budgets.findIndex(b =>
    b.userId === req.userId && b.category === cat && b.month === m && b.year === y
  )

  if (idx >= 0) {
    db.budgets[idx].amount = num
    saveDB(db)
    res.json({ success: true, id: db.budgets[idx].id })
  } else {
    const id = genId()
    db.budgets.push({ id, userId: req.userId, category: cat, amount: num, month: m, year: y })
    saveDB(db)
    res.json({ success: true, id })
  }
})

app.delete('/api/budgets/:id', authMiddleware, (req, res) => {
  const db = loadDB()
  db.budgets = db.budgets.filter(b => !(b.id === req.params.id && b.userId === req.userId))
  saveDB(db)
  res.json({ success: true })
})

// ========== USER PROFILE ==========

app.get('/api/profile', authMiddleware, (req, res) => {
  const db = loadDB()
  const user = db.users.find(u => u.id === req.userId)
  if (!user) return res.status(404).json({ error: '用户不存在' })
  res.json(user.profile || { bio: '', birthday: '', hobbies: '', dream: '', nickname: '', avatar: '' })
})

app.post('/api/profile', authMiddleware, (req, res) => {
  const { bio, birthday, hobbies, dream, nickname, avatar } = req.body
  const db = loadDB()
  const user = db.users.find(u => u.id === req.userId)
  if (!user) return res.status(404).json({ error: '用户不存在' })

  // 更新 profile
  user.profile = {
    bio: bio ?? user.profile?.bio ?? '',
    birthday: birthday ?? user.profile?.birthday ?? '',
    hobbies: hobbies ?? user.profile?.hobbies ?? '',
    dream: dream ?? user.profile?.dream ?? '',
    nickname: nickname ?? user.profile?.nickname ?? '',
    avatar: avatar ?? user.profile?.avatar ?? '',
  }

  // 同步更新用户昵称
  if (nickname !== undefined) {
    user.nickname = nickname
  }

  saveDB(db)
  res.json({ success: true, profile: user.profile, nickname: user.nickname })
})

// ========== EXPORT ==========

app.get('/api/export', authMiddleware, (req, res) => {
  const db = loadDB()
  res.json({
    expenses: db.expenses.filter(e => e.userId === req.userId),
    budgets: db.budgets.filter(b => b.userId === req.userId),
    exportDate: new Date().toISOString(),
  })
})

// ========== BAIDU OCR ==========

let baiduAccessToken = null
let baiduTokenExpiry = 0

async function getBaiduAccessToken(apiKey, secretKey) {
  // 缓存 token（有效期 30 天，这里用 25 天）
  if (baiduAccessToken && Date.now() < baiduTokenExpiry) {
    return baiduAccessToken
  }

  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
  const res = await fetch(url, { method: 'POST' })
  const data = await res.json()

  if (data.access_token) {
    baiduAccessToken = data.access_token
    baiduTokenExpiry = Date.now() + 25 * 24 * 60 * 60 * 1000
    return baiduAccessToken
  } else {
    throw new Error(data.error_description || '获取 access_token 失败')
  }
}

// 百度 OCR 识别接口
app.post('/api/ocr/baidu', authMiddleware, ocrRateLimit, async (req, res) => {
  const { image, type = 'accurate' } = req.body
  let { apiKey, secretKey } = req.body

  // 支持从服务端环境变量回退
  if (!apiKey) apiKey = process.env.BAIDU_OCR_API_KEY || ''
  if (!secretKey) secretKey = process.env.BAIDU_OCR_SECRET_KEY || ''

  if (!image) {
    return res.status(400).json({ error: '缺少图片数据' })
  }
  if (!apiKey || !secretKey) {
    return res.status(400).json({ error: '未配置百度 OCR 密钥' })
  }

  try {

    const token = await getBaiduAccessToken(apiKey, secretKey)

    // type: standard(标准版) 或 accurate(高精度版)
    const apiUrl = type === 'accurate'
      ? `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`
      : `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${token}`

    const ocrRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `image=${encodeURIComponent(image)}`,
    })

    const ocrData = await ocrRes.json()

    if (ocrData.error_code) {
      console.error(`[百度OCR] 识别失败: ${ocrData.error_code} - ${ocrData.error_msg}`)
      return res.status(400).json({ error: `百度OCR错误: ${ocrData.error_msg}` })
    }

    const text = (ocrData.words_result || []).map(item => item.words).join('\n')

    res.json({
      success: true,
      text,
      lines: ocrData.words_result || [],
      wordsNum: ocrData.words_result?.length || 0,
    })
  } catch (e) {
    console.error(`[百度OCR] 请求异常:`, e.message)
    res.status(500).json({ error: e.message })
  }
})

// 百度 OCR 验证密钥接口
app.post('/api/ocr/verify', authMiddleware, ocrRateLimit, async (req, res) => {
  const { apiKey, secretKey } = req.body
  try {
    await getBaiduAccessToken(apiKey, secretKey)
    res.json({ success: true, message: '密钥验证成功' })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})


// 百度 OCR 配置状态接口（从服务端环境变量读取）
app.get('/api/ocr/config', (req, res) => {
  const apiKey = process.env.BAIDU_OCR_API_KEY || '';
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY || '';
  // 只返回是否已配置，不回显任何密钥片段（此接口无鉴权，回显等于公开泄露）
  res.json({ configured: !!(apiKey && secretKey) });
});

// ========== RATINGS ==========

// 提交评分
app.post('/api/ratings', authMiddleware, (req, res) => {
  const { rating } = req.body
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' })
  }

  const db = loadDB()
  const newRating = {
    id: genId(),
    userId: req.userId,
    rating,
    createdAt: new Date().toISOString(),
  }

  db.ratings.push(newRating)
  saveDB(db)
  res.json({ success: true, id: newRating.id })
})

// 获取所有评分（管理员用）
app.get('/api/ratings', authMiddleware, (req, res) => {
  const db = loadDB()
  const ratings = db.ratings.filter(r => r.userId === req.userId)

  // 计算平均分
  const avg = ratings.length > 0 
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : 0

  res.json({
    ratings,
    total: ratings.length,
    average: parseFloat(avg),
  })
})

// ========== FEEDBACKS ==========

// 提交反馈
app.post('/api/feedbacks', authMiddleware, (req, res) => {
  const { type, content, contact } = req.body
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '反馈内容不能为空' })
  }

  const db = loadDB()
  const newFeedback = {
    id: genId(),
    userId: req.userId,
    type: type || '其他',
    content: content.trim(),
    contact: contact || '',
    status: 'pending', // pending, replied, resolved
    createdAt: new Date().toISOString(),
  }

  db.feedbacks.push(newFeedback)
  saveDB(db)
  res.json({ success: true, id: newFeedback.id })
})

// 获取用户反馈列表
app.get('/api/feedbacks', authMiddleware, (req, res) => {
  const db = loadDB()
  const feedbacks = db.feedbacks
    .filter(f => f.userId === req.userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json(feedbacks)
})

// 获取所有反馈（管理员用）
app.get('/api/feedbacks/all', authMiddleware, (req, res) => {
  if (!isAdmin(req.userId)) return res.status(403).json({ error: '无权限访问' })
  const db = loadDB()
  const feedbacks = db.feedbacks.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  res.json(feedbacks)
})

// ========== API 404 ==========
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason)
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`小账本后端运行在 http://0.0.0.0:${PORT}`)
})

server.on('error', (err) => {
  console.error('服务器错误:', err)
})

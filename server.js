import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '10mb' }))

// ========== FILE STORAGE ==========
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], expenses: [], budgets: [], ratings: [], feedbacks: [] }
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))
  if (!db.ratings) db.ratings = []
  if (!db.feedbacks) db.feedbacks = []
  return db
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

function genId() { return crypto.randomUUID() }

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Auth middleware
function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id']
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
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body
  if (!username || username.trim().length < 1) return res.status(400).json({ error: '请输入昵称' })
  if (!password || password.length < 6) return res.status(400).json({ error: '密码至少6位' })
  const db = loadDB()
  if (db.users.find(u => u.username === username)) return res.status(400).json({ error: '该昵称已被注册' })
  const user = { id: genId(), username: username.trim(), password: hashPassword(password), nickname: username.trim(), createdAt: new Date().toISOString() }
  db.users.push(user)
  saveDB(db)
  res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } })
})

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '请填写完整信息' })
  const db = loadDB()
  const user = db.users.find(u => u.username === username)
  if (!user || hashPassword(password) !== user.password) return res.status(400).json({ error: '账号或密码错误' })
  res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } })
})

app.post('/api/auth/reset-password', (req, res) => {
  const { username, newPassword } = req.body
  if (!username || !newPassword) return res.status(400).json({ error: '请填写完整信息' })
  if (newPassword.length < 6) return res.status(400).json({ error: '密码至少6位' })
  const db = loadDB()
  const user = db.users.find(u => u.username === username)
  if (!user) return res.status(400).json({ error: '账号不存在' })
  user.password = hashPassword(newPassword)
  saveDB(db)
  res.json({ success: true, message: '密码重置成功' })
})

// ========== EXPENSES ==========
app.get('/api/expenses', authMiddleware, (req, res) => {
  const db = loadDB()
  res.json(db.expenses.filter(e => e.userId === req.userId).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)))
})

app.post('/api/expenses', authMiddleware, (req, res) => {
  const { id, amount, category, description, date, tags, isIncome } = req.body
  const db = loadDB()
  const expenseId = id || genId()
  const idx = db.expenses.findIndex(e => e.id === expenseId)
  const item = { id: expenseId, userId: req.userId, amount, category, description: description || '', date, tags: tags || [], isIncome: !!isIncome, createdAt: idx >= 0 ? db.expenses[idx].createdAt : new Date().toISOString() }
  if (idx >= 0) db.expenses[idx] = item; else db.expenses.push(item)
  saveDB(db)
  res.json({ success: true, id: expenseId })
})

app.delete('/api/expenses/:id', authMiddleware, (req, res) => {
  const db = loadDB()
  db.expenses = db.expenses.filter(e => !(e.id === req.params.id && e.userId === req.userId))
  saveDB(db)
  res.json({ success: true })
})

// ========== BUDGETS ==========
app.get('/api/budgets', authMiddleware, (req, res) => {
  const { year, month } = req.query
  if (!year || !month) return res.json([])
  const db = loadDB()
  res.json(db.budgets.filter(b => b.userId === req.userId && b.year === parseInt(year) && b.month === parseInt(month)))
})

app.post('/api/budgets', authMiddleware, (req, res) => {
  const { category, amount, month, year } = req.body
  const db = loadDB()
  const idx = db.budgets.findIndex(b => b.userId === req.userId && b.category === category && b.month === month && b.year === year)
  if (idx >= 0) { db.budgets[idx].amount = amount; saveDB(db); res.json({ success: true, id: db.budgets[idx].id }) }
  else { const id = genId(); db.budgets.push({ id, userId: req.userId, category, amount, month, year }); saveDB(db); res.json({ success: true, id }) }
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
  user.profile = { bio: bio ?? user.profile?.bio ?? '', birthday: birthday ?? user.profile?.birthday ?? '', hobbies: hobbies ?? user.profile?.hobbies ?? '', dream: dream ?? user.profile?.dream ?? '', nickname: nickname ?? user.profile?.nickname ?? '', avatar: avatar ?? user.profile?.avatar ?? '' }
  if (nickname !== undefined) user.nickname = nickname
  saveDB(db)
  res.json({ success: true, profile: user.profile, nickname: user.nickname })
})

// ========== EXPORT ==========
app.get('/api/export', authMiddleware, (req, res) => {
  const db = loadDB()
  res.json({ expenses: db.expenses.filter(e => e.userId === req.userId), budgets: db.budgets.filter(b => b.userId === req.userId), exportDate: new Date().toISOString() })
})

// ========== RATINGS ==========
app.post('/api/ratings', authMiddleware, (req, res) => {
  const { rating } = req.body
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: '评分必须在1-5之间' })
  const db = loadDB()
  const newRating = { id: genId(), userId: req.userId, rating, createdAt: new Date().toISOString() }
  db.ratings.push(newRating)
  saveDB(db)
  res.json({ success: true, id: newRating.id })
})

app.get('/api/ratings', authMiddleware, (req, res) => {
  const db = loadDB()
  const ratings = db.ratings.filter(r => r.userId === req.userId)
  const avg = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : 0
  res.json({ ratings, total: ratings.length, average: parseFloat(avg) })
})

// ========== FEEDBACKS ==========
app.post('/api/feedbacks', authMiddleware, (req, res) => {
  const { type, content, contact } = req.body
  if (!content || content.trim().length === 0) return res.status(400).json({ error: '反馈内容不能为空' })
  const db = loadDB()
  const newFeedback = { id: genId(), userId: req.userId, type: type || '其他', content: content.trim(), contact: contact || '', status: 'pending', createdAt: new Date().toISOString() }
  db.feedbacks.push(newFeedback)
  saveDB(db)
  res.json({ success: true, id: newFeedback.id })
})

app.get('/api/feedbacks', authMiddleware, (req, res) => {
  const db = loadDB()
  res.json(db.feedbacks.filter(f => f.userId === req.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

app.get('/api/feedbacks/all', authMiddleware, (req, res) => {
  const db = loadDB()
  res.json(db.feedbacks.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
})

// ========== SERVE FRONTEND ==========
const distPath = path.join(__dirname, 'dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Error handling
process.on('uncaughtException', (err) => console.error('未捕获的异常:', err))
process.on('unhandledRejection', (reason) => console.error('未处理的 Promise 拒绝:', reason))

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`小账本运行在 http://0.0.0.0:${PORT}`)
})

server.on('error', (err) => console.error('服务器错误:', err))

const express = require('express')
const cors = require('cors')
const crypto = require('crypto')
const cloudbase = require('@cloudbase/node-sdk')

const tcbApp = cloudbase.init({})
const db = tcbApp.database()
const _ = db.command

const app = express()
const PORT = process.env.PORT || 80

app.use(cors({
  origin: true,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

function genId() { return crypto.randomUUID() }

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Auth middleware
async function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id']
  if (!userId) return res.status(401).json({ error: '未登录' })
  try {
    const { data } = await db.collection('users').where({ id: userId }).get()
    if (!data || data.length === 0) return res.status(401).json({ error: '用户不存在' })
    req.userId = userId
    next()
  } catch (err) {
    console.error('[authMiddleware] 查询用户失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ========== AUTH ==========

// 注册
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body
  console.log(`\n[注册请求] 昵称: "${username}", 密码长度: ${password?.length || 0}`)

  if (!username || username.trim().length < 1) {
    console.log('[注册失败] 昵称为空')
    return res.status(400).json({ error: '请输入昵称' })
  }
  if (!password || password.length < 6) {
    console.log(`[注册失败] 密码不足6位, 实际: ${password?.length || 0}`)
    return res.status(400).json({ error: '密码至少6位' })
  }

  try {
    const { data: existing } = await db.collection('users').where({ username: username.trim() }).get()
    console.log(`[注册] 数据库同名用户数: ${existing.length}`)

    if (existing.length > 0) {
      console.log(`[注册失败] 昵称 "${username}" 已存在, ID: ${existing[0].id}`)
      return res.status(400).json({ error: '该昵称已被注册' })
    }

    const user = {
      id: genId(),
      username: username.trim(),
      password: hashPassword(password),
      nickname: username.trim(),
      createdAt: new Date().toISOString(),
    }

    await db.collection('users').add(user)

    console.log(`[注册成功] ID: ${user.id}, 昵称: ${user.username}`)
    res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } })
  } catch (err) {
    console.error('[注册] 数据库操作失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 登录
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body
  console.log(`\n[登录请求] 昵称: "${username}", 密码长度: ${password?.length || 0}`)

  if (!username || !password) {
    console.log(`[登录失败] 参数不完整, username: ${!!username}, password: ${!!password}`)
    return res.status(400).json({ error: '请填写完整信息' })
  }

  try {
    const { data: users } = await db.collection('users').where({ username }).get()
    console.log(`[登录] 匹配用户数: ${users.length}`)

    if (users.length === 0) {
      console.log(`[登录失败] 未找到用户 "${username}"`)
      return res.status(400).json({ error: '账号或密码错误' })
    }

    const user = users[0]
    const inputHash = hashPassword(password)
    const storedHash = user.password
    console.log(`[登录] 找到用户 ID: ${user.id}`)
    console.log(`[登录] 哈希匹配: ${inputHash === storedHash}`)

    if (inputHash !== storedHash) {
      console.log(`[登录失败] 密码不匹配`)
      return res.status(400).json({ error: '账号或密码错误' })
    }

    console.log(`[登录成功] ID: ${user.id}, 昵称: ${user.username}`)
    res.json({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } })
  } catch (err) {
    console.error('[登录] 数据库操作失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== RESET PASSWORD ==========
app.post('/auth/reset-password', async (req, res) => {
  const { username, newPassword } = req.body
  console.log(`\n[重置密码] 昵称: "${username}", 新密码长度: ${newPassword?.length || 0}`)

  if (!username || !newPassword) {
    return res.status(400).json({ error: '请填写完整信息' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '密码至少6位' })
  }

  try {
    const { data: users } = await db.collection('users').where({ username }).get()
    if (users.length === 0) {
      console.log(`[重置密码失败] 未找到用户 "${username}"`)
      return res.status(400).json({ error: '账号不存在' })
    }

    await db.collection('users').doc(users[0]._id).update({
      password: hashPassword(newPassword)
    })
    console.log(`[重置密码成功] 用户: ${username}`)
    res.json({ success: true, message: '密码重置成功' })
  } catch (err) {
    console.error('[重置密码] 数据库操作失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== EXPENSES ==========

app.get('/expenses', authMiddleware, async (req, res) => {
  try {
    const { data } = await db.collection('expenses').where({ userId: req.userId }).get()
    data.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    res.json(data)
  } catch (err) {
    console.error('[expenses/get] 查询失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.post('/expenses', authMiddleware, async (req, res) => {
  const { id, amount, category, description, date, tags, isIncome } = req.body
  const expenseId = id || genId()

  try {
    const { data: existing } = await db.collection('expenses').where({ id: expenseId }).get()

    const item = {
      id: expenseId,
      userId: req.userId,
      amount,
      category,
      description: description || '',
      date,
      tags: tags || [],
      isIncome: !!isIncome,
      createdAt: existing.length > 0 ? existing[0].createdAt : new Date().toISOString(),
    }

    if (existing.length > 0) {
      await db.collection('expenses').doc(existing[0]._id).update(item)
    } else {
      await db.collection('expenses').add(item)
    }

    res.json({ success: true, id: expenseId })
  } catch (err) {
    console.error('[expenses/post] 操作失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.delete('/expenses/:id', authMiddleware, async (req, res) => {
  try {
    const { data } = await db.collection('expenses').where({
      id: req.params.id,
      userId: req.userId
    }).get()

    for (const doc of data) {
      await db.collection('expenses').doc(doc._id).remove()
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[expenses/delete] 删除失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== BUDGETS ==========

app.get('/budgets', authMiddleware, async (req, res) => {
  const { year, month } = req.query
  if (!year || !month) return res.json([])

  try {
    const { data } = await db.collection('budgets').where({
      userId: req.userId,
      year: parseInt(year),
      month: parseInt(month)
    }).get()
    res.json(data)
  } catch (err) {
    console.error('[budgets/get] 查询失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.post('/budgets', authMiddleware, async (req, res) => {
  const { category, amount, month, year } = req.body

  try {
    const { data: existing } = await db.collection('budgets').where({
      userId: req.userId,
      category,
      month,
      year
    }).get()

    if (existing.length > 0) {
      await db.collection('budgets').doc(existing[0]._id).update({ amount })
      res.json({ success: true, id: existing[0].id })
    } else {
      const id = genId()
      await db.collection('budgets').add({ id, userId: req.userId, category, amount, month, year })
      res.json({ success: true, id })
    }
  } catch (err) {
    console.error('[budgets/post] 操作失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.delete('/budgets/:id', authMiddleware, async (req, res) => {
  try {
    const { data } = await db.collection('budgets').where({
      id: req.params.id,
      userId: req.userId
    }).get()

    for (const doc of data) {
      await db.collection('budgets').doc(doc._id).remove()
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[budgets/delete] 删除失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== USER PROFILE ==========

app.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { data: users } = await db.collection('users').where({ id: req.userId }).get()
    if (users.length === 0) return res.status(404).json({ error: '用户不存在' })
    const user = users[0]
    res.json(user.profile || { bio: '', birthday: '', hobbies: '', dream: '', nickname: '', avatar: '' })
  } catch (err) {
    console.error('[profile/get] 查询失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

app.post('/profile', authMiddleware, async (req, res) => {
  const { bio, birthday, hobbies, dream, nickname, avatar } = req.body

  try {
    const { data: users } = await db.collection('users').where({ id: req.userId }).get()
    if (users.length === 0) return res.status(404).json({ error: '用户不存在' })

    const user = users[0]
    const profile = {
      bio: bio ?? user.profile?.bio ?? '',
      birthday: birthday ?? user.profile?.birthday ?? '',
      hobbies: hobbies ?? user.profile?.hobbies ?? '',
      dream: dream ?? user.profile?.dream ?? '',
      nickname: nickname ?? user.profile?.nickname ?? '',
      avatar: avatar ?? user.profile?.avatar ?? '',
    }

    const updateData = { profile }
    if (nickname !== undefined) {
      updateData.nickname = nickname
    }

    await db.collection('users').doc(user._id).update(updateData)
    console.log(`[资料更新] ${user.username}:`, { ...profile, avatar: profile.avatar ? '(有头像)' : '' })
    res.json({ success: true, profile, nickname: updateData.nickname || user.nickname })
  } catch (err) {
    console.error('[profile/post] 更新失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== EXPORT ==========

app.get('/export', authMiddleware, async (req, res) => {
  try {
    const [expensesRes, budgetsRes] = await Promise.all([
      db.collection('expenses').where({ userId: req.userId }).get(),
      db.collection('budgets').where({ userId: req.userId }).get(),
    ])

    res.json({
      expenses: expensesRes.data,
      budgets: budgetsRes.data,
      exportDate: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[export] 查询失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== RATINGS ==========

// 提交评分
app.post('/ratings', authMiddleware, async (req, res) => {
  const { rating } = req.body
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: '评分必须在1-5之间' })
  }

  try {
    const newRating = {
      id: genId(),
      userId: req.userId,
      rating,
      createdAt: new Date().toISOString(),
    }

    await db.collection('ratings').add(newRating)
    console.log(`[评分] 用户 ${req.userId} 评分: ${rating}星`)
    res.json({ success: true, id: newRating.id })
  } catch (err) {
    console.error('[ratings/post] 添加失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 获取用户评分
app.get('/ratings', authMiddleware, async (req, res) => {
  try {
    const { data: ratings } = await db.collection('ratings').where({ userId: req.userId }).get()

    const avg = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
      : 0

    res.json({
      ratings,
      total: ratings.length,
      average: parseFloat(avg),
    })
  } catch (err) {
    console.error('[ratings/get] 查询失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== FEEDBACKS ==========

// 提交反馈
app.post('/feedbacks', authMiddleware, async (req, res) => {
  const { type, content, contact } = req.body
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '反馈内容不能为空' })
  }

  try {
    const newFeedback = {
      id: genId(),
      userId: req.userId,
      type: type || '其他',
      content: content.trim(),
      contact: contact || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }

    await db.collection('feedbacks').add(newFeedback)
    console.log(`[反馈] 用户 ${req.userId} 提交${type}反馈`)
    res.json({ success: true, id: newFeedback.id })
  } catch (err) {
    console.error('[feedbacks/post] 添加失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 获取用户反馈列表
app.get('/feedbacks', authMiddleware, async (req, res) => {
  try {
    const { data: feedbacks } = await db.collection('feedbacks').where({ userId: req.userId }).get()
    feedbacks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    res.json(feedbacks)
  } catch (err) {
    console.error('[feedbacks/get] 查询失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 获取所有反馈（管理员用）
app.get('/feedbacks/all', authMiddleware, async (req, res) => {
  try {
    const { data: feedbacks } = await db.collection('feedbacks').get()
    feedbacks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    res.json(feedbacks)
  } catch (err) {
    console.error('[feedbacks/all] 查询失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('未处理的 Promise 拒绝:', reason)
})

module.exports = app

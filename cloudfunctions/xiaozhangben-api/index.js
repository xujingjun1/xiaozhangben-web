const http = require('http')
const crypto = require('crypto')
const cloudbase = require('@cloudbase/node-sdk')

function genId() { return crypto.randomUUID() }
function hashPassword(pw) { return crypto.createHash('sha256').update(pw).digest('hex') }

// 初始化 CloudBase SDK
const ENV_ID = 'xiaozhangben-d8gpb5dueb5ae2683'
const SECRET_ID = 'AKIDIYfstiMp9MOEsLbeWDmKE2d7PnLqCMK7'
const SECRET_KEY = 'umW8bw7A2kHf5OXYTistjMn2Jiy2xiHd'
let app, db

function getDB() {
  if (db) return db
  try {
    app = cloudbase.init({
      env: ENV_ID,
      secretId: SECRET_ID,
      secretKey: SECRET_KEY,
    })
    db = app.database()
    console.log('[DB] CloudBase database initialized with env:', ENV_ID)
    return db
  } catch (err) {
    console.error('[DB] CloudBase init error:', err.message)
    return null
  }
}

// 内存存储备选
const memDb = { users: [], expenses: [], budgets: [], ratings: [], feedbacks: [] }

// 初始化数据库集合
async function initCollections(database) {
  const collections = ['users', 'expenses', 'budgets', 'ratings', 'feedbacks']
  for (const name of collections) {
    try {
      await database.collection(name).count()
      console.log(`[DB] Collection ${name} OK`)
    } catch (err) {
      if (err.code === 'DATABASE_COLLECTION_NOT_EXIST') {
        try {
          await database.createCollection(name)
          console.log(`[DB] Created collection ${name}`)
        } catch (e) {
          console.log(`[DB] Create ${name} failed:`, e.message)
        }
      }
    }
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) }
      catch (e) { resolve({}) }
    })
  })
}

async function handleRequest(req, res) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders)
    return res.end()
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  let path = url.pathname
  const method = req.method
  const body = await parseBody(req)
  const userId = req.headers['x-user-id']

  if (path.startsWith('/api')) path = path.substring(4)

  try {
    const database = getDB()
    const useMem = !database

    // Health
    if (method === 'GET' && path === '/health') {
      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ status: 'ok', storage: useMem ? 'memory' : 'cloudbase', env: ENV_ID }))
    }

    // ========== AUTH ==========
    if (method === 'POST' && path === '/auth/register') {
      const { username, password } = body
      console.log('[Register]', username)

      if (!username || username.trim().length < 1) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '请输入昵称' }))
      }
      if (!password || password.length < 6) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '密码至少6位' }))
      }

      let existing
      if (useMem) {
        existing = memDb.users.find(u => u.username === username.trim())
      } else {
        const r = await database.collection('users').where({ username: username.trim() }).get()
        existing = r.data.length > 0 ? r.data[0] : null
      }

      if (existing) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '该昵称已被注册' }))
      }

      const user = {
        _id: genId(),
        id: genId(),
        username: username.trim(),
        password: hashPassword(password),
        nickname: username.trim(),
        createdAt: new Date().toISOString(),
        profile: {}
      }

      if (useMem) {
        memDb.users.push(user)
      } else {
        await database.collection('users').add(user)
      }

      console.log('[Register OK]', user.id)
      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } }))
    }

    if (method === 'POST' && path === '/auth/login') {
      const { username, password } = body
      console.log('[Login]', username)

      if (!username || !password) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '请填写完整信息' }))
      }

      let user
      if (useMem) {
        user = memDb.users.find(u => u.username === username)
      } else {
        const r = await database.collection('users').where({ username }).get()
        user = r.data.length > 0 ? r.data[0] : null
      }

      if (!user) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '账号或密码错误' }))
      }

      if (hashPassword(password) !== user.password) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '账号或密码错误' }))
      }

      console.log('[Login OK]', user.id)
      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true, user: { id: user.id, username: user.username, nickname: user.nickname } }))
    }

    if (method === 'POST' && path === '/auth/reset-password') {
      const { username, newPassword } = body
      if (!username || !newPassword || newPassword.length < 6) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '请填写完整信息，密码至少6位' }))
      }

      let user
      if (useMem) {
        user = memDb.users.find(u => u.username === username)
        if (user) user.password = hashPassword(newPassword)
      } else {
        const r = await database.collection('users').where({ username }).get()
        if (r.data.length > 0) {
          await database.collection('users').doc(r.data[0]._id).update({ password: hashPassword(newPassword) })
          user = r.data[0]
        }
      }

      if (!user) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '账号不存在' }))
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true }))
    }

    // ========== Auth check ==========
    if (!userId) {
      res.writeHead(401, corsHeaders)
      return res.end(JSON.stringify({ error: '未登录' }))
    }

    let userData
    if (useMem) {
      userData = memDb.users.find(u => u.id === userId)
    } else {
      const r = await database.collection('users').where({ id: userId }).get()
      userData = r.data.length > 0 ? r.data[0] : null
    }

    if (!userData) {
      res.writeHead(401, corsHeaders)
      return res.end(JSON.stringify({ error: '用户不存在' }))
    }

    // ========== EXPENSES ==========
    if (method === 'GET' && path === '/expenses') {
      let data
      if (useMem) {
        data = memDb.expenses.filter(e => e.userId === userId)
        data.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''))
      } else {
        const _ = database.command
        const r = await database.collection('expenses').where({ userId }).orderBy('date', 'desc').orderBy('createdAt', 'desc').limit(1000).get()
        data = r.data
      }
      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify(data))
    }

    if (method === 'POST' && path === '/expenses') {
      const { id, amount, category, description, date, tags, isIncome } = body
      const expenseId = id || genId()

      const item = {
        id: expenseId, userId, amount: Number(amount), category, description: description || '',
        date, tags: tags || [], isIncome: !!isIncome,
        createdAt: new Date().toISOString(),
      }

      if (useMem) {
        const existing = memDb.expenses.find(e => e.id === expenseId)
        if (existing) { Object.assign(existing, item) } else { memDb.expenses.push(item) }
      } else {
        const r = await database.collection('expenses').where({ id: expenseId }).get()
        if (r.data.length > 0) {
          await database.collection('expenses').doc(r.data[0]._id).update(item)
        } else {
          item._id = genId()
          await database.collection('expenses').add(item)
        }
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true, id: expenseId }))
    }

    if (method === 'DELETE' && path.startsWith('/expenses/')) {
      const expenseId = path.split('/expenses/')[1]

      if (useMem) {
        memDb.expenses = memDb.expenses.filter(e => !(e.id === expenseId && e.userId === userId))
      } else {
        const r = await database.collection('expenses').where({ id: expenseId, userId }).get()
        if (r.data.length > 0) {
          await database.collection('expenses').doc(r.data[0]._id).remove()
        }
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true }))
    }

    // ========== BUDGETS ==========
    if (method === 'GET' && path === '/budgets') {
      const year = parseInt(url.searchParams.get('year') || '0')
      const month = parseInt(url.searchParams.get('month') || '0')
      if (!year || !month) {
        res.writeHead(200, corsHeaders)
        return res.end(JSON.stringify([]))
      }

      let data
      if (useMem) {
        data = memDb.budgets.filter(b => b.userId === userId && b.year === year && b.month === month)
      } else {
        const r = await database.collection('budgets').where({ userId, year, month }).get()
        data = r.data
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify(data))
    }

    if (method === 'POST' && path === '/budgets') {
      const { category, amount, month, year } = body

      if (useMem) {
        const existing = memDb.budgets.find(b => b.userId === userId && b.category === category && b.month === month && b.year === year)
        if (existing) {
          existing.amount = amount
          res.writeHead(200, corsHeaders)
          return res.end(JSON.stringify({ success: true, id: existing.id }))
        } else {
          const id = genId()
          memDb.budgets.push({ id, userId, category, amount, month, year })
          res.writeHead(200, corsHeaders)
          return res.end(JSON.stringify({ success: true, id }))
        }
      } else {
        const r = await database.collection('budgets').where({ userId, category, month, year }).get()
        if (r.data.length > 0) {
          await database.collection('budgets').doc(r.data[0]._id).update({ amount: Number(amount) })
          res.writeHead(200, corsHeaders)
          return res.end(JSON.stringify({ success: true, id: r.data[0].id }))
        } else {
          const id = genId()
          await database.collection('budgets').add({ _id: genId(), id, userId, category, amount: Number(amount), month, year })
          res.writeHead(200, corsHeaders)
          return res.end(JSON.stringify({ success: true, id }))
        }
      }
    }

    if (method === 'DELETE' && path.startsWith('/budgets/')) {
      const budgetId = path.split('/budgets/')[1]

      if (useMem) {
        memDb.budgets = memDb.budgets.filter(b => !(b.id === budgetId && b.userId === userId))
      } else {
        const r = await database.collection('budgets').where({ id: budgetId, userId }).get()
        if (r.data.length > 0) {
          await database.collection('budgets').doc(r.data[0]._id).remove()
        }
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true }))
    }

    // ========== PROFILE ==========
    if (method === 'GET' && path === '/profile') {
      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify(userData.profile || {}))
    }

    if (method === 'POST' && path === '/profile') {
      const { bio, birthday, hobbies, dream, nickname, avatar } = body
      const profile = {
        bio: bio ?? userData.profile?.bio ?? '',
        birthday: birthday ?? userData.profile?.birthday ?? '',
        hobbies: hobbies ?? userData.profile?.hobbies ?? '',
        dream: dream ?? userData.profile?.dream ?? '',
        nickname: nickname ?? userData.profile?.nickname ?? '',
        avatar: avatar ?? userData.profile?.avatar ?? '',
      }

      if (useMem) {
        userData.profile = profile
        if (nickname !== undefined) userData.nickname = nickname
      } else {
        const updateData = { profile }
        if (nickname !== undefined) updateData.nickname = nickname
        await database.collection('users').doc(userData._id).update(updateData)
        userData.profile = profile
        if (nickname !== undefined) userData.nickname = nickname
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true, profile, nickname: userData.nickname }))
    }

    // ========== EXPORT ==========
    if (method === 'GET' && path === '/export') {
      let expensesData, budgetsData

      if (useMem) {
        expensesData = memDb.expenses.filter(e => e.userId === userId)
        budgetsData = memDb.budgets.filter(b => b.userId === userId)
      } else {
        const r1 = await database.collection('expenses').where({ userId }).limit(1000).get()
        const r2 = await database.collection('budgets').where({ userId }).limit(1000).get()
        expensesData = r1.data
        budgetsData = r2.data
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ expenses: expensesData, budgets: budgetsData, exportDate: new Date().toISOString() }))
    }

    // ========== RATINGS ==========
    if (method === 'POST' && path === '/ratings') {
      const { rating } = body
      if (!rating || rating < 1 || rating > 5) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '评分必须在1-5之间' }))
      }

      const ratingItem = { _id: genId(), id: genId(), userId, rating, createdAt: new Date().toISOString() }

      if (useMem) {
        memDb.ratings.push(ratingItem)
      } else {
        await database.collection('ratings').add(ratingItem)
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true }))
    }

    if (method === 'GET' && path === '/ratings') {
      let ratings
      if (useMem) {
        ratings = memDb.ratings.filter(r => r.userId === userId)
      } else {
        const r = await database.collection('ratings').where({ userId }).get()
        ratings = r.data
      }

      const avg = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1) : 0
      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ ratings, total: ratings.length, average: parseFloat(avg) }))
    }

    // ========== FEEDBACKS ==========
    if (method === 'POST' && path === '/feedbacks') {
      const { type, content, contact } = body
      if (!content || content.trim().length === 0) {
        res.writeHead(400, corsHeaders)
        return res.end(JSON.stringify({ error: '反馈内容不能为空' }))
      }

      const feedbackItem = { _id: genId(), id: genId(), userId, type: type || '其他', content: content.trim(), contact: contact || '', status: 'pending', createdAt: new Date().toISOString() }

      if (useMem) {
        memDb.feedbacks.push(feedbackItem)
      } else {
        await database.collection('feedbacks').add(feedbackItem)
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify({ success: true }))
    }

    if (method === 'GET' && path === '/feedbacks') {
      let data
      if (useMem) {
        data = memDb.feedbacks.filter(f => f.userId === userId)
      } else {
        const r = await database.collection('feedbacks').where({ userId }).orderBy('createdAt', 'desc').get()
        data = r.data
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify(data))
    }

    if (method === 'GET' && path === '/feedbacks/all') {
      let data
      if (useMem) {
        data = [...memDb.feedbacks]
      } else {
        const r = await database.collection('feedbacks').orderBy('createdAt', 'desc').limit(1000).get()
        data = r.data
      }

      res.writeHead(200, corsHeaders)
      return res.end(JSON.stringify(data))
    }

    // 404
    res.writeHead(404, corsHeaders)
    res.end(JSON.stringify({ error: 'Not Found', path }))

  } catch (err) {
    console.error('[Error]', err)
    res.writeHead(500, corsHeaders)
    res.end(JSON.stringify({ error: '服务器错误', message: err.message }))
  }
}

// 初始化
async function start() {
  console.log('Starting server...')
  const database = getDB()
  if (database) {
    await initCollections(database)
  }

  const server = http.createServer(handleRequest)
  const PORT = process.env.PORT || 8080
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}, storage: ${database ? 'cloudbase' : 'memory'}`)
  })
}

start()

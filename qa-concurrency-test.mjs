// 并发写入测试：验证多用户同时记账时 db.json 是否会丢数据
// 用法: node qa-concurrency-test.mjs [baseUrl] [并发数]
const S = process.argv[2] || 'http://127.0.0.1:3201'
const N = Number(process.argv[3] || 30)
const H = { 'Content-Type': 'application/json' }

const req = async (p, m, b, uid) => {
  const h = { ...H }
  if (uid) { h['User-Id'] = uid; h['Authorization'] = 'Bearer ' + uid; h['X-User-Id'] = uid }
  const r = await fetch(S + p, { method: m, headers: h, body: b ? JSON.stringify(b) : null })
  let j = null; try { j = await r.json() } catch {}
  return { s: r.status, j }
}
const P = (n, c, ok) => console.log((ok ? '✅' : '❌') + ' ' + n + '  ' + c)

;(async () => {
  const U = 'cc_' + Date.now().toString().slice(-6)
  let r = await req('/api/auth/register', 'POST', { username: U, password: 'cctest123456' })
  if (r.s !== 200) r = await req('/api/auth/login', 'POST', { username: U, password: 'cctest123456' })
  const uid = r.j && r.j.user && r.j.user.id
  if (!uid) { console.log('注册失败', JSON.stringify(r.j)); return }

  // 场景1: 同一用户并发写入 N 条
  const tasks = []
  for (let i = 0; i < N; i++) {
    tasks.push(req('/api/expenses', 'POST', {
      amount: 10 + i, category: '餐饮', description: '并发测试' + i, date: '2026-09-25',
    }, uid))
  }
  const results = await Promise.all(tasks)
  const okCount = results.filter(x => x.s === 200).length
  console.log(`[场景1] 同一用户并发写 ${N} 条 => 接口成功 ${okCount} 条`)

  const list = await req('/api/expenses', 'GET', null, uid)
  const mine = (Array.isArray(list.j) ? list.j : []).filter(e => e.description && e.description.startsWith('并发测试'))
  console.log(`         实际落库 ${mine.length} 条  ${mine.length === N ? '✅ 无丢失' : '❌ 丢失 ' + (N - mine.length) + ' 条'}`)

  // 场景2: 多用户并发（模拟真实推广后多人同时用）
  const users = []
  for (let i = 0; i < 5; i++) {
    const un = 'cc_m' + Date.now().toString().slice(-5) + '_' + i
    let rr = await req('/api/auth/register', 'POST', { username: un, password: 'cctest123456' })
    if (rr.s !== 200) rr = await req('/api/auth/login', 'POST', { username: un, password: 'cctest123456' })
    users.push({ uid: rr.j && rr.j.user && rr.j.user.id, name: un })
  }
  const multi = []
  users.forEach((u, ui) => {
    if (!u.uid) return
    for (let i = 0; i < 6; i++) {
      multi.push(req('/api/expenses', 'POST', {
        amount: 1, category: '其他', description: 'M' + ui + '_' + i, date: '2026-09-25',
      }, u.uid))
    }
  })
  await Promise.all(multi)
  let total = 0
  for (const u of users) {
    if (!u.uid) continue
    const l = await req('/api/expenses', 'GET', null, u.uid)
    const c = (Array.isArray(l.j) ? l.j : []).filter(e => e.description && e.description.startsWith('M')).length
    total += c
  }
  console.log(`[场景2] 5 个用户并发各写 6 条 => 实际落库 ${total} / 30 条  ${total === 30 ? '✅ 无丢失' : '❌ 丢失 ' + (30 - total) + ' 条'}`)

  // 场景3: 并发写 + 并发读混合，看是否报错或损坏
  const mixed = []
  for (let i = 0; i < 20; i++) {
    mixed.push(req('/api/expenses', 'POST', { amount: 5, category: '交通', description: 'X' + i, date: '2026-09-25' }, uid))
    mixed.push(req('/api/expenses', 'GET', null, uid))
  }
  const mr = await Promise.all(mixed)
  const errs = mr.filter(x => x.s >= 500).length
  console.log(`[场景3] 40 个读写混合请求 => 5xx 错误 ${errs} 个 ${errs === 0 ? '✅' : '❌'}`)

  const finalList = await req('/api/expenses', 'GET', null, uid)
  console.log(`[完整性] 最终仍能正常读取: ${Array.isArray(finalList.j) ? '✅' : '❌ 数据结构损坏'}`)
})()

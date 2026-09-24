// 小账本 API 自动化测试脚本 (针对运行中的 http://localhost:3001)
const BASE = 'http://localhost:3001/api'
const results = []
function record(name, pass, detail) { results.push({ name, pass, detail }) }

async function req(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data
  try { data = await res.json() } catch { data = { _raw: 'non-json' } }
  return { status: res.status, data }
}

const TEST_USER = 'qa_test_' + Date.now()

// ---------- 1. 健康检查 ----------
{
  const r = await req('/health')
  record('健康检查 GET /health', r.status === 200 && r.data.status === 'ok', `status=${r.status}`)
}

// ---------- 2. 注册 ----------
{
  const r = await req('/auth/register', { method: 'POST', body: { username: TEST_USER, password: 'test123456' } })
  record('注册-正常流程', Boolean(r.status === 200 && r.data.success === true && r.data.user?.id), `status=${r.status} id=${r.data.user?.id}`)

  const r2 = await req('/auth/register', { method: 'POST', body: { username: TEST_USER, password: 'test123456' } })
  record('注册-重复用户名应拒绝', r2.status === 400, `status=${r2.status} msg=${r2.data.error}`)

  const r3 = await req('/auth/register', { method: 'POST', body: { username: 'qa_short_' + Date.now(), password: '123' } })
  record('注册-短密码应拒绝', r3.status === 400 && /6/.test(r3.data.error || ''), `status=${r3.status} msg=${r3.data.error}`)

  const r4 = await req('/auth/register', { method: 'POST', body: { username: '', password: '12345678' } })
  record('注册-空用户名应拒绝', r4.status === 400, `status=${r4.status} msg=${r4.data.error}`)
}

// ---------- 3. 登录 ----------
let USER_ID = ''
{
  const r = await req('/auth/login', { method: 'POST', body: { username: TEST_USER, password: 'test123456' } })
  record('登录-正确密码', Boolean(r.status === 200 && r.data.user?.id), `status=${r.status}`)
  USER_ID = r.data.user?.id || ''

  const r2 = await req('/auth/login', { method: 'POST', body: { username: TEST_USER, password: 'wrongpass' } })
  record('登录-错误密码应拒绝', r2.status === 400, `status=${r2.status} msg=${r2.data.error}`)

  const r3 = await req('/auth/login', { method: 'POST', body: { username: 'no_such_user_x9', password: 'whatever1' } })
  record('登录-不存在用户应拒绝', r3.status === 400, `status=${r3.status} msg=${r3.data.error}`)

  const r4 = await req('/auth/login', { method: 'POST', body: { username: '', password: '' } })
  record('登录-空字段应拒绝', r4.status === 400, `status=${r4.status}`)
}

const AUTH = { 'X-User-Id': USER_ID }

// ---------- 4. 未授权访问 ----------
{
  const r = await req('/expenses')
  record('未登录访问支出列表应401', r.status === 401, `status=${r.status} msg=${r.data.error}`)

  const r2 = await req('/expenses', { headers: { 'X-User-Id': '00000000-0000-0000-0000-000000000000' } })
  record('伪造用户ID应401', r2.status === 401, `status=${r2.status} msg=${r2.data.error}`)
}

// ---------- 5. 支出 CRUD ----------
let EXP_ID = ''
{
  const r = await req('/expenses', { method: 'POST', headers: AUTH, body: { amount: 25.5, category: '餐饮', description: '午餐', date: '2026-09-24', tags: ['测试'], isIncome: false } })
  record('新增支出', r.status === 200 && r.data.success, `status=${r.status} id=${r.data.id}`)
  EXP_ID = r.data.id

  const r2 = await req('/expenses', { headers: AUTH })
  record('查询支出列表', r2.status === 200 && Array.isArray(r2.data) && r2.data.some(e => e.id === EXP_ID), `status=${r2.status} count=${r2.data.length}`)

  const r3 = await req('/expenses', { method: 'POST', headers: AUTH, body: { id: EXP_ID, amount: 99.9, category: '餐饮', description: '午餐-改', date: '2026-09-24', tags: [], isIncome: false } })
  const r4 = await req('/expenses', { headers: AUTH })
  const updated = r4.data.find(e => e.id === EXP_ID)
  record('更新支出(同ID覆盖)', r3.status === 200 && updated?.amount === 99.9 && updated?.description === '午餐-改', `amount=${updated?.amount} desc=${updated?.description}`)

  // PUT 精确更新
  const r3b = await req(`/expenses/${EXP_ID}`, { method: 'PUT', headers: AUTH, body: { amount: 88.8, category: '交通', description: 'PUT更新', date: '2026-09-24', tags: [], isIncome: false } })
  const r3c = await req('/expenses', { headers: AUTH })
  const putUpdated = r3c.data.find(e => e.id === EXP_ID)
  record('PUT 更新支出', r3b.status === 200 && putUpdated?.amount === 88.8 && putUpdated?.category === '交通' && putUpdated?.description === 'PUT更新', `amount=${putUpdated?.amount} category=${putUpdated?.category}`)

  const r3d = await req('/expenses/nonexistent-id', { method: 'PUT', headers: AUTH, body: { amount: 10, category: '餐饮', date: '2026-09-24' } })
  record('PUT-不存在记录应404', r3d.status === 404, `status=${r3d.status} msg=${r3d.data.error}`)

  // 边界: 负数金额 / 非法日期 / 缺字段（服务端已做校验，应返回 400）
  const r5 = await req('/expenses', { method: 'POST', headers: AUTH, body: { amount: -10, category: '餐饮', date: '2026-09-24' } })
  record('边界-负数金额应拒绝', r5.status === 400, `status=${r5.status} msg=${r5.data.error}`)

  const r6 = await req('/expenses', { method: 'POST', headers: AUTH, body: { amount: 10, date: 'not-a-date' } })
  record('边界-非法日期应拒绝', r6.status === 400, `status=${r6.status} msg=${r6.data.error}`)

  const r7 = await req('/expenses/nonexistent-id', { method: 'DELETE', headers: AUTH })
  record('边界-删除不存在ID仍返回成功', r7.status === 200, `status=${r7.status} (幂等设计,非缺陷)`)
}

// ---------- 6. 预算 ----------
let BUD_ID = ''
{
  const r = await req('/budgets?year=2026&month=9', { headers: AUTH })
  record('查询预算-无数据返回空数组', r.status === 200 && Array.isArray(r.data), `status=${r.status} count=${r.data.length}`)

  const r2 = await req('/budgets', { method: 'POST', headers: AUTH, body: { category: '餐饮', amount: 1000, month: 9, year: 2026 } })
  record('新增预算', r2.status === 200 && r2.data.success, `status=${r2.status} id=${r2.data.id}`)
  BUD_ID = r2.data.id

  const r3 = await req('/budgets', { method: 'POST', headers: AUTH, body: { category: '餐饮', amount: 2000, month: 9, year: 2026 } })
  const r4 = await req('/budgets?year=2026&month=9', { headers: AUTH })
  const b = r4.data.find(x => x.category === '餐饮')
  record('更新预算(同分类+月份覆盖)', r3.status === 200 && b?.amount === 2000, `amount=${b?.amount}`)

  const r5 = await req('/budgets', { headers: AUTH })
  record('边界-缺year/month参数返回空数组', r5.status === 200 && Array.isArray(r5.data), `status=${r5.status}`)
}

// ---------- 7. 个人资料 ----------
{
  const r = await req('/profile', { headers: AUTH })
  record('查询资料-默认空资料', r.status === 200 && r.data && 'bio' in r.data, `status=${r.status}`)

  const r2 = await req('/profile', { method: 'POST', headers: AUTH, body: { bio: '测试简介', nickname: 'QA测试员', dream: '世界和平' } })
  record('更新资料', r2.status === 200 && r2.data.profile?.bio === '测试简介', `status=${r2.status}`)

  const r3 = await req('/profile', { headers: AUTH })
  record('资料持久化读取', r3.data.bio === '测试简介' && r3.data.nickname === 'QA测试员', `bio=${r3.data.bio}`)
}

// ---------- 8. 数据导出 ----------
{
  const r = await req('/export', { headers: AUTH })
  record('导出全部数据', r.status === 200 && Array.isArray(r.data.expenses) && r.data.expenses.length >= 1 && r.data.budgets?.length >= 1, `expenses=${r.data.expenses?.length} budgets=${r.data.budgets?.length}`)
}

// ---------- 9. 评分 ----------
{
  const r = await req('/ratings', { method: 'POST', headers: AUTH, body: { rating: 5 } })
  record('提交评分5星', r.status === 200 && r.data.success, `status=${r.status}`)

  const r2 = await req('/ratings', { method: 'POST', headers: AUTH, body: { rating: 0 } })
  record('边界-评分0应拒绝', r2.status === 400, `status=${r2.status} msg=${r2.data.error}`)

  const r3 = await req('/ratings', { method: 'POST', headers: AUTH, body: { rating: 6 } })
  record('边界-评分6应拒绝', r3.status === 400, `status=${r3.status} msg=${r3.data.error}`)

  const r4 = await req('/ratings', { method: 'POST', headers: AUTH, body: { rating: 4 } })
  const r5 = await req('/ratings', { headers: AUTH })
  record('评分统计(平均分)', r5.status === 200 && r5.data.total === 2 && r5.data.average === 4.5, `total=${r5.data.total} avg=${r5.data.average}`)
}

// ---------- 10. 反馈 ----------
{
  const r = await req('/feedbacks', { method: 'POST', headers: AUTH, body: { content: '' } })
  record('边界-空反馈内容应拒绝', r.status === 400, `status=${r.status} msg=${r.data.error}`)

  const r2 = await req('/feedbacks', { method: 'POST', headers: AUTH, body: { type: '功能建议', content: '  自动化测试反馈内容  ', contact: 'qa@test.com' } })
  record('提交反馈(含trim)', r2.status === 200 && r2.data.success, `status=${r2.status}`)

  const r3 = await req('/feedbacks', { headers: AUTH })
  const f = r3.data?.[0]
  record('查询我的反馈列表', r3.status === 200 && f?.content === '自动化测试反馈内容', `content=${f?.content}`)

  const r4 = await req('/feedbacks/all', { headers: AUTH })
  record('边界-非管理员访问全部反馈应403', r4.status === 403, `status=${r4.status} msg=${r4.data.error}`)
}

// ---------- 11. 重置密码 ----------
{
  const r = await req('/auth/reset-password', { method: 'POST', body: { username: TEST_USER, newPassword: 'newpass123' } })
  record('重置密码', r.status === 200 && r.data.success, `status=${r.status}`)

  const r2 = await req('/auth/login', { method: 'POST', body: { username: TEST_USER, password: 'newpass123' } })
  record('新密码可登录', r2.status === 200, `status=${r2.status}`)

  const r3 = await req('/auth/reset-password', { method: 'POST', body: { username: 'no_user_x9', newPassword: 'newpass123' } })
  record('边界-不存在用户重置应拒绝', r3.status === 400, `status=${r3.status}`)
}

// ---------- 12. 404 与错误处理 ----------
{
  const r = await req('/no_such_endpoint')
  record('不存在端点返回HTML回退页', r.status === 404 || r.data._raw === 'non-json', `status=${r.status} (SPA回退)`)
}

// ---------- 汇总 ----------
console.log('\n========== API 测试结果 ==========')
let pass = 0, fail = 0
for (const r of results) {
  const ok = r.pass === true || r.pass === 'accepted:true'
  if (ok) pass++; else fail++
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail}`)
}
console.log(`\n总计: ${pass} 通过 / ${fail} 失败`)
console.log('TEST_USER=' + TEST_USER)
console.log('USER_ID=' + USER_ID)
console.log('EXP_ID=' + EXP_ID)
console.log('BUD_ID=' + BUD_ID)

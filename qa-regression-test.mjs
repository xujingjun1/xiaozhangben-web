// 三件套改动后的业务回归测试 (非 auth 端点, 不受限流影响)
const BASE = 'http://localhost:3102/api'
const USER_ID = '34c65cec-e6b9-4510-b641-2a06fd973160' // 原有用户 xu
const AUTH = { 'X-User-Id': USER_ID }
const results = []
function record(name, pass, detail = '') {
  results.push({ name, pass: !!pass, detail })
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`)
}
async function req(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let data; try { data = await res.json() } catch { data = {} }
  return { status: res.status, data }
}

// 健康
{
  const r = await req('/health')
  record('健康检查', r.status === 200 && r.data.status === 'ok')
}

// 支出 CRUD + 原子写入下的持久化
let eid = ''
{
  const r = await req('/expenses', { method: 'POST', headers: AUTH, body: { amount: 12.34, category: '餐饮', description: '回归测试', date: '2026-09-24', isIncome: false } })
  record('新增支出', r.status === 200 && r.data.success)
  eid = r.data.id
  const r2 = await req('/expenses', { headers: AUTH })
  record('查询列表(含新记录)', r2.status === 200 && r2.data.some(e => e.id === eid))
  const r3 = await req(`/expenses/${eid}`, { method: 'DELETE', headers: AUTH })
  record('删除支出', r3.status === 200)
  const r4 = await req('/expenses', { headers: AUTH })
  record('删除后列表已移除', !r4.data.some(e => e.id === eid))
}

// 预算
{
  const r = await req('/budgets', { method: 'POST', headers: AUTH, body: { category: '回归', amount: 1, month: 9, year: 2026 } })
  record('新增预算', r.status === 200 && r.data.success)
  if (r.data.id) await req(`/budgets/${r.data.id}`, { method: 'DELETE', headers: AUTH })
}

// 资料 / 导出 / 评分 / 反馈
{
  const r = await req('/profile', { headers: AUTH })
  record('查询资料', r.status === 200)
  const r2 = await req('/export', { headers: AUTH })
  record('导出数据', r2.status === 200 && Array.isArray(r2.data.expenses))
  const r3 = await req('/ratings', { headers: AUTH })
  record('查询评分', r3.status === 200)
  const r4 = await req('/feedbacks', { headers: AUTH })
  record('查询反馈', r4.status === 200)
}

// 鉴权边界
{
  const r = await req('/expenses')
  record('未登录仍返回401', r.status === 401)
  const r2 = await req('/expenses', { headers: { 'X-User-Id': 'fake-user' } })
  record('伪造ID仍返回401', r2.status === 401)
}

console.log(`\n总计: ${results.filter(r => r.pass).length} 通过 / ${results.filter(r => !r.pass).length} 失败`)

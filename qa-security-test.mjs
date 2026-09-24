// 三件套安全加固验证脚本 (针对 3102 新代码实例)
const BASE = 'http://localhost:3102/api'
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
const fs = await import('fs')

const U = 'qa_sec_' + Date.now()

// ---------- 1. 新注册用户使用 scrypt ----------
{
  const r = await req('/auth/register', { method: 'POST', body: { username: U, password: 'sec123456' } })
  record('注册成功', r.status === 200 && r.data.success, `id=${r.data.user?.id}`)
  const db = JSON.parse(fs.readFileSync('D:/xjj/1/xiaozhangben-web/api/data/db.json', 'utf-8'))
  const u = db.users.find(x => x.username === U)
  record('密码已存为 scrypt 加盐格式', u?.password?.startsWith('scrypt$'), (u?.password || '').slice(0, 20) + '...')
  record('scrypt 哈希含独立盐', (() => {
    const a = u.password.split('$')
    return a.length === 3 && a[1].length === 32 && a[2].length === 128
  })(), 'salt=32hex hash=128hex')
}

// ---------- 2. 登录验证 (scrypt) ----------
{
  const r = await req('/auth/login', { method: 'POST', body: { username: U, password: 'sec123456' } })
  record('scrypt 用户登录成功', r.status === 200 && r.data.success)
  const r2 = await req('/auth/login', { method: 'POST', body: { username: U, password: 'wrong' } })
  record('错误密码被拒绝', r2.status === 400)
}

// ---------- 3. 旧 sha256 哈希兼容 + 自动升级 ----------
{
  // 人为把该用户密码改回旧 sha256 格式
  const dbPath = 'D:/xjj/1/xiaozhangben-web/api/data/db.json'
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  const u = db.users.find(x => x.username === U)
  const legacy = (await import('crypto')).createHash('sha256').update('sec123456').digest('hex')
  u.password = legacy
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
  // 用旧格式登录 → 应成功并自动升级
  const r = await req('/auth/login', { method: 'POST', body: { username: U, password: 'sec123456' } })
  record('旧 sha256 用户仍可登录(兼容)', r.status === 200 && r.data.success)
  const db2 = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  const u2 = db2.users.find(x => x.username === U)
  record('登录后自动升级为 scrypt', u2.password.startsWith('scrypt$'), u2.password.slice(0, 14) + '...')
}

// ---------- 4. 速率限制 ----------
{
  // 当前 IP 已消耗: 注册1 + 登录3 + 接下来连续错误登录
  let got429 = false, lastStatus = 0
  for (let i = 0; i < 15; i++) {
    const r = await req('/auth/login', { method: 'POST', body: { username: U, password: 'bruteforce' + i } })
    lastStatus = r.status
    if (r.status === 429) { got429 = true; record('暴力尝试被限流(429)', true, `第 ${4 + i} 次请求触发: ${r.data.error}`); break }
  }
  if (!got429) record('暴力尝试被限流(429)', false, `15次后仍返回 ${lastStatus}, 未触发限流`)
  // 限流也应挡住注册
  const r = await req('/auth/register', { method: 'POST', body: { username: 'blocked_' + Date.now(), password: 'x123456' } })
  record('限流期间注册也被拦截', r.status === 429, `status=${r.status}`)
}

// ---------- 5. 原子写入验证 ----------
{
  const tmpExists = fs.existsSync('D:/xjj/1/xiaozhangben-web/api/data/db.json.tmp')
  record('无残留 .tmp 文件(写入后已原子重命名)', !tmpExists)
  // db.json 仍是合法 JSON
  try {
    const db = JSON.parse(fs.readFileSync('D:/xjj/1/xiaozhangben-web/api/data/db.json', 'utf-8'))
    record('db.json 结构完整', Array.isArray(db.users) && Array.isArray(db.expenses))
  } catch (e) {
    record('db.json 结构完整', false, e.message)
  }
}

// ---------- 清理测试用户 ----------
{
  const dbPath = 'D:/xjj/1/xiaozhangben-web/api/data/db.json'
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  db.users = db.users.filter(x => !x.username.startsWith('qa_sec_'))
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2))
  record('清理测试用户', true)
}

console.log(`\n总计: ${results.filter(r => r.pass).length} 通过 / ${results.filter(r => !r.pass).length} 失败`)

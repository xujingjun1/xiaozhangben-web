<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isAndroid = /android/i.test(navigator.userAgent)
const scrolled = ref(false)

function onScroll() { scrolled.value = window.scrollY > 50 }

// ===== 统计数字滚动动画 =====
const stats = [
  { value: 3, suffix: '秒', label: '完成一笔记账', decimals: 0 },
  { value: 0, suffix: '', label: '广告与会员收费', decimals: 0 },
  { value: 100, suffix: '%', label: '功能免费开放', decimals: 0 },
  { value: 9, suffix: '+', label: '智能消费分类', decimals: 0 },
]
const statDisplay = ref(stats.map(() => '0'))
let statAnimated = false
function animateStats() {
  if (statAnimated) return
  statAnimated = true
  const duration = 1400
  const start = performance.now()
  function tick(now: number) {
    const p = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - p, 3)
    statDisplay.value = stats.map(s => (s.value * eased).toFixed(s.decimals))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// ===== 滚动入场动效 =====
let observer: IntersectionObserver | null = null
onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const els = document.querySelectorAll('[data-reveal]')
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('revealed'))
    animateStats()
    return
  }
  observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed')
        if (e.target.hasAttribute('data-stats')) animateStats()
        observer?.unobserve(e.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
  els.forEach(el => observer!.observe(el))
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
})

// 注意: 不能使用 href="#xxx" 锚点 —— hash 路由会把它当成路由跳转并触发兜底重定向
function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

const marqueeWords = ['智能分类', 'OCR 拍照识别', '云端同步', '预算预警', '账单分享图', '数据导出', '每日提醒', 'PWA 安装', '报表分析', '隐私保护']

const faqs = [
  { q: '小账本收费吗？有广告吗？', a: '完全免费，没有广告，也没有会员体系。所有核心功能——记账、报表、预算、OCR 识别、数据导出——全部开放，永久免费。' },
  { q: '我的数据安全吗？', a: '注册只需昵称，不需要手机号和任何个人信息。数据加密存储并每日自动备份，你还可以随时一键导出 CSV 或 JSON 备份到本地，数据完全属于你自己。' },
  { q: '支持哪些设备？', a: '手机和电脑浏览器都能直接使用；安卓用户可以下载 App；在浏览器里还可以"添加到主屏幕"，获得和原生 App 一样的全屏体验。多设备登录同一账号，数据实时同步。' },
  { q: '拍照记账识别不准怎么办？', a: 'OCR 识别后会自动填入金额和分类，保存前你都可以手动修改。智能分类也会随着你的使用习惯越来越准。' },
  { q: '换手机了数据还在吗？', a: '在。数据保存在云端，新设备登录同一个账号即可看到全部账单。也建议定期在"设置-数据管理"里导出备份。' },
]
</script>

<template>
<div class="land">
  <!-- ===== 顶部导航 ===== -->
  <nav class="ln" :class="{ scrolled }">
    <div class="lni">
      <div class="ll"><span class="lli">$</span>小账本</div>
      <button class="lcb" @click="scrollTo('download')">{{ isAndroid ? '下载 App' : '立即使用' }}</button>
    </div>
  </nav>

  <!-- ===== 首屏 Hero ===== -->
  <section class="lh">
    <div class="lhb"></div>
    <div class="lhgrid"></div>
    <div class="lhi">
      <div class="lht">
        <div class="lbadge" data-reveal><span class="lbadge-dot"></span>智能记账助手</div>
        <h1 class="lt" data-reveal style="--d:.08s">记录生活的<br/>每一笔温暖</h1>
        <p class="ls" data-reveal style="--d:.16s">简洁高效的个人记账应用，智能分类、拍照识别、云端同步，让理财变得简单有趣。</p>
        <div class="lbtns" data-reveal style="--d:.24s">
          <a v-if="isAndroid" href="/app-latest.apk" class="lb lb1"><span class="material-icons-round">download</span>下载 App</a>
          <a v-else href="/#/login" class="lb lb1"><span class="material-icons-round">open_in_new</span>打开网页版</a>
          <a class="lb lb2" @click.prevent="scrollTo('features')">了解更多</a>
        </div>
        <div class="ltrust" data-reveal style="--d:.32s">
          <span><span class="material-icons-round">check_circle</span>无需手机号</span>
          <span><span class="material-icons-round">check_circle</span>永久免费</span>
          <span><span class="material-icons-round">check_circle</span>数据可导出</span>
        </div>
      </div>
      <div class="lhv" data-reveal style="--d:.2s">
        <div class="lphglow"></div>
        <div class="lph">
          <div class="lphn"></div>
          <div class="lphs">
            <div class="lphh"><div style="font-size:2rem;margin-bottom:4px">$</div><div style="font-size:.85rem;font-weight:600">小账本</div></div>
            <div class="lpht"><div style="font-size:.65rem;color:#999">本月支出</div><div style="font-size:1.1rem;font-weight:800">¥2,580</div></div>
            <div class="lphc">
              <div class="lphr"><span>🍔</span><div><div class="lphn2">午餐</div><div class="lphd">今天 12:30</div></div><div class="lpha">-¥35</div></div>
              <div class="lphr"><span>🚌</span><div><div class="lphn2">地铁</div><div class="lphd">今天 08:15</div></div><div class="lpha">-¥4</div></div>
              <div class="lphr"><span>💰</span><div><div class="lphn2">工资</div><div class="lphd">昨天 10:00</div></div><div class="lpha lhai">+¥8,500</div></div>
            </div>
          </div>
          <div class="lphshine"></div>
        </div>
        <!-- 悬浮功能气泡 -->
        <div class="lchip lchip1">
          <div class="lchip-i" style="background:rgba(78,205,196,.15);color:#4ECDC4"><span class="material-icons-round">photo_camera</span></div>
          <div><div class="lchip-t">拍照识别成功</div><div class="lchip-s">餐饮 · ¥35.00</div></div>
        </div>
        <div class="lchip lchip2">
          <div class="lchip-i" style="background:rgba(255,101,132,.15);color:#FF6584"><span class="material-icons-round">notifications_active</span></div>
          <div><div class="lchip-t">预算提醒</div><div class="lchip-s">餐饮预算已用 86%</div></div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== 数据统计条 ===== -->
  <section class="lstats" data-reveal data-stats>
    <div class="lstatsi">
      <div v-for="(s, i) in stats" :key="i" class="lstat">
        <div class="lstat-v">{{ statDisplay[i] }}<em>{{ s.suffix }}</em></div>
        <div class="lstat-l">{{ s.label }}</div>
      </div>
    </div>
  </section>

  <!-- ===== 滚动标签带 ===== -->
  <div class="lmarq">
    <div class="lmarqt">
      <span v-for="(w, i) in [...marqueeWords, ...marqueeWords]" :key="i">{{ w }}<i>·</i></span>
    </div>
  </div>

  <!-- ===== 大场景展示 01: 拍照识别 ===== -->
  <section class="lshow" id="features">
    <div class="lshowi">
      <div class="lshowt" data-reveal>
        <div class="lst">OCR 智能识别</div>
        <h2 class="lstt">拍张小票，账就记好了</h2>
        <p class="lshowp">对着购物小票拍一张照片，自动提取金额、识别分类、填入账单。从掏出手机到记账完成，不超过 5 秒。</p>
        <ul class="lshowlist">
          <li><span class="material-icons-round">auto_awesome</span>自动提取金额与商户信息</li>
          <li><span class="material-icons-round">category</span>智能匹配消费分类</li>
          <li><span class="material-icons-round">edit</span>识别结果可手动修正</li>
        </ul>
      </div>
      <div class="lshowv" data-reveal style="--d:.15s">
        <div class="lmock">
          <!-- 小票 -->
          <div class="lreceipt">
            <div class="lreceipt-h">便利店小票</div>
            <div class="lreceipt-r"><span>午餐便当</span><span>¥28.00</span></div>
            <div class="lreceipt-r"><span>美式咖啡</span><span>¥7.00</span></div>
            <div class="lreceipt-line"></div>
            <div class="lreceipt-r lreceipt-t"><span>合计</span><span>¥35.00</span></div>
            <div class="lreceipt-scan"></div>
          </div>
          <div class="larrow"><span class="material-icons-round">arrow_forward</span></div>
          <!-- 识别结果卡 -->
          <div class="lresult">
            <div class="lresult-tag"><span class="material-icons-round">auto_awesome</span>识别完成</div>
            <div class="lresult-amt">¥35.00</div>
            <div class="lresult-cat"><span>🍔</span>餐饮</div>
            <div class="lresult-btn">保存账单</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== 大场景展示 02: 报表与预算 ===== -->
  <section class="lshow lshow-alt">
    <div class="lshowi">
      <div class="lshowv" data-reveal>
        <div class="lmock lmock2">
          <div class="ldash">
            <div class="ldash-h"><span>9月报表</span><span class="ldash-badge">已坚持 18 天</span></div>
            <div class="ldash-body">
              <div class="ldonut"><div class="ldonut-h">餐饮<br/><b>38%</b></div></div>
              <div class="lbars">
                <div class="lbar" style="--h:45%"><i></i></div>
                <div class="lbar" style="--h:70%"><i></i></div>
                <div class="lbar" style="--h:38%"><i></i></div>
                <div class="lbar" style="--h:85%"><i></i></div>
                <div class="lbar" style="--h:60%"><i></i></div>
                <div class="lbar" style="--h:92%"><i></i></div>
                <div class="lbar" style="--h:55%"><i></i></div>
              </div>
            </div>
            <div class="lbudget">
              <div class="lbudget-r"><span>餐饮预算</span><b>¥860 / ¥1,000</b></div>
              <div class="lbudget-bar"><div class="lbudget-fill" style="width:86%"></div></div>
              <div class="lbudget-warn"><span class="material-icons-round">warning_amber</span>接近预算上限，注意控制</div>
            </div>
          </div>
        </div>
      </div>
      <div class="lshowt" data-reveal style="--d:.15s">
        <div class="lst">报表与预算</div>
        <h2 class="lstt">钱花在哪，一眼看清</h2>
        <p class="lshowp">分类占比、每日趋势、月度结余自动生成图表；设定预算后，快超支时主动提醒你，帮你守住钱包。</p>
        <ul class="lshowlist">
          <li><span class="material-icons-round">donut_large</span>分类占比环形图 + 每日趋势</li>
          <li><span class="material-icons-round">savings</span>分类预算 + 超支预警</li>
          <li><span class="material-icons-round">calendar_month</span>按月切换，随时回看历史</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ===== 大场景展示 03: 分享与同步 ===== -->
  <section class="lshow">
    <div class="lshowi">
      <div class="lshowt" data-reveal>
        <div class="lst">分享与同步</div>
        <h2 class="lstt">月底晒账单，云端不丢账</h2>
        <p class="lshowp">一键生成精美的月度账单分享图，只含汇总数据、不含明细隐私；数据实时云端同步，换设备登录即可继续。</p>
        <ul class="lshowlist">
          <li><span class="material-icons-round">share</span>月度账单分享图，隐私脱敏</li>
          <li><span class="material-icons-round">cloud_done</span>云端同步 + 每日自动备份</li>
          <li><span class="material-icons-round">download</span>CSV / JSON 随时导出</li>
        </ul>
      </div>
      <div class="lshowv" data-reveal style="--d:.15s">
        <div class="lmock">
          <!-- 分享卡片 -->
          <div class="lshare">
            <div class="lshare-brand">$ 小账本</div>
            <div class="lshare-month">2026年9月</div>
            <div class="lshare-label">本月支出</div>
            <div class="lshare-amt">¥2,580</div>
            <div class="lshare-row"><span>结余</span><b class="teal">+¥5,920</b><span>收入</span><b class="blue">¥8,500</b></div>
            <div class="lshare-cats">
              <div class="lshare-cat"><i style="width:38%;background:#6C63FF"></i><span>餐饮 38%</span></div>
              <div class="lshare-cat"><i style="width:24%;background:#FF6584"></i><span>购物 24%</span></div>
              <div class="lshare-cat"><i style="width:16%;background:#4ECDC4"></i><span>交通 16%</span></div>
            </div>
          </div>
          <!-- 同步标识 -->
          <div class="lsync">
            <div class="lsync-dev"><span class="material-icons-round">smartphone</span></div>
            <div class="lsync-line"><i></i></div>
            <div class="lsync-cloud"><span class="material-icons-round">cloud_done</span></div>
            <div class="lsync-line"><i></i></div>
            <div class="lsync-dev"><span class="material-icons-round">laptop_mac</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ===== 核心功能 ===== -->
  <section class="lf">
    <div class="lsh" data-reveal>
      <div class="lst">核心功能</div>
      <h2 class="lstt">为什么选择小账本</h2>
    </div>
    <div class="lfg">
      <div class="lfc" data-reveal style="--d:0s"><div class="lfi"><span class="material-icons-round">edit_note</span></div><h3>快速记账</h3><p>3秒完成一笔记录，支持收入和支出，智能自动分类</p></div>
      <div class="lfc" data-reveal style="--d:.06s"><div class="lfi"><span class="material-icons-round">photo_camera</span></div><h3>拍照记账</h3><p>支持OCR识别小票，智能提取金额和分类</p></div>
      <div class="lfc" data-reveal style="--d:.12s"><div class="lfi"><span class="material-icons-round">cloud_sync</span></div><h3>云端同步</h3><p>数据实时同步到云端，多设备无缝切换</p></div>
      <div class="lfc" data-reveal style="--d:.18s"><div class="lfi"><span class="material-icons-round">bar_chart</span></div><h3>数据报表</h3><p>多维度图表分析，了解消费趋势</p></div>
      <div class="lfc" data-reveal style="--d:.24s"><div class="lfi"><span class="material-icons-round">savings</span></div><h3>预算管理</h3><p>设定预算上限，超支提醒，守住钱包</p></div>
      <div class="lfc" data-reveal style="--d:.3s"><div class="lfi"><span class="material-icons-round">lock</span></div><h3>隐私保护</h3><p>数据安全有保障，你的隐私我们守护</p></div>
    </div>
  </section>

  <!-- ===== 使用指南 ===== -->
  <section class="lss">
    <div class="lsh" data-reveal>
      <div class="lst">使用指南</div>
      <h2 class="lstt">三步开始记账</h2>
    </div>
    <div class="lsslist">
      <div class="lss1" data-reveal style="--d:0s"><div class="lssn">1</div><div><h3>注册账号</h3><p>昵称和密码快速注册，无需手机号</p></div></div>
      <div class="lss1" data-reveal style="--d:.1s"><div class="lssn">2</div><div><h3>记录收支</h3><p>点击+按钮，输入金额、选择分类</p></div></div>
      <div class="lss1" data-reveal style="--d:.2s"><div class="lssn">3</div><div><h3>分析报表</h3><p>查看统计报表，设置预算目标</p></div></div>
    </div>
  </section>

  <!-- ===== FAQ ===== -->
  <section class="lfaq">
    <div class="lsh" data-reveal>
      <div class="lst">常见问题</div>
      <h2 class="lstt">你想知道的都在这里</h2>
    </div>
    <div class="lfaqi">
      <details v-for="(f, i) in faqs" :key="i" class="lfaq1" data-reveal :style="`--d:${i * 0.05}s`">
        <summary>{{ f.q }}<span class="material-icons-round">expand_more</span></summary>
        <p>{{ f.a }}</p>
      </details>
    </div>
  </section>

  <!-- ===== 下载 CTA ===== -->
  <section class="ldl" id="download">
    <div class="ldli" data-reveal>
      <h2>开始你的理财之旅</h2>
      <p>免费使用，无需付费。现在就加入！</p>
      <div class="ldlb">
        <a v-if="isAndroid" href="/app-latest.apk" class="lb lb1 lbg"><span class="material-icons-round">android</span>下载 App</a>
        <a v-else href="/#/login" class="lb lb1 lbg"><span class="material-icons-round">open_in_new</span>打开网页版</a>
        <a v-if="isAndroid" href="/#/login" class="lb lb2 lbg"><span class="material-icons-round">computer</span>网页版</a>
        <a v-else href="/app-latest.apk" class="lb lb2 lbg"><span class="material-icons-round">android</span>下载 App</a>
      </div>
    </div>
  </section>

  <!-- ===== 页脚 ===== -->
  <footer class="lft2">
    <div class="lft2i">
      <div class="lft2-brand">
        <div class="ll"><span class="lli">$</span>小账本</div>
        <p>记录生活的每一笔温暖。<br/>无广告、无会员的记账应用。</p>
      </div>
      <div class="lft2-col">
        <h4>产品</h4>
        <a @click.prevent="scrollTo('features')">核心功能</a>
        <a @click.prevent="scrollTo('download')">下载使用</a>
        <a href="/#/login">打开网页版</a>
      </div>
      <div class="lft2-col">
        <h4>支持</h4>
        <a href="/#/help">帮助中心</a>
        <a href="/#/privacy">隐私政策</a>
      </div>
    </div>
    <div class="lft2-bar">&copy; 2026 小账本. All rights reserved.</div>
  </footer>
</div>
</template>

<style scoped>
/* ===== 设计变量 ===== */
.land{
  --bg:#0B0A13;
  --surface:rgba(255,255,255,.03);
  --primary:#6C63FF;
  --pink:#FF6584;
  --teal:#4ECDC4;
  --text:#F4F3FA;
  --muted:#9D9AB3;
  --muted2:#6E6B85;
  --border:rgba(255,255,255,.07);
  --border-strong:rgba(108,99,255,.35);
  --ease-out:cubic-bezier(.22,1,.36,1);
  font-family:'Noto Sans SC','PingFang SC',-apple-system,sans-serif;
  background:var(--bg);
  color:var(--text);
  -webkit-font-smoothing:antialiased;
}

/* ===== 滚动入场动效 ===== */
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .8s var(--ease-out) var(--d,0s),transform .8s var(--ease-out) var(--d,0s)}
[data-reveal].revealed{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){
  [data-reveal]{opacity:1;transform:none;transition:none}
  .lph,.lhb,.lbadge-dot,.lchip,.lmarqt,.lreceipt-scan{animation:none!important}
}

/* ===== 顶部导航 ===== */
.ln{position:fixed;top:0;left:0;right:0;z-index:100;padding:18px 28px;background:transparent;border-bottom:1px solid transparent;transition:background .35s,padding .35s,border-color .35s,backdrop-filter .35s}
.ln.scrolled{padding:12px 28px;background:rgba(11,10,19,.72);backdrop-filter:blur(20px) saturate(1.4);-webkit-backdrop-filter:blur(20px) saturate(1.4);border-bottom-color:var(--border)}
.lni{max-width:1120px;margin:0 auto;display:flex;justify-content:space-between;align-items:center}
.ll{font-size:1.25rem;font-weight:700;letter-spacing:.01em;display:flex;align-items:center;gap:10px}
.lli{width:34px;height:34px;background:linear-gradient(135deg,var(--primary),var(--pink));border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800;box-shadow:0 4px 14px rgba(108,99,255,.35)}
.lcb{padding:9px 22px;background:linear-gradient(135deg,var(--primary),var(--pink));border:none;border-radius:22px;color:#fff;font-weight:600;cursor:pointer;font-size:.88rem;letter-spacing:.02em;transition:transform .25s var(--ease-out),box-shadow .25s}
.lcb:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(108,99,255,.4)}

/* ===== 首屏 Hero ===== */
.lh{min-height:100vh;display:flex;align-items:center;padding:120px 32px 80px;position:relative;overflow:hidden}
.lhb{position:absolute;inset:-50%;width:200%;height:200%;background:radial-gradient(circle at 28% 42%,rgba(108,99,255,.16) 0%,transparent 46%),radial-gradient(circle at 74% 58%,rgba(255,101,132,.1) 0%,transparent 44%),radial-gradient(circle at 50% 100%,rgba(78,205,196,.05) 0%,transparent 40%);animation:hf 24s ease-in-out infinite}
@keyframes hf{0%,100%{transform:translate(0,0)}50%{transform:translate(-2%,2%)}}
.lhgrid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse 70% 60% at 50% 40%,#000 30%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 40%,#000 30%,transparent 75%)}
.lhi{max-width:1120px;margin:0 auto;display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:center;position:relative;z-index:1}

.lbadge{display:inline-flex;align-items:center;gap:8px;padding:7px 16px;background:rgba(108,99,255,.1);border:1px solid rgba(108,99,255,.28);border-radius:22px;font-size:.8rem;font-weight:500;letter-spacing:.06em;color:#A39FFF;margin-bottom:26px}
.lbadge-dot{width:6px;height:6px;border-radius:50%;background:var(--primary);animation:pulse 2.2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(108,99,255,.5)}50%{opacity:.6;box-shadow:0 0 0 5px rgba(108,99,255,0)}}

.lt{font-size:clamp(2.4rem,5.2vw,4rem);font-weight:800;line-height:1.18;letter-spacing:-.01em;margin-bottom:24px;background:linear-gradient(160deg,#fff 30%,#B9B5DC 90%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.ls{font-size:1.05rem;color:var(--muted);line-height:1.9;letter-spacing:.01em;margin-bottom:38px;max-width:470px}

/* 信任标识 */
.ltrust{display:flex;gap:22px;margin-top:26px;flex-wrap:wrap}
.ltrust span{display:inline-flex;align-items:center;gap:6px;font-size:.83rem;color:var(--muted)}
.ltrust .material-icons-round{font-size:1rem;color:var(--teal)}

/* 按钮 */
.lbtns{display:flex;gap:16px;flex-wrap:wrap}
.lb{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:8px;padding:15px 30px;border-radius:26px;font-weight:600;font-size:.98rem;letter-spacing:.02em;text-decoration:none;cursor:pointer;border:none;transition:transform .3s var(--ease-out),box-shadow .3s,border-color .3s,background .3s}
.lb1{background:linear-gradient(135deg,var(--primary),var(--pink));color:#fff;box-shadow:0 6px 20px rgba(108,99,255,.28)}
.lb1::after{content:'';position:absolute;top:0;left:-80%;width:50%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);transition:left .6s var(--ease-out)}
.lb1:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(108,99,255,.45)}
.lb1:hover::after{left:130%}
.lb2{background:rgba(255,255,255,.03);border:1.5px solid rgba(255,255,255,.16);color:var(--text)}
.lb2:hover{border-color:var(--primary);background:rgba(108,99,255,.08);transform:translateY(-2px)}
.lbg{padding:17px 34px;font-size:1.05rem}

/* 手机演示卡片 */
.lhv{position:relative;display:flex;justify-content:center}
.lphglow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:340px;height:340px;background:radial-gradient(circle,rgba(108,99,255,.22) 0%,transparent 65%);filter:blur(10px);pointer-events:none}
.lph{width:264px;height:508px;background:linear-gradient(150deg,#1D1B33,#141325);border-radius:38px;border:1px solid rgba(255,255,255,.1);overflow:hidden;position:relative;box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 6px rgba(255,255,255,.03);animation:float 6s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
.lphn{width:118px;height:24px;background:var(--bg);border-radius:0 0 14px 14px;position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:5}
.lphs{width:100%;height:100%;background:linear-gradient(180deg,var(--primary) 0%,#764BA2 42%,#f6f6f8 42%);padding:42px 14px 14px}
.lphshine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.06) 45%,transparent 60%);pointer-events:none;z-index:4}
.lphh{text-align:center;color:#fff;margin-bottom:14px}
.lpht{background:#fff;border-radius:14px;padding:12px;text-align:center;box-shadow:0 8px 20px rgba(20,10,60,.12);margin-bottom:10px}
.lpht>div:last-child{color:#1A1A2E}
.lphc{background:#fff;border-radius:14px;padding:12px;box-shadow:0 8px 20px rgba(20,10,60,.1)}
.lphr{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f4;font-size:.8rem}
.lphr:last-child{border:none}
.lphn2{font-weight:600;color:#333}
.lphd{font-size:.65rem;color:#999}
.lpha{margin-left:auto;font-weight:700;color:var(--pink)}
.lhai{color:var(--teal)!important}

/* 悬浮功能气泡 */
.lchip{position:absolute;display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(21,19,39,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);border-radius:16px;box-shadow:0 16px 40px rgba(0,0,0,.4);z-index:6}
.lchip1{top:16%;left:-8%;animation:chipf 5s ease-in-out infinite}
.lchip2{bottom:14%;right:-6%;animation:chipf 5s ease-in-out 2.5s infinite}
@keyframes chipf{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.lchip-i{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:1.1rem}
.lchip-i .material-icons-round{font-size:1.15rem}
.lchip-t{font-size:.82rem;font-weight:650}
.lchip-s{font-size:.72rem;color:var(--muted);margin-top:2px}

/* ===== 数据统计条 ===== */
.lstats{padding:0 32px;margin-top:-30px;position:relative;z-index:2}
.lstatsi{max-width:960px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;padding:38px 40px;background:linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.02));border:1px solid var(--border);border-radius:24px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.lstat{text-align:center}
.lstat-v{font-size:clamp(1.9rem,3.4vw,2.6rem);font-weight:800;letter-spacing:-.02em;background:linear-gradient(135deg,#fff,#B9B5DC);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.lstat-v em{font-style:normal;font-size:.55em;font-weight:700;margin-left:2px}
.lstat-l{margin-top:8px;font-size:.85rem;color:var(--muted);letter-spacing:.03em}

/* ===== 滚动标签带 ===== */
.lmarq{margin:clamp(48px,6vw,80px) 0 0;padding:18px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border);overflow:hidden;position:relative;mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.lmarqt{display:inline-flex;white-space:nowrap;animation:marq 30s linear infinite}
@keyframes marq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
.lmarqt span{font-size:.92rem;font-weight:550;letter-spacing:.08em;color:var(--muted);padding:0 8px}
.lmarqt i{font-style:normal;color:var(--primary);margin-left:16px;font-weight:800}

/* ===== 大场景展示 ===== */
.lshow{padding:clamp(72px,9vw,120px) 32px;position:relative}
.lshow-alt{background:linear-gradient(180deg,var(--bg),#121022 50%,var(--bg))}
.lshowi{max-width:1080px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,6vw,80px);align-items:center}
.lshowi>*{min-width:0}
.lshowp{font-size:1rem;color:var(--muted);line-height:1.9;margin:18px 0 28px;max-width:460px}
.lshowlist{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:14px}
.lshowlist li{display:flex;align-items:center;gap:12px;font-size:.95rem;color:var(--text)}
.lshowlist .material-icons-round{font-size:1.25rem;color:var(--primary);background:rgba(108,99,255,.1);border:1px solid rgba(108,99,255,.2);border-radius:9px;padding:5px}

/* 演示模型通用 */
.lshowv{display:flex;justify-content:center}
.lmock{display:flex;align-items:center;gap:20px;padding:36px;background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:28px;position:relative;overflow:hidden}
.lmock::before{content:'';position:absolute;top:-40%;right:-20%;width:60%;height:120%;background:radial-gradient(ellipse,rgba(108,99,255,.1),transparent 65%);pointer-events:none}

/* 小票 */
.lreceipt{width:190px;background:#fff;border-radius:14px;padding:18px 16px;color:#2A2836;position:relative;overflow:hidden;box-shadow:0 20px 44px rgba(0,0,0,.4);transform:rotate(-2.5deg)}
.lreceipt-h{font-size:.8rem;font-weight:700;text-align:center;padding-bottom:10px;border-bottom:1px dashed #D8D5E4;margin-bottom:10px}
.lreceipt-r{display:flex;justify-content:space-between;font-size:.72rem;color:#6A6780;padding:4px 0}
.lreceipt-line{border-top:1px dashed #D8D5E4;margin:8px 0}
.lreceipt-t{font-weight:800;color:#1A1830;font-size:.78rem}
.lreceipt-scan{position:absolute;left:0;right:0;height:34px;top:0;background:linear-gradient(180deg,transparent,rgba(108,99,255,.16),transparent);animation:scan 2.6s ease-in-out infinite}
@keyframes scan{0%,100%{top:-15%}50%{top:100%}}

.larrow{color:var(--primary);animation:nudge 1.8s ease-in-out infinite}
@keyframes nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}

/* 识别结果卡 */
.lresult{width:170px;background:linear-gradient(160deg,#1E1C38,#161428);border:1px solid rgba(108,99,255,.3);border-radius:18px;padding:18px;text-align:center;box-shadow:0 20px 44px rgba(0,0,0,.4)}
.lresult-tag{display:inline-flex;align-items:center;gap:5px;font-size:.68rem;color:var(--teal);background:rgba(78,205,196,.1);border:1px solid rgba(78,205,196,.25);border-radius:12px;padding:4px 10px;margin-bottom:12px}
.lresult-tag .material-icons-round{font-size:.85rem}
.lresult-amt{font-size:1.5rem;font-weight:800;letter-spacing:-.01em}
.lresult-cat{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted);margin:8px 0 14px}
.lresult-btn{background:linear-gradient(135deg,var(--primary),var(--pink));border-radius:12px;padding:8px;font-size:.78rem;font-weight:650}

/* 报表仪表盘模型 */
.lmock2{padding:28px;width:100%;justify-content:center}
.ldash{width:100%;max-width:400px;background:linear-gradient(160deg,#1E1C38,#151327);border:1px solid rgba(255,255,255,.09);border-radius:22px;padding:22px;box-shadow:0 24px 54px rgba(0,0,0,.4)}
.ldash-h{display:flex;justify-content:space-between;align-items:center;font-size:.92rem;font-weight:700;margin-bottom:18px}
.ldash-badge{font-size:.68rem;font-weight:600;color:var(--teal);background:rgba(78,205,196,.1);border:1px solid rgba(78,205,196,.25);padding:4px 10px;border-radius:12px}
.ldash-body{display:flex;align-items:center;gap:24px;margin-bottom:20px}
.ldonut{width:108px;height:108px;min-width:108px;border-radius:50%;background:conic-gradient(var(--primary) 0 38%,var(--pink) 38% 62%,var(--teal) 62% 78%,#3D3A5C 78% 100%);display:flex;align-items:center;justify-content:center;position:relative}
.ldonut::after{content:'';position:absolute;inset:16px;background:#191731;border-radius:50%}
.ldonut-h{position:relative;z-index:1;font-size:.68rem;color:var(--muted);text-align:center;line-height:1.5}
.ldonut-h b{color:var(--text);font-size:.95rem}
.lbars{flex:1;display:flex;align-items:flex-end;gap:8px;height:96px}
.lbar{flex:1;height:100%;display:flex;align-items:flex-end}
.lbar i{display:block;width:100%;height:var(--h);background:linear-gradient(180deg,var(--primary),rgba(108,99,255,.25));border-radius:5px 5px 2px 2px}
.lbar:nth-child(4) i,.lbar:nth-child(6) i{background:linear-gradient(180deg,var(--pink),rgba(255,101,132,.25))}
.lbudget{border-top:1px solid rgba(255,255,255,.07);padding-top:16px}
.lbudget-r{display:flex;justify-content:space-between;font-size:.78rem;color:var(--muted);margin-bottom:8px}
.lbudget-r b{color:var(--text)}
.lbudget-bar{height:8px;background:rgba(255,255,255,.07);border-radius:6px;overflow:hidden}
.lbudget-fill{height:100%;background:linear-gradient(90deg,var(--primary),var(--pink));border-radius:6px}
.lbudget-warn{display:flex;align-items:center;gap:6px;margin-top:10px;font-size:.72rem;color:#FFB86B}
.lbudget-warn .material-icons-round{font-size:.95rem}

/* 分享卡片模型 */
.lshare{width:210px;background:linear-gradient(165deg,#6C63FF,#8A5CF6 55%,#B4519E);border-radius:20px;padding:20px;color:#fff;box-shadow:0 24px 54px rgba(108,99,255,.3);transform:rotate(2deg)}
.lshare-brand{font-size:.78rem;font-weight:700;opacity:.9}
.lshare-month{font-size:1.05rem;font-weight:800;margin:10px 0 2px}
.lshare-label{font-size:.66rem;opacity:.65}
.lshare-amt{font-size:1.7rem;font-weight:800;letter-spacing:-.01em;margin:2px 0 10px}
.lshare-row{display:flex;gap:6px;align-items:baseline;font-size:.66rem;opacity:.9;margin-bottom:12px}
.lshare-row b{font-size:.76rem}
.lshare-row .teal{color:#A8F0D1}
.lshare-row .blue{color:#C4D8FF}
.lshare-cats{display:flex;flex-direction:column;gap:7px}
.lshare-cat{display:flex;align-items:center;gap:8px;font-size:.64rem}
.lshare-cat i{display:block;height:5px;border-radius:4px;background:#fff;opacity:.85;min-width:12px}
.lshare-cat span{opacity:.85}

/* 同步链路 */
.lsync{display:flex;flex-direction:column;align-items:center;gap:0}
.lsync-dev,.lsync-cloud{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1px solid var(--border);color:var(--muted)}
.lsync-cloud{color:var(--teal);border-color:rgba(78,205,196,.3);background:rgba(78,205,196,.08)}
.lsync-line{width:2px;height:26px;overflow:hidden}
.lsync-line i{display:block;width:2px;height:10px;background:var(--primary);border-radius:2px;animation:flow 1.6s linear infinite}
@keyframes flow{from{transform:translateY(-12px)}to{transform:translateY(28px)}}

/* ===== 区块通用 ===== */
.lf,.lss,.lfaq,.ldl{padding:clamp(72px,9vw,120px) 32px;position:relative}
.lsh{text-align:center;margin-bottom:56px}
.lst{display:inline-block;padding:6px 18px;background:rgba(108,99,255,.08);border:1px solid rgba(108,99,255,.22);border-radius:20px;font-size:.78rem;font-weight:600;letter-spacing:.18em;color:#A39FFF;margin-bottom:20px;text-transform:uppercase}
.lstt{font-size:clamp(1.7rem,3.2vw,2.4rem);font-weight:750;letter-spacing:-.01em;color:var(--text)}
.lshowt .lstt{text-align:left}

/* 功能卡片 */
.lfg{max-width:1040px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:22px}
.lfc{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:34px 30px;backdrop-filter:blur(8px);transition:transform .35s var(--ease-out),border-color .35s,background .35s,box-shadow .35s}
.lfc:hover{transform:translateY(-8px);border-color:var(--border-strong);background:rgba(108,99,255,.05);box-shadow:0 24px 48px rgba(0,0,0,.35)}
.lfi{width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,rgba(108,99,255,.18),rgba(255,101,132,.12));border:1px solid rgba(108,99,255,.2);display:flex;align-items:center;justify-content:center;margin-bottom:20px;color:#A39FFF;transition:all .35s var(--ease-out)}
.lfc:hover .lfi{background:linear-gradient(135deg,var(--primary),var(--pink));color:#fff;transform:scale(1.06);box-shadow:0 8px 20px rgba(108,99,255,.4)}
.lfc h3{font-size:1.12rem;font-weight:650;margin-bottom:10px;letter-spacing:.01em}
.lfc p{font-size:.92rem;color:var(--muted);line-height:1.8}

/* 使用指南 */
.lss{background:linear-gradient(180deg,var(--bg),#121022 50%,var(--bg))}
.lsslist{max-width:680px;margin:0 auto;display:flex;flex-direction:column;gap:40px;position:relative}
.lsslist::before{content:'';position:absolute;left:27px;top:36px;bottom:36px;width:2px;background:linear-gradient(180deg,rgba(108,99,255,.4),rgba(255,101,132,.3));border-radius:2px}
.lss1{display:flex;gap:26px;align-items:center;position:relative}
.lssn{width:56px;height:56px;min-width:56px;background:linear-gradient(135deg,var(--primary),var(--pink));border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.35rem;font-weight:750;box-shadow:0 8px 22px rgba(108,99,255,.35);border:4px solid var(--bg)}
.lss1 h3{font-size:1.15rem;font-weight:650;margin-bottom:6px;letter-spacing:.01em}
.lss1 p{font-size:.92rem;color:var(--muted);line-height:1.75}

/* ===== FAQ ===== */
.lfaqi{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.lfaq1{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:0;overflow:hidden;transition:border-color .3s,background .3s}
.lfaq1[open]{border-color:var(--border-strong);background:rgba(108,99,255,.04)}
.lfaq1 summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;font-size:.98rem;font-weight:600;letter-spacing:.01em;user-select:none}
.lfaq1 summary::-webkit-details-marker{display:none}
.lfaq1 summary .material-icons-round{color:var(--muted);transition:transform .3s var(--ease-out)}
.lfaq1[open] summary .material-icons-round{transform:rotate(180deg);color:var(--primary)}
.lfaq1 p{padding:0 24px 22px;font-size:.9rem;color:var(--muted);line-height:1.9;margin:0}

/* 下载 CTA */
.ldli{max-width:720px;margin:0 auto;text-align:center;padding:clamp(48px,6vw,72px) clamp(28px,5vw,64px);background:linear-gradient(140deg,rgba(108,99,255,.14),rgba(255,101,132,.09) 60%,rgba(78,205,196,.06));border:1px solid rgba(108,99,255,.22);border-radius:32px;position:relative;overflow:hidden}
.ldli::before{content:'';position:absolute;top:-60%;left:50%;transform:translateX(-50%);width:70%;height:120%;background:radial-gradient(ellipse,rgba(108,99,255,.14),transparent 65%);pointer-events:none}
.ldli h2{font-size:clamp(1.7rem,3.2vw,2.3rem);font-weight:750;letter-spacing:-.01em;margin-bottom:14px;position:relative}
.ldli p{color:var(--muted);margin-bottom:36px;font-size:1rem;line-height:1.8;position:relative}
.ldlb{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;position:relative}

/* ===== 页脚 ===== */
.lft2{border-top:1px solid var(--border);padding:56px 32px 0}
.lft2i{max-width:960px;margin:0 auto;display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px;padding-bottom:44px}
.lft2-brand p{margin-top:16px;font-size:.86rem;color:var(--muted2);line-height:1.9}
.lft2-col h4{font-size:.82rem;font-weight:650;letter-spacing:.1em;color:var(--muted);margin-bottom:16px;text-transform:uppercase}
.lft2-col a{display:block;font-size:.9rem;color:var(--muted2);text-decoration:none;margin-bottom:12px;cursor:pointer;transition:color .25s}
.lft2-col a:hover{color:var(--text)}
.lft2-bar{border-top:1px solid var(--border);padding:22px;text-align:center;color:var(--muted2);font-size:.8rem;letter-spacing:.04em}

/* ===== 响应式 ===== */
@media(max-width:900px){
  .lshowi{grid-template-columns:1fr;gap:44px}
  .lshow-alt .lshowv{order:2}
  .lshow-alt .lshowt{order:1}
  .lshowt{text-align:center}
  .lshowt .lstt{text-align:center}
  .lshowp{margin-left:auto;margin-right:auto}
  .lshowlist{max-width:min(340px,100%);margin:0 auto}
}
@media(max-width:768px){
  .lh{padding:110px 24px 64px}
  .lhi{grid-template-columns:1fr;text-align:center;gap:52px}
  .ls{margin:0 auto 34px}
  .lbtns{justify-content:center}
  .lbtns .lb{flex:1;justify-content:center;min-width:150px;padding:15px 20px}
  .ltrust{justify-content:center}
  .lph{width:230px;height:440px}
  .lphglow{width:280px;height:280px}
  .lchip1{left:-4%}
  .lchip2{right:-2%}
  .lstats{padding:0 24px;margin-top:-16px}
  .lstatsi{grid-template-columns:repeat(2,1fr);gap:28px 12px;padding:32px 24px}
  .lmock{flex-direction:column;gap:16px;padding:28px 20px}
  .larrow{transform:rotate(90deg)}
  @keyframes nudge{0%,100%{transform:rotate(90deg) translateX(0)}50%{transform:rotate(90deg) translateX(6px)}}
  .lsync{flex-direction:row}
  .lsync-line{width:26px;height:2px}
  .lsync-line i{width:10px;height:2px;animation:flowx 1.6s linear infinite}
  @keyframes flowx{from{transform:translateX(-12px)}to{transform:translateX(28px)}}
  .ldash-body{flex-direction:column;gap:18px}
  .lbars{width:100%}
  .lsslist::before{left:25px}
  .lssn{width:52px;height:52px;min-width:52px}
  .ldlb .lb{flex:1;justify-content:center;min-width:160px}
  .ln{padding:14px 20px}
  .ln.scrolled{padding:10px 20px}
  .lft2i{grid-template-columns:1fr;gap:32px;text-align:center}
  .lft2-brand .ll{justify-content:center}
}
</style>

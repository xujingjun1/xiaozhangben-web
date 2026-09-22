<script setup lang="ts">
import { ref, onMounted } from 'vue'

const isAndroid = /android/i.test(navigator.userAgent)
const scrolled = ref(false)
onMounted(() => {
  window.addEventListener('scroll', () => { scrolled.value = window.scrollY > 50 })
})
function scrollDown() { document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' }) }
</script>

<template>
<div class="land">
  <nav class="ln" :class="{ scrolled }">
    <div class="lni"><div class="ll"><span class="lli">$</span>小账本</div>
    <button class="lcb" @click="scrollDown">{{ isAndroid ? '下载 App' : '立即使用' }}</button></div>
  </nav>
  <section class="lh">
    <div class="lhb"></div>
    <div class="lhi">
      <div class="lht">
        <div class="lbadge">智能记账助手</div>
        <h1 class="lt">记录生活的<br/>每一笔温暖</h1>
        <p class="ls">简洁高效的个人记账应用，智能分类、拍照识别、云端同步，让理财变得简单有趣。</p>
        <div class="lbtns">
          <a v-if="isAndroid" href="/app-latest.apk" class="lb lb1"><span class="material-icons-round">download</span>下载 App</a>
          <a v-else href="/#/" class="lb lb1"><span class="material-icons-round">open_in_new</span>打开网页版</a>
          <a href="#features" class="lb lb2">了解更多</a>
        </div>
      </div>
      <div class="lhv">
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
        </div>
      </div>
    </div>
  </section>
  <section class="lf" id="features">
    <div class="lsh"><div class="lst">核心功能</div><h2 class="lstt">为什么选择小账本</h2></div>
    <div class="lfg">
      <div class="lfc"><div class="lfi"><span class="material-icons-round">edit_note</span></div><h3>快速记账</h3><p>3秒完成一笔记录，支持收入和支出，智能自动分类</p></div>
      <div class="lfc"><div class="lfi"><span class="material-icons-round">photo_camera</span></div><h3>拍照记账</h3><p>支持OCR识别小票，智能提取金额和分类</p></div>
      <div class="lfc"><div class="lfi"><span class="material-icons-round">cloud_sync</span></div><h3>云端同步</h3><p>数据实时同步到云端，多设备无缝切换</p></div>
      <div class="lfc"><div class="lfi"><span class="material-icons-round">bar_chart</span></div><h3>数据报表</h3><p>多维度图表分析，了解消费趋势</p></div>
      <div class="lfc"><div class="lfi"><span class="material-icons-round">savings</span></div><h3>预算管理</h3><p>设定预算上限，超支提醒，守住钱包</p></div>
      <div class="lfc"><div class="lfi"><span class="material-icons-round">lock</span></div><h3>隐私保护</h3><p>数据安全有保障，你的隐私我们守护</p></div>
    </div>
  </section>
  <section class="lss">
    <div class="lsh"><div class="lst">使用指南</div><h2 class="lstt">三步开始记账</h2></div>
    <div class="lsslist">
      <div class="lss1"><div class="lssn">1</div><div><h3>注册账号</h3><p>昵称和密码快速注册，无需手机号</p></div></div>
      <div class="lss1"><div class="lssn">2</div><div><h3>记录收支</h3><p>点击+按钮，输入金额、选择分类</p></div></div>
      <div class="lss1"><div class="lssn">3</div><div><h3>分析报表</h3><p>查看统计报表，设置预算目标</p></div></div>
    </div>
  </section>
  <section class="ldl" id="download">
    <div class="ldli">
      <h2>开始你的理财之旅</h2>
      <p>免费使用，无需付费。现在就加入！</p>
      <div class="ldlb">
        <a v-if="isAndroid" href="/app-latest.apk" class="lb lb1 lbg"><span class="material-icons-round">android</span>下载 App</a>
        <a v-else href="/#/" class="lb lb1 lbg"><span class="material-icons-round">open_in_new</span>打开网页版</a>
        <a v-if="isAndroid" href="/#/" class="lb lb2 lbg"><span class="material-icons-round">computer</span>网页版</a>
        <a v-else href="/app-latest.apk" class="lb lb2 lbg"><span class="material-icons-round">android</span>下载 App</a>
      </div>
    </div>
  </section>
  <footer class="lft"><p>&copy; 2026 小账本. All rights reserved.</p></footer>
</div>
</template>

<style scoped>
.land{font-family:'Noto Sans SC',-apple-system,sans-serif;background:#0F0E17;color:#fff}
.ln{position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 24px;background:rgba(15,14,23,.8);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.05);transition:all .3s}
.ln.scrolled{padding:12px 24px;background:rgba(15,14,23,.95)}
.lni{max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center}
.ll{font-size:1.3rem;font-weight:700;display:flex;align-items:center;gap:8px}
.lli{width:32px;height:32px;background:linear-gradient(135deg,#6C63FF,#FF6584);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:800}
.lcb{padding:8px 20px;background:linear-gradient(135deg,#6C63FF,#FF6584);border:none;border-radius:20px;color:#fff;font-weight:600;cursor:pointer;font-size:.9rem}
.lh{min-height:100vh;display:flex;align-items:center;padding:100px 24px 60px;position:relative;overflow:hidden}
.lhb{position:absolute;inset:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 50%,rgba(108,99,255,.12) 0%,transparent 50%),radial-gradient(circle at 70% 50%,rgba(255,101,132,.08) 0%,transparent 50%);animation:hf 20s ease-in-out infinite}
@keyframes hf{0%,100%{transform:translate(0,0)}50%{transform:translate(-2%,2%)}}
.lhi{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;position:relative;z-index:1}
.lbadge{display:inline-block;padding:6px 14px;background:rgba(108,99,255,.15);border:1px solid rgba(108,99,255,.3);border-radius:20px;font-size:.8rem;color:#6C63FF;margin-bottom:20px}
.lt{font-size:clamp(2rem,4.5vw,3.5rem);font-weight:800;line-height:1.2;margin-bottom:20px;background:linear-gradient(135deg,#fff,#ccc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ls{font-size:1.05rem;color:#a0a0b0;line-height:1.7;margin-bottom:32px;max-width:460px}
.lbtns{display:flex;gap:16px;flex-wrap:wrap}
.lb{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;border-radius:24px;font-weight:600;font-size:1rem;text-decoration:none;transition:all .3s;cursor:pointer;border:none}
.lb1{background:linear-gradient(135deg,#6C63FF,#FF6584);color:#fff}
.lb1:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(108,99,255,.35)}
.lb2{background:transparent;border:2px solid rgba(255,255,255,.2);color:#fff}
.lb2:hover{border-color:#6C63FF;background:rgba(108,99,255,.1)}
.lbg{padding:16px 32px;font-size:1.1rem}
.lph{width:260px;height:500px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:36px;border:3px solid rgba(255,255,255,.08);overflow:hidden;position:relative;margin:0 auto;box-shadow:0 40px 80px rgba(0,0,0,.4)}
.lphn{width:120px;height:24px;background:#0F0E17;border-radius:0 0 14px 14px;position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:5}
.lphs{width:100%;height:100%;background:linear-gradient(180deg,#6C63FF 0%,#764BA2 42%,#f5f5f5 42%);padding:40px 14px 14px}
.lphh{text-align:center;color:#fff;margin-bottom:14px}
.lpht{background:#fff;border-radius:14px;padding:12px;text-align:center;box-shadow:0 6px 16px rgba(0,0,0,.08);margin-bottom:10px}
.lphc{background:#fff;border-radius:14px;padding:12px;box-shadow:0 6px 16px rgba(0,0,0,.08)}
.lphr{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:.8rem}
.lphr:last-child{border:none}
.lphn2{font-weight:600;color:#333}
.lphd{font-size:.65rem;color:#999}
.lpha{margin-left:auto;font-weight:700;color:#FF6584}
.lhai{color:#4ECDC4!important}
.lf{padding:80px 24px}
.lsh{text-align:center;margin-bottom:48px}
.lst{display:inline-block;padding:6px 16px;background:rgba(108,99,255,.12);border-radius:20px;font-size:.85rem;color:#6C63FF;margin-bottom:16px}
.lstt{font-size:clamp(1.6rem,3vw,2.4rem);font-weight:700;background:linear-gradient(135deg,#fff,#ccc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.lfg{max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.lfc{background:#1A1932;border-radius:20px;padding:32px;border:1px solid rgba(255,255,255,.05);transition:all .3s}
.lfc:hover{transform:translateY(-6px);border-color:rgba(108,99,255,.2)}
.lfi{width:48px;height:48px;border-radius:14px;background:rgba(108,99,255,.15);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:#6C63FF}
.lfc h3{font-size:1.1rem;font-weight:600;margin-bottom:8px}
.lfc p{font-size:.9rem;color:#a0a0b0;line-height:1.6}
.lss{padding:80px 24px;background:linear-gradient(180deg,#0F0E17,#1a1932,#0F0E17)}
.lsslist{max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:32px}
.lss1{display:flex;gap:24px;align-items:center}
.lssn{width:56px;height:56px;min-width:56px;background:linear-gradient(135deg,#6C63FF,#FF6584);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:700}
.lss1 h3{font-size:1.15rem;font-weight:600;margin-bottom:4px}
.lss1 p{font-size:.9rem;color:#a0a0b0}
.ldl{padding:80px 24px;text-align:center}
.ldli{max-width:600px;margin:0 auto}
.ldli h2{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:700;margin-bottom:12px;background:linear-gradient(135deg,#fff,#ccc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ldli p{color:#a0a0b0;margin-bottom:32px;font-size:1rem}
.ldlb{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.lft{padding:24px;text-align:center;color:#555;font-size:.8rem;border-top:1px solid rgba(255,255,255,.05)}
@media(max-width:768px){.lhi{grid-template-columns:1fr;text-align:center}.ls{margin:0 auto 32px}.lbtns{justify-content:center}.lph{width:220px;height:420px}}
</style>

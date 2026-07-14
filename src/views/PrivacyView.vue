<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <div class="px-5 pt-4 pb-24 min-h-screen bg-background">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="goBack" class="p-2 rounded-xl hover:bg-surface transition">
        <span class="material-icons-round text-txt-secondary">arrow_back</span>
      </button>
      <h1 class="text-xl font-bold text-txt">隐私政策</h1>
    </div>

    <!-- 隐私政策内容 -->
    <div class="bg-white rounded-2xl p-5">
      <div class="prose prose-sm max-w-none">
        <h2 class="text-base font-semibold text-txt mb-3">1. 信息收集</h2>
        <p class="text-sm text-txt-secondary mb-4 leading-relaxed">
          我们仅收集您主动提供的信息，包括：
        </p>
        <ul class="text-sm text-txt-secondary mb-4 space-y-2 list-disc list-inside">
          <li>账号信息：昵称、用户名</li>
          <li>记账数据：消费记录、分类、金额、日期</li>
          <li>个人资料：头像、签名、生日等（可选）</li>
        </ul>

        <h2 class="text-base font-semibold text-txt mb-3">2. 信息使用</h2>
        <p class="text-sm text-txt-secondary mb-4 leading-relaxed">
          您的信息仅用于提供记账服务，具体用途包括：
        </p>
        <ul class="text-sm text-txt-secondary mb-4 space-y-2 list-disc list-inside">
          <li>数据存储与同步</li>
          <li>生成消费报表与统计</li>
          <li>改进产品体验</li>
        </ul>

        <h2 class="text-base font-semibold text-txt mb-3">3. 信息保护</h2>
        <p class="text-sm text-txt-secondary mb-4 leading-relaxed">
          我们采取行业标准的安全措施保护您的数据：
        </p>
        <ul class="text-sm text-txt-secondary mb-4 space-y-2 list-disc list-inside">
          <li>数据加密存储</li>
          <li>安全的网络传输</li>
          <li>严格的访问控制</li>
        </ul>

        <h2 class="text-base font-semibold text-txt mb-3">4. 信息共享</h2>
        <p class="text-sm text-txt-secondary mb-4 leading-relaxed">
          我们不会将您的个人信息出售、交易或转让给第三方。仅在以下情况下可能共享：
        </p>
        <ul class="text-sm text-txt-secondary mb-4 space-y-2 list-disc list-inside">
          <li>获得您的明确同意</li>
          <li>法律法规要求</li>
        </ul>

        <h2 class="text-base font-semibold text-txt mb-3">5. 数据删除</h2>
        <p class="text-sm text-txt-secondary mb-4 leading-relaxed">
          您可以随时在设置中删除您的账号和数据。删除后，所有数据将被永久清除且无法恢复。
        </p>

        <h2 class="text-base font-semibold text-txt mb-3">6. 联系我们</h2>
        <p class="text-sm text-txt-secondary mb-4 leading-relaxed">
          如有隐私相关问题，请通过帮助与反馈页面联系我们。
        </p>

        <p class="text-xs text-txt-hint mt-6 text-center">
          更新日期：2024年3月
        </p>
      </div>
    </div>
  </div>
</template>

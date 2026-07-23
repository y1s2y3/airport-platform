<script setup>
/** 兼容旧链接：竣工验收列表 → 深度集成竣工验收 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => {
  router.replace('/qm/inspect/complete-deep')
})
</script>
<template>
  <div class="page-card" style="padding: 24px; color: #909399">正在跳转至竣工验收…</div>
</template>

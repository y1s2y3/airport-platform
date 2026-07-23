<script setup>
/** 兼容旧链接：检验批验收 → 表单填报(深度集成) */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => {
  router.replace('/qm/inspect/form-fill-deep')
})
</script>

<template>
  <div class="page-card" style="padding: 24px; color: #909399">正在跳转至实体验收（深度集成）…</div>
</template>

<script setup>
import '../mat/mat-page.css'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const copyFrom = route.query.relatedRejectId || route.query.copyFrom || ''
  const q = copyFrom
    ? `?entry_type=equipment&copyFrom=${copyFrom}`
    : '?entry_type=equipment'
  router.replace(`/qm/mat/applications/edit${q}`)
})
</script>

<template>
  <div class="qm-page page-card">
    <p>正在跳转至合并后的进场申请页…</p>
  </div>
</template>

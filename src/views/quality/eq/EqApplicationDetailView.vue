<script setup>
import '../mat/mat-page.css'
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

onMounted(() => {
  const id = route.query.id || ''
  if (id) {
    router.replace(`/qm/mat/applications/detail?id=${id}`)
  } else {
    router.replace('/qm/mat/ledger?entry_type=equipment')
  }
})
</script>

<template>
  <div class="qm-page page-card">
    <p>正在跳转…</p>
  </div>
</template>

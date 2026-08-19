<script setup>
import '../mat/mat-page.css'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace('/qm/mat/applications?entry_type=equipment')
})
</script>

<template>
  <div class="qm-page page-card">
    <p>正在跳转至材料设备进场申请…</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AdminDailyWorkEntry from '../../coc/admin/AdminDailyWorkEntry.vue'
import { ensureDailyWorkSeed } from '../../coc/utils/dailyWorkStorage.js'
import '../../coc/admin/admin.css'

onMounted(() => {
  ensureDailyWorkSeed()
})
</script>

<template>
  <div class="major-hazard-daily-work-page">
    <AdminDailyWorkEntry title="每日施工作业" />
  </div>
</template>

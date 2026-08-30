<script setup>
/**
 * 建管 APP · 预警详情（复用移动端预警详情，留在 APP 壳内）
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppBizSubPage from './AppBizSubPage.vue'
import LaborMobileWarningDetailView from '../mobile/LaborMobileWarningDetailView.vue'

const route = useRoute()

const backQuery = computed(() => {
  const tab = String(route.query.tab || 'warning-center')
  return tab === 'todo' ? {} : { tab }
})
</script>

<template>
  <AppBizSubPage title="预警详情" back-to="/app/personal" :back-query="backQuery">
    <LaborMobileWarningDetailView />
  </AppBizSubPage>
</template>

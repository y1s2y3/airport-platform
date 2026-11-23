<script setup>
import { useRoute } from 'vue-router'
import AppBizSubPage from './AppBizSubPage.vue'
import MobileRectifyDetailView from '../mobile/MobileRectifyDetailView.vue'

const route = useRoute()
</script>

<template>
  <AppBizSubPage title="整改详情" back-to="/app/rectify" :back-query="route.query.tab ? { tab: route.query.tab } : null">
    <MobileRectifyDetailView />
  </AppBizSubPage>
</template>

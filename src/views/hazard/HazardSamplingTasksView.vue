<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import SupervisorSamplingTaskList from './SupervisorSamplingTaskList.vue'
import { projectSamplingRole } from '../../mock/hazardSampling.js'
const route = useRoute()
const isReview = computed(() => route.path.startsWith('/hazard-issues/review'))
const isTasks = computed(() => route.path.startsWith('/hazard-issues/tasks'))
const pageTitle = computed(() => isTasks.value ? '抽检任务' : isReview.value ? '施工隐患复查' : '监理隐患抽检')
watch(isReview, value => { projectSamplingRole.value = value ? 'manager' : 'supervisor' }, { immediate: true })
</script>
<template><div class="hazard-tasks-page"><h2>{{ pageTitle }}</h2><SupervisorSamplingTaskList/></div></template>
<style scoped>.hazard-tasks-page {padding:4px 0 24px}.hazard-tasks-page h2 {font-size:20px;margin:0 0 16px}</style>

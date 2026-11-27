<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DispatchHazardDetailContent from '../../components/hazard/DispatchHazardDetailContent.vue'
import { getDispatchHazards } from '../../utils/dispatchHazardStorage.js'

const route = useRoute()
const router = useRouter()
const record = computed(() => getDispatchHazards().find((item) => item.id === route.params.id) || null)

function goBack() {
  if (route.query.from === 'summary') router.push('/hazard-issues/summary')
  else router.push('/coc-admin/dispatch-hazard')
}
</script>

<template>
  <div class="dispatch-detail">
    <div class="page-head">
      <el-button link @click="goBack">‹ 返回</el-button>
      <h2>调度隐患详情</h2>
    </div>

    <DispatchHazardDetailContent :record="record" />
  </div>
</template>

<style scoped>
.dispatch-detail { width: 100%; }
.page-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.page-head h2 { margin: 0; font-size: 18px; color: #1f2329; }
</style>

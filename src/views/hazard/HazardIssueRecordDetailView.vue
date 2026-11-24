<script setup>
import { SHOW_HAZARD_SAMPLING } from '../../config/hazardSamplingVisibility.js'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import HazardRecordDetail from '../../components/hazard/HazardRecordDetail.vue'
import HazardSamplingPanel from '../../components/HazardSamplingPanel.vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { canViewTask, sampling, useSamplingRole } from '../../mock/hazardSampling.js'
import { getCurrentHazardIssueProjectKey, getHazardIssueRows } from '../../utils/hazardIssueSummary.js'
import { restoreSupervisorTaskContext, samplingReturnLocation } from '../../utils/hazardSamplingTaskNavigation.js'

const route = useRoute()
const router = useRouter()
const role = useSamplingRole()
const { selectedProjectId } = useCurrentProject()
const fromTask = computed(() => route.query.from === 'sampling-task')
if (fromTask.value && route.query.viewer !== 'hq') restoreSupervisorTaskContext(String(route.query.samplingTask || ''))

const row = computed(() => {
  const record = getHazardIssueRows().find(item => item.source === route.params.source && item.sourceId === route.params.id)
  if (!record) return null
  if (role.value !== 'hq' && record.projectKey !== getCurrentHazardIssueProjectKey(selectedProjectId.value)) return null
  if (!fromTask.value) return record
  if (route.query.viewer === 'project' && role.value === 'hq') return null
  const task = sampling.value.tasks.find(item => item.id === route.query.samplingTask)
  return canViewTask(task, role.value, selectedProjectId.value) && task.ids.includes(record.id) ? record : null
})
</script>

<template>
  <section class="hazard-issue-record-detail">
    <el-button @click="router.push(samplingReturnLocation(route.query))">{{ fromTask ? '返回任务' : '返回汇总' }}</el-button>
    <template v-if="row">
      <h2>{{ row.sourceLabel }} · 隐患详情</h2>
      <HazardRecordDetail :row="row" />
      <HazardSamplingPanel v-if="SHOW_HAZARD_SAMPLING" :source="row.source" :record-id="row.sourceId" />
    </template>
    <el-empty v-else description="未找到当前范围内的隐患记录" />
  </section>
</template>

<style scoped>
.hazard-issue-record-detail { padding: 18px; background: #fff; border: 1px solid #e5e9ef; border-radius: 8px; }
.hazard-issue-record-detail h2 { margin: 16px 0; font-size: 20px; }
</style>

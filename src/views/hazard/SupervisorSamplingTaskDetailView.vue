<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { sampling, useSamplingRole, visibleTasks, viewableTasks, canHandleTask, ensureSamplingExamples, linkedReviewTasks, taskProgress } from '../../mock/hazardSampling.js'
import { getHazardIssueRows } from '../../utils/hazardIssueSummary.js'
import { rememberSupervisorTask, restoreSupervisorTaskContext, samplingSourceLocation, supervisorTaskLocation } from '../../utils/hazardSamplingTaskNavigation.js'

const route = useRoute()
const router = useRouter()
ensureSamplingExamples()
if (route.query.viewer !== 'hq') restoreSupervisorTaskContext(String(route.params.id))
const role = useSamplingRole()
const { selectedProjectId } = useCurrentProject()
const isHq = computed(() => role.value === 'hq')
const task = computed(() => viewableTasks(role.value, selectedProjectId.value).find(item => item.id === route.params.id))
const isManager = computed(() => task.value?.stage === 'manager')
const canHandle = computed(() => canHandleTask(task.value, role.value, selectedProjectId.value))
const keyword = ref('')
const resultFilter = ref('')
const resolution = ref('')
const stateLabel = computed(() => !task.value ? '' : task.value.submittedAt ? '已办理' : Object.keys(task.value.results).length ? '办理中' : '待办理')
/** 指挥部追踪：关联的全面复查任务（多个关联项全部展示，不静默丢弃历史）。 */
const linkedReviews = computed(() => task.value?.stage === 'supervisor' ? linkedReviewTasks(task.value) : [])
const followProgress = follow => taskProgress(follow)
const followState = follow => !follow ? '' : follow.submittedAt ? '已办理' : Object.keys(follow.results).length ? '办理中' : '待办理'
const formatTime = value => value ? new Date(value).toLocaleString('sv-SE') : '--'
const rows = computed(() => {
  if (!task.value) return []
  const index = new Map(getHazardIssueRows().map(row => [row.id,row]))
  return task.value.ids.map(id => {
    const row = index.get(id)
    const log = sampling.value.history.find(entry => entry.id === task.value.results[id] && entry.stage === task.value.stage && entry.taskId === task.value.id && entry.rowId === id)
    return { ...(row || { id, originalNo:id, title:'原单据不可用', sourceLabel:'--', status:'--', missing:true }), reviewed:Boolean(log), reviewResult:log ? isManager.value ? '已复查' : log.result : isManager.value ? '待复查' : '待抽查', reviewTime:log?.time || '' }
  })
})
const filtered = computed(() => rows.value.filter(row => (!resultFilter.value || row.reviewResult === resultFilter.value) && (!keyword.value.trim() || `${row.originalNo} ${row.title} ${row.sourceLabel}`.toLowerCase().includes(keyword.value.trim().toLowerCase()))))
watch([() => route.params.id, () => route.query.viewer], ([id]) => { if (route.query.viewer !== 'hq') restoreSupervisorTaskContext(String(id)); keyword.value=''; resultFilter.value=''; resolution.value='' })
const backTaskId = computed(() => String(route.query.fromTask || ''))
function goBack() {
  if (backTaskId.value) { router.push({ path: `/hazard-issues/sampling-task/${encodeURIComponent(backTaskId.value)}`, query: { viewer: route.query.viewer === 'hq' ? 'hq' : 'project' } }); return }
  router.push('/hazard-issues/tasks')
}
function openFollow(follow) { const location = supervisorTaskLocation(follow.id); router.push({ ...location, query: { ...location.query, fromTask: task.value.id } }) }
function openRecord(row) { rememberSupervisorTask(task.value); router.push(samplingSourceLocation(row,task.value)) }
function resolveDifference() {
  if (!isHq.value || !task.value?.discrepancy) return
  if (!resolution.value.trim()) return ElMessage.error('请填写结论差异核查意见')
  task.value.resolution = resolution.value.trim()
  ElMessage.success('结论差异核查意见已保存')
}
</script>

<template>
  <div class="supervisor-task-detail">
    <div class="task-detail-back"><el-button @click="goBack">{{ backTaskId ? '返回抽检任务' : '返回任务列表' }}</el-button></div>
    <el-empty v-if="!task" description="当前身份无权查看该任务，或任务不属于当前项目" />
    <template v-else>
      <div class="task-detail-heading"><h2>{{ isManager ? '全面复查任务详情' : '抽检任务详情' }}</h2></div>
      <section class="task-detail-card">
        <h3 v-if="isHq && task.stage === 'supervisor'" class="task-stage-title">本次抽检</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务编号">{{ task.id }}</el-descriptions-item>
          <el-descriptions-item label="任务状态"><span class="task-state-pill" :class="{complete:task.submittedAt}">{{ stateLabel }}</span></el-descriptions-item>
          <el-descriptions-item label="所属项目">{{ task.projectName }}</el-descriptions-item>
          <el-descriptions-item :label="isManager ? '复查人' : '抽检人'">{{ task.recipient }}</el-descriptions-item>
          <el-descriptions-item label="下发人">{{ task.sender || '指挥部检查人' }}</el-descriptions-item>
          <el-descriptions-item label="推送时间">{{ formatTime(task.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="检查时间范围">{{ task.start }} 至 {{ task.end }}（{{ task.rangeBasis || '历史检查范围' }}）</el-descriptions-item>
          <el-descriptions-item label="抽检比例">{{ task.percent ? `${task.percent}%` : '--' }}</el-descriptions-item>
          <el-descriptions-item label="范围单据数量">{{ task.poolIds.length }} 张</el-descriptions-item>
          <el-descriptions-item label="完成进度">{{ Object.keys(task.results).length }} / {{ task.ids.length }} 张</el-descriptions-item>
          <el-descriptions-item v-if="task.submittedAt" label="完成时间" :span="2">{{ formatTime(task.submittedAt) }}</el-descriptions-item>
        </el-descriptions>
        <p class="task-detail-hint">{{ (!canHandle && !isHq) ? '当前为追踪查看：可查看复查进度、单据与支撑材料，不能替复查人提交结果。' : task.submittedAt ? '本任务已办理，可查看本批次各单据的办理记录。' : isManager ? '请逐单完成现场复查及线下整改，确认已复查并上传复查照片；全部单据保存后，任务自动进入已办理。' : '请逐单重新核对整改及复查资料；全部单据保存后，任务自动进入已办理。' }}</p>
      </section>
      <section class="task-detail-card">
        <div class="task-record-filters"><el-input v-model="keyword" clearable placeholder="单据编号、隐患内容或来源" style="width:280px"/><el-select v-model="resultFilter" clearable :placeholder="isManager ? '本次复查状态' : '本次抽查结果'" style="width:170px"><el-option v-for="result in isManager ? ['待复查','已复查'] : ['待抽查','合格','不合格']" :key="result" :label="result" :value="result"/></el-select><el-button @click="keyword='';resultFilter=''">重置</el-button></div>
        <el-table :data="filtered" border stripe class="supervisor-task-records" empty-text="暂无符合条件的单据">
          <el-table-column prop="originalNo" label="单据编号" min-width="190" show-overflow-tooltip/>
          <el-table-column prop="sourceLabel" label="来源" width="130"/>
          <el-table-column prop="title" label="隐患内容" min-width="240" show-overflow-tooltip/>
          <el-table-column prop="status" label="原业务状态" width="110"/>
          <el-table-column :label="isManager ? '本次复查状态' : '本次抽查结果'" width="130"><template #default="{row}"><span :class="row.reviewResult === '不合格' ? 'task-result-fail' : ['合格','已复查'].includes(row.reviewResult) ? 'task-result-pass' : ''">{{ row.reviewResult }}</span></template></el-table-column>
          <el-table-column :label="isManager ? '复查日期' : '抽查日期'" width="170"><template #default="{row}">{{ formatTime(row.reviewTime) }}</template></el-table-column>
          <el-table-column label="操作" width="100" fixed="right"><template #default="{row}"><el-button link type="primary" :disabled="row.missing" @click="openRecord(row)">{{ canHandle && !task.submittedAt && !row.reviewed ? isManager ? '去复查' : '去抽检' : '查看' }}</el-button></template></el-table-column>
        </el-table>
      </section>
      <section v-if="task.stage === 'supervisor'" class="task-detail-card">
        <template v-if="isHq && task.discrepancy">
          <el-alert title="抽检人全部判为合格，与指挥部抽查结论存在差异，请核查。" type="warning" :closable="false"/>
          <p v-if="task.resolution">核查意见：{{ task.resolution }}</p>
          <div v-else class="difference-review"><el-input v-model="resolution" type="textarea" :rows="3" placeholder="填写结论差异核查意见"/><el-button type="primary" @click="resolveDifference">保存核查意见</el-button></div>
        </template>
        <h3 class="task-stage-title">后续全面复查</h3>
        <template v-if="linkedReviews.length">
          <div v-for="follow in linkedReviews" :key="follow.id" class="follow-review">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="任务编号">{{ follow.id }}</el-descriptions-item>
              <el-descriptions-item label="任务状态">{{ followState(follow) }}</el-descriptions-item>
              <el-descriptions-item label="下发人">{{ follow.sender || '--' }}</el-descriptions-item>
              <el-descriptions-item label="复查人">{{ follow.recipient || '--' }}</el-descriptions-item>
              <el-descriptions-item label="下发时间">{{ formatTime(follow.createdAt) }}</el-descriptions-item>
              <el-descriptions-item label="完成时间">{{ formatTime(follow.submittedAt) }}</el-descriptions-item>
              <el-descriptions-item label="检查时间范围" :span="2">{{ follow.start }} 至 {{ follow.end }}</el-descriptions-item>
              <el-descriptions-item label="范围单据数量">{{ follow.poolIds.length }} 张</el-descriptions-item>
              <el-descriptions-item label="已复查数量">{{ followProgress(follow).done }} / {{ follow.ids.length }} 张</el-descriptions-item>
            </el-descriptions>
            <el-button link type="primary" @click="openFollow(follow)">查看复查单据与附件</el-button>
          </div>
        </template>
        <p v-else class="task-detail-hint">尚未下发全面复查任务。</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.supervisor-task-detail { padding:4px 0 20px; }
.task-detail-back { display:flex; justify-content:flex-start; margin-bottom:14px; }
.difference-review { display:flex; gap:12px; align-items:flex-start; margin:14px 0; }
.task-detail-heading { display:flex; justify-content:space-between; gap:12px; align-items:center; margin-bottom:16px; }
.task-detail-heading h2 { margin:0; font-size:20px; }
.task-detail-card { margin-bottom:16px; padding:18px; border:1px solid #e5e9ef; border-radius:8px; background:#fff; }
.task-detail-hint { margin:14px 0; color:#737c89; font-size:13px; }
.task-record-filters { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:16px; }
.task-result-fail { color:#c74747; }
.task-result-pass { color:#278450; }
.task-state-pill { display:inline-block; padding:2px 8px; border-radius:4px; line-height:22px; color:#9b690f; background:#fff5df; white-space:nowrap; }
.task-state-pill.complete { color:#278450; background:#edf8ef; }
.task-stage-title { margin:0 0 14px; font-size:15px; font-weight:600; }
.follow-review { margin-bottom:14px; }
.follow-review:last-child { margin-bottom:0; }
</style>

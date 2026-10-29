<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import HazardRecordDetail from '../../components/hazard/HazardRecordDetail.vue'
import ExternalQualityDetail from './ExternalQualityIssueDetailView.vue'
import SafetyDetail from '../safety/SafetyHazardDetailView.vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { sampling, useSamplingRole, viewableTasks, canHandleTask, linkedReviewTasks, taskProgress, submitReview, visibleHistory, saveSamplingAttachment, downloadSamplingAttachment } from '../../mock/hazardSampling.js'
import { getHazardIssueRows } from '../../utils/hazardIssueSummary.js'
import { buildSamplingRounds } from '../../mock/hazardSamplingRounds.js'
import SamplingRoundsTable from '../../components/hazard/SamplingRoundsTable.vue'
import { getSamplingPeople } from '../../mock/samplingPeople.js'
import { getInspectionHazardDetail } from '../../mock/inspectionHazardQuery.js'
import { resolveDispatchHazardPhotoSrc } from '../../utils/dispatchHazardStorage.js'
import { restoreSupervisorTaskContext } from '../../utils/hazardSamplingTaskNavigation.js'

const route = useRoute()
const router = useRouter()
if (route.query.viewer !== 'hq') restoreSupervisorTaskContext(String(route.params.id))
const role = useSamplingRole()
const { selectedProjectId } = useCurrentProject()
const isHq = computed(() => role.value === 'hq')

const task = computed(() => viewableTasks(role.value, selectedProjectId.value).find(item => item.id === route.params.id))
function parentTaskOf(item) {
  if (!item) return null
  return sampling.value.tasks.find(entry => entry.stage === 'supervisor' && (entry.id === item.parentTaskId || (!item.parentTaskId && entry.batchId === item.batchId && entry.projectKey === item.projectKey))) || null
}
const supervisorTask = computed(() => !task.value ? null : task.value.stage === 'supervisor' ? task.value : parentTaskOf(task.value))
const reviewTask = computed(() => !task.value ? null : task.value.stage === 'manager' ? task.value : linkedReviewTasks(task.value)[0] || null)
const supervisorProgress = computed(() => taskProgress(supervisorTask.value))
const reviewProgress = computed(() => taskProgress(reviewTask.value))

const activeTab = ref('')
watch(task, value => {
  activeTab.value = value?.stage === 'manager' ? 'review' : 'supervisor'
}, { immediate: true })
const phaseTask = computed(() => activeTab.value === 'review' ? reviewTask.value : supervisorTask.value)
const phaseRole = computed(() => activeTab.value === 'review' ? 'manager' : 'supervisor')
const canHandlePhase = computed(() => Boolean(phaseTask.value) && !isHq.value && phaseRole.value === role.value && !phaseTask.value.submittedAt && canHandleTask(phaseTask.value, phaseRole.value, selectedProjectId.value))

const rowIndex = computed(() => new Map(getHazardIssueRows().map(row => [row.id, row])))
function logOf(target, rowId) {
  if (!target) return null
  const logId = target.results?.[rowId]
  if (!logId) return null
  return sampling.value.history.find(log => log.id === logId && log.taskId === target.id && log.stage === target.stage && log.rowId === rowId) || null
}
const records = computed(() => {
  const target = phaseTask.value
  if (!target) return []
  return target.ids.map(id => {
    const row = rowIndex.value.get(id)
    const log = logOf(target, id)
    const result = log ? (target.stage === 'manager' ? '已复查' : log.result) : (target.stage === 'manager' ? '待复查' : '待抽查')
    return { id, row, rowId: row?.id || '', no: row?.originalNo || id, title: row?.title || '原单据不可用', status: row?.status || '--', source: row?.sourceLabel || '--', result, time: log?.time || '', log }
  })
})
const keyword = ref('')
const rowStatusFilter = ref('')
const checkStatusFilter = ref('')
watch(activeTab, () => { keyword.value = ''; rowStatusFilter.value = ''; checkStatusFilter.value = '' })
const rowStatusOptions = computed(() => [...new Set(records.value.map(item => item.status).filter(Boolean))])
const checkStatusOptions = computed(() => activeTab.value === 'review' ? ['待复查', '已复查'] : ['待抽查', '合格', '不合格'])
const visibleRecords = computed(() => records.value.filter(item => {
  const text = `${item.no} ${item.title}`.toLowerCase()
  if (keyword.value.trim() && !text.includes(keyword.value.trim().toLowerCase())) return false
  if (rowStatusFilter.value && item.status !== rowStatusFilter.value) return false
  if (checkStatusFilter.value && item.result !== checkStatusFilter.value) return false
  return true
}))
const selectedId = ref('')
watch([activeTab, records], () => {
  const list = records.value
  if (!list.length) { selectedId.value = ''; return }
  if (selectedId.value && list.some(item => item.id === selectedId.value)) return
  const pending = list.find(item => !item.log)
  selectedId.value = (pending || list[0]).id
}, { immediate: true })
const currentRecord = computed(() => records.value.find(item => item.id === selectedId.value) || null)
watch(visibleRecords, list => {
  if (!list.length) return
  if (!list.some(item => item.id === selectedId.value)) selectedId.value = (list.find(item => !item.log) || list[0]).id
})
const currentRow = computed(() => currentRecord.value?.row || null)

const history = computed(() => currentRow.value ? visibleHistory(currentRow.value.id, isHq.value ? 'hq' : phaseRole.value) : [])
const recordRounds = computed(() => currentRow.value ? buildSamplingRounds(sampling.value, currentRow.value, role.value) : [])
const detailComponent = computed(() => currentRow.value?.source === 'externalQuality' ? ExternalQualityDetail : currentRow.value?.source === 'inspection' ? SafetyDetail : HazardRecordDetail)
const people = computed(() => getSamplingPeople(supervisorTask.value?.projectKey || task.value?.projectKey || ''))
const existingFollow = computed(() => supervisorTask.value ? sampling.value.tasks.find(entry => entry.stage === 'manager' && entry.batchId === supervisorTask.value.batchId) : null)

const form = reactive({ result: '', note: '', files: [], completed: false, dispatch: null, reviewAssigneeId: '', uploading: 0 })
function resetForm() { Object.assign(form, { result: '', note: '', files: [], completed: false, dispatch: null, reviewAssigneeId: '', uploading: 0 }) }
watch([selectedId, activeTab], resetForm)
const isPhoto = file => /\.(jpe?g|png)$/i.test(file.name)
async function upload(file) {
  if (!isPhoto(file) || file.size > 50 * 1024 * 1024 || form.files.length + form.uploading >= 9) return ElMessage.error('复查照片仅支持 JPG、JPEG、PNG，最多9张，单张不超过50MB')
  form.uploading++
  try { form.files.push(await saveSamplingAttachment(file.raw)) } catch { ElMessage.error('照片保存失败，请重试') } finally { form.uploading-- }
}
function submit() {
  if (!currentRow.value || !phaseTask.value || !canHandlePhase.value) return
  if (!form.result && phaseRole.value !== 'manager') return ElMessage.error('请选择合格或不合格')
  if (phaseRole.value === 'supervisor' && form.result === '不合格' && !existingFollow.value) {
    if (typeof form.dispatch !== 'boolean') return ElMessage.error('请选择是否下发任务')
    if (form.dispatch && !form.reviewAssigneeId) return ElMessage.error('请选择一名全面复查人')
  }
  if (phaseRole.value === 'manager' && !form.completed) return ElMessage.error('请确认已完成复查')
  try {
    const result = submitReview(currentRow.value, phaseRole.value, {
      result: phaseRole.value === 'manager' ? '合格' : form.result,
      note: form.note,
      files: [...form.files],
      completed: form.completed,
      dispatch: form.dispatch,
      reviewAssigneeId: form.reviewAssigneeId,
      submissionId: crypto.randomUUID(),
    }, phaseTask.value.id)
    resetForm()
    ElMessage.success(result.completedTask ? '本单已保存，本阶段全部办理完成' : '本单结果已保存')
    const next = records.value.find(item => !item.log)
    if (next) selectedId.value = next.id
  } catch (error) { ElMessage.error(error.message) }
}
function goBack() {
  const backTaskId = String(route.query.fromTask || '')
  if (backTaskId) { router.push({ path: `/hazard-issues/sampling-task/${encodeURIComponent(backTaskId)}`, query: { viewer: route.query.viewer === 'hq' ? 'hq' : 'project' } }); return }
  const fromPath = String(route.query.from || '')
  if (fromPath.startsWith('/hazard-issues/')) { router.push(fromPath); return }
  router.push(task.value?.stage === 'manager' ? '/hazard-issues/review' : '/hazard-issues/sampling')
}
const stageLabel = value => value ? (value.submittedAt ? '已办理' : Object.keys(value.results || {}).length ? '办理中' : '待办理') : '未下发'
const formatTime = value => value ? new Date(value).toLocaleString('sv-SE') : '--'
</script>

<template>
  <div class="task-workspace">
    <div class="ws-back"><el-button @click="goBack">返回任务列表</el-button></div>
    <el-empty v-if="!task" description="当前身份无权查看该任务，或任务不属于当前项目" />
    <template v-else>
      <section class="ws-header">
        <div class="ws-title"><h2>抽检任务工作台</h2><span class="ws-id">{{ task.id }}</span><span class="task-state-pill" :class="{ complete: task.submittedAt }">{{ stageLabel(task) }}</span></div>
        <div class="ws-meta">
          <span>项目：{{ task.projectName }}</span>
          <span>抽检人：{{ supervisorTask?.recipient || '--' }}</span>
          <span>复查人：{{ reviewTask?.recipient || '未下发' }}</span>
          <span>检查范围：{{ task.start }} 至 {{ task.end }}</span>
          <span>比例：{{ task.percent ?? '--' }}%</span>
          <span>单据：{{ supervisorTask?.ids.length || 0 }} 张 / 复查 {{ reviewTask?.ids.length || 0 }} 张</span>
        </div>

      </section>

      <el-tabs v-model="activeTab" class="ws-tabs">
        <el-tab-pane :label="`监理抽检（${supervisorProgress.done}/${supervisorProgress.total}）`" name="supervisor" />
        <el-tab-pane :label="`施工复查（${reviewTask ? reviewProgress.done + '/' + reviewProgress.total : '未下发'}）`" name="review" :disabled="!reviewTask" />
      </el-tabs>

      <div class="ws-body">
        <aside class="ws-list">
          <div class="ws-filters">
            <el-input v-model="keyword" clearable placeholder="搜索编号／隐患说明" :prefix-icon="Search" />
            <div class="ws-filter-row">
              <el-select v-model="rowStatusFilter" clearable placeholder="整改单状态"><el-option v-for="status in rowStatusOptions" :key="status" :label="status" :value="status" /></el-select>
              <el-select v-model="checkStatusFilter" clearable placeholder="抽检状态"><el-option v-for="status in checkStatusOptions" :key="status" :label="status" :value="status" /></el-select>
            </div>
          </div>
          <div class="ws-cards">
            <div v-for="item in visibleRecords" :key="item.id" class="ws-card" :class="{ active: item.id === selectedId, done: item.log }" @click="selectedId = item.id">
              <div class="ws-card-top"><span class="ws-no">{{ item.no }}</span><span class="ws-result" :class="{ fail: item.result === '不合格', pass: item.result === '合格' || item.result === '已复查' }">{{ item.result }}</span></div>
              <p class="ws-title-text" :title="item.title">{{ item.title }}</p>
              <div class="ws-card-foot"><span>{{ item.status }}</span><span class="ws-source">{{ item.source }}</span></div>
            </div>
            <p v-if="!visibleRecords.length" class="ws-hint">没有符合筛选条件的单据</p>
          </div>
        </aside>

        <section class="ws-detail">
          <template v-if="currentRecord">
            <div class="ws-detail-head"><h3>{{ currentRecord.no }}</h3><el-tag size="small" effect="plain">{{ currentRecord.source }}</el-tag><el-tag size="small" :type="currentRecord.result === '不合格' ? 'danger' : currentRecord.result === '待抽查' || currentRecord.result === '待复查' ? 'info' : 'success'">{{ currentRecord.result }}</el-tag></div>
            <div class="ws-block ws-form" v-if="canHandlePhase">
              <h4>{{ phaseRole === 'manager' ? '本单复查' : '本单抽检' }}</h4>
              <template v-if="phaseRole === 'supervisor'">
                <el-radio-group v-model="form.result"><el-radio value="合格">合格</el-radio><el-radio value="不合格">不合格</el-radio></el-radio-group>
                <el-input v-model="form.note" type="textarea" :rows="3" :placeholder="form.result === '不合格' ? '请填写不合格说明（必填）' : '检查说明'"/>
                <div v-if="form.result === '不合格'" class="ws-reviewer">
                  <template v-if="existingFollow"><span>本任务已下发全面复查至：{{ existingFollow.recipient }}（本单仅记录结果）</span></template>
                  <template v-else>
                    <span>是否下发任务</span>
                    <el-radio-group v-model="form.dispatch"><el-radio :value="true">是</el-radio><el-radio :value="false">否</el-radio></el-radio-group>
                    <span v-if="form.dispatch === true">全面复查人</span>
                    <el-select v-if="form.dispatch === true" v-model="form.reviewAssigneeId" filterable placeholder="请选择一名全面复查人" style="width:260px"><el-option v-for="person in people" :key="person.id" :label="person.label" :value="person.id"/></el-select>
                  </template>
                </div>
              </template>
              <template v-else>
                <el-checkbox v-model="form.completed">已复查</el-checkbox>
                <el-input v-model="form.note" type="textarea" :rows="3" placeholder="填写现场复查和线下整改情况"/>
                <div class="ws-upload"><el-upload :auto-upload="false" :show-file-list="false" :on-change="upload" accept=".jpg,.jpeg,.png"><el-button :loading="form.uploading > 0">上传复查照片（可选）</el-button></el-upload><span v-for="(file, index) in form.files" :key="file.id" class="ws-file">{{ file.name }}<el-button link @click="form.files.splice(index, 1)">移除</el-button></span></div>
              </template>
              <el-button type="primary" :loading="form.uploading > 0" @click="submit">保存本单{{ phaseRole === 'supervisor' ? '抽检' : '复查' }}结果</el-button>
            </div>
            <p v-else class="ws-hint">{{ isHq ? '指挥部仅查看，不能替办理人提交结果。' : phaseTask?.submittedAt ? '本阶段已办理完成，结果为只读。' : '当前为追踪查看，不能替办理人提交结果。' }}</p>

            <component :is="detailComponent" :row="currentRow" :record-id="currentRow?.sourceId" embedded />

            <div class="ws-block" v-if="history.length"><h4>本单记录</h4><SamplingRoundsTable :rounds="recordRounds" :role="role" /></div>
          </template>
          <el-empty v-else description="左列选择一张单据查看详情" :image-size="60" />
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.task-workspace { padding: 4px 0 24px; color: #303133; }
.ws-back { margin-bottom: 12px; }
.ws-header { padding: 16px 18px; background: #fff; border: 1px solid #e5e9ef; border-radius: 8px; }
.ws-title { display: flex; align-items: center; gap: 10px; }
.ws-title h2 { margin: 0; font-size: 18px; }
.ws-id { font-size: 12px; color: #8b929b; }
.ws-meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px; font-size: 13px; color: #697180; }
.ws-links { margin-top: 8px; }
.ws-tabs { margin: 14px 0 0; }
.ws-body { display: grid; grid-template-columns: 248px minmax(0, 1fr); gap: 14px; align-items: stretch; }
.ws-list { display: flex; flex-direction: column; overflow: visible; padding: 10px; background: #fff; border: 1px solid #e5e9ef; border-radius: 8px; }
.ws-filters { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
.ws-filter-row { display: flex; flex-direction: column; gap: 8px; }
.ws-filter-row :deep(.el-select) { flex: 1; }
.ws-cards { flex: 1; }
.ws-card { padding: 10px 12px; margin-bottom: 8px; border: 1px solid #e9edf3; border-radius: 6px; cursor: pointer; transition: border-color .2s, box-shadow .2s; }
.ws-card:hover { border-color: #d9b3c6; }
.ws-card.active { border-color: #8f0045; box-shadow: 0 0 0 2px #fceef4; }
.ws-card.done .ws-no { color: #8b929b; }
.ws-card-top { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.ws-no { font-weight: 600; }
.ws-result { font-size: 12px; color: #8b929b; white-space: nowrap; }
.ws-result.pass { color: #278450; }
.ws-result.fail { color: #c74747; }
.ws-title-text { margin: 6px 0; font-size: 12px; color: #4b5563; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.ws-card-foot { display: flex; justify-content: space-between; font-size: 11px; color: #9aa1aa; }
.ws-detail { padding: 18px; background: #fff; border: 1px solid #e5e9ef; border-radius: 8px; }
.ws-detail-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.ws-detail-head h3 { margin: 0; font-size: 16px; }
.ws-block { margin-top: 18px; padding-top: 14px; border-top: 1px dashed #e9edf3; }
.ws-block h4 { margin: 0 0 10px; font-size: 14px; }
.ws-photos { display: flex; gap: 10px; flex-wrap: wrap; }
.ws-photos :deep(.el-image) { width: 150px; height: 96px; border-radius: 4px; }
.ws-flow { padding-top: 2px; }
.ws-flow-item { display: flex; gap: 10px; padding-bottom: 12px; position: relative; }
.ws-flow-item::before { content: ''; position: absolute; left: 6px; top: 16px; bottom: 0; width: 1px; background: #e5e9ef; }
.ws-flow-item:last-child::before { display: none; }
.ws-flow-dot { width: 13px; height: 13px; border-radius: 50%; background: #c4ccd6; flex-shrink: 0; margin-top: 3px; }
.ws-flow-item.done .ws-flow-dot { background: #34a853; }
.ws-flow-item.cur .ws-flow-dot { background: #8f0045; box-shadow: 0 0 0 3px #fceef4; }
.ws-flow-body { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.ws-flow-body span { color: #8b929b; font-size: 12px; }
.ws-flow-body p { margin: 2px 0 0; color: #6d7580; font-size: 12px; }
.ws-form { display: flex; flex-direction: column; gap: 12px; align-items: flex-start; margin-bottom: 20px; padding: 16px 18px; background: #fbfcfd; border: 1px solid #eef1f5; border-radius: 8px; }
.ws-reviewer { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.ws-upload { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; }
.ws-file { color: #8f0045; }
.ws-hint { margin: 10px 0; font-size: 13px; color: #8b929b; }
.ws-pass { color: #278450; }
.ws-fail { color: #c74747; }
.ws-log-files { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; font-size: 13px; }
.task-state-pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; color: #9b690f; background: #fff5df; }
.task-state-pill.complete { color: #278450; background: #edf8ef; }
</style>

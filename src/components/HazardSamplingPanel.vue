<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHazardIssueRows, getCurrentHazardIssueProjectKey } from '../utils/hazardIssueSummary.js'
import { useCurrentProject } from '../composables/useCurrentProject.js'
import { useSamplingRole, eligible, submitReview, samplingPreview, registrationDay, visibleTasks, viewableTasks, canHandleTask, samplingPersonId, saveSamplingAttachment, downloadSamplingAttachment, ensureSamplingExamples, sampling } from '../mock/hazardSampling.js'
import { getSamplingPeople } from '../mock/samplingPeople.js'
import { buildSamplingRounds } from '../mock/hazardSamplingRounds.js'
import SamplingRoundsTable from './hazard/SamplingRoundsTable.vue'
import { restoreSupervisorTaskContext, samplingReturnLocation } from '../utils/hazardSamplingTaskNavigation.js'

const props = defineProps({ source: String, recordId: String, coc:Boolean })
const route = useRoute()
const router = useRouter()
if (route.query.from === 'sampling-task' && route.query.viewer !== 'hq') restoreSupervisorTaskContext(String(route.query.samplingTask || ''))
const viewerRole = useSamplingRole()
const role = computed(() => viewerRole.value === 'hq' ? 'hq' : contextTask.value?.stage || viewerRole.value)
ensureSamplingExamples()
const { selectedProjectId } = useCurrentProject()
const row = computed(() => getHazardIssueRows().find(item => item.source === props.source && item.sourceId === props.recordId))
const taskContext = computed(() => route.query.from === 'sampling-task')
const contextTask = computed(() => taskContext.value ? viewableTasks(viewerRole.value, selectedProjectId.value).find(task => task.id === route.query.samplingTask && task.ids.includes(row.value?.id)) : null)
const canHandleContext = computed(() => canHandleTask(contextTask.value, viewerRole.value, selectedProjectId.value))
const allowed = computed(() => row.value && (taskContext.value ? Boolean(contextTask.value) : role.value === 'hq' || row.value.projectKey === getCurrentHazardIssueProjectKey(selectedProjectId.value)))
const rounds = computed(() => {
  if (!allowed.value) return []
  const taskIds = new Set(viewableTasks(viewerRole.value, selectedProjectId.value).map(task => task.id))
  const records = buildSamplingRounds(sampling.value, row.value, role.value).filter(round => role.value === 'hq' || taskIds.has(round.taskId))
  return taskContext.value ? records.filter(round => round.id === contextTask.value.batchId) : records
})
/** COC 大屏：抽查记录不按身份过滤，项目内统一展示全部阶段（操作/待办仍按当前身份） */
const displayRounds = computed(() => {
  if (!props.coc || !allowed.value) return rounds.value
  const records = buildSamplingRounds(sampling.value, row.value, 'hq')
  return taskContext.value ? records.filter(round => round.id === contextTask.value.batchId) : records
})
const inspectionDates = ref([])
const pendingRounds = computed(() => rounds.value.filter(round => round.actionTaskId))
const editorVisible = ref(false)
const detailsVisible = ref(false)
const editingTaskId = ref('')
const detailRoundId = ref('')
const uploading = ref(0)
const submitting = ref(false)
const form = reactive({ result: '', note: '', files: [], completed: false, dispatch:true, dates:[], percent:undefined, assigneeId:'', reviewAssigneeId:'', submissionId:'' })
const stageNames = { hq: '指挥部抽查', supervisor: '抽检人检查', manager: '全面复查' }
const assignees = computed(() => getSamplingPeople(row.value?.projectKey))
const editingTask = computed(() => visibleTasks(viewerRole.value, selectedProjectId.value).find(task => task.id === editingTaskId.value && task.stage === 'supervisor'))
const existingFollow = computed(() => editingTask.value ? sampling.value.tasks.find(task => task.stage === 'manager' && task.batchId === editingTask.value.batchId) : null)
const dispatchPreview = computed(() => {
  if (!form.dates?.length || !form.percent) return null
  try { return samplingPreview(row.value, form.dates, form.percent) } catch(error) { return { error:error.message } }
})
const currentDetails = computed(() => rounds.value.find(item => item.id === detailRoundId.value))
const editorTitle = computed(() => role.value === 'hq' ? '不合格处理及任务下发' : stageNames[role.value])
const latestInspection = computed(() => !allowed.value ? null : sampling.value.history
  .filter(log => log.rowId === row.value.id && log.stage === 'hq')
  .reduce((latest, log) => !latest || Date.parse(log.time) >= Date.parse(latest.time) ? log : latest, null))
const latestInspectionTask = computed(() => latestInspection.value ? sampling.value.tasks.find(task => task.stage === 'supervisor' && task.batchId === latestInspection.value.roundId) : null)
function submitPass(event) {
  if (submitting.value || event?.detail > 1 || role.value !== 'hq' || !allowed.value || taskContext.value) return
  resetForm(); editingTaskId.value = ''; form.result = '合格'; submit()
}
function openFailureEditor() {
  if (submitting.value || role.value !== 'hq' || !allowed.value || taskContext.value) return
  openEditor(); form.result = '不合格'
}
const isPhoto = file => /\.(jpe?g|png)$/i.test(file.name)
const formatTime = value => value ? new Date(value).toLocaleString('sv-SE') : '--'

function resetForm() { Object.assign(form, { result: '', note: '', files: [], completed: false, dispatch:true, dates:[], percent:undefined, assigneeId:'', reviewAssigneeId:'', submissionId:crypto.randomUUID() }) }
watch([role, samplingPersonId, () => props.recordId, () => route.query.samplingTask], () => { editorVisible.value = false; inspectionDates.value = []; resetForm() })
watch(() => form.result, value => { if (role.value !== 'manager' && value === '合格') { form.note = ''; form.dispatch=null; form.dates=[]; form.percent=undefined; form.assigneeId=''; form.reviewAssigneeId='' } })
watch(() => form.dispatch, value => { if (value !== true) { form.dates=[]; form.percent=undefined; form.assigneeId='' } })
function openEditor(taskId = '') {
  if (role.value !== 'hq' && taskContext.value && (!contextTask.value || contextTask.value.submittedAt || contextTask.value.id !== taskId)) return
  resetForm(); editingTaskId.value = taskId; editorVisible.value = true
}
async function upload(file) {
  if (!isPhoto(file) || file.size > 50 * 1024 * 1024 || form.files.length + uploading.value >= 9) return ElMessage.error('复查照片仅支持 JPG、JPEG、PNG，最多9张，单张不超过50MB')
  uploading.value++
  try { form.files.push(await saveSamplingAttachment(file.raw)) } catch { ElMessage.error('照片保存失败，请重试') } finally { uploading.value-- }
}
async function submit(event) {
  if (uploading.value || submitting.value || event?.detail > 1) return
  submitting.value = true
  await nextTick()
  try {
    const result = submitReview(row.value, role.value, { ...form, result: role.value === 'manager' ? '合格' : form.result, files: [...form.files] }, editingTaskId.value)
    editorVisible.value = false
    resetForm()
    ElMessage.success(role.value === 'hq' ? (result.task ? '不合格结果已保存，任务已下发' : `抽查结果已保存：${result.log.result}`) : result.followTaskCreated ? `已向${result.followTaskCreated.recipient}下发完整范围的${result.followTaskCreated.ids.length}张单据${result.completedTask ? '；本次抽检任务也已办理' : ''}` : result.completedTask ? '本批次单据已全部完成，任务已自动归入已办理' : result.task ? '抽查已保存，任务已下发给指定抽检人' : '检查结果已保存')
  } catch (error) { ElMessage.error(error.message) } finally { await nextTick(); submitting.value = false }
}
</script>

<template>
  <section v-if="allowed" class="sampling-panel" :class="{ 'sampling-coc': coc }">
    <div v-if="route.query.samplingTask" class="sampling-panel-back"><el-button link type="primary" @click="router.push(samplingReturnLocation({...route.query,from:'sampling-task'}))">返回本次抽检任务</el-button></div>
    <div class="sampling-panel-head">
      <h3>抽查记录</h3>
      <div class="sampling-panel-actions">
        <template v-if="role === 'hq' && eligible(row) && !taskContext">
          <el-button type="success" :loading="submitting && !editorVisible" :disabled="submitting" @click="submitPass">合格</el-button>
          <el-button type="danger" :disabled="submitting" @click="openFailureEditor">不合格</el-button>
        </template>
      </div>
    </div>
    <div v-if="latestInspection && role === 'hq'" class="sampling-recent-result" role="status" aria-live="polite">
      <span>最近抽查：<strong :class="latestInspection.result === '合格' ? 'inspection-pass' : 'inspection-fail'">{{ latestInspection.result }}</strong></span>
      <span>抽查人：{{ latestInspection.person }}</span><span>抽查时间：{{ formatTime(latestInspection.time) }}</span>
      <span v-if="latestInspectionTask">任务编号：{{ latestInspectionTask.id }}</span>
    </div>
    <div v-for="round in pendingRounds" :key="round.id" class="sampling-pending-entry">
      <div><strong>{{ role === 'manager' ? '待办复查' : '待办抽查' }}</strong><span>任务编号：{{ round.actionTaskId }}</span></div>
      <el-button v-if="eligible(row) && (!taskContext || canHandleContext)" type="primary" @click="openEditor(round.actionTaskId)">办理</el-button>
    </div>
    <div class="sampling-date-filter">
      <span>抽查日期</span>
      <el-date-picker v-model="inspectionDates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" clearable :popper-class="coc ? 'sampling-coc-popper' : undefined" />
      <el-button @click="inspectionDates=[]">重置</el-button>
    </div>
    <SamplingRoundsTable :rounds="displayRounds" :role="role" :date-range="inspectionDates" :coc="coc" :empty-text="coc ? '暂无抽查记录' : '尚未提交本身份的抽查记录'" />
    <el-dialog v-model="editorVisible" :close-on-click-modal="!submitting" :close-on-press-escape="!submitting" :show-close="!submitting" :title="editorTitle" width="680px" :z-index="coc ? 220000 : undefined" :class="coc ? 'sampling-coc-dialog' : ''" append-to-body destroy-on-close>
      <el-config-provider :z-index="coc ? 230000 : 2000">
      <el-form label-width="128px" class="sampling-entry-form">
        <el-form-item v-if="role !== 'manager'" label="抽查结果" required>
          <span v-if="role === 'hq'" class="inspection-fail">不合格</span>
          <el-radio-group v-else v-model="form.result"><el-radio value="合格">合格</el-radio><el-radio value="不合格">不合格</el-radio></el-radio-group>
        </el-form-item>
        <template v-else>
          <el-form-item label="复查确认" required><el-checkbox v-model="form.completed">已复查</el-checkbox></el-form-item>
          <el-form-item label="复查照片（可选）">
            <div class="sampling-photo-upload">
              <el-upload :auto-upload="false" :show-file-list="false" :on-change="upload" accept=".jpg,.jpeg,.png"><el-button :loading="uploading > 0">上传复查照片</el-button></el-upload>
              <span class="sampling-hint">可选，最多9张，支持 JPG、JPEG、PNG，单张≤50MB</span>
              <div v-for="(file,index) in form.files" :key="file.id">{{ file.name }} <el-button link @click="form.files.splice(index,1)">移除</el-button></div>
            </div>
          </el-form-item>
        </template>
        <el-form-item v-if="role === 'manager' || form.result === '不合格'" label="说明" :required="role !== 'manager'">
          <el-input v-model="form.note" type="textarea" :rows="4" :placeholder="role === 'manager' ? '填写现场复查和线下整改情况' : '请填写不合格说明（必填）'" />
        </el-form-item>
        <template v-if="role === 'supervisor' && form.result === '不合格'">
          <template v-if="!existingFollow">
            <el-form-item label="是否下发任务" required><el-radio-group v-model="form.dispatch"><el-radio :value="true">是</el-radio><el-radio :value="false">否</el-radio></el-radio-group></el-form-item>
            <el-form-item v-if="form.dispatch === true" label="全面复查人" required><el-select v-model="form.reviewAssigneeId" filterable placeholder="请选择一名全面复查人" style="width:100%" :teleported="coc ? false : true" :popper-class="coc ? 'sampling-coc-popper' : undefined"><el-option v-for="person in assignees" :key="person.id" :label="person.label" :value="person.id"/></el-select></el-form-item>
          </template>
          <el-form-item v-else label="已下发至"><span>{{ existingFollow.recipient }}</span></el-form-item>
          <el-alert v-if="editingTask" type="info" :closable="false" :title="existingFollow ? `本批次已有全面复查任务，共${existingFollow.ids.length}张，不再重复下发。` : `将下发原任务${editingTask.start}至${editingTask.end}完整时间范围的全部${editingTask.poolIds.length}张单据。`"/>
        </template>
        <template v-if="role === 'hq' && form.result === '不合格'">
          <el-form-item label="是否下发任务" required><el-radio-group v-model="form.dispatch"><el-radio :value="true">是</el-radio><el-radio :value="false">否</el-radio></el-radio-group></el-form-item>
          <template v-if="form.dispatch === true">
            <el-form-item label="本单登记时间"><span>{{ row.registeredAt || '--' }}</span></el-form-item>
            <el-form-item label="检查时间范围" required><el-date-picker v-model="form.dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="检查开始日期" end-placeholder="检查结束日期" :popper-class="coc ? 'sampling-coc-popper' : undefined"/><span class="sampling-hint">按本单所属项目、同一来源的登记日期取单，含起止日；必须覆盖本单登记日期 {{ registrationDay(row) }}。</span></el-form-item>
            <el-form-item label="抽检比例" required><el-input-number v-model="form.percent" :min="1" :max="100" :precision="0"/> <span style="margin-left:8px">%</span><span class="sampling-hint">按本单登记时间范围、同一来源的单据随机抽取；本单必含，且至少抽取 2 张。</span></el-form-item>
            <el-form-item label="抽检人" required><el-select v-model="form.assigneeId" filterable placeholder="请选择监理人员" style="width:100%" :teleported="coc ? false : true" :popper-class="coc ? 'sampling-coc-popper' : undefined"><el-option v-for="person in assignees" :key="person.id" :label="person.label" :value="person.id"/></el-select></el-form-item>
            <el-alert v-if="dispatchPreview" :type="dispatchPreview.error ? 'warning' : 'info'" :closable="false" :title="dispatchPreview.error || `本来源范围内共${dispatchPreview.pool.length}张，实际下发${dispatchPreview.count}张；本单必含，其余随机抽取。`"/>
          </template>
        </template>
      </el-form>
      </el-config-provider>
      <template #footer><el-button :disabled="submitting" @click="editorVisible=false">取消</el-button><el-button type="primary" :disabled="uploading > 0" :loading="submitting" @click="submit">{{ role === 'hq' ? (form.dispatch === true ? '保存并下发任务' : '保存不合格结果') : role === 'supervisor' && form.result === '不合格' && !existingFollow && form.dispatch === true ? '保存并下发全面复查' : '保存' }}</el-button></template>
    </el-dialog>

  </section>
  <el-alert v-else-if="taskContext" title="当前身份无权办理该任务，或该单据不在任务范围内" type="warning" :closable="false" />
</template>

<style scoped>
.sampling-panel { margin:20px 0; padding:18px; background:#fff; border:1px solid #e5e9ef; border-radius:8px; }
.sampling-panel-head { display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:16px; }
.sampling-panel-actions { display:flex; align-items:center; gap:12px; }
.sampling-recent-result { display:flex; align-items:center; flex-wrap:wrap; gap:8px 18px; padding:12px 14px; margin-bottom:16px; border:1px solid #e5e9ef; border-radius:6px; background:#f7f9fc; color:#606b7a; font-size:13px; line-height:1.7; overflow-wrap:anywhere; }
.sampling-coc .sampling-recent-result { background:rgba(35,55,78,.55); border-color:#334a64; color:#c9dcf2; }
.sampling-panel-back { display:flex; justify-content:flex-start; margin-bottom:14px; }
.sampling-panel h3 { margin:0; font-size:16px; }
.sampling-pending-entry { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; padding:12px; border:1px solid #eadce4; border-radius:4px; background:#fcf8fa; }
.sampling-pending-entry div { display:flex; flex-wrap:wrap; gap:12px; font-size:13px; }
.sampling-hint { font-size:12px; color:#8b929b; line-height:1.7; }
.sampling-date-filter { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin:0 0 16px; font-size:13px; }
.sampling-date-filter :deep(.el-date-editor) { max-width:350px; }
.inspection-fail { color:#c74747; }
.inspection-pass { color:#278450; }
.sampling-photo-upload { display:flex; flex-direction:column; align-items:flex-start; gap:8px; }
.sampling-stage-detail { padding:0 0 12px; margin-bottom:14px; border-bottom:1px solid #ebeef5; }
.sampling-stage-detail h4 { margin:0 0 10px; }
.sampling-stage-log { margin-top:10px; padding:10px; background:#f7f8fa; border-radius:4px; }
.sampling-stage-log p { margin:5px 0; font-size:13px; line-height:1.7; overflow-wrap:anywhere; }
</style>

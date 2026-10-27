<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHazardIssueRows, getCurrentHazardIssueProjectKey } from '../utils/hazardIssueSummary.js'
import { useCurrentProject } from '../composables/useCurrentProject.js'
import { useSamplingRole, eligible, submitReview, samplingPreview, registrationDay, visibleTasks, samplingPersonId, saveSamplingAttachment, downloadSamplingAttachment, ensureSamplingExamples, sampling } from '../mock/hazardSampling.js'
import { getSamplingPeople } from '../mock/samplingPeople.js'
import { buildSamplingRounds } from '../mock/hazardSamplingRounds.js'
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
const contextTask = computed(() => taskContext.value ? visibleTasks(viewerRole.value, selectedProjectId.value).find(task => task.id === route.query.samplingTask && task.ids.includes(row.value?.id)) : null)
const allowed = computed(() => row.value && (taskContext.value ? Boolean(contextTask.value) : role.value === 'hq' || row.value.projectKey === getCurrentHazardIssueProjectKey(selectedProjectId.value)))
const rounds = computed(() => {
  if (!allowed.value) return []
  const taskIds = new Set(visibleTasks(viewerRole.value, selectedProjectId.value).map(task => task.id))
  const records = buildSamplingRounds(sampling.value, row.value, role.value).filter(round => role.value === 'hq' || taskIds.has(round.taskId))
  return taskContext.value ? records.filter(round => round.id === contextTask.value.batchId) : records
})
const inspectionDates = ref([])
const pendingRounds = computed(() => rounds.value.filter(round => round.actionTaskId))
const tableRows = computed(() => rounds.value.filter(round => round.logs.some(item => item.stage === role.value)).map(round => {
  const log = round.logs.filter(item => item.stage === role.value).at(-1)
  return { ...round, inspectionTime: log.time, inspectionResult: role.value === 'manager' ? '已复查' : log.result, inspectionNote: log.result === '不合格' ? log.note || '--' : '--', inspector: log.person || '--' }
}))
const filteredRounds = computed(() => tableRows.value.filter(round => {
  if (inspectionDates.value?.length !== 2) return true
  if (!round.inspectionTime) return false
  const day = formatTime(round.inspectionTime).slice(0, 10)
  return day >= inspectionDates.value[0] && day <= inspectionDates.value[1]
}))
const editorVisible = ref(false)
const detailsVisible = ref(false)
const editingTaskId = ref('')
const detailRoundId = ref('')
const uploading = ref(0)
const submitting = ref(false)
const form = reactive({ result: '', note: '', files: [], completed: false, dispatch:null, dates:[], percent:undefined, assigneeId:'', reviewAssigneeId:'', submissionId:'' })
const stageNames = { hq: '指挥部抽查', supervisor: '抽检人检查', manager: '全面复查' }
const assignees = computed(() => getSamplingPeople(row.value?.projectKey))
const editingTask = computed(() => visibleTasks(viewerRole.value, selectedProjectId.value).find(task => task.id === editingTaskId.value && task.stage === 'supervisor'))
const existingFollow = computed(() => editingTask.value ? sampling.value.tasks.find(task => task.stage === 'manager' && task.batchId === editingTask.value.batchId) : null)
const dispatchPreview = computed(() => {
  if (!form.dates?.length || !form.percent) return null
  try { return samplingPreview(row.value, form.dates, form.percent) } catch(error) { return { error:error.message } }
})
const currentDetails = computed(() => rounds.value.find(item => item.id === detailRoundId.value))
const editorTitle = computed(() => role.value === 'hq' ? '新增抽查' : stageNames[role.value])
const isPhoto = file => /\.(jpe?g|png)$/i.test(file.name)
const formatTime = value => value ? new Date(value).toLocaleString('sv-SE') : '--'

function resetForm() { Object.assign(form, { result: '', note: '', files: [], completed: false, dispatch:null, dates:[], percent:undefined, assigneeId:'', reviewAssigneeId:'', submissionId:crypto.randomUUID() }) }
watch([role, samplingPersonId, () => props.recordId, () => route.query.samplingTask], () => { editorVisible.value = false; detailsVisible.value = false; inspectionDates.value = []; resetForm() })
watch(() => form.result, value => { if (role.value !== 'manager' && value === '合格') { form.note = ''; form.dispatch=null; form.dates=[]; form.percent=undefined; form.assigneeId=''; form.reviewAssigneeId='' } })
watch(() => form.dispatch, value => { if (value !== true) { form.dates=[]; form.percent=undefined; form.assigneeId='' } })
function openEditor(taskId = '') {
  if (role.value !== 'hq' && taskContext.value && (!contextTask.value || contextTask.value.submittedAt || contextTask.value.id !== taskId)) return
  resetForm(); editingTaskId.value = taskId; editorVisible.value = true
}
function showDetails(round) { detailRoundId.value = round.id; detailsVisible.value = true }
async function upload(file) {
  if (!isPhoto(file) || file.size > 50 * 1024 * 1024 || form.files.length + uploading.value >= 9) return ElMessage.error('复查照片仅支持 JPG、JPEG、PNG，最多9张，单张不超过50MB')
  uploading.value++
  try { form.files.push(await saveSamplingAttachment(file.raw)) } catch { ElMessage.error('照片保存失败，请重试') } finally { uploading.value-- }
}
function submit() {
  if (uploading.value || submitting.value) return
  submitting.value = true
  try {
    const result = submitReview(row.value, role.value, { ...form, result: role.value === 'manager' ? '合格' : form.result, files: [...form.files] }, editingTaskId.value)
    editorVisible.value = false
    resetForm()
    ElMessage.success(result.followTaskCreated ? `已向${result.followTaskCreated.recipient}下发完整范围的${result.followTaskCreated.ids.length}张单据${result.completedTask ? '；本次抽检也已完成' : ''}` : result.completedTask ? '本批次单据已全部完成，任务已自动归入已办' : result.task ? '抽查已保存，任务已下发给指定抽检人' : '检查结果已保存')
  } catch (error) { ElMessage.error(error.message) } finally { submitting.value = false }
}
</script>

<template>
  <section v-if="allowed" class="sampling-panel">
    <div v-if="route.query.samplingTask" class="sampling-panel-back"><el-button link type="primary" @click="router.push(samplingReturnLocation({...route.query,from:'sampling-task'}))">返回本次抽检任务</el-button></div>
    <div class="sampling-panel-head">
      <h3>抽查记录</h3>
      <div class="sampling-panel-actions">
        <el-button v-if="role === 'hq' && eligible(row)" type="primary" @click="openEditor()">抽查</el-button>
      </div>
    </div>
    <div v-for="round in pendingRounds" :key="round.id" class="sampling-pending-entry">
      <div><strong>{{ role === 'manager' ? '待办复查' : '待办抽查' }}</strong><span>任务编号：{{ round.actionTaskId }}</span></div>
      <el-button v-if="eligible(row)" type="primary" @click="openEditor(round.actionTaskId)">办理</el-button>
    </div>
    <div class="sampling-date-filter">
      <span>抽查日期</span>
      <el-date-picker v-model="inspectionDates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" clearable />
      <el-button @click="inspectionDates=[]">重置</el-button>
    </div>
    <el-table :data="filteredRounds" border class="sampling-round-table" :empty-text="inspectionDates?.length ? '暂无符合日期条件的抽查记录' : '尚未提交本身份的抽查记录'">
      <el-table-column label="抽查日期" width="172">
        <template #default="{ row: round }">{{ formatTime(round.inspectionTime) }}</template>
      </el-table-column>
      <el-table-column label="抽查结果" width="100">
        <template #default="{ row: round }">
          <span :class="round.inspectionResult === '不合格' ? 'inspection-fail' : ['合格','已复查'].includes(round.inspectionResult) ? 'inspection-pass' : 'sampling-hint'">{{ round.inspectionResult }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="inspectionNote" label="不合格说明" min-width="180" show-overflow-tooltip />
      <el-table-column prop="inspector" label="抽查人" width="110" />
      <el-table-column label="操作" width="100" align="center" fixed="right">
        <template #default="{ row: round }">
          <el-button link type="primary" @click="showDetails(round)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="editorVisible" :title="editorTitle" width="680px" :z-index="coc ? 220000 : undefined" append-to-body destroy-on-close>
      <el-config-provider :z-index="coc ? 230000 : 2000">
      <el-form label-width="128px" class="sampling-entry-form">
        <el-form-item v-if="role !== 'manager'" label="抽查结果" required>
          <el-radio-group v-model="form.result"><el-radio value="合格">合格</el-radio><el-radio value="不合格">不合格</el-radio></el-radio-group>
        </el-form-item>
        <template v-else>
          <el-form-item label="复查确认" required><el-checkbox v-model="form.completed">已复查</el-checkbox></el-form-item>
          <el-form-item label="复查照片" required>
            <div class="sampling-photo-upload">
              <el-upload :auto-upload="false" :show-file-list="false" :on-change="upload" accept=".jpg,.jpeg,.png"><el-button :loading="uploading > 0">上传复查照片</el-button></el-upload>
              <span class="sampling-hint">最多9张，支持 JPG、JPEG、PNG，单张≤50MB</span>
              <div v-for="(file,index) in form.files" :key="file.id">{{ file.name }} <el-button link @click="form.files.splice(index,1)">移除</el-button></div>
            </div>
          </el-form-item>
        </template>
        <el-form-item v-if="role === 'manager' || form.result === '不合格'" label="说明" :required="role !== 'manager'">
          <el-input v-model="form.note" type="textarea" :rows="4" :placeholder="role === 'manager' ? '填写现场复查和线下整改情况' : '请填写不合格说明（必填）'" />
        </el-form-item>
        <template v-if="role === 'supervisor' && form.result === '不合格'">
          <el-form-item v-if="!existingFollow" label="全面复查人" required><el-select v-model="form.reviewAssigneeId" filterable placeholder="请选择一名全面复查人" style="width:100%"><el-option v-for="person in assignees" :key="person.id" :label="person.label" :value="person.id"/></el-select></el-form-item>
          <el-form-item v-else label="已下发至"><span>{{ existingFollow.recipient }}</span></el-form-item>
          <el-alert v-if="editingTask" type="info" :closable="false" :title="existingFollow ? `本批次已有全面复查任务，共${existingFollow.ids.length}张，不再重复下发。` : `将下发原任务${editingTask.start}至${editingTask.end}完整时间范围的全部${editingTask.poolIds.length}张单据。`"/>
        </template>
        <template v-if="role === 'hq' && form.result === '不合格'">
          <el-form-item label="是否下发任务" required><el-radio-group v-model="form.dispatch"><el-radio :value="true">是</el-radio><el-radio :value="false">否</el-radio></el-radio-group></el-form-item>
          <template v-if="form.dispatch === true">
            <el-form-item label="本单登记时间"><span>{{ row.registeredAt || '--' }}</span></el-form-item>
            <el-form-item label="检查时间范围" required><el-date-picker v-model="form.dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="检查开始日期" end-placeholder="检查结束日期"/><span class="sampling-hint">按本单所属项目的登记日期取单，含起止日；必须覆盖本单登记日期 {{ registrationDay(row) }}。</span></el-form-item>
            <el-form-item label="抽检比例" required><el-input-number v-model="form.percent" :min="1" :max="100" :precision="0"/> <span style="margin-left:8px">%</span></el-form-item>
            <el-form-item label="抽检人" required><el-select v-model="form.assigneeId" filterable placeholder="请选择一名抽检人" style="width:100%"><el-option v-for="person in assignees" :key="person.id" :label="person.label" :value="person.id"/></el-select></el-form-item>
            <el-alert v-if="dispatchPreview" :type="dispatchPreview.error ? 'warning' : 'info'" :closable="false" :title="dispatchPreview.error || `范围内共${dispatchPreview.pool.length}张，实际下发${dispatchPreview.count}张；本单必含，其余随机抽取。`"/>
          </template>
        </template>
      </el-form>
      </el-config-provider>
      <template #footer><el-button @click="editorVisible=false">取消</el-button><el-button type="primary" :disabled="uploading > 0" :loading="submitting" @click="submit">{{ role === 'hq' && form.result === '不合格' && form.dispatch === true ? '保存并下发' : role === 'supervisor' && form.result === '不合格' && !existingFollow ? '保存并下发全面复查' : '保存' }}</el-button></template>
    </el-dialog>

    <el-dialog v-model="detailsVisible" title="抽查记录详情" width="650px" :z-index="coc ? 220000 : undefined" append-to-body destroy-on-close>
      <template v-if="currentDetails">
        <div v-for="stage in currentDetails.stages" :key="stage.stage" class="sampling-stage-detail">
          <h4>{{ stage.name }}</h4>
          <p v-if="stage.restricted" class="sampling-hint">当前身份不展示该阶段的检查结论与资料。</p>
          <template v-else>
            <template v-if="!currentDetails.logs.some(log => log.stage === stage.stage)">
              <p class="sampling-hint">{{ stage.status }} · 办结日期：{{ formatTime(stage.time) }}</p>
              <p v-if="stage.status === '批次发起'" class="sampling-hint">该单据随批次纳入检查范围，未单独记录指挥部合格或不合格结论。</p>
            </template>
            <div v-for="log in currentDetails.logs.filter(item => item.stage === stage.stage)" :key="log.id" class="sampling-stage-log">
              <p>{{ log.person }} · {{ stage.stage === 'manager' ? '已复查' : log.result }}</p>
              <p>办结日期：{{ formatTime(log.time) }}</p>
              <p>说明：{{ log.note || '--' }}</p>
              <p v-if="log.reviewRecipient">全面复查下发至：{{ log.reviewRecipient }}</p>
              <div v-if="log.files?.length"><el-button v-for="file in log.files" :key="file.id || file.name" link type="primary" @click="downloadSamplingAttachment(file).catch(error => ElMessage.error(error.message))">{{ file.name }}</el-button></div>
              <p v-if="role === 'hq' && log.pendingReason">历史任务未生成：{{ log.pendingReason }}</p>
              <p v-if="role === 'hq' && log.stage === 'hq' && typeof log.dispatch === 'boolean'">是否下发任务：{{ log.dispatch ? '是' : '否' }}</p>
            </div>
          </template>
        </div>
      </template>
      <template #footer><el-button @click="detailsVisible=false">关闭</el-button></template>
    </el-dialog>
  </section>
  <el-alert v-else-if="taskContext" title="当前身份无权办理该任务，或该单据不在任务范围内" type="warning" :closable="false" />
</template>

<style scoped>
.sampling-panel { margin:20px 0; padding:18px; background:#fff; border:1px solid #e5e9ef; border-radius:8px; }
.sampling-panel-head { display:flex; justify-content:space-between; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:16px; }
.sampling-panel-actions { display:flex; align-items:center; gap:12px; }
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

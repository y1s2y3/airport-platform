<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose, Promotion, Setting } from '@element-plus/icons-vue'
import { TASK_WORK_SOURCES, buildProjects } from '../mock/data.js'
import {
  getDispatchNoticeRecords,
  saveDispatchNoticeRecord,
  voidDispatchNoticeRecord,
  issueDispatchNoticeRecord,
  emptyNoticeRecord,
  normalizeNoticeRecord,
  TASK_STATUSES,
} from '../utils/dispatchMeetingStorage.js'
import {
  taskExecutors,
  taskStatusTag,
  TASK_EXECUTION_MODES,
  TASK_EXECUTION_MODE_OPTIONS,
} from '../utils/dispatchTaskWorkflow.js'
import { dispatchTaskUserOptions } from '../utils/dispatchTaskIdentity.js'
import {
  taskWorkTypes,
  taskWorkTypeOptions,
  saveTaskWorkTypes,
  DEFAULT_TASK_WORK_TYPES,
} from '../config/screenshotTaskOrderFields.js'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import DispatchImageAttachments from '../components/DispatchImageAttachments.vue'
import DispatchTaskDetailPanels from '../components/DispatchTaskDetailPanels.vue'

defineProps({
  title: { type: String, default: '任务单' },
  description: {
    type: String,
    default: '管理远程调度产生的任务单：创建、下发与闭环台账，支持从截图/会议一键生成。',
  },
})

const { isHqSelected, headerProjectLabel } = useCurrentProject()
const readonly = computed(() => !isHqSelected.value)
const scopeProjectName = computed(() => (isHqSelected.value ? '' : headerProjectLabel.value || ''))

const keyword = ref('')
const router = useRouter()
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref('create')
const current = ref(null)
const form = ref(emptyNoticeRecord())
const workTypeConfigVisible = ref(false)
const workTypeDraft = ref([...taskWorkTypes.value])
const workTypeConfigError = ref('')

const projectOptions = buildProjects().map((p) => p.shortName || p.name)
const executorOptions = computed(() => {
  const options = dispatchTaskUserOptions()
  const known = new Set(options.map(item => item.value))
  return [...options, ...(form.value.executors || []).filter(value => !known.has(value)).map(value => ({ value, label: value }))]
})

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) rows = rows.filter((r) => r.status === statusFilter.value)
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((r) =>
    [
      r.id,
      r.project,
      r.workType,
      r.workRequirement,
      r.workSource,
      r.executor,
      r.executeDept,
      r.remark,
    ].some((f) => String(f || '').includes(q)),
  )
})

function load() {
  const scope = scopeProjectName.value
  const all = getDispatchNoticeRecords()
  list.value = scope
    ? all.filter((row) => {
        const project = String(row.project || '').trim()
        return project === scope || project.includes(scope) || scope.includes(project)
      })
    : all
  if (current.value) current.value = list.value.find(row => row.id === current.value.id) || null
}

function openTaskTodo() {
  router.push({ path: '/workbench', query: { tab: 'todo', focus: 'dispatch-task' } })
}

function openDetail(row) {
  current.value = { ...row }
  detailVisible.value = true
}

function handleIssue(row) {
  if (row.status !== TASK_STATUSES.PENDING) return
  const label = (row.workRequirement || row.title || row.id).slice(0, 24)
  ElMessageBox.confirm(`确定下发任务单「${label}」至执行人？`, '确认下发', { type: 'info' })
    .then(() => {
      issueDispatchNoticeRecord(row.id)
      load()
      ElMessage.success('任务单已下发')
    })
    .catch(() => {})
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyNoticeRecord()
  formVisible.value = true
}

function openEdit(row) {
  if (row.status === TASK_STATUSES.VOID) {
    ElMessage.warning('已作废的任务单不可编辑')
    return
  }
  if (row.status !== TASK_STATUSES.PENDING) {
    ElMessage.warning('仅待下发状态的任务单可编辑')
    return
  }
  formMode.value = 'edit'
  const normalized = normalizeNoticeRecord({ ...row })
  form.value = {
    ...normalized,
    executors: taskExecutors(normalized),
  }
  formVisible.value = true
}

function validateForm() {
  if (!form.value.project?.trim()) {
    ElMessage.warning('请填写项目名称')
    return false
  }
  if (!form.value.workType?.trim()) {
    ElMessage.warning('请选择工作类型')
    return false
  }
  if (!form.value.workRequirement?.trim()) {
    ElMessage.warning('请填写工作要求')
    return false
  }
  if (!form.value.workSource?.trim()) {
    ElMessage.warning('请选择工作来源')
    return false
  }
  if (!form.value.executors?.length) {
    ElMessage.warning('请选择执行人')
    return false
  }
  if (!TASK_EXECUTION_MODE_OPTIONS.includes(form.value.executionMode)) {
    ElMessage.warning('请选择执行模式')
    return false
  }
  if (!form.value.deadline) {
    ElMessage.warning('请选择完成时限')
    return false
  }
  return true
}

const executionModeOptions = TASK_EXECUTION_MODE_OPTIONS

function submitForm(issueNow = false) {
  if (!validateForm()) return
  const payload = {
    ...form.value,
    executors: [...form.value.executors],
    executor: form.value.executors.join('、'),
    executeDept: form.value.executors.join('、'),
  }
  if (formMode.value === 'create') {
    payload.status = TASK_STATUSES.PENDING
    payload.issueTime = '--'
  }
  const record = saveDispatchNoticeRecord(payload)
  if (issueNow && record?.id) issueDispatchNoticeRecord(record.id)
  load()
  formVisible.value = false
  ElMessage.success(issueNow
    ? `任务单已保存并直接下发（编号 ${record?.id || '--'}）`
    : `任务单已保存（编号 ${record?.id || '--'}），可在列表中点击下发操作`)
}

function handleVoid(row) {
  if (row.status !== TASK_STATUSES.PENDING) {
    ElMessage.warning('仅待下发状态的任务单可作废')
    return
  }
  const label = row.workRequirement || row.title || row.id
  ElMessageBox.confirm(`确定作废任务单「${label.slice(0, 24)}」？`, '作废确认', { type: 'warning' })
    .then(() => {
      voidDispatchNoticeRecord(row.id)
      load()
      ElMessage.success('任务单已作废')
    })
    .catch(() => {})
}

function onStorage(event) {
  if (event.key === 'coc-admin-dispatch-notices' || event.key === null) load()
}

/* ---------------- 配置工作类型（仅指挥部） ---------------- */
function openWorkTypeConfig() {
  workTypeConfigError.value = ''
  workTypeDraft.value = [...taskWorkTypes.value]
  workTypeConfigVisible.value = true
}

function addWorkTypeRow() {
  workTypeDraft.value.push('')
}

function removeWorkTypeRow(index) {
  workTypeDraft.value.splice(index, 1)
}

function applyWorkTypeConfig() {
  const rows = workTypeDraft.value.map((item) => String(item ?? '').trim())
  if (rows.some((item) => !item)) {
    workTypeConfigError.value = '工作类型不能为空，请填写或删除空行'
    return
  }
  const unique = new Set(rows)
  if (unique.size !== rows.length) {
    workTypeConfigError.value = '工作类型不可重复'
    return
  }
  saveTaskWorkTypes(rows)
  workTypeConfigVisible.value = false
  ElMessage.success('工作类型已保存，任务单/截图/处罚单下拉即时生效')
}

function resetWorkTypeConfig() {
  workTypeDraft.value = [...DEFAULT_TASK_WORK_TYPES]
  workTypeConfigError.value = ''
}

watch(scopeProjectName, load)

onMounted(() => { load(); window.addEventListener('coc-dispatch-meeting-change', load); window.addEventListener('storage', onStorage) })
onBeforeUnmount(() => { window.removeEventListener('coc-dispatch-meeting-change', load); window.removeEventListener('storage', onStorage) })
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <div class="dispatch-task-title">
        <span>{{ title }}</span>
        <span class="dispatch-task-prototype-hint">
          原型提示：处理页面进入【工作台】-【我的待办】查看，
          <el-button link type="primary" @click="openTaskTodo">快速入口</el-button>
        </span>
      </div>
      <div class="title-actions">
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px" aria-label="状态">
          <el-option v-for="status in TASK_STATUSES" :key="status" :label="status" :value="status" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索项目名称、工作要求、执行人…" clearable class="search-input" aria-label="搜索项目名称、工作要求、执行人…"/>
        <el-button v-if="!readonly" :icon="Setting" @click="openWorkTypeConfig">配置工作类型</el-button>
        <el-button v-if="!readonly" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <p v-if="readonly" class="page-desc readonly-hint">
        项目层级仅查看本项目任务单（{{ scopeProjectName || '当前项目' }}），创建、下发、编辑与作废由指挥部处理。
      </p>
      <el-table :data="filtered" stripe border empty-text="暂无任务单记录">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="project" label="项目名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="workType" label="工作类型" width="96" />
        <el-table-column prop="workRequirement" label="工作要求" min-width="180" show-overflow-tooltip />
        <el-table-column label="执行人" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ taskExecutors(row).join('、') || '--' }}
          </template>
        </el-table-column>
        <el-table-column label="执行模式" width="104">
          <template #default="{ row }">
            {{ row.executionMode || TASK_EXECUTION_MODES.SINGLE }}
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="完成时限" width="108" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="88">
          <template #default="{ row }">
            <el-tag :type="taskStatusTag(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" :width="readonly ? 88 : 220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <template v-if="!readonly">
            <el-button
              v-if="row.status === TASK_STATUSES.PENDING"
              link
              type="success"
              :icon="Promotion"
              @click="handleIssue(row)"
            >
              确认下发
            </el-button>
            <el-button
              v-if="row.status === TASK_STATUSES.PENDING"
              link
              type="primary"
              :icon="Edit"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === TASK_STATUSES.PENDING"
              link
              type="danger"
              :icon="CircleClose"
              @click="handleVoid(row)"
            >
              作废
            </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增任务单' : '编辑任务单'" width="640px" class="dispatch-task-dialog dispatch-task-dialog-form" align-center destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="项目名称" required>
          <el-select
            v-model="form.project"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入项目名称"
            style="width: 100%" aria-label="选择或输入项目名称">
            <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="工作类型" required>
          <el-select
            v-model="form.workType"
            filterable
            placeholder="请选择工作类型（取自工作类型配置）"
            style="width: 100%" aria-label="选择工作类型">
            <el-option v-for="item in taskWorkTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="工作要求" required>
          <el-input
            v-model="form.workRequirement"
            type="textarea"
            :rows="4"
            placeholder="请描述工作要求，将作为任务单正文" aria-label="请描述工作要求，将作为任务单正文"/>
        </el-form-item>
        <el-form-item label="工作来源" required>
          <el-select v-model="form.workSource" placeholder="选择工作来源" style="width: 100%" aria-label="选择工作来源">
            <el-option v-for="item in TASK_WORK_SOURCES" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="执行人" required>
          <el-select
            v-model="form.executors"
            multiple
            filterable
            default-first-option
            placeholder="选择执行人（可多选）"
            style="width: 100%" aria-label="选择执行人">
            <el-option
              v-for="item in executorOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="执行模式" required>
          <el-radio-group v-model="form.executionMode" aria-label="执行模式">
            <el-radio v-for="mode in executionModeOptions" :key="mode" :value="mode">{{ mode }}</el-radio>
          </el-radio-group>
          <div class="execution-mode-hint">
            单人执行：任一执行人办结即关闭任务单；多人并行：全部执行人办结后才关闭。
          </div>
        </el-form-item>
        <el-form-item label="完成时限" required>
          <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" aria-label="选填"/>
        </el-form-item>
        <el-form-item label="附件">
          <DispatchImageAttachments v-model="form.attachments" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button @click="submitForm(false)">保存</el-button>
        <el-button type="primary" @click="submitForm(true)">直接下发</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="workTypeConfigVisible" title="配置工作类型" width="520px" class="dispatch-task-dialog work-type-config-dialog" align-center destroy-on-close>
      <p class="work-type-config-tip">
        工作类型全平台一份，指挥部统一维护；保存后任务单、截图登记、处罚单的下拉即时生效。删除工作类型不会修改历史单据上的原值。
      </p>
      <div class="work-type-config-list">
        <div v-for="(item, index) in workTypeDraft" :key="index" class="work-type-config-row">
          <span class="work-type-config-index">{{ index + 1 }}</span>
          <el-input v-model="workTypeDraft[index]" maxlength="20" placeholder="请输入工作类型" aria-label="工作类型" />
          <el-button link type="danger" :disabled="workTypeDraft.length <= 1" @click="removeWorkTypeRow(index)">删除</el-button>
        </div>
        <el-empty v-if="!workTypeDraft.length" description="暂无工作类型，请新增一条" :image-size="60" />
      </div>
      <p v-if="workTypeConfigError" class="work-type-config-error">{{ workTypeConfigError }}</p>
      <template #footer>
        <div class="work-type-config-footer">
          <div>
            <el-button link type="primary" @click="addWorkTypeRow">+ 新增一条</el-button>
            <el-button link @click="resetWorkTypeConfig">恢复默认</el-button>
          </div>
          <div>
            <el-button @click="workTypeConfigVisible = false">取消</el-button>
            <el-button type="primary" @click="applyWorkTypeConfig">保存</el-button>
          </div>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="任务单详情" width="1000px" class="dispatch-task-dialog dispatch-task-dialog-detail" align-center destroy-on-close>
      <DispatchTaskDetailPanels v-if="current" :record="current" />
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 120px);
}

.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid #e6a23c;
  padding-left: 12px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.dispatch-task-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-width: 0;
}

.dispatch-task-prototype-hint {
  font-size: 12px;
  font-weight: 400;
  line-height: 1.8;
  color: var(--el-text-color-secondary, #909399);
}

.dispatch-task-prototype-hint .el-button {
  padding: 0;
  font-size: inherit;
  vertical-align: baseline;
}

.search-input {
  width: 240px;
}

.page-body {
  padding: 16px 20px 24px !important;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
}

.detail-empty-text {
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}

.work-type-tags {
  display: inline-flex;
  gap: 8px;
  --work-type-color: var(--coc-accent, var(--ap-primary, var(--el-color-primary)));
}

.work-type-tags :deep(.el-radio-button__inner) {
  height: 32px;
  padding: 0 16px;
  border-radius: 999px !important;
  border: 1px solid var(--coc-border, var(--el-border-color, #dcdfe6)) !important;
  background: transparent;
  box-shadow: none;
  color: var(--coc-text-secondary, var(--ap-text-secondary, #606266));
  font-weight: 500;
  transition: color 0.2s ease, border-color 0.2s ease;
}

.work-type-tags :deep(.el-radio-button:first-child .el-radio-button__inner),
.work-type-tags :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 999px !important;
}

.work-type-tags :deep(.el-radio-button__inner:hover) {
  color: var(--work-type-color);
  border-color: var(--work-type-color) !important;
}

.work-type-tags :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  background: transparent;
  border-color: var(--work-type-color) !important;
  color: var(--work-type-color);
  box-shadow: none;
  font-weight: 600;
}

.readonly-hint {
  color: #e6a23c;
}

.execution-mode-hint {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary, #909399);
}

.work-type-config-tip {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-secondary, #909399);
}

.work-type-config-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.work-type-config-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.work-type-config-index {
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary, #909399);
}

.work-type-config-error {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--el-color-danger);
}

.work-type-config-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>

<style>
.dispatch-task-dialog.el-dialog { display: flex; flex-direction: column; max-width: calc(100vw - 40px); max-height: min(800px, calc(100dvh - 48px)); padding: 0; margin: auto; overflow: hidden; }
.dispatch-task-dialog.el-dialog > .el-dialog__header { flex: 0 0 auto; margin: 0; padding: 20px 24px; border-bottom: 1px solid var(--ap-border); }
.dispatch-task-dialog.el-dialog > .el-dialog__header .el-dialog__headerbtn { top: 12px; right: 12px; }
.dispatch-task-dialog.el-dialog > .el-dialog__body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 24px; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #c9ced7 transparent; }
.dispatch-task-dialog.el-dialog > .el-dialog__body::-webkit-scrollbar { width: 6px; }
.dispatch-task-dialog.el-dialog > .el-dialog__body::-webkit-scrollbar-thumb { border-radius: 6px; background: #c9ced7; }
.dispatch-task-dialog.el-dialog > .el-dialog__body::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
.dispatch-task-dialog.el-dialog > .el-dialog__footer { flex: 0 0 auto; border-top: 1px solid var(--ap-border); padding: 16px 24px; }
@media (max-width: 640px) { .dispatch-task-dialog.el-dialog { max-width: calc(100vw - 24px); max-height: calc(100dvh - 24px); } .dispatch-task-dialog.el-dialog > .el-dialog__body { padding: 20px 16px; } }
</style>

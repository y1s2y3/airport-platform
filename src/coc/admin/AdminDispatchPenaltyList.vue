<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose, Upload, Promotion, Download } from '@element-plus/icons-vue'
import {
  buildProjects,
} from '../mock/data.js'
import {
  getDispatchPenaltyRecords,
  saveDispatchPenaltyRecord,
  closeDispatchPenaltyRecord,
  issueDispatchPenaltyRecord,
  markPenaltyBlackBoardSync,
  emptyPenaltyRecord,
  normalizePenaltyRecord,
  PENALTY_STATUSES,
} from '../utils/dispatchMeetingStorage.js'
import {
  importPenaltyToBlackBoard,
  formatRedBlackPeriod,
  getCurrentRedBlackPeriodKey,
  parseRedBlackPeriod,
  buildRedBlackPeriodKey,
} from '../utils/redBlackBoardStorage.js'
import DispatchImageAttachments from '../components/DispatchImageAttachments.vue'
import PenaltyDetailPanels from '../components/PenaltyDetailPanels.vue'
import { buildExecutorOptions, resolveExecutorDisplay } from '../utils/executorDisplay.js'
import { TASK_WORK_TYPES } from '../config/screenshotTaskOrderFields.js'

defineProps({
  title: { type: String, default: '处罚单' },
  description: {
    type: String,
    default: '管理处罚单：新增、下发、编辑、关闭与纳入黑榜；接收人上报/申诉/验收在个人中心待办处理。',
  },
})

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const formVisible = ref(false)
const blackBoardVisible = ref(false)
const formMode = ref('create')
const current = ref(null)
const blackBoardTarget = ref(null)
const blackBoardPeriodYear = ref(new Date().getFullYear())
const blackBoardPeriodNo = ref(new Date().getMonth() + 1)
const form = ref(emptyPenaltyRecord())

const projectOptions = buildProjects().map((p) => p.shortName || p.name)
const assigneeOptions = buildExecutorOptions()

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) rows = rows.filter((r) => r.status === statusFilter.value)
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((r) =>
    [r.id, r.project, r.workType, r.penaltyContent, r.assignee, r.executor, r.deadline, r.penaltyClause, r.amount]
      .some((f) => String(f || '').includes(q)),
  )
})

function displayValue(value) {
  return value?.trim?.() ? value : '—'
}

function penaltyLabel(row) {
  return row?.title || row?.penaltyContent || row?.id || '处罚单'
}

function load() {
  list.value = getDispatchPenaltyRecords()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyPenaltyRecord()
  formVisible.value = true
}

function openEdit(row) {
  if (row.status === PENALTY_STATUSES.CLOSED) {
    ElMessage.warning('已关闭的处罚单不可编辑')
    return
  }
  if (row.status === PENALTY_STATUSES.APPEALING) {
    ElMessage.warning('申诉中的处罚单不可编辑')
    return
  }
  if (row.status !== PENALTY_STATUSES.PENDING) {
    ElMessage.warning('仅待下发状态的处罚单可编辑')
    return
  }
  formMode.value = 'edit'
  form.value = normalizePenaltyRecord({ ...row })
  formVisible.value = true
}

function validateForm() {
  if (!form.value.project?.trim()) {
    ElMessage.warning('请填写项目名称')
    return false
  }
  if (!form.value.workType?.trim()) {
    ElMessage.warning('请选择类型')
    return false
  }
  if (!form.value.penaltyContent?.trim()) {
    ElMessage.warning('请填写处罚内容')
    return false
  }
  if (!form.value.assignee?.trim()) {
    ElMessage.warning('请填写指派人')
    return false
  }
  if (!form.value.deadline) {
    ElMessage.warning('请选择完成时限')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  const assignee = form.value.assignee.trim()
  const payload = {
    ...form.value,
    project: form.value.project.trim(),
    workType: form.value.workType.trim(),
    penaltyReason: form.value.workType.trim(),
    penaltyContent: form.value.penaltyContent.trim(),
    assignee,
    executor: assignee,
  }
  if (formMode.value === 'create') {
    payload.status = PENALTY_STATUSES.PENDING
    payload.issueTime = '—'
  }
  saveDispatchPenaltyRecord(payload)
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '处罚单已创建，待指挥部下发' : '处罚单已更新')
}

function handleClose(row) {
  if (row.status !== PENALTY_STATUSES.PENDING) {
    ElMessage.warning('仅待下发状态的处罚单可关闭')
    return
  }
  ElMessageBox.confirm(`确定关闭处罚单「${penaltyLabel(row)}」？`, '关闭确认', { type: 'warning' })
    .then(() => {
      closeDispatchPenaltyRecord(row.id)
      load()
      ElMessage.success('处罚单已关闭')
    })
    .catch(() => {})
}

function handleIssue(row) {
  if (row.status !== PENALTY_STATUSES.PENDING) return
  ElMessageBox.confirm(`确定下发处罚单「${penaltyLabel(row)}」？`, '下发确认', { type: 'info' })
    .then(() => {
      issueDispatchPenaltyRecord(row.id)
      load()
      ElMessage.success('处罚单已下发，状态更新为处理中')
    })
    .catch(() => {})
}

function handleExport(row) {
  ElMessage.success(`已按模板导出处罚单「${penaltyLabel(row)}」`)
}

function canBlackBoard(row) {
  return (
    row.status !== PENALTY_STATUSES.CLOSED &&
    row.status !== PENALTY_STATUSES.PENDING &&
    row.status !== PENALTY_STATUSES.APPEALING
  )
}

function openBlackBoard(row) {
  if (row.status === PENALTY_STATUSES.CLOSED) {
    ElMessage.warning('已关闭的处罚单不可纳入黑榜')
    return
  }
  if (row.status === PENALTY_STATUSES.PENDING) {
    ElMessage.warning('请先下发处罚单后再纳入黑榜')
    return
  }
  if (row.status === PENALTY_STATUSES.APPEALING) {
    ElMessage.warning('申诉中的处罚单暂不可纳入黑榜')
    return
  }
  blackBoardTarget.value = row
  const parsed = parseRedBlackPeriod(row.blackBoardMonth || getCurrentRedBlackPeriodKey())
  blackBoardPeriodYear.value = Number(parsed.year) || new Date().getFullYear()
  blackBoardPeriodNo.value = parsed.periodNo || new Date().getMonth() + 1
  blackBoardVisible.value = true
}

function confirmBlackBoard() {
  if (!blackBoardTarget.value || !blackBoardPeriodYear.value || !blackBoardPeriodNo.value) {
    ElMessage.warning('请填写纳入期数')
    return
  }
  const period = buildRedBlackPeriodKey(blackBoardPeriodYear.value, blackBoardPeriodNo.value)
  const record = importPenaltyToBlackBoard(blackBoardTarget.value, period)
  markPenaltyBlackBoardSync(blackBoardTarget.value.id, period, record.id)
  load()
  blackBoardVisible.value = false
  ElMessage.success(`已纳入 ${formatRedBlackPeriod(period)} 黑榜`)
}

function statusTagType(status) {
  if (status === PENALTY_STATUSES.CLOSED) return 'info'
  if (status === PENALTY_STATUSES.PROCESSING) return 'warning'
  if (status === PENALTY_STATUSES.PENDING) return 'warning'
  if (status === PENALTY_STATUSES.APPEALING) return 'warning'
  if (status === PENALTY_STATUSES.PENDING_ACCEPTANCE) return 'success'
  return 'info'
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px" aria-label="状态">
          <el-option label="待下发" :value="PENALTY_STATUSES.PENDING" />
          <el-option label="处理中" :value="PENALTY_STATUSES.PROCESSING" />
          <el-option label="待验收" :value="PENALTY_STATUSES.PENDING_ACCEPTANCE" />
          <el-option label="申诉中" :value="PENALTY_STATUSES.APPEALING" />
          <el-option label="已关闭" :value="PENALTY_STATUSES.CLOSED" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索编号、项目、处罚内容…" clearable class="search-input" aria-label="搜索编号、项目、处罚内容…"/>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无处罚单记录">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="id" label="编号" width="148" show-overflow-tooltip />
        <el-table-column prop="project" label="项目名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="workType" label="类型" width="96" />
        <el-table-column prop="penaltyContent" label="处罚内容" min-width="180" show-overflow-tooltip />
        <el-table-column label="指派人" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ resolveExecutorDisplay(row.assignee || row.executor) }}
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="完成时限" width="108" />
        <el-table-column label="条款" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ displayValue(row.penaltyClause) }}</template>
        </el-table-column>
        <el-table-column label="金额" width="96">
          <template #default="{ row }">{{ displayValue(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="88">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="黑榜" width="108">
          <template #default="{ row }">
            <el-tag v-if="row.blackBoardSynced" type="info" size="small">
              {{ formatRedBlackPeriod(row.blackBoardMonth) }}
            </el-tag>
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" :icon="Download" @click="handleExport(row)">导出处罚单</el-button>
            <el-button
              v-if="row.status === PENALTY_STATUSES.PENDING"
              link
              type="success"
              :icon="Promotion"
              @click="handleIssue(row)"
            >
              下发
            </el-button>
            <el-button
              v-if="row.status === PENALTY_STATUSES.PENDING"
              link
              type="primary"
              :icon="Edit"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="canBlackBoard(row)"
              link
              type="warning"
              :icon="Upload"
              @click="openBlackBoard(row)"
            >
              纳入黑榜
            </el-button>
            <el-button
              v-if="row.status === PENALTY_STATUSES.PENDING"
              link
              type="danger"
              :icon="CircleClose"
              @click="handleClose(row)"
            >
              关闭
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增处罚单' : '编辑处罚单'" width="640px" destroy-on-close>
      <p v-if="formMode === 'create'" class="dialog-tip">以下字段由指挥部填报；条款与金额由接收人在处理阶段填报。</p>
      <el-form label-width="108px">
        <el-form-item v-if="formMode === 'edit' && form.id" label="编号">
          <el-input :model-value="form.id" disabled />
        </el-form-item>
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
        <el-form-item label="类型" required>
          <el-radio-group v-model="form.workType" class="work-type-tags">
            <el-radio-button v-for="item in TASK_WORK_TYPES" :key="item" :value="item">{{ item }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处罚内容" required>
          <el-input
            v-model="form.penaltyContent"
            type="textarea"
            :rows="4"
            placeholder="请描述处罚内容，将作为处罚单正文" aria-label="请描述处罚内容，将作为处罚单正文"/>
        </el-form-item>
        <el-form-item label="指派人" required>
          <el-select
            v-model="form.assignee"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入指派人"
            style="width: 100%" aria-label="选择或输入指派人">
            <el-option
              v-for="item in assigneeOptions"
              :key="item.value"
              :label="item.value"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="完成时限" required>
          <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="处罚单补充附件">
          <DispatchImageAttachments v-model="form.attachments" name-prefix="处罚单补充附件" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="blackBoardVisible" title="纳入黑榜" width="480px" destroy-on-close>
      <p class="dialog-tip">
        将处罚单「{{ penaltyLabel(blackBoardTarget) }}」同步至黑红榜单，请选择纳入期数。
      </p>
      <el-form label-width="96px">
        <el-form-item label="纳入期数" required>
          <div class="period-input-row">
            <el-input-number v-model="blackBoardPeriodYear" :min="2020" :max="2035" controls-position="right" />
            <span class="period-unit">年 第</span>
            <el-input-number v-model="blackBoardPeriodNo" :min="1" :max="52" controls-position="right" />
            <span class="period-unit">期</span>
          </div>
        </el-form-item>
        <el-form-item label="同步说明">
          <div class="sync-preview">
            <div>项目：{{ blackBoardTarget?.project || '—' }}</div>
            <div>类型：{{ blackBoardTarget?.workType || '—' }}</div>
            <div>处罚内容：{{ blackBoardTarget?.penaltyContent || '—' }}</div>
            <div>金额：{{ displayValue(blackBoardTarget?.amount) }}</div>
            <div v-if="blackBoardTarget?.snapshot">将携带关联图片作为黑榜图片</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blackBoardVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBlackBoard">确认纳入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="处罚单详情" width="780px" destroy-on-close>
      <PenaltyDetailPanels v-if="current" :record="current" compact />
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
  border-left: 4px solid #f56c6c;
  padding-left: 12px;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
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

.muted {
  color: var(--coc-text-muted);
  font-size: 12px;
}

.dialog-tip {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--coc-text-secondary);
  line-height: 1.6;
}

.sync-preview {
  font-size: 13px;
  line-height: 1.7;
  color: var(--coc-text-secondary);
  padding: 10px 12px;
  background: #faf8f6;
  border-radius: 8px;
  border: 1px solid var(--coc-border);
}

.period-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.period-unit {
  font-size: 13px;
  color: var(--coc-text-secondary);
}

.attachment-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.attachment-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--coc-text-secondary);
  border-bottom: 1px dashed var(--coc-border);
}

.attachment-list li:last-child {
  border-bottom: none;
}

.attachment-empty {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--coc-text-muted);
}

.attachment-item {
  font-size: 13px;
  line-height: 1.8;
  color: var(--coc-text-secondary);
}

.report-attach {
  width: 100%;
}

.report-image-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.report-image-item {
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  overflow: hidden;
  background: #faf8f6;
}

.report-thumb {
  width: 100%;
  height: 96px;
  object-fit: cover;
  display: block;
  background: #1a1a1a;
}

.report-image-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 6px 8px;
}

.report-image-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--coc-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>

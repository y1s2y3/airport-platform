<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { projectList } from '../../mock/projectBasicInfo.js'
import { filterPenaltyRecords, penaltyResponsibleUnit, penaltyTemplateKey } from '../utils/penaltyLedger.js'
import { PENALTY_TEMPLATE_URLS } from '../config/penaltyDocuments.js'
import { downloadPenaltyDocx } from '../utils/penaltyDocx.js'
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
import PersonalCenterReadonlyHint from '../../components/PersonalCenterReadonlyHint.vue'
import { buildExecutorOptions, resolveExecutorDisplay } from '../utils/executorDisplay.js'
import { taskWorkTypeOptions } from '../config/screenshotTaskOrderFields.js'

defineProps({
  title: { type: String, default: '处罚单' },
  description: {
    type: String,
    default: '管理处罚单：新增、下发、编辑、关闭与纳入黑榜；接收人上报/申诉/验收在个人中心待办处理。',
  },
})

const keyword = ref('')
const statusFilter = ref('')
const unitFilter = ref('')
const appliedFilters = ref({ keyword: '', status: '', unit: '' })
const currentPage = ref(1)
const pageSize = ref(10)
const exportingId = ref('')
const list = ref([])
const detailVisible = ref(false)
const formVisible = ref(false)
const blackBoardVisible = ref(false)
const formMode = ref('create')
const current = ref(null)
const blackBoardTarget = ref(null)

const RECIPIENT_HANDLE_STATUSES = new Set([
  PENALTY_STATUSES.PROCESSING,
  PENALTY_STATUSES.PENDING_ACCEPTANCE,
  PENALTY_STATUSES.APPEALING,
])

const showDetailPersonalCenterHint = computed(
  () => current.value && RECIPIENT_HANDLE_STATUSES.has(current.value.status),
)

const blackBoardPeriodYear = ref(new Date().getFullYear())
const blackBoardPeriodNo = ref(new Date().getMonth() + 1)
const form = ref(emptyPenaltyRecord())

const projectOptions = buildProjects().map((p) => p.shortName || p.name)
const assigneeOptions = buildExecutorOptions()

const filtered = computed(() => filterPenaltyRecords(list.value, appliedFilters.value, projectList))
const pagedRecords = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
const responsibleUnit = row => penaltyResponsibleUnit(row, projectList)

function searchRecords() {
  appliedFilters.value = { keyword: keyword.value, status: statusFilter.value, unit: unitFilter.value }
  currentPage.value = 1
}

function resetFilters() {
  keyword.value = ''
  statusFilter.value = ''
  unitFilter.value = ''
  pageSize.value = 10
  searchRecords()
}

function indexMethod(index) {
  return (currentPage.value - 1) * pageSize.value + index + 1
}

watch(pageSize, () => { currentPage.value = 1 })
watch(() => filtered.value.length, total => {
  currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(total / pageSize.value)))
})

function displayValue(value) {
  return value?.trim?.() ? value : '--'
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

function submitForm(issueNow = false) {
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
    payload.issueTime = '--'
  }
  const record = saveDispatchPenaltyRecord(payload)
  if (issueNow && record?.id) issueDispatchPenaltyRecord(record.id)
  load()
  formVisible.value = false
  ElMessage.success(issueNow
    ? `处罚单已保存并直接下发（编号 ${record?.id || '--'}）`
    : `处罚单已保存（编号 ${record?.id || '--'}），可在列表中点击下发操作`)
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

async function handleExport(row) {
  const templateKey = penaltyTemplateKey(row)
  if (!templateKey || exportingId.value) return
  exportingId.value = row.id
  try {
    await downloadPenaltyDocx(row, PENALTY_TEMPLATE_URLS[templateKey])
    ElMessage.success(`已导出处罚单「${row.id}」`)
  } catch (error) {
    ElMessage.error(/[\u4e00-\u9fff]/.test(error?.message || '') ? error.message : '处罚单导出失败，请重试')
  } finally {
    exportingId.value = ''
  }
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

onMounted(load)
</script>

<template>
  <section class="page-card penalty-ledger" :aria-label="title">
    <el-form class="penalty-filter-form" @submit.prevent="searchRecords">
      <el-form-item label="关键字" class="penalty-filter-item">
        <el-input v-model="keyword" placeholder="请输入编号、项目、事由" clearable aria-label="关键字" @keyup.enter="searchRecords" />
      </el-form-item>
      <el-form-item label="状态" class="penalty-filter-item">
        <el-select v-model="statusFilter" placeholder="请选择" clearable aria-label="状态">
          <el-option label="待下发" :value="PENALTY_STATUSES.PENDING" />
          <el-option label="处理中" :value="PENALTY_STATUSES.PROCESSING" />
          <el-option label="待验收" :value="PENALTY_STATUSES.PENDING_ACCEPTANCE" />
          <el-option label="申诉中" :value="PENALTY_STATUSES.APPEALING" />
          <el-option label="已关闭" :value="PENALTY_STATUSES.CLOSED" />
        </el-select>
      </el-form-item>
      <el-form-item label="责任单位" class="penalty-filter-item">
        <el-input v-model="unitFilter" placeholder="请输入" clearable aria-label="责任单位" @keyup.enter="searchRecords" />
      </el-form-item>
      <div class="penalty-filter-actions">
        <el-button type="primary" @click="searchRecords">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
    </el-form>
    <div class="penalty-list-toolbar">
      <div class="penalty-record-count">共 <strong>{{ filtered.length }}</strong> 条</div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
    </div>
      <el-table :data="pagedRecords" empty-text="暂无处罚单记录" class="penalty-table">
        <el-table-column type="index" label="序号" width="56" :index="indexMethod" />
        <el-table-column prop="id" label="编号" width="178" show-overflow-tooltip />
        <el-table-column prop="project" label="项目名称" min-width="240" show-overflow-tooltip />
        <el-table-column prop="workType" label="类型" width="76" />
        <el-table-column label="责任单位" min-width="176" show-overflow-tooltip>
          <template #default="{ row }">{{ responsibleUnit(row) || '--' }}</template>
        </el-table-column>
        <el-table-column prop="penaltyContent" label="事由" min-width="220" show-overflow-tooltip />
        <el-table-column label="指派人" min-width="136" show-overflow-tooltip>
          <template #default="{ row }">
            {{ resolveExecutorDisplay(row.assignee || row.executor) }}
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="完成时限" width="120" />
        <el-table-column label="条款" min-width="124" show-overflow-tooltip>
          <template #default="{ row }">{{ displayValue(row.penaltyClause) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="248" fixed="right">
          <template #default="{ row }">
            <div class="penalty-row-actions">
              <el-button link type="primary" class="penalty-action" @click="openDetail(row)">详情</el-button>
              <el-button v-if="row.status === PENALTY_STATUSES.PENDING" link type="primary" class="penalty-action" @click="openEdit(row)">编辑</el-button>
              <el-button v-if="row.status === PENALTY_STATUSES.PENDING" link type="success" class="penalty-action" @click="handleIssue(row)">下发</el-button>
              <el-button v-if="row.status === PENALTY_STATUSES.PENDING" link type="danger" class="penalty-action" @click="handleClose(row)">关闭</el-button>
              <el-button v-if="penaltyTemplateKey(row)" link type="primary" class="penalty-action" :loading="exportingId === row.id" :disabled="!!exportingId && exportingId !== row.id" @click="handleExport(row)">导出</el-button>
              <el-button v-if="canBlackBoard(row)" link type="warning" class="penalty-action" @click="openBlackBoard(row)">纳入黑榜</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="penalty-pagination">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50, 100]" :total="filtered.length" layout="total, sizes, prev, pager, next, jumper" />
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
          <el-select
            v-model="form.workType"
            filterable
            placeholder="请选择类型（取自工作类型配置）"
            style="width: 100%" aria-label="选择类型">
            <el-option v-for="item in taskWorkTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
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
        <el-button @click="submitForm(false)">保存</el-button>
        <el-button type="primary" @click="submitForm(true)">直接下发</el-button>
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
            <div>项目：{{ blackBoardTarget?.project || '--' }}</div>
            <div>类型：{{ blackBoardTarget?.workType || '--' }}</div>
            <div>处罚内容：{{ blackBoardTarget?.penaltyContent || '--' }}</div>
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
      <PersonalCenterReadonlyHint
        v-if="showDetailPersonalCenterHint"
        title="上报、申诉与验收请在「个人中心 → 我的待办」中处理；本页仅查看详情。"
      />
      <PenaltyDetailPanels v-if="current" :record="current" compact />
    </el-dialog>
  </section>
</template>

<style scoped>
.penalty-ledger {
  min-height: calc(100vh - 120px);
  padding: 24px;
}

.penalty-filter-form {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 4px 0 24px;
  border-bottom: 1px solid var(--ap-border);
}

.penalty-filter-item {
  flex: 1 1 220px;
  min-width: 220px;
  margin: 0;
}

.penalty-filter-actions {
  display: flex;
  gap: 12px;
}

.penalty-filter-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.penalty-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 16px;
}

.penalty-record-count {
  font-size: 16px;
  color: var(--ap-text);
}

.penalty-record-count strong {
  font-weight: 500;
  color: var(--ap-primary);
}

.penalty-table :deep(th.el-table__cell) {
  background: #eef0f3;
  color: var(--ap-text);
  font-weight: 500;
}

.penalty-table :deep(.el-table__cell) {
  padding: 14px 0;
}

.penalty-row-actions {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.penalty-row-actions .penalty-action {
  margin: 0;
  padding: 0;
}

.penalty-row-actions .penalty-action + .penalty-action {
  margin-left: 9px;
}

.penalty-row-actions .penalty-action + .penalty-action::before {
  content: '';
  height: 14px;
  border-left: 1px solid var(--ap-border);
  margin-right: 9px;
}

.penalty-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  overflow-x: auto;
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

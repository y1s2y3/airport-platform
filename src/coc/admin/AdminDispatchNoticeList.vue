<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose, Promotion } from '@element-plus/icons-vue'
import { TASK_WORK_SOURCES, TASK_WORK_TYPES, buildProjects } from '../mock/data.js'
import {
  getDispatchNoticeRecords,
  saveDispatchNoticeRecord,
  voidDispatchNoticeRecord,
  issueDispatchNoticeRecord,
  emptyNoticeRecord,
  normalizeNoticeRecord,
  NOTICE_STATUSES,
} from '../utils/dispatchMeetingStorage.js'
import { buildExecutorOptions, resolveExecutorDisplay } from '../utils/executorDisplay.js'
import DispatchImageAttachments from '../components/DispatchImageAttachments.vue'

defineProps({
  title: { type: String, default: '任务单' },
  description: {
    type: String,
    default: '管理远程调度产生的任务单：创建、下发与闭环台账，支持从截图/会议一键生成。',
  },
})

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref('create')
const current = ref(null)
const form = ref(emptyNoticeRecord())

const projectOptions = buildProjects().map((p) => p.shortName || p.name)
const executorOptions = buildExecutorOptions()

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
  list.value = getDispatchNoticeRecords()
}

function openDetail(row) {
  current.value = { ...row }
  detailVisible.value = true
}

function handleIssue(row) {
  if (row.status !== NOTICE_STATUSES.PENDING) return
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
  if (row.status === NOTICE_STATUSES.VOID) {
    ElMessage.warning('已作废的任务单不可编辑')
    return
  }
  if (row.status !== NOTICE_STATUSES.PENDING) {
    ElMessage.warning('仅待下发状态的任务单可编辑')
    return
  }
  formMode.value = 'edit'
  const normalized = normalizeNoticeRecord({ ...row })
  form.value = {
    ...normalized,
    executor: normalized.executor || resolveExecutorDisplay(normalized.executeDept),
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
  if (!form.value.executor?.trim()) {
    ElMessage.warning('请选择执行人')
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
  const payload = {
    ...form.value,
    executor: form.value.executor.trim(),
    executeDept: form.value.executor.trim(),
  }
  if (formMode.value === 'create') {
    payload.status = NOTICE_STATUSES.PENDING
    payload.issueTime = '—'
  }
  saveDispatchNoticeRecord(payload)
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '任务单已创建，待指挥部下发' : '任务单已更新')
}

function handleVoid(row) {
  if (row.status !== NOTICE_STATUSES.PENDING) {
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

function statusTagType(status) {
  if (status === NOTICE_STATUSES.VOID) return 'info'
  if (status === NOTICE_STATUSES.ISSUED || status === NOTICE_STATUSES.RECEIVED) return 'success'
  if (status === NOTICE_STATUSES.PENDING) return 'warning'
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
          <el-option label="待下发" :value="NOTICE_STATUSES.PENDING" />
          <el-option label="已下发" :value="NOTICE_STATUSES.ISSUED" />
          <el-option label="已接收" :value="NOTICE_STATUSES.RECEIVED" />
          <el-option label="已作废" :value="NOTICE_STATUSES.VOID" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索项目名称、工作要求、执行人…" clearable class="search-input" aria-label="搜索项目名称、工作要求、执行人…"/>
        <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无任务单记录">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="project" label="项目名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="workType" label="工作类型" width="96" />
        <el-table-column prop="workRequirement" label="工作要求" min-width="180" show-overflow-tooltip />
        <el-table-column label="执行人" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ resolveExecutorDisplay(row.executor || row.executeDept) }}
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="完成时限" width="108" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="88">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === NOTICE_STATUSES.PENDING"
              link
              type="success"
              :icon="Promotion"
              @click="handleIssue(row)"
            >
              确认下发
            </el-button>
            <el-button
              v-if="row.status === NOTICE_STATUSES.PENDING"
              link
              type="primary"
              :icon="Edit"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === NOTICE_STATUSES.PENDING"
              link
              type="danger"
              :icon="CircleClose"
              @click="handleVoid(row)"
            >
              作废
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增任务单' : '编辑任务单'" width="640px" destroy-on-close>
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
          <el-radio-group v-model="form.workType" class="work-type-tags">
            <el-radio-button v-for="item in TASK_WORK_TYPES" :key="item" :value="item">{{ item }}</el-radio-button>
          </el-radio-group>
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
            v-model="form.executor"
            filterable
            allow-create
            default-first-option
            placeholder="选择执行人"
            style="width: 100%" aria-label="选择执行人">
            <el-option
              v-for="item in executorOptions"
              :key="item.value"
              :label="item.value"
              :value="item.value"
            />
          </el-select>
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
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="任务单详情" width="720px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="2" border size="small" class="detail-desc">
          <el-descriptions-item label="编号">{{ current.id || '—' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(current.status)" size="small">{{ current.status || '—' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ current.project || '—' }}</el-descriptions-item>
          <el-descriptions-item label="工作类型">{{ current.workType || '—' }}</el-descriptions-item>
          <el-descriptions-item label="工作要求" :span="2">{{ current.workRequirement || '—' }}</el-descriptions-item>
          <el-descriptions-item label="工作来源">{{ current.workSource || '—' }}</el-descriptions-item>
          <el-descriptions-item label="执行人">
            {{ resolveExecutorDisplay(current.executor || current.executeDept) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时限">{{ current.deadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="下发时间">{{ current.issueTime && current.issueTime !== '—' ? current.issueTime : '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="current.receivedTime" label="接收时间">{{ current.receivedTime }}</el-descriptions-item>
          <el-descriptions-item v-if="current.issuer" label="登记人">{{ current.issuer }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ current.remark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="附件" :span="2">
            <DispatchImageAttachments
              v-if="current.attachments?.length"
              :model-value="current.attachments"
              readonly
            />
            <span v-else class="detail-empty-text">暂无附件</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
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
</style>

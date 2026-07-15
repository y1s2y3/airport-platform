<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose, Promotion, View } from '@element-plus/icons-vue'
import { buildProjects } from '../mock/data.js'
import {
  getDispatchReminderRecords,
  saveDispatchReminderRecord,
  voidDispatchReminderRecord,
  issueDispatchReminderRecord,
  receiveDispatchReminderRecord,
  emptyReminderRecord,
  normalizeReminderRecord,
  NOTICE_STATUSES,
} from '../utils/dispatchMeetingStorage.js'
import { buildExecutorOptions, resolveExecutorDisplay } from '../utils/executorDisplay.js'

defineProps({
  title: { type: String, default: '提示函' },
  description: {
    type: String,
    default: '管理远程调度产生的提示函：创建、下发、指派人查阅接收，支持从截图/调度会一键生成。',
  },
})

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref('create')
const current = ref(null)
const form = ref(emptyReminderRecord())

const projectOptions = buildProjects().map((p) => p.shortName || p.name)
const assigneeOptions = buildExecutorOptions()

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) rows = rows.filter((r) => r.status === statusFilter.value)
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((r) =>
    [r.id, r.project, r.matterDescription, r.assignee, r.executor, r.title]
      .some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getDispatchReminderRecords()
}

function openDetail(row) {
  current.value = { ...row }
  detailVisible.value = true
}

function openAssigneeRead(row) {
  if (row.status !== NOTICE_STATUSES.ISSUED) {
    openDetail(row)
    return
  }
  ElMessageBox.confirm(`确认查阅提示函「${(row.matterDescription || row.title || row.id).slice(0, 24)}」？`, '查阅确认', {
    type: 'info',
  })
    .then(() => {
      const updated = receiveDispatchReminderRecord(row.id)
      if (!updated) return
      current.value = updated
      load()
      detailVisible.value = true
      ElMessage.success('提示函已查阅，状态已更新为已接收')
    })
    .catch(() => {})
}

function handleIssue(row) {
  if (row.status !== NOTICE_STATUSES.PENDING) return
  const label = (row.matterDescription || row.title || row.id).slice(0, 24)
  ElMessageBox.confirm(`确定下发提示函「${label}」至指派人？`, '确认下发', { type: 'info' })
    .then(() => {
      issueDispatchReminderRecord(row.id)
      load()
      ElMessage.success('提示函已下发')
    })
    .catch(() => {})
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyReminderRecord()
  formVisible.value = true
}

function openEdit(row) {
  if (row.status === NOTICE_STATUSES.VOID) {
    ElMessage.warning('已作废的提示函不可编辑')
    return
  }
  if (row.status !== NOTICE_STATUSES.PENDING) {
    ElMessage.warning('仅待下发状态的提示函可编辑')
    return
  }
  formMode.value = 'edit'
  const normalized = normalizeReminderRecord({ ...row })
  form.value = {
    ...normalized,
    assignee: normalized.assignee || resolveExecutorDisplay(normalized.executor),
  }
  formVisible.value = true
}

function validateForm() {
  if (!form.value.project?.trim()) {
    ElMessage.warning('请填写项目名称')
    return false
  }
  if (!form.value.matterDescription?.trim()) {
    ElMessage.warning('请填写事项描述')
    return false
  }
  if (!form.value.assignee?.trim()) {
    ElMessage.warning('请选择指派人')
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
    assignee: form.value.assignee.trim(),
    executor: form.value.assignee.trim(),
  }
  if (formMode.value === 'create') {
    payload.status = NOTICE_STATUSES.PENDING
    payload.issueTime = '—'
  }
  saveDispatchReminderRecord(payload)
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '提示函已创建，待指挥部下发' : '提示函已更新')
}

function handleVoid(row) {
  if (row.status === NOTICE_STATUSES.VOID) return
  const label = row.matterDescription || row.title || row.id
  ElMessageBox.confirm(`确定作废提示函「${label.slice(0, 24)}」？`, '作废确认', { type: 'warning' })
    .then(() => {
      voidDispatchReminderRecord(row.id)
      load()
      ElMessage.success('提示函已作废')
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
        <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px">
          <el-option label="待下发" :value="NOTICE_STATUSES.PENDING" />
          <el-option label="已下发" :value="NOTICE_STATUSES.ISSUED" />
          <el-option label="已接收" :value="NOTICE_STATUSES.RECEIVED" />
          <el-option label="已作废" :value="NOTICE_STATUSES.VOID" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索编号、项目名称、事项描述…" clearable class="search-input" />
        <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无提示函记录">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="id" label="编号" width="148" show-overflow-tooltip />
        <el-table-column prop="project" label="项目名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="matterDescription" label="事项描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="指派人" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            {{ resolveExecutorDisplay(row.assignee || row.executor) }}
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="完成时限" width="108" />
        <el-table-column prop="status" label="状态" width="88">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
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
              v-if="row.status === NOTICE_STATUSES.ISSUED"
              link
              type="warning"
              :icon="View"
              @click="openAssigneeRead(row)"
            >
              查阅
            </el-button>
            <el-button
              link
              type="primary"
              :icon="Edit"
              :disabled="row.status !== NOTICE_STATUSES.PENDING"
              @click="openEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              :icon="CircleClose"
              :disabled="row.status === NOTICE_STATUSES.VOID"
              @click="handleVoid(row)"
            >
              作废
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增提示函' : '编辑提示函'" width="640px" destroy-on-close>
      <el-form label-width="96px">
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
            style="width: 100%"
          >
            <el-option v-for="item in projectOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="事项描述" required>
          <el-input
            v-model="form.matterDescription"
            type="textarea"
            :rows="4"
            placeholder="请描述提示事项，将作为提示函正文"
          />
        </el-form-item>
        <el-form-item label="指派人" required>
          <el-select
            v-model="form.assignee"
            filterable
            allow-create
            default-first-option
            placeholder="选择指派人"
            style="width: 100%"
          >
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
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="提示函详情" width="640px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="编号">{{ current.id || '—' }}</el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ current.project || '—' }}</el-descriptions-item>
          <el-descriptions-item label="事项描述">{{ current.matterDescription || '—' }}</el-descriptions-item>
          <el-descriptions-item label="指派人">
            {{ resolveExecutorDisplay(current.assignee || current.executor) }}
          </el-descriptions-item>
          <el-descriptions-item label="完成时限">{{ current.deadline || '—' }}</el-descriptions-item>
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
  border-left: 4px solid #909399;
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
</style>

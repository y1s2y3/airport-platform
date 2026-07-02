<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose } from '@element-plus/icons-vue'
import { buildProjects } from '../mock/data.js'
import {
  getDispatchReminderRecords,
  saveDispatchReminderRecord,
  voidDispatchReminderRecord,
  emptyReminderRecord,
  normalizeReminderRecord,
} from '../utils/dispatchMeetingStorage.js'

defineProps({
  title: { type: String, default: '提示函' },
  description: {
    type: String,
    default: '管理远程调度产生的提示函：创建、下发、签收与闭环，支持从截图/调度会一键生成。',
  },
})

const DEFAULT_ASSIGNEE = '项目经理'

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const formVisible = ref(false)
const formMode = ref('create')
const current = ref(null)
const form = ref(emptyReminderRecord())

const projectOptions = buildProjects().map((p) => p.shortName || p.name)

const assigneeOptions = computed(() => {
  const names = new Set([DEFAULT_ASSIGNEE])
  list.value.forEach((item) => {
    if (item.assignee) names.add(item.assignee)
  })
  return [...names]
})

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) rows = rows.filter((r) => r.status === statusFilter.value)
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((r) =>
    [r.id, r.project, r.matterDescription, r.assignee, r.title, r.source]
      .some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getDispatchReminderRecords()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyReminderRecord()
  formVisible.value = true
}

function openEdit(row) {
  if (row.status === '已作废') {
    ElMessage.warning('已作废的提示函不可编辑')
    return
  }
  formMode.value = 'edit'
  form.value = normalizeReminderRecord({ ...row })
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
  saveDispatchReminderRecord(form.value)
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '提示函已新增' : '提示函已更新')
}

function handleVoid(row) {
  if (row.status === '已作废') return
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
  if (status === '已作废') return 'info'
  if (status === '已下发' || status === '已闭环') return 'success'
  if (status === '待签收' || status === '待确认') return 'warning'
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
          <el-option label="已下发" value="已下发" />
          <el-option label="待签收" value="待签收" />
          <el-option label="待确认" value="待确认" />
          <el-option label="已闭环" value="已闭环" />
          <el-option label="已作废" value="已作废" />
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
        <el-table-column prop="assignee" label="指派人" width="108" show-overflow-tooltip />
        <el-table-column prop="deadline" label="完成时限" width="108" />
        <el-table-column prop="issueTime" label="下发时间" width="148" />
        <el-table-column prop="status" label="状态" width="88">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" :icon="Edit" :disabled="row.status === '已作废'" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button
              link
              type="danger"
              :icon="CircleClose"
              :disabled="row.status === '已作废'"
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
            placeholder="默认：项目经理"
            style="width: 100%"
          >
            <el-option v-for="item in assigneeOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="完成时限" required>
          <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="已下发" value="已下发" />
            <el-option label="待签收" value="待签收" />
            <el-option label="待确认" value="待确认" />
            <el-option label="已闭环" value="已闭环" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="提示函详情" width="720px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(current.status)" size="small">{{ current.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="项目名称" :span="2">{{ current.project || '—' }}</el-descriptions-item>
          <el-descriptions-item label="事项描述" :span="2">{{ current.matterDescription || '—' }}</el-descriptions-item>
          <el-descriptions-item label="指派人">{{ current.assignee || current.executor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="完成时限">{{ current.deadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ current.source || '—' }}</el-descriptions-item>
          <el-descriptions-item label="下发人">{{ current.issuer || '—' }}</el-descriptions-item>
          <el-descriptions-item label="下发时间" :span="2">{{ current.issueTime || '—' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="current.snapshot" class="content-block">
          <div class="block-label">关联图片</div>
          <img :src="current.snapshot" alt="关联图片" class="snapshot-img" />
        </div>
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

.content-block {
  margin-top: 16px;
}

.block-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text);
  margin-bottom: 8px;
}

.snapshot-img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--coc-border);
  background: #1a1a1a;
}
</style>

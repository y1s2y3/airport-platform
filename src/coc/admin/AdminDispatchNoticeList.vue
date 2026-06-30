<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose } from '@element-plus/icons-vue'
import { buildProjects } from '../mock/data.js'
import {
  getDispatchNoticeRecords,
  saveDispatchNoticeRecord,
  voidDispatchNoticeRecord,
  emptyNoticeRecord,
} from '../utils/dispatchMeetingStorage.js'

defineProps({
  title: { type: String, default: '告知单' },
  description: {
    type: String,
    default: '管理远程调度产生的告知单：创建、下发、签收、整改反馈与闭环台账，支持从截图/会议一键生成。',
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

const projectOptions = buildProjects().map((p) => ({
  shortName: p.shortName || p.name,
  fullName: p.name,
}))

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) rows = rows.filter((r) => r.status === statusFilter.value)
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((r) =>
    [r.id, r.title, r.project, r.unit, r.issuer, r.content]
      .some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getDispatchNoticeRecords()
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function openCreate() {
  formMode.value = 'create'
  form.value = emptyNoticeRecord()
  formVisible.value = true
}

function openEdit(row) {
  if (row.status === '已作废') {
    ElMessage.warning('已作废的告知单不可编辑')
    return
  }
  formMode.value = 'edit'
  form.value = { ...emptyNoticeRecord(), ...row }
  formVisible.value = true
}

function onProjectPick(projectName) {
  const project = projectOptions.find((item) => item.shortName === projectName)
  if (project && !form.value.unit) {
    form.value.unit = project.fullName.includes('中建') ? '中建三局（施工总承包）' : ''
  }
}

function validateForm() {
  if (!form.value.title?.trim()) {
    ElMessage.warning('请填写标题')
    return false
  }
  if (!form.value.project?.trim()) {
    ElMessage.warning('请填写项目')
    return false
  }
  if (!form.value.content?.trim()) {
    ElMessage.warning('请填写告知内容')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  saveDispatchNoticeRecord(form.value)
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '告知单已新增' : '告知单已更新')
}

function handleVoid(row) {
  if (row.status === '已作废') return
  ElMessageBox.confirm(`确定作废告知单「${row.title}」？`, '作废确认', { type: 'warning' })
    .then(() => {
      voidDispatchNoticeRecord(row.id)
      load()
      ElMessage.success('告知单已作废')
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
          <el-option label="已闭环" value="已闭环" />
          <el-option label="已作废" value="已作废" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索编号、项目、责任单位…" clearable class="search-input" />
        <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无告知单记录">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="id" label="编号" width="148" show-overflow-tooltip />
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column prop="project" label="项目" min-width="120" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="72">
          <template #default="{ row }">
            <el-tag :type="row.type === '安全' ? 'danger' : 'warning'" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="责任单位" min-width="160" show-overflow-tooltip />
        <el-table-column prop="deadline" label="整改期限" width="108" />
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增告知单' : '编辑告知单'" width="640px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="如：临边防护整改告知单" />
        </el-form-item>
        <el-form-item label="项目" required>
          <el-select
            v-model="form.project"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入项目"
            style="width: 100%"
            @change="onProjectPick"
          >
            <el-option v-for="item in projectOptions" :key="item.shortName" :label="item.shortName" :value="item.shortName" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="安全">安全</el-radio>
            <el-radio value="质量">质量</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="责任单位">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="整改期限">
          <el-date-picker v-model="form.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="下发人">
          <el-input v-model="form.issuer" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="已下发" value="已下发" />
            <el-option label="待签收" value="待签收" />
            <el-option label="已闭环" value="已闭环" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="form.source" />
        </el-form-item>
        <el-form-item label="告知内容" required>
          <el-input v-model="form.content" type="textarea" :rows="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="告知单详情" width="720px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(current.status)" size="small">{{ current.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题" :span="2">{{ current.title }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ current.project }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ current.type }}</el-descriptions-item>
          <el-descriptions-item label="责任单位" :span="2">{{ current.unit }}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{ current.deadline }}</el-descriptions-item>
          <el-descriptions-item label="下发时间">{{ current.issueTime }}</el-descriptions-item>
          <el-descriptions-item label="下发人">{{ current.issuer }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ current.source || '—' }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="current.snapshot" class="content-block">
          <div class="block-label">关联图片</div>
          <img :src="current.snapshot" alt="关联图片" class="snapshot-img" />
        </div>
        <div class="content-block">
          <div class="block-label">告知内容</div>
          <pre class="content-pre">{{ current.content }}</pre>
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

.content-block {
  margin-top: 16px;
}

.block-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text);
  margin-bottom: 8px;
}

.content-pre {
  margin: 0;
  padding: 12px 14px;
  border: 1px solid var(--coc-border);
  border-radius: 8px;
  background: #faf8f6;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-family: inherit;
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

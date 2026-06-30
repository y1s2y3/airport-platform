<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, CircleClose, Upload } from '@element-plus/icons-vue'
import { buildProjects } from '../mock/data.js'
import {
  getDispatchPenaltyRecords,
  saveDispatchPenaltyRecord,
  voidDispatchPenaltyRecord,
  markPenaltyBlackBoardSync,
  emptyPenaltyRecord,
} from '../utils/dispatchMeetingStorage.js'
import {
  importPenaltyToBlackBoard,
  formatRedBlackPeriod,
  getCurrentRedBlackPeriodKey,
  parseRedBlackPeriod,
  buildRedBlackPeriodKey,
} from '../utils/redBlackBoardStorage.js'

defineProps({
  title: { type: String, default: '处罚单' },
  description: {
    type: String,
    default:
      '管理处罚单全流程：开具、申诉、复核、缴纳凭证上传与归档；支持与红黑榜、隐患库联动勾选。',
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
    [r.id, r.title, r.project, r.unit, r.handler, r.content]
      .some((f) => String(f || '').includes(q)),
  )
})

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
  if (row.status === '已作废') {
    ElMessage.warning('已作废的处罚单不可编辑')
    return
  }
  formMode.value = 'edit'
  form.value = { ...emptyPenaltyRecord(), ...row }
  formVisible.value = true
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
    ElMessage.warning('请填写处罚内容')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  saveDispatchPenaltyRecord(form.value)
  load()
  formVisible.value = false
  ElMessage.success(formMode.value === 'create' ? '处罚单已新增' : '处罚单已更新')
}

function handleVoid(row) {
  if (row.status === '已作废') return
  ElMessageBox.confirm(`确定作废处罚单「${row.title}」？`, '作废确认', { type: 'warning' })
    .then(() => {
      voidDispatchPenaltyRecord(row.id)
      load()
      ElMessage.success('处罚单已作废')
    })
    .catch(() => {})
}

function openBlackBoard(row) {
  if (row.status === '已作废') {
    ElMessage.warning('已作废的处罚单不可纳入黑榜')
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
  if (status === '已作废') return 'info'
  if (status === '已下发') return 'success'
  if (status === '处理中') return 'warning'
  if (status === '待确认') return 'info'
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
          <el-option label="处理中" value="处理中" />
          <el-option label="待确认" value="待确认" />
          <el-option label="已作废" value="已作废" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索编号、项目、处理人…" clearable class="search-input" />
        <el-button type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无处罚单记录">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="id" label="编号" width="148" show-overflow-tooltip />
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column prop="project" label="项目" min-width="120" show-overflow-tooltip />
        <el-table-column prop="unit" label="责任单位" min-width="160" show-overflow-tooltip />
        <el-table-column prop="handler" label="处理人" width="108" />
        <el-table-column prop="amount" label="处罚金额" width="96" />
        <el-table-column prop="issueTime" label="下发时间" width="148" />
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
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="primary" :icon="Edit" :disabled="row.status === '已作废'" @click="openEdit(row)">
              编辑
            </el-button>
            <el-button
              link
              type="warning"
              :icon="Upload"
              :disabled="row.status === '已作废'"
              @click="openBlackBoard(row)"
            >
              纳入黑榜
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增处罚单' : '编辑处罚单'" width="640px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="标题" required>
          <el-input v-model="form.title" placeholder="如：文明施工违规处罚单" />
        </el-form-item>
        <el-form-item label="项目" required>
          <el-select
            v-model="form.project"
            filterable
            allow-create
            default-first-option
            placeholder="选择或输入项目"
            style="width: 100%"
          >
            <el-option v-for="item in projectOptions" :key="item.shortName" :label="item.shortName" :value="item.shortName" />
          </el-select>
        </el-form-item>
        <el-form-item label="责任单位">
          <el-input v-model="form.unit" />
        </el-form-item>
        <el-form-item label="处理人">
          <el-input v-model="form.handler" />
        </el-form-item>
        <el-form-item label="处罚金额">
          <el-input v-model="form.amount" placeholder="如 5000元 或 —" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="已下发" value="已下发" />
            <el-option label="处理中" value="处理中" />
            <el-option label="待确认" value="待确认" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-input v-model="form.source" />
        </el-form-item>
        <el-form-item label="处罚内容" required>
          <el-input v-model="form.content" type="textarea" :rows="5" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="blackBoardVisible" title="纳入黑榜" width="480px" destroy-on-close>
      <p class="dialog-tip">
        将处罚单「{{ blackBoardTarget?.title }}」同步至黑红榜单，请选择纳入期数。
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
            <div>项目：{{ blackBoardTarget?.project }}</div>
            <div>说明：{{ blackBoardTarget?.title }}</div>
            <div v-if="blackBoardTarget?.snapshot">将携带视频截屏作为黑榜图片</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="blackBoardVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBlackBoard">确认纳入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="处罚单详情" width="720px" destroy-on-close>
      <template v-if="current">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="编号">{{ current.id }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="statusTagType(current.status)" size="small">{{ current.status }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题" :span="2">{{ current.title }}</el-descriptions-item>
          <el-descriptions-item label="项目">{{ current.project }}</el-descriptions-item>
          <el-descriptions-item label="处罚金额">{{ current.amount || '—' }}</el-descriptions-item>
          <el-descriptions-item label="责任单位" :span="2">{{ current.unit }}</el-descriptions-item>
          <el-descriptions-item label="处理人">{{ current.handler }}</el-descriptions-item>
          <el-descriptions-item label="下发时间">{{ current.issueTime }}</el-descriptions-item>
          <el-descriptions-item label="来源" :span="2">{{ current.source || '—' }}</el-descriptions-item>
          <el-descriptions-item v-if="current.blackBoardSynced" label="黑榜期数" :span="2">
            {{ formatRedBlackPeriod(current.blackBoardMonth) }}
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="current.snapshot" class="content-block">
          <div class="block-label">关联图片</div>
          <img :src="current.snapshot" alt="关联图片" class="snapshot-img" />
        </div>
        <div class="content-block">
          <div class="block-label">处罚内容</div>
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

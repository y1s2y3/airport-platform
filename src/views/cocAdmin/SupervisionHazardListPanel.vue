<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View, Plus } from '@element-plus/icons-vue'
import {
  getSupervisionHazards,
  getSupervisionHazardsByProject,
  SUPERVISION_HAZARD_RECTIFY_STATUSES,
  closeSupervisionHazard,
  saveSupervisionHazard,
} from '../../utils/cocAdminDeviceStorage.js'

const props = defineProps({
  /** 兼容旧用法：true 时不可关闭 */
  readonly: { type: Boolean, default: true },
  /** 仅指挥部层级可确认关闭；优先于 readonly */
  allowClose: { type: Boolean, default: undefined },
  /** 项目层级可手动新增隐患 */
  allowCreate: { type: Boolean, default: false },
  projectName: { type: String, default: '' },
  projectId: { type: String, default: '' },
  meetingId: { type: String, default: '' },
})

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)
const formVisible = ref(false)
const form = ref(emptyManualForm())
const hazardLevels = ['一般', '较大', '重大']

const canOperateClose = computed(() =>
  typeof props.allowClose === 'boolean' ? props.allowClose : !props.readonly,
)

const canCreate = computed(() => props.allowCreate && Boolean(props.projectName))

function emptyManualForm() {
  return {
    hazardType: 'safety',
    description: '',
    hazardLevel: '一般',
    remark: '',
  }
}

function load() {
  let rows = props.projectName
    ? getSupervisionHazardsByProject(props.projectName)
    : getSupervisionHazards()
  if (props.meetingId) {
    rows = rows.filter((item) => item.meetingId === props.meetingId)
  }
  list.value = rows
}

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) {
    rows = rows.filter((row) => row.rectifyStatus === statusFilter.value)
  }
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((row) =>
    [
      row.description,
      row.remark,
      row.hazardLevel,
      row.projectName,
      row.source,
      row.meetingId,
      row.rectifyStatus,
      hazardTypeLabel(row.hazardType),
    ].some((f) => String(f || '').includes(q)),
  )
})

function hazardTypeLabel(type) {
  return type === 'quality' ? '质量' : '安全'
}

function hazardTypeTag(type) {
  return type === 'quality' ? 'success' : 'warning'
}

function rectifyStatusTag(status) {
  const map = {
    待整改: 'warning',
    已关闭: 'success',
  }
  return map[status] || 'info'
}

function canConfirmClose(row) {
  return canOperateClose.value && row.rectifyStatus === '待整改'
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function openCreate() {
  if (!canCreate.value) {
    ElMessage.warning('请先切换到具体项目后再新增隐患')
    return
  }
  form.value = emptyManualForm()
  formVisible.value = true
}

function validateForm() {
  if (!form.value.hazardType) {
    ElMessage.warning('请选择隐患类型')
    return false
  }
  if (!String(form.value.description || '').trim()) {
    ElMessage.warning('请填写隐患描述')
    return false
  }
  if (!form.value.hazardLevel) {
    ElMessage.warning('请选择隐患等级')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
  saveSupervisionHazard({
    projectId: props.projectId || '',
    projectName: props.projectName,
    meetingId: props.meetingId || '',
    source: '人工登记',
    hazardType: form.value.hazardType,
    description: String(form.value.description).trim(),
    hazardLevel: form.value.hazardLevel,
    remark: String(form.value.remark || '').trim(),
    rectifier: '',
    hazardDeadline: '',
    acceptor: '',
    rectifyStatus: '待整改',
    rectifyRemark: '',
    rectifyPhotos: [],
    uploadTime: now,
  })
  formVisible.value = false
  load()
  ElMessage.success('隐患已新增，默认状态为待整改')
}

function refreshDetail(id) {
  const row = list.value.find((item) => item.id === id)
  if (row && current.value?.id === id) current.value = row
}

async function handleConfirmClose(row) {
  try {
    await ElMessageBox.confirm('确认将该隐患关闭？关闭后状态将变为「已关闭」。', '确认关闭', {
      type: 'warning',
      confirmButtonText: '确认关闭',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const result = closeSupervisionHazard(row.id, {
    operator: '指挥部用户',
    operatorRole: '指挥部',
    remark: '确认关闭',
  })
  if (!result || result.rectifyStatus !== '已关闭') {
    ElMessage.warning('关闭失败，请确认当前状态为待整改')
    return
  }
  load()
  refreshDetail(row.id)
  ElMessage.success('隐患已关闭')
}

watch(
  () => [props.projectName, props.meetingId],
  () => load(),
)

onMounted(load)

defineExpose({ reload: load })
</script>

<template>
  <div class="hazard-tab">
    <div class="tab-toolbar">
      <el-select v-model="statusFilter" placeholder="整改状态" clearable class="status-filter">
        <el-option
          v-for="item in SUPERVISION_HAZARD_RECTIFY_STATUSES"
          :key="item"
          :label="item"
          :value="item"
        />
      </el-select>
      <el-input
        v-model="keyword"
        placeholder="搜索隐患描述、备注、项目…"
        clearable
        class="search-input"
      />
      <el-button v-if="canCreate" type="primary" :icon="Plus" @click="openCreate">新增隐患</el-button>
      <el-tag v-if="canOperateClose" size="small" type="success">指挥部 · 可关闭</el-tag>
      <el-tag v-else-if="canCreate" size="small" type="success">项目级 · 可新增</el-tag>
      <el-tag v-else size="small" type="info">项目级 · 仅查看</el-tag>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无监理隐患记录">
      <el-table-column type="index" label="序号" width="56" />
      <el-table-column
        v-if="!projectName"
        prop="projectName"
        label="项目名称"
        min-width="120"
        show-overflow-tooltip
      />
      <el-table-column label="隐患类型" width="88" align="center">
        <template #default="{ row }">
          <el-tag :type="hazardTypeTag(row.hazardType)" size="small">
            {{ hazardTypeLabel(row.hazardType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="隐患描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="hazardLevel" label="隐患等级" width="88" align="center" />
      <el-table-column label="备注" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.remark || '—' }}</template>
      </el-table-column>
      <el-table-column label="整改状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="rectifyStatusTag(row.rectifyStatus)" size="small">
            {{ row.rectifyStatus || '待整改' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="source" label="来源" width="96" />
      <el-table-column prop="uploadTime" label="登记时间" width="148" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="canConfirmClose(row)"
            link
            type="success"
            @click="handleConfirmClose(row)"
          >
            确认关闭
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="formVisible" title="新增监理隐患" width="560px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="项目名称">
          <el-input :model-value="projectName" disabled />
        </el-form-item>
        <el-form-item label="隐患类型" required>
          <el-select v-model="form.hazardType" placeholder="请选择" style="width: 100%">
            <el-option label="安全" value="safety" />
            <el-option label="质量" value="quality" />
          </el-select>
        </el-form-item>
        <el-form-item label="隐患描述" required>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入隐患描述"
          />
        </el-form-item>
        <el-form-item label="隐患等级" required>
          <el-select v-model="form.hazardLevel" placeholder="请选择" style="width: 100%">
            <el-option v-for="lv in hazardLevels" :key="lv" :label="lv" :value="lv" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="监理隐患详情" width="640px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目名称">{{ current.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="隐患类型">{{ hazardTypeLabel(current.hazardType) }}</el-descriptions-item>
          <el-descriptions-item label="隐患描述">{{ current.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="隐患等级">{{ current.hazardLevel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改状态">{{ current.rectifyStatus || '待整改' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ current.source || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联会议">{{ current.meetingId || '—' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ current.uploadTime }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="current.statusLogs?.length" class="status-logs">
          <h4>操作留痕</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(log, index) in current.statusLogs"
              :key="`${log.time}-${log.action}-${index}`"
              :timestamp="log.time"
              placement="top"
            >
              <div class="log-title">
                {{ log.action }}：{{ log.fromStatus || '—' }} → {{ log.toStatus }}
              </div>
              <div class="log-meta">{{ log.operator }}（{{ log.operatorRole }}）</div>
              <div v-if="log.remark" class="log-remark">备注：{{ log.remark }}</div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div v-if="canConfirmClose(current)" class="detail-actions">
          <el-button type="success" @click="handleConfirmClose(current)">确认关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.hazard-tab {
  padding-top: 4px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.status-filter {
  width: 120px;
}

.search-input {
  width: 280px;
}

.status-logs {
  margin-top: 20px;
}

.status-logs h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.log-title {
  font-weight: 600;
  color: #303133;
}

.log-meta,
.log-remark {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}
</style>

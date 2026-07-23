<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Upload } from '@element-plus/icons-vue'
import {
  getSupervisionHazards,
  getSupervisionHazardsByProject,
  SUPERVISION_HAZARD_RECTIFY_STATUSES,
  submitSupervisionHazardRectify,
  acceptSupervisionHazard,
  rejectSupervisionHazard,
  issueSupervisionHazards,
} from '../../utils/cocAdminDeviceStorage.js'
import { useSupervisionHazardActor } from '../../composables/useSupervisionHazardActor.js'
import { HAZARD_REPORTERS, TASK_EXECUTOR_OPTIONS } from '../../coc/mock/data.js'

const props = defineProps({
  readonly: { type: Boolean, default: true },
  projectName: { type: String, default: '' },
  meetingId: { type: String, default: '' },
})

const { actorRole, operatorName, isContractor, isSupervisor, SUPERVISION_HAZARD_ACTOR_OPTIONS } =
  useSupervisionHazardActor()

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)
const selectedRows = ref([])

const submitVisible = ref(false)
const acceptVisible = ref(false)
const rejectVisible = ref(false)
const issueVisible = ref(false)
const actionTarget = ref(null)
const issueTargets = ref([])
const submitForm = ref({ remark: '', photos: [] })
const acceptForm = ref({ remark: '' })
const rejectForm = ref({ remark: '' })
const issueForm = ref({
  rectifier: '',
  hazardDeadline: '',
  acceptor: '',
})

const rectifierOptions = HAZARD_REPORTERS
const acceptorOptions = computed(() => {
  const fromExec = TASK_EXECUTOR_OPTIONS.filter(
    (item) => /监理|安监|质量|调度/.test(item.position || ''),
  ).map((item) => `${item.name}（${item.position}）`)
  const fallback = ['吴检（监理工程师）', '陈工（监理工程师）', '王某（总监）', '赵某（副总监）']
  return fromExec.length ? fromExec : fallback
})

function load() {
  let rows = props.projectName
    ? getSupervisionHazardsByProject(props.projectName)
    : getSupervisionHazards()
  if (props.meetingId) {
    rows = rows.filter((item) => item.meetingId === props.meetingId)
  }
  list.value = rows
  selectedRows.value = []
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
      row.rectifier,
      row.acceptor,
      row.hazardLevel,
      row.projectName,
      row.source,
      row.meetingId,
      row.rectifyStatus,
      hazardTypeLabel(row.hazardType),
    ].some((f) => String(f || '').includes(q)),
  )
})

const pendingIssueSelected = computed(() =>
  selectedRows.value.filter((row) => row.rectifyStatus === '待下发'),
)

function hazardTypeLabel(type) {
  return type === 'quality' ? '质量' : '安全'
}

function hazardTypeTag(type) {
  return type === 'quality' ? 'success' : 'warning'
}

function rectifyStatusTag(status) {
  const map = {
    待下发: 'info',
    待整改: 'warning',
    待验收: '',
    已关闭: 'success',
  }
  return map[status] || 'info'
}

function canIssue(row) {
  return row.rectifyStatus === '待下发'
}

function canSubmitRectify(row) {
  return !props.readonly && isContractor.value && row.rectifyStatus === '待整改'
}

function canAccept(row) {
  return !props.readonly && isSupervisor.value && row.rectifyStatus === '待验收'
}

function canReject(row) {
  return !props.readonly && isSupervisor.value && row.rectifyStatus === '待验收'
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function refreshDetail(id) {
  const row = list.value.find((item) => item.id === id)
  if (row && current.value?.id === id) current.value = row
}

function defaultIssueDeadline() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

function resetIssueForm() {
  issueForm.value = {
    rectifier: '',
    hazardDeadline: defaultIssueDeadline(),
    acceptor: acceptorOptions.value[0] || '',
  }
}

function openIssue(row) {
  issueTargets.value = [row]
  resetIssueForm()
  issueVisible.value = true
}

function openBatchIssue() {
  if (!pendingIssueSelected.value.length) {
    ElMessage.warning('请先勾选状态为「待下发」的隐患')
    return
  }
  issueTargets.value = [...pendingIssueSelected.value]
  resetIssueForm()
  issueVisible.value = true
}

function handleIssue() {
  if (!issueForm.value.rectifier) {
    ElMessage.warning('请指定整改人')
    return
  }
  if (!issueForm.value.hazardDeadline) {
    ElMessage.warning('请指定整改期限')
    return
  }
  if (!issueForm.value.acceptor) {
    ElMessage.warning('请指定验收人')
    return
  }
  const ids = issueTargets.value.map((row) => row.id)
  const result = issueSupervisionHazards(ids, {
    rectifier: issueForm.value.rectifier,
    hazardDeadline: issueForm.value.hazardDeadline,
    acceptor: issueForm.value.acceptor,
    operator: operatorName.value,
    operatorRole: isSupervisor.value ? actorRole.value : '监理',
  })
  if (!result.ok) {
    ElMessage.warning(result.msg || '下发失败')
    return
  }
  load()
  result.updated.forEach((row) => refreshDetail(row.id))
  issueVisible.value = false
  ElMessage.success(
    result.updated.length > 1
      ? `已批量下发 ${result.updated.length} 条隐患`
      : '已下发，状态更新为待整改',
  )
}

function openSubmitRectify(row) {
  actionTarget.value = row
  submitForm.value = { remark: row.rectifyRemark || '', photos: [...(row.rectifyPhotos || [])] }
  submitVisible.value = true
}

function openAccept(row) {
  actionTarget.value = row
  acceptForm.value = { remark: '现场核查整改到位，予以关闭。' }
  acceptVisible.value = true
}

function openReject(row) {
  actionTarget.value = row
  rejectForm.value = { remark: '' }
  rejectVisible.value = true
}

function assignRectifyPhoto(uploadFile) {
  submitForm.value.photos = [...submitForm.value.photos, uploadFile.name || '']
  return false
}

function removeRectifyPhoto(index) {
  submitForm.value.photos = submitForm.value.photos.filter((_, i) => i !== index)
}

function handleSubmitRectify() {
  if (!submitForm.value.remark.trim()) {
    ElMessage.warning('请填写整改说明')
    return
  }
  if (!submitForm.value.photos.length) {
    ElMessage.warning('请上传至少一张整改照片')
    return
  }
  const result = submitSupervisionHazardRectify(actionTarget.value.id, {
    remark: submitForm.value.remark.trim(),
    photos: submitForm.value.photos,
    operator: operatorName.value,
    operatorRole: actorRole.value,
  })
  if (!result || result.rectifyStatus !== '待验收') {
    ElMessage.warning('提交失败，请确认当前状态为待整改')
    return
  }
  load()
  refreshDetail(actionTarget.value.id)
  submitVisible.value = false
  ElMessage.success('整改已提交，等待验收')
}

function handleAccept() {
  const result = acceptSupervisionHazard(actionTarget.value.id, {
    remark: acceptForm.value.remark.trim(),
    operator: operatorName.value,
    operatorRole: actorRole.value,
  })
  if (!result || result.rectifyStatus !== '已关闭') {
    ElMessage.warning('验收失败，请确认当前状态为待验收')
    return
  }
  load()
  refreshDetail(actionTarget.value.id)
  acceptVisible.value = false
  ElMessage.success('验收通过，隐患已关闭')
}

function handleReject() {
  if (!rejectForm.value.remark.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  const result = rejectSupervisionHazard(actionTarget.value.id, {
    remark: rejectForm.value.remark.trim(),
    operator: operatorName.value,
    operatorRole: actorRole.value,
  })
  if (!result || result.rectifyStatus !== '待整改') {
    ElMessage.warning('驳回失败，请确认当前状态为待验收')
    return
  }
  load()
  refreshDetail(actionTarget.value.id)
  rejectVisible.value = false
  ElMessage.success('已驳回，隐患退回待整改')
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
      <el-select
        v-if="!readonly"
        v-model="actorRole"
        class="actor-select"
        placeholder="当前角色"
      >
        <el-option
          v-for="item in SUPERVISION_HAZARD_ACTOR_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
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
        placeholder="搜索隐患描述、整改人、验收人、项目…"
        clearable
        class="search-input"
      />
      <el-button
        type="primary"
        :disabled="!pendingIssueSelected.length"
        @click="openBatchIssue"
      >
        批量下发{{ pendingIssueSelected.length ? `（${pendingIssueSelected.length}）` : '' }}
      </el-button>
      <el-tag v-if="readonly" size="small" type="info">企业级</el-tag>
      <el-tag v-else size="small" type="success">项目层级 · {{ operatorName }}</el-tag>
    </div>

    <el-table
      :data="filtered"
      stripe
      border
      empty-text="暂无监理隐患记录"
      @selection-change="(rows) => (selectedRows = rows)"
    >
      <el-table-column
        type="selection"
        width="48"
        :selectable="(row) => row.rectifyStatus === '待下发'"
      />
      <el-table-column type="index" label="序号" width="56" />
      <el-table-column v-if="!projectName" prop="projectName" label="项目名称" min-width="120" show-overflow-tooltip />
      <el-table-column label="类型" width="72" align="center">
        <template #default="{ row }">
          <el-tag :type="hazardTypeTag(row.hazardType)" size="small">
            {{ hazardTypeLabel(row.hazardType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="隐患描述" min-width="180" show-overflow-tooltip />
      <el-table-column prop="hazardLevel" label="等级" width="72" align="center" />
      <el-table-column label="整改状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="rectifyStatusTag(row.rectifyStatus)" size="small">
            {{ row.rectifyStatus || '待下发' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="整改人" width="88" show-overflow-tooltip>
        <template #default="{ row }">{{ row.rectifier || '—' }}</template>
      </el-table-column>
      <el-table-column label="整改期限" width="112">
        <template #default="{ row }">{{ row.hazardDeadline || '—' }}</template>
      </el-table-column>
      <el-table-column label="验收人" width="110" show-overflow-tooltip>
        <template #default="{ row }">{{ row.acceptor || '—' }}</template>
      </el-table-column>
      <el-table-column prop="source" label="来源" width="96" />
      <el-table-column prop="uploadTime" label="登记时间" width="148" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <el-button v-if="canIssue(row)" link type="primary" @click="openIssue(row)">下发</el-button>
          <el-button v-if="canSubmitRectify(row)" link type="primary" @click="openSubmitRectify(row)">
            提交整改
          </el-button>
          <el-button v-if="canAccept(row)" link type="success" @click="openAccept(row)">验收通过</el-button>
          <el-button v-if="canReject(row)" link type="danger" @click="openReject(row)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailVisible" title="监理隐患详情" width="720px">
      <template v-if="current">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目名称">{{ current.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ hazardTypeLabel(current.hazardType) }}</el-descriptions-item>
          <el-descriptions-item label="隐患描述">{{ current.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="等级">{{ current.hazardLevel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改状态">{{ current.rectifyStatus || '待下发' }}</el-descriptions-item>
          <el-descriptions-item label="整改人">{{ current.rectifier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{ current.hazardDeadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="验收人">{{ current.acceptor || '—' }}</el-descriptions-item>
          <el-descriptions-item label="最新整改说明">{{ current.rectifyRemark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改照片">
            {{ current.rectifyPhotos?.length ? current.rectifyPhotos.join('、') : '—' }}
          </el-descriptions-item>
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
              <div v-if="log.photos?.length" class="log-remark">照片：{{ log.photos.join('、') }}</div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div class="detail-actions">
          <el-button v-if="canIssue(current)" type="primary" @click="openIssue(current)">下发</el-button>
          <el-button v-if="canSubmitRectify(current)" type="primary" @click="openSubmitRectify(current)">
            提交整改
          </el-button>
          <el-button v-if="canAccept(current)" type="success" @click="openAccept(current)">验收通过</el-button>
          <el-button v-if="canReject(current)" type="danger" @click="openReject(current)">驳回</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="issueVisible"
      :title="issueTargets.length > 1 ? `批量下发（${issueTargets.length}条）` : '下发隐患'"
      width="560px"
      destroy-on-close
    >
      <el-alert
        v-if="issueTargets.length > 1"
        type="info"
        :closable="false"
        show-icon
        class="issue-tip"
        :title="`将为 ${issueTargets.length} 条待下发隐患统一指定整改人、整改期限与验收人`"
      />
      <el-form label-width="96px">
        <el-form-item label="整改人" required>
          <el-select
            v-model="issueForm.rectifier"
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入整改人"
            style="width: 100%"
          >
            <el-option v-for="name in rectifierOptions" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
        <el-form-item label="整改期限" required>
          <el-date-picker
            v-model="issueForm.hazardDeadline"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择整改期限"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="验收人" required>
          <el-select
            v-model="issueForm.acceptor"
            filterable
            allow-create
            default-first-option
            placeholder="请选择或输入验收人"
            style="width: 100%"
          >
            <el-option v-for="name in acceptorOptions" :key="name" :label="name" :value="name" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="issueVisible = false">取消</el-button>
        <el-button type="primary" @click="handleIssue">确认下发</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="submitVisible" title="提交整改" width="560px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="整改说明" required>
          <el-input
            v-model="submitForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请描述整改措施及完成情况"
          />
        </el-form-item>
        <el-form-item label="整改照片" required>
          <div class="upload-block">
            <el-upload :show-file-list="false" accept=".jpg,.jpeg,.png,.webp" :before-upload="assignRectifyPhoto">
              <el-button :icon="Upload">上传照片</el-button>
            </el-upload>
            <div v-if="submitForm.photos.length" class="photo-list">
              <el-tag
                v-for="(photo, index) in submitForm.photos"
                :key="`${photo}-${index}`"
                closable
                @close="removeRectifyPhoto(index)"
              >
                {{ photo }}
              </el-tag>
            </div>
            <span v-else class="photo-tip">请上传至少一张整改现场照片</span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="submitVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitRectify">提交</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="acceptVisible" title="验收通过" width="520px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="验收意见">
          <el-input v-model="acceptForm.remark" type="textarea" :rows="3" placeholder="可填写验收说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="acceptVisible = false">取消</el-button>
        <el-button type="success" @click="handleAccept">确认通过</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="rejectVisible" title="验收驳回" width="520px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="驳回原因" required>
          <el-input
            v-model="rejectForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请说明整改不到位之处，退回施工方继续整改"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReject">确认驳回</el-button>
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

.actor-select,
.status-filter {
  width: 120px;
}

.search-input {
  width: 280px;
}

.issue-tip {
  margin-bottom: 14px;
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

.upload-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.photo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.photo-tip {
  font-size: 13px;
  color: #909399;
}
</style>

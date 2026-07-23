<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Upload } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { useDispatchHazardActor } from '../../composables/useDispatchHazardActor.js'
import {
  getDispatchHazards,
  getDispatchHazardsByProject,
  DISPATCH_HAZARD_RECTIFY_STATUSES,
  submitDispatchHazardRectify,
  acceptDispatchHazard,
  rejectDispatchHazard,
} from '../../utils/dispatchHazardStorage.js'

defineProps({
  title: { type: String, default: '调度隐患清单' },
  description: { type: String, default: '' },
})

const { isHqSelected, headerProjectLabel } = useCurrentProject()
const { actorRole, operatorName, isContractor, isSafetyDept, DISPATCH_HAZARD_ACTOR_OPTIONS } =
  useDispatchHazardActor()

const keyword = ref('')
const statusFilter = ref('')
const typeFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)

const submitVisible = ref(false)
const acceptVisible = ref(false)
const rejectVisible = ref(false)
const actionTarget = ref(null)
const submitForm = ref({ remark: '', photos: [] })
const acceptForm = ref({ remark: '' })
const rejectForm = ref({ remark: '' })

const readonly = computed(() => isHqSelected.value)
const scopeProjectName = computed(() => (isHqSelected.value ? '' : headerProjectLabel.value))

function load() {
  list.value = scopeProjectName.value
    ? getDispatchHazardsByProject(scopeProjectName.value)
    : getDispatchHazards()
}

const filtered = computed(() => {
  let rows = list.value
  if (statusFilter.value) {
    rows = rows.filter((row) => row.rectifyStatus === statusFilter.value)
  }
  if (typeFilter.value) {
    rows = rows.filter((row) => row.hazardType === typeFilter.value)
  }
  const q = keyword.value.trim()
  if (!q) return rows
  return rows.filter((row) =>
    [
      row.description,
      row.rectifier,
      row.hazardLevel,
      row.projectName,
      row.source,
      row.cameraName,
      row.cameraLocation,
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
    待验收: '',
    已关闭: 'success',
  }
  return map[status] || 'info'
}

function sourceTypeLabel(type) {
  return { live: '实时', playback: '回放', meeting: '会议' }[type] || type || '—'
}

function canSubmitRectify(row) {
  return !readonly.value && isContractor.value && row.rectifyStatus === '待整改'
}

function canAccept(row) {
  return !readonly.value && isSafetyDept.value && row.rectifyStatus === '待验收'
}

function canReject(row) {
  return !readonly.value && isSafetyDept.value && row.rectifyStatus === '待验收'
}

function openDetail(row) {
  current.value = row
  detailVisible.value = true
}

function refreshDetail(id) {
  const row = list.value.find((item) => item.id === id)
  if (row && current.value?.id === id) current.value = row
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
  const result = submitDispatchHazardRectify(actionTarget.value.id, {
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
  ElMessage.success('整改已提交，等待安质部验收')
}

function handleAccept() {
  const result = acceptDispatchHazard(actionTarget.value.id, {
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
  const result = rejectDispatchHazard(actionTarget.value.id, {
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

watch([isHqSelected, headerProjectLabel], () => load())

onMounted(load)
</script>

<template>
  <div class="dispatch-hazard-page page-card">
    <div class="page-head">
      <div>
        <h2 class="page-title">{{ title }}</h2>
        <p class="page-desc">
          {{
            description ||
            '汇集 COC 调度大屏「问题截图」登记的安全隐患与质量隐患，支持整改提交与验收闭环。'
          }}
        </p>
      </div>
      <el-tag v-if="readonly" size="small" type="info">指挥部 · 只读查看全部项目</el-tag>
      <el-tag v-else size="small" type="success">项目层级 · {{ scopeProjectName || '当前项目' }}</el-tag>
    </div>

    <div class="tab-toolbar">
      <el-select
        v-if="!readonly"
        v-model="actorRole"
        class="actor-select"
        placeholder="当前角色"
      >
        <el-option
          v-for="item in DISPATCH_HAZARD_ACTOR_OPTIONS"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <el-select v-model="typeFilter" placeholder="隐患类型" clearable class="status-filter">
        <el-option label="安全" value="safety" />
        <el-option label="质量" value="quality" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="整改状态" clearable class="status-filter">
        <el-option
          v-for="item in DISPATCH_HAZARD_RECTIFY_STATUSES"
          :key="item"
          :label="item"
          :value="item"
        />
      </el-select>
      <el-input
        v-model="keyword"
        placeholder="搜索隐患描述、整改人、项目、摄像头…"
        clearable
        class="search-input"
      />
      <el-tag v-if="!readonly" size="small" type="warning">当前操作人：{{ operatorName }}</el-tag>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无调度隐患记录" class="ap-table">
      <el-table-column type="index" label="序号" width="56" />
      <el-table-column
        v-if="readonly"
        prop="projectName"
        label="项目名称"
        min-width="120"
        show-overflow-tooltip
      />
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
            {{ row.rectifyStatus || '待整改' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="rectifier" label="整改人" width="88" show-overflow-tooltip />
      <el-table-column prop="hazardDeadline" label="整改期限" width="112" />
      <el-table-column prop="cameraName" label="摄像头" min-width="110" show-overflow-tooltip />
      <el-table-column prop="source" label="来源" width="96" />
      <el-table-column prop="uploadTime" label="登记时间" width="148" />
      <el-table-column label="操作" :width="readonly ? 88 : 220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <el-button v-if="canSubmitRectify(row)" link type="primary" @click="openSubmitRectify(row)">
            提交整改
          </el-button>
          <el-button v-if="canAccept(row)" link type="success" @click="openAccept(row)">验收通过</el-button>
          <el-button v-if="canReject(row)" link type="danger" @click="openReject(row)">驳回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="detailVisible" title="调度隐患详情" width="860px">
      <div v-if="current" class="detail-grid">
        <div class="detail-preview">
          <img
            v-if="current.snapshot"
            :src="current.snapshot"
            alt="问题截图"
            class="detail-img"
          />
          <div v-else class="detail-empty">
            <span class="empty-title">问题截图</span>
            <span class="empty-sub">{{ current.cameraName || '现场监控' }}</span>
            <span class="empty-desc">{{ hazardTypeLabel(current.hazardType) }}隐患 · {{ current.hazardLevel || '一般' }}</span>
          </div>
        </div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="项目名称">{{ current.projectName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ hazardTypeLabel(current.hazardType) }}</el-descriptions-item>
          <el-descriptions-item label="隐患描述">{{ current.description || '—' }}</el-descriptions-item>
          <el-descriptions-item label="等级">{{ current.hazardLevel || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改状态">{{ current.rectifyStatus || '待整改' }}</el-descriptions-item>
          <el-descriptions-item label="整改人">{{ current.rectifier || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改期限">{{ current.hazardDeadline || '—' }}</el-descriptions-item>
          <el-descriptions-item label="摄像头">{{ current.cameraName || '—' }}</el-descriptions-item>
          <el-descriptions-item label="点位">{{ current.cameraLocation || '—' }}</el-descriptions-item>
          <el-descriptions-item label="截图来源">{{ sourceTypeLabel(current.sourceType) }}</el-descriptions-item>
          <el-descriptions-item label="最新整改说明">{{ current.rectifyRemark || '—' }}</el-descriptions-item>
          <el-descriptions-item label="整改照片">
            {{ current.rectifyPhotos?.length ? current.rectifyPhotos.join('、') : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="来源">{{ current.source || '—' }}</el-descriptions-item>
          <el-descriptions-item label="关联截图">{{ current.screenshotId || '—' }}</el-descriptions-item>
          <el-descriptions-item label="登记时间">{{ current.uploadTime }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <template v-if="current">
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

        <div v-if="!readonly" class="detail-actions">
          <el-button v-if="canSubmitRectify(current)" type="primary" @click="openSubmitRectify(current)">
            提交整改
          </el-button>
          <el-button v-if="canAccept(current)" type="success" @click="openAccept(current)">验收通过</el-button>
          <el-button v-if="canReject(current)" type="danger" @click="openReject(current)">驳回</el-button>
        </div>
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
.dispatch-hazard-page {
  padding: 16px 20px 20px;
  min-height: calc(100vh - 120px);
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.page-title {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--ap-text-secondary);
  line-height: 1.5;
  max-width: 720px;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.actor-select,
.status-filter {
  width: 120px;
}

.search-input {
  width: 280px;
}

.detail-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  align-items: start;
}

.detail-preview {
  width: 100%;
  min-height: 200px;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a1a;
  border: 1px solid var(--ap-border, #e4e7ed);
}

.detail-img {
  display: block;
  width: 100%;
  height: auto;
  max-height: 360px;
  object-fit: contain;
  background: #111;
}

.detail-empty {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  background: linear-gradient(145deg, #2a3140 0%, #1a2030 55%, #12161f 100%);
  color: #c0c4cc;
  text-align: center;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: #e5eaf3;
}

.empty-sub {
  font-size: 13px;
  color: #a3a6ad;
}

.empty-desc {
  font-size: 12px;
  color: #909399;
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

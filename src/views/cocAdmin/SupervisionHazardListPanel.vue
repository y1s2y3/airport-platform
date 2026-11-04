<script setup>
import HazardSamplingPanel from '../../components/HazardSamplingPanel.vue'
import AttachmentUpload from '../../components/common/AttachmentUpload.vue'
import { matchesHazardIssueProject } from '../../utils/hazardIssueSummary.js'
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { View, Plus, Edit } from '@element-plus/icons-vue'
import {
  getSupervisionHazards,
  SUPERVISION_HAZARD_RECTIFY_STATUSES,
  closeSupervisionHazard,
  saveSupervisionHazard,
  updateSupervisionHazard,
} from '../../utils/cocAdminDeviceStorage.js'

const props = defineProps({
  /** 兼容旧用法：true 时不可关闭 */
  readonly: { type: Boolean, default: true },
  /** 是否可确认关闭（指挥部与项目层级/监理均可关闭）；优先于 readonly */
  allowClose: { type: Boolean, default: undefined },
  /** 项目层级可手动新增隐患 */
  allowCreate: { type: Boolean, default: false },
  /** 项目层级（监理）可编辑隐患；指挥部只读 */
  allowEdit: { type: Boolean, default: false },
  /** 操作留痕用：操作人 / 角色 */
  operator: { type: String, default: '监理用户' },
  operatorRole: { type: String, default: '监理' },
  projectName: { type: String, default: '' },
  projectId: { type: String, default: '' },
  meetingId: { type: String, default: '' },
})
const route = useRoute()

const keyword = ref('')
const statusFilter = ref('')
const list = ref([])
const detailVisible = ref(false)
const current = ref(null)
const formVisible = ref(false)
const editingId = ref('')
const form = ref(emptyManualForm())
const hazardLevels = ['一般', '较大', '重大']

const closeVisible = ref(false)
const closeTarget = ref(null)

const canOperateClose = computed(() =>
  typeof props.allowClose === 'boolean' ? props.allowClose : !props.readonly,
)

const canCreate = computed(() => props.allowCreate && Boolean(props.projectName))

const toolbarScopeTag = computed(() => {
  if (canOperateClose.value && canCreate.value) {
    return { text: '项目级（监理）· 可新增 / 编辑 / 关闭', type: 'success' }
  }
  if (canOperateClose.value) return { text: '指挥部 · 可关闭（不可编辑）', type: 'success' }
  if (canCreate.value) return { text: '项目级 · 可新增', type: 'success' }
  return { text: '仅查看', type: 'info' }
})

function emptyManualForm() {
  return {
    hazardType: 'safety',
    description: '',
    hazardLevel: '一般',
    remark: '',
    hazardPhotos: [],
  }
}

/** 隐患图片：兼容 { name, url } 对象与裸 dataURL 字符串 */
function photoSrc(photo) {
  if (!photo) return ''
  if (typeof photo === 'string') return photo
  return photo.url || ''
}

function hazardPhotos(row) {
  return Array.isArray(row?.hazardPhotos) ? row.hazardPhotos.filter((item) => photoSrc(item)) : []
}

function hazardPreviewList(row) {
  return hazardPhotos(row).map(photoSrc)
}

function load() {
  let rows = props.projectName
    ? getSupervisionHazards().filter(row => row.projectName === props.projectName || matchesHazardIssueProject('supervision', row, props.projectId))
    : getSupervisionHazards()
  if (props.meetingId) {
    rows = rows.filter((item) => item.meetingId === props.meetingId)
  }
  list.value = rows
  const focused = rows.find((item) => item.id === route.query.hazardId)
  if (focused) openDetail(focused)
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

function canEditRow(row) {
  return props.allowEdit && row?.rectifyStatus === '待整改'
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
  editingId.value = ''
  form.value = emptyManualForm()
  formVisible.value = true
}

function openEdit(row) {
  if (!canEditRow(row)) {
    ElMessage.warning('仅「待整改」隐患可编辑')
    return
  }
  editingId.value = row.id
  form.value = {
    hazardType: row.hazardType || 'safety',
    description: row.description || '',
    hazardLevel: row.hazardLevel || '一般',
    remark: row.remark || '',
    hazardPhotos: [...(row.hazardPhotos || [])],
  }
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
  if (editingId.value) {
    const result = updateSupervisionHazard(
      editingId.value,
      {
        hazardType: form.value.hazardType,
        description: String(form.value.description).trim(),
        hazardLevel: form.value.hazardLevel,
        remark: String(form.value.remark || '').trim(),
        hazardPhotos: form.value.hazardPhotos,
      },
      { operator: props.operator, operatorRole: props.operatorRole },
    )
    if (!result.ok) {
      ElMessage.warning(result.msg || '保存失败')
      load()
      return
    }
    formVisible.value = false
    load()
    refreshDetail(editingId.value)
    ElMessage.success(result.changedFields.length ? '隐患已更新' : '内容未变化')
    return
  }
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
    hazardPhotos: form.value.hazardPhotos,
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

function openCloseDialog(row) {
  if (!canConfirmClose(row)) {
    ElMessage.warning('仅「待整改」隐患可确认关闭')
    return
  }
  closeTarget.value = row
  closeVisible.value = true
}

function submitClose() {
  const row = closeTarget.value
  if (!row) return
  const result = closeSupervisionHazard(row.id, {
    operator: props.operator,
    operatorRole: props.operatorRole,
  })
  closeVisible.value = false
  if (!result || result.rectifyStatus !== '已关闭') {
    ElMessage.warning('关闭失败，请确认当前状态为待整改')
    load()
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
watch(() => route.query.hazardId, (id) => {
  if (!id) detailVisible.value = false
  load()
})

defineExpose({ reload: load })
</script>

<template>
  <div class="hazard-tab">
    <div class="tab-toolbar">
      <el-select v-model="statusFilter" placeholder="整改状态" clearable class="status-filter" aria-label="整改状态">
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
        class="search-input" aria-label="搜索隐患描述、备注、项目…"/>
      <el-button v-if="canCreate" type="primary" :icon="Plus" @click="openCreate">新增隐患</el-button>
      <el-tag size="small" :type="toolbarScopeTag.type">{{ toolbarScopeTag.text }}</el-tag>
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
      <el-table-column prop="description" label="隐患描述" min-width="190" show-overflow-tooltip />
      <el-table-column prop="hazardLevel" label="隐患等级" width="88" align="center" />
      <el-table-column label="图片" width="84" align="center">
        <template #default="{ row }">
          <el-image
            v-if="hazardPhotos(row).length"
            :src="photoSrc(hazardPhotos(row)[0])"
            :preview-src-list="hazardPreviewList(row)"
            :z-index="3000"
            preview-teleported
            fit="cover"
            class="cell-photo"
            :alt="`隐患图片 1`"
          />
          <span v-else>--</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" min-width="110" show-overflow-tooltip>
        <template #default="{ row }">{{ row.remark || '--' }}</template>
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
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="canEditRow(row)"
            link
            type="primary"
            :icon="Edit"
            @click="openEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="canConfirmClose(row)"
            link
            type="success"
            @click="openCloseDialog(row)"
          >
            确认关闭
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="formVisible"
      :title="editingId ? '编辑监理隐患' : '新增监理隐患'"
      width="600px"
      destroy-on-close
    >
      <el-form label-width="96px">
        <el-form-item label="项目名称">
          <el-input :model-value="projectName" disabled />
        </el-form-item>
        <el-form-item label="隐患类型" required>
          <el-select v-model="form.hazardType" placeholder="请选择" style="width: 100%" aria-label="请选择">
            <el-option label="安全" value="safety" />
            <el-option label="质量" value="quality" />
          </el-select>
        </el-form-item>
        <el-form-item label="隐患描述" required>
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入隐患描述" aria-label="请输入隐患描述"/>
        </el-form-item>
        <el-form-item label="隐患等级" required>
          <el-select v-model="form.hazardLevel" placeholder="请选择" style="width: 100%" aria-label="请选择">
            <el-option v-for="lv in hazardLevels" :key="lv" :label="lv" :value="lv" />
          </el-select>
        </el-form-item>
        <el-form-item label="隐患图片">
          <AttachmentUpload
            v-model="form.hazardPhotos"
            preset="image"
            :max="9"
            compress
            compact
            hint="选填，最多 9 张，单张 ≤5MB（jpg/png 等图片）"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入" aria-label="请输入"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="closeVisible" title="确认关闭隐患" width="440px" destroy-on-close>
      <p class="close-tip">
        关闭后该隐患状态将变为「已关闭」，且不可再编辑。确认关闭：
        <strong>{{ closeTarget?.description || '--' }}</strong>
      </p>
      <template #footer>
        <el-button @click="closeVisible = false">取消</el-button>
        <el-button type="success" @click="submitClose">确认关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="监理隐患详情" width="660px">
      <template v-if="current">
        <HazardSamplingPanel v-if="current" source="supervision" :record-id="current.id" />
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目名称">{{ current.projectName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="隐患类型">{{ hazardTypeLabel(current.hazardType) }}</el-descriptions-item>
          <el-descriptions-item label="隐患描述">{{ current.description || '--' }}</el-descriptions-item>
          <el-descriptions-item label="隐患等级">{{ current.hazardLevel || '--' }}</el-descriptions-item>
          <el-descriptions-item label="隐患图片">
            <div v-if="hazardPhotos(current).length" class="detail-photos">
              <el-image
                v-for="(photo, index) in hazardPhotos(current)"
                :key="index"
                :src="photoSrc(photo)"
                :preview-src-list="hazardPreviewList(current)"
                :initial-index="index"
                :z-index="3000"
                preview-teleported
                fit="cover"
                class="detail-photo"
                :alt="`隐患图片 ${index + 1}`"
              />
            </div>
            <span v-else>--</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '--' }}</el-descriptions-item>
          <el-descriptions-item label="整改状态">{{ current.rectifyStatus || '待整改' }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ current.source || '--' }}</el-descriptions-item>
          <el-descriptions-item label="关联会议">{{ current.meetingId || '--' }}</el-descriptions-item>
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
                {{ log.action }}：{{ log.fromStatus || '--' }} → {{ log.toStatus }}
              </div>
              <div class="log-meta">{{ log.operator }}（{{ log.operatorRole }}）</div>
              <div v-if="log.remark" class="log-remark">备注：{{ log.remark }}</div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <div v-if="canEditRow(current) || canConfirmClose(current)" class="detail-actions">
          <el-button v-if="canEditRow(current)" type="primary" :icon="Edit" @click="detailVisible = false; openEdit(current)">
            编辑
          </el-button>
          <el-button v-if="canConfirmClose(current)" type="success" @click="openCloseDialog(current)">
            确认关闭
          </el-button>
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

.detail-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-photo {
  width: 96px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  cursor: zoom-in;
}

.cell-photo {
  width: 46px;
  height: 46px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  cursor: zoom-in;
  vertical-align: middle;
}

.close-tip {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

.close-tip strong {
  color: #303133;
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

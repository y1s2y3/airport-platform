<script setup>
import './engineering-work-page.css'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { getCurrentUserSnapshot } from '../../mock/currentUser.js'
import {
  attachRequiredOk,
} from '../../constants/attachmentUpload.js'
import { DANGER_WORK_CATEGORY_OPTIONS } from '../../coc/config/dailyWorkSchema.js'
import EngineeringWorkFormBody from './EngineeringWorkFormBody.vue'
import {
  buildCopyPayloadFromRejected,
  copyEngineeringWorkFromRejected,
  emptyCell,
  findMatSupervisorApprover,
  getEngineeringWorkItems,
  listSelectableDangerWorks,
  submitEngineeringWork,
} from '../../mock/engineeringWork.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, laborProjectId, projectLabel } = useCurrentProject()

const copyFromId = ref(String(route.query.copyFrom || ''))
const copyFromLabel = ref('')
const pickVisible = ref(false)
const pickTableRef = ref(null)
const pickFilterDate = ref('')
const pickFilterCategory = ref('')
/** id → 行，跨筛选保留已勾选 */
const selectedMap = ref(new Map())

const categoryOptions = DANGER_WORK_CATEGORY_OPTIONS.filter((item) => item !== '不涉及危险作业')

function todayDateStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const form = reactive({
  daily_work_id: '',
  daily_work_ids: [],
  works: [],
  snapshot: {},
  personnel_qual_desc: '',
  scheme_files: [],
  briefing_files: [],
  cert_files: [],
  remark: '',
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
})

const allSelectableWorks = computed(() =>
  laborProjectId.value
    ? listSelectableDangerWorks(laborProjectId.value, {
        allowDailyWorkIds: form.daily_work_ids,
      })
    : [],
)

const filteredSelectableWorks = computed(() => {
  const date = String(pickFilterDate.value || '').trim()
  const category = String(pickFilterCategory.value || '').trim()
  return allSelectableWorks.value.filter((row) => {
    if (date && String(row.reportDate || '') !== date) return false
    if (category && String(row.dangerWorkCategory || '') !== category) return false
    return true
  })
})

const selectedCount = computed(() => selectedMap.value.size)

function applySupervisor(userId) {
  form.supervisor_approver_user_id = userId || ''
  const user = findMatSupervisorApprover(userId)
  form.supervisor_approver_name = user?.name || ''
}

function applyWorks(sources) {
  const list = (sources || []).map((src) => ({
    id: src.id,
    reportDate: src.reportDate || '',
    dangerWorkCategory: src.dangerWorkCategory || '',
    workArea: src.workArea || '',
    workContent: src.workContent || '',
    startTime: src.startTime || '',
    endTime: src.endTime || '',
    contractor: src.contractor || '',
    leadUnit: src.leadUnit || '',
    projectName: src.projectName || '',
    ownerProjectManager: src.ownerProjectManager || '',
    ownerSafetyManager: src.ownerSafetyManager || '',
    contractorProjectManager: src.contractorProjectManager || '',
    contractorSafetyManager: src.contractorSafetyManager || '',
    supervisorProjectManager: src.supervisorProjectManager || '',
    supervisorSafetyManager: src.supervisorSafetyManager || '',
    dangerControlMeasures: src.dangerControlMeasures || '',
  }))
  form.works = list
  form.daily_work_ids = list.map((item) => item.id).filter(Boolean)
  form.daily_work_id = form.daily_work_ids[0] || ''
  form.snapshot = list[0] ? { ...list[0] } : {}
}

function syncTableSelection() {
  nextTick(() => {
    const table = pickTableRef.value
    if (!table) return
    table.clearSelection()
    for (const row of filteredSelectableWorks.value) {
      if (selectedMap.value.has(row.id)) table.toggleRowSelection(row, true)
    }
  })
}

function openPick() {
  pickFilterDate.value = todayDateStr()
  pickFilterCategory.value = ''
  const map = new Map()
  for (const item of form.works) {
    if (item?.id) map.set(item.id, item)
  }
  selectedMap.value = map
  pickVisible.value = true
  syncTableSelection()
}

function onPickSelectionChange(rows) {
  const visibleIds = new Set(filteredSelectableWorks.value.map((row) => row.id))
  const next = new Map(selectedMap.value)
  for (const id of visibleIds) {
    if (![...(rows || [])].some((row) => row.id === id)) next.delete(id)
  }
  for (const row of rows || []) {
    next.set(row.id, row)
  }
  selectedMap.value = next
}

function resetPickFilter() {
  pickFilterDate.value = todayDateStr()
  pickFilterCategory.value = ''
}

function confirmPick() {
  if (!selectedMap.value.size) {
    return ElMessage.warning('请至少选择一条危险作业')
  }
  const byId = new Map(allSelectableWorks.value.map((row) => [row.id, row]))
  const sources = [...selectedMap.value.keys()]
    .map((id) => byId.get(id) || selectedMap.value.get(id))
    .filter(Boolean)
  applyWorks(sources)
  pickVisible.value = false
}

function removeWork(id) {
  applyWorks(form.works.filter((item) => item.id !== id))
}

function openSource() {
  if (!copyFromId.value) return
  router.push(`/site-construction/engineering-work/detail?id=${copyFromId.value}`)
}

watch([pickFilterDate, pickFilterCategory], () => {
  if (pickVisible.value) syncTableSelection()
})

onMounted(() => {
  if (copyFromId.value) {
    const payload = buildCopyPayloadFromRejected(copyFromId.value)
    if (!payload) {
      ElMessage.warning('无法从该单复制，请确认其为已驳回申报单')
      copyFromId.value = ''
      return
    }
    applyWorks(getEngineeringWorkItems(payload))
    form.personnel_qual_desc = payload.personnel_qual_desc
    form.scheme_files = payload.scheme_files
    form.briefing_files = payload.briefing_files
    form.cert_files = payload.cert_files
    form.remark = payload.remark || ''
    applySupervisor(payload.supervisor_approver_user_id)
    copyFromLabel.value = payload.copy_from_biz_no || copyFromId.value
    ElMessage.success(`已从驳回单 ${copyFromLabel.value} 预填，请核对后提交（将生成新申报单号）`)
  }
})

function onSubmit() {
  if (isHqSelected.value || !laborProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.daily_work_ids.length) return ElMessage.warning('请选择每日施工作业中的危险作业')
  if (!String(form.personnel_qual_desc || '').trim()) {
    return ElMessage.warning('请填写作业人员及特种作业资质说明')
  }
  if (!attachRequiredOk(form.scheme_files, 1)) return ElMessage.warning('请上传专项施工方案')
  if (!attachRequiredOk(form.cert_files, 1)) return ElMessage.warning('请上传人员资质证明')
  if (!form.supervisor_approver_user_id) return ElMessage.warning('请选择监理审批人')

  const payload = {
    project_id: laborProjectId.value,
    daily_work_ids: [...form.daily_work_ids],
    daily_work_id: form.daily_work_id,
    personnel_qual_desc: form.personnel_qual_desc,
    scheme_files: form.scheme_files,
    briefing_files: form.briefing_files,
    cert_files: form.cert_files,
    remark: form.remark,
    supervisor_approver_user_id: form.supervisor_approver_user_id,
    applicant_name: getCurrentUserSnapshot()?.name || '施工-王工',
  }
  const r = copyFromId.value
    ? copyEngineeringWorkFromRejected(copyFromId.value, payload)
    : submitEngineeringWork(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.biz_no}，状态为审批中，已进入个人中心待办`)
  router.push('/site-construction/engineering-work')
}
</script>

<template>
  <div class="ew-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        施工作业申报 / 工程作业申报 / {{ copyFromLabel ? '重新申报' : '新建' }}
      </div>
      <div class="title-row">
        <h1 class="page-title">{{ copyFromLabel ? '重新申报工程作业' : '新建工程作业申报' }}</h1>
        <el-tag v-if="copyFromLabel" size="small" type="warning" effect="light">
          源单 {{ copyFromLabel }}
        </el-tag>
        <el-button @click="router.push('/site-construction/engineering-work')">返回列表</el-button>
      </div>
      <el-alert
        v-if="copyFromLabel"
        class="mb"
        type="info"
        :closable="false"
        show-icon
        title="重新申报（基于已驳回申报单）"
      >
        <template #default>
          <span>
            已带出源申报单
            <el-button link type="primary" @click="openSource">{{ copyFromLabel }}</el-button>
            的作业与资料，可修改后提交；将生成新单号。
          </span>
        </template>
      </el-alert>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : projectLabel }}</strong>
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="请先切换到具体项目后再填写"
      class="mb"
    />

    <el-form v-else label-width="168px" class="create-form" label-position="right">
      <EngineeringWorkFormBody
        :form="form"
        :project-id="laborProjectId"
        @pick-work="openPick"
        @remove-work="removeWork"
        @supervisor-change="applySupervisor"
      />
      <div class="form-actions">
        <el-button type="primary" @click="onSubmit">提交审批</el-button>
        <el-button @click="router.push('/site-construction/engineering-work')">取消</el-button>
      </div>
    </el-form>

    <el-dialog v-model="pickVisible" title="选择危险作业" width="980px" destroy-on-close>
      <p class="muted mb">可多选；审批中或已通过的不可再选。确定后覆盖当前已选列表。切换筛选时已勾选项会保留。</p>
      <div class="pick-filter-bar mb">
        <el-date-picker
          v-model="pickFilterDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="施工日期"
          clearable
          style="width: 180px"
          aria-label="施工日期"
        />
        <el-select
          v-model="pickFilterCategory"
          clearable
          placeholder="作业类别"
          style="width: 180px"
          aria-label="作业类别"
        >
          <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
        </el-select>
        <el-button @click="resetPickFilter">重置筛选</el-button>
      </div>
      <el-table
        ref="pickTableRef"
        :data="filteredSelectableWorks"
        stripe
        border
        max-height="420"
        row-key="id"
        empty-text="当前筛选下暂无可申报的危险作业"
        @selection-change="onPickSelectionChange"
      >
        <el-table-column type="selection" width="48" align="center" />
        <el-table-column label="施工日期" width="120">
          <template #default="{ row }">{{ emptyCell(row.reportDate) }}</template>
        </el-table-column>
        <el-table-column label="作业类别" width="120">
          <template #default="{ row }">{{ emptyCell(row.dangerWorkCategory) }}</template>
        </el-table-column>
        <el-table-column label="施工区域" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.workArea) }}</template>
        </el-table-column>
        <el-table-column label="当日施工具体内容" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.workContent) }}</template>
        </el-table-column>
        <el-table-column label="作业开始时间" width="160">
          <template #default="{ row }">{{ emptyCell(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="作业结束时间" width="160">
          <template #default="{ row }">{{ emptyCell(row.endTime) }}</template>
        </el-table-column>
        <el-table-column label="施工单位" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.contractor) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <div class="pick-footer">
          <span class="muted">已勾选 {{ selectedCount }} 项</span>
          <div>
            <el-button @click="pickVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmPick">确定</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

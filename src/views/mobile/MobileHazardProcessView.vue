<script setup>
/**
 * APP · 危大工程过程管理（九个过程模块切页，无分页；填报口径对齐 Web）
 */
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getAppSelectedOrg } from '../../mock/appSession.js'
import { DEFAULT_PROJECT_ID, HQ_PROJECT_OPTION } from '../../config/projectOptions.js'
import { selectedProjectId } from '../../composables/useCurrentProject.js'
import { getProjectPersonnel, maskIdCard, maskPhone } from '../../mock/laborRealName.js'
import { listApprovedSubcontractors } from '../../mock/subcontractorManagement.js'
import { DANGER_WORK_CATEGORY_OPTIONS } from '../../coc/config/dailyWorkSchema.js'
import { listAllDangerWorkSources } from '../../mock/engineeringWork.js'
import {
  buildLedgerRows,
  ensureMajorHazardData,
  getMajorHazardData,
  normalizeLedger,
  saveLedger,
} from '../../utils/majorHazardManualStorage.js'
import {
  PROCESS_CONFIGS,
  PROCESS_TABS,
  RECORD_DETAIL_EXAMPLES,
  dangerWorkCount,
  emptyCell,
} from '../../utils/majorHazardProcessConfig.js'

const route = useRoute()
const router = useRouter()
const appBizPageChrome = inject('appBizPageChrome', null)
const isAppEmbed = computed(() => route.path.startsWith('/app/'))
const sourceId = computed(() => String(route.query.sourceId || ''))
const form = ref(null)
const activeTab = ref('scheme')
const processPartFilter = ref('')
const recordDialogVisible = ref(false)
const recordDialogMode = ref('add')
const recordForm = ref({})
const dangerPickVisible = ref(false)
const dangerPickFilterDate = ref('')
const dangerPickFilterCategory = ref('')
const dangerSelectedMap = ref(new Map())
const dangerCategoryOptions = DANGER_WORK_CATEGORY_OPTIONS.filter((item) => item !== '不涉及危险作业')

function resolveProjectId() {
  const org = getAppSelectedOrg()
  const matched = String(org?.id || '').match(/^proj-(.+)$/)
  if (matched?.[1] && matched[1] !== HQ_PROJECT_OPTION.id) return matched[1]
  if (selectedProjectId.value && selectedProjectId.value !== HQ_PROJECT_OPTION.id) return selectedProjectId.value
  return DEFAULT_PROJECT_ID
}

const projectId = computed(() => resolveProjectId())
const currentConfig = computed(() => PROCESS_CONFIGS[activeTab.value])
const currentTab = computed(() => PROCESS_TABS.find((item) => item.key === activeTab.value) || PROCESS_TABS[0])
const canAdd = computed(() => activeTab.value !== 'patrol')
const recordAttachmentLabel = computed(() => ['conditionAcceptance', 'progress', 'acceptance'].includes(activeTab.value) ? '现场照片' : '附件')
const realNamePersonnel = computed(() => getProjectPersonnel(projectId.value).filter((person) => person.entry_status === '在岗'))
const responsibleOptions = computed(() => realNamePersonnel.value.map((person) => {
  const name = person.basic?.name || '未命名人员'
  const position = person.unit?.work_type || person.basic?.category || '人员'
  return `${name}（${String(position).replace(/^特种-/, '')}）`
}))
const subcontractorOptions = computed(() => listApprovedSubcontractors(projectId.value).map((item) => ({
  value: item.name,
  label: `${item.name}${item.unitType ? `（${item.unitType}）` : ''}`,
})))
const allDangerWorks = computed(() => (projectId.value ? listAllDangerWorkSources(projectId.value) : []))
const filteredDangerWorks = computed(() => {
  const date = String(dangerPickFilterDate.value || '').trim()
  const category = String(dangerPickFilterCategory.value || '').trim()
  return allDangerWorks.value.filter((row) => {
    if (date && String(row.reportDate || '') !== date) return false
    if (category && String(row.dangerWorkCategory || '') !== category) return false
    return true
  })
})
const linkedDangerWorks = computed(() => recordForm.value.dangerWorks || [])
const recordAttachmentNames = computed(() => String(recordForm.value.attachmentInfo || '').split('\n').map((item) => item.trim()).filter(Boolean))

const processRows = computed(() => {
  if (!form.value) return []
  const partFilter = String(processPartFilter.value || '')
  return form.value.parts.flatMap((part) => {
    if (partFilter && part.id !== partFilter) return []
    const storedRecords = part.process?.[activeTab.value]?.records || []
    const isDemoLedger = String(form.value.id || '').startsWith('mh-demo-')
    const displayRecords = storedRecords.length || !isDemoLedger || activeTab.value === 'controlPoints'
      ? storedRecords
      : [{
          id: `mh-demo-${activeTab.value}-${part.id}`,
          ...(RECORD_DETAIL_EXAMPLES[activeTab.value] || {}),
          status: '已完成',
          createdBy: '张工',
          createdAt: `${RECORD_DETAIL_EXAMPLES[activeTab.value]?.[currentConfig.value.dateField] || new Date().toISOString().slice(0, 10)} 09:30:00`,
        }]
    return displayRecords.map((record) => {
      const point = form.value.controlPoints.find((item) => item.id === record.controlPointId)
      return {
        ...record,
        partId: part.id,
        partName: part.wbsPath || part.name || '--',
        controlPointContent: point?.content || record.content || record.controlPointContent || '--',
      }
    }).filter(Boolean)
  })
})

function load() {
  const id = projectId.value
  if (!id || !sourceId.value) {
    form.value = null
    return
  }
  ensureMajorHazardData(id)
  const data = getMajorHazardData(id)
  const row = buildLedgerRows(data).find((item) => item.sourceId === sourceId.value)
  form.value = row ? normalizeLedger(row, data) : null
  activeTab.value = 'scheme'
  processPartFilter.value = ''
}

function createBlankRecord() {
  const record = {
    id: '', partId: '', status: '已完成', date: new Date().toISOString().slice(0, 10),
    attachmentInfo: '', dangerWorkIds: [], dangerWorks: [], pointStatuses: [],
  }
  const config = PROCESS_CONFIGS[activeTab.value]
  config.fields.forEach((field) => {
    if (field.default !== undefined) record[field.key] = field.default
    else if (['realNamePeople', 'people', 'inspectionTasks'].includes(field.type)) record[field.key] = []
    else record[field.key] = ''
  })
  if (config.dateField && !record[config.dateField]) record[config.dateField] = record.date
  return record
}

function openAdd() {
  if (!form.value?.parts?.length) return ElMessage.warning('当前危大工程尚未配置施工部位')
  const blank = createBlankRecord()
  if (processPartFilter.value) blank.partId = processPartFilter.value
  else blank.partId = form.value.parts.length === 1 ? form.value.parts[0].id : ''
  if (activeTab.value === 'scheme') {
    const now = new Date()
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    blank.schemeCode = `ZX${ymd}001`
  }
  if (activeTab.value === 'controlPoints') {
    blank.pointStatuses = (form.value.controlPoints || []).map((point) => ({
      controlPointId: point.id,
      content: point.content,
      redStatusText: point.redStatusText || '未落实',
      greenStatusText: point.greenStatusText || '已落实',
      displayStatus: '',
    }))
  }
  recordForm.value = blank
  recordDialogMode.value = 'add'
  recordDialogVisible.value = true
}

function openView(row) {
  recordForm.value = {
    ...createBlankRecord(),
    ...row,
    dangerWorks: row.dangerWorks || RECORD_DETAIL_EXAMPLES.progress?.dangerWorks || [],
    dangerWorkIds: row.dangerWorkIds || (row.dangerWorks || []).map((item) => item.id),
  }
  if (activeTab.value === 'progress' && !recordForm.value.dangerWorks?.length) {
    recordForm.value.dangerWorks = RECORD_DETAIL_EXAMPLES.progress?.dangerWorks || []
  }
  if (!['workerRegistration', 'patrol'].includes(activeTab.value) && !recordForm.value.attachmentInfo) {
    recordForm.value.attachmentInfo = RECORD_DETAIL_EXAMPLES[activeTab.value]?.attachmentInfo || ''
  }
  recordDialogMode.value = 'view'
  recordDialogVisible.value = true
}

function addRecordAttachment(file) {
  if (!file?.name) return
  const names = [...recordAttachmentNames.value]
  if (!names.includes(file.name)) names.push(file.name)
  recordForm.value.attachmentInfo = names.join('\n')
}

function removeRecordAttachment(name) {
  recordForm.value.attachmentInfo = recordAttachmentNames.value.filter((item) => item !== name).join('\n')
}

function snapshotDangerWork(src) {
  return {
    id: src.id,
    reportDate: src.reportDate || '',
    dangerWorkCategory: src.dangerWorkCategory || '',
    workArea: src.workArea || '',
    workContent: src.workContent || '',
    startTime: src.startTime || '',
    endTime: src.endTime || '',
    contractor: src.contractor || '',
  }
}

function applyDangerWorks(sources) {
  const list = (sources || []).map(snapshotDangerWork)
  recordForm.value.dangerWorks = list
  recordForm.value.dangerWorkIds = list.map((item) => item.id)
}

function removeLinkedDangerWork(id) {
  applyDangerWorks((recordForm.value.dangerWorks || []).filter((item) => item.id !== id))
}

function openDangerPick() {
  const map = new Map()
  for (const item of linkedDangerWorks.value) {
    if (item?.id) map.set(item.id, item)
  }
  dangerSelectedMap.value = map
  dangerPickFilterDate.value = String(recordForm.value.recordDate || '').slice(0, 10)
  dangerPickFilterCategory.value = ''
  dangerPickVisible.value = true
}

function toggleDangerPick(row) {
  if (!row?.id) return
  const next = new Map(dangerSelectedMap.value)
  if (next.has(row.id)) next.delete(row.id)
  else next.set(row.id, row)
  dangerSelectedMap.value = next
}

function confirmDangerPick() {
  applyDangerWorks([...dangerSelectedMap.value.values()])
  dangerPickVisible.value = false
}

function realNamePersonRecord(person) {
  const idNumberFull = person.basic?.id_number_raw || person.basic?.id_number || ''
  const phoneFull = person.basic?.phone || ''
  const educationDone = Math.min(3, (person.safety_education || []).filter((item) => item.qualified).length)
  return {
    personId: person.id,
    workerName: person.basic?.name || '',
    idNumber: person.basic?.id_number || maskIdCard(idNumberFull),
    idNumberFull,
    phone: phoneFull ? maskPhone(phoneFull) : '--',
    phoneFull,
    employer: person.unit?.unit_name || '',
    jobType: person.unit?.work_type || '',
    workerType: person.unit?.personnel_category || '',
    entryDate: new Date().toISOString().slice(0, 10),
    isSpecialWorker: person.is_special ? '是' : '否',
    certificateNo: person.cert_no || '',
    certificateExpiry: person.unit?.cert_valid_to || '',
    safetyEducationDone: educationDone,
    safetyEducationTotal: 3,
  }
}

function progressMinValue() {
  const part = form.value?.parts?.find((item) => item.id === recordForm.value.partId)
  const records = part?.process?.progress?.records || []
  return records.reduce((max, record) => Math.max(max, Number(record.executionRate) || 0), 0)
}

function submitRecord() {
  const item = recordForm.value
  if (!item.partId) return ElMessage.warning('请选择施工部位')
  const part = form.value.parts.find((row) => row.id === item.partId)
  const node = part?.process?.[activeTab.value]
  if (!node) return ElMessage.error('过程节点不存在，请刷新后重试')

  if (activeTab.value === 'progress') {
    const lastRate = progressMinValue()
    if (lastRate && Number(item.executionRate || 0) < lastRate) {
      return ElMessage.warning(`执行率不能小于上一次填报的 ${lastRate}%`)
    }
  }

  if (activeTab.value === 'workerRegistration') {
    const selectedPeople = realNamePersonnel.value.filter((person) => (item.personIds || []).includes(person.id))
    if (!selectedPeople.length) return ElMessage.warning('请至少选择一名实名制人员')
    const createdAt = new Date().toLocaleString('zh-CN', { hour12: false })
    const date = new Date().toISOString().slice(0, 10)
    selectedPeople.forEach((person, index) => {
      const personInfo = realNamePersonRecord(person)
      node.records.push({
        ...personInfo,
        id: `mh-workerRegistration-record-${Date.now()}-${index}`,
        status: '已完成',
        date,
        responsible: personInfo.workerName,
        content: personInfo.jobType,
        attachmentInfo: '',
        createdBy: '当前用户',
        createdAt,
      })
    })
    Object.assign(node, { status: '已完成', date, responsible: '当前用户', content: `完成 ${selectedPeople.length} 名作业人员登记`, attachmentInfo: '' })
    saveLedger(projectId.value, form.value)
    recordDialogVisible.value = false
    ElMessage.success(`已登记 ${selectedPeople.length} 名作业人员`)
    return
  }

  if (activeTab.value === 'controlPoints') {
    const pointStatuses = item.pointStatuses || []
    if (!pointStatuses.length) return ElMessage.warning('当前类别描述尚未配置管控要点')
    const unsetPoint = pointStatuses.find((row) => !['red', 'green'].includes(row.displayStatus))
    if (unsetPoint) return ElMessage.warning(`请选择管控要点“${unsetPoint.content}”的显示状态`)
    const date = new Date().toISOString().slice(0, 10)
    const createdAt = new Date().toLocaleString('zh-CN', { hour12: false })
    const hasRed = pointStatuses.some((row) => row.displayStatus === 'red')
    pointStatuses.forEach((row, index) => {
      const displayStatusText = row.displayStatus === 'red' ? row.redStatusText : row.greenStatusText
      node.records.push({
        id: `mh-controlPoints-record-${Date.now()}-${index}`,
        controlPointId: row.controlPointId,
        content: row.content,
        redStatusText: row.redStatusText,
        greenStatusText: row.greenStatusText,
        displayStatus: row.displayStatus,
        displayStatusText,
        status: row.displayStatus === 'green' ? '已落实' : '需整改',
        date,
        responsible: '当前用户',
        attachmentInfo: item.attachmentInfo,
        createdBy: '当前用户',
        createdAt,
      })
    })
    Object.assign(node, {
      status: hasRed ? '需整改' : '已落实',
      date,
      responsible: '当前用户',
      content: `完成 ${pointStatuses.length} 项管控要点检查`,
      attachmentInfo: item.attachmentInfo,
    })
    saveLedger(projectId.value, form.value)
    recordDialogVisible.value = false
    ElMessage.success('管控要点记录新增成功')
    return
  }

  const missing = currentConfig.value.fields.find((field) => field.required && (Array.isArray(item[field.key]) ? !item[field.key].length : item[field.key] === '' || item[field.key] === undefined || item[field.key] === null))
  if (missing) return ElMessage.warning(`请填写${missing.label}`)
  if (!['workerRegistration', 'patrol'].includes(activeTab.value) && !recordAttachmentNames.value.length) {
    return ElMessage.warning(`请上传${recordAttachmentLabel.value}`)
  }

  const dateField = currentConfig.value.dateField
  const record = {
    ...item,
    id: `mh-${activeTab.value}-record-${Date.now()}`,
    status: item.acceptanceResult === '不合格' ? '不合格' : '已完成',
    date: item[dateField] || item.date || new Date().toISOString().slice(0, 10),
    responsible: item[currentConfig.value.responsibleField] || '当前用户',
    content: item[currentConfig.value.summaryField] || '',
    createdBy: '当前用户',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  if (item.acceptanceResult) record.result = item.acceptanceResult
  delete record.partId
  delete record.partName
  delete record.pointStatuses
  node.records.push(record)
  Object.assign(node, {
    status: record.status,
    date: record.date,
    responsible: record.responsible,
    result: record.result,
    content: record.content,
    attachmentInfo: record.attachmentInfo,
  })
  saveLedger(projectId.value, form.value)
  recordDialogVisible.value = false
  ElMessage.success(`${currentTab.value.label}记录新增成功`)
}

function summaryText(row) {
  if (activeTab.value === 'progress') return `执行率 ${row.executionRate ?? '--'}% · 危险作业 ${dangerWorkCount(row)} 条`
  if (activeTab.value === 'workerRegistration') return `${row.workerName || '--'} · ${row.jobType || '--'}`
  if (activeTab.value === 'controlPoints') return row.controlPointContent || row.content || '--'
  const key = currentConfig.value.summaryField
  return row[key] || row.content || '--'
}

function goBack() {
  const base = route.path.startsWith('/app/') ? '/app/hazard' : '/mobile/hazard'
  router.push(base)
}

function syncAppChrome() {
  if (!appBizPageChrome) return
  if (dangerPickVisible.value) {
    appBizPageChrome.setTitle('选择危险作业')
    appBizPageChrome.setBackInterceptor(() => {
      dangerPickVisible.value = false
      return true
    })
    return
  }
  if (recordDialogVisible.value) {
    const prefix = recordDialogMode.value === 'view' ? '查看' : '新增'
    appBizPageChrome.setTitle(`${prefix}${currentTab.value.label}`)
    appBizPageChrome.setBackInterceptor(() => {
      recordDialogVisible.value = false
      return true
    })
    return
  }
  const name = String(form.value?.name || '').trim()
  appBizPageChrome.setTitle(name ? `过程管理 · ${name}` : '过程管理')
  appBizPageChrome.setBackInterceptor(null)
}

watch([projectId, sourceId], load, { immediate: true })
watch([recordDialogVisible, dangerPickVisible, recordDialogMode, activeTab, form], syncAppChrome, { immediate: true })
onBeforeUnmount(() => {
  appBizPageChrome?.clear?.()
})
</script>

<template>
  <div class="mp" :class="{ 'sheet-open': recordDialogVisible || dangerPickVisible }">
    <header class="mh">
      <button type="button" class="mb" @click="goBack">‹</button>
      <h1 class="mt">过程管理</h1>
      <span class="mh-spacer" />
    </header>

    <template v-if="form">
      <div class="title-bar">
        <div class="title" :title="form.name">{{ form.name }}</div>
        <div class="sub">
          <span class="sub-cat">{{ form.categoryName || '--' }}</span>
          <span class="sub-dot">·</span>
          <span>过程管控</span>
        </div>
      </div>

      <div class="tab-wrap">
        <button
          v-for="tab in PROCESS_TABS"
          :key="tab.key"
          type="button"
          class="tab-chip"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span v-if="tab.requiredStar" class="star">*</span>{{ tab.label }}
        </button>
      </div>

      <div class="toolbar">
        <span>共 {{ processRows.length }} 条</span>
        <button v-if="canAdd" type="button" class="add-btn" @click="openAdd"><el-icon><Plus /></el-icon>新增</button>
        <span v-else class="tip">现场巡视由巡检任务自动同步</span>
      </div>

      <div class="part-switch">
        <span class="part-switch-label">施工部位</span>
        <el-select v-model="processPartFilter" clearable placeholder="全部部位" class="part-switch-select">
          <el-option
            v-for="part in form.parts"
            :key="part.id"
            :label="part.wbsPath || part.name || '--'"
            :value="part.id"
          />
        </el-select>
      </div>

      <div class="list-body">
        <div v-if="!processRows.length" class="empty">暂无{{ currentTab.label }}记录</div>
        <button v-for="row in processRows" :key="row.id" type="button" class="card" @click="openView(row)">
          <div class="card-top">
            <span class="part-name">{{ row.partName }}</span>
            <span class="time">{{ row.createdAt || row.date || '--' }}</span>
          </div>
          <div class="card-title">{{ summaryText(row) }}</div>
          <div class="card-meta">创建人：{{ row.createdBy || row.responsible || '--' }}</div>
        </button>
      </div>
    </template>
    <div v-else class="empty">未找到该危大工程</div>

    <!-- APP 样式：新增/查看记录（全屏页式） -->
    <div v-if="recordDialogVisible" class="app-sheet" role="dialog" aria-modal="true">
      <header v-if="!isAppEmbed" class="app-sheet-hd">
        <button type="button" class="app-sheet-back" @click="recordDialogVisible = false">‹</button>
        <h2 class="app-sheet-title">{{ recordDialogMode === 'view' ? '查看' : '新增' }}{{ currentTab.label }}</h2>
        <button
          v-if="recordDialogMode === 'add'"
          type="button"
          class="app-sheet-action"
          @click="submitRecord"
        >提交</button>
        <span v-else class="app-sheet-action ghost" />
      </header>
      <div class="app-sheet-bd">
        <div class="form-block">
          <label class="form-label required">施工部位</label>
          <el-select
            v-model="recordForm.partId"
            :disabled="recordDialogMode === 'view'"
            placeholder="请选择施工部位"
            style="width:100%"
            :teleported="false"
          >
            <el-option v-for="part in form?.parts || []" :key="part.id" :label="part.wbsPath || part.name" :value="part.id" />
          </el-select>
        </div>

        <template v-if="activeTab === 'controlPoints'">
          <div class="form-block">
            <label class="form-label">管控要点</label>
            <div v-if="!(recordForm.pointStatuses || []).length" class="muted">暂无管控要点</div>
            <div v-for="row in (recordForm.pointStatuses || [])" :key="row.controlPointId" class="point-card">
              <div class="point-content">{{ row.content }}</div>
              <el-tag v-if="recordDialogMode === 'view'" size="small" :type="row.displayStatus === 'red' ? 'danger' : 'success'">
                {{ row.displayStatus === 'red' ? row.redStatusText : row.greenStatusText }}
              </el-tag>
              <el-select v-else v-model="row.displayStatus" placeholder="请选择状态" style="width:100%" :teleported="false">
                <el-option :label="`红：${row.redStatusText}`" value="red" />
                <el-option :label="`绿：${row.greenStatusText}`" value="green" />
              </el-select>
            </div>
          </div>
        </template>

        <template v-else>
          <div v-for="field in currentConfig.fields" :key="field.key" class="form-block">
            <label class="form-label" :class="{ required: field.required }">{{ field.label }}</label>
            <el-select v-if="field.type === 'select'" v-model="recordForm[field.key]" :disabled="recordDialogMode === 'view'" style="width:100%" :teleported="false">
              <el-option v-for="option in field.options" :key="option" :label="option" :value="option" />
            </el-select>
            <el-select v-else-if="field.type === 'person'" v-model="recordForm[field.key]" :disabled="recordDialogMode === 'view' || field.readonly" filterable style="width:100%" :teleported="false">
              <el-option v-for="item in responsibleOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-select v-else-if="field.type === 'people'" v-model="recordForm[field.key]" multiple filterable :disabled="recordDialogMode === 'view'" style="width:100%" :teleported="false">
              <el-option v-for="item in responsibleOptions" :key="item" :label="item" :value="item" />
            </el-select>
            <el-select v-else-if="field.type === 'subcontractor'" v-model="recordForm[field.key]" filterable :disabled="recordDialogMode === 'view'" style="width:100%" :teleported="false">
              <el-option v-for="item in subcontractorOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-select v-else-if="field.type === 'realNamePeople'" v-model="recordForm[field.key]" multiple filterable :disabled="recordDialogMode === 'view'" style="width:100%" :teleported="false">
              <el-option v-for="person in realNamePersonnel" :key="person.id" :label="person.basic?.name" :value="person.id" />
            </el-select>
            <el-date-picker v-else-if="field.type === 'date'" v-model="recordForm[field.key]" type="date" value-format="YYYY-MM-DD" :disabled="recordDialogMode === 'view'" style="width:100%" :teleported="false" />
            <el-date-picker v-else-if="field.type === 'datetime'" v-model="recordForm[field.key]" type="datetime" value-format="YYYY-MM-DD HH:mm" :disabled="recordDialogMode === 'view'" style="width:100%" :teleported="false" />
            <el-input-number v-else-if="field.type === 'number'" v-model="recordForm[field.key]" :disabled="recordDialogMode === 'view'" :min="0" :max="100" style="width:100%" />
            <el-input v-else-if="field.type === 'textarea'" v-model="recordForm[field.key]" type="textarea" :rows="3" :disabled="recordDialogMode === 'view'" />
            <el-input v-else v-model="recordForm[field.key]" :disabled="recordDialogMode === 'view' || field.readonly" />
          </div>
        </template>

        <div v-if="activeTab === 'progress'" class="form-block">
          <label class="form-label">关联危险作业</label>
          <div class="danger-block">
            <button v-if="recordDialogMode !== 'view'" type="button" class="link-btn" @click="openDangerPick">选择关联</button>
            <div v-if="linkedDangerWorks.length" class="danger-list">
              <div v-for="row in linkedDangerWorks" :key="row.id" class="danger-item">
                <div class="danger-main">
                  <strong>{{ emptyCell(row.dangerWorkCategory) }}</strong>
                  <span>{{ emptyCell(row.workArea) }}</span>
                </div>
                <button v-if="recordDialogMode !== 'view'" type="button" class="danger-remove" @click="removeLinkedDangerWork(row.id)">移除</button>
              </div>
            </div>
            <p v-else class="muted">暂无关联危险作业</p>
          </div>
        </div>

        <div v-if="!['workerRegistration', 'patrol'].includes(activeTab)" class="form-block">
          <label class="form-label required">{{ recordAttachmentLabel }}</label>
          <div class="attach-list">
            <div v-for="name in recordAttachmentNames" :key="name" class="attach-item">
              <span>{{ name }}</span>
              <button v-if="recordDialogMode !== 'view'" type="button" class="danger-remove" @click="removeRecordAttachment(name)">删除</button>
            </div>
            <el-upload v-if="recordDialogMode !== 'view'" :auto-upload="false" :show-file-list="false" accept=".jpg,.jpeg,.png,.webp,.pdf" @change="addRecordAttachment">
              <button type="button" class="upload-btn">{{ recordAttachmentLabel === '现场照片' ? '添加图片' : '上传附件' }}</button>
            </el-upload>
          </div>
        </div>
      </div>
      <div class="app-sheet-ft">
        <button type="button" class="ft-btn" @click="recordDialogVisible = false">关闭</button>
        <button v-if="recordDialogMode === 'add'" type="button" class="ft-btn primary" @click="submitRecord">提交</button>
      </div>
    </div>

    <!-- APP 样式：选择危险作业 -->
    <div v-if="dangerPickVisible" class="app-sheet nested" role="dialog" aria-modal="true">
      <header v-if="!isAppEmbed" class="app-sheet-hd">
        <button type="button" class="app-sheet-back" @click="dangerPickVisible = false">‹</button>
        <h2 class="app-sheet-title">选择危险作业</h2>
        <button type="button" class="app-sheet-action" @click="confirmDangerPick">确定</button>
      </header>
      <div class="app-sheet-bd">
        <div class="pick-filter">
          <el-date-picker v-model="dangerPickFilterDate" type="date" value-format="YYYY-MM-DD" placeholder="施工日期" clearable style="width:48%" :teleported="false" />
          <el-select v-model="dangerPickFilterCategory" clearable placeholder="作业类别" style="width:48%" :teleported="false">
            <el-option v-for="item in dangerCategoryOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </div>
        <div v-if="!filteredDangerWorks.length" class="empty">当前筛选下暂无危险作业</div>
        <button
          v-for="row in filteredDangerWorks"
          :key="row.id"
          type="button"
          class="pick-card"
          :class="{ selected: dangerSelectedMap.has(row.id) }"
          @click="toggleDangerPick(row)"
        >
          <span class="pick-check">{{ dangerSelectedMap.has(row.id) ? '✓' : '' }}</span>
          <div class="pick-info">
            <div class="pick-title">{{ emptyCell(row.dangerWorkCategory) }} · {{ emptyCell(row.workArea) }}</div>
            <div class="pick-meta">{{ emptyCell(row.reportDate) }} · {{ emptyCell(row.workContent) }}</div>
          </div>
        </button>
      </div>
      <div class="app-sheet-ft">
        <button type="button" class="ft-btn" @click="dangerPickVisible = false">取消</button>
        <button type="button" class="ft-btn primary" @click="confirmDangerPick">确定（{{ dangerSelectedMap.size }}）</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp {
  position: relative;
  width: 100%;
  max-width: 402px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  padding-bottom: 32px;
}
.mp.sheet-open {
  overflow: hidden;
  padding-bottom: 0;
}
.mh {
  display: flex;
  align-items: center;
  height: 88px;
  padding: 0 16px;
  background: #8f0045;
  color: #fff;
}
.mb {
  width: 56px;
  height: 56px;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 42px;
  line-height: 1;
}
.mt {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 34px;
  font-weight: 600;
}
.mh-spacer { width: 56px; }
.title-bar {
  margin: 10px 14px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
}
.title {
  color: #1f2329;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 3px;
  color: #667085;
  font-size: 11px;
  line-height: 1.3;
}
.sub-cat {
  max-width: 70%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub-dot { color: #c0c4cc; }
.tab-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 14px 4px;
}
.tab-chip {
  flex: 0 0 auto;
  height: 26px;
  padding: 0 10px;
  border: 1px solid #e4e7ed;
  border-radius: 13px;
  background: #fff;
  color: #667085;
  font-size: 11px;
  white-space: nowrap;
  line-height: 24px;
}
.tab-chip.active {
  border-color: #8f0045;
  background: #faf2f6;
  color: #8f0045;
  font-weight: 600;
}
.star { color: #f56c6c; margin-right: 2px; font-weight: 700; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px 0;
  color: #667085;
  font-size: 11px;
}
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: #8f0045;
  color: #fff;
  font-size: 12px;
}
.tip { color: #b54708; font-size: 11px; }
.part-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 14px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
}
.part-switch-label {
  flex: 0 0 auto;
  color: #667085;
  font-size: 11px;
}
.part-switch-select { flex: 1; min-width: 0; }
.list-body { padding: 8px 14px; display: flex; flex-direction: column; gap: 6px; }
.card {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 0;
  border-radius: 8px;
  background: #fff;
}
.card-top { display: flex; justify-content: space-between; gap: 8px; color: #98a2b3; font-size: 10px; }
.part-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.time { flex: 0 0 auto; }
.card-title { margin-top: 4px; color: #1f2329; font-size: 12px; font-weight: 600; line-height: 1.35; }
.card-meta { margin-top: 3px; color: #667085; font-size: 11px; }
.empty { padding: 40px 16px; text-align: center; color: #98a2b3; font-size: 12px; }
.danger-block, .attach-list { width: 100%; }
.attach-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px; gap: 8px; }
.muted { color: #98a2b3; font-size: 11px; margin: 6px 0 0; }
.pick-filter { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
:deep(.part-switch-select .el-select__wrapper) {
  min-height: 28px;
  font-size: 12px;
}

/* APP 全屏页式弹层 */
.app-sheet {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #f5f5f5;
}
.app-sheet.nested { z-index: 50; }
.app-sheet-hd {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 8px;
  background: #8f0045;
  color: #fff;
  flex-shrink: 0;
}
.app-sheet-back {
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 24px;
  line-height: 1;
}
.app-sheet-title {
  flex: 1;
  margin: 0;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
}
.app-sheet-action {
  min-width: 36px;
  height: 28px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.app-sheet-action.ghost { visibility: hidden; }
.app-sheet-bd {
  flex: 1;
  overflow: auto;
  padding: 10px 14px 72px;
  -webkit-overflow-scrolling: touch;
}
.app-sheet-ft {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 8px;
  padding: 8px 14px calc(8px + env(safe-area-inset-bottom, 0));
  background: #fff;
  border-top: 1px solid #eef0f3;
  flex-shrink: 0;
}
.ft-btn {
  flex: 1;
  height: 34px;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  font-size: 12px;
}
.ft-btn.primary {
  border-color: #8f0045;
  background: #8f0045;
  color: #fff;
}
.form-block { margin-bottom: 12px; }
.form-label {
  display: block;
  margin-bottom: 5px;
  color: #667085;
  font-size: 11px;
}
.form-label.required::before {
  content: '*';
  color: #f56c6c;
  margin-right: 2px;
}
.point-card {
  margin-top: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
}
.point-content {
  margin-bottom: 6px;
  color: #1f2329;
  font-size: 12px;
  line-height: 1.35;
}
.link-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #8f0045;
  border-radius: 7px;
  background: #faf2f6;
  color: #8f0045;
  font-size: 12px;
}
.danger-list { margin-top: 6px; display: flex; flex-direction: column; gap: 6px; }
.danger-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
}
.danger-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #667085;
}
.danger-main strong { color: #1f2329; font-size: 12px; }
.danger-remove {
  border: 0;
  background: transparent;
  color: #f56c6c;
  font-size: 11px;
  padding: 0;
}
.upload-btn {
  height: 28px;
  padding: 0 10px;
  border: 1px dashed #d0d5dd;
  border-radius: 7px;
  background: #fff;
  color: #667085;
  font-size: 12px;
}
.pick-card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  margin-bottom: 6px;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  text-align: left;
}
.pick-card.selected {
  border-color: #8f0045;
  background: #faf2f6;
}
.pick-check {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  border: 1px solid #d0d5dd;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #8f0045;
  font-size: 11px;
  font-weight: 700;
  background: #fff;
}
.pick-card.selected .pick-check {
  border-color: #8f0045;
  background: #8f0045;
  color: #fff;
}
.pick-info { flex: 1; min-width: 0; }
.pick-title { color: #1f2329; font-size: 12px; font-weight: 600; line-height: 1.35; }
.pick-meta { margin-top: 3px; color: #667085; font-size: 11px; line-height: 1.35; }
:deep(.app-sheet .el-select__wrapper),
:deep(.app-sheet .el-input__wrapper) {
  min-height: 30px;
  font-size: 12px;
}
:deep(.app-sheet .el-popper) {
  max-width: 100%;
}
:deep(.el-tag) {
  height: 20px;
  padding: 0 6px;
  font-size: 10px;
  line-height: 18px;
}
</style>

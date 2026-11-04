<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Upload, Download, Search, Refresh, Delete, Edit, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import { findProjectById } from '../../mock/projectBasicInfo.js'
import {
  MAJOR_WORK_REGISTER_FIELDS,
  DAILY_WORK_DEFAULT_LEAD_UNIT,
} from '../../coc/config/dailyWorkSchema.js'
import {
  deriveReportDateFromMajorStart,
  findDuplicateMajorWorkRegister,
  getMajorWorkRegisterRecords,
  majorWorkDuplicateKey,
  removeMajorWorkRegisterRecord,
  saveMajorWorkRegisterRecord,
} from '../../coc/utils/dailyWorkStorage.js'
import {
  downloadMajorWorkRegisterTemplate,
  exportMajorWorkRegisterRecords,
  parseMajorWorkRegisterFile,
} from '../../coc/utils/dailyWorkImport.js'

const { selectedProjectId, isHqSelected } = useCurrentProject()

const SOURCE_LABEL = {
  manual: '人工登记',
  import: '表格导入',
  seed: '演示数据',
}

const list = ref([])
const keyword = ref('')
const categoryFilter = ref('')
const contractorFilter = ref('')
const projectFilter = ref('')
const dateRange = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const detailVisible = ref(false)
const detailRow = ref(null)
const dialogMode = ref('create')
const formRef = ref(null)
const form = ref(createEmptyForm())

const importVisible = ref(false)
const importLoading = ref(false)
const importFileName = ref('')
const importRecords = ref([])
const importErrors = ref([])
const importTotal = ref(0)
const importDuplicates = computed(() => importRecords.value.filter((item) => item._duplicate).length)
const importSavable = computed(() => importRecords.value.filter((item) => !item._duplicate))

const isHq = computed(() => isHqSelected.value)
const canManage = computed(() => !isHqSelected.value)

const currentProject = computed(() => findProjectById(selectedProjectId.value))
const currentProjectName = computed(() => currentProject.value?.projectName || currentProject.value?.shortName || '')

const projectOptions = computed(() =>
  COC_PROJECT_OPTIONS.map((item) => ({ id: item.id, label: item.label, fullName: item.fullName })),
)

const knownProjectNames = computed(() => {
  const names = []
  projectOptions.value.forEach((item) => {
    if (item.label) names.push(item.label)
    if (item.fullName) names.push(item.fullName)
  })
  return names
})

function createEmptyForm() {
  return {
    id: '',
    projectId: '',
    leadUnit: DAILY_WORK_DEFAULT_LEAD_UNIT,
    projectName: '',
    contractor: '',
    majorWorkContent: '',
    majorProjectCategory: '',
    majorStartTime: '',
    majorEndTime: '',
    majorOwnerSafetyManager: '',
    majorContractorSafetyManager: '',
    majorSupervisorSafetyManager: '',
    majorControlMeasures: '',
  }
}

function sourceLabel(source) {
  return SOURCE_LABEL[source] || source || '--'
}

function statusTagType(status) {
  if (status === '进行中') return 'primary'
  if (status === '已结束') return 'success'
  return 'info'
}

function displayCell(value) {
  const text = String(value ?? '').trim()
  return text || '--'
}

function load() {
  list.value = getMajorWorkRegisterRecords()
  currentPage.value = 1
}

function normName(value) {
  return String(value || '').replace(/\s+/g, '').trim()
}

function projectNameMatches(projectId, rowProjectName) {
  const option = projectOptions.value.find((item) => item.id === projectId)
  if (!option) return false
  const names = [option.label, option.fullName].filter(Boolean).map(normName)
  const rowName = normName(rowProjectName)
  if (!rowName) return false
  return names.some((name) => name && (name === rowName || rowName.includes(name) || name.includes(rowName)))
}

function rowInScope(row, scopeId) {
  if (!scopeId) return true
  if (row.projectId) return row.projectId === scopeId
  return projectNameMatches(scopeId, row.projectName)
}

const categoryOptions = computed(() => {
  const set = new Set()
  list.value.forEach((item) => {
    const value = String(item.category || '').trim()
    if (value) set.add(value)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
})

const contractorOptions = computed(() => {
  const set = new Set()
  list.value.forEach((item) => {
    const value = String(item.contractor || '').trim()
    if (value) set.add(value)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
})

const filteredList = computed(() => {
  const q = keyword.value.trim()
  const cat = categoryFilter.value
  const contractor = contractorFilter.value
  const [dateStart, dateEnd] = dateRange.value || []
  const scopeId = isHqSelected.value ? projectFilter.value : selectedProjectId.value
  return list.value.filter((row) => {
    if (!rowInScope(row, scopeId)) return false
    if (cat && row.category !== cat) return false
    if (contractor && row.contractor !== contractor) return false
    if (dateStart && row.reportDate && row.reportDate < dateStart) return false
    if (dateEnd && row.reportDate && row.reportDate > dateEnd) return false
    if (q) {
      const haystack = [row.workContent, row.category, row.contractor, row.projectName, row.ownerSafety, row.contractorSafety, row.supervisorSafety, row.measures]
      if (!haystack.some((value) => String(value || '').includes(q))) return false
    }
    return true
  })
})

const total = computed(() => filteredList.value.length)
const maxPage = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

watch([total, pageSize], () => {
  if (currentPage.value > maxPage.value) currentPage.value = maxPage.value
})

watch([selectedProjectId, isHqSelected], () => {
  projectFilter.value = ''
  load()
})

function resetFilters() {
  keyword.value = ''
  categoryFilter.value = ''
  contractorFilter.value = ''
  projectFilter.value = ''
  dateRange.value = []
  currentPage.value = 1
}

function isContactLike(value) {
  const text = String(value || '').trim()
  if (!text) return false
  return text.split(/[,，;；]/).every((part) => {
    const item = part.trim()
    if (!item) return false
    const phone = item.includes('/') ? item.split('/').pop().trim() : item
    return /\d{11}/.test(phone)
  })
}

function contactValidator(message) {
  return (rule, value, callback) => {
    if (!String(value || '').trim()) return callback(new Error(message))
    if (!isContactLike(value)) return callback(new Error('格式应为「姓名/11位手机号」，多人用逗号分隔'))
    return callback()
  }
}

function timeCompareValidator(rule, value, callback) {
  const start = String(form.value.majorStartTime || '')
  const end = String(value || '')
  if (!end) return callback(new Error('请选择作业结束时间'))
  if (start && end <= start) return callback(new Error('作业结束时间必须晚于开始时间'))
  return callback()
}

const formRules = {
  leadUnit: [{ required: true, message: '请填写管理单位', trigger: 'blur' }],
  contractor: [{ required: true, message: '请填写施工单位', trigger: 'blur' }],
  majorProjectCategory: [{ required: true, message: '请填写危大工程作业类别', trigger: 'blur' }],
  majorStartTime: [{ required: true, message: '请选择作业开始时间', trigger: 'change' }],
  majorEndTime: [
    { required: true, message: '请选择作业结束时间', trigger: 'change' },
    { validator: timeCompareValidator, trigger: 'change' },
  ],
  majorOwnerSafetyManager: [{ validator: contactValidator('请填写建设单位现场安全监管人及手机号'), trigger: 'blur' }],
  majorContractorSafetyManager: [{ validator: contactValidator('请填写施工单位现场安全监管人及手机号'), trigger: 'blur' }],
  majorControlMeasures: [{ required: true, message: '请填写风险管控措施', trigger: 'blur' }],
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = createEmptyForm()
  form.value.projectId = selectedProjectId.value
  form.value.projectName = currentProjectName.value
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function openEdit(row) {
  dialogMode.value = 'edit'
  form.value = {
    id: row.recordId,
    projectId: row.projectId || '',
    leadUnit: row.leadUnit || DAILY_WORK_DEFAULT_LEAD_UNIT,
    projectName: row.projectName || '',
    contractor: row.contractor || '',
    majorWorkContent: row.workContent || '',
    majorProjectCategory: row.category || '',
    majorStartTime: row.startTime || '',
    majorEndTime: row.endTime || '',
    majorOwnerSafetyManager: row.ownerSafety || '',
    majorContractorSafetyManager: row.contractorSafety || '',
    majorSupervisorSafetyManager: row.supervisorSafety || '',
    majorControlMeasures: row.measures || '',
  }
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

async function submitForm() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  const result = saveMajorWorkRegisterRecord({ ...form.value, source: dialogMode.value === 'edit' ? undefined : 'manual' })
  if (!result.ok) {
    ElMessage.warning(result.msg || '保存失败')
    return
  }
  ElMessage.success(dialogMode.value === 'create' ? '危大工程信息已登记' : '危大工程信息已更新')
  dialogVisible.value = false
  load()
}

function openDetail(row) {
  detailRow.value = row
  detailVisible.value = true
}

function formatMomentText(value) {
  const text = String(value || '').trim()
  if (!text) return '--'
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  const pad = (num) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function handleDelete(row) {
  const tip = row.hasDangerPart
    ? `该记录同时包含危险作业信息，「删除」将只清除其中的危大工程信息，危险作业数据保留。确认继续？`
    : `确认删除该危大工程登记记录（${row.projectName || '--'} · ${row.category || '--'}）？`
  try {
    await ElMessageBox.confirm(tip, '删除危大工程信息', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  const result = removeMajorWorkRegisterRecord(row.recordId)
  if (!result.ok) {
    ElMessage.warning('记录不存在或已被删除')
    load()
    return
  }
  ElMessage.success(result.mode === 'major-cleared' ? '已清除危大工程信息（危险作业数据保留）' : '已删除')
  load()
}

function downloadTemplate() {
  downloadMajorWorkRegisterTemplate()
  ElMessage.success('模版已下载，请按表头填写后导入')
}

async function onFileChange(uploadFile) {
  const file = uploadFile?.raw
  if (!file) return
  importLoading.value = true
  importFileName.value = file.name
  importRecords.value = []
  importErrors.value = []
  importTotal.value = 0
  try {
    const result = await parseMajorWorkRegisterFile(file, {
      defaultProjectName: isHqSelected.value ? '' : currentProjectName.value,
      projectNames: knownProjectNames.value,
    })
    const importedKeys = new Set()
    importRecords.value = result.records.map((record) => {
      const key = majorWorkDuplicateKey(record)
      const duplicated = Boolean(findDuplicateMajorWorkRegister(record)) || importedKeys.has(key)
      importedKeys.add(key)
      return { ...record, _duplicate: duplicated }
    })
    importErrors.value = result.errors
    importTotal.value = result.total
    if (!result.records.length && !result.errors.length) {
      ElMessage.warning('未解析到数据行，请检查模板格式')
    }
  } catch (error) {
    ElMessage.error(`文件解析失败：${error?.message || error}`)
  } finally {
    importLoading.value = false
  }
}

function confirmImport() {
  const rows = importSavable.value
  if (!rows.length) {
    ElMessage.warning(importDuplicates.value ? '解析出的数据均为重复记录，重复不入库' : '没有可导入的数据行')
    return
  }
  let failed = 0
  let duplicated = 0
  rows.forEach((record) => {
    const { _duplicate, ...payload } = record
    const result = saveMajorWorkRegisterRecord({ ...payload, projectId: selectedProjectId.value, source: 'import' })
    if (result.ok) return
    if (result.code === 'duplicate') duplicated += 1
    else failed += 1
  })
  const successCount = rows.length - failed - duplicated
  const skipped = duplicated + importDuplicates.value
  const parts = [`成功 ${successCount} 条`]
  if (skipped) parts.push(`重复跳过 ${skipped} 条`)
  if (failed) parts.push(`失败 ${failed} 条`)
  const message = `导入完成：${parts.join('，')}`
  if (failed || skipped) ElMessage.warning(message)
  else ElMessage.success(message)
  importVisible.value = false
  importRecords.value = []
  importErrors.value = []
  importTotal.value = 0
  importFileName.value = ''
  load()
}

function resetImport() {
  importRecords.value = []
  importErrors.value = []
  importTotal.value = 0
  importFileName.value = ''
}

function handleExport() {
  const rows = filteredList.value.map((row) => ({
    ...row,
    leadUnit: row.leadUnit,
    projectName: row.projectName,
    contractor: row.contractor,
    majorWorkContent: row.workContent,
    majorProjectCategory: row.category,
    majorStartTime: row.startTime,
    majorEndTime: row.endTime,
    majorOwnerSafetyManager: row.ownerSafety,
    majorContractorSafetyManager: row.contractorSafety,
    majorSupervisorSafetyManager: row.supervisorSafety,
    majorControlMeasures: row.measures,
  }))
  const result = exportMajorWorkRegisterRecords(rows)
  if (!result.ok) {
    ElMessage.warning(result.error || '导出失败')
    return
  }
  ElMessage.success(`已导出 ${result.count} 条危大工程信息`)
}

function reportDateLabel(value) {
  return String(value || '').trim() || '--'
}

function indexMethod(index) {
  return (currentPage.value - 1) * pageSize.value + index + 1
}

function isDatetimeField(field) {
  return field.type === 'datetime'
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="mwr-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">施工现场管理 / 施工作业申报 / 危大工程信息登记</div>
      <h1 class="page-title">危大工程信息登记</h1>
      <p class="page-tip">
        登记各项目当日危大工程作业信息（管理单位、施工单位、危大作业类别、起止时间、三方现场安全监管人、风险管控措施），支持导入导出。
        当前：{{ isHq ? '工程指挥部（只读汇总）' : (currentProjectName || '请先在顶部选择项目') }}
      </p>
    </div>

    <el-alert
      v-if="isHq"
      type="info"
      :closable="false"
      show-icon
      title="指挥部层级为只读汇总视图：可查看全部项目登记数据并导出，不能新增、编辑或删除（此类操作由项目层级维护）"
      class="mb"
    />

    <div class="filter-bar">
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="作业日期起"
        end-placeholder="作业日期止"
        style="width: 260px"
        aria-label="作业日期范围"
      />
      <el-select
        v-if="isHq"
        v-model="projectFilter"
        clearable
        placeholder="全部项目"
        style="width: 200px"
        aria-label="施工项目"
      >
        <el-option v-for="item in projectOptions" :key="item.id" :label="item.label" :value="item.id" />
      </el-select>
      <el-select v-model="categoryFilter" clearable filterable placeholder="危大工程作业类别" style="width: 190px" aria-label="危大工程作业类别">
        <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-select v-model="contractorFilter" clearable filterable placeholder="施工单位" style="width: 200px" aria-label="施工单位">
        <el-option v-for="item in contractorOptions" :key="item" :label="item" :value="item" />
      </el-select>
      <el-input
        v-model="keyword"
        clearable
        placeholder="施工内容 / 类别 / 监管人"
        style="width: 220px"
        :prefix-icon="Search"
        aria-label="搜索施工内容、类别或监管人"
      />
      <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      <template v-if="canManage">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增登记</el-button>
        <el-button :icon="Upload" @click="importVisible = true">导入</el-button>
        <el-button :icon="Download" @click="downloadTemplate">下载模版</el-button>
      </template>
      <el-button :icon="Download" @click="handleExport">导出</el-button>
    </div>

    <el-table :data="pagedList" stripe border empty-text="暂无危大工程登记记录，可新增登记或导入 Excel">
      <el-table-column type="index" label="序号" width="56" :index="indexMethod" />
      <el-table-column label="作业开始时间" width="150">
        <template #default="{ row }">{{ displayCell(row.startTime) }}</template>
      </el-table-column>
      <el-table-column label="施工项目" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.projectName) }}</template>
      </el-table-column>
      <el-table-column label="施工单位" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.contractor) }}</template>
      </el-table-column>
      <el-table-column label="危大工程作业类别" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.category) }}</template>
      </el-table-column>
      <el-table-column label="施工具体内容" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.workContent) }}</template>
      </el-table-column>
      <el-table-column label="作业结束时间" width="150">
        <template #default="{ row }">{{ displayCell(row.endTime) }}</template>
      </el-table-column>
      <el-table-column label="作业状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType(row.status)" size="small" effect="light">{{ row.status || '--' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="建设单位现场安全监管人" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.ownerSafety) }}</template>
      </el-table-column>
      <el-table-column label="施工单位现场安全监管人" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.contractorSafety) }}</template>
      </el-table-column>
      <el-table-column label="监理单位现场安全监管人" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.supervisorSafety) }}</template>
      </el-table-column>
      <el-table-column label="风险管控措施" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.measures) }}</template>
      </el-table-column>
      <el-table-column label="来源" width="96" align="center">
        <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <template v-if="canManage">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-pager">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增危大工程信息登记' : '编辑危大工程信息登记'"
      width="760px"
      append-to-body
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="180px" class="mwr-form">
        <el-row :gutter="16">
          <el-col v-for="field in MAJOR_WORK_REGISTER_FIELDS" :key="field.key" :span="field.span || 24">
            <el-form-item :label="field.label" :prop="field.key">
              <el-input
                v-if="field.key === 'projectName'"
                :model-value="form.projectName || '--'"
                disabled
                placeholder="取当前所选项目"
              />
              <el-date-picker
                v-else-if="isDatetimeField(field)"
                v-model="form[field.key]"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm"
                format="YYYY-MM-DD HH:mm"
                :placeholder="`请选择${field.label}`"
                style="width: 100%"
              />
              <el-input
                v-else-if="field.type === 'textarea'"
                v-model="form[field.key]"
                type="textarea"
                :rows="2"
                :maxlength="field.maxLength || 2000"
                show-word-limit
                :placeholder="field.required ? `请输入${field.label}` : `请输入${field.label}（选填）`"
              />
              <el-input
                v-else
                v-model="form[field.key]"
                :placeholder="field.contactMode ? `姓名/11位手机号，多人用逗号分隔` : (field.required ? `请输入${field.label}` : `请输入${field.label}（选填）`)"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="危大工程登记详情" width="780px" append-to-body destroy-on-close>
      <el-descriptions v-if="detailRow" :column="2" border class="mwr-detail">
        <el-descriptions-item label="作业状态">
          <el-tag :type="statusTagType(detailRow.status)" size="small" effect="light">{{ detailRow.status || '--' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="施工日期（按开始时间派生）">{{ detailRow.reportDate || '--' }}</el-descriptions-item>
        <el-descriptions-item label="施工项目名称" :span="2">{{ displayCell(detailRow.projectName) }}</el-descriptions-item>
        <el-descriptions-item label="管理单位" :span="2">{{ displayCell(detailRow.leadUnit) }}</el-descriptions-item>
        <el-descriptions-item label="施工单位" :span="2">{{ displayCell(detailRow.contractor) }}</el-descriptions-item>
        <el-descriptions-item label="危大工程作业类别">{{ displayCell(detailRow.category) }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ sourceLabel(detailRow.source) }}</el-descriptions-item>
        <el-descriptions-item label="作业开始时间">{{ displayCell(detailRow.startTime) }}</el-descriptions-item>
        <el-descriptions-item label="作业结束时间">{{ displayCell(detailRow.endTime) }}</el-descriptions-item>
        <el-descriptions-item label="建设单位现场安全监管人及手机号" :span="2">{{ displayCell(detailRow.ownerSafety) }}</el-descriptions-item>
        <el-descriptions-item label="施工单位现场安全监管人及手机号" :span="2">{{ displayCell(detailRow.contractorSafety) }}</el-descriptions-item>
        <el-descriptions-item label="监理单位现场安全监管人及手机号" :span="2">{{ displayCell(detailRow.supervisorSafety) }}</el-descriptions-item>
        <el-descriptions-item label="施工具体内容" :span="2">{{ displayCell(detailRow.workContent) }}</el-descriptions-item>
        <el-descriptions-item label="风险管控措施" :span="2">{{ displayCell(detailRow.measures) }}</el-descriptions-item>
        <el-descriptions-item label="登记/更新时间" :span="2">{{ formatMomentText(detailRow.updatedAt) }}</el-descriptions-item>
      </el-descriptions>
      <el-alert
        v-if="detailRow?.hasDangerPart"
        type="info"
        :closable="false"
        show-icon
        class="mwr-detail-tip"
        title="该记录同时包含危险作业信息：危大工程信息在本页维护，危险作业信息在「每日施工作业」页维护，两者共用同一条填报记录。"
      />
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="导入危大工程信息登记" width="880px" append-to-body destroy-on-close @closed="resetImport">
      <div class="mwr-import-tip">
        仅支持 .xlsx / .xls，单文件 ≤50MB；请使用「下载模版」生成的 11 列模板。施工项目名称可留空（默认取当前项目）。
      </div>
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        accept=".xlsx,.xls"
        :on-change="onFileChange"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击选择文件</em></div>
      </el-upload>
      <div v-if="importFileName" class="mwr-import-file">
        已选择：{{ importFileName }}
        <span v-if="importLoading">（解析中…）</span>
      </div>
      <template v-if="importTotal">
        <div class="mwr-import-summary">
          解析共 {{ importTotal }} 行：可导入 <b>{{ importSavable.length }}</b> 条<span v-if="importDuplicates">，重复 <b class="mwr-error">{{ importDuplicates }}</b> 条（不入库）</span><span v-if="importErrors.length">，校验未通过 <b class="mwr-error">{{ importErrors.length }}</b> 条</span>
        </div>
        <el-table v-if="importRecords.length" :data="importRecords.slice(0, 10)" size="small" border max-height="240">
          <el-table-column label="施工项目" min-width="150" show-overflow-tooltip prop="projectName" />
          <el-table-column label="施工单位" min-width="150" show-overflow-tooltip prop="contractor" />
          <el-table-column label="危大工程作业类别" min-width="120" prop="majorProjectCategory" />
          <el-table-column label="作业开始时间" width="140" prop="majorStartTime" />
          <el-table-column label="作业结束时间" width="140" prop="majorEndTime" />
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <el-tag v-if="row._duplicate" type="warning" size="small" effect="light">重复</el-tag>
              <el-tag v-else type="success" size="small" effect="light">可导入</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <p v-if="importRecords.length > 10" class="mwr-preview-more">… 另有 {{ importRecords.length - 10 }} 条待导入</p>
        <div v-if="importErrors.length" class="mwr-import-errors">
          <div class="mwr-import-errors-title">以下行未通过校验（不会被导入）：</div>
          <ul>
            <li v-for="(error, index) in importErrors.slice(0, 20)" :key="index">第 {{ error.row }} 行：{{ error.message }}</li>
          </ul>
          <p v-if="importErrors.length > 20">… 另有 {{ importErrors.length - 20 }} 行问题未展示</p>
        </div>
      </template>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!importSavable.length || importLoading" @click="confirmImport">
          确认导入{{ importSavable.length ? `（${importSavable.length} 条，重复不入库）` : '' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.mwr-page {
  min-height: 100%;
}

.mwr-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.mwr-detail :deep(.el-descriptions__label) {
  white-space: nowrap;
  width: 200px;
}

.mwr-detail-tip {
  margin-top: 12px;
}

.mwr-import-tip {
  margin-bottom: 12px;
  color: #606266;
  font-size: 13px;
}

.mwr-import-file {
  margin-top: 8px;
  font-size: 13px;
  color: #303133;
}

.mwr-import-summary {
  margin: 12px 0 8px;
  font-size: 13px;
  color: #303133;
}

.mwr-error {
  color: #e6a23c;
}

.mwr-preview-more {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}

.mwr-import-errors {
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #fde2e2;
  border-radius: 6px;
  background: #fef0f0;
  font-size: 13px;
  color: #c45656;
}

.mwr-import-errors ul {
  margin: 6px 0 0;
  padding-left: 18px;
}
</style>

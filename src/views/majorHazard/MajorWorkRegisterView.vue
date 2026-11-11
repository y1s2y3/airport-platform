<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Upload, Download, Search, Delete, Edit } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import { findProjectById } from '../../mock/projectBasicInfo.js'
import {
  MAJOR_WORK_REGISTER_FIELDS,
  MAJOR_PROJECT_CATEGORY_OPTIONS,
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
import ProfilePersonContactList from '../../components/basicData/ProfilePersonContactList.vue'

const { selectedProjectId, isHqSelected } = useCurrentProject()

/** 来源口径与「每日施工作业」保持一致：导入 / 线下模板 / 手动 */
const SOURCE_LABEL = {
  manual: '手动',
  import: '导入',
  seed: '线下模板',
}

const list = ref([])
const keyword = ref('')
const dateRange = ref([])
const categoryFilter = ref('')
const contractorFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
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
    // 三方现场安全监管人：与「每日施工作业」一致，支持多人（姓名 + 电话并排、可添加/删除人员）
    majorOwnerSafetyManager: '',
    majorContractorSafetyManager: '',
    majorSupervisorSafetyManager: '',
    majorControlMeasures: '',
  }
}

/** 三方现场安全监管人：表单字段 ↔ 存库「姓名/手机号」单列；每方最多 5 人 */
const CONTACT_MAX_COUNT = 5

const CONTACT_GROUPS = [
  { fieldKey: 'majorOwnerSafetyManager', rowKey: 'ownerSafety', label: '建设单位现场安全监管人', required: true },
  { fieldKey: 'majorContractorSafetyManager', rowKey: 'contractorSafety', label: '施工单位现场安全监管人', required: true },
  { fieldKey: 'majorSupervisorSafetyManager', rowKey: 'supervisorSafety', label: '监理单位现场安全监管人', required: false },
]

/** Excel 单列「姓名/手机号」→ 人员数组（多人用英文逗号分隔） */
function splitContactList(value) {
  const text = String(value || '').trim()
  if (!text) return []
  return text
    .split(/[,，;；]/)
    .map((part) => {
      const [name, phone] = String(part).split('/')
      return { name: String(name || '').trim(), phone: String(phone || '').trim() }
    })
    .filter((item) => item.name || item.phone)
}

function contactFieldBaseLabel(field) {
  return String(field?.label || '').replace('及手机号', '')
}

function sourceLabel(source) {
  return SOURCE_LABEL[source] || source || '--'
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
  const set = new Set(MAJOR_PROJECT_CATEGORY_OPTIONS)
  list.value.forEach((item) => {
    const value = String(item.category || '').trim()
    if (value) set.add(value)
  })
  return [...set]
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
  const [dateStart, dateEnd] = dateRange.value || []
  const cat = categoryFilter.value
  const contractor = contractorFilter.value
  const scopeId = isHqSelected.value ? '' : selectedProjectId.value
  return list.value.filter((row) => {
    if (!rowInScope(row, scopeId)) return false
    if (cat && row.category !== cat) return false
    if (contractor && row.contractor !== contractor) return false
    if (dateStart && String(row.reportDate || '') < dateStart) return false
    if (dateEnd && String(row.reportDate || '') > dateEnd) return false
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
  load()
})

/** 监管人校验（与「每日施工作业」一致的多人员「姓名/手机号」）：必填方至少 1 人、至多 5 人；每人须姓名 + 11 位手机号 */
function contactValidator(fieldKey, required, groupLabel = '现场安全监管人') {
  return (rule, value, callback) => {
    const list = splitContactList(form.value?.[fieldKey])
    if (!list.length) {
      return callback(required ? new Error(`请填写${groupLabel}的姓名与手机号`) : undefined)
    }
    if (list.length > CONTACT_MAX_COUNT) return callback(new Error(`${groupLabel}最多 ${CONTACT_MAX_COUNT} 人`))
    for (let i = 0; i < list.length; i += 1) {
      const person = list[i]
      const label = list.length > 1 ? `第 ${i + 1} 位${groupLabel}` : groupLabel
      if (!person.name) return callback(new Error(`请填写${label}姓名`))
      if (!person.phone) return callback(new Error(`请填写${label}手机号`))
      if (!/^1\d{10}$/.test(person.phone)) return callback(new Error(`${label}手机号须为 11 位数字`))
    }
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
  majorOwnerSafetyManager: [
    { required: true, message: '请填写建设单位现场安全监管人的姓名与手机号', trigger: 'change' },
    { validator: contactValidator('majorOwnerSafetyManager', true, '建设单位现场安全监管人'), trigger: 'change' },
  ],
  majorContractorSafetyManager: [
    { required: true, message: '请填写施工单位现场安全监管人的姓名与手机号', trigger: 'change' },
    { validator: contactValidator('majorContractorSafetyManager', true, '施工单位现场安全监管人'), trigger: 'change' },
  ],
  majorSupervisorSafetyManager: [
    { validator: contactValidator('majorSupervisorSafetyManager', false, '监理单位现场安全监管人'), trigger: 'change' },
  ],
  majorControlMeasures: [{ required: true, message: '请填写风险管控措施', trigger: 'blur' }],
}

function openCreate() {
  dialogMode.value = 'create'
  form.value = createEmptyForm()
  form.value.projectId = selectedProjectId.value
  form.value.projectName = currentProjectName.value
  // 施工单位默认展示当前项目的施工总承包单位名称（可修改）
  form.value.contractor = String(currentProject.value?.contractorUnit || '').trim()
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

function openEdit(row) {
  dialogMode.value = 'edit'
  const next = createEmptyForm()
  next.id = row.recordId
  next.projectId = row.projectId || ''
  next.leadUnit = row.leadUnit || DAILY_WORK_DEFAULT_LEAD_UNIT
  next.projectName = row.projectName || ''
  next.contractor = row.contractor || ''
  next.majorWorkContent = row.workContent || ''
  next.majorProjectCategory = row.category || ''
  next.majorStartTime = row.startTime || ''
  next.majorEndTime = row.endTime || ''
  next.majorControlMeasures = row.measures || ''
  // 三方监管人：支持多人，原样带入（组件内部按「姓名/手机号」拆分展示，最多 5 人）
  CONTACT_GROUPS.forEach((group) => {
    next[group.fieldKey] = row[group.rowKey] || ''
  })
  form.value = next
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

async function downloadTemplate() {
  await downloadMajorWorkRegisterTemplate()
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

const exportDateLabel = computed(() => {
  const [start, end] = dateRange.value || []
  if (start && end) return `${start} 至 ${end}`
  return ''
})

/** 导出取数口径：当前项目范围 + 所选作业日期区间（不受关键字/类别/施工单位筛选影响） */
function dateScopedRows() {
  const [start, end] = dateRange.value || []
  const scopeId = isHqSelected.value ? '' : selectedProjectId.value
  return list.value.filter((row) => {
    if (!rowInScope(row, scopeId)) return false
    const day = String(row.reportDate || '')
    if (start && day < start) return false
    if (end && day > end) return false
    return true
  })
}

async function handleExport() {
  const [start, end] = dateRange.value || []
  if (!start || !end) {
    ElMessage.warning('请先选择作业日期区间（开始日期 至 结束日期）后再导出')
    return
  }
  const rows = dateScopedRows().map((row) => ({
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
  if (!rows.length) {
    ElMessage.warning(`所选作业日期区间（${exportDateLabel.value}）内没有危大工程信息，无法导出`)
    return
  }
  const result = await exportMajorWorkRegisterRecords(rows, {
    rangeStart: start,
    rangeEnd: end,
  })
  if (!result.ok) {
    ElMessage.warning(result.error || '导出失败')
    return
  }
  ElMessage.success(`已按作业日期（${exportDateLabel.value}）导出 ${result.count} 条危大工程信息`)
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
      <div class="mwr-title-row">
        <h1 class="page-title">危大工程信息登记</h1>
        <div class="mwr-title-actions">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            class="mwr-date"
            aria-label="作业日期区间"
          />
          <el-select
            v-model="categoryFilter"
            clearable
            filterable
            placeholder="危大工程类别"
            class="mwr-category"
            aria-label="危大工程作业类别"
          >
            <el-option v-for="item in categoryOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-select
            v-model="contractorFilter"
            clearable
            filterable
            placeholder="施工单位"
            class="mwr-contractor"
            aria-label="施工单位"
          >
            <el-option v-for="item in contractorOptions" :key="item" :label="item" :value="item" />
          </el-select>
          <el-input
            v-model="keyword"
            clearable
            placeholder="搜索项目、单位、类别、监管人…"
            :prefix-icon="Search"
            class="mwr-search"
            aria-label="搜索项目、单位、类别、监管人"
          />
          <div class="mwr-title-buttons">
            <template v-if="canManage">
              <el-button type="primary" :icon="Plus" @click="openCreate">新增登记</el-button>
              <el-button :icon="Upload" @click="importVisible = true">导入</el-button>
              <el-button :icon="Download" @click="downloadTemplate">下载模版</el-button>
            </template>
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-table :data="pagedList" stripe border empty-text="暂无危大工程登记记录，可新增登记或导入 Excel">
      <el-table-column type="index" label="序号" width="56" :index="indexMethod" />
      <el-table-column label="施工项目" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.projectName) }}</template>
      </el-table-column>
      <el-table-column label="施工单位" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.contractor) }}</template>
      </el-table-column>
      <el-table-column label="危大工程作业类别" min-width="130" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.category) }}</template>
      </el-table-column>
      <el-table-column label="施工具体内容" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ displayCell(row.workContent) }}</template>
      </el-table-column>
      <el-table-column label="作业开始时间" width="150">
        <template #default="{ row }">{{ displayCell(row.startTime) }}</template>
      </el-table-column>
      <el-table-column label="作业结束时间" width="150">
        <template #default="{ row }">{{ displayCell(row.endTime) }}</template>
      </el-table-column>
      <el-table-column label="来源" width="90" align="center">
        <template #default="{ row }">{{ sourceLabel(row.source) }}</template>
      </el-table-column>
      <el-table-column v-if="canManage" label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
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
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="212px" class="mwr-form">
        <el-row :gutter="16">
          <el-col v-for="field in MAJOR_WORK_REGISTER_FIELDS" :key="field.key" :span="field.span || 24">
            <el-form-item
              v-if="field.contactMode"
              :label="contactFieldBaseLabel(field)"
              :prop="field.key"
              :required="field.required"
            >
              <ProfilePersonContactList
                v-model="form[field.key]"
                :min="field.required ? 1 : 0"
                :max="CONTACT_MAX_COUNT"
              />
            </el-form-item>
            <el-form-item v-else :label="field.label" :prop="field.key">
              <el-input
                v-if="field.key === 'projectName'"
                :model-value="form.projectName || '--'"
                disabled
                placeholder="取当前所选项目"
              />
              <el-select
                v-else-if="field.type === 'select'"
                v-model="form[field.key]"
                filterable
                placeholder="请选择危大工程作业类别"
                style="width: 100%"
              >
                <el-option v-for="opt in MAJOR_PROJECT_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
              </el-select>
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

/* 纵向节奏：面包屑 → 标题/搜索栏 → 列表 → 分页，逐层留白 */
.mwr-page .page-header {
  gap: 8px;
  margin-bottom: 16px;
}

.mwr-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 12px;
  row-gap: 10px;
  flex-wrap: wrap;
}

/* 搜索栏与「每日施工作业」一致：作业日期 + 关键字 + 业务按钮同一行，右对齐 */
.mwr-title-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}

.mwr-title-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.mwr-date {
  width: 240px;
}

/* 日期区间选择器根元素由 ElTooltip 渲染，需 :deep 才能命中并压过 Element 的 350px 最小宽 */
.mwr-title-actions :deep(.mwr-date) {
  width: 240px;
  min-width: 0;
}

.mwr-title-actions :deep(.el-range-input) {
  min-width: 0;
}

.mwr-category,
.mwr-contractor {
  width: 148px;
}

.mwr-search {
  width: 220px;
}

/* 业务按钮组：放不下时整组换行并右对齐 */
.mwr-title-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.mwr-title-buttons :deep(.el-button + .el-button) {
  margin-left: 0;
}

@media (max-width: 1180px) {
  .mwr-title-actions {
    width: 100%;
    margin-left: 0;
  }

  .mwr-date,
  .mwr-search {
    flex: 1 1 180px;
    width: auto;
  }

  .mwr-category,
  .mwr-contractor {
    flex: 1 1 148px;
    width: auto;
  }
}

.table-pager {
  margin-top: 14px;
}

.mwr-form :deep(.el-form-item) {
  margin-bottom: 14px;
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

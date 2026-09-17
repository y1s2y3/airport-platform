<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Plus, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { getProjectPersonnel, maskIdCard, maskPhone } from '../../mock/laborRealName.js'
import { buildEntityBreakdownTree } from '../../mock/constructionLocation.js'
import { listApprovedSubcontractors } from '../../mock/subcontractorManagement.js'
import { listMobileInspectionTasks } from '../../mock/mobileInspectionTasks.js'
import FileAttachmentPreview from '../../components/basicData/FileAttachmentPreview.vue'
import InspectionTaskDetailView from '../safety/InspectionTaskDetailView.vue'
import {
  buildLedgerRows,
  createConstructionPart,
  ensureMajorHazardData,
  getLedgerEndDate,
  getLedgerStartDate,
  getLedgerStatus,
  getMajorHazardData,
  getNodeState,
  normalizeLedger,
  saveLedger,
} from '../../utils/majorHazardManualStorage.js'

const PROCESS_CONFIGS = {
  scheme: {
    label: '专项施工方案', dateField: 'preparedAt', responsibleField: 'preparedBy', summaryField: 'schemeName',
    fields: [
      { key: 'schemeName', label: '方案名称', required: true }, { key: 'schemeCode', label: '方案编号', required: true, readonly: true, placeholder: '系统自动生成' },
      { key: 'preparedBy', label: '方案编制人', type: 'person', required: true }, { key: 'preparedAt', label: '编制日期', type: 'date', required: true },
    ],
    columns: [
      { key: 'schemeCode', label: '方案编号', width: 130 }, { key: 'schemeName', label: '方案名称', minWidth: 200 },
      { key: 'preparedBy', label: '编制人', width: 100 }, { key: 'preparedAt', label: '编制日期', width: 120 },
    ],
  },
  schemeDisclosure: {
    label: '方案交底', dateField: 'disclosureDate', responsibleField: 'discloser', summaryField: 'schemeName',
    fields: [
      { key: 'schemeName', label: '方案名称', required: true },
      { key: 'discloser', label: '交底人员', type: 'person', required: true },
      { key: 'receiver', label: '接受人', type: 'people', required: true },
      { key: 'disclosureDate', label: '交底时间', type: 'datetime', required: true },
      { key: 'disclosureRemark', label: '交底备注', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'schemeName', label: '方案名称', minWidth: 200 },
      { key: 'receiver', label: '接受人', minWidth: 180 },
      { key: 'discloser', label: '交底人员', width: 160 }, { key: 'disclosureDate', label: '交底时间', width: 170 },
      { key: 'disclosureRemark', label: '交底备注', minWidth: 200 },
    ],
  },
  safetyDisclosure: {
    label: '安全技术交底', dateField: 'disclosureDate', responsibleField: 'siteManager', summaryField: 'title',
    fields: [
      { key: 'title', label: '标题', required: true },
      { key: 'disclosureDate', label: '交底时间', type: 'datetime', required: true },
      { key: 'siteManager', label: '交底人员', type: 'person', required: true },
      { key: 'disclosureLocation', label: '交底地点', required: true },
      { key: 'receivingSubcontractor', label: '接受分包单位', type: 'subcontractor', required: true },
      { key: 'workTeam', label: '接受班组', required: true },
      { key: 'receiver', label: '接受人', type: 'people', required: true },
      { key: 'disclosureContent', label: '交底内容', type: 'textarea', span: 24, required: true },
    ],
    columns: [
      { key: 'title', label: '标题', minWidth: 200 }, { key: 'disclosureDate', label: '交底时间', width: 170 },
      { key: 'siteManager', label: '交底人员', width: 160 }, { key: 'disclosureLocation', label: '交底地点', minWidth: 150 },
      { key: 'receivingSubcontractor', label: '接受分包单位', minWidth: 180 }, { key: 'workTeam', label: '接受班组', width: 140 },
      { key: 'receiver', label: '接受人', minWidth: 180 },
      { key: 'disclosureContent', label: '交底内容', minWidth: 220 },
    ],
  },
  workerRegistration: {
    label: '作业人员登记', dateField: 'entryDate', responsibleField: 'workerName', summaryField: 'jobType',
    fields: [
      { key: 'personIds', label: '实名制人员', type: 'realNamePeople', span: 24, required: true },
    ],
    columns: [
      { key: 'workerName', label: '姓名', width: 100 },
      { key: 'phone', label: '手机号', width: 155, mask: true, fullKey: 'phoneFull' },
      { key: 'employer', label: '参建单位', minWidth: 170 },
      { key: 'jobType', label: '工种/职务', width: 120 },
      { key: 'workerType', label: '工人类型', width: 110 },
      { key: 'certificateNo', label: '资格证号', width: 150 }, { key: 'certificateExpiry', label: '证书有效期', width: 120 },
    ],
  },
  conditionAcceptance: {
    label: '施工条件验收', dateField: 'acceptanceDate', responsibleField: '', summaryField: 'acceptanceDescription',
    fields: [
      { key: 'acceptanceResult', label: '验收结果', type: 'select', options: ['合格', '不合格'], required: true, default: '合格' },
      { key: 'acceptanceDate', label: '验收时间', type: 'datetime', required: true },
      { key: 'acceptanceDescription', label: '验收描述', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'acceptanceResult', label: '验收结果', width: 110 }, { key: 'acceptanceDate', label: '验收时间', width: 165 },
      { key: 'acceptanceDescription', label: '验收描述', minWidth: 240 },
    ],
  },
  progress: {
    label: '施工进度', dateField: 'recordDate', responsibleField: '', summaryField: 'progressDescription',
    fields: [
      { key: 'recordDate', label: '记录日期', type: 'date', required: true },
      { key: 'executionRate', label: '执行率（%）', type: 'number', required: true, default: 0 },
      { key: 'progressDescription', label: '进度描述', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'recordDate', label: '记录日期', width: 120 }, { key: 'executionRate', label: '执行率', width: 100, suffix: '%' },
      { key: 'progressDescription', label: '进度描述', minWidth: 320 },
    ],
  },
  patrol: {
    label: '现场巡视', dateField: 'inspectionDate', responsibleField: 'inspectors', summaryField: 'inspectionTaskName',
    fields: [
      { key: 'inspectionTaskIds', label: '关联巡检单', type: 'inspectionTasks', span: 24, required: true },
    ],
    columns: [
      { key: 'inspectionTaskCount', label: '巡检单数量', width: 110 }, { key: 'inspectionTaskNo', label: '巡检单编号', minWidth: 190 },
      { key: 'inspectionTaskName', label: '巡检单名称', minWidth: 220 }, { key: 'inspectors', label: '巡检人员', width: 150 },
      { key: 'hazardCount', label: '隐患数', width: 90 },
    ],
  },
  acceptance: {
    label: '危大工程验收', dateField: 'acceptanceDate', responsibleField: '', summaryField: 'acceptanceDescription',
    fields: [
      { key: 'acceptanceResult', label: '验收结果', type: 'select', options: ['合格', '不合格'], required: true, default: '合格' },
      { key: 'acceptanceDate', label: '验收时间', type: 'datetime', required: true },
      { key: 'acceptanceDescription', label: '验收描述', type: 'textarea', span: 24 },
    ],
    columns: [
      { key: 'acceptanceResult', label: '验收结果', width: 110 }, { key: 'acceptanceDate', label: '验收时间', width: 165 },
      { key: 'acceptanceDescription', label: '验收描述', minWidth: 240 },
    ],
  },
  controlPoints: {
    label: '管控要点', dateField: 'date', responsibleField: 'responsible', summaryField: 'content', fields: [],
    columns: [
      { key: 'controlPointContent', label: '管控要点', minWidth: 300 }, { key: 'date', label: '记录日期', width: 120 },
    ],
  },
}
const PROCESS_TABS = Object.entries(PROCESS_CONFIGS).map(([key, value]) => ({ key, label: value.label }))
const RECORD_DETAIL_EXAMPLES = {
  scheme: {
    schemeName: 'A区深基坑支护及土方开挖专项施工方案', schemeCode: 'ZX20260818001', preparedBy: '张工（项目技术负责人）', preparedAt: '2026-08-18',
    attachmentInfo: 'A区深基坑专项施工方案.pdf',
  },
  schemeDisclosure: {
    schemeName: 'A区深基坑支护及土方开挖专项施工方案', disclosureDate: '2026-08-20 09:00', discloser: '张工（项目技术负责人）', disclosureRemark: '明确分层开挖顺序、支撑安装要求和应急处置措施。',
    receiver: ['赵志强（班组长）', '李建国（施工员）'],
    attachmentInfo: '专项施工方案交底记录.pdf\n方案交底签到表.pdf\n交底现场照片.jpg',
  },
  safetyDisclosure: {
    title: '深基坑土方开挖安全技术交底', disclosureDate: '2026-08-21 09:00', siteManager: '李建国（施工员）', disclosureLocation: '项目部安全教育室', receivingSubcontractor: '深圳市政集团有限公司', workTeam: '基坑支护班组', receiver: ['赵志强（班组长）', '王强（施工员）'], disclosureContent: '作业前检查临边防护，按方案分层开挖；发现支护变形或异常涌水立即停止作业并报告。',
    attachmentInfo: '安全技术交底记录.pdf\n作业人员签字表.pdf\n班前教育照片.jpg',
  },
  workerRegistration: {
    personId: 'person-demo-001', workerName: '赵志强', idNumber: '440300********1137', idNumberFull: '440300199001010137',
    phone: '138****0137', phoneFull: '13810000137', employer: '中建土方工程有限公司',
    jobType: '挖掘机司机', workerType: '建筑工人', entryDate: '2026-08-21', isSpecialWorker: '是', certificateNo: '粤A01202608001', certificateExpiry: '2027-08-20',
    safetyEducationDone: 2, safetyEducationTotal: 3,
  },
  conditionAcceptance: {
    acceptanceDate: '2026-08-22 09:30', acceptanceResult: '合格', acceptanceDescription: '施工方案、人员、机械设备及现场安全防护条件均满足开工要求。',
    attachmentInfo: '施工条件验收现场照片01.jpg\n施工条件验收现场照片02.jpg',
  },
  progress: {
    recordDate: '2026-08-28', executionRate: 42, progressDescription: '完成第二层土方开挖3600m³及东侧钢支撑安装，现场施工进度符合计划。',
    attachmentInfo: '现场进度照片01.jpg\n现场进度照片02.jpg',
  },
  patrol: {
    inspectionTaskIds: ['mt-demo-patrol-1', 'mt-demo-patrol-2'], inspectionTaskCount: 2,
    inspectionTaskNo: 'AQXJ20260824001、ZLXJ20260824002', inspectionTaskName: '深基坑临边防护专项巡检、钢支撑安装质量巡检',
    inspectionDate: '2026-08-24', inspectors: '王安全、陈监理', hazardCount: 1,
    inspectionTasks: [
      { id: 'mt-demo-patrol-1', taskNo: 'AQXJ20260824001', taskName: '深基坑临边防护专项巡检', inspectionCategory: '安全', source: '任务下发', project: '深圳机场扩建工程', inspectionDate: '2026-08-24', deadline: '2026-08-24', status: '已完成', inspector: '王安全', executor: '王安全', itemCount: 8, hazardCount: 1, result: 'hazard', hazardItems: [{ desc: '西侧临边一处警示标识松动', rectifier: '赵班长', rectifyDeadline: '2026-08-28', photos: ['隐患照片01.jpg'] }] },
      { id: 'mt-demo-patrol-2', taskNo: 'ZLXJ20260824002', taskName: '钢支撑安装质量巡检', inspectionCategory: '质量', source: '系统自建', project: '深圳机场扩建工程', inspectionDate: '2026-08-24', deadline: '2026-08-24', status: '已完成', inspector: '陈监理', executor: '陈监理', itemCount: 6, hazardCount: 0, result: 'normal', normalPhotos: ['巡检照片01.jpg'] },
    ],
    attachmentInfo: '监理专项巡视记录.pdf\n巡视现场照片.jpg',
  },
  acceptance: {
    acceptanceDate: '2026-09-05 15:00', acceptanceResult: '合格', acceptanceDescription: '危大工程实体质量、安全设施和现场施工状态验收合格。',
    attachmentInfo: '危大工程验收现场照片01.jpg\n危大工程验收现场照片02.jpg',
  },
  controlPoints: {
    attachmentInfo: '管控要点检查记录.pdf\n现场检查照片.jpg',
  },
}

const route = useRoute()
const router = useRouter()
const { selectedProjectId, headerProjectLabel, isHqSelected } = useCurrentProject()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const sourceId = computed(() => String(route.params.sourceId || ''))
const routeMode = computed(() => String(route.query.mode || 'edit'))
const isControlMode = computed(() => routeMode.value === 'control')
const data = ref({ ledgers: [], identifications: [], controlPoints: [], wbsNodes: [] })
const form = ref(null)
const activeProcessTab = ref('scheme')
const processPartFilter = ref('')
const recordDialogVisible = ref(false)
const recordDialogMode = ref('add')
const recordForm = ref(createBlankRecord())
const inspectionTaskDetailTab = ref('')
const attachmentPreviewVisible = ref(false)
const selectedAttachment = ref(null)
// 脱敏字段（手机号/身份证号）的明文展开状态
const revealed = ref({})
function isRevealed(key) { return Boolean(revealed.value[key]) }
function toggleReveal(key) { revealed.value = { ...revealed.value, [key]: !revealed.value[key] } }

const basicReadonly = computed(() => routeMode.value === 'view' || isControlMode.value || (form.value && getLedgerStatus(form.value) === '完工'))
const canEditBasic = computed(() => !basicReadonly.value)
// 现场巡视由巡检管理完成任务后自动写入，不再需要回到危大工程手工关联巡检单。
const canAddProcessRecord = computed(() => isControlMode.value && activeProcessTab.value !== 'patrol')
const pageTitle = computed(() => isControlMode.value ? '危大工程过程管控' : routeMode.value === 'view' ? '查看危大清单' : '编辑危大清单')
const currentTab = computed(() => PROCESS_TABS.find((item) => item.key === activeProcessTab.value) || PROCESS_TABS[0])
const currentConfig = computed(() => PROCESS_CONFIGS[activeProcessTab.value])
const visibleRecordFields = computed(() => currentConfig.value.fields.filter((field) => !field.show || field.show(recordForm.value)))
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
const teamOptions = computed(() => [...new Set(realNamePersonnel.value.map((person) => person.unit?.team).filter(Boolean))])
const inspectionTaskOptions = computed(() => listMobileInspectionTasks()
  .filter((item) => (item.projectId || item.project_id) === projectId.value)
  .map((item) => ({ ...item, label: `${item.taskNo || '未编号'}｜${item.taskName || '巡检单'}（${item.status || '未知状态'}）` })))
const selectedRealNamePersonnel = computed(() => realNamePersonnel.value.filter((person) => (recordForm.value.personIds || []).includes(person.id)))
const selectedInspectionTasks = computed(() => {
  const ids = recordForm.value.inspectionTaskIds || []
  const snapshots = recordForm.value.inspectionTasks || []
  return ids.map((id) => snapshots.find((item) => item.id === id) || inspectionTaskOptions.value.find((item) => item.id === id)).filter(Boolean)
})
const recordAttachmentLabel = computed(() => ['conditionAcceptance', 'progress', 'acceptance'].includes(activeProcessTab.value) ? '现场照片' : '附件')
const recordPartLabel = computed(() => ['conditionAcceptance', 'progress', 'acceptance'].includes(activeProcessTab.value) ? '验收部位' : '施工部位')
const controlPointStatusRows = computed(() => {
  if (recordDialogMode.value === 'view') return [{
    controlPointId: recordForm.value.controlPointId,
    content: recordForm.value.controlPointContent || recordForm.value.content,
    redStatusText: recordForm.value.redStatusText || '未落实',
    greenStatusText: recordForm.value.greenStatusText || '已落实',
    displayStatus: recordForm.value.displayStatus,
    displayStatusText: recordForm.value.displayStatusText,
  }]
  return recordForm.value.pointStatuses || []
})
const entityTree = computed(() => decorateEntityTree(buildEntityBreakdownTree(projectId.value)))
const entityNodes = computed(() => flattenEntityTree(entityTree.value).filter((item) => item.node_type !== 9))
const processRows = computed(() => {
  if (!form.value) return []
  return form.value.parts.flatMap((part) => {
    if (processPartFilter.value && part.id !== processPartFilter.value) return []
    const storedRecords = part.process?.[activeProcessTab.value]?.records || []
    const isDemoLedger = String(form.value.id || '').startsWith('mh-demo-')
    const displayRecords = storedRecords.length || !isDemoLedger || activeProcessTab.value === 'controlPoints'
      ? storedRecords
      : [{
          id: `mh-demo-${activeProcessTab.value}-${part.id}`,
          ...(RECORD_DETAIL_EXAMPLES[activeProcessTab.value] || {}),
          status: '已完成',
          createdBy: '张工',
          createdAt: `${RECORD_DETAIL_EXAMPLES[activeProcessTab.value]?.[currentConfig.value.dateField] || new Date().toISOString().slice(0, 10)} 09:30:00`,
        }]
    return displayRecords.map((record) => {
      const displayRecord = buildRecordDisplayData(record)
      const point = form.value.controlPoints.find((item) => item.id === displayRecord.controlPointId)
      if (activeProcessTab.value === 'controlPoints' && !point) return null
      const redStatusText = point?.redStatusText || displayRecord.redStatusText || '未落实'
      const greenStatusText = point?.greenStatusText || displayRecord.greenStatusText || '已落实'
      return {
        ...displayRecord,
        partId: part.id,
        partName: part.wbsPath || part.name || '—',
        controlPointContent: point?.content || displayRecord.content || '—',
        redStatusText,
        greenStatusText,
        displayStatusText: displayRecord.displayStatusText || (displayRecord.displayStatus === 'red' ? redStatusText : greenStatusText),
        _status: deriveRecordStatus(activeProcessTab.value, displayRecord),
      }
    }).filter(Boolean)
  }).sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))
})
const tabAttachmentRows = computed(() => processRows.value.flatMap((record, recordIndex) => {
  const names = String(record.attachmentInfo || '').split('\n').map((item) => item.trim()).filter(Boolean)
  return names.map((fileName, fileIndex) => ({
    id: `${record.id || recordIndex}-${fileIndex}-${fileName}`,
    fileName,
    fileUrl: record.attachmentUrls?.[fileName] || '',
    uploader: record.createdBy || record.responsible || '—',
    uploadTime: record.createdAt || record.date || '—',
  }))
}))
const recordAttachmentNames = computed(() => String(recordForm.value.attachmentInfo || '').split('\n').map((item) => item.trim()).filter(Boolean))
const recordDetailPartName = computed(() => {
  if (recordForm.value.partName) return recordForm.value.partName
  const part = form.value?.parts?.find((item) => item.id === recordForm.value.partId)
  return part?.wbsPath || part?.name || '—'
})
const recordDetailStatus = computed(() => deriveRecordStatus(activeProcessTab.value, recordForm.value))
const recordDetailFields = computed(() => {
  if (activeProcessTab.value === 'workerRegistration') {
    const form = recordForm.value
    return [
      { label: '姓名', value: form.workerName },
      { label: '身份证号', value: form.idNumber, maskKey: 'idNumber', fullValue: form.idNumberFull },
      { label: '手机号', value: form.phone, maskKey: 'phone', fullValue: form.phoneFull },
      { label: '参建单位', value: form.employer },
      { label: '工种/职务', value: form.jobType },
      { label: '工人类型', value: form.workerType },
      { label: '进场日期', value: form.entryDate },
      { label: '是否特种作业人员', value: form.isSpecialWorker },
      { label: '资格证号', value: form.certificateNo },
      { label: '证书有效期', value: form.certificateExpiry },
      { label: '三级安全教育完成情况', progress: { done: Number(form.safetyEducationDone) || 0, total: Number(form.safetyEducationTotal) || 3 } },
    ]
  }
  return visibleRecordFields.value
    .filter((field) => field.type !== 'realNamePeople')
    .map((field) => ({
      label: field.label,
      value: field.type === 'inspectionTasks'
        ? selectedInspectionTasks.value.map((item) => item.taskName || item.taskNo).join('、')
        : field.key === 'executionRate' && recordForm.value[field.key] !== ''
        ? `${recordForm.value[field.key]}%`
        : Array.isArray(recordForm.value[field.key]) ? recordForm.value[field.key].join('、') : recordForm.value[field.key],
      wide: field.span === 24 || field.type === 'textarea',
    }))
})
/** 施工进度执行率的填报下限：取该施工部位上一次填报的执行率 */
const progressMinValue = computed(() => {
  if (activeProcessTab.value !== 'progress') return 0
  const part = form.value?.parts?.find((item) => item.id === recordForm.value.partId)
  const records = part?.process?.progress?.records || []
  return records.reduce((max, record) => Math.max(max, Number(record.executionRate) || 0), 0)
})
watch([() => recordForm.value.partId, recordDialogVisible], () => {
  if (!recordDialogVisible.value || recordDialogMode.value !== 'add' || activeProcessTab.value !== 'progress') return
  const min = progressMinValue.value
  if (!(Number(recordForm.value.executionRate) >= min)) recordForm.value.executionRate = min
})
const stageActive = computed(() => {
  if (!form.value) return 0
  const nodes = getNodeState(form.value)
  if (nodes.acceptance) return 4
  if (nodes.implementation) return 3
  if (nodes.disclosure) return 2
  if (nodes.scheme) return 1
  return 0
})

function decorateEntityTree(nodes = [], parentPath = '') {
  return nodes.map((node) => {
    const path = [parentPath, node.label].filter(Boolean).join(' / ')
    return {
      ...node,
      path,
      disabled: node.node_type === 9,
      children: decorateEntityTree(node.children || [], path),
    }
  })
}
function flattenEntityTree(nodes = []) {
  return nodes.flatMap((node) => [node, ...flattenEntityTree(node.children || [])])
}
function migrateResponsibleLabel(value) {
  if (!value || String(value).includes('（')) return value
  return responsibleOptions.value.find((item) => item.startsWith(`${value}（`)) || value
}
function recordFieldDisabled(field) {
  return recordDialogMode.value === 'view' || Boolean(field.readonly)
}

function createBlankRecord() {
  const record = {
    id: '', partId: '', controlPointId: '', status: '已完成', date: new Date().toISOString().slice(0, 10),
    responsible: '', result: '', content: '', attachmentInfo: '', createdBy: '当前用户', createdAt: '',
  }
  const config = PROCESS_CONFIGS[activeProcessTab?.value || 'scheme']
  config.fields.forEach((field) => {
    if (field.default !== undefined) record[field.key] = field.default
    else if (['realNamePeople', 'inspectionTasks', 'people'].includes(field.type)) record[field.key] = []
    else if (!(field.key in record)) record[field.key] = ''
  })
  if (config.dateField && !record[config.dateField]) record[config.dateField] = record.date
  return record
}
function load() {
  if (!projectId.value || !sourceId.value) {
    form.value = null
    return
  }
  ensureMajorHazardData(projectId.value)
  data.value = getMajorHazardData(projectId.value)
  const row = buildLedgerRows(data.value).find((item) => item.sourceId === sourceId.value)
  if (!row) {
    ElMessage.warning('未找到该危大工程清单')
    back()
    return
  }
  form.value = normalizeLedger(row, data.value)
  form.value.responsible = migrateResponsibleLabel(form.value.responsible)
  form.value.parts.forEach((part) => {
    part.safetyResponsible = migrateResponsibleLabel(part.safetyResponsible)
    const entity = entityNodes.value.find((item) => item.id === part.wbsNodeId)
    if (entity) {
      part.name = entity.label
      part.wbsPath = entity.path
    }
  })
  processPartFilter.value = ''
  activeProcessTab.value = 'scheme'
}
function back() { router.push('/major-hazard/hazard-list') }
function stateTagType(status) { return status === '完工' ? 'success' : status === '在施' ? 'primary' : 'info' }
function plannedTime() { return `${form.value?.source?.plannedStart || '—'} 至 ${form.value?.source?.plannedEnd || '—'}` }
function constructionTime() { return `${getLedgerStartDate(form.value || {}) || '—'} 至 ${getLedgerEndDate(form.value || {}) || '—'}` }
function partStatus(part) {
  if (part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格') return '完工'
  return part.startDate ? '在施' : '未开工'
}
function addPart() {
  form.value.parts.push(createConstructionPart())
}
function chooseEntityPart(part, id) {
  const node = entityNodes.value.find((item) => item.id === id)
  part.wbsNodeId = id || ''
  part.name = node?.label || ''
  part.wbsPath = node?.path || ''
}
function chooseInspectionTasks(ids = []) {
  const tasks = ids.map((id) => inspectionTaskOptions.value.find((item) => item.id === id)).filter(Boolean)
  const taskNos = tasks.map((item) => item.taskNo).filter(Boolean)
  const taskNames = tasks.map((item) => item.taskName).filter(Boolean)
  const inspectors = [...new Set(tasks.flatMap((item) => [item.inspector || item.executor, ...(item.companions || [])]).filter(Boolean))]
  Object.assign(recordForm.value, {
    inspectionTaskIds: ids,
    inspectionTasks: tasks.map(({ label, ...task }) => JSON.parse(JSON.stringify(task))),
    inspectionTaskCount: tasks.length,
    inspectionTaskNo: taskNos.join('、'),
    inspectionTaskName: taskNames.join('、'),
    inspectionDate: tasks.map((item) => item.inspectionDate || item.deadline).filter(Boolean).sort().at(-1) || new Date().toISOString().slice(0, 10),
    inspectors: inspectors.join('、'),
    hazardCount: tasks.reduce((sum, item) => sum + Number(item.hazardCount || 0), 0),
  })
  if (!ids.includes(inspectionTaskDetailTab.value)) inspectionTaskDetailTab.value = ids[0] || ''
}
function removePart(part) {
  ElMessageBox.confirm(`确定删除施工部位“${part.name || '未选择'}”？`, '删除确认', { type: 'warning' })
    .then(() => {
      form.value.parts = form.value.parts.filter((item) => item.id !== part.id)
      ElMessage.success('已删除施工部位')
    })
    .catch(() => {})
}
function statusType(status) {
  if (['已完成', '已落实', '合格'].includes(status)) return 'success'
  if (['需整改', '不合格'].includes(status)) return 'danger'
  return 'info'
}
function deriveRecordStatus(key, record) {
  const config = PROCESS_CONFIGS[key]
  const hasIndustryFields = config.fields.some((field) => {
    const value = record[field.key]
    return field.key !== 'controlPointId' && (Array.isArray(value) ? value.length > 0 : value !== '' && value !== undefined && value !== null)
  })
  if (record.status && !hasIndustryFields) return record.status
  if (key === 'scheme') return '已完成'
  if (key === 'schemeDisclosure' || key === 'safetyDisclosure') return '已完成'
  if (key === 'workerRegistration') return record.personId ? '已完成' : record.status || '未完成'
  if (key === 'conditionAcceptance') return record.acceptanceResult === '合格' ? '已完成' : '不合格'
  if (key === 'progress') return '已完成'
  if (key === 'patrol') return Number(record.hazardCount || 0) > 0 ? '需关注' : '已完成'
  if (key === 'acceptance') return record.acceptanceResult === '合格' ? '已完成' : '不合格'
  if (key === 'controlPoints') return record.displayStatus === 'green' ? '已落实' : record.displayStatus === 'red' ? '需整改' : record.status || '未确认'
  return record.status || '未完成'
}
function recordDate(config, record) { return record[config.dateField] || record.date || '' }
function recordResponsible(config, record) { return record[config.responsibleField] || record.responsible || '' }
function recordSummary(config, record) { return record[config.summaryField] || record.content || '' }
function tableValue(row, column) {
  const fallback = {
    schemeName: 'content', preparedAt: 'date', preparedBy: 'responsible',
    disclosureDate: 'date', discloser: 'responsible', siteManager: 'responsible', workTeam: 'content',
    workerName: 'responsible', jobType: 'content', entryDate: 'date', acceptanceDate: 'date', acceptanceDescription: 'content',
    recordDate: 'date', progressDescription: 'content', inspectionDate: 'date', inspectors: 'responsible', inspectionTaskName: 'content',
    controlPointContent: 'content', checkDate: 'date',
  }
  const value = row[column.key] ?? row[fallback[column.key]]
  if (value === '' || value === undefined || value === null) return '—'
  return `${Array.isArray(value) ? value.join('、') : value}${column.suffix || ''}`
}
function generateSchemeCode() {
  const now = new Date()
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const prefix = `ZX${ymd}`
  const codes = (form.value?.parts || []).flatMap((part) => part.process?.scheme?.records || []).map((item) => String(item.schemeCode || ''))
  const maxSequence = codes
    .filter((code) => code.startsWith(prefix))
    .reduce((max, code) => Math.max(max, Number(code.slice(prefix.length)) || 0), 0)
  return `${prefix}${String(maxSequence + 1).padStart(3, '0')}`
}
function inspectionResultText(task) {
  if (Number(task.hazardCount || 0) > 0 || task.result === 'hazard') return '发现隐患'
  if (task.result === 'normal' || task.status === '已完成') return '检查正常'
  return task.status || '待执行'
}
function openAddRecord() {
  if (!form.value.parts.length) return ElMessage.warning('当前危大工程尚未配置施工部位')
  const blank = createBlankRecord()
  blank.partId = processPartFilter.value || (form.value.parts.length === 1 ? form.value.parts[0].id : '')
  if (activeProcessTab.value === 'scheme') blank.schemeCode = generateSchemeCode()
  if (activeProcessTab.value === 'controlPoints') {
    blank.pointStatuses = form.value.controlPoints.map((point) => ({
      controlPointId: point.id,
      content: point.content,
      redStatusText: point.redStatusText || '未落实',
      greenStatusText: point.greenStatusText || '已落实',
      displayStatus: '',
    }))
  }
  recordForm.value = blank
  inspectionTaskDetailTab.value = ''
  recordDialogMode.value = 'add'
  recordDialogVisible.value = true
}
function hasBusinessDetail(row) {
  if (activeProcessTab.value === 'workerRegistration') return Boolean(row.personId || row.workerName)
  if (activeProcessTab.value === 'controlPoints') return Boolean(row.controlPointId || row.controlPointContent)
  return currentConfig.value.fields.some((field) => {
    const value = row[field.key]
    return Array.isArray(value)
      ? value.length > 0
      : value !== '' && value !== undefined && value !== null
  })
}
function buildRecordDisplayData(row) {
  const tabKey = activeProcessTab.value
  const isLegacyRecord = !hasBusinessDetail(row)
  const example = isLegacyRecord ? (RECORD_DETAIL_EXAMPLES[tabKey] || {}) : {}
  const detail = { ...createBlankRecord(), ...example }
  Object.entries(row).forEach(([key, value]) => {
    if (!isLegacyRecord || (value !== '' && value !== undefined && value !== null)) detail[key] = value
  })
  if (String(form.value?.id || '').startsWith('mh-demo-ledger-') && ['schemeDisclosure', 'safetyDisclosure'].includes(tabKey)) {
    for (const field of currentConfig.value.fields) {
      if (!detail[field.key] || (Array.isArray(detail[field.key]) && !detail[field.key].length)) detail[field.key] = RECORD_DETAIL_EXAMPLES[tabKey]?.[field.key] || ''
    }
  }
  if (!['workerRegistration', 'patrol'].includes(tabKey) && !detail.attachmentInfo) {
    detail.attachmentInfo = RECORD_DETAIL_EXAMPLES[tabKey]?.attachmentInfo || ''
  }
  if (tabKey === 'workerRegistration') detail.personIds = detail.personId ? [detail.personId] : []
  if (row.date && !row[currentConfig.value.dateField]) detail[currentConfig.value.dateField] = row.date
  // 作业人员登记的人员信息来自实名制人员，不用过程节点的责任人/摘要回填
  if (tabKey !== 'workerRegistration' && row.responsible && !row[currentConfig.value.responsibleField]) detail[currentConfig.value.responsibleField] = row.responsible
  if (tabKey !== 'workerRegistration' && row.content && !row[currentConfig.value.summaryField]) detail[currentConfig.value.summaryField] = row.content
  const recordDateValue = detail[currentConfig.value.dateField] || detail.date || new Date().toISOString().slice(0, 10)
  if (!detail.createdBy) detail.createdBy = detail[currentConfig.value.responsibleField] || '系统演示'
  if (!detail.createdAt) detail.createdAt = `${String(recordDateValue).slice(0, 10)} 09:30:00`
  return detail
}
function openViewRecord(row) {
  const detail = buildRecordDisplayData(row)
  recordForm.value = detail
  inspectionTaskDetailTab.value = detail.inspectionTaskIds?.[0] || ''
  recordDialogMode.value = 'view'
  recordDialogVisible.value = true
}
function openTabAttachment(row) {
  selectedAttachment.value = row
  attachmentPreviewVisible.value = true
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
    phone: phoneFull ? maskPhone(phoneFull) : '—',
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
function addRecordAttachment(file) {
  if (!file?.name) return
  const names = [...recordAttachmentNames.value]
  if (!names.includes(file.name)) names.push(file.name)
  recordForm.value.attachmentInfo = names.join('\n')
}
function removeRecordAttachment(name) {
  recordForm.value.attachmentInfo = recordAttachmentNames.value.filter((item) => item !== name).join('\n')
}
function submitRecord() {
  const item = recordForm.value
  if (!item.partId) return ElMessage.warning('请选择施工部位')
  // 施工进度执行率不允许低于该施工部位上一次填报值
  if (activeProcessTab.value === 'progress') {
    const lastRate = progressMinValue.value
    if (lastRate && Number(item.executionRate || 0) < lastRate) return ElMessage.warning(`执行率不能小于上一次填报的 ${lastRate}%，请重新填写`)
  }
  if (!['workerRegistration', 'patrol'].includes(activeProcessTab.value) && !recordAttachmentNames.value.length) return ElMessage.warning(`请上传${recordAttachmentLabel.value}`)
  const part = form.value.parts.find((row) => row.id === item.partId)
  const node = part?.process?.[activeProcessTab.value]
  if (!node) return ElMessage.error('过程节点不存在，请刷新后重试')
  if (activeProcessTab.value === 'workerRegistration') {
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
    Object.assign(node, {
      status: '已完成',
      date,
      responsible: '当前用户',
      content: `完成 ${selectedPeople.length} 名作业人员登记`,
      attachmentInfo: '',
    })
    saveLedger(projectId.value, form.value)
    recordDialogVisible.value = false
    ElMessage.success(`已登记 ${selectedPeople.length} 名作业人员`)
    return
  }
  if (activeProcessTab.value === 'controlPoints') {
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
        attachmentReviewStatus: '已审核通过',
        createdBy: '当前用户',
        createdAt,
      })
      const point = form.value.controlPoints.find((target) => target.id === row.controlPointId)
      if (point) point.handlingStatus = row.displayStatus === 'green' ? '已落实' : '需整改'
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
  const missing = visibleRecordFields.value.find((field) => field.required && (Array.isArray(item[field.key]) ? !item[field.key].length : item[field.key] === '' || item[field.key] === undefined || item[field.key] === null))
  if (missing) return ElMessage.warning(`请填写${missing.label}`)
  const status = deriveRecordStatus(activeProcessTab.value, item)
  const record = {
    ...item,
    id: `mh-${activeProcessTab.value}-record-${Date.now()}`,
    status,
    date: recordDate(currentConfig.value, item),
    responsible: recordResponsible(currentConfig.value, item),
    content: recordSummary(currentConfig.value, item),
    attachmentReviewStatus: '已审核通过',
    createdBy: '当前用户',
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  }
  if (item.acceptanceResult) record.result = item.acceptanceResult
  delete record.partId
  delete record.partName
  delete record.controlPointContent
  delete record._status
  node.records.push(record)
  Object.assign(node, { status: record.status, date: record.date, responsible: record.responsible, result: record.result, content: record.content, attachmentInfo: record.attachmentInfo })
  saveLedger(projectId.value, form.value)
  recordDialogVisible.value = false
  ElMessage.success(`${currentTab.value.label}记录新增成功`)
}
function saveBasicInfo() {
  if (!form.value.name?.trim()) return ElMessage.warning('请填写危大工程名称')
  if (!form.value.overview?.trim()) return ElMessage.warning('请填写危大工程概况')
  if (!form.value.subcontractor?.trim() || !form.value.responsible?.trim()) return ElMessage.warning('请选择责任分包单位和责任人')
  if (!form.value.parts.length) return ElMessage.warning('请至少新增一个施工部位')
  if (form.value.parts.some((part) => !part.wbsNodeId || !part.safetyResponsible || !part.startDate || !part.plannedEndDate)) return ElMessage.warning('请完整填写施工部位、安全管控责任人、开工时间和计划完工时间')
  const duplicate = new Set()
  for (const part of form.value.parts) {
    if (duplicate.has(part.wbsNodeId)) return ElMessage.warning('同一危大工程不可重复选择同一个实体工程分解节点')
    duplicate.add(part.wbsNodeId)
  }
  saveLedger(projectId.value, form.value)
  ElMessage.success('危大工程清单已保存')
  back()
}

watch([projectId, sourceId, routeMode], load, { immediate: true })
</script>

<template>
  <div class="ledger-form-page page-card">
    <template v-if="form">
      <div class="page-header">
        <div class="header-nav">
          <el-button text :icon="ArrowLeft" @click="back">返回危大清单</el-button>
          <span class="nav-divider"></span>
          <div class="page-breadcrumb">施工现场管理 / 危大工程管理 / 危大清单 / {{ isControlMode ? '过程管控' : routeMode === 'view' ? '查看' : '编辑' }}</div>
        </div>
        <div class="header-main">
          <div class="title-block">
            <div class="title-row">
              <h1 class="page-title">{{ pageTitle }}</h1>
              <el-tag effect="plain">{{ form.categoryName || '未分类' }}</el-tag>
              <el-tag v-if="form.isSuperMajor === '是'" type="danger" effect="plain">超危</el-tag>
              <el-tag :type="stateTagType(getLedgerStatus(form))">{{ getLedgerStatus(form) }}</el-tag>
            </div>
            <p class="page-scope">{{ headerProjectLabel }}</p>
          </div>
          <div class="stage-panel">
            <div class="stage-label">业务进度</div>
            <el-steps :active="stageActive" finish-status="success" align-center class="stage-steps"><el-step title="方案" /><el-step title="交底" /><el-step title="实施" /><el-step title="验收" /></el-steps>
          </div>
        </div>
      </div>

      <section class="section-card basic-section">
        <div class="section-heading">
          <div class="section-title">基本信息</div>
          <p>危大工程基本属性及责任单位信息</p>
        </div>
        <el-form label-width="126px" class="basic-form">
          <el-row :gutter="24">
            <el-col :span="12"><el-form-item label="危大工程名称" required><el-input v-model="form.name" :disabled="basicReadonly" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="危大工程类别"><span class="form-text">{{ form.categoryName || '—' }}</span></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="危大工程概况" required><el-input v-model="form.overview" type="textarea" :rows="3" :disabled="basicReadonly" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="计划时间"><span class="form-text">{{ plannedTime() }}</span></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="施工时间"><span class="form-text">{{ constructionTime() }}</span></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="类别描述"><span class="form-text description-text">{{ form.description || form.source?.description || '—' }}</span></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="责任分包单位" required><el-select v-model="form.subcontractor" filterable :disabled="basicReadonly" placeholder="请选择已通过报审的分包单位" style="width:100%"><el-option v-for="item in subcontractorOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="责任人" required><el-select v-model="form.responsible" filterable :disabled="basicReadonly" placeholder="请选择人员姓名（岗位）" style="width:100%"><el-option v-for="item in responsibleOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
          </el-row>
        </el-form>
      </section>

      <section class="section-card">
        <div class="section-head"><div class="section-heading"><div class="section-title">施工部位</div><p>从基础数据管理的实体工程分解选择，明确每个部位的责任人与施工时间</p></div><el-button v-if="canEditBasic" type="primary" :icon="Plus" @click="addPart">添加施工部位</el-button></div>
        <el-table :data="form.parts" border stripe empty-text="暂无施工部位" class="business-table">
          <el-table-column type="index" label="序号" width="56" />
          <el-table-column label="施工部位" min-width="320"><template #default="{ row }"><span v-if="basicReadonly">{{ row.wbsPath || row.name || '—' }}</span><div v-else class="part-wbs-cell"><el-tree-select :model-value="row.wbsNodeId" :data="entityTree" node-key="id" :props="{ value: 'id', label: 'label', children: 'children', disabled: 'disabled' }" check-strictly filterable placeholder="请选择实体工程分解节点" @update:model-value="chooseEntityPart(row, $event)" /><small v-if="row.wbsPath">{{ row.wbsPath }}</small></div></template></el-table-column>
          <el-table-column label="安全管控责任人" width="190"><template #default="{ row }"><span v-if="basicReadonly">{{ row.safetyResponsible || '—' }}</span><el-select v-else v-model="row.safetyResponsible" filterable placeholder="人员姓名（岗位）"><el-option v-for="item in responsibleOptions" :key="item" :label="item" :value="item" /></el-select></template></el-table-column>
          <el-table-column label="开工时间" width="150"><template #default="{ row }"><span v-if="basicReadonly">{{ row.startDate || '—' }}</span><el-date-picker v-else v-model="row.startDate" type="date" value-format="YYYY-MM-DD" style="width:130px" /></template></el-table-column>
          <el-table-column label="计划完工时间" width="150"><template #default="{ row }"><span v-if="basicReadonly">{{ row.plannedEndDate || '—' }}</span><el-date-picker v-else v-model="row.plannedEndDate" type="date" value-format="YYYY-MM-DD" style="width:130px" /></template></el-table-column>
          <el-table-column label="施工情况" width="100"><template #default="{ row }"><el-tag size="small" :type="stateTagType(partStatus(row))">{{ partStatus(row) }}</el-tag></template></el-table-column>
          <el-table-column v-if="canEditBasic" label="操作" width="80" fixed="right"><template #default="{ row }"><el-button link type="danger" @click="removePart(row)">删除</el-button></template></el-table-column>
        </el-table>
      </section>

      <section class="section-card process-section">
        <div class="section-head">
          <div class="section-heading"><div class="section-title">过程管控</div><p>按业务阶段维护过程记录和附件资料</p></div>
          <div class="process-actions">
            <el-select v-model="processPartFilter" clearable size="small" placeholder="全部施工部位" style="width:260px"><el-option v-for="part in form.parts" :key="part.id" :label="part.name || part.wbsPath" :value="part.id" /></el-select>
            <span v-if="activeProcessTab === 'patrol'" class="auto-sync-tip">现场巡视记录由巡检管理的危大工程现场巡视任务自动同步</span>
            <el-button v-if="canAddProcessRecord" type="primary" size="small" :icon="Plus" @click="openAddRecord">新增{{ currentTab.label }}记录</el-button>
          </div>
        </div>
        <el-tabs v-model="activeProcessTab" class="process-tabs"><el-tab-pane v-for="tab in PROCESS_TABS" :key="tab.key" :label="tab.label" :name="tab.key" /></el-tabs>
        <div class="table-meta"><span>{{ currentTab.label }}台账</span><small>共 {{ processRows.length }} 条记录</small></div>
        <el-table :data="processRows" border stripe empty-text="暂无记录" class="business-table process-ledger-table">
          <el-table-column type="index" label="序号" width="56" />
          <el-table-column prop="partName" label="施工部位" min-width="230" show-overflow-tooltip />
          <template v-if="activeProcessTab === 'controlPoints'">
            <el-table-column prop="controlPointContent" label="管控要点" min-width="320" show-overflow-tooltip />
            <el-table-column prop="date" label="记录日期" width="120" />
            <el-table-column label="显示状态" width="140"><template #default="{ row }"><el-tag size="small" :type="row.displayStatus === 'red' ? 'danger' : 'success'">{{ row.displayStatusText || '—' }}</el-tag></template></el-table-column>
          </template>
          <template v-else><el-table-column v-for="column in currentConfig.columns" :key="column.key" :label="column.label" :width="column.width" :min-width="column.minWidth" show-overflow-tooltip><template #default="{ row }"><template v-if="column.mask"><span>{{ isRevealed(`${row.id}-${column.key}`) ? (row[column.fullKey] || row[column.key] || '—') : (row[column.key] || '—') }}</span><el-button link type="primary" @click.stop="toggleReveal(`${row.id}-${column.key}`)">{{ isRevealed(`${row.id}-${column.key}`) ? '隐藏' : '查看' }}</el-button></template><span v-else>{{ tableValue(row, column) }}</span></template></el-table-column></template>
          <el-table-column v-if="!['workerRegistration', 'patrol'].includes(activeProcessTab)" label="附件" width="80"><template #default="{ row }">{{ String(row.attachmentInfo || '').split('\n').filter(Boolean).length }}</template></el-table-column>
          <el-table-column prop="createdBy" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="170" />
          <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openViewRecord(row)">查看</el-button></template></el-table-column>
        </el-table>

        <div v-if="!['workerRegistration', 'patrol'].includes(activeProcessTab)" class="process-files">
          <div class="table-meta"><span>附件资料</span><small>共 {{ tabAttachmentRows.length }} 个文件</small></div>
          <el-table :data="tabAttachmentRows" border empty-text="暂无数据" class="process-file-table">
            <el-table-column type="index" label="序号" width="70" align="center" />
            <el-table-column prop="fileName" label="文件名称" min-width="320" show-overflow-tooltip />
            <el-table-column prop="uploader" label="上传人" min-width="180" />
            <el-table-column prop="uploadTime" label="上传时间" min-width="200" />
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }"><el-button link type="primary" @click="openTabAttachment(row)">查看</el-button></template>
            </el-table-column>
          </el-table>
        </div>
      </section>

      <div class="page-actions"><el-button @click="back">{{ canEditBasic ? '取消' : '返回' }}</el-button><el-button v-if="canEditBasic" type="primary" @click="saveBasicInfo">提交</el-button></div>

      <el-dialog v-model="recordDialogVisible" :title="`${recordDialogMode === 'view' ? '查看' : '新增'}${currentTab.label}记录`" width="880px" destroy-on-close top="4vh">
        <template v-if="recordDialogMode === 'view'">
          <div class="record-detail-head">
            <div>
              <h3>{{ currentTab.label }}记录详情</h3>
              <p>记录编号：{{ recordForm.id || '—' }}</p>
            </div>
          </div>

          <section class="record-detail-section">
            <div class="record-detail-title">记录概况</div>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="施工部位" :span="2">{{ recordDetailPartName }}</el-descriptions-item>
              <el-descriptions-item label="记录类型">{{ currentTab.label }}</el-descriptions-item>
              <el-descriptions-item label="创建人">{{ recordForm.createdBy || '—' }}</el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ recordForm.createdAt || recordForm.date || '—' }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="record-detail-section">
            <div class="record-detail-title">{{ activeProcessTab === 'workerRegistration' ? '实名制人员信息' : activeProcessTab === 'controlPoints' ? '管控要点信息' : '业务详情' }}</div>
            <el-descriptions v-if="activeProcessTab === 'controlPoints'" :column="2" border>
              <el-descriptions-item label="管控要点" :span="2">{{ recordForm.controlPointContent || recordForm.content || '—' }}</el-descriptions-item>
              <el-descriptions-item label="显示状态（红）"><el-tag type="danger">{{ recordForm.redStatusText || '未落实' }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="显示状态（绿）"><el-tag type="success">{{ recordForm.greenStatusText || '已落实' }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="本次显示状态"><el-tag :type="recordForm.displayStatus === 'red' ? 'danger' : 'success'">{{ recordForm.displayStatusText || (recordForm.displayStatus === 'red' ? recordForm.redStatusText : recordForm.greenStatusText) || '—' }}</el-tag></el-descriptions-item>
              <el-descriptions-item label="记录日期">{{ recordForm.date || '—' }}</el-descriptions-item>
            </el-descriptions>
            <el-descriptions v-else :column="2" border>
              <el-descriptions-item v-for="field in recordDetailFields" :key="field.label" :label="field.label" :span="field.wide ? 2 : 1">
                <div v-if="field.progress" class="education-progress">
                  <el-progress :percentage="Math.round((field.progress.done / field.progress.total) * 100)" :stroke-width="8" :format="() => `${field.progress.done}/${field.progress.total}`" />
                </div>
                <template v-else-if="field.maskKey">
                  <span class="detail-value">{{ isRevealed(field.maskKey) ? (field.fullValue || field.value || '—') : (field.value || '—') }}</span>
                  <el-button link type="primary" @click.stop="toggleReveal(field.maskKey)">{{ isRevealed(field.maskKey) ? '隐藏' : '查看' }}</el-button>
                </template>
                <span v-else class="detail-value">{{ field.value === '' || field.value === undefined || field.value === null ? '—' : field.value }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </section>

          <section v-if="!['workerRegistration', 'patrol'].includes(activeProcessTab)" class="record-detail-section">
            <div class="record-detail-title">{{ recordAttachmentLabel }}</div>
            <div v-if="recordAttachmentNames.length" class="detail-attachment-list">
              <div v-for="(name, index) in recordAttachmentNames" :key="name" class="detail-attachment-item"><span class="attachment-index">{{ index + 1 }}</span><span>{{ name }}</span></div>
            </div>
            <el-empty v-else :image-size="54" description="暂无附件资料" />
          </section>
        </template>

        <el-form v-else label-width="150px">
          <el-form-item :label="recordPartLabel" required><el-select v-model="recordForm.partId" :disabled="recordDialogMode === 'view'" :placeholder="`请选择${recordPartLabel}`" style="width:100%"><el-option v-for="part in form.parts" :key="part.id" :label="part.wbsPath || part.name" :value="part.id" /></el-select></el-form-item>
          <el-table v-if="activeProcessTab === 'controlPoints'" :data="controlPointStatusRows" border stripe class="control-point-status-table" empty-text="当前类别描述尚未配置管控要点">
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column prop="content" label="管控要点" min-width="300" />
            <el-table-column label="显示状态（红）" min-width="140"><template #default="{ row }"><el-tag type="danger">{{ row.redStatusText }}</el-tag></template></el-table-column>
            <el-table-column label="显示状态（绿）" min-width="140"><template #default="{ row }"><el-tag type="success">{{ row.greenStatusText }}</el-tag></template></el-table-column>
            <el-table-column label="本次显示状态" width="210"><template #default="{ row }"><el-tag v-if="recordDialogMode === 'view'" :type="row.displayStatus === 'red' ? 'danger' : 'success'">{{ row.displayStatusText || (row.displayStatus === 'red' ? row.redStatusText : row.greenStatusText) }}</el-tag><el-select v-else v-model="row.displayStatus" placeholder="请选择显示状态" style="width:100%"><el-option :label="`红：${row.redStatusText}`" value="red" /><el-option :label="`绿：${row.greenStatusText}`" value="green" /></el-select></template></el-table-column>
          </el-table>
          <el-row v-else :gutter="20">
            <el-col v-for="field in visibleRecordFields" :key="field.key" :span="field.span || 12">
              <el-form-item :label="field.label" :required="field.required">
                <el-select v-if="field.type === 'select'" v-model="recordForm[field.key]" :disabled="recordFieldDisabled(field)" clearable :placeholder="field.placeholder || `请选择${field.label}`" style="width:100%"><el-option v-for="option in field.options" :key="option" :label="option" :value="option" /></el-select>
                <el-select v-else-if="field.type === 'person'" v-model="recordForm[field.key]" :disabled="recordFieldDisabled(field)" filterable :placeholder="field.placeholder || `请选择${field.label}`" style="width:100%"><el-option v-for="item in responsibleOptions" :key="item" :label="item" :value="item" /></el-select>
                <el-select v-else-if="field.type === 'people'" v-model="recordForm[field.key]" multiple filterable clearable collapse-tags collapse-tags-tooltip placeholder="请选择接受人，可多选" style="width:100%"><el-option v-for="item in responsibleOptions" :key="item" :label="item" :value="item" /></el-select>
                <el-select v-else-if="field.type === 'subcontractor'" v-model="recordForm[field.key]" filterable clearable placeholder="请选择接受分包单位" style="width:100%"><el-option v-for="item in subcontractorOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select>
                <el-select v-else-if="field.type === 'team'" v-model="recordForm[field.key]" filterable clearable placeholder="请选择接受班组" style="width:100%"><el-option v-for="item in teamOptions" :key="item" :label="item" :value="item" /></el-select>
                <el-select v-else-if="field.type === 'inspectionTasks'" v-model="recordForm[field.key]" :disabled="recordFieldDisabled(field)" multiple collapse-tags collapse-tags-tooltip filterable placeholder="请从巡检管理选择巡检单，可多选" style="width:100%" @change="chooseInspectionTasks"><el-option v-for="item in inspectionTaskOptions" :key="item.id" :label="item.label" :value="item.id" /></el-select>
                <el-select v-else-if="field.type === 'realNamePeople'" v-model="recordForm[field.key]" :disabled="recordDialogMode === 'view'" multiple collapse-tags collapse-tags-tooltip filterable placeholder="请选择人员姓名，可多选" style="width:100%"><el-option v-for="person in realNamePersonnel" :key="person.id" :label="person.basic?.name" :value="person.id" /></el-select>
                <el-date-picker v-else-if="field.type === 'date'" v-model="recordForm[field.key]" type="date" value-format="YYYY-MM-DD" :disabled="recordFieldDisabled(field)" style="width:100%" />
                <el-date-picker v-else-if="field.type === 'datetime'" v-model="recordForm[field.key]" type="datetime" value-format="YYYY-MM-DD HH:mm" :disabled="recordFieldDisabled(field)" style="width:100%" />
                <el-input-number v-else-if="field.type === 'number'" v-model="recordForm[field.key]" :disabled="recordFieldDisabled(field)" :min="0" :max="100" controls-position="right" style="width:100%" />
                <el-input v-else-if="field.type === 'textarea'" v-model="recordForm[field.key]" type="textarea" :rows="3" :disabled="recordFieldDisabled(field)" :placeholder="field.placeholder || `请输入${field.label}`" />
                <el-input v-else v-model="recordForm[field.key]" :disabled="recordFieldDisabled(field)" :placeholder="field.placeholder || `请输入${field.label}`" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-table v-if="activeProcessTab === 'workerRegistration' && selectedRealNamePersonnel.length" :data="selectedRealNamePersonnel" border stripe size="small" class="person-preview-table">
            <el-table-column label="姓名" width="100"><template #default="{ row }">{{ row.basic?.name || '—' }}</template></el-table-column>
            <el-table-column label="参建单位" min-width="180"><template #default="{ row }">{{ row.unit?.unit_name || '—' }}</template></el-table-column>
            <el-table-column label="工人类型" width="130"><template #default="{ row }">{{ row.unit?.personnel_category || '—' }}</template></el-table-column>
            <el-table-column label="工种/职务" width="130"><template #default="{ row }">{{ row.unit?.work_type || '—' }}</template></el-table-column>
            <el-table-column label="资格证号" width="160"><template #default="{ row }">{{ row.cert_no || '—' }}</template></el-table-column>
          </el-table>
          <el-form-item v-if="!['workerRegistration', 'patrol'].includes(activeProcessTab)" :label="recordAttachmentLabel" required><div class="record-attachments"><div v-for="name in recordAttachmentNames" :key="name" class="attachment-item"><span>{{ name }}</span><el-button v-if="recordDialogMode !== 'view'" link type="danger" @click="removeRecordAttachment(name)">删除</el-button></div><el-upload v-if="recordDialogMode !== 'view'" :auto-upload="false" :show-file-list="false" :accept="recordAttachmentLabel === '现场照片' ? '.jpg,.jpeg,.png,.webp' : undefined" @change="addRecordAttachment"><el-button :icon="UploadFilled">{{ recordAttachmentLabel === '现场照片' ? '添加图片' : '上传附件' }}</el-button></el-upload><span v-if="recordDialogMode === 'view' && !recordAttachmentNames.length" class="muted">无附件</span></div></el-form-item>
        </el-form>
        <section v-if="activeProcessTab === 'patrol' && selectedInspectionTasks.length" class="record-detail-section patrol-task-section">
          <div class="record-detail-title">巡检单详情</div>
          <el-tabs v-model="inspectionTaskDetailTab" type="border-card" class="inspection-task-tabs">
            <el-tab-pane v-for="task in selectedInspectionTasks" :key="task.id" :name="task.id" :label="task.taskNo || task.taskName">
              <InspectionTaskDetailView :key="task.id" :task="task" embedded />
            </el-tab-pane>
          </el-tabs>
        </section>
        <template #footer><el-button @click="recordDialogVisible = false">关闭</el-button><el-button v-if="recordDialogMode === 'add'" type="primary" @click="submitRecord">提交</el-button></template>
      </el-dialog>

      <el-dialog v-model="attachmentPreviewVisible" title="文件查看" width="680px" destroy-on-close>
        <div v-if="selectedAttachment" class="file-preview-panel">
          <FileAttachmentPreview :name="selectedAttachment.fileName" :url="selectedAttachment.fileUrl" size="lg" />
          <el-descriptions :column="2" border>
            <el-descriptions-item label="文件名称" :span="2">{{ selectedAttachment.fileName }}</el-descriptions-item>
            <el-descriptions-item label="上传人">{{ selectedAttachment.uploader }}</el-descriptions-item>
            <el-descriptions-item label="上传时间">{{ selectedAttachment.uploadTime }}</el-descriptions-item>
          </el-descriptions>
          <div v-if="!selectedAttachment.fileUrl" class="file-preview-tip">当前为演示附件，正式接入文件服务后将在此处加载文件原文。</div>
        </div>
        <template #footer><el-button type="primary" @click="attachmentPreviewVisible = false">关闭</el-button></template>
      </el-dialog>
    </template>
    <el-empty v-else description="危大清单仅支持项目级使用或记录不存在。" />
  </div>
</template>

<style scoped>
.ledger-form-page{min-height:100%;padding:18px 22px 88px;border:0;border-radius:0;background:#f5f7fa}
.page-header{margin-bottom:18px}
.header-nav{display:flex;align-items:center;gap:10px;color:#8a94a6}
.header-nav :deep(.el-button){margin-left:-12px;color:#475467;font-weight:500}
.nav-divider{width:1px;height:14px;background:#d8dde6}
.page-breadcrumb{overflow:hidden;color:#98a2b3;font-size:13px;text-overflow:ellipsis;white-space:nowrap}
.header-main{display:flex;align-items:center;justify-content:space-between;gap:32px;margin-top:12px;padding:20px 22px;border:1px solid #e5e9f0;border-radius:10px;background:linear-gradient(120deg,#fff 0%,#fff 58%,#faf6f8 100%);box-shadow:0 2px 10px rgba(31,41,55,.035)}
.title-block{min-width:0}
.title-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.page-title{margin:0 6px 0 0;color:#172033;font-size:22px;font-weight:650;letter-spacing:.2px}
.page-scope{margin:9px 0 0;color:#667085;font-size:13px}
.page-scope::before{display:inline-block;width:6px;height:6px;margin-right:7px;border-radius:50%;background:var(--ap-primary,#8f0045);content:'';vertical-align:1px}
.stage-panel{flex:0 0 470px;padding-left:26px;border-left:1px solid #ece5e9}
.stage-label{margin:0 0 9px 18px;color:#98a2b3;font-size:12px}
.stage-steps{width:100%}
.stage-steps :deep(.el-step__title){font-size:13px}
.stage-steps :deep(.el-step__icon){width:24px;height:24px;font-size:12px}
.section-card{margin-top:16px;padding:20px 22px;border:1px solid #e5e9f0;border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(31,41,55,.025)}
.section-heading{min-width:0}
.section-title{padding-left:10px;border-left:3px solid var(--ap-primary,#8f0045);color:#273142;font-size:16px;font-weight:650;line-height:20px}
.section-heading p{margin:7px 0 0 13px;color:#98a2b3;font-size:12px}
.section-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:17px}
.basic-form{margin-top:22px;padding:0 8px}
.basic-form :deep(.el-form-item){margin-bottom:20px}
.basic-form :deep(.el-form-item__label){padding-right:16px;color:#667085;font-size:13px}
.basic-form :deep(.el-input__wrapper),.basic-form :deep(.el-select__wrapper){min-height:36px}
.form-text{display:flex;align-items:center;width:100%;min-height:36px;padding:0 12px;border:1px solid #edf0f4;border-radius:6px;background:#f8fafc;color:#344054;line-height:22px;white-space:nowrap}
.description-text{align-items:flex-start;box-sizing:border-box;min-height:46px;padding-top:7px;padding-bottom:7px;white-space:normal}
.part-wbs-cell{display:flex;flex-direction:column;gap:5px}
.part-wbs-cell small,.muted{color:var(--ap-text-muted)}
.business-table{overflow:hidden;border-radius:7px}
.business-table :deep(.el-table__header th),.process-file-table :deep(.el-table__header th){height:44px;background:#f3f5f8!important;color:#475467;font-weight:600}
.business-table :deep(.el-table__row td){padding-top:10px;padding-bottom:10px}
.process-section{scroll-margin-top:12px}
.process-actions{display:flex;align-items:center;gap:10px}
.process-tabs{margin:4px 0 18px;padding:3px 14px 0;border:1px solid #eaedf2;border-radius:8px;background:#f8f9fb}
.auto-sync-tip{margin-left:auto;color:#7c5b00;font-size:12px}
.process-tabs :deep(.el-tabs__header){margin:0}
.process-tabs :deep(.el-tabs__nav-wrap::after){display:none}
.process-tabs :deep(.el-tabs__item){height:46px;color:#667085;font-size:13px}
.process-tabs :deep(.el-tabs__item.is-active){color:var(--ap-primary,#8f0045);font-weight:600}
.table-meta{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;color:#344054}
.table-meta span{font-size:14px;font-weight:600}
.table-meta small{color:#98a2b3;font-size:12px;font-weight:400}
.person-preview-table{margin:0 0 18px}
.record-attachments{display:flex;flex-direction:column;align-items:flex-start;gap:8px;width:100%}
.attachment-item{display:flex;align-items:center;justify-content:space-between;width:100%;padding:7px 11px;border:1px solid #edf0f4;border-radius:5px;background:#f8fafc}
.page-actions{position:sticky;bottom:0;z-index:5;display:flex;justify-content:flex-end;gap:10px;margin:20px -22px -88px;padding:14px 24px;border-top:1px solid #e5e9f0;background:rgba(255,255,255,.96);box-shadow:0 -5px 16px rgba(15,23,42,.07);backdrop-filter:blur(8px)}
@media(max-width:1100px){.header-main{align-items:stretch;flex-direction:column}.stage-panel{flex-basis:auto;width:100%;padding:18px 0 0;border-top:1px solid #ece5e9;border-left:0}.stage-label{margin-left:0}.section-head,.process-actions{align-items:stretch;flex-direction:column}.process-actions :deep(.el-select){width:100%!important}}
@media(max-width:760px){.ledger-form-page{padding-right:14px;padding-left:14px}.header-main,.section-card{padding:16px}.nav-divider,.page-breadcrumb{display:none}.basic-form{padding:0}.page-actions{margin-right:-14px;margin-left:-14px}.title-row{align-items:flex-start}.page-title{width:100%}}
.record-detail-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:-4px 0 16px;padding:14px 16px;border-radius:8px;background:linear-gradient(135deg,#f8fafc,#f2f5f9)}
.record-detail-head h3{margin:0 0 5px;color:#1f2937;font-size:17px}
.record-detail-head p{margin:0;color:var(--ap-text-muted);font-size:12px}
.record-detail-section{margin-top:16px}
.process-files{margin-top:20px;padding:16px;border:1px solid #e8ebf0;border-radius:8px;background:#fafbfc}
.process-files .record-detail-title{margin-bottom:12px}
.process-file-table{overflow:hidden;border-radius:6px;background:#fff}
.file-preview-panel{display:flex;flex-direction:column;gap:18px}
.file-preview-tip{padding:12px 14px;border-radius:6px;background:#f5f7fa;color:var(--ap-text-muted,#7b8494);font-size:13px;line-height:1.6}
.record-detail-title{margin-bottom:10px;padding-left:9px;border-left:3px solid var(--el-color-primary);color:#273142;font-size:14px;font-weight:600}
.detail-value{line-height:1.65;white-space:pre-wrap;word-break:break-word}
.education-progress{max-width:320px;padding-top:4px}
.detail-attachment-list{overflow:hidden;border:1px solid #e5e7eb;border-radius:6px}
.detail-attachment-item{display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid #edf0f4;color:#3f4a5a;font-size:13px}
.detail-attachment-item:last-child{border-bottom:0}
.attachment-index{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;color:var(--el-color-primary);background:var(--el-color-primary-light-9);font-size:12px}
.patrol-task-section{padding:14px;border:1px solid #e5e9f0;border-radius:8px;background:#fafbfc}
.inspection-task-tabs{border-radius:6px;background:#fff}
.inspection-task-tabs :deep(.el-tabs__item){max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.patrol-subtitle{margin:16px 0 10px;color:#344054;font-size:13px;font-weight:600}
</style>

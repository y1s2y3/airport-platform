import { reactive, watch } from 'vue'
import { DEFAULT_INSPECTOR_LABEL, INSPECTION_CATEGORIES, resolveInspectionProjectId } from '../config/inspectionManagement'
import { getDemoInspectionPeople, inspectionPeoplePool } from '../mock/inspectionPeople'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions'

export const inspectorCandidates = [
  ...inspectionPeoplePool,
  { id: 'quality-inspector', name: '郑工', role: '质量巡检人（监理）', phone: '138****8101' },
  { id: 'quality-rectifier', name: '林工', role: '施工单位质量整改人', phone: '138****8102' },
  { id: 'quality-contractor-manager', name: '许经理', role: '施工单位项目经理', phone: '138****8103' },
  { id: 'quality-reviewer', name: '蒋工', role: '监理单位质量复核人', phone: '138****8104' },
  { id: 'quality-director', name: '冯总监', role: '监理单位项目总监', phone: '138****8105' },
  { id: 'quality-hq-manager', name: '邓经理', role: '指挥部项目经理', phone: '138****8106' },
  ...COC_PROJECT_OPTIONS.map(project => ({ id: `manager-${project.id}`, name: getDemoInspectionPeople(project.id).manager, role: '指挥部项目经理', phone: '138****8000' })),
]
export const INSPECTION_PERSON_CONFIG_GROUPS = [
  { value: '安全', label: '安全、其他' },
  { value: '质量', label: '质量' },
]
export const INSPECTION_COPY_FIELDS = [
  { key: 'issueCcPersons', configKey: 'issueCcIds', label: '下发整改单抄送人' },
  { key: 'completionCcPersons', configKey: 'completionCcIds', label: '整改单完成抄送人' },
]
export function getInspectionCopyDetailFields(record, fallback) {
  return INSPECTION_COPY_FIELDS.map(({ key, label }) => {
    const recipients = record?.[key] ?? (key === 'issueCcPersons' ? record?.ccPersons : undefined)
      ?? fallback?.[key] ?? (key === 'issueCcPersons' ? fallback?.ccPersons : undefined)
    const value = (Array.isArray(recipients) ? recipients : String(recipients ?? '').split('、'))
      .map(person => String(person ?? '').trim()).filter(Boolean).join('、')
    return { key, label, value: value || '未设置' }
  })
}

const KEY = 'airport-inspection-person-config-shared-v3'
const LEGACY_KEY = 'airport-inspection-person-config-by-category-v2'
const personnelCategory = category => category === '其他' ? '安全' : category
export function inspectionPersonIds(value) {
  return [...new Set((Array.isArray(value) ? value : [value]).filter(Boolean))]
}
function normalizePeople(config) {
  return {
    ...config,
    rectifierId: inspectionPersonIds(config.rectifierId),
    reviewerId: inspectionPersonIds(config.reviewerId),
    issueCcIds: inspectionPersonIds(config.issueCcIds ?? config.managerId),
    completionCcIds: inspectionPersonIds(config.completionCcIds),
  }
}
const defaults = COC_PROJECT_OPTIONS.flatMap(project => INSPECTION_PERSON_CONFIG_GROUPS.map(({ value: inspectionCategory }) => {
  const people = getDemoInspectionPeople(project.id)
  const quality = inspectionCategory === '质量'
  return {
    projectId: project.id, inspectionCategory, manager: people.manager,
    inspectorId: quality ? 'quality-inspector' : (project.id === 'p-004' ? '' : people.inspector.id),
    rectifierId: quality ? 'quality-rectifier' : people.rectifier.id,
    reviewerId: quality ? 'quality-reviewer' : people.reviewer.id,
    managerId: quality ? 'quality-hq-manager' : `manager-${project.id}`,
    contractorManagerId: quality ? 'quality-contractor-manager' : '',
    directorId: quality ? 'quality-director' : '',
  }
}))
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || 'null')
  if (Array.isArray(saved)) for (const config of defaults) {
    // 合并时优先沿用安全配置；仅有其他配置的项目使用其他配置，旧缓存保留以便核对。
    const match = saved.find(item => item.projectId === config.projectId && item.inspectionCategory === config.inspectionCategory)
      || (config.inspectionCategory === '安全' ? saved.find(item => item.projectId === config.projectId && item.inspectionCategory === '其他') : null)
    if (match) Object.assign(config, match, { projectId: config.projectId, inspectionCategory: personnelCategory(match.inspectionCategory) })
  }
} catch { /* 保留初始配置。 */ }
export const inspectionPersonConfigs = reactive(defaults.map(normalizePeople))
watch(inspectionPersonConfigs, value => {
  try { localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* 会话内可继续使用。 */ }
}, { deep: true, immediate: true })
export function getInspectionPersonConfig(projectIdOrName, category = '安全') {
  const projectId = resolveInspectionProjectId(projectIdOrName)
  return inspectionPersonConfigs.find(item => item.projectId === projectId && item.inspectionCategory === personnelCategory(category))
}
export function getInspectorById(id) { return inspectorCandidates.find(item => item.id === id) }
export function getConfiguredPersonLabel(project, category, field) {
  return inspectionPersonIds(getInspectionPersonConfig(project, category)?.[field])
    .map(getInspectorById).filter(Boolean).map(person => `${person.name}（${person.role}）`).join('、')
}
export function getInspectionCopyDefaults(project, category = '安全') {
  return {
    issueCcPersons: getConfiguredPersonLabel(project, category, 'issueCcIds'),
    completionCcPersons: getConfiguredPersonLabel(project, category, 'completionCcIds'),
  }
}
export function getProjectInspectorLabel(project, category = '安全') {
  return getConfiguredPersonLabel(project, category, 'inspectorId') || DEFAULT_INSPECTOR_LABEL
}
export function getProjectRectifierLabel(project, category = '安全') {
  return getConfiguredPersonLabel(project, category, 'rectifierId')
}
export function getProjectReviewerLabel(project, category = '安全') {
  return getConfiguredPersonLabel(project, category, 'reviewerId')
}
export function getProjectApproverLabel(project, category = '安全') {
  return getConfiguredPersonLabel(project, category, 'managerId')
}
export function hasCompleteInspectionPersonConfig(project, category = '安全') {
  const config = getInspectionPersonConfig(project, category)
  return Boolean(config?.inspectorId && inspectionPersonIds(config.rectifierId).length && inspectionPersonIds(config.reviewerId).length && config.managerId
    && (category !== '质量' || (config.contractorManagerId && config.directorId)))
}
export function hasInspectionInspectorConfig(project, category = '安全') {
  return Boolean(getInspectionPersonConfig(project, category)?.inspectorId)
}
export function saveInspectionPersonConfig(projectId, data, category = '安全') {
  if (!INSPECTION_CATEGORIES.includes(category)) throw new Error('请选择有效巡检分类')
  projectId = resolveInspectionProjectId(projectId)
  const value = normalizePeople({ ...data, projectId, inspectionCategory: personnelCategory(category) })
  if (category !== '质量') Object.assign(value, { contractorManagerId: '', directorId: '' })
  const existing = getInspectionPersonConfig(projectId, category)
  if (existing) { Object.assign(existing, value); return existing }
  const created = value
  inspectionPersonConfigs.push(created)
  return created
}

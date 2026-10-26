import { buildCocProjectOptions } from '../mock/projectBasicInfo.js'
import { listInspectionHazards } from '../mock/inspectionHazardQuery.js'
import { getSupervisionHazards } from './cocAdminDeviceStorage.js'
import { getDispatchHazards } from './dispatchHazardStorage.js'
import { externalQualityIssues } from '../mock/externalQualityIssues.js'
import { normalizeInspectionCategories } from '../config/inspectionManagement.js'
import { PROJECT_NAMES, PROJECT_SHORT_NAMES } from '../config/projectCatalog.js'

export const HAZARD_ISSUE_SOURCES = [
  { value: 'inspection', label: '安全巡检' },
  { value: 'supervision', label: '监理会议' },
  { value: 'dispatch', label: '调度隐患' },
  { value: 'externalQuality', label: '施工质量问题' },
]

const PROJECT_NAME_ALIASES = {
  捷运线延长段: 'T2空侧捷运线',
}

/**
 * COC 种子的 p-序号与项目主数据的 p-序号不是同一套 ID。
 * 同名/同全称的项目合并为一棵树；其余项目保留各自身份。
 */
export function getHazardIssueProjectOptions() {
  const masterProjects = buildCocProjectOptions()
  const catalogProjects = PROJECT_NAMES.map((fullName, index) => {
    const master = masterProjects.find((item) => item.fullName === fullName)
    return {
      key: `catalog:${index}`,
      label: master?.label || PROJECT_SHORT_NAMES[index],
      fullName,
      catalogName: PROJECT_SHORT_NAMES[index],
      masterId: master?.id || '',
    }
  })
  const extraMasterProjects = masterProjects
    .filter((item) => !PROJECT_NAMES.includes(item.fullName))
    .map((item) => ({
      key: `master:${item.id}`,
      label: item.label,
      fullName: item.fullName,
      catalogName: '',
      masterId: item.id,
    }))
  return [...catalogProjects, ...extraMasterProjects]
}

export function getCurrentHazardIssueProjectKey(masterId) {
  return getHazardIssueProjectOptions().find((item) => item.masterId === masterId)?.key || ''
}

function resolveProject(source, projectId, projectName) {
  const projects = getHazardIssueProjectOptions()
  const canonicalName = PROJECT_NAME_ALIASES[projectName] || projectName
  const byName = projects.find((item) =>
    item.label === canonicalName || item.fullName === canonicalName || item.catalogName === canonicalName,
  )
  const byMasterId = projects.find((item) => item.masterId && item.masterId === projectId)
  const matched = source === 'inspection' || source === 'externalQuality'
    ? byMasterId || byName
    : byName || (!projectName ? byMasterId : null)
  return {
    projectKey: matched?.key || '',
    projectName: matched?.label || projectName || '待匹配项目',
    originalProjectName: projectName || '',
  }
}

function summaryRow(source, record, values) {
  const project = resolveProject(source, values.projectId, values.projectName)
  return {
    id: `${source}:${record.id}`,
    source,
    sourceLabel: HAZARD_ISSUE_SOURCES.find((item) => item.value === source)?.label || source,
    sourceId: record.id,
    ...project,
    ...values,
    projectKey: project.projectKey,
    projectName: project.projectName,
    raw: record,
    isDemo: source === 'externalQuality',
    closed: source === 'externalQuality' ? record.status === '已完成' : values.status === '已关闭',
  }
}

function normalizeInspection(record) {
  const categories = normalizeInspectionCategories(record.inspectionCategories || record.inspectionCategory)
  return summaryRow('inspection', record, {
    projectId: record.project_id,
    projectName: record.project,
    originalNo: record.rectifyNo || record.id,
    title: record.desc || '',
    categories,
    categoryLabel: categories.join('、') || '--',
    status: record.status || '',
    rectifier: record.rectifier || '',
    registeredAt: record.issueDate || '',
    deadline: record.deadline || '',
  })
}

function normalizeSupervision(record) {
  const category = record.hazardType === 'quality' ? '质量' : '安全'
  return summaryRow('supervision', record, {
    projectId: record.projectId,
    projectName: record.projectName,
    originalNo: record.id,
    title: record.description || '',
    categories: [category],
    categoryLabel: category,
    status: record.rectifyStatus || '待整改',
    rectifier: record.rectifier || '',
    registeredAt: record.uploadTime || '',
    deadline: record.hazardDeadline || '',
  })
}

function normalizeDispatch(record) {
  const category = record.hazardType === 'quality' ? '质量' : '安全'
  return summaryRow('dispatch', record, {
    projectId: record.projectId,
    projectName: record.projectName,
    originalNo: record.id,
    title: record.description || '',
    categories: [category],
    categoryLabel: category,
    status: record.rectifyStatus || '待整改',
    rectifier: record.rectifier || '',
    registeredAt: record.uploadTime || '',
    deadline: record.hazardDeadline || '',
  })
}

function normalizeExternal(record) {
  return summaryRow('externalQuality', record, {
    projectId: record.projectId,
    projectName: record.projectName,
    originalNo: record.id,
    title: record.title || '',
    categories: ['质量'],
    categoryLabel: '质量',
    status: record.status || '',
    rectifier: record.rectifier || '',
    registeredAt: record.createdAt || '',
    deadline: record.dueAt || '',
  })
}

/** 四个业务来源各保留一条原记录；同一问题跨来源不按描述自动合并。 */
export function getHazardIssueRows() {
  return [
    ...listInspectionHazards().map(normalizeInspection),
    ...getSupervisionHazards().map(normalizeSupervision),
    ...getDispatchHazards().map(normalizeDispatch),
    ...externalQualityIssues.map(normalizeExternal),
  ].sort((a, b) => String(b.registeredAt).localeCompare(String(a.registeredAt)))
}

/** 无期限时返回 null，便于页面区分“未逾期”和“无法判断”。 */
export function isHazardIssueOverdue(row, now = new Date()) {
  if (!row.deadline) return null
  if (row.closed) return false
  if (row.source === 'inspection' && row.status === '已复查') return false
  const raw = String(row.deadline).trim()
  const timestamp = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? new Date(`${raw}T23:59:59`)
    : new Date(raw.replace(' ', 'T'))
  if (Number.isNaN(timestamp.getTime())) return null
  return timestamp.getTime() < now.getTime()
}

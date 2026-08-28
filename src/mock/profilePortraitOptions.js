import { projectList } from './projectBasicInfo'
import { subcontractorList } from './subcontractorManagement'
import { listLocations, resolveLocationPathLabel } from './constructionLocation'

export const yesNoNaOptions = ['是', '否', '不适用']

export const canteenFuelOptions = ['燃气', '电气']

export const superiorManagementUnitOptions = [
  '中国建筑股份有限公司',
  '中国建筑第三工程局有限公司',
  '中国建筑第五工程局有限公司',
  '中国建筑第八工程局有限公司',
  '广东建工集团有限公司',
  '中铁建工集团有限公司',
  '深圳市政集团有限公司',
  '深圳市深水兆业工程顾问有限公司',
  '深圳市政监理有限公司',
  '深圳监理公司',
]

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function collectField(field) {
  return uniqueSorted(projectList.map((item) => item[field]))
}

function projectField(projectId, field) {
  const project = projectList.find((item) => item.id === projectId)
  return project?.[field] || ''
}

/** 施工总承包单位候选（项目优先 + 全局池） */
export function listProfileContractorUnits(projectId = '') {
  const current = projectField(projectId, 'contractorUnit')
  return uniqueSorted([current, ...collectField('contractorUnit')])
}

/** 监理单位候选 */
export function listProfileSupervisorUnits(projectId = '') {
  const current = projectField(projectId, 'supervisorUnit')
  return uniqueSorted([current, ...collectField('supervisorUnit')])
}

/** 分包单位候选（已通过报审台账 + 项目已填） */
export function listProfileSubcontractorUnits(projectId = '') {
  const fromLedger = subcontractorList
    .filter((row) => row.status === '已通过')
    .filter((row) => !projectId || row.projectId === projectId)
    .map((row) => row.name)
  const fromProject = projectField(projectId, 'subcontractorUnit')
  const fromBlocks = projectList
    .filter((item) => !projectId || item.id === projectId)
    .flatMap((item) => (item.safetyProfile?.subcontractorBlocks || []).map((block) => block.unitName))
  const splitMain = String(fromProject || '')
    .split(/[；;、，,]+/)
    .map((part) => part.trim())
  return uniqueSorted([...fromLedger, ...splitMain, ...fromBlocks])
}

/** 施工地点候选（施工部位库路径 + 项目已填） */
export function listProfileConstructionSites(projectId = '') {
  const fromProject = projectList
    .filter((item) => !projectId || item.id === projectId)
    .map((item) => item.constructionSite)
  const fromLocations = projectId
    ? listLocations(projectId).map((loc) => resolveLocationPathLabel(loc.id) || loc.name)
    : []
  return uniqueSorted([...fromProject, ...fromLocations])
}

export function parseMultiUnitText(raw) {
  return String(raw || '')
    .split(/[；;、，,\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function joinMultiUnitText(names) {
  const list = Array.isArray(names) ? names.filter(Boolean) : []
  return list.join('；')
}

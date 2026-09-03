import { reactive } from 'vue'
import {
  DEFAULT_INSPECTOR_LABEL,
  resolveInspectionProjectId,
} from '../config/inspectionManagement'
import {
  getDemoInspectionPeople,
  inspectionPeoplePool,
} from '../mock/inspectionDemoData'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions'

export const inspectorCandidates = inspectionPeoplePool

export const inspectionPersonConfigs = reactive(COC_PROJECT_OPTIONS.map(project => {
  const people = getDemoInspectionPeople(project.id)
  return {
    projectId: project.id,
    manager: people.manager,
    inspectorId: people.inspector.id,
    rectifierId: people.rectifier.id,
    reviewerId: people.reviewer.id,
  }
}))

/**
 * 演示「人员未配置 / 配置不全」假数据（须使用台账真实 projectId）：
 * - 未配巡检人 → 下发任务项目下拉置灰不可选
 * - 已配巡检人但缺整改人/复查人 → 可选，但提交时拦截
 */
const DEMO_PERSON_CONFIG_GAPS = [
  // 未配置巡检人（置灰）
  { projectId: 'p-pump-002', inspectorId: '', rectifierId: '', reviewerId: '' },
  { projectId: 'p-east-apron', inspectorId: '', rectifierId: '', reviewerId: '' },
  // 配置不全：有巡检人，缺整改人与复查人（可选但不可下发）
  { projectId: 'p-phase3', rectifierId: '', reviewerId: '' },
]

for (const gap of DEMO_PERSON_CONFIG_GAPS) {
  const row = inspectionPersonConfigs.find(item => item.projectId === gap.projectId)
  if (!row) continue
  if ('inspectorId' in gap) row.inspectorId = gap.inspectorId
  if ('rectifierId' in gap) row.rectifierId = gap.rectifierId
  if ('reviewerId' in gap) row.reviewerId = gap.reviewerId
}

export function getInspectionPersonConfig(projectIdOrName) {
  const projectId = resolveInspectionProjectId(projectIdOrName)
  return inspectionPersonConfigs.find(item => item.projectId === projectId)
}

export function getInspectorById(id) {
  return inspectorCandidates.find(item => item.id === id)
}

/** 巡检任务使用项目人员配置；兜底值仅用于异常数据展示。 */
export function getProjectInspectorLabel(projectIdOrName) {
  const config = getInspectionPersonConfig(projectIdOrName)
  const person = getInspectorById(config?.inspectorId)
  return person ? `${person.name}（${person.role}）` : DEFAULT_INSPECTOR_LABEL
}

export function hasCompleteInspectionPersonConfig(projectIdOrName) {
  const config = getInspectionPersonConfig(projectIdOrName)
  return Boolean(config?.inspectorId && config?.rectifierId && config?.reviewerId)
}

/** 下发任务选择项目时，巡检人是项目可选的前置条件。 */
export function hasInspectionInspectorConfig(projectIdOrName) {
  const config = getInspectionPersonConfig(projectIdOrName)
  return Boolean(config?.inspectorId)
}

export function getProjectRectifierLabel(projectIdOrName) {
  const config = getInspectionPersonConfig(projectIdOrName)
  const person = getInspectorById(config?.rectifierId)
  return person ? `${person.name}（${person.role}）` : ''
}

export function getProjectReviewerLabel(projectIdOrName) {
  const config = getInspectionPersonConfig(projectIdOrName)
  const person = getInspectorById(config?.reviewerId)
  return person ? `${person.name}（${person.role}）` : DEFAULT_INSPECTOR_LABEL
}

export function saveInspectionPersonConfig(projectId, data) {
  const existing = getInspectionPersonConfig(projectId)
  if (existing) {
    Object.assign(existing, data)
    return existing
  }
  const created = {
    projectId,
    manager: data.manager || '项目经理',
    inspectorId: data.inspectorId || 'insp-supervisor',
    rectifierId: data.rectifierId || '',
    reviewerId: data.reviewerId || '',
  }
  inspectionPersonConfigs.push(created)
  return created
}

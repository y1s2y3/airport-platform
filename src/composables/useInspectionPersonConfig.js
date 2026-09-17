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

// 演示一条未配置巡检人的项目，供下发任务的置灰/前置条件场景使用。
const unconfiguredInspectorProject = inspectionPersonConfigs.find(item => item.projectId === 'p-004')
if (unconfiguredInspectorProject) unconfiguredInspectorProject.inspectorId = ''

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

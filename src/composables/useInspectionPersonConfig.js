import { reactive } from 'vue'
import {
  DEFAULT_INSPECTOR,
  DEFAULT_INSPECTOR_LABEL,
  resolveInspectionProjectId,
} from '../config/inspectionManagement'

export const inspectorCandidates = [
  DEFAULT_INSPECTOR,
  { id: 'insp-001', name: '王工', role: '项目安全员', phone: '138****1024' },
  { id: 'insp-002', name: '刘工', role: '专职安全员', phone: '138****2048' },
  { id: 'insp-003', name: '陈工', role: '安全主管', phone: '138****3096' },
  { id: 'insp-004', name: '吴工', role: '巡检员', phone: '138****4072' },
  { id: 'insp-005', name: '赵工', role: '项目安全负责人', phone: '138****5068' },
]

export const inspectionPersonConfigs = reactive([
  { projectId: 'p-000', manager: '赵经理', inspectorId: 'insp-supervisor', rectifierId: 'insp-001', reviewerId: 'insp-supervisor' },
  { projectId: 'p-001', manager: '李经理', inspectorId: 'insp-supervisor', rectifierId: 'insp-002', reviewerId: 'insp-supervisor' },
  { projectId: 'p-003', manager: '周经理', inspectorId: 'insp-supervisor', rectifierId: 'insp-003', reviewerId: 'insp-supervisor' },
  { projectId: 'p-004', manager: '钱经理', inspectorId: 'insp-supervisor', rectifierId: 'insp-004', reviewerId: 'insp-supervisor' },
  { projectId: 'p-005', manager: '孙经理', inspectorId: 'insp-supervisor', rectifierId: 'insp-005', reviewerId: 'insp-supervisor' },
])

export function getInspectionPersonConfig(projectIdOrName) {
  const projectId = resolveInspectionProjectId(projectIdOrName)
  return inspectionPersonConfigs.find(item => item.projectId === projectId)
}

export function getInspectorById(id) {
  return inspectorCandidates.find(item => item.id === id)
}

/** 巡检任务优先使用项目人员配置，未配置时默认监理。 */
export function getProjectInspectorLabel(projectIdOrName) {
  const config = getInspectionPersonConfig(projectIdOrName)
  const person = getInspectorById(config?.inspectorId)
  return person ? `${person.name}（${person.role}）` : DEFAULT_INSPECTOR_LABEL
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

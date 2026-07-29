import { reactive } from 'vue'

export const inspectorCandidates = [
  { id: 'insp-001', name: '王工', role: '项目安全员', phone: '138****1024' },
  { id: 'insp-002', name: '刘工', role: '专职安全员', phone: '138****2048' },
  { id: 'insp-003', name: '陈工', role: '安全主管', phone: '138****3096' },
  { id: 'insp-004', name: '吴工', role: '巡检员', phone: '138****4072' },
  { id: 'insp-005', name: '赵工', role: '项目安全负责人', phone: '138****5068' },
]

export const inspectionPersonConfigs = reactive([
  { projectId: 'p-000', manager: '赵经理', inspectorId: 'insp-001' },
  { projectId: 'p-001', manager: '李经理', inspectorId: 'insp-002' },
  { projectId: 'p-003', manager: '周经理', inspectorId: 'insp-003' },
  { projectId: 'p-004', manager: '钱经理', inspectorId: 'insp-004' },
  { projectId: 'p-005', manager: '孙经理', inspectorId: 'insp-005' },
])

export function getInspectionPersonConfig(projectId) {
  return inspectionPersonConfigs.find(item => item.projectId === projectId)
}

export function getInspectorById(id) {
  return inspectorCandidates.find(item => item.id === id)
}

export function getProjectInspectorLabel(projectId) {
  const config = getInspectionPersonConfig(projectId)
  return getInspectorById(config?.inspectorId)?.name || ''
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
    inspectorId: data.inspectorId || '',
  }
  inspectionPersonConfigs.push(created)
  return created
}

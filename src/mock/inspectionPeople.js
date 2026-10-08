import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { DEFAULT_INSPECTOR } from '../config/inspectionManagement.js'

/** 巡检人员候选池（独立模块，避免与 useMobileRectification 形成循环依赖） */
export const inspectionPeoplePool = [
  DEFAULT_INSPECTOR,
  { id: 'insp-001', name: '王工', role: '项目安全员', phone: '138****1024' },
  { id: 'insp-002', name: '刘工', role: '专职安全员', phone: '138****2048' },
  { id: 'insp-003', name: '陈工', role: '安全主管', phone: '138****3096' },
  { id: 'insp-004', name: '吴工', role: '巡检员', phone: '138****4072' },
  { id: 'insp-005', name: '赵工', role: '项目安全负责人', phone: '138****5068' },
  { id: 'insp-006', name: '周工', role: '质量工程师', phone: '138****6084' },
  { id: 'insp-007', name: '黄工', role: '专业监理工程师', phone: '138****7066' },
]

const managerNames = ['赵经理', '李经理', '周经理', '钱经理', '孙经理', '郑经理', '冯经理', '何经理']

function getProjectIndex(projectId) {
  const index = COC_PROJECT_OPTIONS.findIndex(project => project.id === projectId)
  return index >= 0 ? index : 0
}

export function getDemoInspectionPeople(projectId) {
  const index = getProjectIndex(projectId)
  const inspector = inspectionPeoplePool[index % inspectionPeoplePool.length]
  const rectifier = inspectionPeoplePool[(index + 2) % inspectionPeoplePool.length]
  const reviewer = inspectionPeoplePool[(index + 4) % inspectionPeoplePool.length]
  return {
    manager: managerNames[index % managerNames.length],
    inspector,
    rectifier,
    reviewer,
    inspectorLabel: `${inspector.name}（${inspector.role}）`,
    rectifierLabel: `${rectifier.name}（${rectifier.role}）`,
    reviewerLabel: `${reviewer.name}（${reviewer.role}）`,
  }
}

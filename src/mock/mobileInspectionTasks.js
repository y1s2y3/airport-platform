/**
 * 移动端巡检任务共享 store（列表 / 新建 / 详情共用）
 */
import { reactive } from 'vue'
import { DEFAULT_INSPECTOR_LABEL } from '../config/inspectionManagement'

const seedTasks = [
  {
    id: 'mt-000',
    taskNo: 'AQXJ20260730001',
    source: '任务下发',
    taskName: '高处作业安全检查',
    inspectionCategory: '安全',
    project: '飞行区跑道延长工程',
    projectId: 'p-000',
    executor: '监理',
    deadline: '2026-07-10',
    status: '待执行',
    overdue: true,
    hasRectify: false,
    itemCount: 10,
    hazardCount: 0,
  },
  {
    id: 'mt-001',
    taskNo: 'AQXJ20260728001',
    source: '任务下发',
    taskName: '防台防汛安全检查',
    inspectionCategory: '安全',
    project: '飞行区跑道延长工程',
    projectId: 'p-000',
    executor: '监理',
    deadline: '2026-08-12',
    status: '待执行',
    overdue: false,
    hasRectify: false,
    itemCount: 12,
    hazardCount: 0,
  },
  {
    id: 'mt-002',
    taskNo: 'AQXJ20260718001',
    source: '任务下发',
    taskName: '临时用电安全检查',
    inspectionCategory: '安全',
    project: 'T3航站楼扩建工程',
    projectId: 'p-001',
    executor: '监理',
    deadline: '2026-07-20',
    status: '已完成',
    overdue: false,
    hasRectify: true,
    itemCount: 8,
    hazardCount: 2,
  },
  {
    id: 'mt-003',
    taskNo: 'AQXJ20260721003',
    source: '任务下发',
    taskName: '消防设施安全检查',
    inspectionCategory: '安全',
    project: 'T3航站楼扩建工程',
    projectId: 'p-001',
    executor: '监理',
    deadline: '2026-07-21',
    status: '已完成',
    overdue: false,
    hasRectify: false,
    itemCount: 12,
    hazardCount: 1,
  },
  {
    id: 'mt-004',
    taskNo: 'ZLXJ20260731004',
    source: '任务下发',
    taskName: '进场材料质量检查',
    inspectionCategory: '质量',
    project: '新货运站建设工程',
    projectId: 'p-003',
    executor: DEFAULT_INSPECTOR_LABEL,
    deadline: '2026-07-31',
    status: '已完成',
    overdue: false,
    hasRectify: false,
    itemCount: 0,
    hazardCount: 0,
  },
  {
    id: 'mt-005',
    taskNo: 'ZLXJ20260728005',
    source: '系统自建',
    taskName: '关键工序质量检查',
    inspectionCategory: '质量',
    project: '飞行区跑道延长工程',
    projectId: 'p-000',
    executor: DEFAULT_INSPECTOR_LABEL,
    deadline: '2026-07-15',
    status: '已完成',
    overdue: false,
    hasRectify: true,
    itemCount: 0,
    hazardCount: 1,
  },
]

export const mobileInspectionTasks = reactive([...seedTasks])

export function listMobileInspectionTasks() {
  return mobileInspectionTasks
}

export function getMobileInspectionTask(id) {
  return mobileInspectionTasks.find((t) => t.id === id) || null
}

export function addMobileInspectionTask(task) {
  mobileInspectionTasks.unshift(task)
  return task
}

/** 更新已有任务（执行巡检提交结果等） */
export function updateMobileInspectionTask(id, patch) {
  const target = mobileInspectionTasks.find((t) => t.id === id)
  if (!target) return null
  Object.assign(target, patch)
  return target
}

/** 按任务单编号同步 Web 下发记录的可编辑信息。 */
export function updateMobileInspectionTaskByNo(taskNo, patch) {
  const target = mobileInspectionTasks.find((task) => task.taskNo === taskNo)
  if (!target) return null
  Object.assign(target, patch)
  return target
}

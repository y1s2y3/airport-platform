/**
 * 移动端巡检任务共享 store（列表 / 新建 / 详情共用）
 */
import { reactive } from 'vue'
import { DEFAULT_INSPECTOR_LABEL } from '../config/inspectionManagement'

const seedTasks = [
  {
    id: 'mt-000',
    taskNo: 'AQXJ20260730001',
    planNo: 'AQXJ20260630001',
    source: '任务推送',
    planName: '6月底安全巡检',
    planType: '周检',
    inspectionCategory: '安全',
    inspType: '周检',
    project: '飞行区跑道延长工程',
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
    planNo: 'AQXJ20260719001',
    source: '任务推送',
    planName: '7月第4周安全巡检',
    planType: '周检',
    inspectionCategory: '安全',
    inspType: '周检',
    project: '飞行区跑道延长工程',
    executor: '监理',
    deadline: '2026-07-28',
    status: '待执行',
    overdue: false,
    hasRectify: false,
    itemCount: 12,
    hazardCount: 0,
  },
  {
    id: 'mt-002',
    taskNo: 'AQXJ20260720002',
    planNo: 'AQXJ20260718001',
    source: '任务推送',
    planName: '临时用电专项检查',
    planType: '专项巡检',
    inspectionCategory: '安全',
    inspType: '专项巡检',
    project: 'T3航站楼扩建工程',
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
    planNo: 'AQXJ20260714001',
    source: '任务推送',
    planName: '7月第三周安全巡检',
    planType: '周检',
    inspectionCategory: '安全',
    inspType: '周检',
    project: 'T3航站楼扩建工程',
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
    planNo: '',
    source: '系统自建',
    planName: '【自建】月检巡检',
    planType: '月检',
    inspectionCategory: '质量',
    inspType: '月检',
    project: '新货运站建设工程',
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
    planNo: '',
    source: '系统自建',
    planName: '【自建】专项巡检',
    planType: '专项巡检',
    inspectionCategory: '质量',
    inspType: '专项巡检',
    project: '飞行区跑道延长工程',
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

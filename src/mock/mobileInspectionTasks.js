/**
 * 移动端巡检任务共享 store（列表 / 新建 / 详情共用）
 */
import { reactive } from 'vue'

const seedTasks = [
  {
    id: 'mt-000',
    taskNo: 'XJ20260730001',
    planNo: 'JH2026007',
    source: '任务推送',
    planName: '6月底安全巡检',
    planType: '周检',
    inspType: '周检',
    project: '飞行区跑道延长工程',
    executor: '王工',
    deadline: '2026-07-10',
    status: '待执行',
    overdue: true,
    hasRectify: false,
    itemCount: 10,
    hazardCount: 0,
  },
  {
    id: 'mt-001',
    taskNo: 'XJ20260728001',
    planNo: 'JH2026001',
    source: '任务推送',
    planName: '7月第4周安全巡检',
    planType: '周检',
    inspType: '周检',
    project: '飞行区跑道延长工程',
    executor: '王工',
    deadline: '2026-07-28',
    status: '待执行',
    overdue: false,
    hasRectify: false,
    itemCount: 12,
    hazardCount: 0,
  },
  {
    id: 'mt-002',
    taskNo: 'XJ20260720002',
    planNo: 'JH2026002',
    source: '任务推送',
    planName: '临时用电专项检查',
    planType: '专项巡检',
    inspType: '专项巡检',
    project: 'T3航站楼扩建工程',
    executor: '王工',
    deadline: '2026-07-20',
    status: '已完成',
    overdue: false,
    hasRectify: true,
    itemCount: 8,
    hazardCount: 2,
  },
  {
    id: 'mt-003',
    taskNo: 'XJ20260721003',
    planNo: 'JH2026001',
    source: '任务推送',
    planName: '7月第三周安全巡检',
    planType: '周检',
    inspType: '周检',
    project: 'T3航站楼扩建工程',
    executor: '王工',
    deadline: '2026-07-21',
    status: '已完成',
    overdue: false,
    hasRectify: false,
    itemCount: 12,
    hazardCount: 1,
  },
  {
    id: 'mt-004',
    taskNo: 'XJ20260731004',
    planNo: '',
    source: '系统自建',
    planName: '【自建】月检巡检',
    planType: '月检',
    inspType: '月检',
    project: '新货运站建设工程',
    executor: '王工',
    deadline: '2026-07-31',
    status: '已完成',
    overdue: false,
    hasRectify: false,
    itemCount: 0,
    hazardCount: 0,
  },
  {
    id: 'mt-005',
    taskNo: 'XJ20260728005',
    planNo: '',
    source: '系统自建',
    planName: '【自建】专项巡检',
    planType: '专项巡检',
    inspType: '专项巡检',
    project: '飞行区跑道延长工程',
    executor: '王工',
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

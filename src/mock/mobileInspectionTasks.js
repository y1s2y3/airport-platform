/**
 * 移动端巡检任务共享 store（列表 / 新建 / 详情共用）
 */
import { reactive } from 'vue'
import { DEFAULT_INSPECTOR_LABEL } from '../config/inspectionManagement'
import { inspectionTaskSeeds } from './inspectionDemoData'

const seedTasks = [
  {
    id: 'mt-000',
    taskNo: 'AQXJ20260730001',
    source: '任务下发',
    taskName: '高处作业安全检查',
    inspectionCategory: '安全',
    project: 'T2航站区配套',
    projectId: 'p-000',
    project_id: 'p-000',
    executor: '监理',
    inspector: '监理',
    companions: [],
    deadline: '2026-07-10',
    inspectionDate: '',
    status: '待执行',
    overdue: true,
    hasRectify: false,
    itemCount: 10,
    hazardCount: 0,
    result: '',
    normalPhotos: [],
    hazardItems: [],
  },
  {
    id: 'mt-001',
    taskNo: 'AQXJ20260728001',
    source: '任务下发',
    taskName: '防台防汛安全检查',
    inspectionCategory: '安全',
    project: 'T2航站区配套',
    projectId: 'p-000',
    project_id: 'p-000',
    executor: '监理',
    inspector: '监理',
    companions: [],
    deadline: '2026-08-12',
    inspectionDate: '',
    status: '待执行',
    overdue: false,
    hasRectify: false,
    itemCount: 12,
    hazardCount: 0,
    result: '',
    normalPhotos: [],
    hazardItems: [],
  },
  {
    id: 'mt-002',
    taskNo: 'AQXJ20260718001',
    source: '任务下发',
    taskName: '临时用电安全检查',
    inspectionCategory: '安全',
    project: 'T1航站区配套',
    projectId: 'p-001',
    project_id: 'p-001',
    executor: '监理',
    inspector: '监理',
    companions: ['王工'],
    deadline: '2026-07-20',
    inspectionDate: '2026-07-20',
    status: '已完成',
    overdue: false,
    hasRectify: true,
    itemCount: 8,
    hazardCount: 2,
    result: 'hazard',
    normalPhotos: [],
    hazardItems: [
      { desc:'五芯电缆破损，线路未按规范敷设', photos:['隐患照片1.jpg'], hasRectify:true, rectifyNo:'ZG202607001', rectifyId:'rec-001', rectifier:'刘工（专职安全员）', rectifyDeadline:'2026-07-30' },
      { desc:'电缆线路沿地明敷未做保护', photos:['隐患照片2.jpg'], hasRectify:true, rectifyNo:'ZG202607002', rectifyId:'rec-002', rectifier:'刘工（专职安全员）', rectifyDeadline:'2026-07-30' },
    ],
  },
  {
    id: 'mt-003',
    taskNo: 'AQXJ20260721003',
    source: '任务下发',
    taskName: '消防设施安全检查',
    inspectionCategory: '安全',
    project: 'T1航站区配套',
    projectId: 'p-001',
    project_id: 'p-001',
    executor: '监理',
    inspector: '监理',
    companions: ['陈工'],
    deadline: '2026-07-21',
    inspectionDate: '2026-07-21',
    status: '已完成',
    overdue: false,
    hasRectify: false,
    itemCount: 12,
    hazardCount: 0,
    result: 'normal',
    normalPhotos: ['巡检照片1.jpg', '巡检照片2.jpg'],
    hazardItems: [],
  },
  {
    id: 'mt-004',
    taskNo: 'ZLXJ20260731004',
    source: '任务下发',
    taskName: '进场材料质量检查',
    inspectionCategory: '质量',
    project: '二跑道FOD探测',
    projectId: 'p-003',
    project_id: 'p-003',
    executor: DEFAULT_INSPECTOR_LABEL,
    inspector: DEFAULT_INSPECTOR_LABEL,
    companions: ['刘工'],
    deadline: '2026-07-31',
    inspectionDate: '2026-07-31',
    status: '已完成',
    overdue: false,
    hasRectify: false,
    itemCount: 6,
    hazardCount: 0,
    result: 'normal',
    normalPhotos: ['巡检照片1.jpg', '巡检照片2.jpg'],
    hazardItems: [],
  },
  {
    id: 'mt-005',
    taskNo: 'ZLXJ20260728005',
    source: '系统自建',
    taskName: '关键工序质量检查',
    inspectionCategory: '质量',
    project: 'T2航站区配套',
    projectId: 'p-000',
    project_id: 'p-000',
    executor: DEFAULT_INSPECTOR_LABEL,
    inspector: DEFAULT_INSPECTOR_LABEL,
    companions: ['吴工'],
    deadline: '2026-07-15',
    inspectionDate: '2026-07-15',
    status: '已完成',
    overdue: false,
    hasRectify: true,
    itemCount: 6,
    hazardCount: 1,
    result: 'hazard',
    normalPhotos: [],
    hazardItems: [
      { desc:'电缆破损，存在安全隐患', photos:['隐患照片1.jpg'], hasRectify:true, rectifyNo:'ZG202607007', rectifyId:'rec-007', rectifier:'赵工', rectifyDeadline:'2026-08-05' },
    ],
  },
]

export const mobileInspectionTasks = reactive([...seedTasks, ...inspectionTaskSeeds])

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

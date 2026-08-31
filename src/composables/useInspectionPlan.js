import { reactive, computed } from 'vue'
import { buildInspectionTaskNo, DEFAULT_INSPECTOR_LABEL } from '../config/inspectionManagement'
import { addMobileInspectionTask, updateMobileInspectionTaskByNo } from '../mock/mobileInspectionTasks'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions'
import { inspectionTaskSeeds } from '../mock/inspectionDemoData'
import { getProjectInspectorLabel } from './useInspectionPersonConfig'

// ========== 项目列表 ==========
export const projectOptions = COC_PROJECT_OPTIONS.map(project => ({
  id: project.id,
  label: project.label,
  fullName: project.fullName,
  status: '在建',
}))

export const activeProjects = computed(() => projectOptions.filter(p => p.status === '在建'))

// ========== 用户列表 ==========
export const userOptions = [
  { id: 'user-1', label: '张工', role: '安全总监' },
  { id: 'user-2', label: '李工', role: '安全主管' },
  { id: 'user-3', label: '王工', role: '安全员' },
  { id: 'user-4', label: '赵工', role: '项目经理' },
  { id: 'user-5', label: '陈工', role: '监理工程师' },
  { id: 'user-6', label: '刘指挥长', role: '指挥部' },
]

export function getUserLabel(id) {
  const u = userOptions.find(u => u.id === id)
  return u ? `${u.label}（${u.role}）` : ''
}

// ========== 检查分类 & 检查项（最多二级） ==========
export const checkCategoryTree = [
  {
    id: 'cat-1', label: '安全管理行为', inspectionCategory: '安全',
    items: [
      { id: 'item-1-1', label: '是否建立安全生产责任制并逐级签订责任书' },
      { id: 'item-1-2', label: '是否设置安全管理机构并配备专职安全管理人员' },
      { id: 'item-1-3', label: '是否制定安全生产管理制度和操作规程' },
      { id: 'item-1-4', label: '是否对新入场人员进行三级安全教育' },
      { id: 'item-1-5', label: '特种作业人员是否持证上岗' },
      { id: 'item-1-6', label: '分部分项工程是否进行书面安全技术交底' },
      { id: 'item-1-7', label: '是否开展定期和专项安全检查' },
      { id: 'item-1-8', label: '隐患整改是否做到闭环管理' },
      { id: 'item-1-9', label: '是否编制生产安全事故应急预案' },
    ],
  },
  {
    id: 'cat-2', label: '临时用电', inspectionCategory: '安全',
    items: [
      { id: 'item-2-1', label: '在建工程与外电线路的距离是否符合规范要求' },
      { id: 'item-2-2', label: '外电防护设施是否设置到位并有效' },
      { id: 'item-2-3', label: 'TN-S系统是否完整设置（五芯电缆）' },
      { id: 'item-2-4', label: '重复接地电阻值是否符合要求' },
      { id: 'item-2-5', label: '电缆线路是否采取埋地或架空敷设' },
      { id: 'item-2-6', label: '配电箱是否执行"三级配电、两级保护"' },
      { id: 'item-2-7', label: '开关箱是否做到"一机一闸一漏一箱"' },
      { id: 'item-2-8', label: '特殊场所是否使用安全特低电压照明' },
    ],
  },
  {
    id: 'cat-3', label: '高处作业', inspectionCategory: '安全',
    items: [
      { id: 'item-3-1', label: '临边防护栏杆是否按规范设置' },
      { id: 'item-3-2', label: '洞口是否设置盖板或防护栏杆' },
      { id: 'item-3-3', label: '梯子是否完好，安放是否稳固' },
      { id: 'item-3-4', label: '悬空作业是否设置安全防护设施' },
      { id: 'item-3-5', label: '悬空作业人员是否正确佩戴安全带' },
      { id: 'item-3-6', label: '操作平台是否经过设计计算' },
      { id: 'item-3-7', label: '安全网是否有产品合格证和准用证' },
    ],
  },
  {
    id: 'cat-4', label: '脚手架工程', inspectionCategory: '安全',
    items: [
      { id: 'item-4-1', label: '脚手架施工方案是否经审批' },
      { id: 'item-4-2', label: '立杆基础是否平整、夯实，有无排水措施' },
      { id: 'item-4-3', label: '连墙件是否按方案设置' },
      { id: 'item-4-4', label: '剪刀撑是否连续设置' },
      { id: 'item-4-5', label: '悬挑梁是否经过设计计算' },
      { id: 'item-4-6', label: '升降脚手架是否经检测合格' },
      { id: 'item-4-7', label: '防坠装置是否灵敏有效' },
      { id: 'item-4-8', label: '模板支撑体系是否按方案搭设' },
    ],
  },
  {
    id: 'cat-5', label: '机械设备', inspectionCategory: '安全',
    items: [
      { id: 'item-5-1', label: '起重机械是否办理使用登记' },
      { id: 'item-5-2', label: '限位装置和保险装置是否齐全有效' },
      { id: 'item-5-3', label: '起重吊装是否设置警戒区域' },
      { id: 'item-5-4', label: '施工机具是否安装保护零线' },
      { id: 'item-5-5', label: '桩工机械作业区域是否安全' },
      { id: 'item-5-6', label: '机械操作人员是否持证上岗' },
    ],
  },
  {
    id: 'cat-6', label: '消防安全', inspectionCategory: '安全',
    items: [
      { id: 'item-6-1', label: '是否按规范配备消防器材' },
      { id: 'item-6-2', label: '消防设施是否定期检查并保持完好有效' },
      { id: 'item-6-3', label: '易燃易爆物品是否分类存放' },
      { id: 'item-6-4', label: '动火作业是否办理审批手续' },
      { id: 'item-6-5', label: '动火现场是否配备灭火器材' },
      { id: 'item-6-6', label: '疏散通道是否保持畅通' },
    ],
  },
  {
    id: 'cat-7', label: '基坑工程', inspectionCategory: '安全',
    items: [
      { id: 'item-7-1', label: '基坑支护方案是否经审批和专家论证' },
      { id: 'item-7-2', label: '支护结构是否按方案施工' },
      { id: 'item-7-3', label: '基坑降排水系统是否运行正常' },
      { id: 'item-7-4', label: '基坑开挖是否分层分段进行' },
      { id: 'item-7-5', label: '基坑周边是否设置安全护栏' },
      { id: 'item-7-6', label: '监测数据是否及时采集并分析' },
    ],
  },
  {
    id: 'cat-8', label: '文明施工', inspectionCategory: '安全',
    items: [
      { id: 'item-8-1', label: '施工现场是否设置连续封闭围挡' },
      { id: 'item-8-2', label: '出入口是否设置门卫及车辆冲洗设施' },
      { id: 'item-8-3', label: '施工道路是否硬化' },
      { id: 'item-8-4', label: '施工现场是否洒水降尘' },
      { id: 'item-8-5', label: '建筑材料是否分类堆放' },
    ],
  },
  {
    id: 'cat-q1', label: '材料质量', inspectionCategory: '质量',
    items: [
      { id: 'item-q1-1', label: '进场材料是否具备合格证及检验报告' },
      { id: 'item-q1-2', label: '见证取样与复试结果是否符合设计要求' },
      { id: 'item-q1-3', label: '材料规格、型号及外观质量是否符合要求' },
    ],
  },
  {
    id: 'cat-q2', label: '施工工艺', inspectionCategory: '质量',
    items: [
      { id: 'item-q2-1', label: '关键工序是否按施工方案和技术交底执行' },
      { id: 'item-q2-2', label: '实测实量结果是否符合验收标准' },
      { id: 'item-q2-3', label: '隐蔽工程验收记录是否完整' },
    ],
  },
]

export function getCategoryLabel(id) {
  const c = checkCategoryTree.find(c => c.id === id)
  return c ? c.label : ''
}

export function getItemLabel(catId, itemId) {
  const cat = checkCategoryTree.find(c => c.id === catId)
  if (!cat) return ''
  const item = cat.items.find(i => i.id === itemId)
  return item ? item.label : ''
}

// ========== 巡检任务下发记录 ==========
// 生成时间戳工具
function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

export const planData = reactive([
  {
    id: 'plan-003',
    inspectionCategory: '安全',
    assigned: true, executors: ['user-2', 'user-3'], planNo: 'AQXJ20260718001', name: '雨季临时用电检查',
    projects: ['T1航站区配套'],
    projectIds: ['p-001'],
    checkConfig: [
      { categoryId: 'cat-2', itemIds: ['item-2-1','item-2-2','item-2-3','item-2-4','item-2-5','item-2-6','item-2-7','item-2-8'] },
    ],
    responsiblePerson: 'user-3', ccPersons: ['user-1', 'user-5'],
    deadlineDate: '2026-07-20',
    status: '已下发', remark: '针对雨季临时用电安全检查',
    createdBy: 'admin', updatedBy: 'admin',
    createdAt: '2026-07-18 16:30', updatedAt: '2026-07-18 16:30',
  },
  {
    id: 'plan-004',
    inspectionCategory: '质量',
    assigned: true, executors: ['user-2'], planNo: 'ZLXJ20260731004', name: '材料进场质量检查',
    projects: ['二跑道FOD探测'],
    projectIds: ['p-003'],
    checkConfig: [
      { categoryId: 'cat-q1', itemIds: ['item-q1-1','item-q1-2','item-q1-3'] },
      { categoryId: 'cat-q2', itemIds: ['item-q2-1','item-q2-2','item-q2-3'] },
    ],
    responsiblePerson: 'user-6', ccPersons: ['user-1', 'user-2', 'user-4'],
    deadlineDate: '2026-07-31',
    status: '已下发', remark: '检查进场材料质量证明及复试资料',
    createdBy: 'admin', updatedBy: 'admin',
    createdAt: '2026-06-10 10:00', updatedAt: '2026-06-30 17:00',
  },
  {
    id: 'plan-005',
    inspectionCategory: '安全',
    assigned: true, executors: ['user-2'], planNo: 'AQXJ20260728001', name: '防台防汛安全检查',
    projects: ['T2航站区配套'],
    projectIds: ['p-000'],
    checkConfig: [
      { categoryId: 'cat-1', itemIds: ['item-1-7', 'item-1-8'] },
      { categoryId: 'cat-3', itemIds: ['item-3-1', 'item-3-2'] },
    ],
    responsiblePerson: 'user-3', ccPersons: ['user-1'],
    deadlineDate: '2026-08-12',
    status: '已下发', remark: '检查防台防汛措施及现场临边防护',
    createdBy: 'admin', updatedBy: 'admin',
    createdAt: '2026-08-06 09:30', updatedAt: '2026-08-06 09:30',
  },
  ...inspectionTaskSeeds
    .filter(task => task.source === '任务下发' && [0, 3].includes(task.demoSlot))
    .map((task, index) => ({
      id: `plan-${task.id}`,
      inspectionCategory: task.inspectionCategory,
      assigned: true,
      executors: ['user-3'],
      planNo: task.taskNo,
      name: task.taskName,
      projects: [task.project],
      projectIds: [task.project_id],
      checkConfig: task.checkConfig.map(config => ({
        categoryId: config.categoryId,
        itemIds: [...config.itemIds],
      })),
      responsiblePerson: 'user-3',
      ccPersons: index % 2 === 0 ? ['user-1', 'user-5'] : ['user-2'],
      deadlineDate: task.deadline,
      status: '已下发',
      remark: index % 2 === 0 ? '请按检查项逐项核查并及时反馈隐患。' : '专项检查任务，请在截止日期前完成。',
      createdBy: '刘指挥长',
      updatedBy: index % 2 === 0 ? '刘指挥长' : '张工',
      createdAt: `2026-08-${String(12 + (index % 12)).padStart(2, '0')} 09:30`,
      updatedAt: `2026-08-${String(12 + (index % 12)).padStart(2, '0')} 10:15`,
    })),
])

export function getPlanById(id) {
  return planData.find(p => p.id === id)
}

function resolvePrimaryProject(plan) {
  const projectId = plan.projectIds?.[0] || plan.project_id || ''
  return projectOptions.find(project => project.id === projectId) || null
}

function createMobileTask(plan, project, taskNo, itemCount) {
  addMobileInspectionTask({
    id: `mt-${String(Date.now()).slice(-8)}`,
    taskNo,
    taskName: plan.name,
    source: '任务下发',
    inspectionCategory: plan.inspectionCategory,
    project: project.label,
    projectId: project.id,
    project_id: project.id,
    executor: getProjectInspectorLabel(project.id) || DEFAULT_INSPECTOR_LABEL,
    inspector: getProjectInspectorLabel(project.id) || DEFAULT_INSPECTOR_LABEL,
    companions: [],
    deadline: plan.deadlineDate,
    inspectionDate: '',
    status: '待执行',
    overdue: false,
    hasRectify: false,
    itemCount,
    hazardCount: 0,
    result: '',
    normalPhotos: [],
    hazardItems: [],
    checkConfig: plan.checkConfig.map(item => ({ categoryId: item.categoryId, itemIds: [...item.itemIds] })),
  })
}

/** 单项目下发（保留正式工程口径，不支持一次多选项目批量下发） */
export function addPlan(plan) {
  const project = resolvePrimaryProject(plan)
  if (!project) return null
  const newId = 'plan-' + String(Date.now()).slice(-6)
  const t = now()
  const date = new Date()
  const dateText = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  const prefix = plan.inspectionCategory === '质量' ? 'ZLXJ' : 'AQXJ'
  const sequence = planData.filter(item => item.planNo?.startsWith(`${prefix}${dateText}`)).length + 1
  const taskNo = buildInspectionTaskNo(plan.inspectionCategory, date, sequence)
  const itemCount = plan.checkConfig.reduce((sum, item) => sum + item.itemIds.length, 0)
  const record = {
    id: newId,
    planNo: taskNo,
    ...plan,
    projects: [project.label],
    projectIds: [project.id],
    assigned: true,
    status: '已下发',
    createdBy: '当前用户',
    updatedBy: '当前用户',
    createdAt: t,
    updatedAt: t,
  }
  createMobileTask(record, project, taskNo, itemCount)
  planData.unshift(record)
  return newId
}

export function updatePlan(id, data) {
  const item = planData.find(p => p.id === id)
  const project = resolvePrimaryProject(data)
  if (!item || !project) return
  Object.assign(item, data, {
    projects: [project.label],
    projectIds: [project.id],
    updatedAt: now(),
    updatedBy: '当前用户',
  })
  updateMobileInspectionTaskByNo(item.planNo, {
    taskName: item.name,
    inspectionCategory: item.inspectionCategory,
    project: project.label,
    projectId: project.id,
    project_id: project.id,
    executor: getProjectInspectorLabel(project.id) || DEFAULT_INSPECTOR_LABEL,
    inspector: getProjectInspectorLabel(project.id) || DEFAULT_INSPECTOR_LABEL,
    deadline: item.deadlineDate,
    itemCount: item.checkConfig.reduce((sum, config) => sum + config.itemIds.length, 0),
    checkConfig: item.checkConfig.map(config => ({ categoryId: config.categoryId, itemIds: [...config.itemIds] })),
  })
}

export function deletePlan(id) {
  const idx = planData.findIndex(p => p.id === id)
  if (idx > -1) planData.splice(idx, 1)
}

export function togglePlanEnabled(id) {
  const item = planData.find(p => p.id === id)
  if (item) {
    item.assigned = !item.assigned
    item.status = item.assigned ? '已下发' : '未下发'
    item.updatedAt = now()
    item.updatedBy = '当前用户'
  }
}

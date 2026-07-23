import { reactive, computed } from 'vue'

// ========== 项目列表 ==========
export const projectOptions = [
  { id: 'proj-1', label: 'T3 航站楼扩建工程', status: '在建' },
  { id: 'proj-2', label: '飞行区跑道延长工程', status: '在建' },
  { id: 'proj-3', label: '新货运站建设工程', status: '在建' },
  { id: 'proj-4', label: '机场北片区路网工程', status: '在建' },
  { id: 'proj-5', label: '员工宿舍楼工程', status: '竣工' },
  { id: 'proj-6', label: '供油管线迁改工程', status: '竣工' },
]

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
    id: 'cat-1', label: '安全管理行为',
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
    id: 'cat-2', label: '临时用电',
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
    id: 'cat-3', label: '高处作业',
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
    id: 'cat-4', label: '脚手架工程',
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
    id: 'cat-5', label: '机械设备',
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
    id: 'cat-6', label: '消防安全',
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
    id: 'cat-7', label: '基坑工程',
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
    id: 'cat-8', label: '文明施工',
    items: [
      { id: 'item-8-1', label: '施工现场是否设置连续封闭围挡' },
      { id: 'item-8-2', label: '出入口是否设置门卫及车辆冲洗设施' },
      { id: 'item-8-3', label: '施工道路是否硬化' },
      { id: 'item-8-4', label: '施工现场是否洒水降尘' },
      { id: 'item-8-5', label: '建筑材料是否分类堆放' },
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

// ========== 巡检计划数据 ==========
// 生成时间戳工具
function now() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

export const planData = reactive([
  {
    id: 'plan-001',
    planNo: 'JH2026001',
    name: '7月第3周联合周检',
    type: '周检',
    projects: ['T3 航站楼扩建工程', '飞行区跑道延长工程'],
    projectIds: ['proj-1', 'proj-2'],
    checkConfig: [
      { categoryId: 'cat-1', itemIds: ['item-1-1', 'item-1-2', 'item-1-3', 'item-1-4'] },
      { categoryId: 'cat-2', itemIds: ['item-2-1', 'item-2-3', 'item-2-6'] },
    ],
    responsiblePerson: 'user-1',
    ccPersons: ['user-3', 'user-4'],
    cycleType: 'week',
    cycleInterval: 1,
    cycleTimes: 3,
    startDate: '2026-07-15',
    endDate: '2026-07-21',
    enabled: true,
    status: '启用',
    remark: '例行周检，覆盖安全管理行为与临时用电重点项',
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: '2026-07-14 09:00',
    updatedAt: '2026-07-15 08:30',
  },
  {
    id: 'plan-002',
    planNo: 'JH2026002',
    name: '7月全项目月度安全检查',
    type: '月检',
    projects: ['T3 航站楼扩建工程', '新货运站建设工程'],
    projectIds: ['proj-1', 'proj-3'],
    checkConfig: [
      { categoryId: 'cat-1', itemIds: ['item-1-1', 'item-1-2', 'item-1-3', 'item-1-4', 'item-1-5'] },
      { categoryId: 'cat-3', itemIds: ['item-3-1', 'item-3-4', 'item-3-5'] },
      { categoryId: 'cat-6', itemIds: ['item-6-1', 'item-6-3', 'item-6-4'] },
    ],
    responsiblePerson: 'user-2',
    ccPersons: ['user-6'],
    cycleType: 'month',
    cycleInterval: 1,
    cycleTimes: 1,
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    enabled: true,
    status: '启用',
    remark: '全项目覆盖月度检查，重点高处作业与消防',
    createdBy: 'user-2',
    updatedBy: 'user-6',
    createdAt: '2026-06-28 14:00',
    updatedAt: '2026-07-01 09:00',
  },
  {
    id: 'plan-003',
    planNo: 'JH2026003',
    name: '雨季临时用电专项巡检',
    type: '专项巡检',
    projects: ['T3 航站楼扩建工程'],
    projectIds: ['proj-1'],
    checkConfig: [
      {
        categoryId: 'cat-2',
        itemIds: [
          'item-2-1', 'item-2-2', 'item-2-3', 'item-2-4',
          'item-2-5', 'item-2-6', 'item-2-7', 'item-2-8',
        ],
      },
    ],
    responsiblePerson: 'user-3',
    ccPersons: ['user-1', 'user-5'],
    cycleType: 'once',
    cycleInterval: 1,
    cycleTimes: 1,
    startDate: '2026-07-20',
    endDate: '2026-07-20',
    enabled: true,
    status: '启用',
    remark: '针对雨季临时用电安全专项检查',
    createdBy: 'user-3',
    updatedBy: 'user-1',
    createdAt: '2026-07-18 16:30',
    updatedAt: '2026-07-18 16:30',
  },
  {
    id: 'plan-004',
    planNo: 'JH2026004',
    name: '上半年综合安全大检查',
    type: '专项巡检',
    projects: ['T3 航站楼扩建工程', '飞行区跑道延长工程', '新货运站建设工程'],
    projectIds: ['proj-1', 'proj-2', 'proj-3'],
    checkConfig: [
      {
        categoryId: 'cat-1',
        itemIds: [
          'item-1-1', 'item-1-2', 'item-1-3', 'item-1-4', 'item-1-5',
          'item-1-6', 'item-1-7', 'item-1-8', 'item-1-9',
        ],
      },
      { categoryId: 'cat-4', itemIds: ['item-4-1', 'item-4-2', 'item-4-3', 'item-4-4'] },
      {
        categoryId: 'cat-6',
        itemIds: ['item-6-1', 'item-6-2', 'item-6-3', 'item-6-4', 'item-6-5', 'item-6-6'],
      },
    ],
    responsiblePerson: 'user-6',
    ccPersons: ['user-1', 'user-2', 'user-4'],
    cycleType: 'once',
    cycleInterval: 1,
    cycleTimes: 1,
    startDate: '2026-06-15',
    endDate: '2026-06-30',
    enabled: false,
    status: '禁用',
    remark: '上半年综合检查（已结束，已禁用）',
    createdBy: 'user-6',
    updatedBy: 'user-2',
    createdAt: '2026-06-10 10:00',
    updatedAt: '2026-06-30 17:00',
  },
  {
    id: 'plan-005',
    planNo: 'JH2026005',
    name: '7月第4周安全巡检',
    type: '周检',
    projects: ['飞行区跑道延长工程'],
    projectIds: ['proj-2'],
    checkConfig: [
      { categoryId: 'cat-2', itemIds: ['item-2-1', 'item-2-6', 'item-2-7'] },
      { categoryId: 'cat-3', itemIds: ['item-3-1', 'item-3-4', 'item-3-5', 'item-3-7'] },
      { categoryId: 'cat-5', itemIds: ['item-5-1', 'item-5-2', 'item-5-6'] },
    ],
    responsiblePerson: 'user-3',
    ccPersons: ['user-1', 'user-5'],
    cycleType: 'week',
    cycleInterval: 1,
    cycleTimes: 2,
    startDate: '2026-07-22',
    endDate: '2026-07-28',
    enabled: true,
    status: '启用',
    remark: '跑道延长段周检，补充机械设备检查项',
    createdBy: 'user-3',
    updatedBy: 'user-3',
    createdAt: '2026-07-19 11:20',
    updatedAt: '2026-07-19 11:20',
  },
  {
    id: 'plan-006',
    planNo: 'JH2026006',
    name: '基坑与脚手架专项巡检',
    type: '专项巡检',
    projects: ['机场北片区路网工程', 'T3 航站楼扩建工程'],
    projectIds: ['proj-4', 'proj-1'],
    checkConfig: [
      {
        categoryId: 'cat-4',
        itemIds: ['item-4-1', 'item-4-2', 'item-4-3', 'item-4-4', 'item-4-7', 'item-4-8'],
      },
      {
        categoryId: 'cat-7',
        itemIds: ['item-7-1', 'item-7-2', 'item-7-3', 'item-7-5', 'item-7-6'],
      },
      { categoryId: 'cat-8', itemIds: ['item-8-1', 'item-8-3', 'item-8-5'] },
    ],
    responsiblePerson: 'user-4',
    ccPersons: ['user-1', 'user-2', 'user-5'],
    cycleType: 'once',
    cycleInterval: 1,
    cycleTimes: 1,
    startDate: '2026-07-25',
    endDate: '2026-08-05',
    enabled: true,
    status: '启用',
    remark: '深基坑开挖高峰期专项检查，同步核查文明施工',
    createdBy: 'user-4',
    updatedBy: 'user-1',
    createdAt: '2026-07-20 09:45',
    updatedAt: '2026-07-21 10:12',
  },
])

export function getPlanById(id) {
  return planData.find(p => p.id === id)
}

export function addPlan(plan) {
  const newId = 'plan-' + String(Date.now()).slice(-6)
  const t = now()
  planData.unshift({
    id: newId, ...plan,
    enabled: true, status: '启用',
    createdBy: '当前用户', updatedBy: '当前用户',
    createdAt: t, updatedAt: t,
  })
  return newId
}

export function updatePlan(id, data) {
  const item = planData.find(p => p.id === id)
  if (item) {
    Object.assign(item, data, { updatedAt: now(), updatedBy: '当前用户' })
  }
}

export function deletePlan(id) {
  const idx = planData.findIndex(p => p.id === id)
  if (idx > -1) planData.splice(idx, 1)
}

export function togglePlanEnabled(id) {
  const item = planData.find(p => p.id === id)
  if (item) {
    item.enabled = !item.enabled
    item.status = item.enabled ? '启用' : '禁用'
    item.updatedAt = now()
    item.updatedBy = '当前用户'
  }
}

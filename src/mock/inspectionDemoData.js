import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { DEFAULT_INSPECTOR } from '../config/inspectionManagement.js'

export const INSPECTION_DEMO_TODAY = '2026-08-27'

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

export const inspectionProjectTree = [
  {
    id: 'hq',
    label: '工程指挥部',
    children: COC_PROJECT_OPTIONS.map(project => ({
      id: project.id,
      label: project.label,
      fullName: project.fullName,
    })),
  },
]

const safetyConfig = [
  { categoryId: 'cat-2', itemIds: ['item-2-1', 'item-2-3', 'item-2-6', 'item-2-7'] },
  { categoryId: 'cat-3', itemIds: ['item-3-1', 'item-3-2', 'item-3-5'] },
]

const qualityConfig = [
  { categoryId: 'cat-q1', itemIds: ['item-q1-1', 'item-q1-2', 'item-q1-3'] },
  { categoryId: 'cat-q2', itemIds: ['item-q2-1', 'item-q2-2', 'item-q2-3'] },
]

const taskNames = [
  '施工现场综合安全检查',
  '临时用电与消防专项检查',
  '进场材料质量检查',
  '高处作业及临边防护检查',
]

const hazardDescriptions = [
  '临时配电箱门未关闭，箱体接地标识缺失',
  '作业面临边防护栏杆局部缺失',
  '消防通道堆放材料，影响应急疏散',
  '进场材料检验报告归档不完整',
  '高处作业人员安全带低挂高用',
  '施工机具保护零线连接不规范',
]

const qualityHazardDescriptions = [
  '进场材料复试报告未及时归档',
  '关键工序技术交底签字不完整',
  '混凝土养护记录填写不连续',
  '隐蔽工程验收影像资料缺失',
]

function taskNo(index, slot, category) {
  const prefix = category === '质量' ? 'ZLXJ' : 'AQXJ'
  const day = String(20 + slot).padStart(2, '0')
  const sequence = String(index * 4 + slot + 1).padStart(3, '0')
  return `${prefix}202608${day}${sequence}`
}

function hazardId(index, slot) {
  return `rec-demo-${String(index).padStart(3, '0')}-${slot + 1}`
}

function rectifyNo(index, slot) {
  return `ZG202608${String(index * 4 + slot + 1).padStart(3, '0')}`
}

function buildHazards(project, index) {
  const people = getDemoInspectionPeople(project.id)
  const category = index % 3 === 0 ? '质量' : '安全'
  const descriptions = category === '质量' ? qualityHazardDescriptions : hazardDescriptions
  const linkedTaskNo = taskNo(index, 3, category)
  const base = {
    taskNo: linkedTaskNo,
    inspectionCategory: category,
    project: project.label,
    projectFullName: project.fullName,
    project_id: project.id,
    rectifier: people.rectifierLabel,
    reviewer: people.reviewerLabel,
    manager: `${people.manager}（项目经理）`,
  }
  return [
    {
      ...base,
      id: hazardId(index, 0),
      rectifyNo: rectifyNo(index, 0),
      issueDate: '2026-08-24',
      deadline: index % 3 === 0 ? '2026-08-22' : '2026-09-03',
      status: '待整改',
      rectDate: '',
      reviewDate: '',
      closeDate: '',
      desc: descriptions[index % descriptions.length],
      hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
    },
    {
      ...base,
      id: hazardId(index, 1),
      rectifyNo: rectifyNo(index, 1),
      issueDate: '2026-08-20',
      deadline: '2026-08-27',
      status: '待复查',
      rectDate: '2026-08-25',
      reviewDate: '',
      closeDate: '',
      desc: descriptions[(index + 1) % descriptions.length],
      hazardPhotos: ['隐患照片1.jpg'],
      rectificationPhotos: ['整改后照片1.jpg', '整改后照片2.jpg'],
      rectificationNote: '已按要求完成整改并清理作业区域，请复查。',
    },
    {
      ...base,
      id: hazardId(index, 2),
      rectifyNo: rectifyNo(index, 2),
      issueDate: '2026-08-18',
      deadline: '2026-08-25',
      status: '已复查',
      rectDate: '2026-08-22',
      reviewDate: '2026-08-24',
      closeDate: '',
      desc: descriptions[(index + 2) % descriptions.length],
      hazardPhotos: ['隐患照片1.jpg'],
      rectificationPhotos: ['整改后照片1.jpg'],
      rectificationNote: '现场整改已完成，相关资料已补充归档。',
      reviewComment: '复查合格，同意提交项目经理审批。',
    },
    {
      ...base,
      id: hazardId(index, 3),
      rectifyNo: rectifyNo(index, 3),
      issueDate: '2026-08-10',
      deadline: '2026-08-18',
      status: '已关闭',
      rectDate: '2026-08-15',
      reviewDate: '2026-08-17',
      closeDate: '2026-08-18',
      desc: descriptions[(index + 3) % descriptions.length],
      hazardPhotos: ['隐患照片1.jpg'],
      rectificationPhotos: ['整改后照片1.jpg'],
      rectificationNote: '整改措施落实到位，现场已恢复正常。',
      reviewComment: '复查合格。',
      approvalComment: '同意关闭。',
    },
  ]
}

export const inspectionHazards = COC_PROJECT_OPTIONS.flatMap(buildHazards)

function buildTasks(project, index) {
  const people = getDemoInspectionPeople(project.id)
  const projectHazards = inspectionHazards.filter(item => item.project_id === project.id)
  const hazardCategory = index % 3 === 0 ? '质量' : '安全'
  const completedHazardItems = projectHazards.map(item => ({
    desc: item.desc,
    photos: [...item.hazardPhotos],
    hasRectify: true,
    rectifyNo: item.rectifyNo,
    rectifyId: item.id,
    rectifier: item.rectifier,
    rectifyDeadline: item.deadline,
  }))
  return [
    {
      id: `mt-demo-${String(index).padStart(3, '0')}-1`,
      demoSlot: 0,
      taskNo: taskNo(index, 0, '安全'),
      source: '任务下发',
      taskName: `${project.label}${taskNames[0]}`,
      inspectionCategory: '安全',
      project: project.label,
      projectFullName: project.fullName,
      projectId: project.id,
      project_id: project.id,
      executor: people.inspectorLabel,
      inspector: people.inspectorLabel,
      companions: [],
      deadline: '2026-09-02',
      inspectionDate: '',
      status: '待执行',
      overdue: false,
      hasRectify: false,
      itemCount: 7,
      hazardCount: 0,
      result: '',
      normalPhotos: [],
      hazardItems: [],
      checkConfig: safetyConfig.map(item => ({ ...item, itemIds: [...item.itemIds] })),
    },
    {
      id: `mt-demo-${String(index).padStart(3, '0')}-2`,
      demoSlot: 1,
      taskNo: taskNo(index, 1, '安全'),
      source: '任务下发',
      taskName: `${project.label}${taskNames[1]}`,
      inspectionCategory: '安全',
      project: project.label,
      projectFullName: project.fullName,
      projectId: project.id,
      project_id: project.id,
      executor: people.inspectorLabel,
      inspector: people.inspectorLabel,
      companions: [],
      deadline: `2026-08-${String(18 + (index % 6)).padStart(2, '0')}`,
      inspectionDate: '',
      status: '待执行',
      overdue: true,
      hasRectify: false,
      itemCount: 7,
      hazardCount: 0,
      result: '',
      normalPhotos: [],
      hazardItems: [],
      checkConfig: safetyConfig.map(item => ({ ...item, itemIds: [...item.itemIds] })),
    },
    {
      id: `mt-demo-${String(index).padStart(3, '0')}-3`,
      demoSlot: 2,
      taskNo: taskNo(index, 2, '质量'),
      source: '系统自建',
      taskName: `${project.label}${taskNames[2]}`,
      inspectionCategory: '质量',
      project: project.label,
      projectFullName: project.fullName,
      projectId: project.id,
      project_id: project.id,
      executor: people.inspectorLabel,
      inspector: people.inspectorLabel,
      companions: ['王工', '刘工'],
      deadline: '2026-08-23',
      inspectionDate: '2026-08-22',
      status: '已完成',
      overdue: false,
      hasRectify: false,
      itemCount: 6,
      hazardCount: 0,
      result: 'normal',
      normalPhotos: ['巡检照片1.jpg', '巡检照片2.jpg'],
      hazardItems: [],
      checkConfig: qualityConfig.map(item => ({ ...item, itemIds: [...item.itemIds] })),
    },
    {
      id: `mt-demo-${String(index).padStart(3, '0')}-4`,
      demoSlot: 3,
      taskNo: taskNo(index, 3, hazardCategory),
      source: '任务下发',
      taskName: `${project.label}${hazardCategory === '质量' ? '关键工序质量专项检查' : taskNames[3]}`,
      inspectionCategory: hazardCategory,
      project: project.label,
      projectFullName: project.fullName,
      projectId: project.id,
      project_id: project.id,
      executor: people.inspectorLabel,
      inspector: people.inspectorLabel,
      companions: ['吴工'],
      deadline: '2026-08-25',
      inspectionDate: '2026-08-24',
      status: '已完成',
      overdue: false,
      hasRectify: true,
      itemCount: hazardCategory === '质量' ? 6 : 7,
      hazardCount: completedHazardItems.length,
      result: 'hazard',
      normalPhotos: [],
      hazardItems: completedHazardItems,
      checkConfig: (hazardCategory === '质量' ? qualityConfig : safetyConfig)
        .map(item => ({ ...item, itemIds: [...item.itemIds] })),
    },
  ]
}

export const inspectionTaskSeeds = COC_PROJECT_OPTIONS.flatMap(buildTasks)

export function getInspectionHazard(id) {
  return inspectionHazards.find(item => item.id === id) || null
}

export function getInspectionHazardDetail(id) {
  const row = getInspectionHazard(id)
  if (!row) return null

  const detail = {
    rn: row.rectifyNo,
    tn: row.taskNo,
    pj: row.project,
    project_id: row.project_id,
    cat: row.inspectionCategory,
    rf: row.rectifier,
    rv: row.reviewer,
    dl: row.deadline,
    st: row.status,
    cd: row.closeDate,
    hazard: { desc: row.desc, photos: [...row.hazardPhotos] },
    flow: [{ a: '下发整改单', d: `${row.issueDate} 09:30` }],
  }

  if (row.rectDate) {
    detail.rectification = {
      date: row.rectDate,
      photos: [...(row.rectificationPhotos || [])],
      note: row.rectificationNote || '已完成整改。',
    }
    detail.flow.push({ a: '整改人提交整改结果', d: `${row.rectDate} 16:20` })
  }
  if (row.reviewDate) {
    detail.reviews = [{
      round: 1,
      date: row.reviewDate,
      comment: row.reviewComment || '整改到位，复查合格。',
      result: '通过',
    }]
    detail.flow.push({ a: '复查人复查通过', d: `${row.reviewDate} 10:10` })
  }
  if (row.status === '已复查') {
    detail.managerApproval = { manager: row.manager, status: '审批中', comment: '-' }
    detail.flow.push({ a: '待项目经理审批', d: '', cur: true })
  } else if (row.status === '已关闭') {
    detail.managerApproval = {
      manager: row.manager,
      date: row.closeDate,
      status: '通过',
      comment: row.approvalComment || '同意关闭。',
    }
    detail.flow.push({ a: '项目经理审批通过，整改单关闭', d: `${row.closeDate} 11:00` })
  } else if (row.status === '待复查') {
    detail.flow.push({ a: '待复查人审核', d: '', cur: true })
  } else {
    detail.flow.push({ a: '等待整改人执行', d: '', cur: true })
  }
  return detail
}

import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { getDemoInspectionPeople, inspectionPeoplePool } from './inspectionPeople.js'

export { getDemoInspectionPeople, inspectionPeoplePool }

export const INSPECTION_DEMO_TODAY = '2026-08-27'

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


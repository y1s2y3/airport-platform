import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { HAZARD_CATEGORIES } from '../config/inspectionManagement.js'
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

/**
 * 危大工程现场巡视「已关联」样例所指向的演示台账。
 * id / sourceId 与 src/utils/majorHazardManualStorage.js 的演示清单（mh-demo-ledger-pit）
 * 保持一致，因此每个项目的危大清单中都能按 sourceId 找到该台账。
 */
const MAJOR_HAZARD_PATROL_LEDGER = {
  id: 'mh-demo-ledger-pit',
  sourceId: 'mh-demo-identify-pit:mh-desc-pit-2',
  name: 'A区地下室基坑土方开挖',
  categoryName: '基坑工程',
}

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
  const projectHazards = [
    {
      ...base,
      hazardCategory: HAZARD_CATEGORIES[(index * 4) % HAZARD_CATEGORIES.length],
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
      hazardCategory: HAZARD_CATEGORIES[(index * 4 + 1) % HAZARD_CATEGORIES.length],
      id: hazardId(index, 1),
      rectifyNo: rectifyNo(index, 1),
      issueDate: '2026-08-20',
      deadline: '2026-08-27',
      status: '待验收',
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
      hazardCategory: HAZARD_CATEGORIES[(index * 4 + 2) % HAZARD_CATEGORIES.length],
      id: hazardId(index, 2),
      rectifyNo: rectifyNo(index, 2),
      issueDate: '2026-08-18',
      deadline: '2026-08-25',
      status: '待复查',
      rectDate: '2026-08-22',
      reviewDate: '2026-08-24',
      closeDate: '',
      desc: descriptions[(index + 2) % descriptions.length],
      hazardPhotos: ['隐患照片1.jpg'],
      rectificationPhotos: ['整改后照片1.jpg'],
      rectificationNote: '现场整改已完成，相关资料已补充归档。',
      reviewComment: '复查合格，同意提交项目经理审批。',
      reviewResult: '通过',
    },
    {
      ...base,
      hazardCategory: HAZARD_CATEGORIES[(index * 4 + 3) % HAZARD_CATEGORIES.length],
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
      reviewResult: '通过',
      approvalComment: '同意关闭。',
    },
    ]
  // 每个项目补 4 条 A 级质量隐患，覆盖待整改/待验收/待复查/已关闭四个状态。
  const qualityPeople = {
    rectifier: '林工（施工单位质量整改人）',
    reviewer: '蒋工（监理单位质量复核人）',
    manager: '邓经理（指挥部项目经理）',
    contractorManager: '许经理（施工单位项目经理）',
    director: '冯总监（监理单位项目总监）',
  }
  const qualityStatuses = [
    { status: '待整改', issueDate: '2026-08-24', deadline: '2026-09-03', hazardCategory: '结构实体质量', desc: '回填土含水量偏高，压实度复检结果不合格', rectDate: '', reviewDate: '', closeDate: '' },
    { status: '待验收', issueDate: '2026-08-20', deadline: '2026-08-27', hazardCategory: '材料质量', desc: '进场钢筋复试报告未及时归档', rectDate: '2026-08-25', reviewDate: '', closeDate: '', rectificationNote: '复试报告已补齐并归档，请监理复查。' },
    { status: '待复查', issueDate: '2026-08-18', deadline: '2026-08-25', hazardCategory: '施工工艺', desc: '道面混凝土切缝深度不足，局部出现裂缝', rectDate: '2026-08-22', reviewDate: '2026-08-24', closeDate: '', reviewComment: '复查合格，同意提交指挥部项目经理审批。', reviewResult: '通过' },
    { status: '已关闭', issueDate: '2026-08-10', deadline: '2026-08-18', hazardCategory: '隐蔽工程验收', desc: '隐蔽工程验收影像资料缺失', rectDate: '2026-08-15', reviewDate: '2026-08-17', closeDate: '2026-08-18', reviewComment: '复查合格。', reviewResult: '通过', approvalComment: '同意关闭。' },
  ]
  const qualityAExamples = qualityStatuses.map((item, slot) => ({
    ...base,
    inspectionCategory: '质量',
    inspectionCategories: ['质量'],
    hazardLevel: 'A',
    ...qualityPeople,
    taskNo: taskNo(index, 4 + slot, '质量'),
    hazardCategory: item.hazardCategory,
    id: hazardId(index, 4 + slot),
    rectifyNo: `ZGQA${String(index + 1).padStart(2, '0')}${slot + 1}`,
    issueDate: item.issueDate,
    deadline: item.deadline,
    status: item.status,
    rectDate: item.rectDate,
    reviewDate: item.reviewDate,
    closeDate: item.closeDate,
    desc: item.desc,
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
    ...(item.rectificationNote ? { rectificationPhotos: ['整改后照片1.jpg'], rectificationNote: item.rectificationNote } : {}),
    ...(item.reviewComment ? { reviewComment: item.reviewComment, reviewResult: item.reviewResult } : {}),
    ...(item.approvalComment ? { approvalComment: item.approvalComment } : {}),
  }))
  return [...projectHazards, ...qualityAExamples]
}

export const inspectionHazards = COC_PROJECT_OPTIONS.flatMap(buildHazards)

function buildTasks(project, index) {
  const people = getDemoInspectionPeople(project.id)
  const projectHazards = inspectionHazards.filter(item => item.project_id === project.id)
  const hazardCategory = index % 3 === 0 ? '质量' : '安全'
  const completedHazardItems = projectHazards.map(item => ({
    hazardCategory: item.hazardCategory,
    hazardLevel: item.hazardLevel || '',
    rectifyRequirement: item.rectifyRequirement || '',
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
      status: '未完成',
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
      status: '未完成',
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
    {
      // 「危大工程现场巡视」已关联样例：WEB 下发、移动端执行时已关联危大工程并完成巡视
      id: `mt-demo-${String(index).padStart(3, '0')}-5`,
      demoSlot: 4,
      taskNo: taskNo(index, 4, '安全'),
      source: '任务下发',
      taskName: `${project.label}危大工程现场巡视专项检查`,
      inspectionCategory: '安全',
      project: project.label,
      projectFullName: project.fullName,
      projectId: project.id,
      project_id: project.id,
      isMajorHazardPatrol: '是',
      majorHazardProjectId: project.id,
      majorHazardProjectName: project.label,
      majorHazardLedgerId: MAJOR_HAZARD_PATROL_LEDGER.id,
      majorHazardSourceId: MAJOR_HAZARD_PATROL_LEDGER.sourceId,
      majorHazardName: MAJOR_HAZARD_PATROL_LEDGER.name,
      executor: people.inspectorLabel,
      inspector: people.inspectorLabel,
      companions: ['王工'],
      deadline: '2026-08-26',
      inspectionDate: '2026-08-25',
      status: '已完成',
      overdue: false,
      hasRectify: false,
      itemCount: 8,
      hazardCount: 0,
      result: 'normal',
      normalPhotos: ['巡检照片1.jpg'],
      hazardItems: [],
      checkConfig: safetyConfig.map(item => ({ ...item, itemIds: [...item.itemIds] })),
    },
  ]
}

export const inspectionTaskSeeds = COC_PROJECT_OPTIONS.flatMap(buildTasks)


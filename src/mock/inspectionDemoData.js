import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { PROJECT_NAMES, PROJECT_SHORT_NAMES } from '../config/projectCatalog.js'
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

/** 各流程环节的示例办理说明，与环节一一对应。 */
const STAGE_COMMENTS = {
  rectify: '已按整改要求完成现场处理，整改照片与复测记录已提交。',
  contractorAcceptance: '施工单位项目经理已核对整改资料与实体质量，验收通过。',
  review: '监理已现场核查整改结果，复核通过，资料与现场一致。',
  directorAcceptance: '项目总监已核验复核依据与实体质量，验收通过。',
  approval: '整改及各级验收资料齐全，指挥部项目经理确认通过。',
  departmentConfirmation: '项目部长确认整改与验收结果，同意关闭整改单。',
}

/** 质量 A 级走扩展流程，各环节办理人按质量口径展示。 */
const EXTENDED_PEOPLE = {
  inspector: '郑工（质量巡检人（监理））',
  rectifier: '林工（施工单位质量整改人）',
  reviewer: '蒋工（监理单位质量复核人）',
  manager: '邓经理（指挥部项目经理）',
  contractorManager: '许经理（施工单位项目经理）',
  director: '冯总监（监理单位项目总监）',
  projectDepartmentHead: '何部长（项目部长）',
}

/**
 * 每个项目 7 条示例：一条对应一个流程节点。
 * done 为该节点之前已办结的环节及日期，节点之后的环节一律留空，
 * 保证「状态 / 当前流程节点 / 详情各信息块」三者一致。
 */
const NODE_EXAMPLE_SEEDS = [
  {
    stage: 'rectify',
    status: '待整改',
    category: '质量',
    level: 'A',
    hazardCategory: '结构实体质量',
    desc: '道面基层局部平整度超差，雨后出现低洼积水',
    requirement: '对低洼部位重新找平并复测，复测合格后提交施工单位项目经理验收。',
    issueDate: '2026-11-20',
    deadline: '2026-11-30',
    done: {},
  },
  {
    stage: 'contractorAcceptance',
    status: '待整改',
    category: '质量',
    level: 'A',
    hazardCategory: '材料质量',
    desc: '进场钢筋复试报告未及时归档，批次无法追溯',
    requirement: '补齐进场钢筋复试报告并按批次归档，报施工单位项目经理验收。',
    issueDate: '2026-11-18',
    deadline: '2026-11-15',
    done: { rectify: '2026-11-21' },
  },
  {
    stage: 'review',
    status: '待验收',
    category: '安全',
    level: 'Ⅱ重点关注的一般隐患',
    hazardCategory: '临边洞口',
    desc: '作业面临边防护栏杆局部缺失，警示标识不完整',
    requirement: '补齐临边防护栏杆及警示标识，整改完成后由监理工程师复核。',
    issueDate: '2026-11-19',
    deadline: '2026-11-24',
    done: { rectify: '2026-11-22' },
  },
  {
    stage: 'directorAcceptance',
    status: '待验收',
    category: '质量',
    level: 'A',
    hazardCategory: '施工工艺',
    desc: '道面混凝土切缝深度不足，局部出现收缩裂缝',
    requirement: '按方案补切缝并做封闭处理，监理复核后由项目总监验收。',
    issueDate: '2026-11-17',
    deadline: '2026-11-28',
    done: { rectify: '2026-11-19', contractorAcceptance: '2026-11-20', review: '2026-11-21' },
  },
  {
    stage: 'approval',
    status: '待复查',
    category: '其他',
    level: 'Ⅲ一般隐患',
    hazardCategory: '现场通行',
    desc: '施工临时通道指引标识缺失，人车分流路线不明确',
    requirement: '补齐通行指引标识、明确人车分流路线，复核后提交指挥部项目经理确认。',
    issueDate: '2026-11-16',
    deadline: '2026-11-26',
    done: { rectify: '2026-11-18', review: '2026-11-20' },
  },
  {
    stage: 'departmentConfirmation',
    status: '待复查',
    category: '质量',
    level: 'A',
    hazardCategory: '防水工程',
    desc: '地下室顶板防水附加层搭接宽度不足',
    requirement: '按规范补做防水附加层并做蓄水试验，各级验收后报项目部长确认。',
    issueDate: '2026-11-13',
    deadline: '2026-11-20',
    done: {
      rectify: '2026-11-14',
      contractorAcceptance: '2026-11-15',
      review: '2026-11-16',
      directorAcceptance: '2026-11-17',
      approval: '2026-11-18',
    },
  },
  {
    stage: 'closed',
    status: '已关闭',
    category: '质量',
    level: 'A',
    hazardCategory: '隐蔽工程验收',
    desc: '隐蔽工程验收影像资料缺失，无法支撑验收结论',
    requirement: '补拍并归档隐蔽工程验收影像资料，完成各级验收后关闭整改单。',
    issueDate: '2026-11-05',
    deadline: '2026-11-15',
    closeDate: '2026-11-21',
    done: {
      rectify: '2026-11-14',
      contractorAcceptance: '2026-11-15',
      review: '2026-11-16',
      directorAcceptance: '2026-11-17',
      approval: '2026-11-18',
      departmentConfirmation: '2026-11-20',
    },
  },
]

function taskNo(index, slot, category) {
  const prefix = category === '质量' ? 'ZLXJ' : 'AQXJ'
  const day = String(20 + slot).padStart(2, '0')
  const sequence = String(index * 4 + slot + 1).padStart(3, '0')
  return `${prefix}202608${day}${sequence}`
}

/** 隐患台账单独一套巡检任务单号，避免与巡检任务示例重复。 */
function hazardTaskNo(index, slot, category) {
  const prefix = category === '质量' ? 'ZLXJ' : 'AQXJ'
  return `${prefix}202611${String(index * 10 + slot + 1).padStart(3, '0')}`
}

function hazardId(index, slot) {
  return `rec-demo-${String(index).padStart(3, '0')}-${slot + 1}`
}

function rectifyNo(index, slot) {
  return `ZG202611${String(index * 10 + slot + 1).padStart(3, '0')}`
}

/** 把已办结环节写进台账行（整改环节同时写 rectDate，供详情与导出读取）。 */
function applyDoneStages(row, done) {
  for (const [stage, date] of Object.entries(done)) {
    const comment = STAGE_COMMENTS[stage]
    if (stage === 'rectify') {
      row.rectificationDate = date
      row.rectDate = date
      row.rectificationPhotos = ['整改完成照片1.jpg', '整改完成照片2.jpg']
      row.rectificationNote = comment
      continue
    }
    row[`${stage}Date`] = date
    row[`${stage}Comment`] = comment
    row[`${stage}Result`] = '通过'
  }
  return row
}

function buildHazards(project, index) {
  const people = getDemoInspectionPeople(project.id, index)
  return NODE_EXAMPLE_SEEDS.map((seed, slot) => {
    const extended = seed.category === '质量' && seed.level === 'A'
    const rolePeople = extended ? EXTENDED_PEOPLE : {
      inspector: people.inspectorLabel,
      rectifier: people.rectifierLabel,
      reviewer: people.reviewerLabel,
      manager: `${people.manager}（项目经理）`,
    }
    const row = {
      ...rolePeople,
      id: hazardId(index, slot),
      taskNo: hazardTaskNo(index, slot, seed.category),
      rectifyNo: rectifyNo(index, slot),
      project: project.label,
      projectFullName: project.fullName,
      project_id: project.id,
      inspectionCategory: seed.category,
      inspectionCategories: [seed.category],
      hazardLevel: seed.level,
      hazardCategory: seed.hazardCategory,
      desc: seed.desc,
      rectifyRequirement: seed.requirement,
      hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
      issueDate: seed.issueDate,
      deadline: seed.deadline,
      status: seed.status,
      issueCcPersons: '陈工（安全主管）、吴工（巡检员）',
      nodeExample: seed.stage,
    }
    if (seed.closeDate) {
      row.closeDate = seed.closeDate
      row.completionCcPersons = '陈工（安全主管）、吴工（巡检员）'
    }
    applyDoneStages(row, seed.done)
    return row
  })
}

/**
 * 隐患台账覆盖全部项目：项目目录 40 项 + COC 里不在目录中的独立项目。
 * 每个项目 7 条，一条对应一个流程节点，打开任意项目的 COC「巡检隐患明细」都能看到完整节点示例。
 */
const HAZARD_SEED_PROJECTS = [
  ...PROJECT_NAMES.map((fullName, index) => {
    const master = COC_PROJECT_OPTIONS.find(project => project.fullName === fullName)
    return {
      id: master?.id || '',
      label: master?.label || PROJECT_SHORT_NAMES[index] || fullName,
      fullName,
    }
  }),
  ...COC_PROJECT_OPTIONS.filter(project => !PROJECT_NAMES.includes(project.fullName)),
]

/**
 * 作废审批中示例（T2 项目）：单据状态与流程节点保持原样，列表只多一个「作废中」标签。
 * 用于演示「申请作废后原状态不变、仅挂起」的口径。
 */
function buildVoidPendingExample() {
  const index = HAZARD_SEED_PROJECTS.findIndex(item => item.id === 'p-000')
  const project = HAZARD_SEED_PROJECTS[index >= 0 ? index : 0]
  const row = applyDoneStages({
    ...EXTENDED_PEOPLE,
    id: 'rec-demo-void-000',
    taskNo: hazardTaskNo(index, 7, '质量'),
    rectifyNo: rectifyNo(index, 7),
    project: project.label,
    projectFullName: project.fullName,
    project_id: project.id,
    inspectionCategory: '质量',
    inspectionCategories: ['质量'],
    hazardLevel: 'A',
    hazardCategory: '结构实体质量',
    desc: '道面混凝土养护不到位，表面出现细微裂缝（与既有隐患重复登记）',
    rectifyRequirement: '完成裂缝封闭处理并补做养护记录；本条与既有隐患重复，已提交作废申请等待审批。',
    hazardPhotos: ['隐患照片1.jpg', '隐患照片2.jpg'],
    issueDate: '2026-11-15',
    deadline: '2026-11-25',
    status: '待验收',
    issueCcPersons: '陈工（安全主管）、吴工（巡检员）',
    nodeExample: 'voidPending',
    // 作废审批期间状态与当前节点都不变，只在列表/详情多加一个「作废中」标签。
    currentNode: '监理总监验收',
    voidRequest: {
      status: 'pending',
      reason: '与既有隐患重复登记，申请作废本整改单',
      requestedAt: '2026-11-25 10:00:00',
      applicant: EXTENDED_PEOPLE.inspector,
      approverId: 'u-007',
      approver: '刘文强（指挥部安全和整改负责人）',
    },
    workflowHistory: [{
      type: 'voidRequest', stage: 'voidRequest', label: '申请作废整改单',
      actor: EXTENDED_PEOPLE.inspector, date: '2026-11-25 10:00:00',
      comment: '与既有隐患重复登记，申请作废本整改单',
      approverId: 'u-007', approver: '刘文强（指挥部安全和整改负责人）',
    }],
  }, { rectify: '2026-11-19', contractorAcceptance: '2026-11-20', review: '2026-11-21' })
  return row
}

export const inspectionHazards = [...HAZARD_SEED_PROJECTS.flatMap(buildHazards), buildVoidPendingExample()]

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


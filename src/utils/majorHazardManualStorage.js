import { COC_PROJECT_OPTIONS } from '../config/projectCatalog.js'

const STORAGE_KEY = 'airport-major-hazard-manual-v3'
export const MAJOR_HAZARD_CHANGE_EVENT = 'major-hazard-manual-change'

/** 仅前 10 个项目生成危大工程示例数据，避免看板按项目汇总时铺开全部项目 */
const DEMO_PROJECT_IDS = new Set(COC_PROJECT_OPTIONS.slice(0, 10).map((project) => project.id))

/** 危大辨识审批人候选（姓名 + 岗位），新增/详情页「审批人配置」下拉使用 */
export const MAJOR_HAZARD_APPROVERS = [
  { id: 'mh-approver-sup-1', name: '李总监', post: '总监理工程师', kind: 'supervisor' },
  { id: 'mh-approver-sup-2', name: '赵专监', post: '专业监理工程师', kind: 'supervisor' },
  { id: 'mh-approver-sup-3', name: '孙监理', post: '监理单位项目负责人', kind: 'supervisor' },
  { id: 'mh-approver-pm-1', name: '陈项目经理', post: '项目经理', kind: 'pm' },
  { id: 'mh-approver-pm-2', name: '吴项目经理', post: '项目经理', kind: 'pm' },
  { id: 'mh-approver-pm-3', name: '郑项目经理', post: '项目经理', kind: 'pm' },
]

export function majorHazardApproverLabel(id) {
  const found = MAJOR_HAZARD_APPROVERS.find((item) => item.id === id)
  return found ? `${found.name}（${found.post}）` : ''
}

const CATEGORY_SEED = [
  { id: 'mh-pit', name: '基坑工程' },
  { id: 'mh-earthwork', name: '土石方工程（民航专业工程）' },
  { id: 'mh-formwork', name: '模板工程及支撑体系' },
  { id: 'mh-lifting', name: '起重吊装及起重机械安装拆卸工程' },
  { id: 'mh-scaffold', name: '脚手架工程' },
  { id: 'mh-demolition', name: '拆除工程' },
  { id: 'mh-underground', name: '暗挖工程' },
  { id: 'mh-other', name: '其他危大工程' },
  { id: 'mh-airport-scene', name: '不停航施工工程（民航专业工程）' },
]

const NATIONAL_BASIS = '住建部建办质〔2018〕31号'
const AIRPORT_BASIS = '民航规〔2019〕71号（AP-165-CA-2019-05）'
const COMBINED_BASIS = `${AIRPORT_BASIS}；${NATIONAL_BASIS}`
const DESCRIPTION_SEED = [
  { id: 'mh-desc-pit-1', categoryId: 'mh-pit', description: '开挖深度超过3m（含3m）的基坑（槽）的土方开挖、支护、降水工程。', isSuperMajor: '否', needMonitoring: '是', basis: COMBINED_BASIS, scene: '飞行区/航站楼地下工程' },
  { id: 'mh-desc-pit-2', categoryId: 'mh-pit', description: '开挖深度虽未超过3m，但地质条件、周围环境和地下管线复杂，或影响毗邻建（构）筑物安全的基坑（槽）的土方开挖、支护、降水工程。', isSuperMajor: '否', needMonitoring: '是', basis: COMBINED_BASIS, scene: '航站区/飞行区复杂管线环境' },
  { id: 'mh-desc-earthwork-1', categoryId: 'mh-earthwork', description: '山区或丘陵地区机场最大填方高度或填方边坡高度（坡顶和坡脚高差）大于等于50m的工程。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '飞行区高填方' },
  { id: 'mh-desc-earthwork-2', categoryId: 'mh-earthwork', description: '总高度大于等于20m的支挡工程。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '飞行区边坡/支挡结构' },
  { id: 'mh-desc-form-1', categoryId: 'mh-formwork', description: '混凝土模板支撑工程：搭设高度5m及以上，或搭设跨度10m及以上，或施工总荷载（荷载效应基本组合的设计值）10kN/㎡及以上，或集中线荷载（荷载效应基本组合的设计值）15kN/m及以上，或高度大于支撑水平投影宽度且相对独立无联系构件的混凝土模板支撑工程。', isSuperMajor: '否', needMonitoring: '是', basis: COMBINED_BASIS, scene: '航站楼大空间结构' },
  { id: 'mh-desc-lift-1', categoryId: 'mh-lifting', description: '采用非常规起重设备、方法，且单件起吊重量在10kN及以上的起重吊装工程。', isSuperMajor: '否', needMonitoring: '否', basis: COMBINED_BASIS, scene: '钢结构/幕墙/登机桥设备吊装' },
  { id: 'mh-desc-scaffold-1', categoryId: 'mh-scaffold', description: '搭设高度24m及以上的落地式钢管脚手架工程。', isSuperMajor: '否', needMonitoring: '否', basis: COMBINED_BASIS, scene: '航站楼立面及中庭' },
  { id: 'mh-desc-demolition-1', categoryId: 'mh-demolition', description: '可能影响行人、交通、电力设施、通信设施或其他建（构）筑物安全的拆除工程。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '既有航站区改扩建' },
  { id: 'mh-desc-form-tool', categoryId: 'mh-formwork', description: '各类工具式模板工程：包括滑模、爬模、飞模等工程。', isSuperMajor: '否', needMonitoring: '是', basis: COMBINED_BASIS, scene: '通用' },
  { id: 'mh-desc-form-steel', categoryId: 'mh-formwork', description: '承重支撑体系：用于钢结构安装、飞机荷载桥梁、飞行区下穿通道等支撑体系。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '航站楼钢结构/飞机荷载桥梁/下穿通道' },
  { id: 'mh-desc-lift-install', categoryId: 'mh-lifting', description: '采用起重机械进行安装的工程。', isSuperMajor: '否', needMonitoring: '否', basis: COMBINED_BASIS, scene: '航站楼钢结构/机电设备' },
  { id: 'mh-desc-lift-machine', categoryId: 'mh-lifting', description: '起重机械安装和拆卸工程。', isSuperMajor: '否', needMonitoring: '否', basis: COMBINED_BASIS, scene: '塔吊/施工升降机' },
  { id: 'mh-desc-scaffold-attached', categoryId: 'mh-scaffold', description: '附着式升降脚手架工程。', isSuperMajor: '否', needMonitoring: '否', basis: COMBINED_BASIS, scene: '航站楼/配套建筑' },
  { id: 'mh-desc-scaffold-cantilever', categoryId: 'mh-scaffold', description: '悬挑式脚手架工程。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '航站楼/配套建筑' },
  { id: 'mh-desc-scaffold-basket', categoryId: 'mh-scaffold', description: '高处作业吊篮。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '航站楼幕墙' },
  { id: 'mh-desc-scaffold-platform', categoryId: 'mh-scaffold', description: '卸料平台、操作平台工程。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '通用' },
  { id: 'mh-desc-scaffold-special', categoryId: 'mh-scaffold', description: '异型脚手架工程。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '航站楼异形空间' },
  { id: 'mh-desc-underground-1', categoryId: 'mh-underground', description: '采用矿山法、盾构法、顶管法施工的隧道、洞室工程。', isSuperMajor: '否', needMonitoring: '是', basis: NATIONAL_BASIS, scene: '捷运/下穿通道/综合管廊' },
  { id: 'mh-desc-other-curtain', categoryId: 'mh-other', description: '建筑幕墙安装工程。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '航站楼幕墙' },
  { id: 'mh-desc-other-steel', categoryId: 'mh-other', description: '钢结构、网架和索膜结构安装工程。', isSuperMajor: '否', needMonitoring: '是', basis: NATIONAL_BASIS, scene: '航站楼大跨度屋盖' },
  { id: 'mh-desc-other-pile', categoryId: 'mh-other', description: '人工挖孔桩工程。', isSuperMajor: '否', needMonitoring: '是', basis: COMBINED_BASIS, scene: '配套建筑基础' },
  { id: 'mh-desc-other-underwater', categoryId: 'mh-other', description: '水下作业工程。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '排水/水工设施' },
  { id: 'mh-desc-other-prefab', categoryId: 'mh-other', description: '装配式建筑混凝土预制构件安装工程。', isSuperMajor: '否', needMonitoring: '否', basis: NATIONAL_BASIS, scene: '配套建筑' },
  { id: 'mh-desc-other-newtech', categoryId: 'mh-other', description: '采用新技术、新工艺、新材料、新设备可能影响工程施工安全，尚无国家、行业及地方技术标准的工程。', isSuperMajor: '否', needMonitoring: '是', basis: COMBINED_BASIS, scene: '通用' },
  { id: 'mh-desc-other-jacking', categoryId: 'mh-other', description: '顶升施工。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '飞机荷载桥梁/大型结构' },
  { id: 'mh-desc-other-rebar', categoryId: 'mh-other', description: '板厚大于1.5m（含1.5m）或梁高大于2m（含2m）的钢筋支撑工程。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '飞机荷载桥梁/航站楼大体积结构' },
  { id: 'mh-desc-airport-1', categoryId: 'mh-airport-scene', description: '不停航施工工程。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '飞行区不停航施工' },
  { id: 'mh-desc-airport-2', categoryId: 'mh-airport-scene', description: '跑道、滑行道、机坪的改扩建，以及飞行区排水设施、助航灯光及电缆等在不停航条件下实施的工程。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '飞行区不停航施工' },
  { id: 'mh-desc-airport-3', categoryId: 'mh-airport-scene', description: '其他影响民用航空器活动的不停航施工工程。', isSuperMajor: '否', needMonitoring: '是', basis: AIRPORT_BASIS, scene: '飞行区不停航施工' },
]

function descriptionText(id) {
  return DESCRIPTION_SEED.find((item) => item.id === id)?.description || ''
}

const CONTROL_POINT_SEED = [
  { id: 'mh-cp-pit-1', categoryId: 'mh-pit', descriptionId: 'mh-desc-pit-1', classification: '方案管理', content: '专项施工方案应按规定审批；超危大工程应完成专家论证。', displayStatus: 'green' },
  { id: 'mh-cp-pit-2', categoryId: 'mh-pit', descriptionId: 'mh-desc-pit-1', classification: '现场管控', content: '基坑支护、降水、临边防护及监测预警应符合方案要求。', displayStatus: 'red' },
  { id: 'mh-cp-pit-3', categoryId: 'mh-pit', descriptionId: 'mh-desc-pit-2', classification: '现场管控', content: '土方开挖应分层分段进行，严格按方案控制坡率并做好基坑监测。', displayStatus: 'red' },
  { id: 'mh-cp-form-1', categoryId: 'mh-formwork', descriptionId: 'mh-desc-form-1', classification: '验收管理', content: '模板支撑体系搭设完成后，应组织施工条件验收。', displayStatus: 'green' },
  { id: 'mh-cp-lift-1', categoryId: 'mh-lifting', descriptionId: 'mh-desc-lift-1', classification: '作业管控', content: '吊装作业应落实司索、指挥、警戒及设备检查要求。', displayStatus: 'red' },
  { id: 'mh-cp-scaffold-1', categoryId: 'mh-scaffold', descriptionId: 'mh-desc-scaffold-1', classification: '现场管控', content: '脚手架连墙件、剪刀撑、荷载控制及搭拆验收应符合要求。', displayStatus: 'green' },
  { id: 'mh-cp-demolition-1', categoryId: 'mh-demolition', descriptionId: 'mh-desc-demolition-1', classification: '安全措施', content: '拆除作业应明确拆除顺序，做好警戒隔离和临时支撑。', displayStatus: 'red' },
]

/** 项目 WBS：危大工程施工部位从此树选择。 */
const WBS_SEED = [
  { id: 'mh-wbs-root', code: 'SZJC', name: '深圳机场扩建工程', parentId: '', type: '项目', sortNo: 1 },
  { id: 'mh-wbs-t2', code: 'SZJC-01', name: 'T2航站楼工程', parentId: 'mh-wbs-root', type: '单位工程', sortNo: 1 },
  { id: 'mh-wbs-basement', code: 'SZJC-01-01', name: '地下室工程', parentId: 'mh-wbs-t2', type: '分部工程', sortNo: 1 },
  { id: 'mh-wbs-pit', code: 'SZJC-01-01-01', name: 'A区基坑西侧', parentId: 'mh-wbs-basement', type: '施工部位', sortNo: 1 },
  { id: 'mh-wbs-building2', code: 'SZJC-02', name: '2号楼工程', parentId: 'mh-wbs-root', type: '单位工程', sortNo: 2 },
  { id: 'mh-wbs-formwork', code: 'SZJC-02-08', name: '2号楼8层梁板', parentId: 'mh-wbs-building2', type: '施工部位', sortNo: 1 },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

const STANDARD_LIBRARY_VERSION = '2026-airport-v2'
function mergeStandardLibrary(current = [], standard = []) {
  const standardIds = new Set(standard.map((item) => item.id))
  return [...clone(standard), ...current.filter((item) => !standardIds.has(item.id))]
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function demoNode(status, date, content = '', result = '') {
  return { status, date, responsible: '张工', content, attachmentInfo: '', result }
}

function buildDemoBusinessData(projectId) {
  const today = new Date().toISOString().slice(0, 10)
  const currentMonth = today.slice(0, 7)
  const previousMonth = dateOffset(-35).slice(0, 7)
  const pitSourceId = 'mh-demo-identify-pit:mh-desc-pit-2'
  const formworkSourceId = 'mh-demo-identify-formwork:mh-desc-form-1'
  // 不同项目保留不同数量的未开工工程，让各项目分布有差异（不再全部为在施）
  const variant = Math.max(0, COC_PROJECT_OPTIONS.findIndex((project) => project.id === projectId)) % 4
  const omittedLedgerIds = new Set([
    [],
    ['mh-demo-ledger-lifting'],
    ['mh-demo-ledger-underground'],
    ['mh-demo-ledger-lifting', 'mh-demo-ledger-underground'],
  ][variant])
  const doneNode = (date, content, result = '') => demoNode('已完成', date, content, result)
  const todoNode = () => ({ status: '未完成', date: '', responsible: '', content: '', attachmentInfo: '', result: '' })
  const controlPointsOf = (descriptionId, handlingStatus) => CONTROL_POINT_SEED
    .filter((item) => item.descriptionId === descriptionId)
    .map((item) => ({ ...item, handlingStatus }))
  const part = (id, name, wbsPath, startOffset, endOffset, process) => ({
    id, wbsNodeId: `mh-demo-wbs-${id}`, wbsPath, name, safetyResponsible: '陈静（安全员）',
    startDate: dateOffset(startOffset), plannedEndDate: dateOffset(endOffset), process,
  })

  return {
    identifications: [
      {
        id: 'mh-demo-identify-pit', categoryId: 'mh-pit', categoryName: '基坑工程', identifiedBy: '张工', identifiedAt: dateOffset(-12), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-1', projectManagerApproverId: 'mh-approver-pm-1', remark: 'A区地下室基坑工程演示数据',
        items: [
          { id: 'mh-desc-pit-1', description: descriptionText('mh-desc-pit-1'), isSuperMajor: '否', needMonitoring: '是', conclusion: '×', plannedStart: '', plannedEnd: '' },
          { id: 'mh-desc-pit-2', description: descriptionText('mh-desc-pit-2'), isSuperMajor: '是', needMonitoring: '是', conclusion: '√', plannedStart: dateOffset(-12), plannedEnd: dateOffset(-1) },
        ],
      },
      {
        id: 'mh-demo-identify-formwork', categoryId: 'mh-formwork', categoryName: '模板工程及支撑体系', identifiedBy: '王工', identifiedAt: dateOffset(-6), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-2', projectManagerApproverId: 'mh-approver-pm-2', remark: '2号楼模板支撑体系演示数据',
        items: [
          { id: 'mh-desc-form-1', description: descriptionText('mh-desc-form-1'), isSuperMajor: '否', needMonitoring: '是', conclusion: '√', plannedStart: dateOffset(-4), plannedEnd: dateOffset(6) },
        ],
      },
      {
        id: 'mh-demo-identify-earthwork', categoryId: 'mh-earthwork', categoryName: '土石方工程（民航专业工程）', identifiedBy: '张工', identifiedAt: dateOffset(-30), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-1', projectManagerApproverId: 'mh-approver-pm-2', remark: '飞行区高填方演示数据',
        items: [
          { id: 'mh-desc-earthwork-1', description: descriptionText('mh-desc-earthwork-1'), isSuperMajor: '否', needMonitoring: '是', conclusion: '√', plannedStart: dateOffset(-28), plannedEnd: dateOffset(-10) },
        ],
      },
      {
        id: 'mh-demo-identify-lifting', categoryId: 'mh-lifting', categoryName: '起重吊装及起重机械安装拆卸工程', identifiedBy: '刘工', identifiedAt: dateOffset(-22), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-2', projectManagerApproverId: 'mh-approver-pm-1', remark: '航站楼钢结构吊装演示数据',
        items: [
          { id: 'mh-desc-lift-1', description: descriptionText('mh-desc-lift-1'), isSuperMajor: '否', needMonitoring: '否', conclusion: '√', plannedStart: dateOffset(-20), plannedEnd: dateOffset(10) },
        ],
      },
      {
        id: 'mh-demo-identify-underground', categoryId: 'mh-underground', categoryName: '暗挖工程', identifiedBy: '赵工', identifiedAt: dateOffset(-5), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-3', projectManagerApproverId: 'mh-approver-pm-1', remark: '捷运线暗挖区间演示数据',
        items: [
          { id: 'mh-desc-underground-1', description: descriptionText('mh-desc-underground-1'), isSuperMajor: '是', needMonitoring: '是', conclusion: '√', plannedStart: dateOffset(-2), plannedEnd: dateOffset(25) },
        ],
      },
      {
        id: 'mh-demo-identify-demolition', categoryId: 'mh-demolition', categoryName: '拆除工程', identifiedBy: '周工', identifiedAt: dateOffset(-28), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-1', projectManagerApproverId: 'mh-approver-pm-3', remark: '既有航站区附属建筑拆除演示数据',
        items: [
          { id: 'mh-desc-demolition-1', description: descriptionText('mh-desc-demolition-1'), isSuperMajor: '否', needMonitoring: '否', conclusion: '√', plannedStart: dateOffset(-26), plannedEnd: dateOffset(-24) },
        ],
      },
      {
        id: 'mh-demo-identify-airport', categoryId: 'mh-airport-scene', categoryName: '不停航施工工程（民航专业工程）', identifiedBy: '孙工', identifiedAt: dateOffset(-2), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-2', projectManagerApproverId: 'mh-approver-pm-2', remark: '飞行区不停航施工演示数据（尚未开工）',
        items: [
          { id: 'mh-desc-airport-2', description: descriptionText('mh-desc-airport-2'), isSuperMajor: '否', needMonitoring: '是', conclusion: '√', plannedStart: dateOffset(8), plannedEnd: dateOffset(40) },
        ],
      },
      {
        id: 'mh-demo-identify-other', categoryId: 'mh-other', categoryName: '其他危大工程', identifiedBy: '郑工', identifiedAt: dateOffset(-1), approvalStatus: '已通过', supervisorApproverId: 'mh-approver-sup-3', projectManagerApproverId: 'mh-approver-pm-3', remark: '航站楼钢结构安装演示数据（尚未开工）',
        items: [
          { id: 'mh-desc-other-steel', description: descriptionText('mh-desc-other-steel'), isSuperMajor: '否', needMonitoring: '是', conclusion: '√', plannedStart: dateOffset(12), plannedEnd: dateOffset(36) },
        ],
      },
      {
        id: 'mh-demo-identify-scaffold', categoryId: 'mh-scaffold', categoryName: '脚手架工程', identifiedBy: '李工', identifiedAt: dateOffset(-1), approvalStatus: '审批中', supervisorApproverId: 'mh-approver-sup-1', projectManagerApproverId: 'mh-approver-pm-3', remark: '脚手架工程待审批演示数据',
        items: [
          { id: 'mh-desc-scaffold-1', description: descriptionText('mh-desc-scaffold-1'), isSuperMajor: '否', needMonitoring: '否', conclusion: '√', plannedStart: dateOffset(8), plannedEnd: dateOffset(20) },
        ],
      },
    ],
    ledgers: [
      {
        id: 'mh-demo-ledger-pit', sourceId: pitSourceId, name: 'A区地下室基坑土方开挖', overview: 'A区地下室基坑开挖及支护施工。', keyIndicators: '开挖深度 8m，支护桩直径 1.0m，设置两道混凝土支撑。', subcontractor: '深圳市政集团有限公司', responsible: '陈静（安全员）', categoryId: 'mh-pit', categoryName: '基坑工程', description: descriptionText('mh-desc-pit-2'), isSuperMajor: '是',
        controlPoints: controlPointsOf('mh-desc-pit-2', '已落实'),
        parts: [part('mh-demo-part-pit', '结构主体分部', '实体工程 / 飞行区下穿通道单位工程 / 结构主体分部', -12, -1, {
          scheme: doneNode(dateOffset(-14), '专项施工方案已审批，专家论证已完成。'),
          schemeDisclosure: doneNode(dateOffset(-13), '已完成方案交底。'),
          safetyDisclosure: doneNode(dateOffset(-12), '已完成安全技术交底。'),
          workerRegistration: doneNode(dateOffset(-12), '作业人员登记完成。'),
          conditionAcceptance: doneNode(dateOffset(-11), '施工条件验收合格。', '合格'),
          progress: { ...doneNode(today, '土方开挖施工进行中。'), executionRate: 68 },
          patrol: doneNode(today, '当日现场巡视完成。'),
          acceptance: todoNode('待危大工程验收。'),
        })],
      },
      {
        id: 'mh-demo-ledger-formwork', sourceId: formworkSourceId, name: '2号楼模板支撑体系搭设', overview: '2号楼标准层模板支撑体系搭设及验收。', keyIndicators: '支模高度 8.6m，板厚 180mm，最大施工总荷载 15kN/㎡。', subcontractor: '深圳市政集团有限公司', responsible: '吴敏（测量员）', categoryId: 'mh-formwork', categoryName: '模板工程及支撑体系', description: descriptionText('mh-desc-form-1'), isSuperMajor: '否',
        controlPoints: controlPointsOf('mh-desc-form-1', '未确认'),
        parts: [part('mh-demo-part-formwork', '模板分项工程（可报验样例）', '实体工程 / T2航站楼主体单位工程 / 主体结构分部 / 模板分项工程（可报验样例）', -4, 6, {
          scheme: doneNode(dateOffset(-7), '专项施工方案已审批。'),
          schemeDisclosure: doneNode(dateOffset(-5), '方案交底已完成。'),
          safetyDisclosure: doneNode(dateOffset(-5), '安全技术交底已完成。'),
          workerRegistration: doneNode(dateOffset(-4), '作业人员登记完成。'),
          conditionAcceptance: doneNode(dateOffset(-4), '施工条件验收合格。', '合格'),
          progress: { ...doneNode(today, '支撑体系搭设进行中。'), executionRate: 42 },
          patrol: todoNode('现场巡视待补录。'),
          acceptance: todoNode('待危大工程验收。'),
        })],
      },
      {
        id: 'mh-demo-ledger-lifting', sourceId: 'mh-demo-identify-lifting:mh-desc-lift-1', name: '航站楼钢结构吊装作业', overview: '航站楼屋盖钢结构分片吊装。', keyIndicators: '单件起吊重量 32kN，采用 260t 履带吊。', subcontractor: '中建钢构有限公司', responsible: '刘强（机械员）', categoryId: 'mh-lifting', categoryName: '起重吊装及起重机械安装拆卸工程', description: descriptionText('mh-desc-lift-1'), isSuperMajor: '否',
        controlPoints: controlPointsOf('mh-desc-lift-1', '需整改'),
        parts: [part('mh-demo-part-lifting', '屋盖钢结构吊装区', '实体工程 / T2航站楼主体单位工程 / 钢结构分部', -20, 10, {
          scheme: doneNode(dateOffset(-22), '吊装专项方案已审批。'),
          schemeDisclosure: doneNode(dateOffset(-21), '方案交底已完成。'),
          safetyDisclosure: todoNode('安全技术交底待补录。'),
          workerRegistration: doneNode(dateOffset(-20), '作业人员登记完成。'),
          conditionAcceptance: doneNode(dateOffset(-19), '施工条件验收合格。', '合格'),
          progress: { ...doneNode(today, '钢结构分片吊装进行中。'), executionRate: 55 },
          patrol: todoNode('现场巡视待补录。'),
          acceptance: todoNode('待危大工程验收。'),
        })],
      },
      {
        id: 'mh-demo-ledger-underground', sourceId: 'mh-demo-identify-underground:mh-desc-underground-1', name: '捷运线暗挖区间开挖', overview: '空侧捷运线暗挖区间开挖及初期支护。', keyIndicators: '矿山法开挖，断面 42㎡，埋深 12m。', subcontractor: '中铁隧道局集团有限公司', responsible: '赵岩（技术员）', categoryId: 'mh-underground', categoryName: '暗挖工程', description: descriptionText('mh-desc-underground-1'), isSuperMajor: '是',
        controlPoints: [],
        parts: [part('mh-demo-part-underground', '捷运线暗挖区间', '实体工程 / 捷运线单位工程 / 暗挖区间', -2, 25, {
          scheme: doneNode(dateOffset(-5), '暗挖专项施工方案已审批并完成专家论证。'),
          schemeDisclosure: todoNode('方案交底待组织。'),
          safetyDisclosure: todoNode('安全技术交底待组织。'),
          workerRegistration: todoNode('作业人员登记待补录。'),
          conditionAcceptance: todoNode('施工条件验收待组织。'),
          progress: { ...doneNode(today, '隧道初期支护施工进行中。'), executionRate: 12 },
          patrol: todoNode('现场巡视待补录。'),
          acceptance: todoNode('待危大工程验收。'),
        })],
      },
      {
        id: 'mh-demo-ledger-earthwork', sourceId: 'mh-demo-identify-earthwork:mh-desc-earthwork-1', name: '飞行区高填方土石方工程', overview: '飞行区高填方区土石方填筑与边坡防护。', keyIndicators: '最大填方高度 52m，分层碾压。', subcontractor: '深圳市政集团有限公司', responsible: '钱峰（施工员）', categoryId: 'mh-earthwork', categoryName: '土石方工程（民航专业工程）', description: descriptionText('mh-desc-earthwork-1'), isSuperMajor: '否',
        controlPoints: [],
        parts: [part('mh-demo-part-earthwork', '飞行区高填方区', '实体工程 / 飞行区单位工程 / 土石方分部', -28, -10, {
          scheme: doneNode(dateOffset(-30), '土石方专项施工方案已审批。'),
          schemeDisclosure: doneNode(dateOffset(-29), '方案交底已完成。'),
          safetyDisclosure: doneNode(dateOffset(-28), '安全技术交底已完成。'),
          workerRegistration: doneNode(dateOffset(-28), '作业人员登记完成。'),
          conditionAcceptance: doneNode(dateOffset(-27), '施工条件验收合格。', '合格'),
          progress: { ...doneNode(dateOffset(-10), '土石方填筑完成。'), executionRate: 100 },
          patrol: doneNode(dateOffset(-12), '现场巡视完成。'),
          acceptance: doneNode(dateOffset(-8), '危大工程验收合格。', '合格'),
        })],
      },
      {
        id: 'mh-demo-ledger-demolition', sourceId: 'mh-demo-identify-demolition:mh-desc-demolition-1', name: '既有航站区附属建筑拆除', overview: '既有航站区附属建筑机械拆除及清运。', keyIndicators: '拆除建筑面积 4200㎡，临近运营区。', subcontractor: '深圳市拆除工程有限公司', responsible: '孙磊（安全员）', categoryId: 'mh-demolition', categoryName: '拆除工程', description: descriptionText('mh-desc-demolition-1'), isSuperMajor: '否',
        controlPoints: controlPointsOf('mh-desc-demolition-1', '已落实'),
        parts: [part('mh-demo-part-demolition', '既有航站区拆除区', '实体工程 / 既有航站区 / 拆除分部', -26, -24, {
          scheme: doneNode(dateOffset(-28), '拆除专项施工方案已审批。'),
          schemeDisclosure: doneNode(dateOffset(-27), '方案交底已完成。'),
          safetyDisclosure: doneNode(dateOffset(-26), '安全技术交底已完成。'),
          workerRegistration: doneNode(dateOffset(-26), '作业人员登记完成。'),
          conditionAcceptance: doneNode(dateOffset(-25), '施工条件验收合格。', '合格'),
          progress: { ...doneNode(dateOffset(-24), '拆除作业完成。'), executionRate: 100 },
          patrol: doneNode(dateOffset(-25), '现场巡视完成。'),
          acceptance: doneNode(dateOffset(-22), '危大工程验收合格。', '合格'),
        })],
      },
    ].filter((ledger) => !omittedLedgerIds.has(ledger.id)),
    plans: [
      { id: 'mh-demo-plan-current', month: currentMonth, ledgerSourceIds: [pitSourceId, formworkSourceId], preparedBy: '张工', preparedAt: dateOffset(-2), noNeedReason: '', status: '已编制' },
      { id: 'mh-demo-plan-none', month: previousMonth, ledgerSourceIds: [], preparedBy: '', preparedAt: '', noNeedReason: '该月无在施危大工程。', status: '无需编制' },
    ],
  }
}

function backfillDemoWbsParts(data) {
  const mapping = {
    'mh-demo-ledger-pit': { wbsNodeId: 'wn-div-4', wbsPath: '实体工程 / 飞行区下穿通道单位工程 / 结构主体分部', name: '结构主体分部' },
    'mh-demo-ledger-formwork': { wbsNodeId: 'wn-item-ready', wbsPath: '实体工程 / T2航站楼主体单位工程 / 主体结构分部 / 模板分项工程（可报验样例）', name: '模板分项工程（可报验样例）' },
  }
  let changed = false
  ;(data.ledgers || []).forEach((ledger) => {
    const demoPart = mapping[ledger.id]
    if (!demoPart) return
    if (ledger.id === 'mh-demo-ledger-pit') {
      if (ledger.subcontractor === '中建土方工程有限公司') { ledger.subcontractor = '深圳市政集团有限公司'; changed = true }
      if (ledger.responsible === '李建国') { ledger.responsible = '陈静（安全员）'; changed = true }
    }
    if (ledger.id === 'mh-demo-ledger-formwork') {
      if (ledger.subcontractor === '深圳建工劳务有限公司') { ledger.subcontractor = '深圳市政集团有限公司'; changed = true }
      if (ledger.responsible === '王强') { ledger.responsible = '吴敏（测量员）'; changed = true }
    }
    ;(ledger.parts || []).forEach((part) => {
      if (!part.wbsNodeId || String(part.wbsNodeId).startsWith('mh-wbs-')) { Object.assign(part, demoPart); changed = true }
    })
  })
  return changed
}

function blankData(projectId) {
  const withDemo = DEMO_PROJECT_IDS.has(projectId)
  const demo = withDemo ? buildDemoBusinessData(projectId) : { identifications: [], ledgers: [], plans: [] }
  return {
    standardLibraryVersion: STANDARD_LIBRARY_VERSION,
    categories: clone(CATEGORY_SEED),
    descriptions: clone(DESCRIPTION_SEED),
    controlPoints: clone(CONTROL_POINT_SEED),
    wbsNodes: clone(WBS_SEED),
    identifications: demo.identifications,
    ledgers: demo.ledgers,
    deletedLedgerSourceIds: [],
    plans: demo.plans,
    alertActions: {},
    demoSeeded: withDemo,
  }
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  window.dispatchEvent(new CustomEvent(MAJOR_HAZARD_CHANGE_EVENT))
}

function normalizeLegacyControlPoints(controlPoints = [], descriptions = []) {
  const result = []
  controlPoints.forEach((point) => {
    const normalized = {
      ...point,
      redStatusText: point.redStatusText || '未落实',
      greenStatusText: point.greenStatusText || '已落实',
    }
    // 新数据已按 descriptionId 精确关联；旧数据只有 categoryId，兼容为类别下每条描述各保留一份。
    if (point.descriptionId) {
      result.push(normalized)
      return
    }
    const related = descriptions.filter((desc) => desc.categoryId === point.categoryId)
    if (!related.length) {
      result.push(normalized)
      return
    }
    related.forEach((desc) => result.push({ ...normalized, id: `${point.id}-${desc.id}`, descriptionId: desc.id }))
  })
  return result
}

function readProject(projectId) {
  const all = readAll()
  const saved = all[projectId]
  if (!saved) return blankData(projectId)
  const base = blankData(projectId)
  const categories = Array.isArray(saved.categories) && saved.categories.length ? saved.categories : base.categories
  const descriptions = Array.isArray(saved.descriptions) ? saved.descriptions : base.descriptions
  const controlPoints = Array.isArray(saved.controlPoints) ? saved.controlPoints : base.controlPoints
  return {
    ...base,
    ...saved,
    categories,
    descriptions,
    controlPoints: normalizeLegacyControlPoints(controlPoints, descriptions),
    wbsNodes: Array.isArray(saved.wbsNodes) && saved.wbsNodes.length ? saved.wbsNodes : base.wbsNodes,
    identifications: Array.isArray(saved.identifications) ? saved.identifications : [],
    ledgers: Array.isArray(saved.ledgers) ? saved.ledgers : [],
    deletedLedgerSourceIds: Array.isArray(saved.deletedLedgerSourceIds) ? saved.deletedLedgerSourceIds : [],
    plans: Array.isArray(saved.plans) ? saved.plans : [],
    alertActions: saved.alertActions || {},
  }
}

function writeProject(projectId, data) {
  const all = readAll()
  all[projectId] = data
  writeAll(all)
}

function upsert(items, item) {
  const index = items.findIndex((row) => row.id === item.id)
  if (index >= 0) items.splice(index, 1, item)
  else items.unshift(item)
}

export function ensureMajorHazardData(projectId) {
  const all = readAll()
  if (!all[projectId]) {
    all[projectId] = blankData(projectId)
    writeAll(all)
  } else if (DEMO_PROJECT_IDS.has(projectId) && !all[projectId].demoSeeded && !(all[projectId].identifications || []).length && !(all[projectId].ledgers || []).length && !(all[projectId].plans || []).length) {
    const demo = buildDemoBusinessData(projectId)
    all[projectId] = { ...all[projectId], ...demo, demoSeeded: true }
    writeAll(all)
  } else {
    let changed = false
    if (all[projectId].standardLibraryVersion !== STANDARD_LIBRARY_VERSION) {
      all[projectId].categories = mergeStandardLibrary(all[projectId].categories || [], CATEGORY_SEED)
      all[projectId].descriptions = mergeStandardLibrary(all[projectId].descriptions || [], DESCRIPTION_SEED)
      all[projectId].controlPoints = mergeStandardLibrary(all[projectId].controlPoints || [], CONTROL_POINT_SEED)
      all[projectId].standardLibraryVersion = STANDARD_LIBRARY_VERSION
      changed = true
    }
    if (!Array.isArray(all[projectId].wbsNodes) || !all[projectId].wbsNodes.length) {
      all[projectId].wbsNodes = clone(WBS_SEED)
      changed = true
    }
    if (all[projectId].demoSeeded && backfillDemoWbsParts(all[projectId])) changed = true
    if (changed) writeAll(all)
  }
  return readProject(projectId)
}

export function getMajorHazardData(projectId) {
  return readProject(projectId)
}

/**
 * 获取某条“类别描述”关联的管控要点。
 * 新数据通过 descriptionId 精确关联；旧数据（仅 categoryId）按类别兜底兼容。
 */
export function getControlPointsForDescription(data, description = {}) {
  const id = description.id || ''
  const categoryId = description.categoryId || ''
  return (data.controlPoints || []).filter((point) => (point.descriptionId ? point.descriptionId === id : point.categoryId === categoryId))
}

export function flattenCategories(categories = []) {
  return categories.flatMap((item) => [item, ...(item.children || [])])
}

export function findCategory(data, categoryId) {
  return flattenCategories(data.categories).find((item) => item.id === categoryId)
}

export function buildMajorHazardWbsTree(data) {
  const list = [...(data.wbsNodes || [])].sort((a, b) => (a.sortNo || 0) - (b.sortNo || 0))
  const map = new Map(list.map((item) => [item.id, { ...item, children: [] }]))
  const roots = []
  map.forEach((item) => {
    if (item.parentId && map.has(item.parentId)) map.get(item.parentId).children.push(item)
    else roots.push(item)
  })
  return roots
}

export function flattenMajorHazardWbs(data) {
  return data.wbsNodes || []
}

export function getMajorHazardWbsPath(data, id) {
  const map = new Map((data.wbsNodes || []).map((item) => [item.id, item]))
  const result = []
  let cursor = map.get(id)
  while (cursor) {
    result.unshift(cursor.name)
    cursor = cursor.parentId ? map.get(cursor.parentId) : null
  }
  return result.join(' / ')
}

export function saveMajorHazardWbsNode(projectId, payload) {
  const data = readProject(projectId)
  const item = { id: payload.id || createId('mh-wbs'), code: '', name: '', parentId: '', type: '施工部位', sortNo: 0, ...payload }
  upsert(data.wbsNodes, item)
  writeProject(projectId, data)
  return item
}

export function removeMajorHazardWbsNode(projectId, id) {
  const data = readProject(projectId)
  data.wbsNodes = data.wbsNodes.filter((item) => item.id !== id)
  writeProject(projectId, data)
}

export function saveCategory(projectId, payload) {
  const data = readProject(projectId)
  const item = { ...payload, id: payload.id || createId('mh-cat') }
  upsert(data.categories, item)
  writeProject(projectId, data)
  return item
}

export function removeCategory(projectId, id) {
  const data = readProject(projectId)
  data.categories = data.categories.filter((item) => item.id !== id)
  writeProject(projectId, data)
}

export function saveCategoryDescription(projectId, payload) {
  const data = readProject(projectId)
  const item = { ...payload, id: payload.id || createId('mh-desc') }
  upsert(data.descriptions, item)
  writeProject(projectId, data)
  return item
}

export function removeCategoryDescription(projectId, id) {
  const data = readProject(projectId)
  data.descriptions = data.descriptions.filter((item) => item.id !== id)
  data.controlPoints = data.controlPoints.filter((item) => item.descriptionId !== id)
  writeProject(projectId, data)
}

export function saveControlPoint(projectId, payload) {
  const data = readProject(projectId)
  const item = { ...payload, id: payload.id || createId('mh-point') }
  upsert(data.controlPoints, item)
  writeProject(projectId, data)
  return item
}

export function removeControlPoint(projectId, id) {
  const data = readProject(projectId)
  data.controlPoints = data.controlPoints.filter((item) => item.id !== id)
  writeProject(projectId, data)
}

export function saveIdentification(projectId, payload) {
  const data = readProject(projectId)
  const now = new Date().toISOString()
  const item = { ...payload, id: payload.id || createId('mh-identify'), createdAt: payload.createdAt || now, updatedAt: now }
  upsert(data.identifications, item)
  writeProject(projectId, data)
  return item
}

export function removeIdentification(projectId, id) {
  const data = readProject(projectId)
  data.identifications = data.identifications.filter((item) => item.id !== id)
  writeProject(projectId, data)
}

export function getIdentificationItems(data, { approvedOnly = false } = {}) {
  return (data.identifications || []).flatMap((batch) => (batch.items || []).map((item) => ({
    ...item,
    sourceId: `${batch.id}:${item.id}`,
    identificationId: batch.id,
    categoryId: batch.categoryId,
    categoryName: batch.categoryName,
    identifiedBy: batch.identifiedBy,
    identifiedAt: batch.identifiedAt,
    approvalStatus: batch.approvalStatus,
    remark: batch.remark || '',
  }))).filter((item) => item.conclusion === '√' && (!approvedOnly || item.approvalStatus === '已通过'))
}

export function buildLedgerRows(data) {
  const approved = getIdentificationItems(data, { approvedOnly: true })
  return approved
    .filter((item) => !data.deletedLedgerSourceIds.includes(item.sourceId))
    .map((item) => {
      const stored = data.ledgers.find((ledger) => ledger.sourceId === item.sourceId)
      return stored ? normalizeLedger({ ...stored, source: item }, data) : createLedgerFromSource(item, data)
    })
}

export function createLedgerFromSource(source, data) {
  return {
    id: '',
    sourceId: source.sourceId,
    name: source.description,
    overview: '',
    keyIndicators: '',
    subcontractor: '',
    responsible: '',
    categoryId: source.categoryId,
    categoryName: source.categoryName,
    description: source.description,
    isSuperMajor: source.isSuperMajor,
    controlPoints: getControlPointsForDescription(data, source).map((item) => ({ ...item, handlingStatus: '未确认' })),
    parts: [],
    createdAt: '',
    updatedAt: '',
  }
}

export function createProcessNode(status = '未完成') {
  return { status, date: '', responsible: '', content: '', attachmentInfo: '', result: '', records: [] }
}

export function createConstructionPart(data = {}) {
  return {
    id: data.id || createId('mh-part'),
    wbsNodeId: '',
    wbsPath: '',
    name: '',
    safetyResponsible: '',
    startDate: '',
    plannedEndDate: '',
    process: {
      scheme: createProcessNode(),
      schemeDisclosure: createProcessNode(),
      safetyDisclosure: createProcessNode(),
      workerRegistration: createProcessNode(),
      conditionAcceptance: createProcessNode(),
      progress: createProcessNode('未开始'),
      patrol: createProcessNode('未完成'),
      acceptance: createProcessNode('未完成'),
      controlPoints: createProcessNode('未确认'),
    },
    ...data,
  }
}

export function normalizeLedger(ledger, data) {
  const source = ledger.source || getIdentificationItems(data).find((item) => item.sourceId === ledger.sourceId)
  const base = createLedgerFromSource(source || { sourceId: ledger.sourceId, categoryId: ledger.categoryId, categoryName: ledger.categoryName, description: ledger.name, isSuperMajor: ledger.isSuperMajor }, data)
  const parts = (ledger.parts || []).map((part) => {
    const blank = createConstructionPart()
    return {
      ...blank,
      ...part,
      process: Object.fromEntries(Object.keys(blank.process).map((key) => {
        const legacy = part.process?.[key] || {}
        let records = Array.isArray(legacy.records) ? legacy.records : []
        const hasLegacyRecord = Boolean(legacy.date || legacy.content || legacy.attachmentInfo || legacy.responsible || legacy.result)
        if (!records.length && hasLegacyRecord) {
          records = [{
            id: createId(`mh-${key}-record`),
            status: legacy.status || blank.process[key].status,
            date: legacy.date || '',
            responsible: legacy.responsible || '',
            content: legacy.content || '',
            attachmentInfo: legacy.attachmentInfo || '',
            result: legacy.result || '',
            executionRate: legacy.executionRate ?? '',
            createdBy: legacy.responsible || '系统迁移',
            createdAt: legacy.date || '',
          }]
        }
        return [key, { ...blank.process[key], ...legacy, records }]
      })),
    }
  })
  const storedPoints = new Map((ledger.controlPoints || []).map((point) => [point.id, point]))
  // 清单只保留字典当前仍存在的管控要点；删除或新增字典项后，各入口立即保持一致。
  const configuredPoints = base.controlPoints
  const controlPoints = configuredPoints.map((definition) => {
    const point = storedPoints.get(definition.id) || {}
    return {
      ...point,
      ...definition,
      handlingStatus: point.handlingStatus || definition.handlingStatus || '未确认',
      redStatusText: definition.redStatusText || point.redStatusText || '未落实',
      greenStatusText: definition.greenStatusText || point.greenStatusText || '已落实',
    }
  })
  const firstPart = parts[0]
  if (ledger.id && firstPart && !firstPart.process.controlPoints.records.length && controlPoints.length) {
    firstPart.process.controlPoints.records = controlPoints.map((point) => ({
      id: createId('mh-control-point-record'),
      controlPointId: point.id,
      status: point.handlingStatus || '未确认',
      displayStatus: point.handlingStatus === '已落实' ? 'green' : point.handlingStatus === '需整改' ? 'red' : '',
      displayStatusText: point.handlingStatus === '已落实' ? point.greenStatusText : point.handlingStatus === '需整改' ? point.redStatusText : '未确认',
      redStatusText: point.redStatusText,
      greenStatusText: point.greenStatusText,
      date: firstPart.startDate || '',
      responsible: ledger.responsible || firstPart.safetyResponsible || '',
      content: point.content || '',
      attachmentInfo: '',
      result: '',
      createdBy: ledger.responsible || '系统迁移',
      createdAt: firstPart.startDate || '',
    }))
  }
  parts.forEach((part) => {
    part.process.controlPoints.records.forEach((record) => {
      const point = controlPoints.find((item) => item.id === record.controlPointId)
      if (record.createdBy === '系统迁移' && (!point?.handlingStatus || point.handlingStatus === '未确认')) {
        record.status = '未确认'
        record.displayStatus = ''
        record.displayStatusText = '未确认'
      }
    })
  })
  return { ...base, ...ledger, id: ledger.id || '', parts, controlPoints }
}

export function saveLedger(projectId, payload) {
  const data = readProject(projectId)
  const now = new Date().toISOString()
  const ledger = normalizeLedger(payload, data)
  const item = { ...ledger, id: ledger.id || createId('mh-ledger'), createdAt: ledger.createdAt || now, updatedAt: now }
  upsert(data.ledgers, item)
  data.deletedLedgerSourceIds = data.deletedLedgerSourceIds.filter((id) => id !== item.sourceId)
  writeProject(projectId, data)
  return item
}

export function removeLedger(projectId, ledger) {
  const data = readProject(projectId)
  data.ledgers = data.ledgers.filter((item) => item.id !== ledger.id)
  if (!data.deletedLedgerSourceIds.includes(ledger.sourceId)) data.deletedLedgerSourceIds.push(ledger.sourceId)
  writeProject(projectId, data)
}

export function getLedgerStatus(ledger) {
  const parts = ledger.parts || []
  if (!parts.length) return '未开工'
  const completed = parts.every((part) => part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格')
  return completed ? '完工' : '在施'
}

export function getLedgerStartDate(ledger) {
  return (ledger.parts || []).map((part) => part.startDate).filter(Boolean).sort()[0] || ''
}

export function getLedgerEndDate(ledger) {
  const accepted = (ledger.parts || []).map((part) => part.process?.acceptance?.date).filter(Boolean).sort()
  return accepted.at(-1) || ''
}

export function getNodeState(ledger) {
  const parts = ledger.parts || []
  if (!parts.length) return { scheme: false, disclosure: false, implementation: false, acceptance: false }
  return {
    scheme: parts.every((part) => part.process?.scheme?.status === '已完成'),
    disclosure: parts.every((part) => part.process?.schemeDisclosure?.status === '已完成'),
    implementation: parts.some((part) => part.process?.progress?.status === '已完成' || part.process?.progress?.content),
    acceptance: parts.every((part) => part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格'),
  }
}

function dateOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function buildCalendarAlerts(data, ledgerRows = buildLedgerRows(data)) {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = dateOffset(-7)
  const rows = ledgerRows.flatMap((ledger) => {
    if (getLedgerStatus(ledger) !== '在施') return []
    return (ledger.parts || []).flatMap((part) => {
      const alerts = []
      const patrolDate = part.process?.patrol?.date || ''
      if (ledger.isSuperMajor === '是' && patrolDate !== today) alerts.push({ type: '现场巡视', content: '超危工程当日现场巡视未完成', part })
      if (ledger.isSuperMajor !== '是' && (!patrolDate || patrolDate < weekAgo)) alerts.push({ type: '现场巡视', content: '危大工程上周现场巡视未完成', part })
      if (part.plannedEndDate && part.plannedEndDate < today && !(part.process?.acceptance?.status === '已完成' && part.process?.acceptance?.result === '合格')) alerts.push({ type: '工程验收', content: '施工部位超过计划完工时间仍未完成危大工程验收', part })
      ;[
        ['scheme', '专项施工方案'],
        ['schemeDisclosure', '方案交底'],
        ['safetyDisclosure', '安全技术交底'],
      ].forEach(([key, label]) => {
        if (part.plannedEndDate && part.plannedEndDate < today && part.process?.[key]?.status !== '已完成') {
          alerts.push({ type: label, content: `${label}未在计划结束时间前完成`, part })
        }
      })
      return alerts.map((alert) => {
        const id = `${ledger.sourceId}:${part.id}:${alert.type}:${alert.content}`
        const action = data.alertActions?.[id] || {}
        return {
          ...alert,
          id,
          ledgerId: ledger.id,
          ledgerSourceId: ledger.sourceId,
          ledgerName: ledger.name,
          categoryName: ledger.categoryName,
          handler: ledger.responsible || part.safetyResponsible || '项目安全负责人',
          status: action.status || '待处理',
          handledAt: action.handledAt || '',
          disposalResult: action.disposalResult || '',
          disposalNote: action.disposalNote || '',
          disposalAttachments: action.disposalAttachments || [],
        }
      })
    })
  })
  // 演示工程补齐六种触发情形，不修改工程实际的过程记录。
  const demoLedger = ledgerRows.find((ledger) => ledger.id === 'mh-demo-ledger-pit')
  if (demoLedger?.parts?.length) {
    const examples = [
      ['patrol-super', '现场巡视', '超危工程当日现场巡视未完成'],
      ['patrol-normal', '现场巡视', '危大工程上周现场巡视未完成'],
      ['acceptance', '工程验收', '施工部位超过计划完工时间仍未完成危大工程验收'],
      ['scheme', '专项施工方案', '专项施工方案未在计划结束时间前完成'],
      ['schemeDisclosure', '方案交底', '方案交底未在计划结束时间前完成'],
      ['safetyDisclosure', '安全技术交底', '安全技术交底未在计划结束时间前完成'],
    ]
    for (const [key, type, content] of examples) {
      if (rows.some((row) => row.content === content)) continue
      const ledger = key === 'patrol-normal' ? ledgerRows.find((item) => item.id === 'mh-demo-ledger-formwork') || demoLedger : demoLedger
      const part = ledger.parts[0]
      const id = `mh-example:${ledger.sourceId}:${part.id}:${key}`
      const action = data.alertActions?.[id] || {}
      rows.push({ id, type, content, part, ledgerId: ledger.id, ledgerSourceId: ledger.sourceId, ledgerName: ledger.name, categoryName: ledger.categoryName, handler: part.safetyResponsible || ledger.responsible, isExample: true, status: action.status || '待处理', handledAt: action.handledAt || '', disposalResult: action.disposalResult || '', disposalNote: action.disposalNote || '', disposalAttachments: action.disposalAttachments || [] })
    }
  }
  return rows.map((row) => ({ ...row, isExample: row.isExample || String(row.ledgerId).startsWith('mh-demo-ledger-') }))
}

export function updateAlertStatus(projectId, alertId, status, detail = {}) {
  const data = readProject(projectId)
  const previous = data.alertActions?.[alertId] || {}
  data.alertActions = {
    ...data.alertActions,
    [alertId]: {
      ...previous,
      status,
      handledAt: status === '已处理' ? (detail.handledAt || new Date().toLocaleString('zh-CN', { hour12: false })) : '',
      disposalResult: detail.disposalResult || previous.disposalResult || '',
      disposalNote: detail.disposalNote || previous.disposalNote || '',
      disposalAttachments: detail.disposalAttachments || previous.disposalAttachments || [],
      operator: detail.operator || previous.operator || '',
    },
  }
  writeProject(projectId, data)
}

export function savePlan(projectId, payload) {
  const data = readProject(projectId)
  const now = new Date().toISOString()
  const item = { ...payload, id: payload.id || createId('mh-plan'), createdAt: payload.createdAt || now, updatedAt: now }
  upsert(data.plans, item)
  writeProject(projectId, data)
  return item
}

export function formatCategoryLabel(data, categoryId) {
  return findCategory(data, categoryId)?.name || ''
}

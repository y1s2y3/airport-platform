/**
 * 风险管理 Mock — 风险类型配置、配置库、风险点管控台账
 * 口径：仅项目级。类型/风险点/细分来自配置库。
 * 发生频率为「每[周期]/n次」，周期为小时/日/周/月/季/年；另有「不定期」＝无固定周期、不统计次数。
 * 审批仅监理一级（审批中 / 已通过 / 已驳回）。关闭状态：未关闭 / 已关闭。
 */
import { reactive } from 'vue'
import { nowStr } from '../utils/datetime.js'
import { getProjectLabel } from './laborRealName.js'
import { tierPersonnelCatalog, getTierPersonLabel } from './laborWarningConfig.js'
import { getEntityNodePathLabel } from './constructionLocation.js'
import {
  findMatSupervisorApprover,
  formatMatSupervisorApproverLabel,
  listMatSupervisorApprovers,
} from './mat.js'
import { createRiskControlSupervisorTodo, pushRiskControlMeasureNotices } from './personalCenter.js'

export { listMatSupervisorApprovers, formatMatSupervisorApproverLabel }

/** 风险等级已于 PRD V1.2 取消，改为「发生频率 + 严重程度」两个维度，不再保留等级枚举。 */
export const SEVERITY_LEVELS = ['低', '中', '高', '超高']
/** 发生频率「不定期」：无固定周期，不填统计次数，落库 frequency_n 为空 */
export const FREQUENCY_IRREGULAR = '不定期'

/** 发生频率周期（每 x / n 次 中的 x）。「不定期」不参与次数统计，默认取值。 */
export const FREQUENCY_PERIOD_OPTIONS = [FREQUENCY_IRREGULAR, '小时', '日', '周', '月', '季', '年']

/** 是否为「不定期」发生频率（空值/前后空格安全） */
export function isIrregularFrequency(value) {
  return String(value ?? '').trim() === FREQUENCY_IRREGULAR
}

export const APPROVAL_STATUS_LABEL = {
  reviewing: '审批中',
  approved: '已通过',
  rejected: '已驳回',
}

export const CLOSE_STATUS_LABEL = {
  open: '未关闭',
  closed: '已关闭',
}

/** 招标文件要求预置的风险类型，与通用类型一起在「风险类型配置」维护 */
export const AIRPORT_RISK_SOURCE_DEFAULTS = [
  '不停航施工',
  '净空保护',
  '地下管线（航油、通信、导航）保护',
  '空防安全',
]

/** 施工阶段下拉。取值与 PRD 6.2.8 construction_stage 枚举一致，带「阶段」后缀的旧值已废弃。
 * 施工位置沿用实体工程分解，不另做地图坐标。 */
export const CONSTRUCTION_STAGE_OPTIONS = ['设计', '开工报建', '施工', '竣工']

export const RISK_RUN_STATUS_LABEL = {
  inactive: '未激活',
  activated: '已激活',
  closed: '已关闭',
}

/**
 * 施工进度关联选项。
 * 后续施工进度模块接入后，只替换本列表的数据来源，登记单仍保存 progress id。
 * 进度状态为「进行中」时，未关闭的风险辨识为「已激活」。
 */
export const constructionProgressOptions = reactive([
  { id: 'prog-p-000-1', project_id: 'p-000', progress_name: '基坑开挖与支护', progress_status: '进行中' },
  { id: 'prog-p-000-2', project_id: 'p-000', progress_name: '土建主体施工', progress_status: '未开始' },
  { id: 'prog-p-000-3', project_id: 'p-000', progress_name: '航站区管线迁改', progress_status: '已完成' },
  { id: 'prog-p-001-1', project_id: 'p-001', progress_name: '土建主体施工', progress_status: '进行中' },
])

export function listConstructionProgressOptions(projectId) {
  return constructionProgressOptions.filter((row) => row.project_id === projectId)
}

export function constructionProgressLabel(id) {
  if (!id) return '--'
  const row = constructionProgressOptions.find((item) => item.id === id)
  if (!row) return '--'
  return row.progress_status ? `${row.progress_name}（${row.progress_status}）` : row.progress_name
}

export function constructionProgressStatus(id) {
  if (!id) return ''
  return constructionProgressOptions.find((item) => item.id === id)?.progress_status || ''
}

/** 已关闭优先；已关联且进度为进行中则为已激活；其余未激活 */
export function riskRunStatus(row) {
  if (!row) return 'inactive'
  if (row.close_status === 'closed') return 'closed'
  if (constructionProgressStatus(row.construction_progress_id) === '进行中') return 'activated'
  return 'inactive'
}

export function riskRunStatusLabel(row) {
  return RISK_RUN_STATUS_LABEL[riskRunStatus(row)] || '--'
}

/**
 * 风险等级已按 PRD V1.2 取消（改为「发生频率 + 严重程度」），
 * 历史上用于由频率区间推导等级的 frequencyBand() / calcRiskLevel() 已随之删除，勿再引入。
 */

export function formatRiskFrequency(row) {
  if (!row) return '--'
  const x = row.frequency_x
  const n = row.frequency_n
  if (x === null || x === undefined || x === '') return '--'
  // 不定期：无固定周期、不统计次数，只展示「不定期」
  if (isIrregularFrequency(x)) return FREQUENCY_IRREGULAR
  if (n === null || n === undefined || n === '') return '--'
  return `每${x}/${n}次`
}

/** 配置库新增时可选的风险类型预设（仍可手输） */
export const RISK_TYPE_PRESETS = [
  '高处坠落',
  '起重伤害',
  '机械伤害',
  '车辆伤害',
  '坍塌',
  '触电',
  '物体打击',
  '中毒窒息',
  '火灾爆炸',
  '其他',
]

export const riskPersonCandidates = tierPersonnelCatalog

export function riskPersonLabel(personId) {
  return getTierPersonLabel(personId)
}

export function approvalStatusLabel(status) {
  return APPROVAL_STATUS_LABEL[status] || '--'
}

/** 审批状态 Tag 颜色，与质量管理/工程作业申报一致 */
export function approvalStatusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'reviewing') return 'warning'
  return 'info'
}

/**
 * 严重程度 Tag 颜色（统一色口径）：
 * 低＝success（绿）/ 中＝primary（蓝）/ 高＝warning（橙）/ 超高＝danger（红）/ 未知或空＝info（灰）。
 * 注：本工程 Element Plus 2.14 的 el-tag 未传 type 时会回落 primary（蓝），
 * 达不到「默认灰」，故未知/空在此显式回落 info（灰），色口径只在此一处维护。
 */
export function severityTagType(value) {
  const level = String(value ?? '').trim()
  if (level === '低') return 'success'
  if (level === '中') return 'primary'
  if (level === '高') return 'warning'
  if (level === '超高') return 'danger'
  return 'info'
}

/**
 * 激活状态 Tag 颜色（统一色口径，由 riskRunStatus 派生；字段键与枚举值不变）：
 * activated（已激活）＝danger（红）/ inactive（未激活）＝info（灰）/ closed（已关闭）＝success（绿）。
 */
export function activationStatusTagType(row) {
  const status = riskRunStatus(row)
  if (status === 'activated') return 'danger'
  if (status === 'inactive') return 'info'
  if (status === 'closed') return 'success'
  return 'info'
}

export function closeStatusLabel(status) {
  return CLOSE_STATUS_LABEL[status] || '--'
}

/**
 * 审批过程步骤（本模块仅监理一级审批，步骤固定 2 步）。
 * 审批中 → 第 2 步为「当前」；已通过/已驳回 → 第 2 步已完成（时间取 finish_time）。
 */
export function riskApprovalFlow(row) {
  if (!row) return []
  const submitUser = row.creator || '--'
  const supervisorUser = formatMatSupervisorApproverLabel({
    name: row.supervisor_approver_name,
    org: row.supervisor_approver_org,
    post_label: row.supervisor_approver_post_label,
  }) || '--'
  const reviewing = row.approval_status === 'reviewing'
  const done = row.approval_status === 'approved' || row.approval_status === 'rejected'
  let remark = '待审批'
  if (row.approval_status === 'approved') remark = '已通过'
  if (row.approval_status === 'rejected') {
    remark = `已驳回：${row.last_opinion || '--'}`
  }
  return [
    {
      title: '发起风险辨识',
      time: row.submit_time || '',
      user: submitUser,
      remark: '已提交风险辨识申请',
      status: 'done',
    },
    {
      title: '监理审批',
      time: done ? (row.finish_time || '') : '',
      user: supervisorUser,
      remark,
      status: reviewing ? 'current' : (done ? 'done' : 'pending'),
    },
  ]
}

/** 重新报审来源（展示用）：无来源时返回 `--` */
export function riskCopyFromLabel(row) {
  const no = String(row?.copy_from_source_no || '').trim()
  return no || '--'
}

export function airportRiskSourceName(id) {
  if (!id) return '--'
  return airportRiskSourceList.find((row) => row.id === id)?.source_name || '--'
}

/** 按类型名称回查类型标识（Q12 B：标识关联 + 名称快照）
 * 返回 null 表示该名称在当前项目类型配置中已不存在（历史快照名）。
 */
export function riskTypeIdByName(projectId, nameToFind) {
  const row = airportRiskSourceList.find(
    (r) => r.project_id === projectId && r.source_name === String(nameToFind || '').trim(),
  )
  return row ? row.id : null
}

/** 当前项目已配置的风险类型名称（登记、配置库唯一来源） */
export function listRiskTypeNames(projectId) {
  return listAirportRiskSources(projectId).map((row) => row.source_name)
}

function seedRiskTypeNames() {
  const names = [...AIRPORT_RISK_SOURCE_DEFAULTS]
  RISK_TYPE_PRESETS.forEach((name) => {
    if (!names.includes(name)) names.push(name)
  })
  return names
}

function seedAirportSources(projectId) {
  return seedRiskTypeNames().map((name, index) => ({
    id: `ars-${projectId}-${index + 1}`,
    project_id: projectId,
    source_name: name,
    creator: '系统',
    created_at: '2026-09-18',
  }))
}

/** 风险类型配置。名称字段仍为 source_name，登记与配置库均从此选择。 */
export const airportRiskSourceList = reactive([
  ...seedAirportSources('p-000'),
  ...seedAirportSources('p-001'),
])

let airportSourceSeq = 20

export function ensureAirportRiskSources(projectId) {
  if (!projectId) return
  if (airportRiskSourceList.some((row) => row.project_id === projectId)) return
  seedAirportSources(projectId).forEach((row) => airportRiskSourceList.push(row))
}

export function listAirportRiskSources(projectId, keyword = '') {
  ensureAirportRiskSources(projectId)
  const q = String(keyword || '').trim()
  return airportRiskSourceList.filter((row) => {
    if (row.project_id !== projectId) return false
    if (q && !(row.source_name || '').includes(q)) return false
    return true
  })
}

function cell(v) {
  if (v === null || v === undefined || String(v).trim() === '') return '--'
  return v
}

export { cell as formatRiskCell }

/**
 * 填报时间展示（统一到分）：`YYYY-MM-DD HH:mm`。
 * 填报时间由提交后系统自动生成，落库为完整时间戳 `YYYY-MM-DD HH:mm:ss`；
 * 列表 / 详情 / 个人中心待办面板统一用本 helper 截断到分展示，空值回落 `--`。
 */
export function formatRiskReportTime(value) {
  const text = String(value ?? '').trim()
  if (!text) return '--'
  return text.slice(0, 16)
}

let configSeq = 7
let controlSeq = 10

/**
 * 每个风险类型一条演示种子。已有台账的类型按项目跳过，避免重复。
 * 管控登记挂在「进行中」进度上，审批已通过且未关闭，列表中为已激活。
 */
const RISK_TYPE_DEMO_SEEDS = [
  {
    risk_type: '不停航施工',
    risk_point: '夜间施工窗口超时未撤离',
    risk_segment: '跑道端不停航作业区',
    risk_desc: '不停航施工未按批准窗口撤离机具和人员。',
    control_measure: '按不停航方案限时作业；设置撤离时限；与塔台保持联络；超时立即停工清场。',
    risk_factor: '夜间窗口结束前机具仍停留在跑道端安全区。',
    hazard_consequence: '与航空器运行冲突，造成航班延误或地面事故。',
    frequency_x: '日',
    frequency_n: 100,
    severity: '超高',
  },
  {
    risk_type: '净空保护',
    risk_point: '塔吊高度接近净空限高',
    risk_segment: '航站区塔吊作业',
    risk_desc: '起重设备回转高度接近净空限制面。',
    control_measure: '按净空批复控制设备高度；安装障碍灯；超高立即降臂停工。',
    risk_factor: '塔吊大臂回转高度接近净空限制面。',
    hazard_consequence: '侵入净空，影响航空器起降安全。',
    frequency_x: '周',
    frequency_n: 100,
    severity: '高',
  },
  {
    risk_type: '地下管线（航油、通信、导航）保护',
    risk_point: '管线上方机械开挖',
    risk_segment: '航油及通信管线上方土方',
    risk_desc: '机械开挖前未完成管线交底和人工探挖。',
    control_measure: '先人工探挖；设置标识和隔离；专人旁站；禁止在管线上方堆载。',
    risk_factor: '航油管线上方拟机械开挖，交底资料不完整。',
    hazard_consequence: '挖断航油或通信导航管线，造成泄漏、中断和运行风险。',
    frequency_x: '月',
    frequency_n: 100,
    severity: '超高',
  },
  {
    risk_type: '空防安全',
    risk_point: '控制区通行证核验不严',
    risk_segment: '飞行区施工出入口',
    risk_desc: '人员、车辆未核验通行证即进入控制区。',
    control_measure: '出入核验证件；工具清点；围界完好；无关人员禁止进入。',
    risk_factor: '施工人员证件过期仍随车进入控制区。',
    hazard_consequence: '空防失控，危及飞行区安全。',
    frequency_x: '季',
    frequency_n: 100,
    severity: '高',
  },
  {
    risk_type: '高处坠落',
    risk_point: '洞口未覆盖',
    risk_segment: '楼层预留洞口',
    risk_desc: '预留洞口盖板缺失或未固定，人员易坠落。',
    control_measure: '洞口盖板固定并标识；周边设防护栏杆；班前检查。',
    risk_factor: '二层预留洞口盖板被挪作他用。',
    hazard_consequence: '人员坠入洞口，造成伤亡。',
    frequency_x: '年',
    frequency_n: 100,
    severity: '高',
  },
  {
    risk_type: '起重伤害',
    risk_point: '汽车吊支腿未垫实',
    risk_segment: '构件卸车吊装',
    risk_desc: '吊装地面松软，支腿未按规定垫实。',
    control_measure: '核对地基承载力；支腿垫板；划定警戒区；持证指挥。',
    risk_factor: '回填土地面直接支腿吊装钢构件。',
    hazard_consequence: '起重机倾覆，砸伤人员和设备。',
    frequency_x: '小时',
    frequency_n: 100,
    severity: '超高',
  },
  {
    risk_type: '机械伤害',
    risk_point: '钢筋加工机械防护缺失',
    risk_segment: '钢筋加工棚',
    risk_desc: '切断机、弯曲机防护罩缺失，人员靠近旋转部位。',
    control_measure: '防护罩完好；持证操作；清理作业区；停机检修挂牌。',
    risk_factor: '切断机防护罩未安装即投入使用。',
    hazard_consequence: '肢体被卷入或切断。',
    frequency_x: '日',
    frequency_n: 100,
    severity: '中',
  },
  {
    risk_type: '车辆伤害',
    risk_point: '倒车视线受阻',
    risk_segment: '材料堆场出入口',
    risk_desc: '渣土车倒车时视线被堆料遮挡，指挥缺失。',
    control_measure: '倒车必须有指挥；安装倒车影像和警报；人车分流。',
    risk_factor: '出入口堆料过高，倒车无专人指挥。',
    hazard_consequence: '碾压或碰撞现场人员。',
    frequency_x: '周',
    frequency_n: 100,
    severity: '高',
  },
  {
    risk_type: '坍塌',
    risk_point: '外脚手架连墙件滞后',
    risk_segment: '主体外脚手架',
    risk_desc: '连墙件未与架体同步设置，局部悬挑。',
    control_measure: '按方案搭设；验收挂牌；连墙件同步；禁止超载堆料。',
    risk_factor: '外架已搭至作业层，连墙件尚未安装。',
    hazard_consequence: '脚手架失稳坍塌，造成群死群伤。',
    frequency_x: '月',
    frequency_n: 100,
    severity: '超高',
  },
  {
    risk_type: '触电',
    risk_point: '手持电动工具未接漏保',
    risk_segment: '装修临时用电',
    risk_desc: '手持工具直接接入未装漏电保护的插座。',
    control_measure: '一机一闸一漏保；工具绝缘完好；电工巡查。',
    risk_factor: '手持切割机未经过漏电保护器取电。',
    hazard_consequence: '漏电导致人员触电。',
    frequency_x: '季',
    frequency_n: 100,
    severity: '中',
  },
  {
    risk_type: '物体打击',
    risk_point: '高处物料未绑扎',
    risk_segment: '外架作业层',
    risk_desc: '小型工具和扣件随手放在脚手板上。',
    control_measure: '工具入袋；物料绑扎；下方设置警戒；禁止抛掷。',
    risk_factor: '外架作业层扣件未入袋，下方有人通行。',
    hazard_consequence: '坠物打击下方人员。',
    frequency_x: '年',
    frequency_n: 100,
    severity: '高',
  },
  {
    risk_type: '中毒窒息',
    risk_point: '有限空间未检测通风',
    risk_segment: '管沟及检查井',
    risk_desc: '进入管沟、检查井前未检测气体、未强制通风。',
    control_measure: '先通风检测；专人监护；应急装备到位；禁止盲目施救。',
    risk_factor: '检查井内拟焊接，未做气体检测。',
    hazard_consequence: '人员中毒或窒息。',
    frequency_x: '小时',
    frequency_n: 100,
    severity: '高',
  },
  {
    risk_type: '火灾爆炸',
    risk_point: '油漆库通风不良',
    risk_segment: '装饰材料暂存',
    risk_desc: '易燃涂料密闭存放，现场有电气火花。',
    control_measure: '单独存放并通风；严禁烟火；配备灭火器；控制存量。',
    risk_factor: '油漆暂存间与配电箱相邻且无通风。',
    hazard_consequence: '挥发气体遇火花燃烧爆炸。',
    frequency_x: '日',
    frequency_n: 50,
    severity: '中',
  },
  {
    risk_type: '其他',
    risk_point: '暴雨季节基坑积水',
    risk_segment: '雨季施工',
    risk_desc: '强降雨导致基坑积水、边坡浸泡。',
    control_measure: '完善排水；雨前覆盖；停工撤离低洼作业面；雨后复工检查。',
    risk_factor: '预报强降雨，基坑集水井尚未启用。',
    hazard_consequence: '边坡失稳，或人员滑跌、淹溺。',
    frequency_x: '周',
    frequency_n: 100,
    severity: '中',
  },
]

const DEMO_SUPERVISOR = {
  supervisor_approver_user_id: 'u-jl-01',
  supervisor_approver_name: '李总监',
  supervisor_approver_org: '深圳某监理有限公司',
  supervisor_approver_post_label: '总监理工程师',
}

function demoSeedsFor(skipTypes) {
  return RISK_TYPE_DEMO_SEEDS.filter((item) => !skipTypes.includes(item.risk_type))
}

function buildDemoConfigs(projectId, skipTypes) {
  return demoSeedsFor(skipTypes).map((item, index) => ({
    id: `rpc-${projectId}-d${index + 1}`,
    project_id: projectId,
    risk_type: item.risk_type,
    risk_point: item.risk_point,
    risk_segment: item.risk_segment,
    risk_desc: item.risk_desc,
    control_measure: item.control_measure,
    creator: '陈安全',
    created_at: '2026-09-18',
  }))
}

/** 取填报时间的日期部分（`YYYY-MM-DD HH:mm:ss` → `YYYY-MM-DD`；仅传日期时原样返回），供风险源编号使用 */
function reportDay(value) {
  return String(value || '').trim().slice(0, 10)
}

/**
 * 演示种子：编号与填报时间成对传入，编号取填报时间的日期部分，保持三段式 `FX-YYYYMMDD-序号` 自洽，
 * 且不同项目使用不同日期段，避免编号与「同日序号」冲突。
 */
function buildDemoControls(projectId, skipTypes, progressId, locationId, reportTime) {
  const day = reportDay(reportTime).replace(/-/g, '')
  return demoSeedsFor(skipTypes).map((item, index) => ({
    id: `rpk-${projectId}-d${index + 1}`,
    project_id: projectId,
    risk_source_no: `FX-${day}-${String(index + 1).padStart(3, '0')}`,
    report_time: reportTime,
    risk_factor: item.risk_factor,
    hazard_consequence: item.hazard_consequence,
    construction_stage: '施工',
    construction_progress_id: progressId,
    risk_type: item.risk_type,
    risk_point: item.risk_point,
    risk_segment: item.risk_segment,
    risk_location_wbs_id: locationId ? [locationId] : [],
    risk_location: '',
    risk_desc: item.risk_desc,
    control_measure: item.control_measure,
    plan_start: '2026-09-19',
    plan_end: '2026-10-31',
    control_person_id: index % 2 === 0 ? 'u-so-01' : 'u-so-02',
    implement_person_id: index % 2 === 0 ? 'u-cpm-01' : 'u-site-01',
    frequency_x: item.frequency_x,
    frequency_n: item.frequency_n,
    severity: item.severity,
    approval_status: 'approved',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    ...DEMO_SUPERVISOR,
    submit_time: '2026-09-19 09:00:00',
    finish_time: '2026-09-19 15:00:00',
    creator: '陈安全',
    created_at: '2026-09-19 09:00:00',
  }))
}

/** 风险配置库 */
export const riskPointConfigList = reactive([
  {
    id: 'rpc-001',
    project_id: 'p-000',
    risk_type: '高处坠落',
    risk_point: '临边防护缺失或不到位',
    risk_segment: '楼层临边、基坑临边',
    risk_desc: '作业面临边未设置防护栏杆或防护不严，人员易坠落。',
    control_measure: '临边设置不低于1.2m防护栏杆；挂设安全网；设置警示标识；班前检查。',
    creator: '陈安全',
    created_at: '2026-08-12',
  },
  {
    id: 'rpc-002',
    project_id: 'p-000',
    risk_type: '起重伤害',
    risk_point: '塔吊吊装交叉作业',
    risk_segment: '塔吊覆盖区吊运材料',
    risk_desc: '多台起重设备交叉作业或吊物下方有人，易发生碰撞、打击。',
    control_measure: '统一指挥、划定禁入区；司索工持证上岗；吊装前试吊；风速超限停工。',
    creator: '刘安全',
    created_at: '2026-08-15',
  },
  {
    id: 'rpc-003',
    project_id: 'p-001',
    risk_type: '坍塌',
    risk_point: '深基坑支护变形',
    risk_segment: '基坑开挖与支护',
    risk_desc: '支护结构变形超限或超挖导致基坑坍塌风险。',
    control_measure: '按方案分层开挖；监测预警联动；严禁超挖；雨季加强巡查。',
    creator: '张安全',
    created_at: '2026-08-18',
  },
  {
    id: 'rpc-004',
    project_id: 'p-000',
    risk_type: '触电',
    risk_point: '临时用电线路破损',
    risk_segment: '配电箱及电缆敷设',
    risk_desc: '电缆绝缘破损或配电箱未做防护，潮湿环境易触电。',
    control_measure: '一机一闸一漏保；电缆架空或穿管；配电箱上锁；电工持证巡查。',
    creator: '陈安全',
    created_at: '2026-08-20',
  },
  {
    id: 'rpc-005',
    project_id: 'p-000',
    risk_type: '火灾爆炸',
    risk_point: '动火作业防护不到位',
    risk_segment: '航站区动火点',
    risk_desc: '动火点周边可燃物未清理，灭火器材未到位。',
    control_measure: '动火审批；清理可燃物；配备灭火器；专人监护；作业后复查。',
    creator: '刘安全',
    created_at: '2026-08-22',
  },
  {
    id: 'rpc-006',
    project_id: 'p-000',
    risk_type: '物体打击',
    risk_point: '交叉作业防护缺失',
    risk_segment: '垂直交叉作业区',
    risk_desc: '上下层同时作业，物料坠落打击下方人员。',
    control_measure: '错时作业；设置隔离棚；物料绑扎；下方禁止停留。',
    creator: '张安全',
    created_at: '2026-08-25',
  },
  {
    id: 'rpc-007',
    project_id: 'p-000',
    risk_type: '车辆伤害',
    risk_point: '场内车辆混行',
    risk_segment: '不停航施工通道',
    risk_desc: '施工车辆与场内运行车辆、行人混行。',
    control_measure: '划定专用通道；限速；指挥员引导；夜间反光标识。',
    creator: '陈安全',
    created_at: '2026-08-26',
  },
  ...buildDemoConfigs('p-000', ['高处坠落', '起重伤害', '触电', '火灾爆炸', '物体打击', '车辆伤害']),
  ...buildDemoConfigs('p-001', ['坍塌']),
])

/** 风险点管控台账（风险点位置 = 实体工程分解节点） */
export const riskPointControlList = reactive([
  {
    id: 'rpk-001',
    project_id: 'p-000',
    risk_source_no: 'FX-20260828-001',
    report_time: '2026-08-28 10:20:00',
    risk_factor: '临边栏杆未封闭，作业面临空。',
    hazard_consequence: '人员高处坠落，造成伤亡。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-1',
    risk_type: '高处坠落',
    risk_point: '临边防护缺失或不到位',
    risk_segment: '楼层临边、基坑临边',
    risk_location_wbs_id: ['wn-item-1', 'loc-rebar-a'],
    risk_location: '',
    risk_desc: '东侧临边栏杆尚未封闭，存在坠落风险。',
    control_measure: '临边设置不低于1.2m防护栏杆；挂设安全网；设置警示标识；班前检查。',
    plan_start: '2026-09-01',
    plan_end: '2026-09-30',
    control_person_id: 'u-so-01',
    implement_person_id: 'u-cpm-01',
    frequency_x: '月',
    frequency_n: 100,
    severity: '高',
    approval_status: 'approved',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-08-28 10:20:00',
    finish_time: '2026-08-28 16:00:00',
    creator: '陈安全',
    created_at: '2026-08-28 10:20:00',
  },
  {
    id: 'rpk-002',
    project_id: 'p-000',
    risk_source_no: 'FX-20260829-001',
    report_time: '2026-08-29 14:05:00',
    risk_factor: '多台起重设备在同一覆盖区交叉作业。',
    hazard_consequence: '吊物坠落或设备碰撞，造成人员伤害和设备损坏。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-2',
    risk_type: '起重伤害',
    risk_point: '塔吊吊装交叉作业',
    risk_segment: '塔吊覆盖区吊运材料',
    risk_location_wbs_id: ['loc-cable-1'],
    risk_location: '',
    risk_desc: '塔吊与汽车吊交叉作业时段集中，需加强指挥。',
    control_measure: '统一指挥、划定禁入区；司索工持证上岗；吊装前试吊；风速超限停工。',
    plan_start: '2026-09-05',
    plan_end: '2026-09-25',
    control_person_id: 'u-so-02',
    implement_person_id: 'u-site-01',
    frequency_x: '季',
    frequency_n: 100,
    severity: '超高',
    approval_status: 'approved',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-08-29 14:05:00',
    finish_time: '2026-08-29 18:10:00',
    creator: '刘安全',
    created_at: '2026-08-29 14:05:00',
  },
  {
    id: 'rpk-003',
    project_id: 'p-000',
    risk_source_no: 'FX-20260916-001',
    report_time: '2026-09-16 09:30:00',
    risk_factor: '基坑临边防护不连续。',
    hazard_consequence: '人员或物料坠入基坑。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-1',
    risk_type: '高处坠落',
    risk_point: '临边防护缺失或不到位',
    risk_segment: '楼层临边、基坑临边',
    risk_location_wbs_id: [],
    risk_location: '',
    risk_desc: '基坑监测接近预警值，需监理确认分级与措施。',
    control_measure: '按方案分层开挖；监测预警联动；严禁超挖；雨季加强巡查。',
    plan_start: '2026-09-10',
    plan_end: '2026-09-30',
    control_person_id: 'u-so-01',
    implement_person_id: 'u-cpm-01',
    frequency_x: '年',
    frequency_n: 100,
    severity: '高',
    approval_status: 'reviewing',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-09-16 09:30:00',
    finish_time: '',
    creator: '张安全',
    created_at: '2026-09-16 09:30:00',
  },
  {
    id: 'rpk-004',
    project_id: 'p-000',
    risk_source_no: 'FX-20260901-001',
    report_time: '2026-09-01 09:10:00',
    risk_factor: '航站区动火点周边仍堆放包装材料和油污抹布。',
    hazard_consequence: '动火引燃可燃物，造成火灾和人员灼伤。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-1',
    risk_type: '火灾爆炸',
    risk_point: '动火作业防护不到位',
    risk_segment: '航站区动火点',
    risk_location_wbs_id: ['loc-wp-1'],
    risk_location: '',
    risk_desc: '动火已结束并复查，措施已落实，予以关闭。',
    control_measure: '动火审批；清理可燃物；配备灭火器；专人监护；作业后复查。',
    plan_start: '2026-09-01',
    plan_end: '2026-09-08',
    control_person_id: 'u-so-02',
    implement_person_id: 'u-cpm-02',
    frequency_x: '小时',
    frequency_n: 50,
    severity: '中',
    approval_status: 'approved',
    close_status: 'closed',
    closed_at: '2026-09-08 17:20:00',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-09-01 09:10:00',
    finish_time: '2026-09-01 15:40:00',
    creator: '刘安全',
    created_at: '2026-09-01 09:10:00',
  },
  {
    id: 'rpk-005',
    project_id: 'p-000',
    risk_source_no: 'FX-20260820-001',
    report_time: '2026-08-20 11:00:00',
    risk_factor: '管线迁改段临时电缆曾沿地敷设，绝缘局部老化。',
    hazard_consequence: '潮湿环境触电，造成人员伤亡或停电。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-3',
    risk_type: '触电',
    risk_point: '临时用电线路破损',
    risk_segment: '配电箱及电缆敷设',
    risk_location_wbs_id: ['loc-cable-1'],
    risk_location: '',
    risk_desc: '管线迁改已完成，进度不再进行中，风险未激活。',
    control_measure: '一机一闸一漏保；电缆架空或穿管；配电箱上锁；电工持证巡查。',
    plan_start: '2026-08-20',
    plan_end: '2026-09-05',
    control_person_id: 'u-so-01',
    implement_person_id: 'u-site-01',
    frequency_x: '日',
    frequency_n: 200,
    severity: '低',
    approval_status: 'approved',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-08-20 11:00:00',
    finish_time: '2026-08-20 16:30:00',
    creator: '陈安全',
    created_at: '2026-08-20 11:00:00',
  },
  {
    id: 'rpk-006',
    project_id: 'p-000',
    risk_source_no: 'FX-20260905-001',
    report_time: '2026-09-05 08:40:00',
    risk_factor: '楼层上下同时作业，防护棚未按方案搭设。',
    hazard_consequence: '上方物料坠落，打击下方作业人员。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-2',
    risk_type: '物体打击',
    risk_point: '交叉作业防护缺失',
    risk_segment: '垂直交叉作业区',
    risk_location_wbs_id: ['loc-rebar-a'],
    risk_location: '',
    risk_desc: '交叉作业时段和隔离措施描述不完整，监理驳回。',
    control_measure: '错时作业；设置隔离棚；物料绑扎；下方禁止停留。',
    plan_start: '2026-09-12',
    plan_end: '2026-10-15',
    control_person_id: 'u-sd-01',
    implement_person_id: 'u-cpm-01',
    frequency_x: '周',
    frequency_n: 10,
    severity: '中',
    approval_status: 'rejected',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    last_opinion: '交叉作业时段和隔离措施请补充后再报。',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-09-05 08:40:00',
    finish_time: '2026-09-05 11:15:00',
    creator: '张安全',
    created_at: '2026-09-05 08:40:00',
  },
  {
    id: 'rpk-007',
    project_id: 'p-000',
    risk_source_no: 'FX-20260918-001',
    report_time: '2026-09-18 10:05:00',
    risk_factor: '不停航通道上施工车辆与场内运行车辆混行。',
    hazard_consequence: '车辆碰撞或碾压，造成人员伤亡和运行中断。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-2',
    risk_type: '车辆伤害',
    risk_point: '场内车辆混行',
    risk_segment: '不停航施工通道',
    risk_location_wbs_id: ['loc-conc-1'],
    risk_location: '',
    risk_desc: '主体施工尚未开始，通道方案待监理确认。',
    control_measure: '划定专用通道；限速；指挥员引导；夜间反光标识。',
    plan_start: '2026-10-01',
    plan_end: '2026-11-30',
    control_person_id: 'u-so-01',
    implement_person_id: 'u-cpm-02',
    frequency_x: '月',
    frequency_n: 10,
    severity: '高',
    approval_status: 'reviewing',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-09-18 10:05:00',
    finish_time: '',
    creator: '陈安全',
    created_at: '2026-09-18 10:05:00',
  },
  {
    id: 'rpk-008',
    project_id: 'p-000',
    risk_source_no: 'FX-20260910-001',
    report_time: '2026-09-10 13:20:00',
    risk_factor: '基坑段配电箱门锁损坏，电缆接头外露。',
    hazard_consequence: '非电工误触带电部位，造成触电伤害。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-000-1',
    risk_type: '触电',
    risk_point: '临时用电线路破损',
    risk_segment: '配电箱及电缆敷设',
    risk_location_wbs_id: ['loc-cable-2'],
    risk_location: '',
    risk_desc: '基坑开挖进行中，临时用电仍在使用。',
    control_measure: '一机一闸一漏保；电缆架空或穿管；配电箱上锁；电工持证巡查。',
    plan_start: '2026-09-10',
    plan_end: '2026-10-20',
    control_person_id: 'u-so-02',
    implement_person_id: 'u-site-01',
    frequency_x: '季',
    frequency_n: 100,
    severity: '中',
    approval_status: 'approved',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-09-10 13:20:00',
    finish_time: '2026-09-10 17:00:00',
    creator: '刘安全',
    created_at: '2026-09-10 13:20:00',
  },
  {
    id: 'rpk-009',
    project_id: 'p-001',
    risk_source_no: 'FX-20260902-001',
    report_time: '2026-09-02 09:00:00',
    risk_factor: '主体施工段深基坑监测位移接近预警。',
    hazard_consequence: '支护失效导致基坑坍塌，掩埋人员和设备。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-001-1',
    risk_type: '坍塌',
    risk_point: '深基坑支护变形',
    risk_segment: '基坑开挖与支护',
    risk_location_wbs_id: ['loc-rwy-1'],
    risk_location: '',
    risk_desc: '土建主体施工进行中，支护变形仍需跟踪。',
    control_measure: '按方案分层开挖；监测预警联动；严禁超挖；雨季加强巡查。',
    plan_start: '2026-09-02',
    plan_end: '2026-10-31',
    control_person_id: 'u-sd-01',
    implement_person_id: 'u-cpm-01',
    frequency_x: '年',
    frequency_n: 100,
    severity: '超高',
    approval_status: 'approved',
    close_status: 'open',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-09-02 09:00:00',
    finish_time: '2026-09-02 14:30:00',
    creator: '张安全',
    created_at: '2026-09-02 09:00:00',
  },
  {
    id: 'rpk-010',
    project_id: 'p-001',
    risk_source_no: 'FX-20260908-001',
    report_time: '2026-09-08 10:30:00',
    risk_factor: '局部超挖已回填并复测合格。',
    hazard_consequence: '若再次超挖，可能引起边坡失稳。',
    construction_stage: '施工',
    construction_progress_id: 'prog-p-001-1',
    risk_type: '坍塌',
    risk_point: '深基坑支护变形',
    risk_segment: '基坑开挖与支护',
    risk_location_wbs_id: ['loc-rwy-2'],
    risk_location: '',
    risk_desc: '该点位已处置完毕并关闭，不再纳入激活跟踪。',
    control_measure: '按方案分层开挖；监测预警联动；严禁超挖；雨季加强巡查。',
    plan_start: '2026-09-08',
    plan_end: '2026-09-15',
    control_person_id: 'u-so-02',
    implement_person_id: 'u-cpm-01',
    frequency_x: '小时',
    frequency_n: 200,
    severity: '中',
    approval_status: 'approved',
    close_status: 'closed',
    closed_at: '2026-09-15 16:00:00',
    copy_from_pk: '',
    copy_from_source_no: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    supervisor_approver_org: '深圳某监理有限公司',
    supervisor_approver_post_label: '总监理工程师',
    submit_time: '2026-09-08 10:30:00',
    finish_time: '2026-09-08 15:10:00',
    creator: '刘安全',
    created_at: '2026-09-08 10:30:00',
  },
  ...buildDemoControls('p-000', ['高处坠落', '起重伤害', '触电', '火灾爆炸', '物体打击', '车辆伤害'], 'prog-p-000-1', 'loc-conc-1', '2026-09-19 09:00:00'),
  ...buildDemoControls('p-001', ['坍塌'], 'prog-p-001-1', 'loc-rwy-1', '2026-09-20 09:00:00'),
  // 演示「重新报审 + 审批过程」：源单 = 已驳回的 rpk-006，新记录按今天生成编号（同日序号接排）
  ...buildResubmitControl(
    {
      id: 'rpk-006',
      project_id: 'p-000',
      risk_source_no: 'FX-20260905-001',
      risk_factor: '楼层上下同时作业，防护棚未按方案搭设。',
      hazard_consequence: '上方物料坠落，打击下方作业人员。',
      construction_stage: '施工',
      construction_progress_id: 'prog-p-000-2',
      risk_type: '物体打击',
      risk_point: '交叉作业防护缺失',
      risk_segment: '垂直交叉作业区',
      risk_location_wbs_id: ['loc-rebar-a'],
      risk_location: '',
      risk_desc: '交叉作业时段和隔离措施描述不完整，监理驳回。',
      control_measure: '错时作业；设置隔离棚；物料绑扎；下方禁止停留。',
      plan_start: '2026-09-12',
      plan_end: '2026-10-15',
      control_person_id: 'u-sd-01',
      implement_person_id: 'u-cpm-01',
      frequency_x: '周',
      frequency_n: 10,
      severity: '中',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_org: '深圳某监理有限公司',
      supervisor_approver_post_label: '总监理工程师',
      creator: '张安全',
    },
    1,
  ),
])

/**
 * 「重新报审」演示种子：由已驳回原单 rpk-006（FX-20260905-001）复制生成的新记录。
 * 原单保持已驳回、只读、不可再提；新记录按新的填报时间（新单提交时刻）生成新的风险源编号，
 * 并保留来源追溯。
 * 注意：本函数在 riskPointControlList 初始化表达式中被调用，不能反向引用该常量（TDZ），
 * 故源单对象与「同日序号」由调用处传入。
 */
function buildResubmitControl(source, seq) {
  if (!source) return []
  const report_time = nowStr()
  return [{
    ...source,
    id: 'rpk-011',
    risk_source_no: `FX-${reportDay(report_time).replace(/-/g, '')}-${String(seq).padStart(3, '0')}`,
    report_time,
    approval_status: 'reviewing',
    close_status: 'open',
    last_opinion: '',
    last_operator: '',
    closed_at: '',
    submit_time: report_time,
    finish_time: '',
    copy_from_pk: source.id,
    copy_from_source_no: source.risk_source_no,
    creator: source.creator,
    created_at: report_time,
  }]
}

/** 位置节点标识统一为字符串数组（兼容历史单值） */
export function normalizeLocationWbsIds(value) {
  if (Array.isArray(value)) return value.map((id) => String(id || '').trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  return []
}

/** 列表/详情展示：优先实体工程分解路径（多选以顿号拼接） */
export function riskLocationLabel(row) {
  if (!row) return '--'
  const ids = normalizeLocationWbsIds(row.risk_location_wbs_id)
  if (ids.length) {
    const paths = ids.map((id) => getEntityNodePathLabel(id)).filter(Boolean)
    if (paths.length) return paths.join('、')
  }
  return cell(row.risk_location)
}

export function listRiskPointConfigs(projectId, filters = {}) {
  const { risk_type = '', risk_point = '' } = filters
  return riskPointConfigList.filter((row) => {
    if (row.project_id !== projectId) return false
    if (risk_type && row.risk_type !== risk_type) return false
    if (risk_point && !(row.risk_point || '').includes(risk_point.trim())) return false
    return true
  })
}

/** 当前项目风险类型配置中的类型名称（登记与配置库唯一来源） */
export function listConfigRiskTypes(projectId) {
  return listRiskTypeNames(projectId)
}

/**
 * 类型筛选解析：入参可为「类型标识」或「类型名称（快照）」。
 * Q12 B / C3：标识是稳定关联键，名称仅作展示快照；联动优先按标识匹配，
 * 兼容按名称匹配（历史快照名或旧调用）。
 */
function resolveRiskTypeKeys(projectId, riskTypeOrId) {
  const raw = String(riskTypeOrId || '').trim()
  if (!raw) return { ids: [], names: [] }
  const source = airportRiskSourceList.find(
    (r) => r.project_id === projectId && (r.id === raw || r.source_name === raw),
  )
  const ids = new Set()
  const names = new Set()
  if (source && source.id === raw) ids.add(raw)
  else names.add(raw)
  if (source) {
    ids.add(source.id)
    names.add(source.source_name)
  }
  return { ids: [...ids], names: [...names] }
}

function configRowMatchesType(row, keys) {
  if (row.risk_type_id) return keys.ids.includes(row.risk_type_id)
  return keys.names.includes(String(row.risk_type || '').trim())
}

/** 指定风险类型下的风险点（去重，供管控登记联动） */
export function listConfigRiskPoints(projectId, riskTypeOrId) {
  const keys = resolveRiskTypeKeys(projectId, riskTypeOrId)
  const set = new Set()
  riskPointConfigList.forEach((row) => {
    if (row.project_id === projectId && configRowMatchesType(row, keys) && row.risk_point) {
      set.add(row.risk_point)
    }
  })
  return [...set]
}

/** 指定类型+风险点下的风险细分（去重；空细分不参与联动选项） */
export function listConfigRiskSegments(projectId, riskTypeOrId, riskPoint) {
  const keys = resolveRiskTypeKeys(projectId, riskTypeOrId)
  const set = new Set()
  riskPointConfigList.forEach((row) => {
    if (
      row.project_id === projectId
      && configRowMatchesType(row, keys)
      && row.risk_point === riskPoint
    ) {
      const seg = (row.risk_segment || '').trim()
      if (seg) set.add(seg)
    }
  })
  return [...set]
}

/** 按类型+风险点+细分匹配配置行（细分按 trim 比较；多条取第一条） */
export function findRiskPointConfig(projectId, riskTypeOrId, riskPoint, riskSegment = '') {
  const seg = (riskSegment || '').trim()
  const keys = resolveRiskTypeKeys(projectId, riskTypeOrId)
  return (
    riskPointConfigList.find(
      (row) =>
        row.project_id === projectId
        && configRowMatchesType(row, keys)
        && row.risk_point === riskPoint
        && (row.risk_segment || '').trim() === seg,
    ) || null
  )
}

/** 校验管控登记的类型/风险点/细分：类型来自风险类型配置，点与细分来自配置库 */
export function matchControlToConfig(projectId, riskTypeOrId, riskPoint, riskSegment = '') {
  const keys = resolveRiskTypeKeys(projectId, riskTypeOrId)
  if (!keys.ids.length && !keys.names.length) {
    return { ok: false, msg: '风险类型须从风险类型配置中选择' }
  }
  if (!listConfigRiskPoints(projectId, riskTypeOrId).includes(riskPoint)) {
    return { ok: false, msg: '风险点须从配置库选择，并与风险类型联动' }
  }
  const segs = listConfigRiskSegments(projectId, riskTypeOrId, riskPoint)
  const seg = (riskSegment || '').trim()
  if (!segs.includes(seg)) {
    return { ok: false, msg: '风险细分须从配置库选择，并与风险类型、风险点联动' }
  }
  return { ok: true, config: findRiskPointConfig(projectId, riskTypeOrId, riskPoint, seg) }
}

export function getRiskPointConfig(id) {
  return riskPointConfigList.find((r) => r.id === id) || null
}

export function saveRiskPointConfig(projectId, payload, editorName = '系统管理员') {
  const risk_type = (payload.risk_type || '').trim()
  const risk_point = (payload.risk_point || '').trim()
  const risk_segment = (payload.risk_segment || '').trim()
  const risk_desc = (payload.risk_desc || '').trim()
  const control_measure = (payload.control_measure || '').trim()
  // 必填：风险类型、风险点、风险细分、管控措施
  if (!risk_type) return { ok: false, msg: '请选择风险类型' }
  if (!listRiskTypeNames(projectId).includes(risk_type)) {
    return { ok: false, msg: '风险类型须从风险类型配置中选择' }
  }
  if (!risk_point) return { ok: false, msg: '请填写风险点' }
  if (risk_point.length > 100) return { ok: false, msg: '风险点不超过100字' }
  if (!risk_segment) return { ok: false, msg: '请填写风险细分' }
  if (risk_segment.length > 100) return { ok: false, msg: '风险细分不超过100字' }
  if (risk_desc.length > 300) return { ok: false, msg: '风险描述不超过300字' }
  if (!control_measure) return { ok: false, msg: '请填写管控措施' }
  if (control_measure.length > 300) return { ok: false, msg: '管控措施不超过300字' }
  if (!projectId) return { ok: false, msg: '请先选择项目' }

  const selectedTypeId = riskTypeIdByName(projectId, risk_type)
  const dup = riskPointConfigList.find(
    (r) =>
      r.project_id === projectId
      && (selectedTypeId ? r.risk_type_id === selectedTypeId : r.risk_type === risk_type)
      && r.risk_point === risk_point
      && r.id !== payload.id,
  )
  // 相同「风险类型+风险点」仅提醒，不强制拦截；由调用方确认后带 allowDuplicate 再存
  if (dup && !payload.allowDuplicate) {
    return {
      ok: false,
      code: 'DUPLICATE_TYPE_POINT',
      msg: '同项目下已存在相同「风险类型+风险点」，是否仍要保存？',
    }
  }

  if (payload.id) {
    const row = riskPointConfigList.find((r) => r.id === payload.id && r.project_id === projectId)
    if (!row) return { ok: false, msg: '记录不存在' }
    Object.assign(row, {
      risk_type_id: riskTypeIdByName(projectId, risk_type),
      risk_type,
      risk_point,
      risk_segment,
      risk_desc,
      control_measure,
    })
    return { ok: true, data: row }
  }

  const row = {
    id: `rpc-${String(++configSeq).padStart(3, '0')}`,
    project_id: projectId,
    risk_type_id: riskTypeIdByName(projectId, risk_type),
    risk_type,
    risk_point,
    risk_segment,
    risk_desc,
    control_measure,
    creator: editorName,
    created_at: nowStr().slice(0, 10),
  }
  riskPointConfigList.unshift(row)
  return { ok: true, data: row }
}

/** 台账引用条数：同项目「类型标识+风险点+风险细分」与配置项一致。 */
export function countControlRefsToConfig(projectId, configRow) {
  if (!configRow || !projectId) return 0
  const typeId = configRow.risk_type_id || riskTypeIdByName(projectId, configRow.risk_type)
  const typeName = (configRow.risk_type || '').trim()
  const point = (configRow.risk_point || '').trim()
  const segment = (configRow.risk_segment || '').trim()
  return riskPointControlList.filter(
    (r) =>
      r.project_id === projectId
      && (typeId ? r.risk_type_id === typeId : (r.risk_type || '').trim() === typeName)
      && (r.risk_point || '').trim() === point
      && (r.risk_segment || '').trim() === segment,
  ).length
}

export function removeRiskPointConfig(projectId, id) {
  const idx = riskPointConfigList.findIndex((r) => r.id === id && r.project_id === projectId)
  if (idx < 0) return { ok: false, msg: '记录不存在' }
  const row = riskPointConfigList[idx]
  const refCount = countControlRefsToConfig(projectId, row)
  if (refCount > 0) {
    return {
      ok: false,
      code: 'CONFIG_IN_USE',
      msg: `该配置已被 ${refCount} 条风险辨识引用，请先处理台账后再删除`,
    }
  }
  riskPointConfigList.splice(idx, 1)
  return { ok: true }
}

export function countControlsUsingRiskType(projectId, typeIdOrName) {
  if (!projectId || !typeIdOrName) return 0
  const keys = resolveRiskTypeKeys(projectId, typeIdOrName)
  const source = airportRiskSourceList.find((r) => r.project_id === projectId && r.id === String(typeIdOrName))
  const ids = new Set(keys.ids)
  const names = new Set(keys.names)
  if (source) names.add(source.source_name)
  const controlCount = riskPointControlList.filter((row) =>
    row.project_id === projectId && (
      row.risk_type_id
        ? ids.has(row.risk_type_id)
        : names.has((row.risk_type || '').trim())
    ),
  ).length
  const configCount = riskPointConfigList.filter((row) =>
    row.project_id === projectId && (
      row.risk_type_id
        ? ids.has(row.risk_type_id)
        : names.has((row.risk_type || '').trim())
    ),
  ).length
  return controlCount + configCount
}

export function saveAirportRiskSource(projectId, payload, editorName = '系统管理员') {
  ensureAirportRiskSources(projectId)
  const source_name = (payload.source_name || '').trim()
  if (!projectId) return { ok: false, msg: '请先选择项目' }
  if (!source_name) return { ok: false, msg: '请填写风险类型名称' }
  if (source_name.length > 50) return { ok: false, msg: '风险类型名称不超过50字' }
  const dup = airportRiskSourceList.find(
    (row) =>
      row.project_id === projectId
      && row.source_name === source_name
      && row.id !== payload.id,
  )
  if (dup) return { ok: false, msg: '本项目已有同名风险类型' }
  if (payload.id) {
    const row = airportRiskSourceList.find((item) => item.id === payload.id && item.project_id === projectId)
    if (!row) return { ok: false, msg: '记录不存在' }
    // Q12 B / C3：标识关联 + 名称快照。改名只改类型配置本身，
    // 不级联更新下游配置库/台账（历史保留旧名称快照）。
    row.source_name = source_name
    return { ok: true, data: row }
  }
  const row = {
    id: `ars-${String(++airportSourceSeq).padStart(3, '0')}`,
    project_id: projectId,
    source_name,
    creator: editorName,
    created_at: nowStr().slice(0, 10),
  }
  airportRiskSourceList.unshift(row)
  return { ok: true, data: row }
}

export function removeAirportRiskSource(projectId, id) {
  const idx = airportRiskSourceList.findIndex((row) => row.id === id && row.project_id === projectId)
  if (idx < 0) return { ok: false, msg: '记录不存在' }
  const row = airportRiskSourceList[idx]
  const refCount = countControlsUsingRiskType(projectId, row.id)
  if (refCount > 0) {
    return { ok: false, msg: `该风险类型已被 ${refCount} 条配置或辨识引用，请先处理后再删除` }
  }
  airportRiskSourceList.splice(idx, 1)
  return { ok: true }
}

function parseFrequency(payload) {
  const frequency_x = String(payload.frequency_x || '').trim()
  if (!frequency_x) return { ok: false, msg: '请选择发生频率周期' }
  if (!FREQUENCY_PERIOD_OPTIONS.includes(frequency_x)) {
    return { ok: false, msg: '发生频率周期无效' }
  }
  // 不定期：不统计次数，忽略传入值，强制落库为空
  if (isIrregularFrequency(frequency_x)) {
    return { ok: true, frequency_x, frequency_n: null }
  }
  if (payload.frequency_n === null || payload.frequency_n === undefined || payload.frequency_n === '') {
    return { ok: false, msg: '请填写统计次数' }
  }
  const frequency_n = Number(payload.frequency_n)
  if (!Number.isInteger(frequency_n) || frequency_n < 1) {
    return { ok: false, msg: '统计次数须为不小于 1 的整数' }
  }
  return { ok: true, frequency_x, frequency_n }
}

function resolveSupervisor(payload) {
  const supervisor_approver_user_id = String(payload.supervisor_approver_user_id || '').trim()
  if (!supervisor_approver_user_id) return { ok: false, msg: '请选择监理审批人' }
  const user = findMatSupervisorApprover(supervisor_approver_user_id)
  if (!user) return { ok: false, msg: '监理审批人不在本项目监理岗位人员范围内' }
  return {
    ok: true,
    supervisor_approver_user_id: user.user_id,
    supervisor_approver_name: user.name,
    supervisor_approver_org: user.org,
    supervisor_approver_post_label: user.post_label,
  }
}

function pushSupervisorTodo(row) {
  createRiskControlSupervisorTodo({
    controlId: row.id,
    projectId: row.project_id,
    projectLabel: getProjectLabel(row.project_id),
    riskPoint: row.risk_point,
    applicantName: row.creator,
    applyTime: row.submit_time,
    supervisorName: formatMatSupervisorApproverLabel({
      name: row.supervisor_approver_name,
      org: row.supervisor_approver_org,
      post_label: row.supervisor_approver_post_label,
    }),
  })
}

export function listRiskPointControls(projectId, filters = {}) {
  const {
    report_time = '',
    risk_type = '',
    severity = '',
    approval_status = '',
    risk_status = '',
  } = filters
  const reportTimeDay = String(report_time || '').trim().slice(0, 10)
  return riskPointControlList.filter((row) => {
    if (row.project_id !== projectId) return false
    // 填报时间筛选：按该日期当天匹配（筛选器只提供日期，不新造范围筛选）
    if (reportTimeDay && reportDay(row.report_time) !== reportTimeDay) return false
    if (risk_type && row.risk_type !== risk_type) return false
    if (severity && row.severity !== severity) return false
    if (approval_status && row.approval_status !== approval_status) return false
    if (risk_status && riskRunStatus(row) !== risk_status) return false
    return true
  })
}

/**
 * 风险点审批指标（纯审批状态口径）。
 * 总数 = 该项目全部风险辨识记录；其余三项按审批状态计数。
 */
export function listRiskControlMetrics(projectId) {
  const rows = listRiskPointControls(projectId)
  return {
    total: rows.length,
    reviewing: rows.filter((row) => row.approval_status === 'reviewing').length,
    approved: rows.filter((row) => row.approval_status === 'approved').length,
    rejected: rows.filter((row) => row.approval_status === 'rejected').length,
  }
}

/**
 * 风险点台账查询（只读）：仅审批状态为「已通过」的风险辨识记录。
 * 支持 填报时间 / 风险类型 / 严重程度 / 激活状态（派生） 筛选。
 */
export function listRiskPointLedger(projectId, filters = {}) {
  const {
    report_time = '',
    risk_type = '',
    severity = '',
    risk_status = '',
  } = filters
  return listRiskPointControls(projectId, {
    report_time,
    risk_type,
    severity,
    risk_status,
  }).filter((row) => row.approval_status === 'approved')
}

/**
 * 风险点台账指标（纯激活状态口径）。
 * 仅统计已通过记录，按派生激活状态计数；已激活 = 未关闭且关联施工进度为「进行中」。
 */
export function listRiskPointLedgerMetrics(projectId) {
  const rows = listRiskPointLedger(projectId)
  return {
    total: rows.length,
    activated: rows.filter((row) => riskRunStatus(row) === 'activated').length,
    inactive: rows.filter((row) => riskRunStatus(row) === 'inactive').length,
    closed: rows.filter((row) => riskRunStatus(row) === 'closed').length,
  }
}

export function getRiskPointControl(id) {
  return riskPointControlList.find((r) => r.id === id) || null
}

export function getConfigProjectName(projectId) {
  return getProjectLabel(projectId) || '--'
}

function nextRiskSourceNo(projectId, reportTime) {
  const day = reportDay(reportTime).replace(/-/g, '')
  const prefix = `FX-${day}-`
  const max = riskPointControlList.reduce((acc, row) => {
    if (row.project_id !== projectId) return acc
    const no = row.risk_source_no || ''
    if (!no.startsWith(prefix)) return acc
    const n = Number(no.slice(prefix.length))
    return Number.isFinite(n) && n > acc ? n : acc
  }, 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

/**
 * 新增风险辨识（唯一写入口）。
 * - 普通新增：不传 `copy_from_control_id`。
 * - 重新报审：传 `copy_from_control_id`，源单须为同项目已驳回记录；
 *   原单保留、只读、不可再提，本方法只生成新记录（新风险源编号，按本次填报时间的日期部分）。
 * - 填报时间由系统在提交时自动生成：忽略调用方传入的填报时间入参（含历史字段名），
 *   一律落库为当前时刻（`YYYY-MM-DD HH:mm:ss`）；重新报审同样按新单提交时刻生成。
 */
export function saveRiskPointControl(projectId, payload, editorName = '系统管理员') {
  if (!projectId) return { ok: false, msg: '请先选择项目' }
  ensureAirportRiskSources(projectId)
  const copy_from_control_id = String(payload.copy_from_control_id || '').trim()
  const report_time = nowStr()
  const risk_factor = (payload.risk_factor || '').trim()
  const hazard_consequence = (payload.hazard_consequence || '').trim()
  const construction_stage = (payload.construction_stage || '').trim()
  const construction_progress_id = payload.construction_progress_id || ''
  const risk_type = (payload.risk_type || '').trim()
  const risk_point = (payload.risk_point || '').trim()
  const risk_segment = (payload.risk_segment || '').trim()
  const severity = (payload.severity || '').trim()
  const freq = parseFrequency(payload)
  if (!freq.ok) return freq
  const risk_location_wbs_id = normalizeLocationWbsIds(payload.risk_location_wbs_id)
  const risk_location = risk_location_wbs_id
    .map((id) => getEntityNodePathLabel(id))
    .filter(Boolean)
    .join('、')
  const risk_desc = (payload.risk_desc || '').trim()
  const control_measure = (payload.control_measure || '').trim()
  const plan_start = (payload.plan_start || '').trim()
  const plan_end = (payload.plan_end || '').trim()
  const control_person_id = payload.control_person_id || ''
  const implement_person_id = payload.implement_person_id || ''
  const supervisor = resolveSupervisor(payload)
  if (!supervisor.ok) return supervisor

  // 重新报审来源校验：放在字段校验之前，确保「来源非法」如实报错
  let copySource = null
  if (copy_from_control_id) {
    copySource = riskPointControlList.find((r) => r.id === copy_from_control_id) || null
    if (!copySource) return { ok: false, msg: '重新报审来源记录不存在' }
    if (copySource.project_id !== projectId) {
      return { ok: false, msg: '重新报审来源须为本项目已驳回风险辨识' }
    }
    if (copySource.approval_status !== 'rejected') {
      return { ok: false, msg: '仅已驳回的风险辨识可重新报审（生成新风险源编号）' }
    }
  }

  if (!risk_factor) return { ok: false, msg: '请填写风险因素' }
  if (risk_factor.length > 300) return { ok: false, msg: '风险因素不超过300字' }
  if (!hazard_consequence) return { ok: false, msg: '请填写危害后果' }
  if (hazard_consequence.length > 300) return { ok: false, msg: '危害后果不超过300字' }
  if (construction_stage && !CONSTRUCTION_STAGE_OPTIONS.includes(construction_stage)) {
    return { ok: false, msg: '施工阶段无效' }
  }
  if (
    construction_progress_id
    && !constructionProgressOptions.some(
      (row) => row.id === construction_progress_id && row.project_id === projectId,
    )
  ) {
    return { ok: false, msg: '施工进度不在当前可选范围内' }
  }
  if (!risk_type) return { ok: false, msg: '请选择风险类型' }
  if (!listRiskTypeNames(projectId).includes(risk_type)) {
    return { ok: false, msg: '风险类型须从风险类型配置中选择' }
  }
  if (!severity) return { ok: false, msg: '请选择严重程度' }
  if (!SEVERITY_LEVELS.includes(severity)) return { ok: false, msg: '严重程度无效' }
  if (!risk_point) return { ok: false, msg: '请选择风险点' }
  if (!(risk_segment || '').trim()) return { ok: false, msg: '请选择风险细分' }
  const cfgMatch = matchControlToConfig(projectId, risk_type, risk_point, risk_segment)
  if (!cfgMatch.ok) return cfgMatch
  if (risk_desc.length > 300) return { ok: false, msg: '风险描述不超过300字' }
  if (!control_measure) return { ok: false, msg: '请填写管控措施' }
  if (control_measure.length > 300) return { ok: false, msg: '管控措施不超过300字' }
  if (plan_start && plan_end && plan_end < plan_start) {
    return { ok: false, msg: '计划结束时间不能早于开始时间' }
  }
  if (!control_person_id) return { ok: false, msg: '请选择管控责任人' }
  if (!implement_person_id) return { ok: false, msg: '请选择实施责任人' }

  const base = {
    report_time,
    risk_factor,
    hazard_consequence,
    construction_stage,
    construction_progress_id,
    risk_type_id: riskTypeIdByName(projectId, risk_type),
    risk_type,
    risk_point,
    risk_segment,
    frequency_x: freq.frequency_x,
    frequency_n: freq.frequency_n,
    severity,
    risk_location_wbs_id,
    risk_location,
    risk_desc,
    control_measure,
    plan_start,
    plan_end,
    control_person_id,
    implement_person_id,
    ...supervisor,
    approval_status: 'reviewing',
    close_status: 'open',
    submit_time: nowStr(),
    finish_time: '',
  }

  const row = {
    id: `rpk-${String(++controlSeq).padStart(3, '0')}`,
    risk_source_no: nextRiskSourceNo(projectId, report_time),
    project_id: projectId,
    ...base,
    copy_from_pk: copySource ? copySource.id : '',
    copy_from_source_no: copySource ? (copySource.risk_source_no || '') : '',
    creator: editorName,
    created_at: nowStr(),
  }
  riskPointControlList.unshift(row)
  pushSupervisorTodo(row)
  return { ok: true, data: row }
}

export function supervisorApproveRiskControl(id, { action, opinion, operatorName } = {}) {
  const row = riskPointControlList.find((item) => item.id === id)
  if (!row) return { ok: false, msg: '记录不存在' }
  if (row.approval_status !== 'reviewing') return { ok: false, msg: '当前不可审批' }
  if (action !== 'agree' && action !== 'reject') return { ok: false, msg: '无效操作' }
  if (action === 'reject' && !String(opinion || '').trim()) {
    return { ok: false, msg: '请填写驳回意见' }
  }
  const time = nowStr()
  if (action === 'agree') {
    row.approval_status = 'approved'
    row.finish_time = time
    const receivers = [row.control_person_id, row.implement_person_id]
      .filter(Boolean)
      .map((id) => ({ id, name: riskPersonLabel(id) }))
    pushRiskControlMeasureNotices({
      controlId: row.id,
      riskSourceNo: row.risk_source_no,
      riskPoint: row.risk_point,
      controlMeasure: row.control_measure,
      receivers,
    })
  } else {
    row.approval_status = 'rejected'
    row.finish_time = time
  }
  row.last_opinion = String(opinion || '').trim()
  row.last_operator = operatorName || '当前用户'
  return { ok: true, data: row }
}

export function closeRiskPointControl(projectId, id) {
  const row = riskPointControlList.find((item) => item.id === id && item.project_id === projectId)
  if (!row) return { ok: false, msg: '记录不存在' }
  if (row.approval_status !== 'approved' || row.close_status !== 'open') {
    return { ok: false, msg: '当前不可关闭' }
  }
  row.close_status = 'closed'
  row.closed_at = nowStr()
  return { ok: true, data: row }
}

/**
 * 关闭后重新激活（Q7 B，C2：不重新审批）
 * 仅「已通过且已关闭」可重新激活；激活后回到未关闭，
 * 由激活状态三态判定（关联进度进行中→已激活，否则→未激活）。
 */
export function reactivateRiskPointControl(projectId, id) {
  const row = riskPointControlList.find((item) => item.id === id && item.project_id === projectId)
  if (!row) return { ok: false, msg: '记录不存在' }
  if (row.approval_status !== 'approved' || row.close_status !== 'closed') {
    return { ok: false, msg: '当前不可重新激活' }
  }
  row.close_status = 'open'
  row.closed_at = ''
  return { ok: true, data: row }
}

// Q12 B / C3 归一：为已有种子（配置库 + 台账）回填 risk_type_id 快照，
// 使「标识关联 + 名称快照」对历史数据也成立；已有关键 user 新增时也生效。
function backfillRiskTypeId(row) {
  if (!row || row.risk_type_id) return
  const id = riskTypeIdByName(row.project_id, row.risk_type)
  if (id) row.risk_type_id = id
}
riskPointConfigList.forEach(backfillRiskTypeId)
riskPointControlList.forEach(backfillRiskTypeId)

riskPointControlList
  .filter((row) => row.approval_status === 'reviewing')
  .forEach((row) => pushSupervisorTodo(row))


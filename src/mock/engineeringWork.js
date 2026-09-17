/**
 * 工程作业申报 Mock
 * 审批：施工提交 → 监理一级；入口仅个人中心待办
 * 三态：审批中 / 已通过 / 已驳回；无草稿、无撤回；已驳回只能重新申报（新单号）
 */
import { reactive } from 'vue'
import { attachRequiredOk, asAttachList } from '../constants/attachmentUpload.js'
import { nowStr } from '../utils/datetime.js'
import { getProjectLabel } from './laborRealName.js'
import { findProjectById } from './projectBasicInfo.js'
import {
  ensureDailyWorkSeed,
  getDailyWorkRecords,
  toDangerWorkListItem,
  getDerivedDangerWorkList,
} from '../coc/utils/dailyWorkStorage.js'
import { isDangerWorkRecord } from '../coc/utils/dailyWorkClassifier.js'
import {
  listMatSupervisorApprovers,
  findMatSupervisorApprover,
  formatMatSupervisorApproverLabel,
} from './mat.js'
import {
  createEngineeringWorkSupervisorTodo,
  seedEngineeringWorkStartedFromList,
  seedEngineeringWorkDoneFromList,
  upsertEngineeringWorkStarted,
} from './personalCenter.js'

export { listMatSupervisorApprovers, findMatSupervisorApprover, formatMatSupervisorApproverLabel }

export const STATUS_LABEL = {
  reviewing: '审批中',
  approved: '已通过',
  rejected: '已驳回',
}

export const NODE_LABEL = {
  supervisor: '监理审批',
  none: '无',
}

export const ACTION_LABEL = {
  submit: '提交',
  agree: '通过',
  reject: '驳回',
}

export const SNAPSHOT_FIELDS = [
  { key: 'reportDate', label: '施工日期' },
  { key: 'dangerWorkCategory', label: '作业类别' },
  { key: 'workArea', label: '施工区域' },
  { key: 'workContent', label: '当日施工具体内容' },
  { key: 'startTime', label: '作业开始时间' },
  { key: 'endTime', label: '作业结束时间' },
  { key: 'contractor', label: '施工单位' },
  { key: 'leadUnit', label: '管理单位' },
  { key: 'ownerProjectManager', label: '建设单位项目负责人及手机号' },
  { key: 'ownerSafetyManager', label: '建设单位现场安全监管人及手机号' },
  { key: 'contractorProjectManager', label: '施工单位项目负责人及手机号' },
  { key: 'contractorSafetyManager', label: '施工单位现场安全监管人及手机号' },
  { key: 'supervisorProjectManager', label: '监理单位项目负责人及手机号' },
  { key: 'supervisorSafetyManager', label: '监理单位现场安全监管人及手机号' },
  { key: 'dangerControlMeasures', label: '风险管控措施', span: 2 },
]

export function statusLabel(status) {
  return STATUS_LABEL[status] || status || '--'
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'reviewing') return 'warning'
  return 'info'
}

export function emptyCell(value) {
  if (value == null) return '--'
  const text = String(value).trim()
  return text ? text : '--'
}

/** 单条危险作业摘要文案：日期 类别 · 区域 */
export function formatDangerWorkPickLabel(work) {
  if (!work) return ''
  const date = work.reportDate || ''
  const cat = work.dangerWorkCategory || ''
  const area = work.workArea || ''
  const head = [date, cat].filter(Boolean).join(' ')
  return area ? `${head} · ${area}` : head
}

/** 统一取出申报单关联的危险作业列表（兼容旧单条 snapshot） */
export function getEngineeringWorkItems(row) {
  if (!row) return []
  if (Array.isArray(row.works) && row.works.length) {
    return row.works.map((item) => ({ ...item }))
  }
  if (row.daily_work_id || (row.snapshot && Object.keys(row.snapshot).length)) {
    return [
      {
        id: row.daily_work_id || '',
        ...emptySnapshot(),
        ...(row.snapshot || {}),
      },
    ]
  }
  return []
}

export function getEngineeringWorkIds(row) {
  if (!row) return []
  if (Array.isArray(row.daily_work_ids) && row.daily_work_ids.length) {
    return row.daily_work_ids.map(String)
  }
  return getEngineeringWorkItems(row)
    .map((item) => item.id)
    .filter(Boolean)
}

/** 待办/列表用：多选时「类别等N项」或「类别·区域」 */
export function summarizeWorksLabel(works) {
  const list = Array.isArray(works) ? works : []
  if (!list.length) return '危险作业'
  const cats = [...new Set(list.map((w) => w.dangerWorkCategory).filter(Boolean))]
  if (cats.length <= 1) {
    const cat = cats[0] || '危险作业'
    const area = list[0]?.workArea || ''
    return area ? `${cat}·${area}` : cat
  }
  return `${cats[0]}等${list.length}项`
}

export function formatWorksCategories(works) {
  const cats = [...new Set((works || []).map((w) => w.dangerWorkCategory).filter(Boolean))]
  return cats.length ? cats.join('、') : '--'
}

export function formatWorksDates(works) {
  const dates = [...new Set((works || []).map((w) => w.reportDate).filter(Boolean))]
  if (!dates.length) return '--'
  if (dates.length === 1) return dates[0]
  return `${dates[dates.length - 1]} ~ ${dates[0]}`
}

export function formatWorksAreas(works) {
  const areas = [...new Set((works || []).map((w) => w.workArea).filter(Boolean))]
  return areas.length ? areas.join('、') : '--'
}

export function formatWorksContractors(works) {
  const list = [...new Set((works || []).map((w) => w.contractor).filter(Boolean))]
  return list.length ? list.join('、') : '--'
}

function toWorkItem(source) {
  if (!source) return null
  const snap = snapshotFromDailyRecord(source)
  return {
    id: source.id || '',
    ...snap,
  }
}

function buildWorksFromSources(sources) {
  return (sources || []).map(toWorkItem).filter(Boolean)
}

function syncLegacyFields(works) {
  const list = works || []
  const first = list[0] ? { ...list[0] } : emptySnapshot()
  delete first.id
  return {
    daily_work_id: list[0]?.id || '',
    daily_work_ids: list.map((item) => item.id).filter(Boolean),
    works: list.map((item) => ({ ...item })),
    snapshot: { ...emptySnapshot(), ...first },
  }
}

export function formatSupervisorDisplay(row) {
  if (!row) return '--'
  const user = findMatSupervisorApprover(row.supervisor_approver_user_id)
  if (user) return formatMatSupervisorApproverLabel(user)
  return formatMatSupervisorApproverLabel({
    name: row.supervisor_approver_name,
    org: row.supervisor_approver_org,
    post_label: row.supervisor_approver_post_label,
  })
}

function cloneAttach(list) {
  return asAttachList(list).map((item) => ({ ...item }))
}

function emptySnapshot() {
  return {
    reportDate: '',
    leadUnit: '',
    projectName: '',
    contractor: '',
    workArea: '',
    workContent: '',
    dangerWorkCategory: '',
    startTime: '',
    endTime: '',
    ownerProjectManager: '',
    ownerSafetyManager: '',
    contractorProjectManager: '',
    contractorSafetyManager: '',
    supervisorProjectManager: '',
    supervisorSafetyManager: '',
    dangerControlMeasures: '',
  }
}

function snapshotFromDailyRecord(record) {
  const snap = emptySnapshot()
  Object.keys(snap).forEach((key) => {
    snap[key] = record?.[key] || ''
  })
  return snap
}

function snapshotFromDangerListItem(item) {
  const date = item.date || item.reportDate || ''
  const parts = String(item.time || '').split('-')
  const startH = (parts[0] || '').trim()
  const endH = (parts[1] || '').trim()
  const startTime =
    item.startTime || (date && startH ? `${date} ${startH}` : startH)
  const endTime = item.endTime || (date && endH ? `${date} ${endH}` : endH)
  return {
    ...emptySnapshot(),
    reportDate: date,
    leadUnit: item.leadUnit || '深圳机场集团/建设工程指挥部',
    projectName: item.projectName || '',
    contractor: item.contractor || '',
    workArea: item.location || item.workArea || '',
    workContent: item.subType || item.workContent || '',
    dangerWorkCategory: item.type || item.dangerWorkCategory || '',
    startTime,
    endTime,
    ownerProjectManager: item.ownerProjectManager || '',
    ownerSafetyManager: item.ownerSafetyManager || '',
    contractorProjectManager: item.contractorProjectManager || '',
    contractorSafetyManager: item.contractorSafetyManager || '',
    supervisorProjectManager: item.supervisorProjectManager || '',
    supervisorSafetyManager: item.supervisorSafetyManager || '',
    dangerControlMeasures: item.measures || item.dangerControlMeasures || '',
  }
}

/** T2 演示用完整多方人员（多人用中文逗号分隔，对齐每日施工作业口径） */
const T2_CONTACTS = {
  leadUnit: '深圳机场集团/建设工程指挥部',
  ownerProjectManager: '陈建华/13800138001',
  ownerSafetyManager: '刘安/13900139001，赵敏/13900139002，孙伟/13900139003',
  contractorProjectManager: '王强/13700137001',
  contractorSafetyManager: '李明/13600136001，周杰/13600136002，吴磊/13600136003，郑浩/13600136004',
  supervisorProjectManager: '李总监/13500135001',
  supervisorSafetyManager: '王代总/13400134001，赵专监/13400134002，钱专监/13400134003',
}

const P000_EXTRA_SOURCES = [
  {
    id: 'ew-src-001',
    projectId: 'p-000',
    date: '2026-09-12',
    time: '08:00-17:00',
    type: '动火作业',
    subType: '钢结构焊接',
    location: 'T2 主楼西侧钢结构区',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '动火作业票、灭火器与防火毯到位，专人监护，作业后熄灭残火。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-002',
    projectId: 'p-000',
    date: '2026-09-13',
    time: '08:30-16:30',
    type: '高处作业',
    subType: '幕墙龙骨安装',
    location: 'T2 主楼北立面 18～22 层',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '安全带高挂低用，临边防护完整，作业前检查脚手架验收记录。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-003',
    projectId: 'p-000',
    date: '2026-09-14',
    time: '09:00-15:00',
    type: '吊装作业',
    subType: '空调机组吊装',
    location: 'T2 屋面设备层',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '十不吊，专人指挥，警戒区封闭，风力大于六级停止吊装。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-004',
    projectId: 'p-000',
    date: '2026-09-15',
    time: '08:00-12:00',
    type: '有限空间作业',
    subType: '管廊内阀门检修',
    location: 'T2 综合管廊 B 段',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '先通风再检测，专人监护，应急救援器材放置洞口。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-005',
    projectId: 'p-000',
    date: '2026-09-16',
    time: '14:00-18:00',
    type: '临时用电作业',
    subType: '二级配电箱接入',
    location: 'T2 东指廊施工区',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '三级配电两级保护，持证电工操作，雨天停止露天接线。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-006',
    projectId: 'p-000',
    date: '2026-09-17',
    time: '22:00-06:00',
    type: '夜间作业',
    subType: '混凝土浇筑',
    location: 'T2 主楼核心筒',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '照明无盲区，交通疏导，噪声控制，专人旁站。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-007',
    projectId: 'p-000',
    date: '2026-09-11',
    time: '08:00-11:30',
    type: '动土作业',
    subType: '管线探挖',
    location: 'T2 站坪西侧土面区',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '探挖确认管线后再机械开挖，设置警戒，完工回填并检查。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-008',
    projectId: 'p-000',
    date: '2026-09-10',
    time: '09:00-17:00',
    type: '高处作业',
    subType: '外架搭设',
    location: 'T2 南指廊',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '架体验收合格后使用，连墙件按方案设置，禁止超载堆载。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-009',
    projectId: 'p-000',
    date: '2026-09-18',
    time: '08:00-16:00',
    type: '动火作业',
    subType: '管道法兰焊接',
    location: 'T2 西指廊机电竖井',
    contractor: '中建安装集团有限公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '办理动火票，配备灭火器与看火人，作业面下方清理易燃物。',
    ...T2_CONTACTS,
    ownerSafetyManager: '刘安/13900139001，赵敏/13900139002，孙伟/13900139003，黄涛/13900139004',
    contractorSafetyManager:
      '李明/13600136001，周杰/13600136002，吴磊/13600136003，郑浩/13600136004，冯凯/13600136005',
  },
  {
    id: 'ew-src-010',
    projectId: 'p-000',
    date: '2026-09-18',
    time: '09:00-17:30',
    type: '吊装作业',
    subType: '钢梁分段吊装',
    location: 'T2 主楼屋盖钢结构区',
    contractor: '中建钢构广东有限公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '吊装前试吊，设警戒区，信号工专人指挥，大风停吊。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-011',
    projectId: 'p-000',
    date: '2026-09-19',
    time: '07:30-11:30',
    type: '动土作业',
    subType: '雨水管沟开挖',
    location: 'T2 站坪东侧管廊预留带',
    contractor: '中建三局第一建设工程有限责任公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '先物探后开挖，边坡按方案放坡，排水与临边防护齐全。',
    ...T2_CONTACTS,
  },
  {
    id: 'ew-src-012',
    projectId: 'p-000',
    date: '2026-09-19',
    time: '13:00-18:00',
    type: '有限空间作业',
    subType: '集水井清淤',
    location: 'T2 地下室泵房集水井',
    contractor: '深圳市市政工程总公司',
    projectName: '宝安国际机场T2航站区及配套工程',
    measures: '连续通风监测，出入登记，救援绳与三脚架待命。',
    ...T2_CONTACTS,
  },
]

function nameMatchesProject(projectName, projectId) {
  if (!projectId || !projectName) return false
  const name = String(projectName)
  const label = getProjectLabel(projectId) || ''
  const shortName = findProjectById(projectId)?.shortName || ''
  const fullName = findProjectById(projectId)?.projectName || ''
  const tokens = [label, shortName, fullName].filter(Boolean)
  if (tokens.some((t) => name.includes(t) || t.includes(name.slice(0, 6)))) return true
  if ((projectId === 'p-003' || projectId === 'p-015' || projectId === 'p-009') && name.includes('三跑道')) {
    return true
  }
  if (projectId === 'p-000' && (name.includes('T2') || name.includes('航站区'))) return true
  return false
}

function sourceFromDaily(record) {
  const item = toDangerWorkListItem(record)
  if (!item) return null
  return {
    id: record.id,
    projectId: item.projectId,
    ...snapshotFromDailyRecord(record),
  }
}

function sourceFromListItem(item) {
  return {
    id: item.id,
    projectId: item.projectId,
    ...snapshotFromDangerListItem(item),
  }
}

function occupiedDailyWorkIds(exceptBizNo = '') {
  const set = new Set()
  for (const row of store.list) {
    if (exceptBizNo && row.biz_no === exceptBizNo) continue
    if (row.status === 'reviewing' || row.status === 'approved') {
      for (const id of getEngineeringWorkIds(row)) set.add(id)
    }
  }
  return set
}

function listAllDangerWorkSources(projectId) {
  if (!projectId) return []
  ensureDailyWorkSeed()
  const map = new Map()

  for (const record of getDailyWorkRecords()) {
    if (!isDangerWorkRecord(record)) continue
    const src = sourceFromDaily(record)
    if (!src) continue
    const match = src.projectId === projectId || nameMatchesProject(src.projectName, projectId)
    if (!match) continue
    map.set(src.id, src)
  }

  for (const item of getDerivedDangerWorkList(projectId)) {
    if (!map.has(item.id)) map.set(item.id, sourceFromListItem(item))
  }

  if (projectId === 'p-000') {
    const hasProjectDaily = [...map.values()].some(
      (src) => src.projectId === projectId || nameMatchesProject(src.projectName, projectId),
    )
    if (!hasProjectDaily) {
      for (const extra of P000_EXTRA_SOURCES) {
        if (!map.has(extra.id)) map.set(extra.id, sourceFromListItem(extra))
      }
    }
  }

  return [...map.values()].sort((a, b) => String(b.reportDate).localeCompare(String(a.reportDate)))
}

export function listSelectableDangerWorks(projectId, { allowDailyWorkIds = [] } = {}) {
  const occupied = occupiedDailyWorkIds()
  const allow = new Set(
    (Array.isArray(allowDailyWorkIds) ? allowDailyWorkIds : [allowDailyWorkIds])
      .map(String)
      .filter(Boolean),
  )
  return listAllDangerWorkSources(projectId).filter((src) => {
    if (allow.has(src.id)) return true
    return !occupied.has(src.id)
  })
}

export function getDangerWorkSource(id, projectId) {
  if (!id) return null
  return listAllDangerWorkSources(projectId).find((item) => item.id === id) || null
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
    supervisor_approver_post: user.post,
    supervisor_approver_post_label: user.post_label,
  }
}

function demoFile(name) {
  return [{ name, url: '', size: 1_200_000, kind: 'file' }]
}

const store = reactive({
  seq: 6,
  approvalSeq: 12,
  list: [],
})

function makeRow(partial) {
  const works = Array.isArray(partial.works) && partial.works.length
    ? partial.works.map((item) => ({ ...emptySnapshot(), ...item }))
    : partial.daily_work_id || partial.snapshot
      ? [
          {
            id: partial.daily_work_id || '',
            ...emptySnapshot(),
            ...(partial.snapshot || {}),
          },
        ]
      : []
  const legacy = syncLegacyFields(works)
  return {
    id: partial.id,
    biz_no: partial.biz_no,
    project_id: partial.project_id,
    daily_work_id: legacy.daily_work_id,
    daily_work_ids: legacy.daily_work_ids,
    works: legacy.works,
    snapshot: legacy.snapshot,
    personnel_qual_desc: partial.personnel_qual_desc || '',
    scheme_files: cloneAttach(partial.scheme_files),
    briefing_files: cloneAttach(partial.briefing_files),
    cert_files: cloneAttach(partial.cert_files),
    remark: partial.remark || '',
    status: partial.status,
    current_node_key: partial.current_node_key,
    applicant_name: partial.applicant_name || '施工-王工',
    supervisor_approver_user_id: partial.supervisor_approver_user_id || 'u-jl-01',
    supervisor_approver_name: partial.supervisor_approver_name || '李总监',
    supervisor_approver_org: partial.supervisor_approver_org || '深圳某监理有限公司',
    supervisor_approver_post: partial.supervisor_approver_post || 'jl_chief',
    supervisor_approver_post_label: partial.supervisor_approver_post_label || '总监理工程师',
    submit_time: partial.submit_time,
    finish_time: partial.finish_time || '',
    copy_from_biz_no: partial.copy_from_biz_no || '',
    approvals: (partial.approvals || []).map((item) => ({ ...item })),
  }
}

store.list = [
  makeRow({
    id: 'EW-001',
    biz_no: 'EW-202609-001',
    project_id: 'p-000',
    daily_work_id: 'seed-demo-003',
    snapshot: snapshotFromDangerListItem(P000_EXTRA_SOURCES[0]),
    personnel_qual_desc: '焊工张强（特种作业证 TS2025-1188，有效期至 2027-03），监护人李明持证上岗。',
    scheme_files: demoFile('动火作业专项施工方案.pdf'),
    briefing_files: demoFile('动火安全技术交底.pdf'),
    cert_files: demoFile('焊工特种作业证-张强.pdf'),
    status: 'approved',
    current_node_key: 'none',
    submit_time: '2026-09-11 15:20:00',
    finish_time: '2026-09-11 17:05:00',
    approvals: [
      {
        approval_id: 'AR-EW-001',
        node: 'applicant',
        action: 'submit',
        operator_name: '施工-王工',
        time: '2026-09-11 15:20:00',
        opinion: '提交工程作业申报',
      },
      {
        approval_id: 'AR-EW-002',
        node: 'supervisor',
        action: 'agree',
        operator_name: '李总监',
        time: '2026-09-11 17:05:00',
        opinion: '方案与交底齐全，同意作业。',
      },
    ],
  }),
  makeRow({
    id: 'EW-002',
    biz_no: 'EW-202609-002',
    project_id: 'p-000',
    daily_work_id: 'seed-demo-004',
    snapshot: snapshotFromDangerListItem(P000_EXTRA_SOURCES[1]),
    personnel_qual_desc: '高处作业人员赵磊、周宁持高处作业证；监护人孙监理现场旁站。',
    scheme_files: demoFile('幕墙高处作业专项方案.pdf'),
    briefing_files: [],
    cert_files: demoFile('高处作业证-赵磊.pdf'),
    status: 'reviewing',
    current_node_key: 'supervisor',
    submit_time: '2026-09-12 16:10:00',
    approvals: [
      {
        approval_id: 'AR-EW-003',
        node: 'applicant',
        action: 'submit',
        operator_name: '施工-王工',
        time: '2026-09-12 16:10:00',
        opinion: '提交工程作业申报',
      },
    ],
  }),
  makeRow({
    id: 'EW-003',
    biz_no: 'EW-202609-003',
    project_id: 'p-000',
    daily_work_id: 'seed-demo-005',
    snapshot: snapshotFromDangerListItem(P000_EXTRA_SOURCES[2]),
    personnel_qual_desc: '司索工钱进、指挥陈波持证；吊车司机刘海持建筑起重机械司机证。',
    scheme_files: demoFile('屋面机组吊装专项方案.pdf'),
    briefing_files: demoFile('吊装安全技术交底.pdf'),
    cert_files: demoFile('起重机械司机证-刘海.pdf'),
    remark: '需核验夜间照明方案。',
    status: 'rejected',
    current_node_key: 'none',
    submit_time: '2026-09-13 15:40:00',
    finish_time: '2026-09-13 18:20:00',
    approvals: [
      {
        approval_id: 'AR-EW-004',
        node: 'applicant',
        action: 'submit',
        operator_name: '施工-王工',
        time: '2026-09-13 15:40:00',
        opinion: '提交工程作业申报',
      },
      {
        approval_id: 'AR-EW-005',
        node: 'supervisor',
        action: 'reject',
        operator_name: '李总监',
        time: '2026-09-13 18:20:00',
        opinion: '警戒范围示意图缺失，请补充后重新申报。',
      },
    ],
  }),
  makeRow({
    id: 'EW-004',
    biz_no: 'EW-202609-004',
    project_id: 'p-000',
    daily_work_id: 'seed-demo-006',
    snapshot: snapshotFromDangerListItem(P000_EXTRA_SOURCES[3]),
    personnel_qual_desc: '有限空间作业人员吴昊持证，气体检测由安全员王芳执行。',
    scheme_files: demoFile('管廊有限空间作业方案.pdf'),
    briefing_files: demoFile('有限空间交底记录.pdf'),
    cert_files: demoFile('有限空间作业证-吴昊.pdf'),
    status: 'approved',
    current_node_key: 'none',
    submit_time: '2026-09-14 11:05:00',
    finish_time: '2026-09-14 15:30:00',
    approvals: [
      {
        approval_id: 'AR-EW-006',
        node: 'applicant',
        action: 'submit',
        operator_name: '施工-王工',
        time: '2026-09-14 11:05:00',
        opinion: '提交工程作业申报',
      },
      {
        approval_id: 'AR-EW-007',
        node: 'supervisor',
        action: 'agree',
        operator_name: '王代总',
        time: '2026-09-14 15:30:00',
        opinion: '检测记录齐全，同意。',
      },
    ],
    supervisor_approver_user_id: 'u-jl-02',
    supervisor_approver_name: '王代总',
    supervisor_approver_post: 'jl_deputy',
    supervisor_approver_post_label: '总监理工程师代表',
  }),
  makeRow({
    id: 'EW-005',
    biz_no: 'EW-202609-005',
    project_id: 'p-000',
    daily_work_id: 'seed-demo-007',
    snapshot: snapshotFromDangerListItem(P000_EXTRA_SOURCES[4]),
    personnel_qual_desc: '电工郑凯持低压电工证，监护人现场旁站。',
    scheme_files: demoFile('临时用电专项方案.pdf'),
    briefing_files: [],
    cert_files: demoFile('电工证-郑凯.pdf'),
    status: 'reviewing',
    current_node_key: 'supervisor',
    submit_time: '2026-09-16 10:22:00',
    approvals: [
      {
        approval_id: 'AR-EW-008',
        node: 'applicant',
        action: 'submit',
        operator_name: '施工-王工',
        time: '2026-09-16 10:22:00',
        opinion: '提交工程作业申报',
      },
    ],
  }),
  makeRow({
    id: 'EW-006',
    biz_no: 'EW-202609-006',
    project_id: 'p-000',
    works: [
      { id: 'seed-demo-008', ...snapshotFromDangerListItem(P000_EXTRA_SOURCES[5]) },
      { id: 'seed-demo-001', ...snapshotFromDangerListItem(P000_EXTRA_SOURCES[7]) },
    ],
    personnel_qual_desc: '夜间浇筑班组 12 人，带班队长黄磊，照明电工持证；外架班组持证齐全。',
    scheme_files: demoFile('夜间混凝土浇筑作业方案.pdf'),
    briefing_files: demoFile('夜间作业交底.pdf'),
    cert_files: demoFile('班组人员资质汇总.pdf'),
    status: 'approved',
    current_node_key: 'none',
    submit_time: '2026-09-16 15:50:00',
    finish_time: '2026-09-16 17:40:00',
    approvals: [
      {
        approval_id: 'AR-EW-009',
        node: 'applicant',
        action: 'submit',
        operator_name: '施工-王工',
        time: '2026-09-16 15:50:00',
        opinion: '提交工程作业申报',
      },
      {
        approval_id: 'AR-EW-010',
        node: 'supervisor',
        action: 'agree',
        operator_name: '李总监',
        time: '2026-09-16 17:40:00',
        opinion: '照明与交通疏导方案可行。',
      },
    ],
  }),
]

function nextBizNo() {
  store.seq += 1
  return `EW-202609-${String(store.seq).padStart(3, '0')}`
}

function cloneRow(row) {
  return makeRow(row)
}

export function listEngineeringWorks(projectId, { keyword = '', status = '' } = {}) {
  const kw = String(keyword || '').trim().toLowerCase()
  return store.list
    .filter((row) => row.project_id === projectId)
    .filter((row) => !status || row.status === status)
    .filter((row) => {
      if (!kw) return true
      const works = getEngineeringWorkItems(row)
      const blob = [
        row.biz_no,
        row.personnel_qual_desc,
        ...works.flatMap((snap) => [
          snap.dangerWorkCategory,
          snap.workArea,
          snap.contractor,
          snap.workContent,
          snap.reportDate,
        ]),
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(kw)
    })
    .map(cloneRow)
    .sort((a, b) => String(b.submit_time).localeCompare(String(a.submit_time)))
}

export function getEngineeringWork(id) {
  const key = String(id || '')
  const row = store.list.find((item) => item.id === key || item.biz_no === key)
  return row ? cloneRow(row) : null
}

function validatePayload(payload) {
  const ids = (Array.isArray(payload.daily_work_ids) ? payload.daily_work_ids : [])
    .map((id) => String(id || '').trim())
    .filter(Boolean)
  const fallbackId = String(payload.daily_work_id || '').trim()
  const daily_work_ids = ids.length ? [...new Set(ids)] : fallbackId ? [fallbackId] : []
  if (!daily_work_ids.length) return { ok: false, msg: '请选择每日施工作业中的危险作业' }
  const sources = []
  for (const id of daily_work_ids) {
    const source = getDangerWorkSource(id, payload.project_id)
    if (!source) return { ok: false, msg: '所选危险作业不可申报' }
    sources.push(source)
  }
  const desc = String(payload.personnel_qual_desc || '').trim()
  if (!desc) return { ok: false, msg: '请填写作业人员及特种作业资质说明' }
  if (!attachRequiredOk(payload.scheme_files, 1)) return { ok: false, msg: '请上传专项施工方案' }
  if (!attachRequiredOk(payload.cert_files, 1)) return { ok: false, msg: '请上传人员资质证明' }
  const sup = resolveSupervisor(payload)
  if (!sup.ok) return sup
  return { ok: true, daily_work_ids, sources, works: buildWorksFromSources(sources), desc, sup }
}

function isOccupied(dailyWorkId, exceptBizNo = '') {
  return occupiedDailyWorkIds(exceptBizNo).has(dailyWorkId)
}

function pushTodo(row) {
  const works = getEngineeringWorkItems(row)
  const label = summarizeWorksLabel(works)
  createEngineeringWorkSupervisorTodo({
    applicationId: row.id,
    bizNo: row.biz_no,
    projectId: row.project_id,
    projectLabel: getProjectLabel(row.project_id) || row.project_id,
    category: label,
    workArea: '',
    applicantName: row.applicant_name,
    applyTime: row.submit_time,
    supervisorName: row.supervisor_approver_name || '',
    copyFromBizNo: row.copy_from_biz_no || '',
  })
  upsertEngineeringWorkStarted(row)
}

export function submitEngineeringWork(payload) {
  const project_id = String(payload.project_id || '').trim()
  if (!project_id) return { ok: false, msg: '请先切换到具体项目' }
  const checked = validatePayload({ ...payload, project_id })
  if (!checked.ok) return checked
  for (const id of checked.daily_work_ids) {
    if (isOccupied(id)) {
      return { ok: false, msg: '所选危险作业中含已申报项，请重新选择' }
    }
  }
  const time = nowStr()
  const biz_no = nextBizNo()
  const legacy = syncLegacyFields(checked.works)
  const row = makeRow({
    id: `EW-${String(store.seq).padStart(3, '0')}`,
    biz_no,
    project_id,
    ...legacy,
    personnel_qual_desc: checked.desc,
    scheme_files: payload.scheme_files,
    briefing_files: payload.briefing_files,
    cert_files: payload.cert_files,
    remark: String(payload.remark || '').trim(),
    status: 'reviewing',
    current_node_key: 'supervisor',
    applicant_name: payload.applicant_name || '施工-王工',
    supervisor_approver_user_id: checked.sup.supervisor_approver_user_id,
    supervisor_approver_name: checked.sup.supervisor_approver_name,
    supervisor_approver_org: checked.sup.supervisor_approver_org,
    supervisor_approver_post: checked.sup.supervisor_approver_post,
    supervisor_approver_post_label: checked.sup.supervisor_approver_post_label,
    submit_time: time,
    copy_from_biz_no: payload.copy_from_biz_no || '',
    approvals: [
      {
        approval_id: `AR-EW-${++store.approvalSeq}`,
        node: 'applicant',
        action: 'submit',
        operator_name: payload.applicant_name || '施工-王工',
        time,
        opinion: '提交工程作业申报',
      },
    ],
  })
  store.list.unshift(row)
  pushTodo(row)
  return { ok: true, data: cloneRow(row) }
}

export function buildCopyPayloadFromRejected(id) {
  const row = getEngineeringWork(id)
  if (!row || row.status !== 'rejected') return null
  const works = getEngineeringWorkItems(row)
  return {
    daily_work_id: works[0]?.id || row.daily_work_id,
    daily_work_ids: works.map((item) => item.id).filter(Boolean),
    works: works.map((item) => ({ ...item })),
    snapshot: { ...(row.snapshot || {}) },
    personnel_qual_desc: row.personnel_qual_desc,
    scheme_files: cloneAttach(row.scheme_files),
    briefing_files: cloneAttach(row.briefing_files),
    cert_files: cloneAttach(row.cert_files),
    remark: row.remark,
    supervisor_approver_user_id: row.supervisor_approver_user_id,
    supervisor_approver_name: row.supervisor_approver_name,
    copy_from_biz_no: row.biz_no,
  }
}

export function copyEngineeringWorkFromRejected(sourceId, payload) {
  const source = getEngineeringWork(sourceId)
  if (!source || source.status !== 'rejected') {
    return { ok: false, msg: '只能从已驳回申报单重新申报' }
  }
  const works = getEngineeringWorkItems(source)
  return submitEngineeringWork({
    ...payload,
    daily_work_ids: payload.daily_work_ids?.length
      ? payload.daily_work_ids
      : works.map((item) => item.id).filter(Boolean),
    daily_work_id: payload.daily_work_id || works[0]?.id || source.daily_work_id,
    copy_from_biz_no: source.biz_no,
  })
}

export function supervisorApproveEngineeringWork(id, { action, opinion, operatorName } = {}) {
  const row = store.list.find((item) => item.id === id || item.biz_no === id)
  if (!row) return { ok: false, msg: '单据不存在' }
  if (row.status !== 'reviewing') return { ok: false, msg: '当前不可审批' }
  if (action !== 'agree' && action !== 'reject') return { ok: false, msg: '无效操作' }
  if (action === 'reject' && !String(opinion || '').trim()) {
    return { ok: false, msg: '驳回意见必填' }
  }
  const time = nowStr()
  row.approvals.push({
    approval_id: `AR-EW-${++store.approvalSeq}`,
    node: 'supervisor',
    action,
    operator_name: operatorName || '当前用户',
    time,
    opinion: String(opinion || '').trim(),
  })
  if (action === 'agree') {
    row.status = 'approved'
    row.current_node_key = 'none'
    row.finish_time = time
  } else {
    row.status = 'rejected'
    row.current_node_key = 'none'
    row.finish_time = time
  }
  upsertEngineeringWorkStarted(row)
  return { ok: true, data: cloneRow(row) }
}

function syncPendingTodos() {
  store.list.filter((row) => row.status === 'reviewing').forEach((row) => pushTodo(row))
}

syncPendingTodos()
seedEngineeringWorkStartedFromList(store.list)
seedEngineeringWorkDoneFromList(store.list)

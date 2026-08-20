import {
  REALNAME_ENTRY_STATUS,
  REALNAME_ENTRY_STATUS_OPTIONS,
  ONSITE_STATUS,
  ONSITE_STATUS_OPTIONS,
  getRealNameOnSiteStatus,
  realNameEntryStatusTagClass,
  onSiteStatusTagClass,
} from '../constants/laborPersonStatus.js'
import { appendOperationLog } from './systemLogs.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { maskIdCard, maskPhone } from '../utils/mask.js'

export { maskIdCard, maskPhone }

export {
  REALNAME_ENTRY_STATUS_OPTIONS as entryStatusOptions,
  REALNAME_ENTRY_STATUS_OPTIONS as statusOptions,
  ONSITE_STATUS_OPTIONS as onSiteStatusOptions,
  realNameEntryStatusTagClass as entryStatusTagClass,
  onSiteStatusTagClass,
  realNameEntryStatusTagClass as statusTagClass,
}

export const workTypeOptions = [
  '钢筋工',
  '木工',
  '混凝土工',
  '特种-架子工',
  '特种-电工',
  '特种-焊工',
  '特种-起重工',
  '普工',
  '安全员',
  '测量员',
]
export const genderOptions = ['男', '女']
export const personnelCategoryOptions = ['管理人员', '建筑工人']

/** 是否特种作业：工种/职务以「特种-」开头 */
export function isSpecialByWorkType(work_type) {
  return String(work_type || '').trim().startsWith('特种-')
}

/** 特种作业人员的工种/职务统一带「特种-」前缀 */
export function ensureSpecialWorkTypePrefix(work_type, is_special) {
  const wt = String(work_type || '').trim()
  if (!is_special || !wt) return wt
  return wt.startsWith('特种-') ? wt : `特种-${wt}`
}

/** 兼容旧 mock/导入值 → 工人类型两值 */
export function normalizePersonnelCategory(category) {
  const c = String(category || '').trim()
  if (c === '管理人员') return '管理人员'
  if (c === '建筑工人' || c === '劳务人员' || c === '特种作业人员') return '建筑工人'
  return personnelCategoryOptions.includes(c) ? c : '建筑工人'
}
export const unitTypeOptions = ['建设单位', '勘察单位', '设计单位', '监理单位', '总包单位', '劳务分包', '单位分包']
export const educationTypeOptions = ['三级教育', '岗前培训']
export const idTypeOptions = ['居民身份证', '护照', '港澳居民来往内地通行证', '台湾居民来往大陆通行证']

const projectNodes = [
  { id: 'p-000', label: 'T2航站区及配套工程' },
  { id: 'p-001', label: 'T1航站区配套工程' },
  { id: 'p-003', label: '三跑道扩建工程' },
  { id: 'p-004', label: '综合配套区市政工程' },
  { id: 'p-005', label: '捷运线延长段工程' },
]

const unitTypeByKey = {
  中建三局: '总包单位',
  深圳市政: '劳务分包',
  广东建工: '单位分包',
  中铁建工: '劳务分包',
}

const unitProfiles = {
  中建三局: { fullName: '中建三局第一建设工程有限责任公司', credit_code: '91420000123456789X' },
  深圳市政: { fullName: '深圳市政集团有限公司', credit_code: '91440300123456789A' },
  广东建工: { fullName: '广东省建筑工程集团有限公司', credit_code: '91440000123456789B' },
  中铁建工: { fullName: '中铁建工集团有限公司', credit_code: '91110000123456789C' },
}

const personnelTemplates = [
  { name: '张强', gender: '男', work_type: '钢筋工', team: '钢筋一班', unitKey: '中建三局', category: '建筑工人', special: false, is_team_leader: true },
  { name: '李华', gender: '男', work_type: '木工', team: '木工二班', unitKey: '中建三局', category: '建筑工人', special: false, is_team_leader: false },
  { name: '王芳', gender: '女', work_type: '普工', team: '综合班组', unitKey: '深圳市政', category: '建筑工人', special: false, is_team_leader: false },
  { name: '赵磊', gender: '男', work_type: '特种-电工', team: '机电班组', unitKey: '中建三局', category: '建筑工人', special: true, cert_no: 'T4403002023001234', is_team_leader: false },
  { name: '刘洋', gender: '男', work_type: '特种-焊工', team: '钢结构班', unitKey: '广东建工', category: '建筑工人', special: true, cert_no: 'T4403002023005678', is_team_leader: false },
  { name: '陈静', gender: '女', work_type: '安全员', team: '安全管理组', unitKey: '中建三局', category: '管理人员', special: false, is_team_leader: false },
  { name: '周杰', gender: '男', work_type: '特种-架子工', team: '脚手架班', unitKey: '中铁建工', category: '建筑工人', special: true, cert_no: 'T4403002023009012', is_team_leader: false },
  { name: '吴敏', gender: '女', work_type: '测量员', team: '测量组', unitKey: '深圳市政', category: '管理人员', special: false, is_team_leader: false },
  { name: '郑伟', gender: '男', work_type: '混凝土工', team: '混凝土班', unitKey: '中建三局', category: '建筑工人', special: false, is_team_leader: false },
  { name: '孙涛', gender: '男', work_type: '特种-起重工', team: '塔吊班', unitKey: '广东建工', category: '建筑工人', special: true, cert_no: 'T4403002023003456', is_team_leader: true },
  { name: '马超', gender: '男', work_type: '普工', team: '杂工班', unitKey: '中铁建工', category: '建筑工人', special: false, is_team_leader: false, entry_status: REALNAME_ENTRY_STATUS.EXITED },
  { name: '黄丽', gender: '女', work_type: '钢筋工', team: '钢筋二班', unitKey: '深圳市政', category: '建筑工人', special: false, is_team_leader: false },
]

const nativePlaces = ['湖北省武汉市', '湖南省长沙市', '广东省深圳市', '四川省成都市', '河南省郑州市', '江西省南昌市']
const educations = ['小学', '初中', '高中', '中专', '大专', '本科']
const politicalStatuses = ['群众', '共青团员', '中共党员']
export const educationLevelOptions = ['小学', '初中', '高中', '中专', '大专', '本科', '硕士', '博士']
export const politicalStatusOptions = ['群众', '共青团员', '中共党员', '民主党派']
export const healthStatusOptions = ['健康', '一般', '需关注']

export const unitNameOptions = Object.values(unitProfiles).map((item) => item.fullName)

export function getProjectOptions() {
  return projectNodes.map((item) => ({ id: item.id, label: item.label }))
}

function buildTodayPunch(seq, entry_status) {
  if (entry_status === REALNAME_ENTRY_STATUS.EXITED) {
    return { clock_in: '', clock_out: '' }
  }
  const pattern = seq % 5
  if (pattern <= 2) {
    const time = `07:${String(30 + (seq % 25)).padStart(2, '0')}:00`
    return { clock_in: time, clock_out: '' }
  }
  if (pattern === 3) {
    const clock_in = '07:45:00'
    const clock_out = `17:${String(20 + (seq % 30)).padStart(2, '0')}:00`
    return { clock_in, clock_out }
  }
  return { clock_in: '', clock_out: '' }
}

function buildSafetyEducation(seq, entry_status) {
  if (entry_status === REALNAME_ENTRY_STATUS.EXITED && seq % 3 === 0) {
    return [
      {
        education_type: '三级教育',
        train_date: '2024-08-12',
        duration: '8小时',
        qualified: true,
        certificate: '三级教育合格证.pdf',
      },
    ]
  }
  return [
    {
      education_type: '三级教育',
      train_date: `2025-${String((seq % 6) + 1).padStart(2, '0')}-06`,
      duration: '8小时',
      qualified: true,
      certificate: '三级教育合格证.pdf',
    },
    {
      education_type: '岗前培训',
      train_date: `2025-${String((seq % 6) + 1).padStart(2, '0')}-07`,
      duration: '4小时',
      qualified: seq % 7 !== 0,
      certificate: seq % 7 !== 0 ? '岗前培训证书.pdf' : '',
    },
  ]
}

function buildPersonnel(project_id, index, tpl, offset = 0) {
  const seq = index + offset + 1
  const idBase = 440300199001010000 + seq * 137
  const id_number_raw = String(idBase).padStart(18, '0')
  const entry_status = tpl.entry_status || REALNAME_ENTRY_STATUS.ENTERED
  const punch = buildTodayPunch(seq, entry_status)
  const on_site_status = getRealNameOnSiteStatus(entry_status, punch.clock_in, punch.clock_out)
  const unitProfile = unitProfiles[tpl.unitKey] || { fullName: tpl.unitKey, credit_code: '91440000000000000X' }
  const personnel_no = `RN-${project_id.toUpperCase()}-${String(seq).padStart(4, '0')}`

  // 监管采集口径：①基本身份（只读）②特种作业证书（只读）③三级安全教育（可编辑）；日常考勤不在人员详情展示
  const basic = {
    personnel_no,
    photo: '',
    name: tpl.name,
    phone: `138${String(10000000 + seq * 12345).slice(0, 8)}`,
    gender: tpl.gender,
    age: 25 + (seq % 20),
    id_type: '居民身份证',
    id_number: maskIdCard(id_number_raw),
    id_number_raw,
    id_valid_from: '2015-01-01',
    id_valid_to: '2035-01-01',
    native_place: nativePlaces[seq % nativePlaces.length],
    address: `广东省深圳市宝安区航城街道机场扩建项目生活区${seq}栋`,
    education: educations[seq % educations.length],
    political_status: politicalStatuses[seq % politicalStatuses.length],
    health_status: seq % 9 === 0 ? '一般' : '健康',
    medical_history: seq % 9 === 0 ? '高血压（可控）' : '无',
  }

  const work_type = ensureSpecialWorkTypePrefix(tpl.work_type, tpl.special || isSpecialByWorkType(tpl.work_type))
  const is_special = isSpecialByWorkType(work_type)
  const unit = {
    unit_name: unitProfile.fullName,
    credit_code: unitProfile.credit_code,
    unit_type: unitTypeByKey[tpl.unitKey] || '劳务分包',
    personnel_category: normalizePersonnelCategory(tpl.category),
    work_type,
    team: tpl.team,
    is_team_leader: tpl.is_team_leader,
    special_cert_attachment: is_special ? `${work_type}操作证.pdf` : '',
    cert_valid_to: is_special ? '2027-06-30' : '',
  }

  const safety_education = buildSafetyEducation(seq, entry_status)

  return {
    id: `${project_id}-${seq}`,
    project_id,
    entry_status,
    on_site_status,
    clock_in: punch.clock_in,
    clock_out: punch.clock_out,
    is_special,
    cert_no: tpl.cert_no || '',
    basic,
    unit,
    safety_education,
  }
}

function buildProjectPersonnel(project_id, count) {
  const list = []
  for (let i = 0; i < count; i++) {
    const tpl = personnelTemplates[i % personnelTemplates.length]
    list.push(buildPersonnel(project_id, i, tpl))
  }
  return list
}

export const personnelByProject = {
  'p-000': buildProjectPersonnel('p-000', 12),
  'p-001': buildProjectPersonnel('p-001', 8),
  'p-003': buildProjectPersonnel('p-003', 10),
  'p-004': buildProjectPersonnel('p-004', 6),
  'p-005': buildProjectPersonnel('p-005', 5),
}

export const projectTree = [
  {
    id: 'hq',
    label: '工程指挥部',
    children: projectNodes.map((node) => ({
      ...node,
      count: (personnelByProject[node.id] || []).length,
    })),
  },
]

export function getProjectPersonnel(project_id) {
  return personnelByProject[project_id] || []
}

export function getPersonnelDetail(id) {
  for (const list of Object.values(personnelByProject)) {
    const found = list.find((item) => item.id === id)
    if (found) return found
  }
  return null
}

export function getDefaultProjectId() {
  return 'p-000'
}

export function getProjectLabel(project_id) {
  for (const group of projectTree) {
    const node = group.children?.find((item) => item.id === project_id)
    if (node) return node.label
  }
  return ''
}

export function getRealNameStats(project_id) {
  const list = getProjectPersonnel(project_id)
  const enteredList = list.filter((r) => r.entry_status === REALNAME_ENTRY_STATUS.ENTERED)
  return {
    total: list.length,
    entered: enteredList.length,
    exited: list.filter((r) => r.entry_status === REALNAME_ENTRY_STATUS.EXITED).length,
    manage: enteredList.filter((r) => r.unit?.personnel_category === '管理人员').length,
    on_site_count: enteredList.filter((r) => r.on_site_status === ONSITE_STATUS.ON_SITE).length,
    special: enteredList.filter((r) => r.is_special).length,
  }
}

/** 指挥部 · 按项目实名制人员数量（含三类人员；对齐 COC 全量项目，无明细 mock 的显示 0） */
export function buildHqRealNameStatsByProject() {
  const mockIds = new Set(projectNodes.map((n) => n.id))
  return COC_PROJECT_OPTIONS.map((opt) => {
    if (!mockIds.has(opt.id)) {
      return {
        project_id: opt.id,
        project_name: opt.label,
        total: 0,
        manage: 0,
        labor: 0,
        special: 0,
        demo_empty: true,
      }
    }
    const list = getProjectPersonnel(opt.id)
    const entered = list.filter((r) => r.entry_status === REALNAME_ENTRY_STATUS.ENTERED)
    const manage = entered.filter((r) => r.unit?.personnel_category === '管理人员').length
    const labor = entered.filter((r) => r.unit?.personnel_category === '建筑工人').length
    const special = entered.filter((r) => r.is_special).length
    return {
      project_id: opt.id,
      project_name: opt.label,
      total: entered.length,
      manage,
      labor,
      special,
      demo_empty: false,
    }
  })
}

export function isSafetyEducationComplete(records) {
  return records?.every((item) => item.qualified) ?? false
}

export function createEmptySafetyEducation() {
  return {
    education_type: '三级教育',
    train_date: '',
    duration: '',
    qualified: true,
    certificate: '',
  }
}

export function createEmptyPersonnel(project_id) {
  const seq = (personnelByProject[project_id]?.length || 0) + 1
  const personnel_no = `RN-${project_id.toUpperCase()}-${String(seq).padStart(4, '0')}`
  return {
    id: '',
    project_id,
    entry_status: REALNAME_ENTRY_STATUS.ENTERED,
    on_site_status: ONSITE_STATUS.OFF_SITE,
    clock_in: '',
    clock_out: '',
    is_special: false,
    cert_no: '',
    basic: {
      personnel_no,
      photo: '',
      name: '',
      phone: '',
      gender: '男',
      age: null,
      id_type: '居民身份证',
      id_number: '',
      id_number_raw: '',
      id_valid_from: '',
      id_valid_to: '',
      native_place: '',
      address: '',
      education: '',
      political_status: '群众',
      health_status: '健康',
      medical_history: '无',
    },
    unit: {
      unit_name: '',
      credit_code: '',
      unit_type: '劳务分包',
      personnel_category: '建筑工人',
      work_type: '',
      team: '',
      is_team_leader: false,
      special_cert_attachment: '',
      cert_valid_to: '',
    },
    safety_education: [createEmptySafetyEducation()],
  }
}

export function clonePersonnel(source) {
  const cloned = JSON.parse(JSON.stringify(source))
  if (cloned.basic.id_number_raw) {
    cloned.basic.id_number = cloned.basic.id_number_raw
  }
  return cloned
}

function normalizePersonnel(data) {
  const id_number_raw = data.basic.id_number_raw || data.basic.id_number
  const entry_status = data.entry_status || REALNAME_ENTRY_STATUS.ENTERED
  const personnel_category = normalizePersonnelCategory(data.unit?.personnel_category)
  const workTypeRaw = data.unit?.work_type || ''
  // 先按工种识别；若显式要求特种则补前缀后再识别
  let work_type = workTypeRaw
  let is_special = isSpecialByWorkType(work_type)
  if (!is_special && data.is_special === true) {
    work_type = ensureSpecialWorkTypePrefix(work_type, true)
    is_special = isSpecialByWorkType(work_type)
  } else {
    work_type = ensureSpecialWorkTypePrefix(work_type, is_special)
    is_special = isSpecialByWorkType(work_type)
  }
  const on_site_status = getRealNameOnSiteStatus(entry_status, data.clock_in || '', data.clock_out || '')

  return {
    ...data,
    entry_status,
    is_special,
    on_site_status,
    basic: {
      ...data.basic,
      id_number_raw,
      id_number: maskIdCard(id_number_raw),
      age: data.basic.age ? Number(data.basic.age) : null,
    },
    unit: {
      ...data.unit,
      personnel_category,
      work_type,
    },
  }
}

export function savePersonnel(data, mode) {
  const normalized = normalizePersonnel(data)
  const { project_id } = normalized

  if (!personnelByProject[project_id]) {
    personnelByProject[project_id] = []
  }

  if (mode === 'create') {
    normalized.id = `${project_id}-${Date.now()}`
    personnelByProject[project_id].unshift(normalized)
  } else {
    const list = personnelByProject[project_id]
    const index = list.findIndex((item) => item.id === normalized.id)
    if (index === -1) {
      for (const pid of Object.keys(personnelByProject)) {
        const idx = personnelByProject[pid].findIndex((item) => item.id === normalized.id)
        if (idx !== -1) {
          personnelByProject[pid].splice(idx, 1)
          break
        }
      }
      personnelByProject[project_id].unshift(normalized)
    } else {
      list.splice(index, 1, normalized)
    }
  }

  syncProjectTreeCounts()
  return normalized
}

export function syncProjectTreeCounts() {
  projectTree[0].children.forEach((node) => {
    node.count = (personnelByProject[node.id] || []).length
  })
}

export function lookupCreditCode(unit_name) {
  const found = Object.values(unitProfiles).find((item) => item.fullName === unit_name)
  return found?.credit_code || ''
}

export function lookupUnitType(unit_name) {
  const entry = Object.entries(unitProfiles).find(([, item]) => item.fullName === unit_name)
  if (!entry) return '劳务分包'
  return unitTypeByKey[entry[0]] || '劳务分包'
}

/** 查看手机号并写入操作日志 */
export function logPhoneView({ personnel_id, personnel_no, name, scene = '列表' }) {
  appendOperationLog({
    module: '人员实名制管理',
    type: '查询',
    content: `查看人员实名制手机号：${name}（${personnel_no}）· ${scene}`,
    requestUrl: `/api/labor/realname/${personnel_id}/phone/view`,
  })
}

/** 查看证件号码并写入操作日志 */
export function logIdCardView({ personnel_id, personnel_no, name, scene = '列表' }) {
  appendOperationLog({
    module: '人员实名制管理',
    type: '查询',
    content: `查看人员实名制证件号码：${name}（${personnel_no}）· ${scene}`,
    requestUrl: `/api/labor/realname/${personnel_id}/id-number/view`,
  })
}

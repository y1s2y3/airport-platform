/** 分级管控可选岗位 */
export const tierPositionCatalog = [
  { id: 'pos-safety-officer', name: '安全员' },
  { id: 'pos-contractor-pm', name: '施工方项目负责人' },
  { id: 'pos-supervisor-engineer', name: '监理工程师' },
  { id: 'pos-hq-pm', name: '指挥部项目经理' },
  { id: 'pos-chief-supervisor', name: '总监理工程师' },
  { id: 'pos-safety-director', name: '安全部主管' },
  { id: 'pos-commander', name: '指挥长' },
  { id: 'pos-deputy-commander', name: '副指挥长' },
  { id: 'pos-site-manager', name: '现场经理' },
]

/** 分级管控可选人员（可挂多个岗位；选岗位后仅展示该岗位人员） */
export const tierPersonnelCatalog = [
  { id: 'u-so-01', name: '陈安全', dept: '总包项目部', positionIds: ['pos-safety-officer'] },
  { id: 'u-so-02', name: '刘安全', dept: '总包项目部', positionIds: ['pos-safety-officer'] },
  { id: 'u-cpm-01', name: '何负责人', dept: '施工方项目部', positionIds: ['pos-contractor-pm', 'pos-site-manager'] },
  { id: 'u-cpm-02', name: '李施工', dept: '施工方项目部', positionIds: ['pos-contractor-pm'] },
  { id: 'u-se-01', name: '钱监理', dept: '监理单位', positionIds: ['pos-supervisor-engineer'] },
  { id: 'u-se-02', name: '周监理', dept: '监理单位', positionIds: ['pos-supervisor-engineer', 'pos-chief-supervisor'] },
  { id: 'u-hqpm-01', name: '姚远东', dept: '工程管理部', positionIds: ['pos-hq-pm'] },
  { id: 'u-hqpm-02', name: '王项目', dept: '工程管理部', positionIds: ['pos-hq-pm'] },
  { id: 'u-ts-01', name: '赵监理', dept: '监理单位', positionIds: ['pos-chief-supervisor'] },
  { id: 'u-ts-02', name: '孙监理', dept: '监理单位', positionIds: ['pos-chief-supervisor'] },
  { id: 'u-sd-01', name: '张安全', dept: '安全环保部', positionIds: ['pos-safety-director'] },
  { id: 'u-sd-02', name: '赵主管', dept: '安全环保部', positionIds: ['pos-safety-director'] },
  { id: 'u-cmd-01', name: '指挥长甲', dept: 'COC调度中心', positionIds: ['pos-commander'] },
  { id: 'u-cmd-02', name: '指挥长乙', dept: 'COC调度中心', positionIds: ['pos-commander', 'pos-deputy-commander'] },
  { id: 'u-cmd-03', name: '指挥长丙', dept: 'COC调度中心', positionIds: ['pos-deputy-commander'] },
  { id: 'u-site-01', name: '何现场', dept: '总包项目部', positionIds: ['pos-site-manager'] },
]

/** @deprecated 兼容旧引用：按历史岗位 key 分组 */
export const tierRecipientOptions = {
  chiefSupervisor: tierPersonnelCatalog.filter((u) => u.positionIds.includes('pos-chief-supervisor')),
  projectManager: tierPersonnelCatalog.filter((u) => u.positionIds.includes('pos-hq-pm')),
  safetyDirector: tierPersonnelCatalog.filter((u) => u.positionIds.includes('pos-safety-director')),
  commander: tierPersonnelCatalog.filter((u) => u.positionIds.includes('pos-commander')),
}

/** @deprecated 兼容旧引用 */
export const tierLevelDefinitions = [
  { key: 'chiefSupervisor', label: '总监理', level: 1 },
  { key: 'projectManager', label: '项目经理', level: 2 },
  { key: 'safetyDirector', label: '安全部主管人员', level: 3 },
  { key: 'commander', label: '指挥长', level: 4 },
]

/** @deprecated */
export const tierRecipientLabels = Object.fromEntries(
  tierLevelDefinitions.map((item) => [item.key, item.label]),
)

const LEGACY_TIER_KEY_TO_POSITION = {
  chiefSupervisor: 'pos-chief-supervisor',
  projectManager: 'pos-hq-pm',
  safetyDirector: 'pos-safety-director',
  commander: 'pos-commander',
}

export const TIER_LEVEL_MAX = 8

export function getTierPositionName(position_id) {
  return tierPositionCatalog.find((p) => p.id === position_id)?.name || '—'
}

export function getTierPerson(personId) {
  return tierPersonnelCatalog.find((p) => p.id === personId) || null
}

export function getTierPersonLabel(personId) {
  const person = getTierPerson(personId)
  if (!person) return '—'
  return `${person.name} · ${person.dept}`
}

/** 按岗位筛选人员；未选岗位或无匹配时返回空列表 */
export function getTierPersonnelByPosition(position_id) {
  if (!position_id) return []
  return tierPersonnelCatalog.filter((u) => u.positionIds.includes(position_id))
}

export function createEmptyTierLevel(order = 1) {
  return {
    id: `tier-${Date.now()}-${order}`,
    position_id: '',
    recipient_id: '',
    report_days: Math.min(1 + (order - 1) * 2, 30),
  }
}

/** 默认推送：安全员 → 施工方项目负责人 → 监理工程师 → 指挥部项目经理 */
function createDefaultTierLevels() {
  return [
    { id: 'tier-1', position_id: 'pos-safety-officer', recipient_id: 'u-so-01', report_days: 1 },
    { id: 'tier-2', position_id: 'pos-contractor-pm', recipient_id: 'u-cpm-01', report_days: 3 },
    { id: 'tier-3', position_id: 'pos-supervisor-engineer', recipient_id: 'u-se-01', report_days: 5 },
    { id: 'tier-4', position_id: 'pos-hq-pm', recipient_id: 'u-hqpm-01', report_days: 7 },
  ]
}

function normalizeTierLevels(rawLevels) {
  if (Array.isArray(rawLevels)) {
    return rawLevels.map((item, index) => ({
      id: item.id || `tier-${index + 1}`,
      position_id: item.position_id || '',
      recipient_id: item.recipient_id || '',
      report_days: Number(item.report_days) > 0 ? Number(item.report_days) : 1,
    }))
  }
  if (rawLevels && typeof rawLevels === 'object') {
    return tierLevelDefinitions.map((def, index) => {
      const old = rawLevels[def.key] || {}
      return {
        id: `tier-${def.key}`,
        position_id: LEGACY_TIER_KEY_TO_POSITION[def.key] || '',
        recipient_id: old.recipient_id || '',
        report_days: Number(old.report_days) > 0 ? Number(old.report_days) : 1 + index * 2,
      }
    })
  }
  return createDefaultTierLevels()
}

function createDefaultRecipient() {
  return {
    position_id: 'pos-safety-officer',
    recipient_id: 'u-so-01',
  }
}

function normalizeDefaultRecipient(raw) {
  return {
    position_id: raw?.position_id || '',
    recipient_id: raw?.recipient_id || '',
  }
}

function normalizeConfig(data) {
  const cloned = structuredClone(data || defaultConfig)
  cloned.default_recipient = normalizeDefaultRecipient(
    cloned.default_recipient || cloned.tieredControl?.default_recipient,
  )
  cloned.tieredControl = {
    levels: normalizeTierLevels(cloned.tieredControl?.levels),
  }
  if (!cloned.warningRules) cloned.warningRules = structuredClone(defaultConfig.warningRules)
  const managerRule = cloned.warningRules.managerAttendance || { enabled: true }
  if (!managerRule.days || managerRule.days < 1) managerRule.days = 20
  cloned.warningRules.managerAttendance = managerRule
  const elderlyRule = cloned.warningRules.elderlyReminder || { enabled: true }
  if (!elderlyRule.maleAge || elderlyRule.maleAge < 1) elderlyRule.maleAge = 65
  if (!elderlyRule.femaleAge || elderlyRule.femaleAge < 1) elderlyRule.femaleAge = 60
  cloned.warningRules.elderlyReminder = elderlyRule
  return cloned
}

/** 预警规则定义（本期不采集工资，不含工资异常预警） */
export const warningRuleDefinitions = [
  { key: 'noLevel3Education', label: '未进行入场三级教育预警', description: '人员在岗但未完成三级安全教育时触发预警' },
  { key: 'specialCertMissing', label: '特种作业证书缺失/过期预警', description: '特种作业人员证书缺失或已过期时触发预警' },
  {
    key: 'workOver12h',
    labelTemplate: 'hours',
    description: '单次连续作业时长超过设定阈值时触发预警',
    extra: 'hours',
  },
  {
    key: 'ageLimit',
    labelTemplate: 'minAge',
    description:
      '人员登记年龄低于项目配置的实名制年龄下限时触发（系统自动关闭类；次日定时任务在年龄经 ROMA 回写正确或人员退场后自动关闭）',
    extra: 'minAge',
  },
  {
    key: 'elderlyReminder',
    labelTemplate: 'elderlyAge',
    description: '超过设定年龄时在施工方端提示，需做好工人健康情况排查工作，不强制要求退场。',
    extra: 'elderlyAge',
  },
  { key: 'idCardExpired', label: '身份证过期提醒', description: '人员身份证有效期届满前/已过期时发送提醒' },
  {
    key: 'absentDays',
    labelTemplate: 'days',
    description: '在岗人员连续指定天数无考勤记录时触发预警',
    extra: 'days',
  },
  {
    key: 'managerAttendance',
    labelTemplate: 'managerDays',
    description: '管理人员当月出勤天数少于设定阈值时触发预警',
    extra: 'managerDays',
  },
  {
    key: 'blacklistEntry',
    label: '黑名单人员进场预警',
    description:
      '每日定时扫描：在岗且证件号命中全平台劳务黑名单时触发（二期仅预警不做强制拦截；系统自动关闭类，移出黑名单或退场后次日自动关闭）',
  },
]

/** 根据当前配置生成预警规则展示名称 */
export function getWarningRuleLabel(key, config = {}) {
  switch (key) {
    case 'workOver12h':
      return `连续工作超${config.hours ?? 12}小时预警`
    case 'ageLimit':
      return `实名制年龄低于${config.minAge ?? 16}周岁预警`
    case 'elderlyReminder':
      return `高龄提醒（男${config.maleAge ?? 65}岁/女${config.femaleAge ?? 60}岁）`
    case 'absentDays':
      return `连续${config.days ?? 3}天未出勤预警`
    case 'managerAttendance':
      return `管理人员考勤不达标，每月出勤少于${config.days ?? 20}天预警`
    default: {
      const rule = warningRuleDefinitions.find((item) => item.key === key)
      return rule?.label || key
    }
  }
}

const defaultConfig = {
  default_recipient: createDefaultRecipient(),
  tieredControl: {
    levels: createDefaultTierLevels(),
  },
  warningRules: {
    noLevel3Education: { enabled: false },
    specialCertMissing: { enabled: false },
    workOver12h: { enabled: true, hours: 12 },
    ageLimit: { enabled: true, minAge: 16 },
    elderlyReminder: { enabled: true, maleAge: 65, femaleAge: 60 },
    idCardExpired: { enabled: false },
    absentDays: { enabled: false, days: 3 },
    managerAttendance: { enabled: false, days: 20 },
    blacklistEntry: { enabled: true },
  },
}

/** 项目级实名制配置（分级管控 + 预警），不再提供指挥部全局配置 */
const PROJECT_IDS = ['p-000', 'p-001', 'p-003', 'p-004', 'p-005']

let projectConfigStore = Object.fromEntries(
  PROJECT_IDS.map((id) => [id, normalizeConfig(defaultConfig)]),
)

function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 项目级人员轨迹外链（不统一轨迹硬件/数据标准） */
const defaultProjectTrackJump = {
  'p-000': {
    enabled: true,
    system_name: 'T2 现场人员定位系统',
    url: 'https://example.com/track/p-000',
    updated_at: '2026-08-01 10:20:00',
  },
  'p-001': {
    enabled: true,
    system_name: 'T1 安全帽定位平台',
    url: 'https://example.com/track/p-001',
    updated_at: '2026-08-03 14:35:00',
  },
  'p-003': { enabled: false, system_name: '', url: '', updated_at: '' },
  'p-004': {
    enabled: true,
    system_name: '市政工程轨迹子系统',
    url: 'https://example.com/track/p-004',
    updated_at: '2026-07-28 09:12:00',
  },
  'p-005': {
    enabled: false,
    system_name: '停用演示系统',
    url: 'https://example.com/track/p-005',
    updated_at: '2026-06-15 16:40:00',
  },
}

let projectTrackJumpStore = structuredClone(defaultProjectTrackJump)

export function getProjectTrackJump(project_id) {
  const item = projectTrackJumpStore[project_id]
  return {
    enabled: Boolean(item?.enabled && item?.url),
    system_name: item?.system_name || '',
    url: item?.url || '',
    updated_at: item?.updated_at || '',
  }
}

export function saveProjectTrackJump(project_id, payload = {}) {
  if (!project_id || project_id === 'hq') return null
  projectTrackJumpStore[project_id] = {
    enabled: Boolean(payload.enabled),
    system_name: String(payload.system_name || '').trim(),
    url: String(payload.url || '').trim(),
    updated_at: nowStamp(),
  }
  return getProjectTrackJump(project_id)
}

/**
 * 指挥部 · 人员轨迹系统列表：有 URL 即展示（含已填地址但停用）
 */
export function listConfiguredPersonnelTrackSystems() {
  return Object.entries(projectTrackJumpStore)
    .map(([project_id, raw]) => {
      const url = String(raw?.url || '').trim()
      return {
        project_id,
        url,
        enabled: Boolean(raw?.enabled),
        updated_at: raw?.updated_at || '',
        system_name: raw?.system_name || '',
      }
    })
    .filter((row) => row.url)
}

/** @deprecated 已取消现场实名制对接开关；恒为对接同步模式 */
export function getProjectSiteIntegration() {
  return { enabled: true }
}

/** @deprecated */
export function saveProjectSiteIntegration() {
  return { enabled: true }
}

/** 现场实名制对接同步字段说明（文档/提示用） */
export const integratedFieldPaths = [
  'basic.personnel_no',
  'basic.photo',
  'basic.name',
  'basic.phone',
  'basic.gender',
  'basic.age',
  'basic.id_type',
  'basic.id_number',
  'basic.id_valid_from',
  'basic.id_valid_to',
  'basic.native_place',
  'basic.address',
  'unit.unit_name',
  'unit.credit_code',
  'unit.unit_type',
  'unit.work_type',
  'unit.cert_valid_to',
  'safety_education',
]

/** 恒为对接模式：平台不开放人员填报 */
export function isSiteIntegrationEnabled() {
  return true
}

/** 平台不做人员业务填报，一律不支持新增 */
export function canCreatePersonnel() {
  return false
}

export function isIntegratedField() {
  return true
}

export function getProjectWarningConfig(project_id) {
  if (!project_id || project_id === 'hq') return normalizeConfig(defaultConfig)
  if (!projectConfigStore[project_id]) {
    projectConfigStore[project_id] = normalizeConfig(defaultConfig)
  }
  return normalizeConfig(projectConfigStore[project_id])
}

export function saveProjectWarningConfig(project_id, data) {
  if (!project_id || project_id === 'hq') return null
  projectConfigStore[project_id] = normalizeConfig(data)
  return structuredClone(projectConfigStore[project_id])
}

export function resetProjectWarningConfig(project_id) {
  if (!project_id || project_id === 'hq') return normalizeConfig(defaultConfig)
  projectConfigStore[project_id] = normalizeConfig(defaultConfig)
  return structuredClone(projectConfigStore[project_id])
}

/** @deprecated 请使用 getProjectWarningConfig(project_id) */
export function getWarningConfig() {
  return getProjectWarningConfig('p-000')
}

/** @deprecated */
export function saveWarningConfig(data) {
  return saveProjectWarningConfig('p-000', data)
}

/** @deprecated */
export function resetWarningConfig() {
  return resetProjectWarningConfig('p-000')
}

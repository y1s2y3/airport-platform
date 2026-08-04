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

/** 分级管控可选人员（可挂多个岗位；选岗位后优先展示匹配人员，也可选其他人员） */
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

export function getTierPositionName(positionId) {
  return tierPositionCatalog.find((p) => p.id === positionId)?.name || '—'
}

export function getTierPerson(personId) {
  return tierPersonnelCatalog.find((p) => p.id === personId) || null
}

export function getTierPersonLabel(personId) {
  const person = getTierPerson(personId)
  if (!person) return '—'
  return `${person.name} · ${person.dept}`
}

/** 按岗位筛选候选人；未选岗位时返回全部 */
export function getTierPersonnelByPosition(positionId) {
  if (!positionId) return [...tierPersonnelCatalog]
  const matched = tierPersonnelCatalog.filter((u) => u.positionIds.includes(positionId))
  return matched.length ? matched : [...tierPersonnelCatalog]
}

export function createEmptyTierLevel(order = 1) {
  return {
    id: `tier-${Date.now()}-${order}`,
    positionId: '',
    recipientId: '',
    reportDays: Math.min(1 + (order - 1) * 2, 30),
  }
}

/** 默认推送：安全员 → 施工方项目负责人 → 监理工程师 → 指挥部项目经理 */
function createDefaultTierLevels() {
  return [
    { id: 'tier-1', positionId: 'pos-safety-officer', recipientId: 'u-so-01', reportDays: 1 },
    { id: 'tier-2', positionId: 'pos-contractor-pm', recipientId: 'u-cpm-01', reportDays: 3 },
    { id: 'tier-3', positionId: 'pos-supervisor-engineer', recipientId: 'u-se-01', reportDays: 5 },
    { id: 'tier-4', positionId: 'pos-hq-pm', recipientId: 'u-hqpm-01', reportDays: 7 },
  ]
}

function normalizeTierLevels(rawLevels) {
  if (Array.isArray(rawLevels)) {
    return rawLevels.map((item, index) => ({
      id: item.id || `tier-${index + 1}`,
      positionId: item.positionId || '',
      recipientId: item.recipientId || '',
      reportDays: Number(item.reportDays) > 0 ? Number(item.reportDays) : 1,
    }))
  }
  if (rawLevels && typeof rawLevels === 'object') {
    return tierLevelDefinitions.map((def, index) => {
      const old = rawLevels[def.key] || {}
      return {
        id: `tier-${def.key}`,
        positionId: LEGACY_TIER_KEY_TO_POSITION[def.key] || '',
        recipientId: old.recipientId || '',
        reportDays: Number(old.reportDays) > 0 ? Number(old.reportDays) : 1 + index * 2,
      }
    })
  }
  return createDefaultTierLevels()
}

function normalizeConfig(data) {
  const cloned = structuredClone(data || defaultConfig)
  cloned.tieredControl = {
    levels: normalizeTierLevels(cloned.tieredControl?.levels),
  }
  return cloned
}

/** 预警规则定义（本期不采集工资，不含工资异常预警） */
export const warningRuleDefinitions = [
  { key: 'noLevel3Education', label: '未进行入场三级教育预警', description: '人员已入场但未完成三级安全教育时触发预警' },
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
    description: '人员年龄低于设定下限时触发预警',
    extra: 'minAge',
  },
  {
    key: 'elderlyReminder',
    labelTemplate: 'elderlyAge',
    description: '超过设定年龄时在施工方端提示，不向监管方上报',
    extra: 'elderlyAge',
    scopeTag: '仅施工方',
  },
  { key: 'idCardExpired', label: '身份证过期提醒', description: '人员身份证有效期届满前/已过期时发送提醒' },
  {
    key: 'absentDays',
    labelTemplate: 'days',
    description: '已入场人员连续指定天数无考勤记录时触发预警',
    extra: 'days',
  },
  { key: 'multiSiteOnSite', label: '人员多地同时在场预警', description: '同一人员在多个项目/工地同时处于在场状态时触发预警' },
  { key: 'managerAttendance', label: '管理人员考勤不达标预警', description: '管理人员月度出勤率未达要求时触发预警' },
  { key: 'blacklistEntry', label: '黑名单人员进场预警', description: '黑名单人员尝试刷卡或登记进场时触发预警' },
]

/** 根据当前配置生成预警规则展示名称 */
export function getWarningRuleLabel(key, config = {}) {
  switch (key) {
    case 'workOver12h':
      return `连续工作超${config.hours ?? 12}小时预警`
    case 'ageLimit':
      return `实名制年龄低于${config.minAge ?? 16}周岁预警`
    case 'elderlyReminder':
      return `高龄提醒（男${config.maleAge ?? 60}岁/女${config.femaleAge ?? 50}岁）`
    case 'absentDays':
      return `连续${config.days ?? 3}天未出勤预警`
    default: {
      const rule = warningRuleDefinitions.find((item) => item.key === key)
      return rule?.label || key
    }
  }
}

const defaultConfig = {
  tieredControl: {
    levels: createDefaultTierLevels(),
  },
  warningRules: {
    noLevel3Education: { enabled: true },
    specialCertMissing: { enabled: true },
    workOver12h: { enabled: true, hours: 12 },
    ageLimit: { enabled: true, minAge: 16 },
    elderlyReminder: { enabled: true, maleAge: 60, femaleAge: 50 },
    idCardExpired: { enabled: true },
    absentDays: { enabled: true, days: 3 },
    multiSiteOnSite: { enabled: true },
    managerAttendance: { enabled: true },
    blacklistEntry: { enabled: true },
  },
}

/** 项目级实名制配置（分级管控 + 预警），不再提供指挥部全局配置 */
const PROJECT_IDS = ['p-000', 'p-001', 'p-003', 'p-004', 'p-005']

let projectConfigStore = Object.fromEntries(
  PROJECT_IDS.map((id) => [id, normalizeConfig(defaultConfig)]),
)

/** 项目级人员轨迹外链（不统一轨迹硬件/数据标准） */
const defaultProjectTrackJump = {
  'p-000': {
    enabled: true,
    systemName: 'T2 现场人员定位系统',
    url: 'https://example.com/track/p-000',
  },
  'p-001': {
    enabled: true,
    systemName: 'T1 安全帽定位平台',
    url: 'https://example.com/track/p-001',
  },
  'p-003': { enabled: false, systemName: '', url: '' },
  'p-004': {
    enabled: true,
    systemName: '市政工程轨迹子系统',
    url: 'https://example.com/track/p-004',
  },
  'p-005': { enabled: false, systemName: '', url: '' },
}

let projectTrackJumpStore = structuredClone(defaultProjectTrackJump)

export function getProjectTrackJump(projectId) {
  const item = projectTrackJumpStore[projectId]
  return {
    enabled: Boolean(item?.enabled && item?.url),
    systemName: item?.systemName || '',
    url: item?.url || '',
  }
}

export function saveProjectTrackJump(projectId, payload = {}) {
  if (!projectId || projectId === 'hq') return null
  projectTrackJumpStore[projectId] = {
    enabled: Boolean(payload.enabled),
    systemName: String(payload.systemName || '').trim(),
    url: String(payload.url || '').trim(),
  }
  return getProjectTrackJump(projectId)
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
  'basic.personnelNo',
  'basic.photo',
  'basic.name',
  'basic.phone',
  'basic.gender',
  'basic.age',
  'basic.idType',
  'basic.idNumber',
  'basic.idValidFrom',
  'basic.idValidTo',
  'basic.nativePlace',
  'basic.address',
  'unit.unitName',
  'unit.creditCode',
  'unit.unitType',
  'unit.workType',
  'unit.certValidTo',
  'safetyEducation',
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

export function getProjectWarningConfig(projectId) {
  if (!projectId || projectId === 'hq') return normalizeConfig(defaultConfig)
  if (!projectConfigStore[projectId]) {
    projectConfigStore[projectId] = normalizeConfig(defaultConfig)
  }
  return normalizeConfig(projectConfigStore[projectId])
}

export function saveProjectWarningConfig(projectId, data) {
  if (!projectId || projectId === 'hq') return null
  projectConfigStore[projectId] = normalizeConfig(data)
  return structuredClone(projectConfigStore[projectId])
}

export function resetProjectWarningConfig(projectId) {
  if (!projectId || projectId === 'hq') return normalizeConfig(defaultConfig)
  projectConfigStore[projectId] = normalizeConfig(defaultConfig)
  return structuredClone(projectConfigStore[projectId])
}

/** @deprecated 请使用 getProjectWarningConfig(projectId) */
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

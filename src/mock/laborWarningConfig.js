/** 分级管控 - 上报接收人候选（按岗位） */
export const tierRecipientOptions = {
  chiefSupervisor: [
    { id: 'u-ts-01', name: '赵监理', dept: '监理单位', role: '总监理工程师' },
    { id: 'u-ts-02', name: '孙监理', dept: '监理单位', role: '总监理工程师' },
    { id: 'u-ts-03', name: '周监理', dept: '监理单位', role: '总监理工程师' },
  ],
  projectManager: [
    { id: 'u-pm-01', name: '姚远东', dept: '工程管理部', role: '项目经理' },
    { id: 'u-pm-02', name: '李项目', dept: 'T2空侧捷运线', role: '项目经理' },
    { id: 'u-pm-03', name: '王项目', dept: '三跑道扩建', role: '项目经理' },
  ],
  safetyDirector: [
    { id: 'u-sd-01', name: '张安全', dept: '安全环保部', role: '安全部主管' },
    { id: 'u-sd-02', name: '刘安全', dept: '安全环保部', role: '安全部主管' },
    { id: 'u-sd-03', name: '陈安全', dept: '安全环保部', role: '安全部主管' },
  ],
  commander: [
    { id: 'u-cmd-01', name: '指挥长甲', dept: 'COC调度中心', role: '指挥长' },
    { id: 'u-cmd-02', name: '指挥长乙', dept: 'COC调度中心', role: '指挥长' },
    { id: 'u-cmd-03', name: '指挥长丙', dept: 'COC调度中心', role: '指挥长' },
  ],
}

export const tierLevelDefinitions = [
  { key: 'chiefSupervisor', label: '总监理', level: 1 },
  { key: 'projectManager', label: '项目经理', level: 2 },
  { key: 'safetyDirector', label: '安全部主管人员', level: 3 },
  { key: 'commander', label: '指挥长', level: 4 },
]

/** @deprecated 兼容旧引用，请使用 tierLevelDefinitions */
export const tierRecipientLabels = Object.fromEntries(
  tierLevelDefinitions.map((item) => [item.key, item.label]),
)

/** 预警规则定义（静态部分；含参规则名称在页面内联编辑） */
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
  { key: 'salaryAbnormal', label: '工资发放异常预警', description: '工资发放数据与考勤/合同信息不匹配时触发预警' },
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
    levels: {
      chiefSupervisor: { reportDays: 1, recipientId: 'u-ts-01' },
      projectManager: { reportDays: 3, recipientId: 'u-pm-01' },
      safetyDirector: { reportDays: 5, recipientId: 'u-sd-01' },
      commander: { reportDays: 7, recipientId: 'u-cmd-01' },
    },
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
    salaryAbnormal: { enabled: false },
  },
}

let configStore = structuredClone(defaultConfig)

const defaultProjectSiteIntegration = {
  'p-000': { enabled: true },
  'p-001': { enabled: true },
  'p-003': { enabled: false },
  'p-004': { enabled: true },
  'p-005': { enabled: true },
}

let projectSiteIntegrationStore = structuredClone(defaultProjectSiteIntegration)

export function getProjectSiteIntegration(projectId) {
  const item = projectSiteIntegrationStore[projectId]
  return { enabled: item?.enabled !== false }
}

export function saveProjectSiteIntegration(projectId, enabled) {
  if (!projectId || projectId === 'hq') return null
  projectSiteIntegrationStore[projectId] = { enabled: Boolean(enabled) }
  return projectSiteIntegrationStore[projectId]
}

/** 现场实名制对接同步字段（对接开启时不可编辑） */
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
]

export function isSiteIntegrationEnabled(projectId) {
  if (!projectId || projectId === 'hq') return true
  return projectSiteIntegrationStore[projectId]?.enabled !== false
}

export function canCreatePersonnel(projectId) {
  return !isSiteIntegrationEnabled(projectId)
}

export function isIntegratedField(fieldPath, projectId) {
  return isSiteIntegrationEnabled(projectId) && integratedFieldPaths.includes(fieldPath)
}

export function getWarningConfig() {
  return structuredClone(configStore)
}

export function saveWarningConfig(data) {
  configStore = structuredClone(data)
  return configStore
}

export function resetWarningConfig() {
  configStore = structuredClone(defaultConfig)
  return configStore
}

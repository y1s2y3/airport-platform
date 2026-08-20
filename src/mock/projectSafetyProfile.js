import { listSysUsers } from './sysUsers'

export const yesNoOptions = ['是', '否']

/** 项目画像人员下拉补充名单（含参建单位人员，系统用户未覆盖的姓名） */
export const profileExtraPersons = [
  { name: '王建国', phone: '13800138001' },
  { name: '李安全', phone: '13900139002' },
  { name: '管术枝', phone: '13600136000' },
  { name: '郑经理', phone: '13300133000' },
  { name: '冯安全', phone: '12700127000' },
  { name: '林建源', phone: '13700137000' },
  { name: '陈经理', phone: '13300133001' },
  { name: '黄安全', phone: '13900139001' },
  { name: '戴毅峰', phone: '13400134001' },
  { name: '孙经理', phone: '13100131011' },
  { name: '钱安全', phone: '13000130012' },
  { name: '刘经理', phone: '13300133009' },
  { name: '吴安全', phone: '13200132010' },
  { name: '胡阳', phone: '13420969080' },
  { name: '裴云龙', phone: '18588955314' },
  { name: '李庆福', phone: '13510343400' },
  { name: '叶传雄', phone: '13675000757' },
  { name: '刘建平', phone: '13626007119' },
  { name: '陈步青', phone: '18050053666' },
  { name: '赵磊', phone: '13500135000' },
  { name: '陈市政', phone: '13600136006' },
  { name: '赵安全', phone: '13500135007' },
  { name: '周专职', phone: '13700137003' },
]

export function listProfilePersons() {
  const map = new Map()
  for (const user of listSysUsers()) {
    if (user.status === false || !user.name) continue
    if (String(user.loginAccount || '').startsWith('pm_')) continue
    map.set(user.name, {
      id: user.id,
      name: user.name,
      phone: user.phone || '',
    })
  }
  for (const person of profileExtraPersons) {
    if (!person.name || map.has(person.name)) continue
    map.set(person.name, {
      id: `profile-person-${person.name}`,
      name: person.name,
      phone: person.phone || '',
    })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

export function emptyQualificationTriple() {
  return [
    { label: '资质证件', certNo: '', photo: '', possessed: false },
    { label: '职称证书', certNo: '', photo: '', possessed: false },
    { label: '资格证书', certNo: '', photo: '', possessed: false },
  ]
}

function normalizeQualificationTriple(list) {
  const base = emptyQualificationTriple()
  if (!list?.length) return base
  return base.map((item, index) => {
    const source = list[index] || list.find((row) => row.label === item.label) || {}
    return {
      ...item,
      ...source,
      label: item.label,
      possessed: Boolean(source.possessed ?? (source.certNo || source.photo)),
    }
  })
}

export function createEmptyUnitQualification() {
  return { label: '', certNo: '', photo: '' }
}

/** @deprecated 兼容旧名 */
export function createEmptySupervisorQualification() {
  return createEmptyUnitQualification()
}

/** 单位资质证书默认空列表（由页面增删） */
export function emptyUnitQualifications() {
  return []
}

/** @deprecated 兼容旧名 */
export function emptySupervisorQualifications() {
  return emptyUnitQualifications()
}

/** 监理单位资质证书类型枚举 */
export const supervisorCertTypeOptions = [
  '注册监理工程师',
  '注册造价工程师',
  '注册建造师',
  '注册工程师',
  '注册建筑师',
  '专业监理工程师证',
  '监理员证',
  '中级以上技术职称',
]

/** 施工总承包单位资质证书类型枚举 */
export const generalContractorCertTypeOptions = [
  '建筑施工企业项目负责人安全生产考核合格证书(安全B证)',
  '建筑施工企业专职安全生产管理人员安全生产考核合格证书(安全C证)',
]

function normalizeUnitQualifications(list) {
  if (!Array.isArray(list)) return emptyUnitQualifications()
  return list.map((item) => ({
    label: item.label || '',
    certNo: item.certNo || '',
    photo: item.photo || '',
  }))
}

export function createSupervisorUnitBlock(overrides = {}) {
  return {
    legalPersonContact: '',
    companySafetyDirectorContact: '',
    superiorManagementUnit: '',
    chiefSupervisorContact: '',
    chiefRepresentativeContact: '',
    safetySupervisorContact: '',
    ...overrides,
    qualifications: normalizeUnitQualifications(overrides.qualifications),
  }
}

export function createGeneralContractorBlock(overrides = {}) {
  return {
    unitName: '',
    legalPersonContact: '',
    companySafetyDirectorContact: '',
    superiorManagementUnit: '',
    projectLeaderContact: '',
    safetyDirectorContact: '',
    safetyManagerContact: '',
    safetyLicenseNo: '',
    safetyLicenseExpiry: '',
    safetyLicensePhoto: '',
    ...overrides,
    qualifications: normalizeUnitQualifications(overrides.qualifications),
  }
}

export function createSubcontractorBlock(overrides = {}) {
  const {
    safetyManagerContact2,
    safetyManagerContact: contactOverride,
    ...rest
  } = overrides
  const primary = String(contactOverride ?? '').trim()
  const secondary = String(safetyManagerContact2 || '').trim()
  const safetyManagerContact = [primary, secondary].filter(Boolean).join('；')
  const merged = {
    unitName: '',
    projectLeaderContact: '',
    safetyManagerContact: '',
    qualifications: emptyQualificationTriple(),
    hasSafetyLicense: false,
    safetyLicenseNo: '',
    safetyLicenseExpiry: '',
    safetyLicensePhoto: '',
    ...rest,
    safetyManagerContact,
  }
  merged.qualifications = normalizeQualificationTriple(overrides.qualifications || merged.qualifications)
  if (overrides.hasSafetyLicense === undefined) {
    merged.hasSafetyLicense = Boolean(merged.safetyLicenseNo || merged.safetyLicensePhoto)
  }
  return merged
}

export function createDangerousWorkRow(overrides = {}) {
  return {
    name: '',
    content: '',
    period: '',
    ...overrides,
  }
}

export function createMachineryRow(overrides = {}) {
  return {
    name: '',
    quantity: '',
    entryInspectionOk: '',
    model: '',
    hasLedger: '',
    maintenance: '',
    entryDeadline: '',
    ...overrides,
  }
}

export function createChargingPileBlock(overrides = {}) {
  return {
    enabled: '',
    pileCount: '',
    installQualified: '',
    onsiteParkingCount: '',
    offsiteParkingCount: '',
    ...overrides,
  }
}

export function createElectricBicycleBlock(overrides = {}) {
  return {
    enabled: '',
    socketCount: '',
    installQualified: '',
    onsiteParkingCount: '',
    offsiteParkingCount: '',
    ...overrides,
  }
}

export function createCampBlock(overrides = {}) {
  return {
    hasCamp: '',
    campAddress: '',
    campArea: '',
    campOccupiedArea: '',
    campTotalPeople: '',
    campVideoChannels: '',
    campBuildingMaterialOk: '',
    videoFullCoverage: '',
    videoIncludesCanteenGas: '',
    campHasCanteen: '',
    canteenFuelType: '',
    ...overrides,
  }
}

export function createSafetyProfile(overrides = {}) {
  const profile = {
    supervisorUnit: createSupervisorUnitBlock(),
    generalContractor: createGeneralContractorBlock(),
    subcontractorBlocks: [
      createSubcontractorBlock({
        unitName: '深圳市政集团有限公司',
        projectLeaderContact: '陈市政 / 13600136006',
        safetyManagerContact: '赵安全 / 13500135007；钱安全 / 13400134008',
        hasSafetyLicense: true,
        safetyLicenseNo: '（粤）JZ安许证字〔2023〕009876',
        safetyLicenseExpiry: '2026-12-31',
        qualifications: [
          { label: '资质证件', possessed: true },
          { label: '职称证书', possessed: true },
          { label: '资格证书', possessed: false },
        ],
      }),
      createSubcontractorBlock({
        unitName: '深圳广田装饰集团股份有限公司',
        projectLeaderContact: '郑经理 / 12800128014',
        safetyManagerContact: '冯安全 / 12700127015',
        hasSafetyLicense: true,
        safetyLicenseNo: '（粤）JZ安许证字〔2021〕003210',
        safetyLicenseExpiry: '2025-12-31',
        qualifications: [
          { label: '资质证件', possessed: true },
          { label: '职称证书', possessed: false },
          { label: '资格证书', possessed: true },
        ],
      }),
    ],
    dangerousSubProjects: Array.from({ length: 3 }, () => createDangerousWorkRow()),
    dangerousOperations: Array.from({ length: 3 }, () => createDangerousWorkRow()),
    largeMachinery: Array.from({ length: 4 }, () => createMachineryRow()),
    smallMachinery: Array.from({ length: 4 }, () => createMachineryRow()),
    nonPavementInvolved: '',
    machineryRequirements: '',
    siteNewEnergyCharging: createChargingPileBlock(),
    siteElectricBicycle: createElectricBicycleBlock(),
    camp: createCampBlock(),
    campNewEnergyCharging: createChargingPileBlock(),
    campElectricBicycle: createElectricBicycleBlock(),
    ...overrides,
  }

  profile.supervisorUnit = createSupervisorUnitBlock(overrides.supervisorUnit || profile.supervisorUnit)
  profile.generalContractor = createGeneralContractorBlock(overrides.generalContractor || profile.generalContractor)
  profile.subcontractorBlocks = (overrides.subcontractorBlocks || profile.subcontractorBlocks).map((item) =>
    createSubcontractorBlock(item),
  )
  profile.dangerousSubProjects = (overrides.dangerousSubProjects || profile.dangerousSubProjects).map((item) =>
    createDangerousWorkRow(item),
  )
  profile.dangerousOperations = (overrides.dangerousOperations || profile.dangerousOperations).map((item) =>
    createDangerousWorkRow(item),
  )
  profile.largeMachinery = (overrides.largeMachinery || profile.largeMachinery).map((item) => createMachineryRow(item))
  profile.smallMachinery = (overrides.smallMachinery || profile.smallMachinery).map((item) => createMachineryRow(item))
  profile.siteNewEnergyCharging = createChargingPileBlock(
    overrides.siteNewEnergyCharging || profile.siteNewEnergyCharging,
  )
  profile.siteElectricBicycle = createElectricBicycleBlock(
    overrides.siteElectricBicycle || profile.siteElectricBicycle,
  )
  profile.camp = createCampBlock(overrides.camp || profile.camp)
  profile.campNewEnergyCharging = createChargingPileBlock(
    overrides.campNewEnergyCharging || profile.campNewEnergyCharging,
  )
  profile.campElectricBicycle = createElectricBicycleBlock(
    overrides.campElectricBicycle || profile.campElectricBicycle,
  )

  return profile
}

export function mergeSafetyProfile(source) {
  return createSafetyProfile(source || {})
}

export const profileNotes = [
  '设备类型统计来自工地施工机械台账，按机械类型汇总台数。',
  '维保趋势统计全部在场及历史设备的维保记录次数，按月汇总。',
  '专业分包及劳务分包信息可根据项目分包单位数量自行增加。',
]

export const profileRemarkNotes = [
  '如涉及跨年度工程，关键节点进度及分阶段施工时间范围请在项目概况中说明，并注明专业类别及施工范围。',
  '项目类型请根据项目实际情况选择；如无法区分行业主管部门或机场施工范畴的项目，请选择“机场内部零星工程”。',
]

const RING_COLORS = ['#1a73e8', '#43a047', '#ff9800', '#e53935', '#8e24aa', '#00acc1', '#6d4c41', '#5c6bc0']

import {
  getDerivedMajorProjectList,
  getDerivedDangerWorkList,
} from '../coc/utils/dailyWorkStorage.js'

function seedFromId(id) {
  return [...String(id || 'p-000')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

function withColors(items) {
  return items.map((item, index) => ({
    ...item,
    color: RING_COLORS[index % RING_COLORS.length],
  }))
}

function countBySeed(base, seed, index, span = 4) {
  return Math.max(0, base + ((seed + index * 3) % span) - 1)
}

function aggregateCounts(rows, keyFn) {
  const map = new Map()
  for (const row of rows) {
    const name = String(keyFn(row) || '').trim() || '其他'
    map.set(name, (map.get(name) || 0) + 1)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }))
}

/** 与 COC 危大工程清单同源，按项目过滤 */
export function listProfileMajorHazards(projectId = '') {
  const rows = getDerivedMajorProjectList()
  if (!projectId) return rows
  return rows.filter((row) => row.projectId === projectId)
}

/** 与 COC 危险作业清单同源，按项目过滤 */
export function listProfileDangerWorks(projectId = '') {
  const rows = getDerivedDangerWorkList()
  if (!projectId) return rows
  return rows.filter((row) => row.projectId === projectId)
}

/**
 * 项目画像第三、四章图表统计
 * 危大/危险作业：与系统菜单清单同源聚合；机械设备仍为演示统计
 */
export function getProfilePortraitStats(projectId) {
  const seed = seedFromId(projectId)
  const majors = listProfileMajorHazards(projectId)
  const dangers = listProfileDangerWorks(projectId)

  const majorStartStatus = withColors(aggregateCounts(majors, (row) => row.status)).filter(
    (item) => item.value > 0,
  )
  const dangerCategories = withColors(aggregateCounts(dangers, (row) => row.type)).filter(
    (item) => item.value > 0,
  )

  const equipmentTypes = withColors([
    { name: '塔吊', value: countBySeed(3, seed, 0, 3) },
    { name: '升降机', value: countBySeed(2, seed, 1, 3) },
    { name: '桩基机械', value: countBySeed(2, seed, 2, 3) },
    { name: '汽车吊', value: countBySeed(4, seed, 3, 4) },
    { name: '挖掘机', value: countBySeed(5, seed, 4, 5) },
    { name: '混凝土泵车', value: countBySeed(2, seed, 5, 3) },
  ]).filter((item) => item.value > 0)

  const months = ['2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08']
  const maintainTrend = months.map((label, index) => ({
    label,
    count: 4 + ((seed + index * 5) % 7),
  }))

  return {
    majorStartStatus,
    dangerCategories,
    equipmentTypes,
    maintainTrend,
  }
}

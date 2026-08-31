export const yesNoOptions = ['是', '否']
export function emptyQualificationTriple() {
  return [{ label: '资格证书', certNo: '', photo: '', possessed: false }]
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
  const {
    safetyLicenseExpiry,
    safetyLicenseExpiryStart,
    safetyLicenseExpiryEnd,
    ...rest
  } = overrides
  return {
    unitName: '',
    legalPersonContact: '',
    companySafetyDirectorContact: '',
    superiorManagementUnit: '',
    projectLeaderContact: '',
    safetyDirectorContact: '',
    safetyManagerContact: '',
    safetyLicenseNo: '',
    safetyLicenseExpiryStart: safetyLicenseExpiryStart || '',
    safetyLicenseExpiryEnd: safetyLicenseExpiryEnd || safetyLicenseExpiry || '',
    safetyLicensePhoto: '',
    ...rest,
    qualifications: normalizeUnitQualifications(overrides.qualifications),
  }
}

export function formatGeneralContractorLicenseExpiry(block) {
  const start = String(block?.safetyLicenseExpiryStart || '').trim()
  const end = String(block?.safetyLicenseExpiryEnd || '').trim()
  if (start && end) return `${start} ~ ${end}`
  return start || end || ''
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
    const expiryText = String(merged.safetyLicenseExpiry || '')
    const endMatch = expiryText.match(/(\d{4}-\d{2}-\d{2})\s*$/)
    const expiryEnd = endMatch ? endMatch[1] : ''
    const today = new Date().toISOString().slice(0, 10)
    const complete = Boolean(
      merged.safetyLicenseNo && merged.safetyLicenseExpiry && merged.safetyLicensePhoto,
    )
    merged.hasSafetyLicense = complete && (!expiryEnd || expiryEnd >= today)
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
  const { onsiteParkingCount, offsiteParkingCount, ...rest } = overrides
  return {
    enabled: '',
    pileCount: '',
    installQualified: '',
    parkingCount: rest.parkingCount ?? onsiteParkingCount ?? '',
    ...rest,
  }
}

export function createElectricBicycleBlock(overrides = {}) {
  const { chargingAreaRequirements, onsiteParkingCount, offsiteParkingCount, ...rest } = overrides
  const installQualified =
    rest.installQualified
    ?? (['是', '否'].includes(chargingAreaRequirements) ? chargingAreaRequirements : '')
  return {
    enabled: '',
    socketCount: '',
    installQualified,
    parkingCount: rest.parkingCount ?? onsiteParkingCount ?? '',
    ...rest,
  }
}

export function createClearanceBlock(overrides = {}) {
  return {
    clearanceHeightInvolved: '',
    clearanceHeightRequirement: '',
    ...overrides,
  }
}

export function createCampBlock(overrides = {}) {
  return {
    hasCamp: '',
    campAddress: '',
    campAddressLng: '',
    campAddressLat: '',
    campOccupiedArea: '',
    campTotalPeople: '',
    campBuildingCount: '',
    campBuildingMaterialOk: '',
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
        safetyLicenseExpiry: '2024-01-01 ~ 2026-12-31',
        qualifications: [{ label: '资格证书', possessed: true }],
      }),
      createSubcontractorBlock({
        unitName: '深圳广田装饰集团股份有限公司',
        projectLeaderContact: '郑经理 / 12800128014',
        safetyManagerContact: '冯安全 / 12700127015',
        hasSafetyLicense: true,
        safetyLicenseNo: '（粤）JZ安许证字〔2021〕003210',
        safetyLicenseExpiry: '2023-06-01 ~ 2025-12-31',
        qualifications: [{ label: '资格证书', possessed: true }],
      }),
    ],
    dangerousSubProjects: Array.from({ length: 3 }, () => createDangerousWorkRow()),
    dangerousOperations: Array.from({ length: 3 }, () => createDangerousWorkRow()),
    largeMachinery: Array.from({ length: 4 }, () => createMachineryRow()),
    smallMachinery: Array.from({ length: 4 }, () => createMachineryRow()),
    nonPavementInvolved: '',
    machineryRequirements: '',
    siteClearance: createClearanceBlock(),
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
  profile.siteClearance = createClearanceBlock(overrides.siteClearance || profile.siteClearance)
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

/** 与 COC 危险作业清单同源，按项目过滤；无同源数据时补演示行，保证画像右侧图有数 */
export function listProfileDangerWorks(projectId = '') {
  const rows = getDerivedDangerWorkList()
  if (!projectId) return rows
  const filtered = rows.filter((row) => row.projectId === projectId)
  if (filtered.length) return filtered
  return buildDemoDangerWorks(projectId)
}

function buildDemoDangerWorks(projectId = '') {
  const seed = seedFromId(projectId)
  const types = ['动火', '高处', '深基坑', '夜间作业']
  const subTypes = {
    动火: ['一级动火', '焊接切割'],
    高处: ['外架搭设', '幕墙安装'],
    深基坑: ['深基坑开挖', '土方开挖'],
    夜间作业: ['夜间混凝土浇筑', '夜间设备安装'],
  }
  const statuses = ['进行中', '已完成', '待审批', '已许可']
  const count = 5 + (seed % 4)
  return Array.from({ length: count }, (_, i) => {
    const type = types[(seed + i) % types.length]
    const subs = subTypes[type]
    return {
      id: `demo-dw-${projectId || 'all'}-${i + 1}`,
      projectId,
      contractor: i % 2 === 0 ? '中建三局深圳机场项目部' : '中交一航局机场工程公司',
      type,
      subType: subs[i % subs.length],
      date: `2026-08-${String(((seed + i) % 27) + 1).padStart(2, '0')}`,
      location: ['东侧基坑', '钢结构区', '地下室B2', '幕墙作业面'][(seed + i) % 4],
      status: statuses[(seed + i) % statuses.length],
    }
  })
}

/**
 * 项目画像第四章 · 工地施工机械设备清单（演示数据，与设备类型统计同源）
 * @returns {{ id: string, name: string, type: string, model: string, quantity: number, status: string, entryDate: string, hasLedger: string, maintenance: string }[]}
 */
export function listProfileEquipments(projectId = '') {
  const seed = seedFromId(projectId)
  const typeSpecs = [
    { type: '塔吊', value: countBySeed(3, seed, 0, 3), modelPrefix: 'QTZ' },
    { type: '升降机', value: countBySeed(2, seed, 1, 3), modelPrefix: 'SC' },
    { type: '桩基机械', value: countBySeed(2, seed, 2, 3), modelPrefix: 'ZJ' },
    { type: '汽车吊', value: countBySeed(4, seed, 3, 4), modelPrefix: 'QY' },
    { type: '挖掘机', value: countBySeed(5, seed, 4, 5), modelPrefix: 'PC' },
    { type: '混凝土泵车', value: countBySeed(2, seed, 5, 3), modelPrefix: 'HBT' },
  ]
  const statuses = ['在场', '在场', '维保中', '已退场']
  const rows = []
  let seq = 1
  for (const spec of typeSpecs) {
    for (let i = 0; i < spec.value; i += 1) {
      rows.push({
        id: `eq-${projectId || 'all'}-${seq}`,
        name: `${spec.type}-${String(seq).padStart(2, '0')}`,
        type: spec.type,
        model: `${spec.modelPrefix}-${80 + ((seed + seq) % 40)}`,
        quantity: 1,
        status: statuses[(seed + seq) % statuses.length],
        entryDate: `2026-${String(((seed + seq) % 8) + 1).padStart(2, '0')}-${String(((seed + seq * 3) % 27) + 1).padStart(2, '0')}`,
        hasLedger: (seed + seq) % 5 === 0 ? '否' : '是',
        maintenance: (seed + seq) % 4 === 0 ? '待维保' : '正常',
      })
      seq += 1
    }
  }
  return rows
}

/**
 * 项目画像第三、四章图表统计
 * 危大/危险作业：与系统菜单清单同源聚合；机械设备与 listProfileEquipments 同源
 */
export function getProfilePortraitStats(projectId) {
  const seed = seedFromId(projectId)
  const majors = listProfileMajorHazards(projectId)
  const dangers = listProfileDangerWorks(projectId)
  const equipments = listProfileEquipments(projectId)

  const majorStartStatus = withColors(aggregateCounts(majors, (row) => row.status)).filter(
    (item) => item.value > 0,
  )
  const dangerCategories = withColors(aggregateCounts(dangers, (row) => row.type)).filter(
    (item) => item.value > 0,
  )

  const equipmentTypes = withColors(aggregateCounts(equipments, (row) => row.type)).filter(
    (item) => item.value > 0,
  )

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

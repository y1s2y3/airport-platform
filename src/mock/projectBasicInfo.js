import { mergeSafetyProfile } from './projectSafetyProfile'
import { listSysUsers } from './sysUsers'
import { parseOneContact } from '../utils/contactValue'

function findSysUserByContact(name, phone) {
  const nextName = String(name || '').trim()
  const nextPhone = String(phone || '').trim()
  if (!nextName || !nextPhone) return null
  return (
    listSysUsers().find(
      (user) => user.status !== false && user.name === nextName && user.phone === nextPhone,
    ) || null
  )
}

export const projectTypeOptions = [
  '房屋市政工程',
  '民航专业工程',
  '房屋市政工程+民航专业工程',
  '零星、小散工程',
  '机场内部零星工程',
]

export const permitStatusOptions = [
  '已办理施工许可证',
  '已办理民航质监安监备案',
  '已办理零星、小散备案',
  '已办理机场区域管理部门施工备案',
  '未办理',
]
export const projectStatusOptions = ['前期', '在建', '历史']

const PUMP_OVERVIEW = `深圳宝安国际机场T2航站区及配套设施工程-新建2号雨水提升泵站工程位于2#调蓄池与新建机场九道南侧之间的空地范围内，泵站进水口直接连通2#调蓄池水体，泵站出水口为福永河。泵站共有一条进场道路，场内道路通过宝安大道、机场九道工程相通。泵站枢纽主要由泵站建筑物和放空自排涵组成。其中泵站建筑物包括进水口、进水箱涵、进水池、泵房、出水池、出水箱涵、出水口等。进水箱涵6孔，进水箱涵进口处设置检修门1道，中部设置安全格栅1道；出水箱涵3孔，出水箱涵出口处设置检修闸门1道。
泵站汇水面积4.7km2，设计排涝流量为52m³/s，装设6台套潜水贯流泵机组，单台设计流量为8.7m³/s，配套电机功率630KW，全站总装机容量3780KW，水泵与电机采用齿轮减速箱联接。内河进水流道前设一道检修工作闸门，外河出水流道出口布置一道工作闸门和一道事故兼检修闸门。泵站内河进水池布置一道回转格栅清污机及皮带传输机。`

export function createProjectFields(overrides = {}) {
  const { safetyProfile, ...rest } = overrides
  const base = {
    projectName: '',
    contractorUnit: '',
    supervisorUnit: '',
    subcontractorUnit: '',
    overview: '',
    constructionSite: '',
    constructionSiteLng: '',
    constructionSiteLat: '',
    entryTime: '',
    plannedCompletionTime: '',
    constructionPeriodStart: '',
    constructionPeriodEnd: '',
    status: '前期',
    personInCharge: '',
    peakPersonnelCount: '',
    totalInvestment: '',
    buildingTotalArea: '',
    filingNumber: '',
    projectType: '',
    permitStatus: '',
    permitPhoto: '',
    projectEffectImage: '',
    deptHeadContact: '',
    projectManagerContact: '',
    safetyLiaisonContact: '',
  }
  return {
    ...base,
    ...rest,
    safetyProfile: mergeSafetyProfile(safetyProfile ?? rest.safetyProfile),
  }
}

export const projectList = [
  {
    id: 'p-000',
    shortName: 'T2项目',
    hidden: false,
    projectCode: 't2hangzhanqunuew',
    status: '前期',
    personInCharge: '姚远东',
    constructionPeriodStart: '2025-01-01',
    constructionPeriodEnd: '2029-12-31',
    ...createProjectFields({
      projectName: '宝安国际机场T2航站区及配套工程',
      constructionPeriodStart: '2025-01-01',
      constructionPeriodEnd: '2029-12-31',
      status: '前期',
      personInCharge: '姚远东',
      contractorUnit: '中建三局第一建设工程有限责任公司',
      supervisorUnit: '深圳市政监理有限公司',
      subcontractorUnit: '深圳市政集团有限公司',
      overview: 'T2航站区及配套工程总体建设，含航站楼主体、站坪及配套市政设施。',
      constructionSite: '宝安国际机场T2航站区',
      constructionSiteLng: 113.8106,
      constructionSiteLat: 22.6397,
      entryTime: '2025-01-01',
      plannedCompletionTime: '2029-12-31',
      peakPersonnelCount: '1850',
      totalInvestment: '1280000',
      buildingTotalArea: '850000',
      filingNumber: 'BA202501001',
      projectType: '房屋市政工程',
      permitStatus: '已办理施工许可证',
      permitPhoto: '施工许可证-T2.jpg',
      deptHeadContact: '姚远东13800138000',
      projectManagerContact: '王建国13800138001',
      safetyLiaisonContact: '李安全13900139002',
      safetyProfile: {
        camp: {
          hasCamp: '是',
          campAddress: 'T2项目工人营地',
          campAddressLng: 113.8082,
          campAddressLat: 22.6415,
        },
      },
    }),
  },
  {
    id: 'p-001',
    shortName: 'T1 项目',
    hidden: false,
    projectCode: '',
    status: '前期',
    personInCharge: '管术枝',
    constructionPeriodStart: '',
    constructionPeriodEnd: '',
    ...createProjectFields({
      projectName: '深圳宝安国际机场T1航站区及配套设施工程项目',
      status: '前期',
      personInCharge: '管术枝',
      contractorUnit: '中建三局',
      supervisorUnit: '深圳监理公司',
      subcontractorUnit: '深圳广田装饰集团股份有限公司',
      overview: 'T1航站区及配套设施改造与扩建工程。',
      constructionSite: 'T1航站区',
      constructionSiteLng: 113.7985,
      constructionSiteLat: 22.6288,
      entryTime: '2024-06-01',
      plannedCompletionTime: '2027-06-30',
      peakPersonnelCount: '620',
      totalInvestment: '356000',
      buildingTotalArea: '210000',
      filingNumber: 'BA202406018',
      projectType: '房屋市政工程',
      permitStatus: '已办理施工许可证',
      permitPhoto: '施工许可证-T1.jpg',
      deptHeadContact: '管术枝13600136000',
      projectManagerContact: '郑经理13300133000',
      safetyLiaisonContact: '冯安全12700127000',
    }),
  },
  {
    id: 'p-east-terminal',
    shortName: '东航站区及停车场',
    hidden: false,
    projectCode: '',
    status: '前期',
    personInCharge: '林建源',
    constructionPeriodStart: '',
    constructionPeriodEnd: '',
    ...createProjectFields({
      projectName: '深圳宝安国际机场东航站区、停车楼及配套业务设施项目',
      status: '前期',
      personInCharge: '林建源',
      contractorUnit: '中建八局南方公司',
      supervisorUnit: '深圳市政监理有限公司',
      overview: '东航站区、停车楼及配套业务设施建设。',
      constructionSite: '东航站区',
      peakPersonnelCount: '480',
      totalInvestment: '420000',
      buildingTotalArea: '165000',
      filingNumber: 'BA202503006',
      projectType: '房屋市政工程',
      permitStatus: '已办理民航质监安监备案',
      deptHeadContact: '林建源13700137000',
      projectManagerContact: '陈经理13300133001',
      safetyLiaisonContact: '黄安全13900139001',
    }),
  },
  {
    id: 'p-phase3',
    shortName: '综合配套三期',
    hidden: false,
    projectCode: '',
    status: '前期',
    personInCharge: '戴毅峰',
    constructionPeriodStart: '',
    constructionPeriodEnd: '',
    ...createProjectFields({
      projectName: '综合配套三期(A319-004-04-03-02)及南区下穿通道工程(A319-004-04-01-01)项目',
      status: '前期',
      personInCharge: '戴毅峰',
      contractorUnit: '中铁建工集团华南分公司',
      supervisorUnit: '深圳市政监理有限公司',
      overview: '综合配套三期及南区下穿通道工程施工。',
      constructionSite: '综合配套三期',
      peakPersonnelCount: '360',
      totalInvestment: '98000',
      buildingTotalArea: '72000',
      filingNumber: '',
      projectType: '房屋市政工程',
      permitStatus: '未办理',
      deptHeadContact: '戴毅峰13400134001',
      projectManagerContact: '孙经理13100131011',
      safetyLiaisonContact: '钱安全13000130012',
    }),
  },
  {
    id: 'p-east-apron',
    shortName: '东职站坪',
    hidden: false,
    projectCode: '',
    status: '前期',
    personInCharge: '戴毅峰',
    constructionPeriodStart: '',
    constructionPeriodEnd: '',
    ...createProjectFields({
      projectName: '空港区截中心配套站坪、竖和站坪及机务区地基处理工程项目',
      status: '前期',
      personInCharge: '戴毅峰',
      contractorUnit: '广东建工集团有限公司',
      supervisorUnit: '深圳监理公司',
      overview: '配套站坪、竖和站坪及机务区地基处理工程。',
      constructionSite: '东航站区站坪',
      peakPersonnelCount: '280',
      totalInvestment: '76000',
      buildingTotalArea: '58000',
      filingNumber: 'BA202504012',
      projectType: '民航专业工程',
      permitStatus: '已办理民航质监安监备案',
      deptHeadContact: '戴毅峰13500135001',
      projectManagerContact: '刘经理13300133009',
      safetyLiaisonContact: '吴安全13200132010',
    }),
  },
  {
    id: 'p-pump-002',
    shortName: '2号雨水泵站',
    hidden: false,
    projectCode: 't2-yushui-bengzhan-002',
    status: '在建',
    personInCharge: '裴云龙',
    constructionPeriodStart: '2026-05-15',
    constructionPeriodEnd: '2028-06-28',
    ...createProjectFields({
      projectName: '深圳宝安国际机场T2航站区及配套设施工程-新建2号雨水提升泵站工程',
      status: '在建',
      personInCharge: '裴云龙',
      constructionPeriodStart: '2026-05-15',
      constructionPeriodEnd: '2028-06-28',
      contractorUnit: '中国建筑第五工程局有限公司',
      supervisorUnit: '深圳市深水兆业工程顾问有限公司',
      subcontractorUnit: '/',
      overview: PUMP_OVERVIEW,
      constructionSite: '宝安机场九道',
      entryTime: '2026-05-15',
      plannedCompletionTime: '2028-06-28',
      peakPersonnelCount: '230',
      totalInvestment: '18500',
      buildingTotalArea: '8600',
      filingNumber: '',
      projectType: '房屋市政工程',
      permitStatus: '未办理',
      permitPhoto: '',
      deptHeadContact: '胡阳13420969080',
      projectManagerContact: '裴云龙18588955314',
      safetyLiaisonContact: '李庆福13510343400',
      safetyProfile: mergeSafetyProfile({
        siteClearance: {
          clearanceHeightInvolved: '否',
          clearanceHeightRequirement: '/',
        },
        siteNewEnergyCharging: {
          enabled: '否',
          pileCount: '',
          installQualified: '',
          parkingCount: '',
        },
        siteElectricBicycle: {
          enabled: '否',
          socketCount: '',
          installQualified: '',
          parkingCount: '',
        },
        camp: {
          hasCamp: '是',
          campAddress: '深圳市宝安区福永街道机场九道',
          campOccupiedArea: '22000',
          campTotalPeople: '280',
          campBuildingCount: '26',
          campBuildingMaterialOk: '否',
          campHasCanteen: '是',
          canteenFuelType: '电气',
        },
        campNewEnergyCharging: {
          enabled: '是',
          pileCount: '2',
          installQualified: '是',
          parkingCount: '5',
        },
        campElectricBicycle: {
          enabled: '否',
          socketCount: '0',
          installQualified: '是',
          parkingCount: '0',
        },
        generalContractor: {
          unitName: '中国建筑第五工程局有限公司',
          legalPersonContact: '叶传雄13675000757',
          companySafetyDirectorContact: '刘建平13626007119',
          projectLeaderContact: '裴云龙18588955314',
          safetyDirectorContact: '李庆福13510343400',
          safetyManagerContact: '陈步青18050053666',
        },
        supervisorUnit: {
          superiorManagementUnit: '深圳市深水兆业工程顾问有限公司',
          chiefSupervisorContact: '胡阳13420969080',
        },
      }),
    }),
  },
  {
    id: 'p-003',
    shortName: '三跑道扩建',
    hidden: false,
    projectCode: 'sanpaodao',
    status: '在建',
    personInCharge: '赵磊',
    constructionPeriodStart: '2024-01-15',
    constructionPeriodEnd: '2029-03-31',
    ...createProjectFields({
      projectName: '深圳机场三跑道扩建工程',
      status: '在建',
      personInCharge: '赵磊',
      constructionPeriodStart: '2024-01-15',
      constructionPeriodEnd: '2029-03-31',
      contractorUnit: '广东建工集团有限公司',
      supervisorUnit: '深圳监理公司',
      subcontractorUnit: '/',
      overview: '三跑道土石方、地基处理及跑道主体工程施工。',
      constructionSite: '三跑道施工区',
      entryTime: '2024-01-15',
      plannedCompletionTime: '2029-03-31',
      peakPersonnelCount: '980',
      totalInvestment: '520000',
      buildingTotalArea: '125000',
      filingNumber: 'BA202401003',
      projectType: '民航专业工程',
      permitStatus: '已办理施工许可证',
      permitPhoto: '施工许可证-三跑道.jpg',
      deptHeadContact: '赵磊13500135000',
      projectManagerContact: '刘经理13300133009',
      safetyLiaisonContact: '吴安全13200132010',
    }),
  },
]

export function getProjectDetail(projectId) {
  const project = projectList.find((item) => item.id === projectId)
  if (!project) return null
  return { ...project, ...createProjectFields(project) }
}

export function getProjectSelectOptions() {
  return projectList
    .filter((item) => !item.hidden)
    .map((item) => ({
      id: item.id,
      name: item.projectName,
      shortName: item.shortName,
    }))
}

let projectIdSeq = 100

export function createEmptyProject() {
  const id = `p-new-${Date.now()}-${projectIdSeq++}`
  return {
    id,
    shortName: '',
    hidden: false,
    projectCode: id,
    status: '在建',
    personInCharge: '',
    constructionPeriodStart: '',
    constructionPeriodEnd: '',
    ...createProjectFields(),
  }
}

export function deriveShortName(projectName) {
  const text = String(projectName || '').trim()
  if (!text) return ''
  return text.length > 12 ? `${text.slice(0, 12)}…` : text
}

export function formatConstructionPeriod(row) {
  const start = row.constructionPeriodStart || row.entryTime || ''
  const end = row.constructionPeriodEnd || row.plannedCompletionTime || ''
  if (start && end) return `${start} ~ ${end}`
  if (start || end) return start || end
  return ''
}

/** 项目总投资(万元)：右对齐千分位；空显示「—」 */
export function formatTotalInvestment(value) {
  if (value === '' || value === null || value === undefined) return '—'
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return num.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

/** 建设单位项目经理：从 projectManagerContact 提取用户名称 */
export function displayProjectManagerName(row) {
  const text = String(row?.projectManagerContact || '').trim()
  if (!text) return ''
  const slashParts = text.split(/\s*\/\s*/)
  if (slashParts.length >= 2) {
    const phone = slashParts[slashParts.length - 1].trim()
    if (/\d{7,}/.test(phone)) {
      return slashParts.slice(0, -1).join(' / ').trim()
    }
  }
  const glued = text.match(/^(.+?)(\d{11})$/)
  if (glued) return glued[1].trim()
  return text
}

/** 项目画像必填校验：项目名称、项目简称、项目经理 */
export function validateProjectPortraitRequired(data) {
  if (!String(data?.projectName || '').trim()) {
    return { ok: false, msg: '请填写项目名称' }
  }
  if (!String(data?.shortName || '').trim()) {
    return { ok: false, msg: '请填写项目简称' }
  }
  const manager = parseOneContact(data?.projectManagerContact)
  if (!manager.name || !manager.phone) {
    return { ok: false, msg: '请选择项目经理（项目负责人）' }
  }
  if (!findSysUserByContact(manager.name, manager.phone)) {
    return { ok: false, msg: '项目经理须从系统用户中选择' }
  }
  return { ok: true, msg: '' }
}

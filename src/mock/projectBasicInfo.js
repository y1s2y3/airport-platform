import { mergeSafetyProfile } from './projectSafetyProfile'

export const projectTypeOptions = ['房屋市政工程', '交通工程', '水利工程', '机场内部配套工程', '其他']
export const permitStatusOptions = ['已办理', '未办理', '办理中']

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
    entryTime: '',
    plannedCompletionTime: '',
    peakPersonnelCount: '',
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
    id: 'p-pump-002',
    shortName: '2号雨水泵站',
    hidden: false,
    projectCode: 't2-yushui-bengzhan-002',
    ...createProjectFields({
      projectName: '深圳宝安国际机场T2航站区及配套设施工程-新建2号雨水提升泵站工程',
      contractorUnit: '中国建筑第五工程局有限公司',
      supervisorUnit: '深圳市深水兆业工程顾问有限公司',
      subcontractorUnit: '/',
      overview: PUMP_OVERVIEW,
      constructionSite: '宝安机场九道',
      entryTime: '2026-05-15',
      plannedCompletionTime: '2028-06-28',
      peakPersonnelCount: '230',
      projectType: '房屋市政工程',
      permitStatus: '未办理',
      permitPhoto: '',
      deptHeadContact: '胡阳13420969080',
      projectManagerContact: '裴云龙18588955314',
      safetyLiaisonContact: '李庆福13510343400',
      safetyProfile: mergeSafetyProfile({
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
    id: 'p-000',
    shortName: 'T2项目',
    hidden: false,
    projectCode: 't2hangzhanqunuew',
    ...createProjectFields({
      projectName: '宝安国际机场T2航站区及配套工程',
      contractorUnit: '中建三局第一建设工程有限责任公司',
      supervisorUnit: '深圳市政监理有限公司',
      subcontractorUnit: '深圳市政集团有限公司',
      overview: 'T2航站区及配套工程总体建设，含航站楼主体、站坪及配套市政设施。',
      constructionSite: '宝安国际机场T2航站区',
      entryTime: '2025-03-01',
      plannedCompletionTime: '2028-12-31',
      peakPersonnelCount: '1850',
      projectType: '房屋市政工程',
      permitStatus: '已办理',
      permitPhoto: '施工许可证-T2.jpg',
      deptHeadContact: '姚远东13800138000',
      projectManagerContact: '王建国13800138001',
      safetyLiaisonContact: '李安全13900139002',
    }),
  },
  {
    id: 'p-001',
    shortName: 'T1航站区配套',
    hidden: false,
    projectCode: 't1hangzhanqu',
    ...createProjectFields({
      projectName: '深圳宝安国际机场T1航站区及配套设施工程项目',
      contractorUnit: '中建三局',
      supervisorUnit: '深圳监理公司',
      subcontractorUnit: '深圳广田装饰集团股份有限公司',
      overview: 'T1航站区及配套设施改造与扩建工程。',
      constructionSite: 'T1航站区',
      entryTime: '2024-06-01',
      plannedCompletionTime: '2027-06-30',
      peakPersonnelCount: '620',
      projectType: '房屋市政工程',
      permitStatus: '已办理',
      permitPhoto: '施工许可证-T1.jpg',
      deptHeadContact: '李明13600136000',
      projectManagerContact: '郑经理13300133000',
      safetyLiaisonContact: '冯安全12700127000',
    }),
  },
  {
    id: 'p-003',
    shortName: '三跑道扩建',
    hidden: false,
    projectCode: 'sanpaodao',
    ...createProjectFields({
      projectName: '深圳机场三跑道扩建工程',
      contractorUnit: '广东建工集团有限公司',
      supervisorUnit: '深圳监理公司',
      subcontractorUnit: '/',
      overview: '三跑道土石方、地基处理及跑道主体工程施工。',
      constructionSite: '三跑道施工区',
      entryTime: '2024-01-15',
      plannedCompletionTime: '2029-03-31',
      peakPersonnelCount: '980',
      projectType: '交通工程',
      permitStatus: '已办理',
      permitPhoto: '施工许可证-三跑道.jpg',
      deptHeadContact: '赵磊13500135000',
      projectManagerContact: '刘经理13300133009',
      safetyLiaisonContact: '吴安全13200132010',
    }),
  },
  {
    id: 'p-004',
    shortName: '综合配套区',
    hidden: false,
    projectCode: 'zonghepeitao',
    ...createProjectFields({
      projectName: '综合配套区市政工程',
      contractorUnit: '中铁建工集团华南分公司',
      supervisorUnit: '深圳市政监理有限公司',
      subcontractorUnit: '/',
      overview: '综合配套区道路、管网、绿化及附属工程施工。',
      constructionSite: '综合配套区',
      entryTime: '2024-06-01',
      plannedCompletionTime: '2026-07-31',
      peakPersonnelCount: '320',
      projectType: '房屋市政工程',
      permitStatus: '已办理',
      permitPhoto: '施工许可证-配套区.jpg',
      deptHeadContact: '周静13400134000',
      projectManagerContact: '孙经理13100131011',
      safetyLiaisonContact: '钱安全13000130012',
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
    ...createProjectFields(),
  }
}

export function deriveShortName(projectName) {
  const text = String(projectName || '').trim()
  if (!text) return ''
  return text.length > 12 ? `${text.slice(0, 12)}…` : text
}

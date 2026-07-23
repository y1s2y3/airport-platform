/** 项目名录（轻量，供管理端/质量验评与 COC 共用，避免拉起整包 coc/mock/data） */
export const PROJECT_NAMES = [
  '宝安国际机场T2航站区及配套工程',
  '深圳宝安国际机场T1航站区及配套设施工程项目',
  'T1航站楼地块土地整备项目拆除工程',
  '深圳机场二跑道FOD探测工程',
  '深圳机场二跑道新增跑道状态灯工程',
  '深圳机场第二跑道停航窗口期改造项目',
  '深圳机场东北站坪项目',
  '深圳机场东北站坪软基处理工程',
  '深圳机场T2航站楼旅客过夜用房项目',
  '深圳机场T4(现名T2)航站区软基处理工程范围内历史遗留',
  'T2口岸联检设备工程项目',
  'T2航站区及配套设施工程空侧捷运线(延长段)项目',
  'T2航站区及配套设施工程飞行区5、6号下穿通道工程',
  'T2航站区及配套设施工程航站楼基础工程',
  'T2航站区及配套设施工程新建2号雨水提升泵站工程',
  '深圳机场三跑道扩建工程(机场工程)',
  '深圳机场综合保税区一期工程项目',
  '深圳机场东综合交通枢纽工程项目',
  '深圳机场卫星厅配套站坪工程项目',
  '深圳机场南货运区改扩建工程项目',
  '深圳机场国际货站扩建工程项目',
  '深圳机场公务机坪建设工程项目',
  '深圳机场飞行区除冰坪建设工程项目',
  '深圳机场围界安防系统升级工程项目',
  '深圳机场航站楼行李系统改造项目',
  '深圳机场空管塔台配套工程项目',
  '深圳机场消防救援站建设工程项目',
  '深圳机场能源中心扩建工程项目',
  '深圳机场污水处理站提标改造项目',
  '深圳机场道路及管网配套工程项目',
  '深圳机场绿化景观提升工程项目',
  '深圳机场智慧工地试点工程项目',
  '深圳机场临时设施标准化建设项目',
  '深圳机场施工便道及堆场工程项目',
  '深圳机场材料堆场标准化建设项目',
  '深圳机场施工用电配套工程项目',
  '深圳机场施工用水配套工程项目',
  '深圳机场施工通信网络覆盖工程项目',
  '深圳机场大型机械设备停放场项目',
  '深圳机场安全体验教育基地建设项目',
]

export const PROJECT_SHORT_NAMES = [
  'T2航站区配套',
  'T1航站区配套',
  'T1土地整备拆除',
  '二跑道FOD探测',
  '二跑道状态灯',
  '二跑道停航改造',
  '东北站坪',
  '东北站坪软基',
  'T2过夜用房',
  'T2软基历史遗留',
  'T2口岸联检',
  'T2空侧捷运线',
  'T2下穿通道',
  'T2航站楼基础',
  'T2雨水泵站',
  '三跑道扩建',
  '综保区一期',
  '东综合枢纽',
  '卫星厅站坪',
  '南货运区改扩建',
  '国际货站扩建',
  '公务机坪',
  '除冰坪',
  '围界安防升级',
  '行李系统改造',
  '空管塔台配套',
  '消防救援站',
  '能源中心扩建',
  '污水处理提标',
  '道路管网配套',
  '绿化景观提升',
  '智慧工地试点',
  '临时设施标准化',
  '施工便道堆场',
  '材料堆场标准化',
  '施工用电配套',
  '施工用水配套',
  '施工通信覆盖',
  '机械停放场',
  '安全教育基地',
]

const PROJECT_SHORT_NAME_BY_FULL = Object.fromEntries(
  PROJECT_NAMES.map((name, i) => [name, PROJECT_SHORT_NAMES[i]]),
)

export function projectNamePair(index) {
  const i = ((index % PROJECT_NAMES.length) + PROJECT_NAMES.length) % PROJECT_NAMES.length
  return {
    projectName: PROJECT_NAMES[i],
    projectShortName: PROJECT_SHORT_NAMES[i],
  }
}

export function getProjectShortName(source) {
  if (source == null) return ''
  if (typeof source === 'object') {
    if (source.shortName) return source.shortName
    if (source.projectShortName) return source.projectShortName
    if (source.name) return PROJECT_SHORT_NAME_BY_FULL[source.name] || source.name
    if (source.projectName) return PROJECT_SHORT_NAME_BY_FULL[source.projectName] || source.projectName
    if (source.id?.startsWith('p-')) {
      const idx = Number.parseInt(source.id.slice(2), 10)
      if (!Number.isNaN(idx)) return PROJECT_SHORT_NAMES[idx] || source.id
    }
    return ''
  }
  if (typeof source === 'string') {
    if (source.startsWith('p-')) {
      const idx = Number.parseInt(source.slice(2), 10)
      if (!Number.isNaN(idx)) return PROJECT_SHORT_NAMES[idx] || source
    }
    return PROJECT_SHORT_NAME_BY_FULL[source] || source
  }
  return ''
}

export function getProjectFullName(source) {
  if (source == null) return ''
  if (typeof source === 'object') {
    if (source.name) return source.name
    if (source.projectName) return source.projectName
    if (source.id?.startsWith('p-')) {
      const idx = Number.parseInt(source.id.slice(2), 10)
      if (!Number.isNaN(idx)) return PROJECT_NAMES[idx] || source.id
    }
  }
  if (typeof source === 'string') {
    if (PROJECT_SHORT_NAME_BY_FULL[source]) return source
    if (source.startsWith('p-')) {
      const idx = Number.parseInt(source.slice(2), 10)
      if (!Number.isNaN(idx)) return PROJECT_NAMES[idx] || source
    }
  }
  return typeof source === 'string' ? source : ''
}

export const FOCUS_PROJECT_ID = 'p-011'
export const HQ_SELECTION_ID = 'hq'


export const COC_PROJECT_OPTIONS = PROJECT_NAMES.map((name, i) => ({
  id: `p-${String(i).padStart(3, '0')}`,
  label: PROJECT_SHORT_NAMES[i] || name,
  fullName: name,
}))

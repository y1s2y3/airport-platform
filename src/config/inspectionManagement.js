import { COC_PROJECT_OPTIONS } from './projectOptions.js'

/** 巡检管理公共配置 */
export const INSPECTION_CATEGORIES = ['安全', '质量']

/** 隐患等级独立于隐患类别，每条隐患单独选择。 */
export const HAZARD_LEVELS = ['Ⅰ重大隐患', 'Ⅱ重点关注的一般隐患', 'Ⅲ一般隐患']

/** 巡检业务检查类型（与安全/质量“巡检分类”相互独立）。 */
export const INSPECTION_TYPES = [
  '第三方检查',
  '值班检查',
  '部门检查',
  '联合检查',
  '上级检查',
  '视频检查',
  '复查',
  '第三方飞检',
]

/** 巡检发现隐患时使用的统一隐患类别。 */
export const HAZARD_CATEGORIES = [
  '跑道侵入',
  '净空安全',
  '空防安全',
  '三防',
  'FOD',
  '个人安全防护',
  '临边洞口',
  '安全管理',
  '攀登作业',
  '文明施工',
  '施工升降机',
  '施工_安全资料',
  '施工机具',
  '施工消防',
  '施工用电',
  '模板支撑',
  '监理安全资料',
  '脚手架与操作平台',
  '起重吊装',
  '动火作业',
  '鸟防',
  '基坑工程',
  '有限空间',
  '高处作业',
  '交通安全',
]

/** 兼容未保存隐患类别的历史记录。 */
export function normalizeHazardCategory(value) {
  return HAZARD_CATEGORIES.includes(value) ? value : '安全管理'
}

/** 兼容历史任务：旧数据未保存检查类型时按“值班检查”展示。 */
export function normalizeInspectionType(value) {
  return INSPECTION_TYPES.includes(value) ? value : '值班检查'
}

/** 项目巡检任务默认推送给监理，表单仍允许修改。 */
export const DEFAULT_INSPECTOR = {
  id: 'insp-supervisor',
  name: '陈工',
  role: '监理工程师',
  phone: '138****6001',
}

export const DEFAULT_INSPECTOR_LABEL = `${DEFAULT_INSPECTOR.name}（${DEFAULT_INSPECTOR.role}）`

/**
 * 将新旧巡检分类统一为数组。旧数据仍保留 inspectionCategory 字段，因此这里同时兼容
 * “安全、质量”、逗号分隔文本和单个分类。
 */
export function normalizeInspectionCategories(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value || '').split(/[、，,\s]+/)
  const result = [...new Set(raw.map((item) => String(item || '').trim()).filter((item) => INSPECTION_CATEGORIES.includes(item)))]
  return result.length ? result : ['安全']
}

export function formatInspectionCategories(value) {
  return normalizeInspectionCategories(value).join('、')
}

export function hasInspectionCategory(value, category) {
  return normalizeInspectionCategories(value).includes(category)
}

/** 巡检任务编号：安全 AQXJ、质量 ZLXJ、安全质量 AZXJ + 年月日 + 三位序号。 */
export function getInspectionTaskPrefix(categories = '安全') {
  const normalized = normalizeInspectionCategories(categories)
  if (normalized.length > 1) return 'AZXJ'
  return normalized[0] === '质量' ? 'ZLXJ' : 'AQXJ'
}

export function buildInspectionTaskNo(categories = '安全', date = new Date(), sequence = 1) {
  const prefix = getInspectionTaskPrefix(categories)
  const dateText = typeof date === 'string'
    ? date.replace(/-/g, '').slice(0, 8)
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return `${prefix}${dateText}${String(sequence).padStart(3, '0')}`
}

/** 页面示例项目名称与项目配置 ID 的对应关系。 */
export const INSPECTION_PROJECT_ID_BY_NAME = {
  '飞行区跑道延长工程': 'p-000',
  'T3航站楼扩建工程': 'p-001',
  'T3 航站楼扩建工程': 'p-001',
  '新货运站建设工程': 'p-003',
  '综合配套区工程': 'p-004',
  '捷运系统工程': 'p-005',
  '机场北片区路网工程': 'p-004',
}

export function resolveInspectionProjectId(projectIdOrName = '') {
  if (String(projectIdOrName).startsWith('p-')) return projectIdOrName
  const catalogProject = COC_PROJECT_OPTIONS.find(project =>
    project.label === projectIdOrName || project.fullName === projectIdOrName,
  )
  return INSPECTION_PROJECT_ID_BY_NAME[projectIdOrName] || catalogProject?.id || 'p-000'
}

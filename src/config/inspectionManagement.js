import { COC_PROJECT_OPTIONS } from './projectOptions.js'
import { reactive, watch } from 'vue'
import { mergeInspectionHazardCategoryExamples } from '../mock/inspectionHazardCategoryExamples.js'

/** 巡检管理公共配置 */
export const INSPECTION_CATEGORIES = ['安全', '质量', '其他']

/** 隐患等级独立于隐患类别，每条隐患单独选择。 */
export const HAZARD_LEVELS = ['Ⅰ重大隐患', 'Ⅱ重点关注的一般隐患', 'Ⅲ一般隐患']

/** 检查类型供安全、质量、其他共用。 */
export const INSPECTION_TYPES = Object.freeze([
  '第三方检查',
  '值班检查',
  '部门检查',
  '联合检查',
  '上级检查',
  '视频检查',
  '复查',
  '第三方飞检',
])

export const QUALITY_HAZARD_LEVELS = ['A', 'B', 'C']
export function getHazardLevels(category = '') {
  if (!category) return [...HAZARD_LEVELS, ...QUALITY_HAZARD_LEVELS]
  return category === '质量' ? QUALITY_HAZARD_LEVELS : HAZARD_LEVELS
}

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

const DICTIONARY_KEY = 'airport-inspection-dictionaries-v1'
function loadDictionaries() {
  let value
  try {
    const saved = JSON.parse(localStorage.getItem(DICTIONARY_KEY) || 'null')
    if (Array.isArray(saved?.types) && Array.isArray(saved?.hazards)) value = saved
  } catch { /* 首次使用或历史缓存损坏时使用初始字典。 */ }
  value ||= {
    types: INSPECTION_TYPES.map((name, index) => ({ id: `type-${index}`, name, sort: index + 1, enabled: true, remark: '' })),
    hazards: HAZARD_CATEGORIES.map((name, index) => ({ id: `hazard-${index}`, name, category: '安全', sort: index + 1, enabled: true, remark: '' })),
  }
  if (!value.hazardExamplesVersion) {
    value.hazards = mergeInspectionHazardCategoryExamples(value.hazards)
    value.hazardExamplesVersion = 1
  }
  return value
}
export const inspectionDictionaries = reactive(loadDictionaries())
export function getInspectionTypeFilterOptions(records = []) {
  return [...new Set([
    ...INSPECTION_TYPES,
    ...records.map(item => item.inspectionType).filter(Boolean),
  ])]
}
watch(inspectionDictionaries, (value) => {
  try { localStorage.setItem(DICTIONARY_KEY, JSON.stringify(value)) } catch { /* 无存储权限时仍可使用当前会话。 */ }
}, { deep: true, immediate: true })
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  if (event.key !== DICTIONARY_KEY || !event.newValue) return
  try {
    const value = JSON.parse(event.newValue)
    if (Array.isArray(value.types) && Array.isArray(value.hazards) && JSON.stringify(value) !== JSON.stringify(inspectionDictionaries)) {
      inspectionDictionaries.types = value.types
      inspectionDictionaries.hazards = value.hazards
    }
  } catch { /* 忽略其他窗口的无效缓存。 */ }
})

export function getHazardCategoryOptions(category = '', includeDisabled = false) {
  return inspectionDictionaries.hazards
    .filter(item => INSPECTION_CATEGORIES.includes(item.category) && (!category || item.category === category) && (includeDisabled || item.enabled))
    .sort((a, b) => a.sort - b.sort)
    .map(item => ({ value: item.name, label: category ? item.name : `${item.category} / ${item.name}`, category: item.category }))
}

export function getHazardCategoryFilterOptions(category = '') {
  return getHazardCategoryOptions('', true)
    .filter(option => !category || option.category === category)
    .map(({ label }) => ({ label, value: label }))
}

export function matchesHazardCategoryFilter(row, selected) {
  if (!selected) return true
  return normalizeInspectionCategories(row.inspectionCategories || row.inspectionCategory)
    .some(category => `${category} / ${row.hazardCategory}` === selected)
}

export function saveInspectionDictionary(kind, entry) {
  const list = inspectionDictionaries[kind]
  if (!['types', 'hazards'].includes(kind) || !Array.isArray(list)) throw new Error('配置类型无效')
  const name = String(entry.name || '').trim()
  if (!name) throw new Error('请输入名称')
  if (kind === 'hazards' && !INSPECTION_CATEGORIES.includes(entry.category)) throw new Error('请选择巡检分类')
  if (list.some(item => item.id !== entry.id && item.name === name && (kind === 'types' || item.category === entry.category))) throw new Error('同一范围内名称不能重复')
  const existing = list.find(item => item.id === entry.id)
  const value = { ...entry, name, sort: Math.max(0, Number(entry.sort) || 0), enabled: entry.enabled !== false }
  if (existing) Object.assign(existing, value)
  else list.push({ ...value, id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` })
}

export function validateInspectionHazard(hazard, category) {
  if (!INSPECTION_CATEGORIES.includes(category)) return '请先选择一个巡检分类；历史复合分类任务请先由指挥部重新分类'
  if (!getHazardCategoryOptions(category).some(item => item.value === hazard.hazardCategory)) return '请选择当前巡检分类下已启用的隐患类别'
  if (!getHazardLevels(category).includes(hazard.hazardLevel)) return '请选择当前巡检分类对应的隐患等级'
  return ''
}

/** 兼容未保存隐患类别的历史记录。 */
export function normalizeHazardCategory(value) {
  return value || ''
}

/** 兼容历史任务：旧数据未保存检查类型时按“值班检查”展示。 */
export function normalizeInspectionType(value) {
  return value || '值班检查'
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
  // 已停用分类仅用于历史回显，不能在新增表单选择。
  const result = [...new Set(raw.map((item) => String(item || '').trim()).filter((item) => [...INSPECTION_CATEGORIES, '生态文明'].includes(item)))]
  return result.length ? result : ['安全']
}

export function formatInspectionCategories(value) {
  return normalizeInspectionCategories(value).join('、')
}

export function hasInspectionCategory(value, category) {
  return normalizeInspectionCategories(value).includes(category)
}

/** 新任务三类独立编号；历史停用分类及复合分类编号仅保留兼容。 */
export function getInspectionTaskPrefix(categories = '安全') {
  const normalized = normalizeInspectionCategories(categories)
  if (normalized.length > 1) return 'AZXJ'
  return { 安全: 'AQXJ', 质量: 'ZLXJ', 生态文明: 'STWMXJ', 其他: 'QTXJ' }[normalized[0]] || 'AQXJ'
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

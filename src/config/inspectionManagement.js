/** 巡检管理公共配置 */
export const INSPECTION_CATEGORIES = ['安全', '质量']

/** 项目巡检任务默认推送给监理，表单仍允许修改。 */
export const DEFAULT_INSPECTOR = {
  id: 'insp-supervisor',
  name: '陈工',
  role: '监理工程师',
  phone: '138****6001',
}

export const DEFAULT_INSPECTOR_LABEL = `${DEFAULT_INSPECTOR.name}（${DEFAULT_INSPECTOR.role}）`

/** 巡检任务编号：安全 AQXJ、质量 ZLXJ + 年月日 + 三位序号。 */
export function buildInspectionTaskNo(category = '安全', date = new Date(), sequence = 1) {
  const prefix = category === '质量' ? 'ZLXJ' : 'AQXJ'
  const dateText = typeof date === 'string'
    ? date.replace(/-/g, '').slice(0, 8)
    : `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
  return `${prefix}${dateText}${String(sequence).padStart(3, '0')}`
}

/** 巡检计划编号：安全 AQXJ、质量 ZLXJ + 年月日 + 三位序号。 */
export function buildInspectionPlanNo(category = '安全', date = new Date(), sequence = 1) {
  return buildInspectionTaskNo(category, date, sequence)
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
  return INSPECTION_PROJECT_ID_BY_NAME[projectIdOrName] || 'p-000'
}

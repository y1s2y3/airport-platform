/** v4 inspection rules. Legacy records remain lossless; new branches are saved on demand. */
const DEFAULT_INSTRUCTIONS = '1.标黄为当日调度会统一进行调度的项目；2.项目部值班人员、项目经理检查情况须当日值班人员和项目经理填写'
export const instructionText = hq => typeof hq?.instructions === 'string' ? hq.instructions : DEFAULT_INSTRUCTIONS
export const CHECK_FIELDS = ['safety', 'quality', 'camera']
export const FIELD_LABELS = { personnel: '人员履职', safety: '安全检查情况', quality: '质量检查情况', camera: '摄像头检查情况', remark: '备注', unified: '当日统一调度' }
export const PART_LABELS = { duty: '项目部值班人员检查情况', manager: '项目经理检查情况' }
export const NORMAL_PROJECT_TEXT = '现场施工、监理管理人员在岗在位，施工正常'
export const clone = value => JSON.parse(JSON.stringify(value))
export const text = value => String(value ?? '').trim()
export const problemText = value => typeof value === 'string' ? text(value) : text(value?.text)
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
export function offsetDate(date, amount) { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + amount); return localDate(d) }
// 每日检查与检查统计均含当天向前共30个自然日；保留视图参数兼容现有调用。
export function viewDefaultRange(_view, today = localDate()) {
  return [offsetDate(today, -29), today]
}
export const emptyCheck = () => ({ schemaVersion: 4, type: '', normalText: '', normalImages: [], problems: [], other: '', otherImages: [] })
export const emptyPerson = () => ({ schemaVersion: 4, userId: '', name: '', check: emptyCheck(), version: 0, firstSubmittedAt: '', updatedAt: '', operator: null })
export const emptyRow = project => ({ projectId: project.id, projectName: project.projectName || project.label || project.shortName, unified: false })
export function emptyDay(date, projects, createdAt = new Date().toISOString()) {
  return { date, createdAt, hq: { headers: { focusDepartment: '', attendance: '', dispatcher: '', departmentAttendance: '' }, rows: projects.map(emptyRow), note: '', version: 0, firstSubmittedAt: '', updatedAt: '', operator: null }, people: {} }
}
export const isLegacyCheck = value => !!value && value.schemaVersion !== 4 && (value.type === 'ok' || (value.problems || []).some(item => typeof item === 'string'))
export const isLegacyPerson = value => !!value?.firstSubmittedAt && value.schemaVersion !== 4
// Only this section's committed business state can stop first-save prefill.
export const hqHasBeenSaved = hq => Number(hq?.version) > 0 || !!hq?.firstSubmittedAt
export function hqDraftForEditing(day) {
  const draft = { ...clone(day.hq), note: day.hq.note ?? '', scopeChanges: { addedIds: [], removedIds: [] } }
  if (hqHasBeenSaved(draft) || !Array.isArray(day.hqPrefillProjectIds)) return draft
  draft.headers.attendance ||= '参会'; draft.headers.departmentAttendance ||= '参会'
  const selected = new Set(day.hqPrefillProjectIds)
  for (const row of draft.rows) {
    if (!selected.has(row.projectId)) continue
    row.unified = true
    if (!row.personnel?.type && !text(row.personnel?.text)) row.personnel = { type: 'normal', text: '' }
    for (const key of CHECK_FIELDS) if (!row[key]?.type && !(row[key]?.problems || []).some(problemText) && !text(row[key]?.other)) row[key] = { ...emptyCheck(), type: 'normal' }
  }
  return draft
}
export function checkText(check) {
  if (check?.type === 'normal') return text(check.normalText) || '正常'
  if (check?.type === 'problem') return (check.problems || []).filter(p => problemText(p)).map((p, i) => `${i + 1}. ${problemText(p)}`).join('\n')
  return check?.type === 'other' ? text(check.other) : ''
}
export function checkImages(check) {
  if (check?.type === 'problem') return (check.problems || []).flatMap(p => typeof p === 'object' ? p.images || [] : [])
  return check?.type === 'normal' ? check.normalImages || [] : check?.type === 'other' ? check.otherImages || [] : []
}
export const personnelText = value => value?.type === 'normal' ? '正常' : value?.type === 'ok' ? '√' : value?.type === 'other' ? text(value.text) : ''
export const personText = part => part?.schemaVersion === 4 ? checkText(part.check) : text(part?.text)
export const personImages = part => part?.schemaVersion === 4 ? checkImages(part.check) : part?.images || []
export const personFilled = part => !!part?.firstSubmittedAt
export function rowHasContent(row, people = {}) {
  return !!(row && (row.hasSubmittedContent || row.unified || row.personnel?.type || text(row.personnel?.text) || CHECK_FIELDS.some(k => row[k]?.type || checkImages(row[k]).length) || text(row.remark?.text) || row.remark?.images?.length)) || Object.values(people).some(p => p?.firstSubmittedAt || text(p?.name) || text(p?.text) || p?.images?.length || checkImages(p?.check).length)
}
export function deletionReason(row, people = {}, persistedRow, initialRow) {
  if (persistedRow && rowHasContent(persistedRow, people) || Object.values(people).some(p => p?.firstSubmittedAt || personImages(p).length)) return '该项目已有已保存内容、调度标记或附件，无法删除'
  if (row?._manualEdited) return '该项目存在人工填写内容，请保留该项目'
  if (initialRow && JSON.stringify(row) === JSON.stringify(initialRow)) return ''
  return rowHasContent(row, people) ? '该项目存在实际填写内容，无法删除' : ''
}
export function validateImages(images = [], required = false) {
  if (!Array.isArray(images) || images.length > 9) return '图片最多上传9张'
  if (required && !images.length) return '请至少上传1张检查情况截图'
  if (images.some(i => !/^data:image\/(?:png|jpe?g|gif|webp|bmp|svg\+xml)[;,]/i.test(i?.url || '') || !Number.isFinite(i?.size) || i.size < 0 || i.size > 5 * 1024 * 1024)) return '请使用有效图片，单张不得超过5MB'
  return ''
}
export function checkErrors(value, { required = false, imagesRequired = false } = {}) {
  const errors = {}
  if (!value?.type) { if (required) errors.type = '请选择检查情况'; return errors }
  if (!['normal', 'problem', 'other'].includes(value.type)) return { type: '检查选项无效' }
  if (value.type === 'problem') {
    if (!Array.isArray(value.problems)) return { problems: '问题清单格式无效' }
    if (value.problems.length < 1 || value.problems.length > 10) errors.problems = '请填写1～10条问题'
    for (const [i, p] of (value.problems || []).entries()) {
      if (!problemText(p)) errors[`problem-${i}`] = '请填写问题描述'
      else if (problemText(p).length > 500) errors[`problem-${i}`] = '问题描述不能超过500字'
      const images = p?.images || []
      const err = validateImages(images, true)
      if (err) errors[`images-${i}`] = err
    }
  } else {
    const content = value.type === 'normal' ? value.normalText : value.other
    if ((value.type === 'other' || required) && !text(content)) errors.text = '请填写具体检查情况'
    else if (value.type === 'other' && text(content).length > 500) errors.text = '检查情况不能超过500字'
    const err = validateImages(value.type === 'normal' ? value.normalImages || [] : value.otherImages || [], imagesRequired)
    if (err) errors.images = err
  }
  return errors
}
export const validateCheck = (value, label = '', options) => { const err = Object.values(checkErrors(value, options))[0]; return err ? `${label}${err}` : '' }
export function validateField(key, value) {
  if (CHECK_FIELDS.includes(key)) return validateCheck(value, FIELD_LABELS[key])
  if (key === 'personnel') {
    if (value?.type && !['normal', 'other'].includes(value.type)) return '人员履职选项无效'
    if (value?.type === 'other' && !text(value.text)) return '请填写人员履职具体情况'
    if (value?.type === 'other' && text(value.text).length > 100) return '人员履职不能超过100字'
  }
  if (key === 'remark') return text(value?.text).length > 100 ? '项目备注不能超过100字' : validateImages(value?.images)
  return ''
}
export function validateHq(hq, before) {
  if (['focusDepartment', 'attendance', 'dispatcher', 'departmentAttendance'].some(key => text(hq.headers?.[key]).length > 200)) return '表头字段不能超过200字'
  if (typeof hq.note !== 'string' || hq.note.length > 500) return '整体备注不能超过500字'
  if (!Array.isArray(hq.rows)) return '项目清单格式无效'
  const ids = new Set()
  for (const row of hq.rows) {
    if (!row || typeof row !== 'object') return '项目清单格式无效'
    if (!row.projectId || ids.has(row.projectId)) return '同日同项目不能重复添加'
    ids.add(row.projectId)
    for (const key of ['personnel', ...CHECK_FIELDS, 'remark']) {
      const old = before?.rows?.find(r => r.projectId === row.projectId)?.[key]
      if (old && JSON.stringify(old) === JSON.stringify(row[key]) && row[key]?.type !== 'problem') continue
      const error = validateField(key, row[key]); if (error) return `${row.projectName}：${error}`
    }
  }
  return ''
}
export function personErrors(part = {}) {
  part ||= {}
  return { ...(!text(part.userId) ? { name: '请选择启用的系统用户' } : {}), ...checkErrors(part.check, { required: true, imagesRequired: true }) }
}
export const validatePerson = part => Object.values(personErrors(part))[0] || ''
/** Strip inactive branches, UI flags and readonly/foreign fields before persistence. */
export function activeCheck(check) {
  const result = { schemaVersion: 4, type: check?.type || '' }
  if (result.type === 'problem') result.problems = (check.problems || []).map(p => ({ text: problemText(p), images: clone(p.images || []) }))
  if (result.type === 'other') { result.other = text(check.other); result.otherImages = clone(check.otherImages || []) }
  if (result.type === 'normal') { result.normalText = text(check.normalText); result.normalImages = clone(check.normalImages || []) }
  return result
}
export function hqPayload(draft) {
  const headers = clone(draft.headers)
  headers.dispatcherId = text(headers.dispatcherId)
  if (!headers.dispatcherId) headers.dispatcher = ''
  return { headers, note: draft.note, scopeChanges: clone(draft.scopeChanges || { addedIds: [], removedIds: [] }), rows: draft.rows.map(row => ({ projectId: row.projectId, unified: !!row.unified, ...Object.fromEntries(['personnel', ...CHECK_FIELDS, 'remark'].filter(key => row[key] != null).map(key => [key, clone(row[key])])) })) }
}
export function checkPreview(check, limit = 2) {
  const items = check?.type === 'problem' ? (check.problems || []).map(problemText).filter(Boolean) : []
  return items.length ? { lines: items.slice(0, limit).map((p, i) => `${i + 1}. ${p}`), remaining: Math.max(0, items.length - limit) } : { lines: [checkText(check)].filter(Boolean), remaining: 0 }
}
export const SUMMARY_COLUMNS = [
  { key: 'date', label: '检查日期', width: 125 }, { key: 'focusDepartment', label: '重点调度部门', width: 180 },
  { key: 'attendance', label: '参会情况', width: 180 }, { key: 'dispatcher', label: '安质部调度人员', width: 150 },
  { key: 'departmentAttendance', label: '各部门参会情况', width: 210 }, { key: 'unified', label: '当日统一调度项目数', width: 175 },
  { key: 'projects', label: '检查项目', width: 320 }, { key: 'safetyQuality', label: '安全质量问题（项）', width: 170 },
  { key: 'camera', label: '摄像头问题（项）', width: 160 }, { key: 'updatedAt', label: '最近更新时间', width: 165 },
]
export function summaryColumns(keys = SUMMARY_COLUMNS.map(c => c.key)) { const set = new Set(['date', ...keys]); return SUMMARY_COLUMNS.filter(c => set.has(c.key)) }
export function summaryCell(row, key) { if (key === 'projects') return row.projects.join('\n') || '--'; if (key === 'updatedAt') return formatTime(row.updatedAt); return row[key] == null || row[key] === '' ? '--' : row[key] }
export function issueMetric(day, keys) {
  if (!day.hq.version) return null
  const checks = day.hq.rows.filter(r => r.unified).flatMap(r => keys.map(k => r[k]))
  const count = checks.reduce((n, c) => n + (c?.type === 'problem' ? (c.problems || []).filter(p => problemText(p)).length : 0), 0)
  return count > 0 ? count : checks.some(c => c?.type === 'normal') ? 0 : null
}
export function latestTime(day, projectId = '') {
  const parts = projectId ? [day.people?.[projectId] || {}] : Object.values(day.people || {})
  return [...(projectId ? [] : [day.hq.updatedAt]), ...parts.flatMap(p => ['duty', 'manager'].map(k => p[k]?.updatedAt))].filter(Boolean).sort().at(-1) || ''
}
export function dayStats(day) { return { unified: day.hq.version ? day.hq.rows.filter(r => r.unified).length : null, safetyQuality: issueMetric(day, ['safety', 'quality']), camera: issueMetric(day, ['camera']), updatedAt: latestTime(day) } }
export function formatTime(value) { if (!value) return '--'; const d = new Date(value); return `${localDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
export function summaryRows(days, range = []) {
  return days.filter(d => (!range?.[0] || d.date >= range[0]) && (!range?.[1] || d.date <= range[1])).sort((a, b) => b.date.localeCompare(a.date)).map(d => ({ date: d.date, exampleLabel: d.demoScenario || '', ...(d.hq.version ? d.hq.headers : {}), projects: d.hq.version ? d.hq.rows.filter(r => r.unified).map(r => r.projectName) : [], ...dayStats(d), hqFilled: !!d.hq.version, peopleFilled: Object.values(d.people || {}).some(p => Object.values(p).some(personFilled)) }))
}
export function totalMetric(rows, key) { const values = rows.map(r => r[key]).filter(Number.isInteger); return values.length ? values.reduce((a, b) => a + b, 0) : null }

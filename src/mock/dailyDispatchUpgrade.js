import { clone, emptyCheck, emptyPerson, CHECK_FIELDS } from '../utils/dailyDispatchCheckRules.js'
export const REVIEW_DATES = ['2026-10-24','2026-10-25','2026-10-26','2026-10-27']
export function upgradeInspectionDay(source, getUsers = () => []) {
  const day = clone(source)
  for (const row of [...day.hq.rows, ...Object.values(day.removedRows || {})]) {
    if (row.personnel?.type === 'ok') row.personnel = { ...row.personnel, type: 'normal' }
    for (const key of CHECK_FIELDS) if (row[key]) {
      const check = row[key]
      if (check.schemaVersion === 4 && !(check.problems || []).some(p => typeof p === 'string')) continue
      row[key] = { ...check, schemaVersion: 4, problems: (check.problems || []).map(p => typeof p === 'string' ? { text: p, images: [] } : p) }
    }
  }
  for (const [id, parts] of Object.entries(day.people || {})) for (const key of ['duty','manager']) {
    const part = parts[key]
    if (!part || part.schemaVersion === 4) continue
    const matches = getUsers(id).filter(user => user.name === part.name)
    const check = { ...emptyCheck(), type: part.text?.trim() || part.images?.length ? 'other' : '', other: part.text || '', otherImages: clone(part.images || []) }
    parts[key] = { ...part, schemaVersion: 4, userId: part.userId || (matches.length === 1 ? matches[0].id : ''), check }
    delete parts[key].text; delete parts[key].images
  }
  return day
}
export function fullReviewExample(source, projects, getUsers) {
  const day = clone(source), scenario = REVIEW_DATES.indexOf(day.date), at = day.date + 'T09:30:00.000Z'
  const operator = { id: 'inspection-example', name: '原型示例用户', loginAccount: 'inspection.example' }
  for (const project of projects.filter(p => !p.hidden)) if (!day.hq.rows.some(r => r.projectId === project.id)) day.hq.rows.push({ projectId: project.id, projectName: project.projectName || project.label })
  const image = (index) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="260"><rect width="480" height="260" fill="#f8f4f6"/><text x="20" y="65" font-size="24" fill="#8f0045">每日检查示例 '+day.date+'</text><text x="20" y="125" font-size="20">现场附件 '+index+'</text><text x="20" y="190" font-size="18">模拟数据，不代表真实现场</text></svg>'
    return { name: '示例现场-'+index+'.svg', url: 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg), size: new TextEncoder().encode(svg).length, kind: 'image' }
  }
  const check = (type, label, index, person = false) => ({ ...emptyCheck(), type, ...(type === 'normal' ? { normalText: person ? label+'：现场检查正常（模拟）' : '', normalImages: person ? [image(index)] : [] } : type === 'other' ? { other: label+'：按专项安排检查，记录实际情况（模拟）', otherImages: [image(index)] } : { problems: [{ text: label+'：临边防护需补齐（模拟）', images: [image(index)] }, { text: label+'：材料通道需清理（模拟）', images: [image(index+1)] }] }) })
  day.demo = true; day.demoScenario = ['统一调度正常／项目部不同结论','统一调度发现问题／项目部正常','统一调度其他／项目部混合结论','多项目多维度综合检查'][scenario]
  day.people ||= {}
  day.hq.rows.forEach((row, index) => {
    row.unified = scenario !== 3 || index % 3 !== 2
    row.personnel = { type: scenario === 2 || scenario === 3 && index % 2 ? 'other' : 'normal', text: scenario === 2 || scenario === 3 && index % 2 ? '人员按专项安排履职（模拟）' : '' }
    CHECK_FIELDS.forEach((field, column) => { row[field] = check(scenario === 0 ? 'normal' : scenario === 1 ? (column === index % 3 ? 'problem' : 'normal') : scenario === 2 ? 'other' : ['normal','problem','other'][(index+column)%3], ['安全','质量','摄像头'][column], index*10+column) })
    row.remark = { text: '项目现场检查记录已补充，按各填写部分独立记录（模拟）', images: index === 0 ? [image(90)] : [] }; row.hasSubmittedContent = true
    const users = getUsers(row.projectId).filter(user => user.status === true)
    day.people[row.projectId] ||= {}
    for (const [part, offset] of [['duty',0],['manager',1]]) {
      const user = users[Math.min(offset, users.length-1)]
      if (!user) continue
      const type = scenario === 1 ? 'normal' : ['problem','other','normal'][(index+offset+scenario)%3]
      day.people[row.projectId][part] = { ...emptyPerson(), userId: user?.id || '', name: user?.name || (offset ? '示例项目经理' : '示例值班人员'), check: check(type, offset ? '项目经理检查' : '值班人员检查', 100+index*2+offset, true), version: (day.people[row.projectId][part]?.version || 0)+1, firstSubmittedAt: at, updatedAt: at, operator }
    }
  })
  const dispatcher = getUsers('dispatch').find(user => user.status === true)
  Object.assign(day.hq, { version: (day.hq.version || 0)+1, firstSubmittedAt: at, updatedAt: at, operator, note: day.demoScenario+'。全部内容为原型示例，各部分独立保存。' })
  day.hq.headers = { focusDepartment:'安全质量管理部、项目管理部（模拟）', attendance:'参会', dispatcher:dispatcher?.name || '', dispatcherId:dispatcher?.id || '', departmentAttendance:'施工及监理人员参会（模拟）' }
  return day
}

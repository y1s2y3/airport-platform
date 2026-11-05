import { clone, emptyCheck, emptyPerson, rowHasContent, CHECK_FIELDS, NORMAL_PROJECT_TEXT, validateImages, validateHq, validatePerson, text } from '../utils/dailyDispatchCheckRules.js'
export function canPopulateExample(day) {
  return day?.demo === true && !day.hq.version && !day.hq.firstSubmittedAt && !day.hq.updatedAt && !day.dispatchDefaults && !Object.keys(day.people || {}).length && !day.hq.rows.some(row => rowHasContent(row))
}
export function createExampleDay(source, scenario, getUsers) {
  const day = clone(source), at = `${day.date}T09:30:00.000Z`, operator = { id: 'inspection-example', name: '原型示例用户', loginAccount: 'inspection.example' }
  const image = index => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280"><rect width="480" height="280" fill="#f8f4f6"/><text x="24" y="70" fill="#8f0045" font-size="24">每日调度检查 · 示例图片 ${index}</text><text x="24" y="125" font-size="18">检查日期：${day.date}</text><text x="24" y="190" font-size="18">仅用于原型展示，不代表真实现场</text></svg>`
    return { name: `示例现场-${index}.svg`, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), size: new TextEncoder().encode(svg).length, kind: 'image' }
  }
  const check = type => ({ ...emptyCheck(), type })
  const problem = (description, index) => ({ text: description + '（模拟）', images: [image(index)] })
  const names = ['正常检查与人员记录', '多项问题及逐条附图', '其他说明与停工情况', '部分填写的独立统计', '仅项目部检查已保存', '未调度问题不计统计', '明确保存未调度项目', '多项目及不同人员检查']
  day.demoScenario = names[scenario]
  const [a,b,c] = day.hq.rows
  if (!a) return day
  if (scenario !== 4) {
    const dispatcher = getUsers('dispatch').find(user => user.status === true)
    Object.assign(day.hq, { version: 1, firstSubmittedAt: at, updatedAt: at, operator, note: `原型示例：${names[scenario]}。所有数据均为模拟。` })
    Object.assign(day.hq.headers, { focusDepartment: '安质部、项目管理部（模拟）', attendance: '参会', dispatcher: dispatcher?.name || '', dispatcherId: dispatcher?.id || '', departmentAttendance: '参会' })
    for (const row of [a,b].filter(Boolean)) { row.unified = scenario !== 6; row.personnel = { type:'normal', text:'' }; for(const key of CHECK_FIELDS)row[key]=check('normal'); row.hasSubmittedContent = true }
  }
  if (scenario === 1) { a.safety = { ...check('problem'), problems: [problem('临边防护存在缺口，需补齐围护',1),problem('材料堆放占用通道',2)] }; a.quality={...check('problem'),problems:[problem('局部成品保护不到位',3)]}; a.camera={...check('problem'),problems:[problem('摄像头画面被遮挡',4),problem('夜间画面清晰度不足',5)]} }
  if (scenario === 2) for(const row of [a,b].filter(Boolean))for(const key of CHECK_FIELDS)row[key]={...check('other'),other:'阶段性停工，本次记录现场实际情况（模拟）'}
  if (scenario === 3) { for(const row of [a,b].filter(Boolean))for(const key of CHECK_FIELDS)delete row[key]; a.safety=check('normal') }
  if (scenario === 5 && c) { c.safety={...check('problem'),problems:[problem('非统一调度项目记录，不计本日问题数',5)]}; c.remark={text:'单项目备注，与整表备注独立（模拟）',images:[image(6)]}; c.hasSubmittedContent=true }
  for (const [index,row] of [a,b].filter(Boolean).entries()) {
    const members=getUsers(row.projectId).filter(user=>user.status===true)
    if(!members.length)continue
    day.people[row.projectId]={}
    for(const [part,personIndex]of [['duty',0],['manager',1]]) {
      if(scenario===3 || scenario===6 || scenario===2 || scenario===4&&part==='manager' || scenario===7&&part==='duty'&&index===1)continue
      const user=members[Math.min(personIndex,members.length-1)], value={...emptyPerson(),userId:user.id,name:user.name,version:1,firstSubmittedAt:at,updatedAt:at,operator,check:{...check('normal'),normalText:NORMAL_PROJECT_TEXT+'（模拟）',normalImages:[image(7+index)]}}
      if(scenario===1&&part==='duty')value.check={...check('problem'),problems:[problem('项目部检查发现现场防护需补充',9),problem('作业通道需清理',10)]}
      if(scenario===7&&part==='manager')value.check={...check('other'),other:'按专项检查安排补充现场情况（模拟）',otherImages:[image(11)]}
      day.people[row.projectId][part]=value
    }
  }
  return day
}


// These IDs identify factory fixtures, never actual users submitting through the UI.
export const isPrototypeExamplePart = part => ['inspection-example', 'demo-operator'].includes(part?.operator?.id)
const personParts = day => Object.values(day.people || {}).flatMap(parts => ['duty', 'manager'].map(key => parts?.[key]).filter(Boolean))
export const hasPrototypeExampleParts = day => isPrototypeExamplePart(day.hq) || personParts(day).some(isPrototypeExamplePart)
export function canPopulateReviewExample(day) {
  if (day.dispatchDefaults) return false
  const hqHasContent = day.hq.version || day.hq.firstSubmittedAt || day.hq.updatedAt || text(day.hq.note) || day.hq.rows.some(row => rowHasContent(row))
  if (hqHasContent && !isPrototypeExamplePart(day.hq)) return false
  return personParts(day).every(part => isPrototypeExamplePart(part) || !(part.version || part.firstSubmittedAt || text(part.name) || part.check?.type))
}
function repairImage(date, index) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="260"><rect width="480" height="260" fill="#f8f4f6"/><text x="20" y="65" font-size="24" fill="#8f0045">每日检查示例 ${date}</text><text x="20" y="125" font-size="20">逐条问题附件 ${index}</text><text x="20" y="190" font-size="18">模拟数据，不代表真实现场</text></svg>`
  return { name: `示例补图-${index}.svg`, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), size: new TextEncoder().encode(svg).length, kind: 'image' }
}
export function repairExampleDay(source, getUsers) {
  const day = clone(source)
  let imageIndex = 0
  const activeUsers = scope => getUsers(scope).filter(user => user.status === true)
  function repairCheck(check, person = false) {
    if (!check) return
    if (check.type === 'problem' && Array.isArray(check.problems)) {
      check.problems = check.problems.map(problem => {
        const value = typeof problem === 'string' ? { text: problem, images: [] } : problem
        if (validateImages(value.images, true)) value.images = [repairImage(day.date, imageIndex++)]
        return value
      })
    } else if (person && ['normal', 'other'].includes(check.type)) {
      const key = check.type === 'normal' ? 'normalImages' : 'otherImages'
      if (validateImages(check[key], true)) check[key] = [repairImage(day.date, imageIndex++)]
      if (check.type === 'normal' && !text(check.normalText)) check.normalText = NORMAL_PROJECT_TEXT + '（模拟）'
    }
  }
  if (isPrototypeExamplePart(day.hq)) {
    const users = activeUsers('dispatch'), selected = users.find(user => user.id === day.hq.headers.dispatcherId)
    if (!selected || !text(day.hq.headers.dispatcher)) {
      const user = selected || users[0]
      Object.assign(day.hq.headers, { dispatcherId: user?.id || '', dispatcher: user?.name || '' })
    }
    for (const row of day.hq.rows) for (const key of CHECK_FIELDS) repairCheck(row[key])
  }
  for (const [id, parts] of Object.entries(day.people || {})) for (const key of ['duty', 'manager']) {
    const part = parts[key]
    if (!isPrototypeExamplePart(part)) continue
    const users = activeUsers(id), selected = users.find(user => user.id === part.userId)
    if (!selected || !text(part.name)) {
      const user = selected || users.find(user => user.name === part.name) || users[0]
      if (user) Object.assign(part, { userId: user.id, name: user.name })
    }
    repairCheck(part.check, true)
  }
  return day
}
export function exampleValidationErrors(day, getUsers) {
  const errors = [], enabled = (scope, id) => getUsers(scope).some(user => user.status === true && user.id === id)
  if (isPrototypeExamplePart(day.hq)) {
    const error = validateHq(day.hq)
    if (error) errors.push('统一调度：' + error)
    const { dispatcherId, dispatcher } = day.hq.headers
    if (dispatcherId ? !enabled('dispatch', dispatcherId) : text(dispatcher)) errors.push('调度人员关联无效')
  }
  for (const [id, parts] of Object.entries(day.people || {})) for (const key of ['duty', 'manager']) {
    const part = parts[key]
    if (!isPrototypeExamplePart(part)) continue
    const error = validatePerson(part)
    if (error || !enabled(id, part.userId)) errors.push(id + '/' + key + '：' + (error || '用户关联无效'))
  }
  return errors
}

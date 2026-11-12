const clean = value => String(value ?? '').trim()
const projectKey = value => clean(value).replace(/\s+/g, '')

/** 责任单位只关联项目主数据，不把处罚单旧unit或指派人岗位当成施工单位。 */
export function penaltyResponsibleUnit(record, projects = []) {
  const projectId = clean(record?.projectId)
  if (projectId) {
    const project = projects.find(item => item.id === projectId)
    if (project) return clean(project.contractorUnit)
  }
  const name = projectKey(record?.project)
  if (!name) return ''
  const matches = projects.filter(item => [item.projectName, item.name, item.shortName]
    .some(value => projectKey(value) === name))
  return matches.length === 1 ? clean(matches[0].contractorUnit) : ''
}

/** 仅为用户给定的三类状态选择模板；不能证实为非手动关闭的历史单据不冒用模板。 */
export function penaltyTemplateKey(record) {
  if (record?.status === '处理中') return 'processing'
  if (record?.status === '待验收') return 'pendingAcceptance'
  if (record?.status !== '已关闭' || record.closeType === 'manual') return null
  if (['acceptance', 'appeal'].includes(record.closeType) || record.acceptedTime ||
    record.acceptedBy || record.appealResolution === '通过') return 'closed'
  return null
}

export function filterPenaltyRecords(records, filters = {}, projects = []) {
  const keyword = clean(filters.keyword), status = clean(filters.status), unit = clean(filters.unit)
  return (Array.isArray(records) ? records : []).filter(record => {
    if (status && record.status !== status) return false
    if (unit && !penaltyResponsibleUnit(record, projects).includes(unit)) return false
    return !keyword || [record.id, record.project, record.workType, record.penaltyContent,
      record.assignee, record.executor, record.deadline, record.penaltyClause, record.amount]
      .some(value => String(value ?? '').includes(keyword))
  })
}

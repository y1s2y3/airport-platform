/** 一张原单据的一轮抽查；各阶段按批次关联，旧记录兼容时间关联。 */
export function buildSamplingRounds(state, row, role) {
  const tasks = state.tasks.filter(task => task.ids.includes(row.id))
  const logs = state.history.filter(log => log.rowId === row.id)
  const groups = new Map()
  const group = id => {
    if (!groups.has(id)) groups.set(id, { id, tasks: [], logs: [], createdAt: '' })
    return groups.get(id)
  }
  for (const task of tasks) group(task.batchId).tasks.push(task)
  for (const log of logs) {
    const task = state.tasks.find(item => item.id === log.taskId)
    const legacyTask = !log.roundId && log.stage === 'hq'
      ? tasks.find(item => {
        const delta = new Date(item.createdAt) - new Date(log.time)
        return item.stage === 'supervisor' && item.batchId?.startsWith('PC-') && delta >= 0 && delta < 5000
      })
      : null
    group(log.roundId || task?.batchId || legacyTask?.batchId || log.id).logs.push(log)
  }
  const names = { hq: '指挥部抽查', supervisor: '抽检人检查', manager: '全面复查' }
  const canSee = stage => role === 'hq' || stage === role || (role === 'supervisor' && stage === 'manager')
  return [...groups.values()].filter(item => role === 'hq' || item.tasks.some(task => task.stage === role) || item.logs.some(log => log.stage === role)).map(item => {
    const times = [...item.tasks.map(task => task.createdAt), ...item.logs.map(log => log.time)].filter(Boolean).sort()
    const launch = state.tasks.find(task => task.stage === 'supervisor' && task.batchId === item.id)?.createdAt || ''
    const stages = ['hq', 'supervisor', 'manager'].map(stage => {
      if (!canSee(stage)) return { stage, name: names[stage], status: '信息受限', time: '', restricted: true, complete: false }
      const stageLogs = item.logs.filter(log => log.stage === stage)
      const latest = stageLogs.at(-1)
      const task = item.tasks.find(entry => entry.stage === stage)
      const batchLaunch = stage === 'hq' ? launch : ''
      return { stage, name: names[stage], status: latest ? stage === 'manager' ? '已复查' : latest.result : batchLaunch ? '批次发起' : task ? '待办理' : '未开展', time: latest?.time || batchLaunch, restricted: false, complete: Boolean(latest || batchLaunch), failed: latest?.result === '不合格' }
    })
    const action = item.tasks.find(task => task.stage === role && !task.results[row.id] && !task.submittedAt)
    const relatedTask = role === 'hq' ? item.tasks.find(task => task.stage === 'supervisor') || item.tasks[0] : item.tasks.find(task => task.stage === role)
    return { id: item.id, createdAt: times[0] || '', stages, logs: item.logs.filter(log => canSee(log.stage)), actionTaskId: action?.id || '', taskId: relatedTask?.id || '', example: item.tasks.some(task => task.example) || item.logs.some(log => log.example) }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

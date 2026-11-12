export const TASK_STATUSES = Object.freeze({
  PENDING: '待下发', PROCESSING: '处理中', COMPLETED: '已完成', NO_ACTION: '无需执行', VOID: '已作废',
})

/** 执行模式：单人执行＝任一人办结即关闭；多人并行＝全部执行人办结才关闭 */
export const TASK_EXECUTION_MODES = Object.freeze({ SINGLE: '单人执行', PARALLEL: '多人并行' })
export const TASK_EXECUTION_MODE_OPTIONS = Object.freeze([TASK_EXECUTION_MODES.SINGLE, TASK_EXECUTION_MODES.PARALLEL])

export const TASK_REPLY_RESULTS = Object.freeze(['已执行', '无需执行'])
const clean = value => String(value ?? '').trim()
export const taskActorName = value => clean(value).replace(/[（(].*$/, '').replace(/\s+/g, '')

function splitActors(value) {
  const result = [], parts = Array.from(clean(value))
  let depth = 0, buffer = ''
  for (const part of parts) {
    if ('（('.includes(part)) depth += 1
    if ('）)'.includes(part)) depth = Math.max(0, depth - 1)
    if (!depth && /[、,，;；|\n]/.test(part)) { result.push(buffer); buffer = '' }
    else buffer += part
  }
  result.push(buffer)
  return result
}

export function taskExecutors(task = {}) {
  const values = Array.isArray(task.executors) && task.executors.length
    ? task.executors : splitActors(task.executor || task.executeDept || task.unit)
  return [...new Set(values.map(value => clean(typeof value === 'object' ? value?.label || value?.name : value)).filter(Boolean))]
}

export function taskExecutionMode(task = {}) {
  return TASK_EXECUTION_MODE_OPTIONS.includes(task.executionMode)
    ? task.executionMode : TASK_EXECUTION_MODES.SINGLE
}

export function normalizeTaskReply(reply) {
  if (!reply || typeof reply !== 'object') return null
  const result = clean(reply.result)
  const actor = clean(reply.actor)
  const time = clean(reply.time)
  const remark = clean(reply.remark)
  if (!TASK_REPLY_RESULTS.includes(result) || !actor || !time || !remark) return null
  return {
    ...reply,
    actor,
    actorUserId: clean(reply.actorUserId),
    time,
    result,
    remark,
    attachments: (Array.isArray(reply.attachments) ? reply.attachments : [])
      .filter(item => item && (item.url || item.name))
      .map(item => ({ name: clean(item.name) || '处理附件', url: item.url || '' })),
  }
}

/** 处理回复列表（多人并行可多条；兼容旧版单条 reply） */
export function taskReplies(task = {}) {
  const list = [], seen = new Set()
  const push = (value) => {
    const reply = normalizeTaskReply(value)
    if (!reply) return
    const key = `${taskActorName(reply.actor)}@${reply.time}`
    if (seen.has(key)) return
    seen.add(key)
    list.push(reply)
  }
  if (Array.isArray(task.replies)) task.replies.forEach(push)
  if (!list.length && task.reply) push(task.reply)
  return list.sort((a, b) => String(a.time).localeCompare(String(b.time)))
}

/** 兼容旧调用：取第一条处理回复 */
export function taskReply(task = {}) {
  return taskReplies(task)[0] || null
}

export function taskReplyProgress(task = {}) {
  const executors = taskExecutors(task)
  const replies = taskReplies(task)
  const mode = taskExecutionMode(task)
  const repliedNames = new Set(replies.map(reply => taskActorName(reply.actor)))
  const pendingActors = executors.filter(label => !repliedNames.has(taskActorName(label)))
  const repliedAssigned = executors.filter(label => repliedNames.has(taskActorName(label))).length
  const finished = mode === TASK_EXECUTION_MODES.PARALLEL
    ? executors.length > 0 && repliedAssigned === executors.length
    : replies.length > 0
  return {
    mode,
    total: executors.length,
    replied: replies.length,
    repliedAssigned,
    pendingActors,
    pending: Math.max(executors.length - repliedAssigned, 0),
    finished,
  }
}

export function taskStatus(task = {}) {
  if (task.status === TASK_STATUSES.VOID) return TASK_STATUSES.VOID
  const replies = taskReplies(task)
  const progress = taskReplyProgress(task)
  if (progress.finished) {
    return replies.some(reply => reply.result === '已执行') ? TASK_STATUSES.COMPLETED : TASK_STATUSES.NO_ACTION
  }
  if ([TASK_STATUSES.PROCESSING, TASK_STATUSES.COMPLETED, TASK_STATUSES.NO_ACTION, '已下发', '已接收', '已闭环', '待签收'].includes(task.status)) return TASK_STATUSES.PROCESSING
  return TASK_STATUSES.PENDING
}

export function taskStatusTag(status) {
  if (status === TASK_STATUSES.COMPLETED) return 'success'
  if (status === TASK_STATUSES.PROCESSING) return 'primary'
  if (status === TASK_STATUSES.PENDING) return 'warning'
  return 'info'
}

export function taskAssignees(task, users = []) {
  return taskExecutors(task).map(label => {
    const saved = (Array.isArray(task.executorAssignments) ? task.executorAssignments : []).find(item => item?.label === label)
    if (saved?.userId) return { label, userId: saved.userId }
    const matches = users.filter(user => taskActorName(user.name) === taskActorName(label))
    return { label, userId: matches.length === 1 ? matches[0].id : '' }
  })
}

export function taskAssignedActor(task, actor, users = []) {
  if (!actor?.id || !actor?.name) return null
  const assignments = taskAssignees(task, users)
  const byId = assignments.find(item => item.userId === actor.id)
  if (byId) return byId
  if (users.filter(user => taskActorName(user.name) === taskActorName(actor.name)).length > 1) return null
  // 仅无账号关联的历史执行人按姓名兼容；已关联账号时不能由同名账号代办。
  const matches = assignments.filter(item => !item.userId && taskActorName(item.label) === taskActorName(actor.name))
  return matches.length === 1 ? matches[0] : null
}

export function buildTaskFlow(task = {}) {
  const state = taskStatus(task), progress = taskReplyProgress(task), replies = taskReplies(task)
  const executors = taskExecutors(task)
  const nodes = [{ title: '创建任务单', user: task.createdBy || task.issuer || '--', time: task.createdAt || '--', remark: '登记任务单', status: 'done' }]
  if (state === TASK_STATUSES.VOID) {
    nodes.push({ title: '作废任务单', user: task.voidedBy || '--', time: task.voidedAt || '--', remark: '流程终止', status: 'void' })
    return nodes
  }
  const isParallel = progress.mode === TASK_EXECUTION_MODES.PARALLEL
  nodes.push({
    title: '下发任务单', user: task.issuedBy || task.issuer || '--', time: task.issueTime || '--',
    remark: `执行人：${executors.join('、') || '--'}${isParallel ? `（${TASK_EXECUTION_MODES.PARALLEL}）` : ''}`,
    status: state === TASK_STATUSES.PENDING ? 'pending' : 'done',
  })
  if (state === TASK_STATUSES.PENDING) return nodes
  replies.forEach(reply => {
    nodes.push({
      title: '执行人回复', user: reply.actor, time: reply.time,
      remark: `处理结果：${reply.result}`, status: 'done',
    })
  })
  if (!progress.finished) {
    if (isParallel) {
      nodes.push({
        title: '执行人回复',
        user: progress.pendingActors.join('、') || '执行人',
        time: '',
        remark: `已回复 ${progress.repliedAssigned}/${progress.total} 人，等待 ${progress.pendingActors.join('、') || '其余执行人'} 提交处理结果`,
        status: 'current',
      })
    } else {
      nodes.push({
        title: '执行人回复', user: '执行人', time: '',
        remark: '等待执行人提交处理结果', status: 'current',
      })
    }
    return nodes
  }
  const last = replies[replies.length - 1]
  nodes.push({
    title: '流程结束', user: '系统', time: last?.time || '',
    remark: isParallel
      ? `全部执行人已回复（${progress.repliedAssigned}/${progress.total}），流程结束`
      : '执行人回复后自动结束流程',
    status: 'done',
  })
  return nodes
}

export function prepareTaskReply(task, actor, payload = {}, users = [], time = '') {
  if (!task?.id) return { ok: false, message: '任务单不存在' }
  const mode = taskExecutionMode(task)
  const replies = taskReplies(task)
  if (taskStatus(task) !== TASK_STATUSES.PROCESSING) return { ok: false, message: '该任务单已被处理或流程已结束，请返回列表查看' }
  const assigned = taskAssignedActor(task, actor, users)
  if (!assigned) return { ok: false, message: '当前用户不是任务单指定执行人，无法提交处理结果' }
  if (mode === TASK_EXECUTION_MODES.PARALLEL && replies.some(reply => taskActorName(reply.actor) === taskActorName(assigned.label))) {
    return { ok: false, message: '您已提交过处理结果，请返回列表查看' }
  }
  if (!TASK_REPLY_RESULTS.includes(payload.result)) return { ok: false, message: '请选择处理结果' }
  const remark = clean(payload.remark)
  if (!remark) return { ok: false, message: '请填写处理说明' }
  if (!time) return { ok: false, message: '处理时间生成失败，请重试' }
  const attachments = (Array.isArray(payload.attachments) ? payload.attachments : [])
    .filter(item => item?.url).map(item => ({ name: clean(item.name) || '处理附件', url: item.url }))
  const reply = {
    actor: assigned.label, actorUserId: actor.id, time, result: payload.result, remark, attachments,
  }
  const nextReplies = [...replies, reply]
  const draft = { ...task, replies: nextReplies, reply: nextReplies[0], status: TASK_STATUSES.PROCESSING }
  const progress = taskReplyProgress(draft)
  const closed = mode === TASK_EXECUTION_MODES.PARALLEL ? progress.finished : true
  const finalStatus = closed
    ? (nextReplies.some(item => item.result === '已执行') ? TASK_STATUSES.COMPLETED : TASK_STATUSES.NO_ACTION)
    : TASK_STATUSES.PROCESSING
  return {
    ok: true,
    closed,
    remaining: progress.pendingActors,
    record: {
      ...draft,
      status: finalStatus,
      closedTime: closed ? time : '',
      closedBy: closed ? '系统' : '',
    },
  }
}

export function taskProcessVisible(process, actor) {
  if (process?.type !== 'dispatch_notice') return true
  return !!actor?.id && process.assigneeUserId === actor.id
}

export function projectTaskProcesses(task, users = []) {
  const replies = taskReplies(task), state = taskStatus(task), progress = taskReplyProgress(task)
  const assignments = taskAssignees(task, users)
  const common = { type: 'dispatch_notice', taskId: task.id, sourceLabel: '任务单', category: 'COC调度', bizType: '处理',
    processName: `任务单·${task.workRequirement || task.id}`, applicant: task.createdBy || task.issuer || '--',
    dept: '调度中心', applyTime: task.issueTime || '--', detail: { project: task.project, taskId: task.id }, approvalFlow: buildTaskFlow(task) }
  const doneList = replies.map(reply => ({
    ...common,
    id: `done-notice-${encodeURIComponent(task.id)}-${encodeURIComponent(reply.actorUserId || reply.actor)}`,
    status: '已完成',
    assignee: reply.actor,
    assigneeUserId: reply.actorUserId || assignments.find(item => item.label === reply.actor)?.userId || '',
    handleTime: reply.time,
    handleLabel: reply.result,
  }))
  if (state === TASK_STATUSES.VOID) return { todos: [], done: [] }
  if (state !== TASK_STATUSES.PROCESSING) {
    // 单人执行：任一人回复即结束，其余执行人不再生成待办，也不生成已办
    return { todos: [], done: doneList }
  }
  const repliedNames = new Set(replies.map(reply => taskActorName(reply.actor)))
  const todos = assignments
    .filter(assigned => progress.mode === TASK_EXECUTION_MODES.PARALLEL
      ? !repliedNames.has(taskActorName(assigned.label))
      : true)
    .map(assigned => ({
      ...common,
      id: `todo-notice-${encodeURIComponent(task.id)}-${encodeURIComponent(assigned.userId || assigned.label)}`,
      assignee: assigned.label, assigneeUserId: assigned.userId, status: '待处理',
    }))
  return { done: doneList, todos }
}

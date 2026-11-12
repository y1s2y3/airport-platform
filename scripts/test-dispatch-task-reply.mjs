import assert from 'node:assert/strict'
import { TASK_STATUSES, taskExecutors, taskStatus, taskReply, taskAssignees, taskAssignedActor, buildTaskFlow, prepareTaskReply, projectTaskProcesses, taskProcessVisible } from '../src/coc/utils/dispatchTaskWorkflow.js'

let checks = 0
function check(name, run) { run(); checks += 1; console.log('PASS ' + name) }
const users = [{ id: 'u-a', name: '执行甲' }, { id: 'u-b', name: '执行乙' }]
const actor = { id: 'u-a', name: '执行甲' }, other = { id: 'u-b', name: '执行乙' }
const source = { id: 'GZ-TEST', status: '处理中', executors: ['执行甲（项目部-经理）', '执行乙（监理-工程师）'], project: '测试项目',
  workRequirement: '检查现场并反馈', createdBy: '登记人', createdAt: '2026-11-08 08:00:00', issuedBy: '下发人', issueTime: '2026-11-09 09:00:00' }
const time = '2026-11-10 10:20:30'
const result = prepareTaskReply(source, actor, { result: '已执行', remark: '  已核查\n现场整改完成。  ', time: '伪造时间', attachments: [{ name: '照片.png', url: 'data:image/png;fixture' }] }, users, time)

check('状态恰为用户指定的五种', () => assert.deepEqual(Object.values(TASK_STATUSES), ['待下发', '处理中', '已完成', '无需执行', '已作废']))
check('旧下发、接收和闭环没有回复时迁移为处理中，不以签收冒充处理', () => {
  for (const status of ['已下发', '已接收', '已闭环', '待签收']) {
    const record = { ...source, status, receivedTime: time, receivedBy: '执行甲' }
    assert.equal(taskStatus(record), '处理中'); assert.equal(taskReply(record), null)
  }
})
check('历史有效回复按处理结果恢复终态，空回复不生成完成状态', () => {
  assert.equal(taskStatus(result.record), '已完成')
  assert.equal(taskStatus({ ...result.record, reply: { ...result.record.reply, result: '无需执行' } }), '无需执行')
  assert.equal(taskStatus({ status: '已完成', reply: {} }), '处理中')
  assert.equal(taskStatus({ ...result.record, status: '已作废' }), '已作废')
})
check('多执行人去重兼容旧字符串，不拆开括号内的组织名称', () => {
  assert.deepEqual(taskExecutors({ executor: '甲（组织一、二） 、 乙（岗位）|甲（组织一、二）' }), ['甲（组织一、二）', '乙（岗位）'])
  assert.deepEqual(taskExecutors({ executors: ['甲', '甲', ' ', '乙'] }), ['甲', '乙'])
})
check('执行人账号唯一关联，重复姓名不猜测归属', () => {
  assert.equal(taskAssignees(source, users)[0].userId, 'u-a')
  assert.equal(taskAssignees(source, [...users, { id: 'duplicate', name: '执行甲' }])[0].userId, '')
  assert.equal(taskAssignedActor(source, actor, [...users, { id: 'duplicate', name: '执行甲' }]), null)
  const assigned = { ...source, executorAssignments: [{ label: source.executors[0], userId: 'u-a' }] }
  assert.equal(taskAssignedActor(assigned, { id: 'duplicate', name: '执行甲' }, [...users, { id: 'duplicate', name: '执行甲' }]), null)
})
check('外人和无登录身份不能回复', () => {
  assert.equal(prepareTaskReply(source, { id: 'outsider', name: '外人' }, { result: '已执行', remark: '完成' }, users, time).ok, false)
  assert.equal(prepareTaskReply(source, {}, { result: '已执行', remark: '完成' }, users, time).ok, false)
})
check('处理结果、说明均必填，两种结果都需要说明', () => {
  for (const payload of [{ remark: '完成' }, { result: '其他', remark: '完成' }, { result: '已执行', remark: ' ' }, { result: '无需执行', remark: '' }])
    assert.equal(prepareTaskReply(source, actor, payload, users, time).ok, false)
})
check('首次执行回复记录实际账号、精确时间及相同的结束时间，不改源数据', () => {
  const before = JSON.stringify(source)
  assert.equal(result.ok, true); assert.equal(result.record.status, '已完成')
  assert.equal(result.record.reply.time, time); assert.equal(result.record.closedTime, time)
  assert.equal(result.record.reply.actorUserId, actor.id); assert.equal(result.record.closedBy, '系统')
  assert.equal(result.record.reply.remark, '已核查\n现场整改完成。')
  assert.equal(JSON.stringify(source), before)
})
check('无需执行同样结束流程并保留独立结果，不写成已执行', () => {
  const value = prepareTaskReply(source, other, { result: '无需执行', remark: '计划已取消' }, users, time)
  assert.equal(value.record.status, '无需执行'); assert.equal(value.record.reply.actorUserId, other.id)
  assert.equal(buildTaskFlow(value.record)[2].remark, '处理结果：无需执行')
})
check('同一人重复或第二人迟到提交均失败，首次回复不变', () => {
  const before = JSON.stringify(result.record)
  for (const user of [actor, other]) assert.equal(prepareTaskReply(result.record, user, { result: '无需执行', remark: '覆盖' }, users, time).ok, false)
  assert.equal(JSON.stringify(result.record), before)
})
check('下发前及已作废任务不能回复', () => {
  for (const status of ['待下发', '已作废']) assert.equal(prepareTaskReply({ ...source, status }, actor, { result: '已执行', remark: '完成' }, users, time).ok, false)
})
check('未下发与处理中分别只展示两、三个流程节点', () => {
  const pending = buildTaskFlow({ ...source, status: '待下发', issueTime: '--' })
  assert.deepEqual(pending.map(item => item.title), ['创建任务单', '下发任务单']); assert.equal(pending[1].status, 'pending')
  const processing = buildTaskFlow(source)
  assert.deepEqual(processing.map(item => item.title), ['创建任务单', '下发任务单', '执行人回复']); assert.equal(processing[2].status, 'current')
})
check('完成流程展示四个节点，创建、下发、回复人与时间分别取真实来源', () => {
  const flow = buildTaskFlow(result.record)
  assert.deepEqual(flow.map(item => item.title), ['创建任务单', '下发任务单', '执行人回复', '流程结束'])
  assert.equal(flow[0].user, '登记人'); assert.equal(flow[0].time, source.createdAt)
  assert.equal(flow[1].user, '下发人'); assert.equal(flow[1].time, source.issueTime)
  assert.equal(flow[2].time, flow[3].time); assert.equal(flow[3].user, '系统')
})
check('作废仅创建和作废节点，显示作废人时间；历史缺失不拿登记人替代', () => {
  const flow = buildTaskFlow({ ...source, status: '已作废', voidedBy: '作废人', voidedAt: time })
  assert.deepEqual(flow.map(item => item.title), ['创建任务单', '作废任务单'])
  assert.equal(flow[1].user, '作废人'); assert.equal(flow[1].time, time); assert.equal(flow[1].status, 'void')
  assert.equal(buildTaskFlow({ ...source, status: '已作废' })[1].user, '--')
  assert.equal(buildTaskFlow({ status: '待下发' })[0].time, '--')
})
check('每名执行人生成独立待处理投影；回复后仅一条实际处理人的已办', () => {
  const pending = projectTaskProcesses(source, users)
  assert.equal(pending.todos.length, 2); assert.equal(pending.done.length, 0)
  assert.deepEqual(pending.todos.map(item => item.assigneeUserId), ['u-a', 'u-b'])
  assert.ok(pending.todos.every(item => item.status === '待处理' && item.bizType === '处理'))
  const done = projectTaskProcesses(result.record, users)
  assert.equal(done.todos.length, 0); assert.equal(done.done.length, 1)
  assert.equal(done.done[0].assigneeUserId, 'u-a'); assert.equal(done.done[0].status, '已完成')
})
check('我的已办按处理人账号隔离，其他模块记录不受影响', () => {
  const done = projectTaskProcesses(result.record, users).done[0]
  assert.equal(taskProcessVisible(done, actor), true); assert.equal(taskProcessVisible(done, other), false)
  assert.equal(taskProcessVisible(done, {}), false); assert.equal(taskProcessVisible({ type: 'penalty' }, other), true)
})
check('投影刷新稳定且不复制生成额外已办，原记录及附件保持不变', () => {
  const frozen = Object.freeze({ ...result.record, reply: Object.freeze({ ...result.record.reply }) })
  const before = JSON.stringify(frozen)
  assert.deepEqual(projectTaskProcesses(frozen, users), projectTaskProcesses(frozen, users))
  assert.equal(frozen.reply.attachments[0].url, 'data:image/png;fixture')
  assert.equal(JSON.stringify(frozen), before)
})
console.log(`\n${checks} dispatch task reply checks passed.`)

/**
 * 竣工验收 — 前置：实体工程（全部单位工程）+ 专项（全部专项节点）均完成
 * 挂接目录树根节点「项目竣工验收」；不做验收计划
 */
import {
  ensureWbsScaffold,
  getCompleteRootNode,
  inspectionTasks,
  nowStr,
  TASK_STATUS,
  wbsNodes,
} from './qmInspect.js'
import { ensureTaskItems, syncNodeAccept } from './qmInspectOps.js'
import { specialTypeLabel } from './qmSpecialTypes.js'

function statusLabelOfNode(accept_status) {
  const map = { 0: '未验收', 1: '验评中', 2: '已通过', 3: '不通过', 4: '整改中', 5: '待复验' }
  return map[accept_status] ?? '—'
}

/**
 * 汇总项目实体工程验收 / 专项验收完成情况（竣工前置门禁）
 */
export function buildCompleteGate(project_id) {
  if (!project_id) {
    return {
      physical: { done: false, total: 0, passed: 0, rows: [], summary: '请先选择项目' },
      special: { done: false, total: 0, passed: 0, rows: [], summary: '请先选择项目' },
      canStart: false,
      blockReason: '请先选择项目',
    }
  }

  ensureWbsScaffold(project_id)

  const units = wbsNodes.filter((n) => n.project_id === project_id && n.node_type === 1)
  const physicalRows = units.map((n) => ({
    id: n.id,
    name: n.node_name,
    specialty: n.specialty || '—',
    accept_status: n.accept_status,
    statusLabel: statusLabelOfNode(n.accept_status),
    passed: n.accept_status === 2,
  }))
  const physicalPassed = physicalRows.filter((r) => r.passed).length
  const physicalTotal = physicalRows.length
  const physicalDone = physicalTotal > 0 && physicalPassed === physicalTotal

  const specialNodes = wbsNodes.filter((n) => n.project_id === project_id && n.node_type === 7)
  const specialRows = specialNodes.map((n) => {
    const task = inspectionTasks.find((t) => t.wbs_node_id === n.id)
    const passed = n.accept_status === 2 || Number(task?.status) === 2
    return {
      id: n.id,
      name: n.node_name,
      specialty: specialTypeLabel(n.special_type) || n.specialty || '—',
      task_no: task?.task_no || '',
      accept_status: passed ? 2 : n.accept_status,
      statusLabel: passed
        ? '已通过'
        : task
          ? TASK_STATUS[task.status] || statusLabelOfNode(n.accept_status)
          : statusLabelOfNode(n.accept_status),
      passed,
    }
  })
  const specialPassed = specialRows.filter((r) => r.passed).length
  const specialTotal = specialRows.length
  const specialDone = specialTotal > 0 && specialPassed === specialTotal

  const canStart = physicalDone && specialDone
  let blockReason = ''
  if (!physicalDone) {
    blockReason =
      physicalTotal === 0
        ? '实体工程验收下尚无单位工程，请先在目录树维护'
        : `实体工程验收未全部完成（${physicalPassed}/${physicalTotal}）`
  } else if (!specialDone) {
    blockReason =
      specialTotal === 0
        ? '专项验收下尚无专项节点，请先维护消防/人防等'
        : `专项验收未全部完成（${specialPassed}/${specialTotal}）`
  }

  return {
    physical: {
      done: physicalDone,
      total: physicalTotal,
      passed: physicalPassed,
      rows: physicalRows,
      summary: physicalTotal ? `已通过 ${physicalPassed}/${physicalTotal}` : '暂无单位工程',
    },
    special: {
      done: specialDone,
      total: specialTotal,
      passed: specialPassed,
      rows: specialRows,
      summary: specialTotal ? `已通过 ${specialPassed}/${specialTotal}` : '暂无专项节点',
    },
    canStart,
    blockReason,
  }
}

/** 获取或创建本项目竣工填报草稿（实体+专项均完成时自动建档） */
export function getOrCreateCompleteDraft(project_id) {
  if (!project_id) return { ok: false, msg: '请先选择项目', task: null }
  const active = inspectionTasks.find(
    (t) => t.project_id === project_id && Number(t.task_type) === 7 && Number(t.status) !== 2,
  )
  if (active) return { ok: true, task: active, created: false }

  const latest = inspectionTasks.find(
    (t) => t.project_id === project_id && Number(t.task_type) === 7,
  )
  const gate = buildCompleteGate(project_id)
  if (!gate.canStart) {
    return {
      ok: false,
      msg: gate.blockReason || '实体工程与专项验收均须全部完成后方可填报竣工验收',
      task: latest || null,
      gate,
    }
  }

  const created = createCompleteTask({ project_id, location_name: '项目竣工验收' })
  if (!created.ok) return { ...created, created: false }
  return { ok: true, task: created.task, created: true, gate }
}

/** 更新竣工填报表头字段（部位/备注）；不再挂计划 */
export function updateCompleteTaskMeta(task, { location_name, remark } = {}) {
  if (!task || Number(task.task_type) !== 7) return { ok: false, msg: '非竣工验收任务' }
  if (Number(task.status) !== 0) return { ok: false, msg: '仅待验评可修改表头' }

  if (location_name !== undefined) {
    task.location_name = String(location_name || '').trim() || '项目竣工验收'
    const bucket = task.form_data?.['ft-complete']
    if (bucket) bucket.工程名称 = task.location_name
  }
  if (remark !== undefined) task.remark = String(remark || '')
  task.updated_at = nowStr()
  return { ok: true, task }
}

/** 创建竣工验收任务（挂根节点；须实体+专项均完成） */
export function createCompleteTask({
  project_id,
  location_name = '',
  remark = '',
  contractor_org_id = 'org-sg-01',
  supervisor_org_id = 'org-jl-01',
}) {
  if (!project_id) return { ok: false, msg: '请先选择项目' }
  const gate = buildCompleteGate(project_id)
  if (!gate.canStart) {
    return { ok: false, msg: gate.blockReason || '实体工程与专项验收均须全部完成后方可发起竣工验收' }
  }

  const active = inspectionTasks.find(
    (t) => t.project_id === project_id && Number(t.task_type) === 7 && Number(t.status) !== 2,
  )
  if (active) {
    return {
      ok: false,
      msg: `已有进行中的竣工验收任务 ${active.task_no}，请先完成或打开填报`,
      task: active,
    }
  }

  const root = getCompleteRootNode(project_id)
  const id = `tk-${Date.now()}`
  const task = {
    id,
    task_no: `JG-2026-${String(inspectionTasks.filter((t) => t.task_type === 7).length + 1).padStart(3, '0')}`,
    project_id,
    wbs_node_id: root?.id || '',
    plan_id: '',
    unplanned_flag: 1,
    parent_task_id: '',
    task_type: 7,
    specialty: '竣工',
    location_name: location_name || root?.node_name || '项目竣工验收',
    form_template_id: root?.form_template_id || 'ft-complete',
    form_data: {
      'ft-complete': {
        工程名称: location_name || root?.node_name || '项目竣工验收',
        竣工验收结论: '',
      },
    },
    batch_type_id: '',
    status: 0,
    result: 0,
    self_check_result: null,
    is_hidden_work: 0,
    first_pass_flag: null,
    reinspect_count: 0,
    current_rectify_id: '',
    contractor_org_id,
    supervisor_org_id,
    applicant_id: '',
    submit_time: '',
    reviewer_id: '',
    finish_time: '',
    archive_status: 0,
    archive_pkg_no: '',
    owner_final_required: 1,
    remark: remark || '',
    created_by: 'u-sg-01',
    created_at: nowStr(),
    updated_by: 'u-sg-01',
    updated_at: nowStr(),
  }

  inspectionTasks.unshift(task)
  ensureTaskItems(task)
  syncNodeAccept(task)
  return { ok: true, task, gate }
}

/**
 * 竣工演示：默认实体单位工程、专项节点全部已通过，便于本页直接填报
 */
export function ensureCompletePrereqDemoSeeds() {
  const project_id = 'p-000'
  ensureWbsScaffold(project_id)
  wbsNodes
    .filter((n) => n.project_id === project_id && n.node_type === 1)
    .forEach((n) => {
      n.accept_status = 2
    })
  wbsNodes
    .filter((n) => n.project_id === project_id && n.node_type === 7)
    .forEach((n) => {
      n.accept_status = 2
    })

  // 将历史未挂树的专项任务挂到对应专项节点
  const fire = wbsNodes.find((n) => n.id === 'wn-special-fire')
  const cd = wbsNodes.find((n) => n.id === 'wn-special-cd')
  const energy = wbsNodes.find((n) => n.id === 'wn-special-energy')
  inspectionTasks
    .filter((t) => t.project_id === project_id && Number(t.task_type) === 6)
    .forEach((t) => {
      t.status = 2
      t.result = 1
      if (!t.finish_time) t.finish_time = '2026-07-19 16:00:00'
      if (!t.wbs_node_id) {
        if (t.special_type === 'civil_defense' && cd) t.wbs_node_id = cd.id
        else if (t.special_type === 'energy' && energy) t.wbs_node_id = energy.id
        else if (fire) t.wbs_node_id = fire.id
      }
      t.plan_id = ''
      t.unplanned_flag = 1
    })
}

ensureCompletePrereqDemoSeeds()

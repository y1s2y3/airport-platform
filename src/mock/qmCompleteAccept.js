/**
 * 竣工验收（深度集成）— 前置：实体验收、专项验收均全部完成
 */
import { acceptancePlans, inspectionTasks, nowStr, TASK_STATUS, wbsNodes } from './qmInspect.js'
import { ensureTaskItems, refreshPlanStatus, syncNodeAccept } from './qmInspectOps.js'
import { specialTypeLabel } from './qmSpecialTypes.js'

function statusLabelOfNode(accept_status) {
  const map = { 0: '未验收', 1: '验评中', 2: '已通过', 3: '不通过', 4: '整改中', 5: '待复验' }
  return map[accept_status] ?? '—'
}

/**
 * 汇总项目实体验收 / 专项验收完成情况（竣工前置门禁）
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

  const units = wbsNodes.filter((n) => n.project_id === project_id && n.node_type === 1)
  const batches = wbsNodes.filter((n) => n.project_id === project_id && n.node_type === 6)
  const physicalRows = (units.length ? units : batches).map((n) => ({
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

  const specialTasks = inspectionTasks.filter((t) => t.project_id === project_id && Number(t.task_type) === 6)
  const specialNodes = wbsNodes.filter((n) => n.project_id === project_id && n.node_type === 7)

  let specialRows = []
  if (specialTasks.length) {
    specialRows = specialTasks.map((t) => ({
      id: t.id,
      name: t.location_name || t.task_no,
      specialty: specialTypeLabel(t.special_type) || t.specialty || '—',
      task_no: t.task_no,
      accept_status: t.status,
      statusLabel: TASK_STATUS[t.status] || '—',
      passed: Number(t.status) === 2,
    }))
  } else {
    specialRows = specialNodes.map((n) => ({
      id: n.id,
      name: n.node_name,
      specialty: n.specialty || '—',
      task_no: '',
      accept_status: n.accept_status,
      statusLabel: statusLabelOfNode(n.accept_status),
      passed: n.accept_status === 2,
    }))
  }
  const specialPassed = specialRows.filter((r) => r.passed).length
  const specialTotal = specialRows.length
  // 无专项记录视为无待办专项，不阻塞；有记录则须全部通过
  const specialDone = specialTotal === 0 || specialPassed === specialTotal

  const canStart = physicalDone && specialDone
  let blockReason = ''
  if (!physicalDone) {
    blockReason =
      physicalTotal === 0
        ? '实体验收尚无单位工程/检验批节点，无法确认完成情况'
        : `实体验收未全部完成（${physicalPassed}/${physicalTotal}）`
  } else if (!specialDone) {
    blockReason = `专项验收未全部完成（${specialPassed}/${specialTotal}）`
  }

  return {
    physical: {
      done: physicalDone,
      total: physicalTotal,
      passed: physicalPassed,
      rows: physicalRows,
      summary: physicalTotal
        ? `已通过 ${physicalPassed}/${physicalTotal}`
        : '暂无实体节点',
    },
    special: {
      done: specialDone,
      total: specialTotal,
      passed: specialPassed,
      rows: specialRows,
      summary:
        specialTotal === 0
          ? '暂无专项（不阻塞）'
          : `已通过 ${specialPassed}/${specialTotal}`,
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
      msg: gate.blockReason || '实体与专项验收均须全部完成后方可填报竣工验收',
      task: latest || null,
      gate,
    }
  }

  const created = createCompleteTask({ project_id, location_name: '项目竣工验收' })
  if (!created.ok) return { ...created, created: false }
  return { ok: true, task: created.task, created: true, gate }
}

/** 更新竣工填报表头字段（计划/部位/备注） */
export function updateCompleteTaskMeta(task, { plan_id, location_name, remark } = {}) {
  if (!task || Number(task.task_type) !== 7) return { ok: false, msg: '非竣工验收任务' }
  if (Number(task.status) !== 0) return { ok: false, msg: '仅待验评可修改表头' }

  if (plan_id !== undefined) {
    const nextPlan = String(plan_id || '')
    if (nextPlan) {
      const plan = acceptancePlans.find((p) => p.id === nextPlan)
      if (!plan) return { ok: false, msg: '验收计划不存在' }
      if (plan.project_id !== task.project_id) return { ok: false, msg: '计划不属于当前项目' }
      if (Number(plan.plan_type) !== 3) return { ok: false, msg: '请选择竣工验收类计划' }
    }
    const prev = task.plan_id
    task.plan_id = nextPlan
    task.unplanned_flag = nextPlan ? 0 : 1
    if (nextPlan) {
      const plan = acceptancePlans.find((p) => p.id === nextPlan)
      if (plan && plan.status === 1) plan.status = 2
      refreshPlanStatus(nextPlan)
    }
    if (prev && prev !== nextPlan) refreshPlanStatus(prev)
  }
  if (location_name !== undefined) {
    task.location_name = String(location_name || '').trim() || '项目竣工验收'
    const bucket = task.form_data?.['ft-complete']
    if (bucket) bucket.工程名称 = task.location_name
  }
  if (remark !== undefined) task.remark = String(remark || '')
  task.updated_at = nowStr()
  return { ok: true, task }
}

/** 创建竣工验收任务（不挂目录树；须实体+专项均完成） */
export function createCompleteTask({
  project_id,
  plan_id = '',
  location_name = '',
  remark = '',
  contractor_org_id = 'org-sg-01',
  supervisor_org_id = 'org-jl-01',
}) {
  if (!project_id) return { ok: false, msg: '请先选择项目' }
  const gate = buildCompleteGate(project_id)
  if (!gate.canStart) {
    return { ok: false, msg: gate.blockReason || '实体与专项验收均须全部完成后方可发起竣工验收' }
  }

  const active = inspectionTasks.find(
    (t) => t.project_id === project_id && Number(t.task_type) === 7 && Number(t.status) !== 2,
  )
  if (active) {
    return { ok: false, msg: `已有进行中的竣工验收任务 ${active.task_no}，请先完成或打开填报`, task: active }
  }

  if (plan_id) {
    const plan = acceptancePlans.find((p) => p.id === plan_id)
    if (!plan) return { ok: false, msg: '验收计划不存在' }
    if (plan.project_id !== project_id) return { ok: false, msg: '计划不属于当前项目' }
    if (Number(plan.plan_type) !== 3) return { ok: false, msg: '请选择竣工验收类计划' }
    if (![1, 2].includes(plan.status)) return { ok: false, msg: '仅未开始/进行中的计划可关联' }
  }

  const id = `tk-${Date.now()}`
  const task = {
    id,
    task_no: `JG-2026-${String(inspectionTasks.filter((t) => t.task_type === 7).length + 1).padStart(3, '0')}`,
    project_id,
    wbs_node_id: '',
    plan_id: plan_id || '',
    unplanned_flag: plan_id ? 0 : 1,
    parent_task_id: '',
    task_type: 7,
    specialty: '竣工',
    location_name: location_name || '项目竣工验收',
    form_template_id: 'ft-complete',
    form_data: { 'ft-complete': { 工程名称: location_name || '项目竣工验收', 竣工验收结论: '' } },
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

  if (plan_id) {
    const plan = acceptancePlans.find((p) => p.id === plan_id)
    if (plan && plan.status === 1) plan.status = 2
    refreshPlanStatus(plan_id)
  }
  syncNodeAccept(task)
  return { ok: true, task, gate }
}

export function ensureCompletePlanSeeds() {
  const seeds = [
    {
      id: 'pl-complete-001',
      plan_no: 'JH-JG-2026-001',
      project_id: 'p-000',
      plan_type: 3,
      plan_name: 'T2航站楼扩建竣工验收计划',
      wbs_node_id: '',
      content: '项目竣工验收',
      plan_date: '2026-10-30',
      contractor_org_id: 'org-sg-01',
      supervisor_org_id: 'org-jl-01',
      status: 1,
      change_flag: 0,
      reviewer_id: 'u-jl-01',
      review_time: '2026-07-10 10:00:00',
      review_opinion: '',
      remark: '竣工计划样例',
    },
  ]
  seeds.forEach((s) => {
    if (!acceptancePlans.some((p) => p.id === s.id)) acceptancePlans.push(s)
  })
}

ensureCompletePlanSeeds()

/**
 * 竣工演示：默认实体单位工程、专项任务全部已通过，便于本页直接填报
 */
export function ensureCompletePrereqDemoSeeds() {
  const project_id = 'p-000'
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

  inspectionTasks
    .filter((t) => t.project_id === project_id && Number(t.task_type) === 6)
    .forEach((t) => {
      t.status = 2
      t.result = 1
      if (!t.finish_time) t.finish_time = '2026-07-19 16:00:00'
    })

  const extraSpecials = [
    {
      id: 'tk-special-cd',
      task_no: 'ZX-2026-101',
      project_id,
      wbs_node_id: '',
      plan_id: 'pl-special-002',
      unplanned_flag: 0,
      parent_task_id: '',
      task_type: 6,
      special_type: 'civil_defense',
      specialty: '人防验收',
      location_name: 'T2-B1人防区',
      form_template_id: 'ft-special-fire',
      form_data: {},
      batch_type_id: '',
      status: 2,
      result: 1,
      self_check_result: 1,
      is_hidden_work: 0,
      first_pass_flag: 1,
      reinspect_count: 0,
      current_rectify_id: '',
      contractor_org_id: 'org-sg-01',
      supervisor_org_id: 'org-jl-01',
      applicant_id: 'u-sg-01',
      submit_time: '2026-07-12 10:00:00',
      reviewer_id: 'u-jl-01',
      finish_time: '2026-07-14 15:00:00',
      archive_status: 2,
      archive_pkg_no: 'DA-ZX-101',
      owner_final_required: 1,
      remark: '人防专项已通过（竣工前置演示）',
      created_by: 'u-sg-01',
      created_at: '2026-07-10 09:00:00',
      updated_by: 'u-jl-01',
      updated_at: '2026-07-14 15:00:00',
    },
    {
      id: 'tk-special-energy',
      task_no: 'ZX-2026-102',
      project_id,
      wbs_node_id: '',
      plan_id: 'pl-special-003',
      unplanned_flag: 0,
      parent_task_id: '',
      task_type: 6,
      special_type: 'energy',
      specialty: '节能验收',
      location_name: 'T2航站楼节能专项',
      form_template_id: 'ft-special-fire',
      form_data: {},
      batch_type_id: '',
      status: 2,
      result: 1,
      self_check_result: 1,
      is_hidden_work: 0,
      first_pass_flag: 1,
      reinspect_count: 0,
      current_rectify_id: '',
      contractor_org_id: 'org-sg-01',
      supervisor_org_id: 'org-jl-01',
      applicant_id: 'u-sg-01',
      submit_time: '2026-07-11 10:00:00',
      reviewer_id: 'u-jl-01',
      finish_time: '2026-07-13 11:00:00',
      archive_status: 2,
      archive_pkg_no: 'DA-ZX-102',
      owner_final_required: 1,
      remark: '节能专项已通过（竣工前置演示）',
      created_by: 'u-sg-01',
      created_at: '2026-07-09 09:00:00',
      updated_by: 'u-jl-01',
      updated_at: '2026-07-13 11:00:00',
    },
  ]
  extraSpecials.forEach((s) => {
    if (!inspectionTasks.some((t) => t.id === s.id)) inspectionTasks.push(s)
  })
}

ensureCompletePrereqDemoSeeds()

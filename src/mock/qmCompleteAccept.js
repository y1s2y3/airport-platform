/**
 * 竣工验收 — 前置：实体工程（全部单位工程）+ 专项（全部专项节点）均完成
 * 挂接目录树根节点「项目竣工验收」；不做验收计划
 */
import {
  approvalRecords,
  ensureWbsScaffold,
  getCompleteRootNode,
  inspectionTasks,
  isWbsAlive,
  nowStr,
  primaryFormTemplateId,
  TASK_STATUS,
  wbsNodes,
} from './qmInspect.js'
import { addAttachment, ensureTaskItems, getAttachments, syncNodeAccept } from './qmInspectOps.js'
import { specialTypeLabel } from './qmSpecialTypes.js'

function statusLabelOfNode(accept_status) {
  const map = { 0: '未开始', 1: '审批中', 2: '已通过', 3: '已驳回' }
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

  // 实体工程验收情况：按目录树「单位工程」节点列出完成情况（node_type=1）
  const units = wbsNodes.filter(
    (n) => isWbsAlive(n) && n.project_id === project_id && n.node_type === 1,
  )
  const physicalRows = units.map((n) => {
    const task = inspectionTasks.find(
      (t) => t.wbs_node_id === n.id && [5, 8].includes(Number(t.task_type)),
    )
    const passed = n.accept_status === 2 || Number(task?.status) === 2
    return {
      id: n.id,
      name: n.node_name,
      specialty: n.specialty || '—',
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
  const physicalPassed = physicalRows.filter((r) => r.passed).length
  const physicalTotal = physicalRows.length
  const physicalDone = physicalTotal > 0 && physicalPassed === physicalTotal

  const specialNodes = wbsNodes.filter(
    (n) => isWbsAlive(n) && n.project_id === project_id && n.node_type === 7,
  )
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
      summary: physicalTotal
        ? `单位工程完成情况：已通过 ${physicalPassed}/${physicalTotal}`
        : '暂无单位工程，请先在验评目录树维护',
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

/** 获取或创建本项目竣工填报任务（优先进行中 → 已通过 → 已驳回；无单且前置齐则新建） */
export function getOrCreateCompleteDraft(project_id) {
  if (!project_id) return { ok: false, msg: '请先选择项目', task: null }

  const ofProject = (t) => t.project_id === project_id && Number(t.task_type) === 7

  const active = inspectionTasks.find((t) => ofProject(t) && [0, 1].includes(Number(t.status)))
  if (active) return { ok: true, task: active, created: false }

  const passed = inspectionTasks.find((t) => ofProject(t) && Number(t.status) === 2)
  if (passed) return { ok: true, task: passed, created: false }

  // 已驳回：展示原单（只读），由「重新报审」复制建新单；不自动新建空单
  const rejected = [...inspectionTasks]
    .filter((t) => ofProject(t) && Number(t.status) === 3)
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))[0]
  if (rejected) return { ok: true, task: rejected, created: false, rejected: true }

  const gate = buildCompleteGate(project_id)
  if (!gate.canStart) {
    return {
      ok: false,
      msg: gate.blockReason || '实体工程与专项验收均须全部完成后方可填报竣工验收',
      task: null,
      gate,
    }
  }

  const created = createCompleteTask({ project_id, location_name: '项目竣工验收' })
  if (!created.ok) return { ...created, created: false }
  return { ok: true, task: created.task, created: true, gate }
}

/** 本项目竣工验收驳回记录（已驳回存档单） */
export function listCompleteRejectRecords(project_id) {
  if (!project_id) return []
  return inspectionTasks
    .filter(
      (t) =>
        t.project_id === project_id && Number(t.task_type) === 7 && Number(t.status) === 3,
    )
    .slice()
    .sort((a, b) => String(b.updated_at || b.finish_time || '').localeCompare(String(a.updated_at || a.finish_time || '')))
}

/** 最近一条驳回意见 */
export function getCompleteRejectOpinion(task_id) {
  const rows = approvalRecords
    .filter((r) => r.task_id === task_id && Number(r.action) === 3)
    .slice()
    .sort((a, b) => String(b.action_time || '').localeCompare(String(a.action_time || '')))
  return rows[0] || null
}

function copyCompleteAttachments(fromTaskId, toTaskId) {
  getAttachments('TASK', fromTaskId).forEach((a) => {
    addAttachment({
      biz_type: 'TASK',
      biz_id: toTaskId,
      task_id: toTaskId,
      file_category: a.file_category,
      file_name: a.file_name,
      file_ext: a.file_ext,
      file_url: a.file_url,
      file_size: a.file_size,
      content_hash: a.content_hash,
      mime_type: a.mime_type,
      watermark_flag: a.watermark_flag,
      shoot_time: a.shoot_time,
      shoot_location: a.shoot_location,
      upload_by: a.upload_by,
      archive_file_code: '',
      is_required_met: a.is_required_met,
      doc_slot: a.doc_slot || '',
    })
  })
}

/**
 * 竣工已驳回 → 重新报审：复制表单/附件建新单；原单保持已驳回作为驳回记录
 */
export function reDeclareCompleteAcceptance(rejectedTask) {
  if (!rejectedTask || Number(rejectedTask.task_type) !== 7) {
    return { ok: false, msg: '仅竣工验收单可重新报审' }
  }
  if (Number(rejectedTask.status) !== 3) {
    return { ok: false, msg: '仅已驳回验收单可重新报审' }
  }
  const active = inspectionTasks.find(
    (t) =>
      t.project_id === rejectedTask.project_id &&
      Number(t.task_type) === 7 &&
      [0, 1, 2].includes(Number(t.status)),
  )
  if (active) {
    return {
      ok: false,
      msg: `已有有效竣工验收单（${active.task_no}），请先完成当前单`,
      task: active,
    }
  }

  const created = createCompleteTask({
    project_id: rejectedTask.project_id,
    location_name: rejectedTask.location_name || '项目竣工验收',
    remark: rejectedTask.remark || '',
    contractor_org_id: rejectedTask.contractor_org_id,
    supervisor_org_id: rejectedTask.supervisor_org_id,
    related_reject_id: rejectedTask.id,
  })
  if (!created.ok) return created
  const task = created.task
  if (rejectedTask.form_data && typeof rejectedTask.form_data === 'object') {
    task.form_data = JSON.parse(JSON.stringify(rejectedTask.form_data))
  }
  if (rejectedTask.form_template_id) task.form_template_id = rejectedTask.form_template_id
  if (rejectedTask.task_name) task.task_name = rejectedTask.task_name
  copyCompleteAttachments(rejectedTask.id, task.id)
  return { ok: true, task, source: rejectedTask }
}

/** 更新竣工填报表头字段（验收说明）；工程/部位由系统默认，不再挂计划 */
export function updateCompleteTaskMeta(task, { location_name, remark } = {}) {
  if (!task || Number(task.task_type) !== 7) return { ok: false, msg: '非竣工验收任务' }
  if (Number(task.status) !== 0) return { ok: false, msg: '仅待提交可修改表头' }

  // location_name 可选；未传则保留创建时默认值（如「项目竣工验收」）
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
  related_reject_id = '',
}) {
  if (!project_id) return { ok: false, msg: '请先选择项目' }
  const gate = buildCompleteGate(project_id)
  if (!gate.canStart) {
    return { ok: false, msg: gate.blockReason || '实体工程与专项验收均须全部完成后方可发起竣工验收' }
  }

  const active = inspectionTasks.find(
    (t) =>
      t.project_id === project_id &&
      Number(t.task_type) === 7 &&
      [0, 1, 2].includes(Number(t.status)),
  )
  if (active) {
    return {
      ok: false,
      msg: `已有有效竣工验收单 ${active.task_no}，请先完成或打开填报`,
      task: active,
    }
  }

  const root = getCompleteRootNode(project_id)
  const id = `tk-${Date.now()}`
  const task = {
    id,
    task_no: `JG-2026-${String(inspectionTasks.filter((t) => t.task_type === 7).length + 1).padStart(3, '0')}`,
    task_name: '项目竣工验收',
    project_id,
    wbs_node_id: root?.id || '',
    plan_id: '',
    unplanned_flag: 1,
    parent_task_id: '',
    task_type: 7,
    specialty: '竣工',
    location_name: location_name || root?.node_name || '项目竣工验收',
    form_template_id: primaryFormTemplateId(root) || 'ft-complete',
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
    archive_instance_id: '',
    is_draft: 0,
    need_archive: 1,
    elec_archive_status: 1,
    related_reject_id: related_reject_id || '',
    approval_post_id: '',
    approval_post_name: '',
    approver_id: '',
    approver_name: '',
    remark: remark || '',
    manual_approval_flow: [],
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
 * 竣工演示：实体单位工程、专项节点标为已通过，便于竣工页直接填报。
 * 不覆盖专项任务 status，保留专项验收列表的各状态假数据。
 */
export function ensureCompletePrereqDemoSeeds() {
  const project_id = 'p-000'
  ensureWbsScaffold(project_id)
  wbsNodes
    .filter((n) => n.project_id === project_id && n.node_type === 1)
    .forEach((n) => {
      n.accept_status = 2
    })

  // 将历史未挂树的专项任务挂到对应专项节点（不改 status）
  const fire = wbsNodes.find((n) => n.id === 'wn-special-fire')
  const cd = wbsNodes.find((n) => n.id === 'wn-special-cd')
  const energy = wbsNodes.find((n) => n.id === 'wn-special-energy')
  const planning = wbsNodes.find((n) => n.id === 'wn-special-planning')
  const equip = wbsNodes.find((n) => n.id === 'wn-special-equip')
  inspectionTasks
    .filter((t) => t.project_id === project_id && Number(t.task_type) === 6)
    .forEach((t) => {
      if (!t.wbs_node_id) {
        if (t.special_type === 'civil_defense' && cd) t.wbs_node_id = cd.id
        else if (t.special_type === 'energy' && energy) t.wbs_node_id = energy.id
        else if (t.special_type === 'planning' && planning) t.wbs_node_id = planning.id
        else if (t.special_type === 'special_equip' && equip) t.wbs_node_id = equip.id
        else if (fire) t.wbs_node_id = fire.id
      }
      t.plan_id = ''
      t.unplanned_flag = 1
      // 草稿必须保持待验评，否则列表显示「草稿」但填报页按 status 判为只读
      if (Number(t.is_draft) === 1) {
        t.status = 0
        t.result = 0
        t.finish_time = ''
      }
    })

  // 专项节点：有通过任务则标已通过（兼容一节点多任务的各状态演示）
  wbsNodes
    .filter((n) => n.project_id === project_id && n.node_type === 7)
    .forEach((n) => {
      const hasPass = inspectionTasks.some(
        (t) =>
          t.wbs_node_id === n.id && Number(t.is_draft) !== 1 && Number(t.status) === 2,
      )
      if (hasPass) n.accept_status = 2
    })

  seedCompleteRejectDemo(project_id)
}

/** 演示：竣工已驳回存档单（用于「驳回记录 / 重新报审」） */
function seedCompleteRejectDemo(project_id) {
  if (inspectionTasks.some((t) => t.project_id === project_id && Number(t.task_type) === 7)) {
    return
  }
  const gate = buildCompleteGate(project_id)
  if (!gate.canStart) return

  const root = getCompleteRootNode(project_id)
  const id = 'tk-jg-reject-001'
  const task = {
    id,
    task_no: 'JG-2026-001',
    task_name: '项目竣工验收',
    project_id,
    wbs_node_id: root?.id || '',
    plan_id: '',
    unplanned_flag: 1,
    parent_task_id: '',
    task_type: 7,
    specialty: '竣工',
    location_name: root?.node_name || '项目竣工验收',
    form_template_id: 'ft-complete',
    form_data: {
      'ft-complete': {
        工程名称: root?.node_name || '项目竣工验收',
        竣工验收结论: '资料不齐，待补全后重报',
      },
    },
    batch_type_id: '',
    status: 3,
    result: 2,
    self_check_result: 1,
    is_hidden_work: 0,
    first_pass_flag: 0,
    reinspect_count: 0,
    current_rectify_id: '',
    contractor_org_id: 'org-sg-01',
    supervisor_org_id: 'org-jl-01',
    applicant_id: 'u-sg-01',
    submit_time: '2026-08-01 10:00:00',
    reviewer_id: 'u-jl-01',
    finish_time: '2026-08-02 15:30:00',
    archive_status: 0,
    archive_pkg_no: '',
    archive_instance_id: '',
    is_draft: 0,
    need_archive: 1,
    elec_archive_status: 3,
    related_reject_id: '',
    remark: '竣工验收已驳回存档（演示·可重新报审）',
    manual_approval_flow: [],
    created_by: 'u-sg-01',
    created_at: '2026-08-01 09:00:00',
    updated_by: 'u-jl-01',
    updated_at: '2026-08-02 15:30:00',
  }
  inspectionTasks.unshift(task)
  addAttachment({
    biz_type: 'TASK',
    biz_id: id,
    task_id: id,
    file_category: 1,
    file_name: '竣工现场全景.jpg',
    file_ext: 'jpg',
    file_url: '#mock/jg-site.jpg',
    file_size: 320000,
    mime_type: 'image/jpeg',
  })
  approvalRecords.push(
    {
      id: 'ar-jg-001',
      task_id: id,
      node_name: '提交报验',
      action: 1,
      operator_id: 'u-sg-01',
      operator_role: '施工方',
      opinion: '',
      action_time: '2026-08-01 10:00:00',
    },
    {
      id: 'ar-jg-002',
      task_id: id,
      node_name: '监理单位审批',
      action: 3,
      operator_id: 'u-jl-01',
      operator_role: '监理单位审批',
      opinion: '竣工资料目录不完整，竣工验收报告签章缺页，请补齐后重新报审。',
      action_time: '2026-08-02 15:30:00',
    },
  )
  syncNodeAccept(task)
}

ensureCompletePrereqDemoSeeds()

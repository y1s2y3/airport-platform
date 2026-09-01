/**
 * 专项验收任务创建 — 挂接目录树专项节点（消防/人防等），不做验收计划
 */
import { inspectionTasks, isWbsAlive, nowStr, primaryFormTemplateId, wbsNodes } from './qmInspect.js'
import { ensureTaskItems, syncNodeAccept } from './qmInspectOps.js'
import { getSpecialAcceptType } from './qmSpecialTypes.js'

export * from './qmSpecialTypes.js'

/**
 * 创建专项验收任务（须选择目录树专项节点 node_type=7）
 */
export function createSpecialTask({
  project_id,
  wbs_node_id,
  special_type = '',
  task_name = '',
  location_name = '',
  remark = '',
  contractor_org_id = 'org-sg-01',
  supervisor_org_id = 'org-jl-01',
}) {
  if (!project_id) return { ok: false, msg: '请先选择项目' }
  if (!wbs_node_id) return { ok: false, msg: '请选择专项验收节点（目录树·专项验收下）' }

  const node = wbsNodes.find((n) => isWbsAlive(n) && n.id === wbs_node_id)
  if (!node) return { ok: false, msg: '专项节点不存在' }
  if (node.project_id !== project_id) return { ok: false, msg: '节点不属于当前项目' }
  if (Number(node.node_type) !== 7) return { ok: false, msg: '请选择专项节点（消防/人防等）' }

  const typeCode = special_type || node.special_type || ''
  if (!typeCode) return { ok: false, msg: '专项节点未配置专项类型' }

  const typeMeta = getSpecialAcceptType(typeCode)
  if (!typeMeta) return { ok: false, msg: '专项验收类型无效' }

  const tplId = primaryFormTemplateId(node) || typeMeta.form_template_id || 'ft-special-fire'
  // 一节点可上报多个任务（不再做「一节点一有效任务」拦截）
  const id = `tk-${Date.now()}`
  const task = {
    id,
    task_no: `ZX-2026-${String(inspectionTasks.filter((t) => t.task_type === 6).length + 1).padStart(3, '0')}`,
    task_name: task_name || `${typeMeta.label}专项验收`,
    project_id,
    wbs_node_id,
    plan_id: '',
    unplanned_flag: 1,
    parent_task_id: '',
    task_type: 6,
    special_type: typeCode,
    specialty: typeMeta.label,
    location_name: location_name || node.location_code || node.node_name,
    form_template_id: tplId,
    form_data: {
      [tplId]: {
        专项名称: `${typeMeta.label}专项验收`,
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
    is_draft: 1,
    owner_final_required: 1,
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
  return { ok: true, task }
}

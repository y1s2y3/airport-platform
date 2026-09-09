/**
 * 专项验收任务创建 — 挂接目录树专项节点，不做验收计划
 * 任务名称手填；不依赖「专项类型」字典
 */
import { inspectionTasks, isWbsAlive, nowStr, primaryFormTemplateId, wbsNodes } from './qmInspect.js'
import { ensureTaskItems, syncNodeAccept } from './qmInspectOps.js'
import { findActiveTaskOnNode } from './qmInspectV2.js'
import { getEffectiveSpecialties } from '../constants/wbsSpecialty.js'

/**
 * 创建专项验收任务（须选择目录树专项节点 node_type=7）
 * 一节点仅一张有效单；已驳回可并存并支持重新申报
 */
export function createSpecialTask({
  project_id,
  wbs_node_id,
  task_name = '',
  location_name = '',
  remark = '',
  contractor_org_id = 'org-sg-01',
  supervisor_org_id = 'org-jl-01',
  related_reject_id = '',
  need_archive,
}) {
  if (!project_id) return { ok: false, msg: '请先选择项目' }
  if (!wbs_node_id) return { ok: false, msg: '请选择专项验收节点（目录树·专项验收下）' }

  const node = wbsNodes.find((n) => isWbsAlive(n) && n.id === wbs_node_id)
  if (!node) return { ok: false, msg: '专项节点不存在' }
  if (node.project_id !== project_id) return { ok: false, msg: '节点不属于当前项目' }
  if (Number(node.node_type) !== 7) return { ok: false, msg: '请选择专项节点' }

  const name = String(task_name || '').trim() || node.node_name || '专项验收'
  const specialties = getEffectiveSpecialties(node)
  const specialty = specialties[0] || node.specialty || ''

  const active = findActiveTaskOnNode(wbs_node_id)
  if (active) {
    return {
      ok: false,
      msg: `该验收节点已有有效验收单（${active.task_no || active.id}），一节点仅允许一张有效单；已驳回单可并存`,
    }
  }

  const tplId = primaryFormTemplateId(node) || 'ft-special-fire'
  const id = `tk-${Date.now()}`
  const task = {
    id,
    task_no: `ZX-2026-${String(inspectionTasks.filter((t) => t.task_type === 6).length + 1).padStart(3, '0')}`,
    task_name: name,
    project_id,
    wbs_node_id,
    plan_id: '',
    unplanned_flag: 1,
    parent_task_id: '',
    task_type: 6,
    specialty,
    location_name: location_name || node.location_code || node.node_name,
    form_template_id: tplId,
    form_data: {
      [tplId]: {
        专项名称: name,
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
    need_archive: need_archive === undefined ? 1 : Number(need_archive) === 1 ? 1 : 0,
    related_reject_id: related_reject_id || '',
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

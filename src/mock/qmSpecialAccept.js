/**
 * 专项验收任务创建（深度集成 · 专项）
 * 不挂接验评目录树，须挂验收计划；按类型强制上传对应附件
 */
import { acceptancePlans, inspectionTasks, nowStr } from './qmInspect.js'
import { ensureTaskItems, refreshPlanStatus, syncNodeAccept } from './qmInspectOps.js'
import { getSpecialAcceptType } from './qmSpecialTypes.js'

export * from './qmSpecialTypes.js'

/**
 * 创建专项验收任务（不挂目录树节点，须挂专项计划 + 专项类型）
 */
export function createSpecialTask({
  project_id,
  plan_id,
  special_type,
  location_name = '',
  remark = '',
  contractor_org_id = 'org-sg-01',
  supervisor_org_id = 'org-jl-01',
}) {
  if (!project_id) return { ok: false, msg: '请先选择项目' }
  if (!plan_id) return { ok: false, msg: '专项验收须挂接验收计划' }
  if (!special_type) return { ok: false, msg: '请选择专项验收类型' }

  const plan = acceptancePlans.find((p) => p.id === plan_id)
  if (!plan) return { ok: false, msg: '验收计划不存在' }
  if (plan.project_id !== project_id) return { ok: false, msg: '计划不属于当前项目' }
  if (Number(plan.plan_type) !== 2) return { ok: false, msg: '请选择专项验收类计划' }
  if (![1, 2].includes(plan.status)) return { ok: false, msg: '仅未开始/进行中的计划可发起' }

  const typeMeta = getSpecialAcceptType(special_type)
  if (!typeMeta) return { ok: false, msg: '专项验收类型无效' }

  const id = `tk-${Date.now()}`
  const task = {
    id,
    task_no: `ZX-2026-${String(inspectionTasks.filter((t) => t.task_type === 6).length + 1).padStart(3, '0')}`,
    project_id,
    wbs_node_id: '',
    plan_id,
    unplanned_flag: 0,
    parent_task_id: '',
    task_type: 6,
    special_type,
    specialty: typeMeta.label,
    location_name: location_name || `${typeMeta.label}专项`,
    form_template_id: typeMeta.form_template_id || 'ft-special-fire',
    form_data: {
      [typeMeta.form_template_id || 'ft-special-fire']: {
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
    owner_final_required: 1,
    remark: remark || '',
    created_by: 'u-sg-01',
    created_at: nowStr(),
    updated_by: 'u-sg-01',
    updated_at: nowStr(),
  }

  inspectionTasks.unshift(task)
  ensureTaskItems(task)

  if (plan.status === 1) plan.status = 2
  refreshPlanStatus(plan_id)
  syncNodeAccept(task)
  return { ok: true, task }
}

/** 演示用：确保有专项计划种子（幂等追加） */
export function ensureSpecialPlanSeeds() {
  const seeds = [
    {
      id: 'pl-special-001',
      plan_no: 'JH-ZX-2026-001',
      project_id: 'p-000',
      plan_type: 2,
      plan_name: 'T2消防专项验收计划',
      wbs_node_id: '',
      content: '消防系统专项验收',
      plan_date: '2026-08-20',
      contractor_org_id: 'org-sg-01',
      supervisor_org_id: 'org-jl-01',
      status: 1,
      change_flag: 0,
      reviewer_id: 'u-jl-01',
      review_time: '2026-07-01 10:00:00',
      review_opinion: '',
      remark: '专项计划样例',
    },
    {
      id: 'pl-special-002',
      plan_no: 'JH-ZX-2026-002',
      project_id: 'p-000',
      plan_type: 2,
      plan_name: 'T2人防专项验收计划',
      wbs_node_id: '',
      content: '人防工程专项验收',
      plan_date: '2026-09-05',
      contractor_org_id: 'org-sg-01',
      supervisor_org_id: 'org-jl-01',
      status: 1,
      change_flag: 0,
      reviewer_id: 'u-jl-01',
      review_time: '2026-07-02 10:00:00',
      review_opinion: '',
      remark: '',
    },
    {
      id: 'pl-special-003',
      plan_no: 'JH-ZX-2026-003',
      project_id: 'p-000',
      plan_type: 2,
      plan_name: '电梯特种设备验收计划',
      wbs_node_id: '',
      content: '扶梯/电梯专项',
      plan_date: '2026-08-28',
      contractor_org_id: 'org-sg-01',
      supervisor_org_id: 'org-jl-01',
      status: 2,
      change_flag: 0,
      reviewer_id: 'u-jl-01',
      review_time: '2026-07-03 10:00:00',
      review_opinion: '',
      remark: '',
    },
  ]
  seeds.forEach((s) => {
    if (!acceptancePlans.some((p) => p.id === s.id)) acceptancePlans.push(s)
  })
}

ensureSpecialPlanSeeds()

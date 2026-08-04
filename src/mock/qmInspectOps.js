/**
 * 质量验评 · 状态机与业务操作 — 对齐 data-model-for-验评 V2.3.1 不变量
 * C1 档案登记=用户主动；C2 节点级拦截；C5 附件默认必填；C6 通过前档案签章实时校验；
 * C7 状态以档案为准（退回先写档案）；D2 审批链快照锁定；D3 逐级解锁；D4 整改=驳回结果
 * 禁止后端；仅内存 Mock
 */
import {
  acceptancePlans,
  approvalRecords,
  batchTypes,
  inspectionItems,
  inspectionTasks,
  NODE_TO_TASK_TYPE,
  NODE_TYPE_LABEL,
  nowStr,
  resolveProjectName,
  WBS_EDITABLE_NODE_TYPES,
  WBS_SYSTEM_NODE_TYPES,
  ensureWbsScaffold,
  getCompleteRootNode,
  getEntityRootNode,
  getSpecialRootNode,
  rectificationOrders,
  reinspectRounds,
  wbsNodes,
} from './qmInspect.js'
import {
  batchTypeForms,
  defaultMaterialBinds,
  formItemDefs,
  formTemplates,
  getEnabledFormsByBatchType,
  getItemDefsByTemplate,
} from './qmFormTemplates.js'

import { attachments as attachStore, signatureRecords } from './qmAttachments.js'
import { missingSpecialRequiredDocs } from './qmSpecialTypes.js'
import {
  archiveWriteFinish,
  archiveWriteReject,
  archiveWriteReinspect,
  checkArchiveBlock,
  getArchiveChain,
  getLatestRejectRecord,
  realtimeCheckArchiveSign,
  RECTIFY_ARCHIVE_DOC_STATUS,
} from './qmArchive.js'

export const ARCHIVE_STATUS = {
  0: '未归档',
  1: '归档中',
  2: '已归档',
  3: '档案侧退回或检测失败',
}

export const FILE_CATEGORY = {
  1: '现场照片',
  2: '现场短视频',
  3: '检查测试原始记录',
  4: '报验申请表',
  5: '质量验收记录表',
  6: '隐蔽工程验收记录',
  7: '整改前影像',
  8: '整改后影像',
  9: '整改通知书/报告/复查意见书',
  10: '专项法定文件',
  11: '竣工报告类',
  12: '四性检测报告/EEP包',
  99: '其他',
}

export const APPROVAL_ACTION = {
  1: '提交',
  2: '通过',
  3: '不通过',
  4: '加签',
}

export const ITEM_CATEGORY = { 1: '主控', 2: '一般', 3: '观感', 9: '其他' }
export const JUDGE_RESULT = { 0: '待判定', 1: '合格', 2: '不合格', 3: '不适用' }
export const SELF_CHECK = { 0: '未自检', 1: '自检合格', 2: '自检不合格' }
export const PLAN_TYPE = { 1: '实体验收', 2: '专项验收', 3: '竣工验收' }

/**
 * 按 task_type 的审批链角色序列 — V2.3.1（Q15/D2）：源头为档案同步，登记时快照锁定；
 * 已登记任务读 ARCHIVE_APPROVAL_SYNC 快照，未登记读档案侧当前链（qmArchive.getArchiveChain）
 */
export function getApprovalChain(task) {
  return getArchiveChain(task)
}

export function getPassedApprovalRoles(task_id) {
  return approvalRecords
    .filter((r) => r.task_id === task_id && r.action === 2)
    .map((r) => r.operator_role)
}

export function getNextApprovalRole(task) {
  const chain = getApprovalChain(task)
  const passed = getPassedApprovalRoles(task.id)
  for (const role of chain) {
    if (!passed.includes(role)) return role
  }
  return null
}

export function syncNodeAccept(task) {
  const node = wbsNodes.find((n) => n.id === task.wbs_node_id)
  if (!node) return
  const map = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
  node.accept_status = map[task.status] ?? node.accept_status
  node.updated_at = nowStr()
}

export function getItemsByTaskId(task_id) {
  return inspectionItems.filter((i) => i.task_id === task_id)
}

export function getAttachments(biz_type, biz_id) {
  return attachStore.filter((a) => a.biz_type === biz_type && a.biz_id === biz_id)
}

export function hasBlockFailItems(task_id) {
  return getItemsByTaskId(task_id).some(
    (i) => (i.item_category === 1 || i.item_category === 3) && i.judge_result === 2,
  )
}

export function hasOnlyGeneralFail(task_id) {
  const items = getItemsByTaskId(task_id)
  if (!items.length) return false
  const hasGeneralFail = items.some((i) => i.item_category === 2 && i.judge_result === 2)
  return hasGeneralFail && !hasBlockFailItems(task_id)
}

export function missingPhotoItems(task_id) {
  const items = getItemsByTaskId(task_id).filter((i) => i.need_photo === 1)
  return items.filter((i) => {
    const atts = getAttachments('ITEM', i.id)
    return atts.length === 0
  })
}

/** 子孙节点（含自身可选） */
export function collectDescendants(root_id, { includeSelf = false } = {}) {
  const result = []
  if (includeSelf) {
    const self = wbsNodes.find((n) => n.id === root_id)
    if (self) result.push(self)
  }
  const walk = (pid) => {
    wbsNodes
      .filter((n) => n.parent_id === pid)
      .forEach((n) => {
        result.push(n)
        walk(n.id)
      })
  }
  walk(root_id)
  return result
}

/** 计划覆盖范围 S：检验批叶子 或 专项/竣工锚点自身 */
export function getPlanCoverageLeaves(plan) {
  const anchor = wbsNodes.find((n) => n.id === plan.wbs_node_id)
  if (!anchor) return []
  if (anchor.node_type === 6 || anchor.node_type === 7 || anchor.node_type === 8) {
    return [anchor]
  }
  return collectDescendants(plan.wbs_node_id).filter((n) => n.node_type === 6)
}

export function refreshPlanStatus(plan_id) {
  const plan = acceptancePlans.find((p) => p.id === plan_id)
  if (!plan || plan.status === 0) return

  const S = getPlanCoverageLeaves(plan)
  if (S.length && S.every((n) => n.accept_status === 2)) {
    plan.status = 3 // 已完成
    return
  }

  const T = inspectionTasks.filter((t) => t.plan_id === plan_id)
  // 专项计划可不挂目录树：全部关联任务通过即完成
  if (Number(plan.plan_type) === 2 && T.length && T.every((t) => Number(t.status) === 2)) {
    plan.status = 3
    return
  }
  if (T.length) {
    plan.status = 2 // 进行中
    return
  }
  // 复核通过后尚无关联任务 → 未开始
  plan.status = 1
}

/**
 * 上级报验解锁（D3 沿用 V1.16）：下级 accept_status 须全部通过；
 * V2.3.1 §5.2：容器节点(9/10)可挂汇总任务，条件为至少一个直接下级已完成（非全通过）
 */
export function checkUnlock(node) {
  if (!node) return { ok: false, msg: '节点不存在' }
  if (node.node_type === 6) return { ok: true }
  if (node.node_type === 7) return { ok: true }

  // 二级容器：可发起汇总验收任务（task_type 9/10），至少一个直接下级通过即可
  if (node.node_type === 9 || node.node_type === 10) {
    const childType = node.node_type === 9 ? 1 : 7
    const label = node.node_type === 9 ? '单位工程' : '专项节点'
    const children = wbsNodes.filter(
      (n) => n.parent_id === node.id && n.node_type === childType,
    )
    if (!children.length) {
      return { ok: false, msg: `「${node.node_name}」下尚无${label}，请先维护目录树` }
    }
    const passed = children.filter((n) => n.accept_status === 2)
    if (!passed.length) {
      return { ok: false, msg: `至少一个${label}验收通过后，方可发起${node.node_name}汇总任务` }
    }
    return { ok: true }
  }

  // 竣工根：全部单位工程 + 全部专项节点通过
  if (node.node_type === 8) {
    ensureWbsScaffold(node.project_id)
    const units = wbsNodes.filter((n) => n.project_id === node.project_id && n.node_type === 1)
    const specials = wbsNodes.filter((n) => n.project_id === node.project_id && n.node_type === 7)
    const missU = units.filter((n) => n.accept_status !== 2)
    const missS = specials.filter((n) => n.accept_status !== 2)
    if (!units.length) {
      return { ok: false, msg: '实体工程验收下尚无单位工程，不可发起竣工验收' }
    }
    if (!specials.length) {
      return { ok: false, msg: '专项验收下尚无专项节点，请先维护消防/人防等专项节点' }
    }
    if (missU.length || missS.length) {
      return {
        ok: false,
        msg: `竣工前置未齐：单位工程缺 ${missU.map((n) => n.node_name).join('、') || '无'}；专项缺 ${missS.map((n) => n.node_name).join('、') || '无'}`,
      }
    }
    return { ok: true }
  }

  const childTypeMap = {
    5: 6,
    4: 5,
    3: 4,
    2: 3,
    1: 2,
  }
  let expectType = childTypeMap[node.node_type]
  let children = wbsNodes.filter((n) => n.parent_id === node.id && n.node_type === expectType)

  // 单位工程无子单位时，直接看分部
  if (node.node_type === 1 && !children.length) {
    expectType = 3
    children = wbsNodes.filter((n) => n.parent_id === node.id && n.node_type === 3)
    if (!children.length) {
      children = collectDescendants(node.id).filter((n) => n.node_type === 3)
    }
  }

  // 分部无子分部时看分项
  if (node.node_type === 3 && !children.length) {
    children = wbsNodes.filter((n) => n.parent_id === node.id && n.node_type === 5)
  }

  if (!children.length) {
    return {
      ok: false,
      msg: `节点「${node.node_name}」下尚无${NODE_TYPE_LABEL[expectType] || '下级'}，请先维护目录树`,
    }
  }
  const unfinished = children.filter((n) => n.accept_status !== 2)
  if (unfinished.length) {
    return {
      ok: false,
      msg: `下级未全部通过，不可发起：${unfinished.map((n) => n.node_name).join('、')}`,
    }
  }
  return { ok: true }
}

function instantiateItems(task) {
  let templates = []
  if (task.task_type === 1 && task.batch_type_id) {
    templates = getEnabledFormsByBatchType(task.batch_type_id)
  } else if (task.form_template_id) {
    const t = formTemplates.find((f) => f.id === task.form_template_id)
    if (t) templates = [t]
  }
  if (!templates.length) return

  templates.forEach((tpl) => {
    const defs = getItemDefsByTemplate(tpl.id)
    const list = defs.length
      ? defs
      : [
          {
            id: `auto-${tpl.id}`,
            seq_no: 1,
            item_category: 1,
            item_name: `${tpl.template_name}·综合验收项`,
            standard_desc: '符合设计及规范要求',
            need_photo: 0,
          },
        ]
    list.forEach((def) => {
      inspectionItems.push({
        id: `ii-${Date.now()}-${def.id}-${Math.random().toString(36).slice(2, 6)}`,
        task_id: task.id,
        form_template_id: tpl.id,
        item_def_id: def.id,
        seq_no: def.seq_no,
        item_category: def.item_category,
        item_name: def.item_name,
        standard_desc: def.standard_desc || '',
        design_value: '',
        measured_value: '',
        sample_count: 0,
        qualified_count: 0,
        judge_result: 1,
        auto_judged: 0,
        is_required: 1,
        need_photo: def.need_photo || 0,
        remark: '',
      })
    })
  })
}

/** 任务无明细时按模板补齐（兼容历史 seed） */
export function ensureTaskItems(task) {
  if (!task) return
  if (getItemsByTaskId(task.id).length) return
  instantiateItems(task)
}

export function createTask({
  project_id,
  wbs_node_id,
  plan_id = '',
  task_name = '',
  remark = '',
  contractor_org_id = 'org-sg-01',
  supervisor_org_id = 'org-jl-01',
}) {
  const node = wbsNodes.find((n) => n.id === wbs_node_id)
  if (!node) return { ok: false, msg: '验评节点不存在' }

  const unlock = checkUnlock(node)
  if (!unlock.ok) return unlock

  if (node.node_type === 6) {
    if (!node.batch_type_id) return { ok: false, msg: '检验批节点须绑定检验批类型' }
    const forms = getEnabledFormsByBatchType(node.batch_type_id)
    if (!forms.length) return { ok: false, msg: '检验批类型未绑定启用表单，不可创建任务' }
  } else if ([3, 4, 5].includes(node.node_type) && !node.form_template_id) {
    return { ok: false, msg: `${NODE_TYPE_LABEL[node.node_type]}节点须绑定表单模板` }
  }

  // 一节点可上报多个任务（不再做「一节点一有效任务」拦截）
  const task_type = NODE_TO_TASK_TYPE[node.node_type]
  if (!task_type) return { ok: false, msg: '任务类型与节点类型映射不存在' }

  let form_template_id = node.form_template_id || ''
  let batch_type_id = node.batch_type_id || ''
  if (node.node_type === 6) {
    const forms = getEnabledFormsByBatchType(batch_type_id)
    const primary =
      batchTypeForms.find((l) => l.batch_type_id === batch_type_id && l.is_primary === 1) ||
      batchTypeForms.find((l) => l.batch_type_id === batch_type_id)
    form_template_id = primary?.form_template_id || forms[0]?.id || ''
  }

  const owner_final_required =
    task_type === 1
      ? node.is_critical === 1
        ? 1
        : 0
      : [4, 5, 7, 8].includes(task_type)
        ? 1
        : 0

  const id = `tk-${Date.now()}`
  const task = {
    id,
    task_no: `YS-2026-${String(inspectionTasks.length + 1).padStart(3, '0')}`,
    task_name: task_name || node.node_name,
    project_id: project_id || node.project_id,
    wbs_node_id,
    plan_id: plan_id || '',
    unplanned_flag: plan_id ? 0 : 1,
    parent_task_id: '',
    task_type,
    specialty: node.specialty || '',
    location_name: node.location_code || node.node_name,
    form_template_id,
    form_data: {},
    batch_type_id,
    status: 0,
    result: 0,
    self_check_result: null,
    is_hidden_work: node.is_hidden_work || 0,
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
    owner_final_required,
    remark: remark || '',
    created_by: 'u-sg-01',
    created_at: nowStr(),
    updated_by: 'u-sg-01',
    updated_at: nowStr(),
  }

  inspectionTasks.unshift(task)
  instantiateItems(task)

  if (plan_id) {
    const plan = acceptancePlans.find((p) => p.id === plan_id)
    // 一计划可挂多任务：未开始/进行中均可继续发起
    if (plan && [1, 2].includes(plan.status)) {
      if (plan.status === 1) plan.status = 2
      refreshPlanStatus(plan_id)
    }
  }
  syncNodeAccept(task)
  return { ok: true, task }
}

/** 保存自检填报 */
export function saveTaskItems(task, itemsPatch = []) {
  if (task.status !== 0) return { ok: false, msg: '仅待验评可编辑填报' }
  itemsPatch.forEach((p) => {
    const row = inspectionItems.find((i) => i.id === p.id && i.task_id === task.id)
    if (!row) return
    if (p.measured_value !== undefined) row.measured_value = p.measured_value
    if (p.judge_result !== undefined) row.judge_result = Number(p.judge_result)
    if (p.sample_count !== undefined) row.sample_count = Number(p.sample_count) || 0
    if (p.qualified_count !== undefined) row.qualified_count = Number(p.qualified_count) || 0
    if (p.remark !== undefined) row.remark = p.remark
  })
  task.updated_at = nowStr()
  return { ok: true }
}

export function setSelfCheck(task, self_check_result) {
  if (task.status !== 0) return { ok: false, msg: '仅待验评可设置自检结果' }
  task.self_check_result = Number(self_check_result)
  task.updated_at = nowStr()
  return { ok: true }
}

/**
 * 保存草稿（§5.1）：is_draft=1，不计正式任务数、不产生节点状态副作用；
 * 草稿与档案登记互不影响（C1：可以先登记档案再存草稿，也可反向）
 */
export function saveTaskDraft(task, patch = {}) {
  if (task.status !== 0) return { ok: false, msg: '仅待验评可保存草稿' }
  if (patch.remark !== undefined) task.remark = String(patch.remark || '')
  if (patch.form_data) task.form_data = JSON.parse(JSON.stringify(patch.form_data))
  task.is_draft = 1
  task.updated_at = nowStr()
  return { ok: true }
}

function extFromName(name = '') {
  const i = String(name).lastIndexOf('.')
  return i >= 0 ? String(name).slice(i + 1).toLowerCase() : 'jpg'
}

export function addAttachment(row) {
  const file_name = row.file_name || '现场照片.jpg'
  const file_ext = row.file_ext || extFromName(file_name)
  const biz_type = row.biz_type
  let task_id = row.task_id || ''
  if (!task_id && (biz_type === 'TASK' || biz_type === 'ITEM')) {
    return { ok: false, msg: 'biz_type=TASK/ITEM 时 task_id 必填' }
  }
  if (!task_id && biz_type === 'RECTIFY') {
    const rectify = rectificationOrders.find((o) => o.id === row.biz_id)
    task_id = rectify?.source_task_id || ''
  }
  const att = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    biz_type,
    biz_id: row.biz_id,
    task_id,
    file_category: row.file_category || 1,
    file_name,
    file_ext,
    file_url: row.file_url || `#mock-file/${Date.now()}.${file_ext}`,
    file_size: row.file_size ?? 102400,
    content_hash: row.content_hash || '',
    mime_type: row.mime_type || '',
    watermark_flag: row.watermark_flag ?? 1,
    shoot_time: row.shoot_time || '',
    shoot_location: row.shoot_location || '',
    upload_by: row.upload_by || 'u-sg-01',
    upload_time: nowStr(),
    archive_file_code: row.archive_file_code || '',
    is_required_met: row.is_required_met ?? 1,
    /** 专项必传资料槽位（如 fire_design） */
    doc_slot: row.doc_slot || '',
  }
  attachStore.unshift(att)
  return { ok: true, attachment: att }
}

/** 删除附件（演示） */
export function removeAttachment(id) {
  const idx = attachStore.findIndex((a) => a.id === id)
  if (idx < 0) return { ok: false, msg: '附件不存在' }
  attachStore.splice(idx, 1)
  return { ok: true }
}

/**
 * 提交报验：0→1（草稿转正 is_draft=0）
 * 拦截顺序：C2 节点级档案拦截 → C5 影像/附件默认必填 → 明细/专项必传
 */
export function submitInspect(task) {
  if (task.status !== 0) return { ok: false, msg: '仅待验评可提交报验' }
  // C2：节点配置了需填报档案文件则必须先完成档案数据登记（用户主动行为 C1）
  const archiveBlock = checkArchiveBlock(task)
  if (archiveBlock.blocked) return { ok: false, msg: archiveBlock.msg }
  // C5：工程影像/附件资料默认必填（至少一份任务级影像或附件）
  const siteFiles = getAttachments('TASK', task.id).filter((a) =>
    [1, 2, 3].includes(Number(a.file_category)),
  )
  if (!siteFiles.length) {
    return { ok: false, msg: '工程影像/附件资料为默认必填，请至少上传一份现场影像或附件' }
  }
  const miss = missingPhotoItems(task.id)
  if (miss.length) {
    return {
      ok: false,
      msg: `必填影像缺失：${miss.map((i) => i.item_name).join('、')}`,
    }
  }
  if (Number(task.task_type) === 6) {
    const missDocs = missingSpecialRequiredDocs(task, getAttachments('TASK', task.id))
    if (missDocs.length) {
      return {
        ok: false,
        msg: `专项必传资料未齐：${missDocs.map((d) => d.label).join('、')}`,
      }
    }
  }
  const pending = getItemsByTaskId(task.id).filter(
    (i) => i.is_required === 1 && i.judge_result === 0,
  )
  if (pending.length) {
    return { ok: false, msg: `仍有未判定检查项：${pending.map((i) => i.item_name).join('、')}` }
  }

  task.status = 1
  task.is_draft = 0
  task.applicant_id = task.applicant_id || 'u-sg-01'
  task.submit_time = nowStr()
  task.updated_at = nowStr()
  approvalRecords.push({
    id: `ar-${Date.now()}`,
    task_id: task.id,
    node_name: '提交报验',
    action: 1,
    operator_id: 'u-sg-01',
    operator_role: '施工方',
    opinion: '',
    action_time: nowStr(),
  })
  syncNodeAccept(task)
  if (task.plan_id) refreshPlanStatus(task.plan_id)
  return { ok: true }
}

/** 兼容旧入口：不再自动补影像/判定，直接走正式提交校验 */
export function startInspect(task) {
  return submitInspect(task)
}

/** 审批通过（当前链节点）— C6：通过时实时校验档案该级已签章，否则不让过 */
export function approveStep(task, { opinion = '', operator_role } = {}) {
  if (task.status !== 1) return { ok: false, msg: '仅验评中可审批' }
  if (hasBlockFailItems(task.id)) {
    return { ok: false, msg: '存在主控或观感不合格项，禁止办结通过' }
  }
  const next = getNextApprovalRole(task)
  if (!next) return { ok: false, msg: '审批链已完成' }
  const role = operator_role || next
  if (role !== next) return { ok: false, msg: `当前应由「${next}」审批` }

  if (hasOnlyGeneralFail(task.id) && role === '监理' && !String(opinion || '').trim()) {
    return { ok: false, msg: '一般项目不合格仍通过时，须填写审批意见' }
  }

  // C6：档案该级签章实时校验（节点有档案文件配置时强制）
  const signCheck = realtimeCheckArchiveSign(task, role)
  if (!signCheck.ok) return signCheck

  approvalRecords.push({
    id: `ar-${Date.now()}`,
    task_id: task.id,
    node_name: role,
    action: 2,
    operator_id: 'u-approve',
    operator_role: role,
    opinion: opinion || '',
    action_time: nowStr(),
  })
  signatureRecords.push({
    id: `sig-${Date.now()}`,
    task_id: task.id,
    signer_id: 'u-approve',
    signer_role: role,
    ca_cert_id: `CA-DEMO-${role}`,
    seal_id: '',
    sign_file_id: '',
    timestamp_token: '',
    sign_time: nowStr(),
  })

  const still = getNextApprovalRole(task)
  if (!still) {
    task.status = 2
    task.result = 1
    // 办结通过且从未置 0 时记一次通过；此前未赋值则视为一次通过
    if (task.first_pass_flag == null) task.first_pass_flag = 1
    task.finish_time = nowStr()
    task.reviewer_id = 'u-approve'
    archiveWriteFinish(task) // C7：办结状态先落档案（已办结），再同步回本系统
    syncNodeAccept(task)
    if (task.plan_id) refreshPlanStatus(task.plan_id)
    return { ok: true, finished: true }
  }
  task.reviewer_id = 'u-approve'
  task.updated_at = nowStr()
  return { ok: true, finished: false, next: still }
}

/** 兼容旧 passTask：一次性走完审批链（或仅监理一岗） */
export function passTask(task, { opinion = '', operator_role = '监理' } = {}) {
  if (task.status !== 1) return { ok: false, msg: '仅验评中可判定通过' }
  if (hasBlockFailItems(task.id)) {
    return { ok: false, msg: '存在主控或观感不合格项，禁止办结通过' }
  }
  if (hasOnlyGeneralFail(task.id) && !String(opinion || '').trim()) {
    return { ok: false, msg: '一般项目不合格仍通过时，须填写审批意见' }
  }
  let guard = 0
  while (getNextApprovalRole(task) && guard < 10) {
    const r = approveStep(task, { opinion, operator_role: getNextApprovalRole(task) })
    if (!r.ok) return r
    if (r.finished) return { ok: true }
    guard += 1
  }
  void operator_role
  return { ok: true }
}

/** 驳回（C7：先写档案「退回待补资料」，再同步回本系统；D4：驳回结果即整改来源） */
export function rejectTask(task, opinion, operator_role = '监理') {
  if (task.status !== 1) return { ok: false, msg: '仅验评中可判定不通过' }
  if (!String(opinion || '').trim()) return { ok: false, msg: '退回意见不能为空' }
  // C7：退回先写档案
  archiveWriteReject(task, { operator_role })
  approvalRecords.push({
    id: `ar-${Date.now()}`,
    task_id: task.id,
    node_name: operator_role,
    action: 3,
    operator_id: 'u-jl-01',
    operator_role,
    opinion: String(opinion).trim(),
    action_time: nowStr(),
  })
  task.status = 3
  task.result = 2
  task.first_pass_flag = 0
  task.updated_at = nowStr()
  syncNodeAccept(task)
  if (task.plan_id) refreshPlanStatus(task.plan_id)
  return { ok: true }
}

/** 退回重报：回待验评，不新开任务 */
export function rollbackToDraft(task) {
  if (![1, 3].includes(task.status)) return { ok: false, msg: '仅验评中或不通过可退回重报' }
  task.status = 0
  task.result = 0
  task.submit_time = ''
  task.updated_at = nowStr()
  syncNodeAccept(task)
  return { ok: true }
}

/**
 * 生成整改（D4）：整改=审批驳回的结果，不存在单独「下发整改单」动作；
 * 谁提交的验收流程谁来整改（responsible=任务提交人）；issuer_id 语义=驳回人（取最近一条驳回记录）
 */
export function createRectify(task, problem_desc) {
  if (task.status !== 3) return { ok: false, msg: '仅不通过可生成整改（整改为审批驳回的结果）' }
  const open = rectificationOrders.find(
    (o) => o.source_task_id === task.id && o.status !== 3,
  )
  if (open) return { ok: false, msg: '已有未关闭整改单' }
  const desc = String(problem_desc || '').trim()
  if (!desc) return { ok: false, msg: '问题描述不能为空' }
  const rejectRec = getLatestRejectRecord(task.id)
  const now = nowStr()
  const id = `rc-${Date.now()}`
  const order = {
    id,
    order_no: `ZG-2026-${String(rectificationOrders.length + 1).padStart(3, '0')}`,
    source_task_id: task.id,
    project_id: task.project_id,
    problem_desc: desc,
    problem_category: 9,
    responsible_org_id: task.contractor_org_id,
    responsible_user_id: task.applicant_id || '',
    measure: '',
    deadline: '2026-08-15 18:00:00',
    status: 0,
    issuer_id: rejectRec?.operator_id || 'u-jl-01',
    issue_time: rejectRec?.action_time || now,
    status_changed_at: now,
    archive_doc_status: RECTIFY_ARCHIVE_DOC_STATUS.REJECTED,
    round_count: 0,
    close_time: '',
    close_result: 0,
  }
  rectificationOrders.unshift(order)
  task.current_rectify_id = id
  task.status = 4
  task.first_pass_flag = 0
  task.updated_at = now
  syncNodeAccept(task)
  if (task.plan_id) refreshPlanStatus(task.plan_id)
  return { ok: true, order }
}

/** 施工填写整改措施 */
export function saveRectifyMeasure(order, measure) {
  if (![0, 1, 4].includes(order.status)) return { ok: false, msg: '当前整改单不可编辑措施' }
  if (!String(measure || '').trim()) return { ok: false, msg: '整改措施不能为空' }
  order.measure = String(measure).trim()
  if (order.status === 0) {
    order.status = 1
    order.status_changed_at = nowStr()
  }
  return { ok: true }
}

/** 提交复验：整改中 → 待复验 */
export function submitReinspectRequest(task) {
  if (task.status !== 4) return { ok: false, msg: '仅整改中可提交复验' }
  const rectify = rectificationOrders.find((o) => o.id === task.current_rectify_id)
  if (!rectify) return { ok: false, msg: '未找到整改单' }
  if (!String(rectify.measure || '').trim()) return { ok: false, msg: '请先填写整改措施' }
  const afterPhotos = getAttachments('RECTIFY', rectify.id).filter((a) => a.file_category === 8)
  if (!afterPhotos.length) {
    return { ok: false, msg: '缺整改后影像（file_category=8），禁止提交复验' }
  }
  rectify.status = 2
  rectify.status_changed_at = nowStr()
  rectify.archive_doc_status = RECTIFY_ARCHIVE_DOC_STATUS.REINSPECT
  archiveWriteReinspect(task) // §4.7：档案文档置「可复验」
  task.status = 5
  task.updated_at = nowStr()
  syncNodeAccept(task)
  reinspectRounds.push({
    id: `rr-${Date.now()}`,
    rectify_id: rectify.id,
    source_task_id: task.id,
    round_no: (task.reinspect_count || 0) + 1,
    submit_time: nowStr(),
    reinspect_user_id: '',
    reinspect_time: '',
    result: 0,
    opinion: '',
  })
  if (task.plan_id) refreshPlanStatus(task.plan_id)
  return { ok: true }
}

/** 复验结论 */
export function decideReinspect(task, { pass = true, opinion = '' } = {}) {
  if (task.status !== 5) return { ok: false, msg: '仅待复验可判定' }
  const rectify = rectificationOrders.find((o) => o.id === task.current_rectify_id)
  const round = [...reinspectRounds]
    .reverse()
    .find((r) => r.source_task_id === task.id && r.result === 0)
  task.reinspect_count = (task.reinspect_count || 0) + 1
  if (round) {
    round.reinspect_user_id = 'u-jl-01'
    round.reinspect_time = nowStr()
    round.result = pass ? 1 : 2
    round.opinion = opinion || (pass ? '复验通过' : '复验不通过')
    round.round_no = task.reinspect_count
  }
  if (pass) {
    if (rectify) {
      rectify.status = 3
      rectify.close_time = nowStr()
      rectify.close_result = 1
      rectify.round_count = task.reinspect_count
      rectify.status_changed_at = nowStr()
      rectify.archive_doc_status = RECTIFY_ARCHIVE_DOC_STATUS.CLOSED
    }
    archiveWriteFinish(task, { closed: true }) // §4.7：复验通过，档案文档「已关闭」
    task.status = 2
    task.result = 1
    task.first_pass_flag = 0
    task.finish_time = nowStr()
    task.current_rectify_id = ''
  } else {
    if (rectify) {
      rectify.status = 1
      rectify.status_changed_at = nowStr()
      rectify.archive_doc_status = RECTIFY_ARCHIVE_DOC_STATUS.REJECTED
    }
    archiveWriteReject(task, {}) // C7：复验不通过同样先写档案「退回待补资料」
    task.status = 4
    task.result = 2
    task.first_pass_flag = 0
  }
  task.updated_at = nowStr()
  syncNodeAccept(task)
  if (task.plan_id) refreshPlanStatus(task.plan_id)
  return { ok: true }
}

/** 兼容旧一键复验：自动补齐后通过 */
export function submitReinspect(task) {
  if (task.status === 3) {
    const r = createRectify(task, '复验前自动下发整改')
    if (!r.ok) return r
  }
  if (task.status === 4) {
    const rectify = rectificationOrders.find((o) => o.id === task.current_rectify_id)
    if (rectify) {
      saveRectifyMeasure(rectify, rectify.measure || '已按要求整改完成')
      const has = getAttachments('RECTIFY', rectify.id).some((a) => a.file_category === 8)
      if (!has) {
        addAttachment({
          biz_type: 'RECTIFY',
          biz_id: rectify.id,
          task_id: task.id,
          file_name: '整改后对照.jpg',
          file_category: 8,
          file_ext: 'jpg',
        })
      }
    }
    const sub = submitReinspectRequest(task)
    if (!sub.ok) return sub
  }
  if (task.status === 5) return decideReinspect(task, { pass: true, opinion: '复验通过' })
  return { ok: false, msg: '当前状态不可复验' }
}

/* —— 计划 —— */
export function createPlan(payload) {
  const required = ['plan_name', 'wbs_node_id', 'content', 'plan_date', 'project_id']
  for (const k of required) {
    if (!payload[k]) return { ok: false, msg: `${k} 不能为空` }
  }
  const plan = {
    id: `pl-${Date.now()}`,
    plan_no: `JH-2026-${String(acceptancePlans.length + 1).padStart(3, '0')}`,
    project_id: payload.project_id,
    plan_type: Number(payload.plan_type) || 1,
    plan_name: payload.plan_name,
    wbs_node_id: payload.wbs_node_id,
    content: payload.content,
    plan_date: payload.plan_date,
    contractor_org_id: payload.contractor_org_id || 'org-sg-01',
    supervisor_org_id: payload.supervisor_org_id || 'org-jl-01',
    status: 0,
    change_flag: 0,
    reviewer_id: '',
    review_time: '',
    review_opinion: '',
    remark: payload.remark || '',
  }
  acceptancePlans.unshift(plan)
  return { ok: true, plan }
}

export function updatePlan(plan, patch) {
  if (![0, 1].includes(plan.status) && !patch.force_change) {
    return { ok: false, msg: '当前状态不可直接编辑，请走变更' }
  }
  Object.assign(plan, patch)
  if (plan.status >= 1 && patch.force_change) plan.change_flag = 1
  return { ok: true }
}

export function reviewPlan(plan, { pass = true, review_opinion = '' } = {}) {
  if (plan.status !== 0) return { ok: false, msg: '仅待复核计划可复核' }
  if (!pass && !String(review_opinion || '').trim()) {
    return { ok: false, msg: '退回时复核意见必填' }
  }
  plan.reviewer_id = 'u-jl-01'
  plan.review_time = nowStr()
  plan.review_opinion = review_opinion || ''
  if (pass) plan.status = 1 // 未开始
  return { ok: true }
}

export function cancelPlan(plan) {
  if (plan.status === 3) return { ok: false, msg: '已完成不可取消' }
  const idx = acceptancePlans.findIndex((p) => p.id === plan.id)
  if (idx < 0) return { ok: false, msg: '计划不存在' }
  acceptancePlans.splice(idx, 1)
  return { ok: true }
}

/* —— WBS —— */
export function upsertWbsNode(payload, id = '') {
  if (!payload.node_name || !payload.project_id || !payload.node_type) {
    return { ok: false, msg: '节点名称、项目、类型必填' }
  }
  const node_type = Number(payload.node_type)
  ensureWbsScaffold(payload.project_id)

  // 系统骨架节点仅允许改名称等展示字段
  if (id) {
    const exist = wbsNodes.find((n) => n.id === id)
    if (exist && WBS_SYSTEM_NODE_TYPES.includes(exist.node_type)) {
      Object.assign(exist, {
        node_name: payload.node_name || exist.node_name,
        location_code: payload.location_code ?? exist.location_code,
        specialty: payload.specialty ?? exist.specialty,
        form_template_id:
          exist.node_type === 8
            ? payload.form_template_id || exist.form_template_id
            : exist.form_template_id,
        updated_at: nowStr(),
        updated_by: 'u-sg-01',
      })
      return { ok: true, node: exist }
    }
  }

  if (!WBS_EDITABLE_NODE_TYPES.includes(node_type)) {
    return {
      ok: false,
      msg: '可维护类型：单位工程/子单位/分部/子分部/分项/检验批/专项节点',
    }
  }

  let parent_id = payload.parent_id || ''
  if (node_type === 1 && !parent_id) parent_id = getEntityRootNode(payload.project_id)?.id || ''
  if (node_type === 7 && !parent_id) parent_id = getSpecialRootNode(payload.project_id)?.id || ''

  const parent = parent_id ? wbsNodes.find((n) => n.id === parent_id) : null
  if (node_type === 1 && (!parent || parent.node_type !== 9)) {
    return { ok: false, msg: '单位工程须挂在「实体工程验收」下' }
  }
  if (node_type === 7 && (!parent || parent.node_type !== 10)) {
    return { ok: false, msg: '专项节点须挂在「专项验收」下' }
  }
  if ([2, 3, 4, 5, 6].includes(node_type) && !parent) {
    return { ok: false, msg: '请选择父节点' }
  }
  if (node_type === 7 && !payload.special_type) {
    return { ok: false, msg: '专项节点须选择专项类型（消防/人防等）' }
  }
  if (node_type === 6 && !payload.batch_type_id) {
    return { ok: false, msg: '检验批须选择检验批类型' }
  }
  if ([3, 4, 5].includes(node_type) && !payload.form_template_id) {
    return { ok: false, msg: '分项/子分部/分部须绑定表单模板' }
  }
  if (node_type === 6) {
    const forms = getEnabledFormsByBatchType(payload.batch_type_id)
    if (!forms.length) return { ok: false, msg: '所选类型未绑定启用表单' }
  }
  if (id) {
    const node = wbsNodes.find((n) => n.id === id)
    if (!node) return { ok: false, msg: '节点不存在' }
    Object.assign(node, {
      ...payload,
      parent_id,
      node_type,
      special_type: node_type === 7 ? payload.special_type || '' : '',
      is_critical: node_type === 6 ? Number(payload.is_critical) || 0 : 0,
      updated_at: nowStr(),
      updated_by: 'u-sg-01',
    })
    return { ok: true, node }
  }
  const node = {
    id: `wn-${Date.now()}`,
    project_id: payload.project_id,
    parent_id,
    node_type,
    node_name: payload.node_name,
    location_code: payload.location_code || '',
    batch_type_id: payload.batch_type_id || '',
    form_template_id: payload.form_template_id || '',
    specialty: payload.specialty || '',
    special_type: node_type === 7 ? payload.special_type || '' : '',
    is_hidden_work: Number(payload.is_hidden_work) || 0,
    is_critical: node_type === 6 ? Number(payload.is_critical) || 0 : 0,
    accept_status: 0,
    batch_scheme_id: node_type === 1 ? payload.batch_scheme_id || '' : '',
    sort_no: Number(payload.sort_no) || 0,
    created_by: 'u-sg-01',
    created_at: nowStr(),
    updated_by: 'u-sg-01',
    updated_at: nowStr(),
  }
  wbsNodes.push(node)
  return { ok: true, node }
}

export function removeWbsNode(id) {
  const node = wbsNodes.find((n) => n.id === id)
  if (!node) return { ok: false, msg: '节点不存在' }
  if (WBS_SYSTEM_NODE_TYPES.includes(node.node_type)) {
    return { ok: false, msg: '系统骨架节点（竣工/实体工程/专项验收）不可删除' }
  }
  const hasChild = wbsNodes.some((n) => n.parent_id === id)
  if (hasChild) return { ok: false, msg: '请先删除子节点' }
  const hasTask = inspectionTasks.some((t) => t.wbs_node_id === id)
  if (hasTask) return { ok: false, msg: '节点已关联验评任务，不可删除' }
  const idx = wbsNodes.findIndex((n) => n.id === id)
  wbsNodes.splice(idx, 1)
  return { ok: true }
}

export { ensureWbsScaffold, getCompleteRootNode, getEntityRootNode, getSpecialRootNode }

/* —— 表单/类型 —— */
export function saveFormTemplate(payload, id = '') {
  if (!payload.template_code || !payload.template_name) {
    return { ok: false, msg: '模板编码与名称必填' }
  }
  const dup = formTemplates.find(
    (t) => t.template_code === payload.template_code && t.id !== id,
  )
  if (dup) return { ok: false, msg: '模板编码重复' }
  if (id) {
    const row = formTemplates.find((t) => t.id === id)
    if (!row) return { ok: false, msg: '模板不存在' }
    Object.assign(row, payload)
    return { ok: true, template: row }
  }
  const row = {
    id: `ft-${Date.now()}`,
    template_code: payload.template_code,
    template_name: payload.template_name,
    apply_level: Number(payload.apply_level) || 1,
    source_kind: Number(payload.source_kind) || 2,
    specialty: payload.specialty || '',
    standard_ref: payload.standard_ref || '',
    version_no: payload.version_no || 'V1',
    status: Number(payload.status) ?? 0,
    form_schema: payload.form_schema || { fields: [] },
  }
  formTemplates.unshift(row)
  return { ok: true, template: row }
}

export function setTemplateStatus(template, status) {
  template.status = Number(status)
  return { ok: true }
}

export function bindBatchTypeForm(batch_type_id, form_template_id, { is_primary = 0 } = {}) {
  if (!batch_type_id || !form_template_id) return { ok: false, msg: '类型与表单必选' }
  const exists = batchTypeForms.find(
    (l) => l.batch_type_id === batch_type_id && l.form_template_id === form_template_id,
  )
  if (exists) return { ok: false, msg: '已绑定该表单' }
  const link = {
    id: `btf-${Date.now()}`,
    batch_type_id,
    form_template_id,
    sort_no: batchTypeForms.filter((l) => l.batch_type_id === batch_type_id).length + 1,
    is_primary: is_primary ? 1 : 0,
  }
  if (link.is_primary === 1) {
    batchTypeForms
      .filter((l) => l.batch_type_id === batch_type_id)
      .forEach((l) => {
        l.is_primary = 0
      })
  }
  batchTypeForms.push(link)
  return { ok: true, link }
}

export function unbindBatchTypeForm(link_id) {
  const idx = batchTypeForms.findIndex((l) => l.id === link_id)
  if (idx < 0) return { ok: false, msg: '关联不存在' }
  batchTypeForms.splice(idx, 1)
  return { ok: true }
}

export function createBatchType(payload) {
  if (!payload.type_code || !payload.type_name || !payload.specialty) {
    return { ok: false, msg: '类型编码、名称、专业必填' }
  }
  if (batchTypes.some((t) => t.type_code === payload.type_code)) {
    return { ok: false, msg: '类型编码重复' }
  }
  const row = {
    id: `bt-${Date.now()}`,
    type_code: payload.type_code,
    type_name: payload.type_name,
    specialty: payload.specialty,
    status: Number(payload.status) ?? 1,
    remark: payload.remark || '',
  }
  batchTypes.push(row)
  return { ok: true, type: row }
}

export function saveFormItemDef(payload, id = '') {
  if (!payload.template_id || !payload.item_name) {
    return { ok: false, msg: '模板与检查项名称必填' }
  }
  if (id) {
    const row = formItemDefs.find((d) => d.id === id)
    if (!row) return { ok: false, msg: '检查项不存在' }
    Object.assign(row, {
      seq_no: Number(payload.seq_no) || row.seq_no,
      item_category: Number(payload.item_category) || 1,
      item_name: payload.item_name,
      standard_desc: payload.standard_desc || '',
      check_method: payload.check_method || '',
      check_freq: payload.check_freq || '',
      need_photo: Number(payload.need_photo) || 0,
      enable_auto_judge: Number(payload.enable_auto_judge) || 0,
    })
    return { ok: true, def: row }
  }
  const row = {
    id: `def-${Date.now()}`,
    template_id: payload.template_id,
    seq_no: Number(payload.seq_no) || formItemDefs.filter((d) => d.template_id === payload.template_id).length + 1,
    item_category: Number(payload.item_category) || 1,
    item_name: payload.item_name,
    standard_desc: payload.standard_desc || '',
    check_method: payload.check_method || '',
    check_freq: payload.check_freq || '',
    need_photo: Number(payload.need_photo) || 0,
    enable_auto_judge: Number(payload.enable_auto_judge) || 0,
  }
  formItemDefs.push(row)
  return { ok: true, def: row }
}

export function removeFormItemDef(id) {
  const idx = formItemDefs.findIndex((d) => d.id === id)
  if (idx < 0) return { ok: false, msg: '检查项不存在' }
  formItemDefs.splice(idx, 1)
  return { ok: true }
}

/** 默认资料：按节点类型列出已导入模板 */
export function getDefaultMaterialsByNodeType(node_type) {
  return defaultMaterialBinds
    .filter((b) => b.node_type === Number(node_type))
    .sort((a, b) => a.sort_no - b.sort_no)
}

/** 从验收单模板库导入到指定结构节点类型 */
export function importDefaultMaterial(node_type, form_template_id) {
  const nt = Number(node_type)
  if (![1, 2, 3, 4, 5, 6].includes(nt)) {
    return { ok: false, msg: '仅支持单位工程～检验批节点类型' }
  }
  if (!form_template_id) return { ok: false, msg: '请选择模板' }
  const tpl = formTemplates.find((t) => t.id === form_template_id)
  if (!tpl) return { ok: false, msg: '模板不存在' }
  if (tpl.status !== 1) return { ok: false, msg: '仅可导入已启用模板' }
  if (defaultMaterialBinds.some((b) => b.node_type === nt && b.form_template_id === form_template_id)) {
    return { ok: false, msg: '该模板已在本节点类型下' }
  }
  const sort_no =
    defaultMaterialBinds.filter((b) => b.node_type === nt).reduce((m, b) => Math.max(m, b.sort_no), 0) + 1
  const row = {
    id: `dmb-${Date.now()}`,
    node_type: nt,
    form_template_id,
    sort_no,
  }
  defaultMaterialBinds.push(row)
  return { ok: true, bind: row }
}

export function removeDefaultMaterial(id) {
  const idx = defaultMaterialBinds.findIndex((b) => b.id === id)
  if (idx < 0) return { ok: false, msg: '记录不存在' }
  defaultMaterialBinds.splice(idx, 1)
  return { ok: true }
}

/** 平面图默认区位（viewBox 0~100），按分部 id 锚定 */
const DIVISION_PLAN_LAYOUT = {
  'wn-div-1': {
    path: 'M12,28 L48,28 L52,38 L52,62 L8,62 L8,38 Z',
    labelX: 30,
    labelY: 45,
  },
  'wn-div-2': {
    path: 'M14,64 L46,64 L46,78 L14,78 Z',
    labelX: 30,
    labelY: 71,
  },
  'wn-div-3': {
    path: 'M58,22 L88,18 L92,72 L62,76 Z',
    labelX: 75,
    labelY: 48,
  },
  'wn-div-4': {
    path: 'M18,82 L72,82 L78,92 L12,92 Z',
    labelX: 45,
    labelY: 87,
  },
}

function buildDivisionPlanStats(project_id) {
  let divisions = wbsNodes.filter((n) => n.node_type === 3)
  if (project_id) divisions = divisions.filter((n) => n.project_id === project_id)

  return divisions.map((div, idx) => {
    const descendants = collectDescendants(div.id)
    const batches = descendants.filter((n) => n.node_type === 6)
    const items = descendants.filter((n) => n.node_type === 5)
    const batchDone = batches.length > 0 && batches.every((n) => n.accept_status === 2)
    const completed = div.accept_status === 2 || batchDone
    const layout = DIVISION_PLAN_LAYOUT[div.id] || {
      path: '',
      labelX: 18 + (idx % 4) * 20,
      labelY: 30 + Math.floor(idx / 4) * 18,
    }
    const batchTotal = batches.length
    const batchPassed = batches.filter((n) => n.accept_status === 2).length
    const batchInProgress = batches.filter((n) => n.accept_status === 1).length
    const batchPending = batches.filter((n) => n.accept_status === 0).length
    const batchRectifying = batches.filter((n) => [3, 4, 5].includes(n.accept_status)).length
    return {
      id: div.id,
      name: div.node_name,
      specialty: div.specialty || '—',
      location_code: div.location_code || '—',
      project_id: div.project_id,
      project_name: resolveProjectName(div.project_id),
      completed,
      statusLabel: completed ? '验收完成' : '未验收完成',
      accept_status: div.accept_status,
      path: layout.path,
      labelX: layout.labelX,
      labelY: layout.labelY,
      batchTotal,
      batchPassed,
      batchInProgress,
      batchPending,
      batchRectifying,
      itemTotal: items.length,
      passRate: batchTotal ? Math.round((batchPassed / batchTotal) * 100) : completed ? 100 : 0,
    }
  })
}

/** 实体 / 专项任务类型 */
export const PHYSICAL_TASK_TYPES = [1, 2, 3, 4, 5, 7, 8]
export const SPECIAL_TASK_TYPES = [6]
/** 实体 / 专项节点类型（node_type） */
export const PHYSICAL_NODE_TYPES = [1, 2, 3, 4, 5, 6]
export const SPECIAL_NODE_TYPES = [7]

/**
 * 统计看板聚合
 * @param {string} project_id
 * @param {{ scope?: 'all' | 'physical' | 'special' }} [opts]
 */
export function buildQmDashboard(project_id, opts = {}) {
  const scope = opts.scope || 'all'
  const taskTypeSet =
    scope === 'physical'
      ? new Set(PHYSICAL_TASK_TYPES)
      : scope === 'special'
        ? new Set(SPECIAL_TASK_TYPES)
        : null
  const nodeTypeSet =
    scope === 'physical'
      ? new Set(PHYSICAL_NODE_TYPES)
      : scope === 'special'
        ? new Set(SPECIAL_NODE_TYPES)
        : null

  let nodes = [...wbsNodes]
  let tasks = [...inspectionTasks]
  let rectifies = [...rectificationOrders]
  let plans = [...acceptancePlans]
  if (project_id) {
    nodes = nodes.filter((n) => n.project_id === project_id)
    tasks = tasks.filter((t) => t.project_id === project_id)
    rectifies = rectifies.filter((r) => r.project_id === project_id)
    plans = plans.filter((p) => p.project_id === project_id)
  }
  if (nodeTypeSet) nodes = nodes.filter((n) => nodeTypeSet.has(n.node_type))
  if (taskTypeSet) tasks = tasks.filter((t) => taskTypeSet.has(t.task_type))

  const taskIds = new Set(tasks.map((t) => t.id))
  if (taskTypeSet) {
    rectifies = rectifies.filter((r) => taskIds.has(r.source_task_id))
  }
  if (scope === 'physical') {
    plans = plans.filter((p) => [1, 3].includes(p.plan_type))
  } else if (scope === 'special') {
    plans = plans.filter((p) => p.plan_type === 2)
  }

  const nodeTotal = nodes.length
  const nodeCompleted = nodes.filter((n) => n.accept_status === 2).length
  const nodeCompleteRate = nodeTotal ? Math.round((nodeCompleted / nodeTotal) * 100) : 0

  const taskTotal = tasks.length
  const passed = tasks.filter((t) => t.status === 2)
  const taskPassed = passed.length
  const firstPass = passed.filter((t) => t.first_pass_flag === 1)
  const passRate = taskTotal ? Math.round((taskPassed / taskTotal) * 100) : 0
  const firstPassRate = taskPassed ? Math.round((firstPass.length / taskPassed) * 100) : 0

  const rectifyTotal = rectifies.length
  const rectifying = rectifies.filter((r) => r.status !== 3).length
  const rectifyClosed = rectifies.filter((r) => r.status === 3).length
  const rectifyCompleteRate = rectifyTotal ? Math.round((rectifyClosed / rectifyTotal) * 100) : 0

  const today = nowStr().slice(0, 10)
  const now = nowStr()
  const planOverdueCount = plans.filter(
    (p) => p.status !== 3 && p.plan_date && String(p.plan_date).slice(0, 10) < today,
  ).length
  const rectifyOverdueCount = rectifies.filter(
    (r) => r.status !== 3 && r.deadline && String(r.deadline) < now,
  ).length

  const byDivision = scope === 'special' ? [] : buildDivisionPlanStats(project_id)
  return {
    nodeTotal,
    nodeCompleted,
    nodeCompleteRate,
    taskTotal,
    taskPassed,
    passRate,
    firstPassRate,
    rectifyTotal,
    rectifying,
    rectifyCompleteRate,
    planOverdueCount,
    rectifyOverdueCount,
    byDivision,
    total: taskTotal,
    divisionCompleted: byDivision.filter((d) => d.completed).length,
    divisionTotal: byDivision.length,
  }
}

/** 看板左右双栏：实体 + 专项（项目级） */
export function buildQmDashboardPanels(project_id) {
  return {
    physical: buildQmDashboard(project_id, { scope: 'physical' }),
    special: buildQmDashboard(project_id, { scope: 'special' }),
    // 平面图仍用实体分部
    byDivision: buildDivisionPlanStats(project_id),
  }
}

/**
 * 指挥部项目验收阶段：已完成 / 验收中 / 未开始
 * 以单位工程节点为主，无节点时回退任务状态
 */
function resolveProjectAcceptPhase(project_id) {
  const units = wbsNodes.filter((n) => n.project_id === project_id && n.node_type === 1)
  const tasks = inspectionTasks.filter((t) => t.project_id === project_id)
  if (units.length) {
    if (units.every((u) => u.accept_status === 2)) return 'completed'
    if (units.every((u) => u.accept_status === 0) && !tasks.some((t) => Number(t.status) > 0)) {
      return 'not_started'
    }
    return 'in_progress'
  }
  if (!tasks.length) return 'not_started'
  if (tasks.every((t) => Number(t.status) === 2)) return 'completed'
  if (tasks.every((t) => Number(t.status) === 0)) return 'not_started'
  return 'in_progress'
}

/** 指挥部 · 项目统计 */
export function buildHqProjectStats(projectOptions = []) {
  const fromData = new Set(
    [...wbsNodes, ...inspectionTasks].map((x) => x.project_id).filter(Boolean),
  )
  const fromOpts = (projectOptions || []).map((p) => p.id).filter(Boolean)
  const ids = [...new Set([...fromOpts, ...fromData])]
  let projectInProgress = 0
  let projectCompleted = 0
  let projectNotStarted = 0
  ids.forEach((pid) => {
    const phase = resolveProjectAcceptPhase(pid)
    if (phase === 'completed') projectCompleted += 1
    else if (phase === 'not_started') projectNotStarted += 1
    else projectInProgress += 1
  })
  return {
    projectTotal: ids.length,
    projectInProgress,
    projectCompleted,
    projectNotStarted,
  }
}

/** 指挥部看板：项目统计 + 实体 + 专项 */
export function buildHqQmDashboardPanels(projectOptions = []) {
  return {
    projects: buildHqProjectStats(projectOptions),
    physical: buildQmDashboard('', { scope: 'physical' }),
    special: buildQmDashboard('', { scope: 'special' }),
    byDivision: buildDivisionPlanStats(''),
  }
}

/** 指挥部实体验收台账：按项目汇总 */
export function buildQmLedgerByProject(projectOptions = []) {
  const fromData = new Set(wbsNodes.map((n) => n.project_id).filter(Boolean))
  const fromOpts = (projectOptions || []).map((p) => p.id).filter(Boolean)
  const ids = [...new Set([...fromOpts, ...fromData])]
  return ids.map((project_id) => {
    const opt = (projectOptions || []).find((p) => p.id === project_id)
    const stats = buildQmDashboard(project_id, { scope: 'physical' })
    return {
      project_id,
      project_name: opt?.fullName || opt?.label || resolveProjectName(project_id),
      ...stats,
    }
  })
}

export function findTask(id) {
  return inspectionTasks.find((t) => t.id === id)
}

/** 按 task_type 解析编辑页路径（9/10 容器汇总任务复用单位/专项页） */
export function resolveTaskEditPath(task_type, task_id) {
  const map = {
    1: '/qm/inspect/batch/edit',
    2: '/qm/inspect/part/edit',
    3: '/qm/inspect/part/edit',
    4: '/qm/inspect/part/edit',
    5: '/qm/inspect/unit/edit',
    6: '/qm/inspect/special/edit',
    7: '/qm/inspect/complete/edit',
    8: '/qm/inspect/unit/edit',
    9: '/qm/inspect/unit/edit',
    10: '/qm/inspect/special/edit',
  }
  const base = map[task_type] || '/qm/inspect/batch/edit'
  return task_id ? `${base}?id=${task_id}` : base
}

/** 按 node_type 解析编辑页路径 */
export function resolveEditPathByNodeType(node_type, task_id) {
  return resolveTaskEditPath(NODE_TO_TASK_TYPE[node_type], task_id)
}

export function findPlan(id) {
  return acceptancePlans.find((p) => p.id === id)
}

export function findRectify(id) {
  return rectificationOrders.find((r) => r.id === id)
}

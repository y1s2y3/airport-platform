/**
 * 质量验评 · 状态机与业务操作 — 对齐 data-model-for-验评 V2.3.1 不变量
 * C1 档案登记=用户主动；C2 节点级拦截；C5 附件默认必填；C6 通过前档案签章实时校验；
 * C7 状态以档案为准（退回先写档案）；D2 审批链快照锁定；D3 逐级解锁；D4 整改=驳回结果
 * 禁止后端；仅内存 Mock
 */
import {
  getEffectiveSpecialties,
  isValidWbsSpecialties,
  normalizeSpecialties,
  syncSpecialtyFields,
} from '../constants/wbsSpecialty.js'
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
import { joinLocationLabels } from './constructionLocation.js'
import {
  batchTypeForms,
  defaultMaterialBinds,
  formItemDefs,
  formTemplates,
  getEnabledFormsByBatchType,
  getItemDefsByTemplate,
} from './qmFormTemplates.js'

import { attachments as attachStore, signatureRecords } from './qmAttachments.js'
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
import { QM_APPROVER_CANDIDATES } from './qmApproverConfig.js'
import {
  canSubmitByElecArchive,
  findActiveTaskOnNode,
  getApprovalPostForNodeType,
  listApproverCandidatesForNodeType,
  nodeRequiredDocsEmpty,
  refreshTaskElecArchiveStatus,
} from './qmInspectV2.js'

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
 * 审批链：已配置手动流程 → 用手动级名称；否则回落档案回传链（兼容旧任务）。
 */
export function getApprovalChain(task) {
  const manual = getManualFlowNodes(task)
  if (manual.length) return manual.map((n) => n.label)
  return getArchiveChain(task)
}

/** 是否已用本系统手动审批链驱动（有配置级即走手动会签/或签） */
export function usesManualApprovalFlow(task) {
  return getManualFlowNodes(task).length > 0
}

/** 手动审批方式文案 */
export const MANUAL_APPROVAL_MODE = { countersign: '会签', orsign: '或签' }

export function defaultManualLevelLabel(level) {
  const names = ['', '一级审批人', '二级审批人', '三级审批人', '四级审批人', '五级审批人']
  return names[level] || `第${level}级审批人`
}

export function getManualApprovalFlow(task) {
  return Array.isArray(task?.manual_approval_flow) ? task.manual_approval_flow : []
}

export function getManualFlowNodes(task) {
  return getManualApprovalFlow(task)
    .slice()
    .sort((a, b) => Number(a.level) - Number(b.level))
    .map((n, idx) => {
      const level = Number(n.level) || idx + 1
      return {
        ...n,
        level,
        label: n.label || defaultManualLevelLabel(level),
        role: n.role || '',
        approver_ids: Array.isArray(n.approver_ids) ? n.approver_ids : [],
        need_seal: Number(n.need_seal) === 1 ? 1 : 0,
        cc_ids: Array.isArray(n.cc_ids) ? n.cc_ids : [],
        mode: n.mode === 'orsign' ? 'orsign' : 'countersign',
      }
    })
}

export function validateManualApprovalFlow(flow) {
  if (!Array.isArray(flow) || !flow.length) {
    return { ok: false, msg: '请先配置至少一级审批人' }
  }
  for (const raw of flow) {
    const label = raw.label || defaultManualLevelLabel(raw.level)
    if (!raw.role) {
      return { ok: false, msg: `「${label}」请选择岗位` }
    }
    if (!Array.isArray(raw.approver_ids) || !raw.approver_ids.length) {
      return { ok: false, msg: `「${label}」请至少选择一名审批人` }
    }
  }
  return { ok: true }
}

export function getLevelPassRecords(task_id, label) {
  return approvalRecords.filter(
    (r) => r.task_id === task_id && r.action === 2 && r.operator_role === label,
  )
}

export function isManualLevelDone(task, node) {
  if (!node) return true
  const passedIds = getLevelPassRecords(task.id, node.label).map((r) => r.operator_id)
  if (node.mode === 'orsign') {
    return node.approver_ids.some((id) => passedIds.includes(id))
  }
  return node.approver_ids.every((id) => passedIds.includes(id))
}

export function getCurrentManualNode(task) {
  for (const node of getManualFlowNodes(task)) {
    if (!isManualLevelDone(task, node)) return node
  }
  return null
}

export function getManualLevelProgress(task, node) {
  if (!task || !node) return { passed: 0, total: 0, mode: 'countersign' }
  const passedIds = new Set(getLevelPassRecords(task.id, node.label).map((r) => r.operator_id))
  const passed = node.approver_ids.filter((id) => passedIds.has(id)).length
  return { passed, total: node.approver_ids.length, mode: node.mode }
}

export function resolveApproverName(userId) {
  return QM_APPROVER_CANDIDATES.find((u) => u.id === userId)?.name || userId || '—'
}

export function getPassedApprovalRoles(task_id) {
  const task = inspectionTasks.find((t) => t.id === task_id)
  if (task && usesManualApprovalFlow(task)) {
    const done = []
    for (const node of getManualFlowNodes(task)) {
      if (isManualLevelDone(task, node)) done.push(node.label)
      else break
    }
    return done
  }
  return approvalRecords
    .filter((r) => r.task_id === task_id && r.action === 2)
    .map((r) => r.operator_role)
}

export function getNextApprovalRole(task) {
  if (usesManualApprovalFlow(task)) {
    const node = getCurrentManualNode(task)
    return node ? node.label : null
  }
  const chain = getApprovalChain(task)
  const passed = getPassedApprovalRoles(task.id)
  for (const role of chain) {
    if (!passed.includes(role)) return role
  }
  return null
}

/**
 * 将任务状态同步到 WBS 节点验收状态。
 * - 草稿（is_draft=1）不产生节点副作用
 * - 同一节点多任务时按正式任务聚合，避免后写覆盖已通过状态
 */
export function syncNodeAccept(task) {
  if (!task || Number(task.is_draft) === 1) return
  const node = wbsNodes.find((n) => n.id === task.wbs_node_id)
  if (!node) return

  const formal = inspectionTasks.filter(
    (t) => t.wbs_node_id === node.id && Number(t.is_draft) !== 1,
  )
  if (!formal.length) return

  // 优先级：通过 > 验评中 > 待复验 > 整改中 > 不通过 > 待验评
  let next = 0
  if (formal.some((t) => Number(t.status) === 2)) next = 2
  else if (formal.some((t) => Number(t.status) === 1)) next = 1
  else if (formal.some((t) => Number(t.status) === 5)) next = 5
  else if (formal.some((t) => Number(t.status) === 4)) next = 4
  else if (formal.some((t) => Number(t.status) === 3)) next = 3
  else next = 0

  node.accept_status = next
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
 * 上级报验解锁（D3 沿用 V1.16）：下级 accept_status 须全部通过。
 * - node_type 9「实体工程验收」、10「专项验收」：仅目录分类，不可发起验收。
 * - 专项叶子（7）与检验批（6）可直接发起。
 */
export function checkUnlock(node) {
  if (!node) return { ok: false, msg: '节点不存在' }
  if (node.node_type === 6) return { ok: true }
  if (node.node_type === 7) return { ok: true }

  // 「实体工程验收」「专项验收」仅为分类文件夹，不在此节点做验收
  if (node.node_type === 9) {
    return {
      ok: false,
      msg: '「实体工程验收」仅为目录分类，不可发起验收；请选择单位工程及以下节点',
    }
  }
  if (node.node_type === 10) {
    return {
      ok: false,
      msg: '「专项验收」仅为目录分类，不可发起验收；请选择消防、人防等专项节点',
    }
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
  location_name = '',
  location_id = '',
  location_ids = [],
  is_hidden_work,
  remark = '',
  contractor_org_id = 'org-sg-01',
  supervisor_org_id = 'org-jl-01',
  need_archive,
  related_reject_id = '',
}) {
  const node = wbsNodes.find((n) => n.id === wbs_node_id)
  if (!node) return { ok: false, msg: '验评节点不存在' }
  if (Number(node.node_type) === 9) {
    return { ok: false, msg: '「实体工程验收」仅为目录分类，不可发起验收；请选择单位工程及以下节点' }
  }
  if (Number(node.node_type) === 10) {
    return { ok: false, msg: '「专项验收」仅为目录分类，不可发起验收；请选择消防、人防等专项节点' }
  }

  const unlock = checkUnlock(node)
  if (!unlock.ok) return unlock

  const active = findActiveTaskOnNode(wbs_node_id)
  if (active) {
    return {
      ok: false,
      msg: `该验收节点已有有效验收单（${active.task_no || active.id}），一节点仅允许一张有效单；已驳回单可并存`,
    }
  }

  if (node.node_type === 6) {
    if (!node.batch_type_id) return { ok: false, msg: '检验批节点须绑定检验批类型' }
    const forms = getEnabledFormsByBatchType(node.batch_type_id)
    if (!forms.length) return { ok: false, msg: '检验批类型未绑定启用表单，不可创建任务' }
  } else if ([3, 4, 5].includes(node.node_type) && !node.form_template_id) {
    return { ok: false, msg: `${NODE_TYPE_LABEL[node.node_type]}节点须绑定表单模板` }
  }

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

  const docsEmpty = nodeRequiredDocsEmpty(wbs_node_id)
  let needArchiveFlag = docsEmpty ? 0 : need_archive === undefined ? 1 : Number(need_archive) === 1 ? 1 : 0
  if (docsEmpty) needArchiveFlag = 0

  const locIds = Array.isArray(location_ids)
    ? location_ids.map(String).filter(Boolean)
    : location_id
      ? [String(location_id)]
      : []
  const locName =
    String(location_name || '').trim() || joinLocationLabels(locIds) || ''

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
    location_name: locName,
    location_id: locIds[0] || String(location_id || '').trim() || '',
    location_ids: locIds,
    form_template_id,
    form_data: {},
    batch_type_id,
    status: 0,
    result: 0,
    self_check_result: null,
    is_hidden_work:
      is_hidden_work === undefined || is_hidden_work === null || is_hidden_work === ''
        ? node.is_hidden_work || 0
        : Number(is_hidden_work) === 1
          ? 1
          : 0,
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
    need_archive: needArchiveFlag,
    elec_archive_status: 0,
    related_reject_id: related_reject_id || '',
    approval_post_id: '',
    approval_post_name: '',
    approver_id: '',
    approver_name: '',
    owner_final_required,
    remark: remark || '',
    manual_approval_flow: [],
    created_by: 'u-sg-01',
    created_at: nowStr(),
    updated_by: 'u-sg-01',
    updated_at: nowStr(),
  }
  if (node.node_type === 7) {
    task.special_type = node.special_type || ''
  }
  refreshTaskElecArchiveStatus(task)

  inspectionTasks.unshift(task)
  instantiateItems(task)

  if (plan_id) {
    const plan = acceptancePlans.find((p) => p.id === plan_id)
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
  // V2：待提交(status=0)可保存填报内容；不再强制 is_draft=1
  if (Number(task.status) !== 0) {
    return { ok: false, msg: '仅待提交任务可保存填报' }
  }
  if (patch.remark !== undefined) task.remark = String(patch.remark || '')
  if (patch.task_name !== undefined) {
    const name = String(patch.task_name || '').trim()
    if (!name) return { ok: false, msg: '请填写任务名称' }
    task.task_name = name
  }
  if (patch.location_name !== undefined) task.location_name = String(patch.location_name || '')
  if (patch.location_id !== undefined) task.location_id = String(patch.location_id || '')
  if (patch.location_ids !== undefined) {
    task.location_ids = Array.isArray(patch.location_ids)
      ? patch.location_ids.map(String).filter(Boolean)
      : []
    if (!task.location_id && task.location_ids[0]) task.location_id = task.location_ids[0]
  }
  if (patch.is_hidden_work !== undefined) {
    task.is_hidden_work = Number(patch.is_hidden_work) === 1 ? 1 : 0
  }
  if (patch.wbs_node_id !== undefined) {
    const newId = String(patch.wbs_node_id || '').trim()
    if (!newId) return { ok: false, msg: '请选择验收节点' }
    if (newId !== task.wbs_node_id) {
      const node = wbsNodes.find((n) => n.id === newId)
      if (!node) return { ok: false, msg: '验评节点不存在' }
      if (Number(node.node_type) === 9) {
        return { ok: false, msg: '「实体工程验收」仅为目录分类，不可发起验收；请选择单位工程及以下节点' }
      }
      if (Number(node.node_type) === 10) {
        return { ok: false, msg: '「专项验收」仅为目录分类，不可发起验收；请选择消防、人防等专项节点' }
      }
      const isSpecialTask = Number(task.task_type) === 6
      if (isSpecialTask) {
        if (Number(node.node_type) !== 7) {
          return { ok: false, msg: '专项验收任务请选择专项目录下的专项节点（消防/人防等）' }
        }
      } else if (![1, 2, 3, 4, 5, 6].includes(Number(node.node_type))) {
        return { ok: false, msg: '实体工程验收请选择单位工程及以下节点' }
      }
      const unlock = checkUnlock(node)
      if (!unlock.ok) return unlock
      const active = findActiveTaskOnNode(newId, task.id)
      if (active) {
        return {
          ok: false,
          msg: `该验收节点已有有效验收单（${active.task_no || active.id}），一节点仅允许一张有效单`,
        }
      }
      const task_type = NODE_TO_TASK_TYPE[node.node_type]
      if (!task_type) return { ok: false, msg: '任务类型与节点类型映射不存在' }
      if (node.node_type === 6) {
        if (!node.batch_type_id) return { ok: false, msg: '检验批节点须绑定检验批类型' }
      } else if ([3, 4, 5].includes(node.node_type) && !node.form_template_id) {
        return { ok: false, msg: `${NODE_TYPE_LABEL[node.node_type]}节点须绑定表单模板` }
      }
      task.wbs_node_id = newId
      task.task_type = task_type
      task.specialty = node.specialty || task.specialty || ''
      task.batch_type_id = node.batch_type_id || ''
      task.form_template_id = node.form_template_id || task.form_template_id || ''
      if (node.node_type === 7) {
        task.special_type = node.special_type || task.special_type || ''
      }
      if (patch.is_hidden_work === undefined) {
        task.is_hidden_work = Number(node.is_hidden_work) === 1 ? 1 : 0
      }
      task.owner_final_required =
        task_type === 1
          ? node.is_critical === 1
            ? 1
            : 0
          : [4, 5, 7, 8].includes(task_type)
            ? 1
            : 0
    }
  }
  if (patch.need_archive !== undefined) {
    const docsEmpty = nodeRequiredDocsEmpty(task.wbs_node_id)
    task.need_archive = docsEmpty ? 0 : Number(patch.need_archive) === 1 ? 1 : 0
  }
  if (patch.form_data) task.form_data = JSON.parse(JSON.stringify(patch.form_data))
  if (patch.manual_approval_flow !== undefined) {
    task.manual_approval_flow = JSON.parse(JSON.stringify(patch.manual_approval_flow || []))
  }
  task.is_draft = 0
  task.updated_at = nowStr()
  refreshTaskElecArchiveStatus(task)
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
  const file_category = row.file_category || 1
  if (biz_type === 'TASK' && Number(file_category) === 3 && task_id) {
    const docs = getAttachments('TASK', task_id).filter((a) => Number(a.file_category) === 3)
    if (docs.length >= 30) return { ok: false, msg: '附件最多 30 个' }
  }
  const att = {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    biz_type,
    biz_id: row.biz_id,
    task_id,
    file_category,
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
 * 提交报验：待提交(0)→验评中(1)
 * 闸门：工程影像≥1、附件≤30、电子档案状态、已选审批人
 */
export function submitInspect(task, { approver_id } = {}) {
  if (Number(task.status) !== 0) return { ok: false, msg: '仅待提交可提交报验' }
  refreshTaskElecArchiveStatus(task)
  if (!canSubmitByElecArchive(task)) {
    return { ok: false, msg: '电子档案状态为「未完成」时不可提交验收' }
  }
  const siteMedia = getAttachments('TASK', task.id).filter((a) =>
    [1, 2].includes(Number(a.file_category)),
  )
  if (!siteMedia.length) {
    return { ok: false, msg: '工程影像为必填，请至少上传一份现场图片或视频' }
  }
  const docs = getAttachments('TASK', task.id).filter((a) => Number(a.file_category) === 3)
  if (docs.length > 30) {
    return { ok: false, msg: '附件最多 30 个' }
  }

  const node = wbsNodes.find((n) => n.id === task.wbs_node_id)
  const post = getApprovalPostForNodeType(node?.node_type)
  if (!post) return { ok: false, msg: '当前节点类型未配置审批岗位（流程中心）' }
  const candidates = listApproverCandidatesForNodeType(node.node_type)
  const aid = String(approver_id || task.approver_id || '').trim()
  if (!aid) return { ok: false, msg: '请选择审批人' }
  const person = candidates.find((u) => u.id === aid) || QM_APPROVER_CANDIDATES.find((u) => u.id === aid)
  if (!person) return { ok: false, msg: '审批人不在该岗位候选人范围内' }

  task.approval_post_id = post.approval_post_id
  task.approval_post_name = post.approval_post_name
  task.approver_id = person.id
  task.approver_name = person.name
  task.manual_approval_flow = [
    {
      level: 1,
      role: post.approval_post_id,
      role_label: post.approval_post_name,
      label: post.approval_post_name,
      approver_ids: [person.id],
      approver_names: [person.name],
      need_seal: 0,
      cc_ids: [],
      mode: 'or',
    },
  ]

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

/** 审批通过（当前链节点）— 档案链走 C6 签章校验；手动链走会签/或签，跳过 C6 */
export function approveStep(task, { opinion = '', operator_role, operator_id } = {}) {
  if (task.status !== 1) return { ok: false, msg: '仅验评中可审批' }
  if (hasBlockFailItems(task.id)) {
    return { ok: false, msg: '存在主控或观感不合格项，禁止办结通过' }
  }

  if (usesManualApprovalFlow(task)) {
    const node = getCurrentManualNode(task)
    if (!node) return { ok: false, msg: '审批链已完成' }
    const label = node.label
    if (operator_role && operator_role !== label) {
      return { ok: false, msg: `当前应由「${label}」审批` }
    }
    const uid = operator_id || ''
    if (!uid || !node.approver_ids.includes(uid)) {
      return { ok: false, msg: '请选择本级审批人后再通过' }
    }
    if (getLevelPassRecords(task.id, label).some((r) => r.operator_id === uid)) {
      return { ok: false, msg: '该审批人已完成本级审批' }
    }

    const who = resolveApproverName(uid)
    approvalRecords.push({
      id: `ar-${Date.now()}`,
      task_id: task.id,
      node_name: label,
      action: 2,
      operator_id: uid,
      operator_role: label,
      opinion: opinion || '',
      action_time: nowStr(),
    })
    signatureRecords.push({
      id: `sig-${Date.now()}`,
      task_id: task.id,
      signer_id: uid,
      signer_role: label,
      ca_cert_id: `CA-DEMO-${uid}`,
      seal_id: '',
      sign_file_id: '',
      timestamp_token: '',
      sign_time: nowStr(),
    })

    const stillNode = getCurrentManualNode(task)
    if (!stillNode) {
      task.status = 2
      task.result = 1
      if (task.first_pass_flag == null) task.first_pass_flag = 1
      task.finish_time = nowStr()
      task.reviewer_id = uid
      archiveWriteFinish(task)
      syncNodeAccept(task)
      if (task.plan_id) refreshPlanStatus(task.plan_id)
      return { ok: true, finished: true }
    }
    task.reviewer_id = uid
    task.updated_at = nowStr()
    void who
    return { ok: true, finished: false, next: stillNode.label }
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

/** 驳回：验评中 → 已驳回（流程结束；意见必填） */
export function rejectTask(task, opinion, operator_role = '审批人') {
  if (Number(task.status) !== 1) return { ok: false, msg: '仅验评中可驳回' }
  if (!String(opinion || '').trim()) return { ok: false, msg: '驳回意见不能为空' }
  approvalRecords.push({
    id: `ar-${Date.now()}`,
    task_id: task.id,
    node_name: operator_role || task.approval_post_name || '审批人',
    action: 3,
    operator_id: task.approver_id || 'u-jl-01',
    operator_role: operator_role || task.approval_post_name || '审批人',
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

/** 已驳回重新申报：新建验收单并关联旧单 */
export function reDeclareAcceptance(rejectedTask) {
  if (!rejectedTask || Number(rejectedTask.status) !== 3) {
    return { ok: false, msg: '仅已驳回验收单可重新申报' }
  }
  return createTask({
    project_id: rejectedTask.project_id,
    wbs_node_id: rejectedTask.wbs_node_id,
    task_name: rejectedTask.task_name,
    location_name: rejectedTask.location_name || '',
    location_id: rejectedTask.location_id || '',
    location_ids: Array.isArray(rejectedTask.location_ids)
      ? [...rejectedTask.location_ids]
      : rejectedTask.location_id
        ? [rejectedTask.location_id]
        : [],
    is_hidden_work: rejectedTask.is_hidden_work,
    need_archive: rejectedTask.need_archive,
    related_reject_id: rejectedTask.id,
    contractor_org_id: rejectedTask.contractor_org_id,
    supervisor_org_id: rejectedTask.supervisor_org_id,
  })
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
  const payloadSpecialties = normalizeSpecialties(payload.specialties ?? payload.specialty)
  if (payloadSpecialties.length && !isValidWbsSpecialties(payloadSpecialties)) {
    return { ok: false, msg: '专业不在字典范围内' }
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
        specialties:
          payload.specialties != null || payload.specialty != null
            ? payloadSpecialties
            : getEffectiveSpecialties(exist),
        form_template_id:
          exist.node_type === 8
            ? payload.form_template_id || exist.form_template_id
            : exist.form_template_id,
        updated_at: nowStr(),
        updated_by: 'u-sg-01',
      })
      syncSpecialtyFields(exist)
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
      specialties:
        payload.specialties != null || payload.specialty != null
          ? payloadSpecialties
          : getEffectiveSpecialties(node),
      special_type: node_type === 7 ? payload.special_type || '' : '',
      is_critical: node_type === 6 ? Number(payload.is_critical) || 0 : 0,
      updated_at: nowStr(),
      updated_by: 'u-sg-01',
    })
    syncSpecialtyFields(node)
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
    specialties: payloadSpecialties,
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
  syncSpecialtyFields(node)
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

/**
 * 删除待提交验收单（status=0）；同步清理检查项与任务级附件。
 * 兼容旧名 deleteDraftTask。
 */
export function deletePendingTask(taskOrId) {
  const id = typeof taskOrId === 'string' ? taskOrId : taskOrId?.id
  const task = findTask(id)
  if (!task) return { ok: false, msg: '任务不存在' }
  if (Number(task.status) !== 0) return { ok: false, msg: '仅待提交验收单可删除' }

  const tIdx = inspectionTasks.findIndex((t) => t.id === id)
  if (tIdx >= 0) inspectionTasks.splice(tIdx, 1)

  for (let i = inspectionItems.length - 1; i >= 0; i -= 1) {
    if (inspectionItems[i].task_id === id) inspectionItems.splice(i, 1)
  }
  for (let i = attachStore.length - 1; i >= 0; i -= 1) {
    if (attachStore[i].task_id === id || (attachStore[i].biz_type === 'TASK' && attachStore[i].biz_id === id)) {
      attachStore.splice(i, 1)
    }
  }
  return { ok: true }
}

/** @deprecated 请用 deletePendingTask；待提交可删 */
export function deleteDraftTask(taskOrId) {
  return deletePendingTask(taskOrId)
}

/** 按 task_type 解析编辑页路径（9/10 为历史汇总类型兼容路径） */
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

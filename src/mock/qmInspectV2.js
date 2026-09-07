/**
 * 质量验评 V2 口径辅助（对齐 research-qm-inspect-产品架构说明-v2）
 * 验收四态 + 电子档案四态 + 按节点类型审批岗位 + 一节点一有效单
 */
import { reactive } from 'vue'
import { nodeArchiveDocConfigs } from './qmArchive.js'
import { candidatesByRole, getApproverRoleMeta } from './qmApproverConfig.js'
import { inspectionTasks, nowStr, wbsNodes } from './qmInspect.js'

/** 验收状态：0待提交 1审批中 2已通过 3已驳回 */
export const ACCEPTANCE_STATUS = {
  0: '待提交',
  1: '审批中',
  2: '已通过',
  3: '已驳回',
}

export const ACCEPTANCE_STATUS_FILTER_OPTIONS = Object.entries(ACCEPTANCE_STATUS).map(
  ([value, label]) => ({ value, label }),
)

/** 电子档案状态：0无需 1未完成 2部分完成 3全部完成 */
export const ELEC_ARCHIVE_STATUS = {
  0: '无需',
  1: '未完成',
  2: '部分完成',
  3: '全部完成',
}

/** 节点档案文档填报状态（对齐 PRD fill_status） */
export const FILL_STATUS = { 0: '未填报', 1: '已填报' }

export function isArchiveDocFilled(doc) {
  if (!doc) return false
  if (doc.fill_status !== undefined && doc.fill_status !== null && doc.fill_status !== '') {
    return Number(doc.fill_status) === 1
  }
  return !!doc.filled
}


export function acceptanceStatusTagType(status) {
  const s = Number(status)
  if (s === 0) return 'info'
  if (s === 1) return 'warning'
  if (s === 2) return 'success'
  if (s === 3) return 'danger'
  return 'info'
}

export function elecArchiveStatusTagType(status) {
  const s = Number(status)
  if (s === 0) return 'info'
  if (s === 1) return 'danger'
  if (s === 2) return 'warning'
  if (s === 3) return 'success'
  return 'info'
}

/**
 * 验评审批链规则（产品口径）：
 * - 检验批 / 分项 / 子分部（task_type 1/2/3）：仅监理验收
 * - 分部及更高、专项、竣工（4/5/6/7/8…）：监理 → 项目经理
 */
export function taskRequiresPmApproval(task_type) {
  return ![1, 2, 3].includes(Number(task_type))
}

export function buildQmInspectApprovalFlow({
  task_type,
  jlPerson,
  jlName,
  pmPerson,
  pmName,
} = {}) {
  const jlLabel = getApproverRoleMeta('jl_pro')?.label || '专业监理工程师'
  const pmLabel = getApproverRoleMeta('js_pm')?.label || '建设单位项目负责人'
  const flow = [
    {
      level: 1,
      role: 'jl_pro',
      role_label: jlLabel,
      label: '监理单位审批',
      approver_ids: [jlPerson.id],
      approver_names: [jlName],
      need_seal: 0,
      cc_ids: [],
      mode: 'orsign',
    },
  ]
  if (taskRequiresPmApproval(task_type) && pmPerson) {
    flow.push({
      level: 2,
      role: 'js_pm',
      role_label: pmLabel,
      label: '项目经理审批',
      approver_ids: [pmPerson.id],
      approver_names: [pmName],
      need_seal: 0,
      cc_ids: [],
      mode: 'orsign',
    })
  }
  return flow
}

/**
 * 流程中心模拟：节点类型 → 审批岗位 roleKey（历史兼容；提交链以 taskRequiresPmApproval 为准）
 */
export const NODE_TYPE_APPROVAL_POST = {
  6: 'jl_pro',
  5: 'jl_pro',
  4: 'jl_pro',
  3: 'js_pm',
  2: 'js_pm',
  1: 'js_pm',
  7: 'js_pm',
  8: 'js_pm',
}

export function getApprovalPostForNodeType(node_type) {
  const role = NODE_TYPE_APPROVAL_POST[Number(node_type)]
  if (!role) return null
  const meta = getApproverRoleMeta(role)
  return {
    approval_post_id: role,
    approval_post_name: meta?.label || role,
  }
}

export function listApproverCandidatesForNodeType(node_type) {
  const post = getApprovalPostForNodeType(node_type)
  if (!post) return []
  return candidatesByRole(post.approval_post_id) || []
}

/** 节点应填档案文档（含已填报标记）；按 node_id 缓存演示态 */
export const nodeArchiveDocState = reactive({})

function ensureNodeDocState(node_id, node_type) {
  if (nodeArchiveDocState[node_id]) return nodeArchiveDocState[node_id]
  const cfg = nodeArchiveDocConfigs.find((c) => Number(c.node_type) === Number(node_type))
  const docs = (cfg?.docs || []).map((name, i) => {
    const fill_status = i === 0 && (cfg?.docs || []).length > 1 ? 1 : 0
    return {
      doc_key: `${node_id}-doc-${i}`,
      doc_name: name,
      fill_status,
      // 档案侧同步演示时间；已填报略新于未填报
      updated_at: fill_status === 1
        ? `2026-08-0${Math.min(9, 1 + (i % 9))} ${String(9 + (i % 8)).padStart(2, '0')}:${String(10 + i * 3).padStart(2, '0')}:00`
        : `2026-07-${String(15 + (i % 10)).padStart(2, '0')} ${String(8 + (i % 6)).padStart(2, '0')}:00:00`,
    }
  })
  // 单文档时默认未填，便于演示「未完成」
  if (docs.length === 1) {
    docs[0].fill_status = 0
    docs[0].updated_at = '2026-07-20 10:00:00'
  }
  if (docs.length > 2) {
    docs[0].fill_status = 1
    docs[1].fill_status = 1
    docs[0].updated_at = '2026-08-05 14:20:00'
    docs[1].updated_at = '2026-08-06 09:35:00'
  }
  nodeArchiveDocState[node_id] = docs
  return docs
}

export function listNodeArchiveDocs(node_id) {
  const node = wbsNodes.find((n) => n.id === node_id)
  if (!node) return []
  return ensureNodeDocState(node_id, node.node_type)
}

export function nodeRequiredDocsEmpty(node_id) {
  return listNodeArchiveDocs(node_id).length === 0
}

export function computeElecArchiveStatus(need_archive, node_id) {
  if (!need_archive) return 0
  const docs = listNodeArchiveDocs(node_id)
  if (!docs.length) return 0
  const filled = docs.filter((d) => isArchiveDocFilled(d)).length
  if (filled <= 0) return 1
  if (filled < docs.length) return 2
  return 3
}

export function refreshTaskElecArchiveStatus(task) {
  if (!task) return
  task.elec_archive_status = computeElecArchiveStatus(Number(task.need_archive) === 1, task.wbs_node_id)
}

/**
 * 提交闸门 · 电子档案：
 * - 「是否电子档案归档」= 否（或非 1）→ 不强制，可提交
 * - = 是 → 强制：仅「未完成」拦截；无需登记 / 部分完成 / 全部完成可提交
 */
export function canSubmitByElecArchive(task) {
  if (Number(task?.need_archive) !== 1) return true
  return Number(task?.elec_archive_status) !== 1
}

/** 一节点仅允许一张有效单（待提交/审批中/已通过）；已驳回可多张 */
export function findActiveTaskOnNode(wbs_node_id, excludeId = '') {
  return inspectionTasks.find(
    (t) =>
      t.wbs_node_id === wbs_node_id &&
      t.id !== excludeId &&
      [0, 1, 2].includes(Number(t.status)),
  )
}

export function markNodeDocFilled(node_id, doc_key, filled = true) {
  const docs = listNodeArchiveDocs(node_id)
  const row = docs.find((d) => d.doc_key === doc_key)
  if (row) {
    row.fill_status = filled ? 1 : 0
    row.updated_at = nowStr()
  }
  inspectionTasks
    .filter((t) => t.wbs_node_id === node_id && Number(t.need_archive) === 1)
    .forEach((t) => refreshTaskElecArchiveStatus(t))
}

/**
 * 演示假数据：为若干验收节点预置电子档案填报进度，
 * 使列表可同时见到「未完成 / 部分完成 / 全部完成」。
 * 口径：已通过单所在节点不得为「未完成」（见 enforcePassedTaskElecArchive）。
 * fillCount：已填份数；fillAll：全部填完。
 */
export function seedElecArchiveDemoStates() {
  const presets = [
    // 全部完成（含已通过样例所在节点）
    { node_id: 'wn-batch-1', fillAll: true },
    { node_id: 'wn-batch-hist', fillAll: true },
    { node_id: 'wn-batch-ready-1', fillAll: true },
    { node_id: 'wn-special-fire', fillAll: true },
    { node_id: 'wn-special-planning', fillAll: true },
    { node_id: 'wn-special-energy', fillAll: true },
    { node_id: 'wn-special-cd', fillAll: true },
    { node_id: 'wn-special-equip', fillAll: true },
    { node_id: 'wn-unit-1', fillAll: true },
    { node_id: 'wn-unit-4', fillAll: true },
    { node_id: 'wn-item-ready', fillAll: true },
    // 部分完成（仅挂待提交/审批中/已驳回，或可与已通过并存时须≥部分完成——此处挂未通过链路节点）
    { node_id: 'wn-batch-2', fillCount: 1 },
    { node_id: 'wn-unit-2', fillCount: 1 },
    // 未完成（仅挂非已通过任务：待提交/审批中/已驳回）
    { node_id: 'wn-batch-3', fillCount: 0 },
    { node_id: 'wn-batch-4', fillCount: 0 },
    { node_id: 'wn-batch-5', fillCount: 0 },
    { node_id: 'wn-item-1', fillCount: 0 },
  ]

  presets.forEach(({ node_id, fillAll, fillCount }) => {
    const node = wbsNodes.find((n) => n.id === node_id)
    if (!node) return
    const docs = ensureNodeDocState(node_id, node.node_type)
    if (!docs.length) return
    const n = fillAll ? docs.length : Math.max(0, Math.min(docs.length, Number(fillCount) || 0))
    docs.forEach((d, i) => {
      d.fill_status = i < n ? 1 : 0
      d.updated_at = d.fill_status === 1
        ? `2026-08-${String(5 + (i % 5)).padStart(2, '0')} ${String(10 + i).padStart(2, '0')}:20:00`
        : `2026-07-${String(18 + (i % 8)).padStart(2, '0')} 09:00:00`
    })
  })
}

/** 已通过 ⇒ 电子档案不得为「未完成」：将该节点档案全部置为已填并回写任务状态 */
function enforcePassedTaskElecArchive() {
  const passedNeedArchive = inspectionTasks.filter(
    (t) => Number(t.status) === 2 && Number(t.need_archive) === 1,
  )
  const nodeIds = [...new Set(passedNeedArchive.map((t) => t.wbs_node_id).filter(Boolean))]
  nodeIds.forEach((node_id) => {
    const node = wbsNodes.find((n) => n.id === node_id)
    if (!node) return
    const docs = ensureNodeDocState(node_id, node.node_type)
    if (!docs.length) return
    const status = computeElecArchiveStatus(true, node_id)
    if (status !== 1) return
    docs.forEach((d, i) => {
      d.fill_status = 1
      d.updated_at = `2026-08-${String(8 + (i % 2)).padStart(2, '0')} 16:00:00`
    })
  })
  inspectionTasks.forEach((t) => refreshTaskElecArchiveStatus(t))
}

/** 将历史 seed 对齐 V2 四态（去掉草稿/整改中/待复验主路径语义） */
export function migrateTasksToV2() {
  const docsLenByNodeType = new Map(
    nodeArchiveDocConfigs.map((c) => [Number(c.node_type), (c.docs || []).length]),
  )
  const nodeTypeById = new Map(wbsNodes.map((n) => [n.id, Number(n.node_type)]))

  // 先预置节点档案进度，再回写任务电子档案状态
  seedElecArchiveDemoStates()

  inspectionTasks.forEach((t) => {
    t.is_draft = 0
    if (Number(t.status) === 4 || Number(t.status) === 5) t.status = 3
    if (t.need_archive === undefined) {
      const nt = nodeTypeById.get(t.wbs_node_id)
      const docLen = docsLenByNodeType.get(nt) || 0
      t.need_archive = docLen > 0 ? 1 : 0
    }
    if (t.related_reject_id === undefined) t.related_reject_id = ''
    if (t.approval_post_id === undefined) t.approval_post_id = ''
    if (t.approval_post_name === undefined) t.approval_post_name = ''
    if (t.approver_id === undefined) t.approver_id = ''
    if (t.approver_name === undefined) t.approver_name = ''
    if (t.supervisor_approver_user_id === undefined) t.supervisor_approver_user_id = ''
    if (t.supervisor_approver_name === undefined) t.supervisor_approver_name = ''
    if (t.pm_approver_user_id === undefined) t.pm_approver_user_id = ''
    if (t.pm_approver_name === undefined) t.pm_approver_name = ''
    // 业主终审已废弃
    if ('owner_final_required' in t) delete t.owner_final_required
    // 审批中且无手动链：按 task_type 补齐审批链（检验批/分项/子分部仅监理）
    if (
      Number(t.status) === 1 &&
      (!Array.isArray(t.manual_approval_flow) || !t.manual_approval_flow.length)
    ) {
      const jl = candidatesByRole('jl_pro')[0]
      const needPm = taskRequiresPmApproval(t.task_type)
      const pm = needPm ? candidatesByRole('js_pm')[0] : null
      if (jl && (!needPm || pm)) {
        t.supervisor_approver_user_id = t.supervisor_approver_user_id || jl.id
        t.supervisor_approver_name = t.supervisor_approver_name || jl.name
        if (needPm) {
          t.pm_approver_user_id = t.pm_approver_user_id || pm.id
          t.pm_approver_name = t.pm_approver_name || pm.name
        } else {
          t.pm_approver_user_id = ''
          t.pm_approver_name = ''
        }
        t.manual_approval_flow = buildQmInspectApprovalFlow({
          task_type: t.task_type,
          jlPerson: jl,
          jlName: t.supervisor_approver_name,
          pmPerson: pm,
          pmName: t.pm_approver_name,
        })
      }
    } else if (!taskRequiresPmApproval(t.task_type)) {
      // 低层级任务历史若残留项目经理字段/二级节点，清掉以免展示误导
      t.pm_approver_user_id = ''
      t.pm_approver_name = ''
      if (Array.isArray(t.manual_approval_flow) && t.manual_approval_flow.length > 1) {
        t.manual_approval_flow = t.manual_approval_flow.filter((n) => n.role !== 'js_pm')
        t.manual_approval_flow.forEach((n, i) => {
          n.level = i + 1
        })
      }
    }
    refreshTaskElecArchiveStatus(t)
    t.updated_at = t.updated_at || nowStr()
  })

  // 已通过不可仍为电子档案「未完成」
  enforcePassedTaskElecArchive()

  // 一节点一有效单（实体/专项/竣工均适用）；已驳回可并存
  const byNode = {}
  inspectionTasks.forEach((t) => {
    if (![0, 1, 2].includes(Number(t.status))) return
    if (!byNode[t.wbs_node_id]) byNode[t.wbs_node_id] = []
    byNode[t.wbs_node_id].push(t)
  })
  Object.values(byNode).forEach((arr) => {
    if (arr.length <= 1) return
    arr
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
      .slice(1)
      .forEach((t) => {
        t.status = 3
        t.result = 2
      })
  })

  // 节点验收状态废止整改中(4)/待复验(5) → 已驳回(3)
  wbsNodes.forEach((n) => {
    if (Number(n.accept_status) === 4 || Number(n.accept_status) === 5) n.accept_status = 3
  })
}

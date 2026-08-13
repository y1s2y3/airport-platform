/**
 * 质量验评 V2 口径辅助（对齐 research-qm-inspect-产品架构说明-v2）
 * 验收四态 + 电子档案四态 + 按节点类型审批岗位 + 一节点一有效单
 */
import { reactive } from 'vue'
import { nodeArchiveDocConfigs } from './qmArchive.js'
import { candidatesByRole, getApproverRoleMeta } from './qmApproverConfig.js'
import { inspectionTasks, nowStr, wbsNodes } from './qmInspect.js'

/** 验收状态：0待提交 1验评中 2已通过 3已驳回 */
export const ACCEPTANCE_STATUS = {
  0: '待提交',
  1: '验评中',
  2: '已通过',
  3: '已驳回',
}

export const ACCEPTANCE_STATUS_FILTER_OPTIONS = Object.entries(ACCEPTANCE_STATUS).map(
  ([value, label]) => ({ value, label }),
)

/** 电子档案状态：0无需登记 1未完成 2部分完成 3全部完成 */
export const ELEC_ARCHIVE_STATUS = {
  0: '无需登记',
  1: '未完成',
  2: '部分完成',
  3: '全部完成',
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
 * 流程中心模拟：节点类型 → 审批岗位 roleKey
 * 检验批/分项/子分部 → 专业监理；分部及以上 → 建设单位项目负责人（指挥部项目经理侧）
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
    const filled = i === 0 && (cfg?.docs || []).length > 1
    return {
      doc_key: `${node_id}-doc-${i}`,
      doc_name: name,
      filled,
      // 档案侧同步演示时间；已填报略新于未填报
      updated_at: filled
        ? `2026-08-0${Math.min(9, 1 + (i % 9))} ${String(9 + (i % 8)).padStart(2, '0')}:${String(10 + i * 3).padStart(2, '0')}:00`
        : `2026-07-${String(15 + (i % 10)).padStart(2, '0')} ${String(8 + (i % 6)).padStart(2, '0')}:00:00`,
    }
  })
  // 单文档时默认未填，便于演示「未完成」
  if (docs.length === 1) {
    docs[0].filled = false
    docs[0].updated_at = '2026-07-20 10:00:00'
  }
  if (docs.length > 2) {
    docs[0].filled = true
    docs[1].filled = true
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
  const filled = docs.filter((d) => d.filled).length
  if (filled <= 0) return 1
  if (filled < docs.length) return 2
  return 3
}

export function refreshTaskElecArchiveStatus(task) {
  if (!task) return
  task.elec_archive_status = computeElecArchiveStatus(Number(task.need_archive) === 1, task.wbs_node_id)
}

/** 可提交的电子档案状态：无需登记 / 部分完成 / 全部完成 */
export function canSubmitByElecArchive(task) {
  const s = Number(task?.elec_archive_status)
  return s === 0 || s === 2 || s === 3
}

/** 一节点仅允许一张有效单（待提交/验评中/已通过）；已驳回可多张 */
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
    row.filled = !!filled
    row.updated_at = nowStr()
  }
  inspectionTasks
    .filter((t) => t.wbs_node_id === node_id && Number(t.need_archive) === 1)
    .forEach((t) => refreshTaskElecArchiveStatus(t))
}

/** 将历史 seed 对齐 V2 四态（去掉草稿/整改中/待复验主路径语义） */
export function migrateTasksToV2() {
  inspectionTasks.forEach((t) => {
    t.is_draft = 0
    if (Number(t.status) === 4 || Number(t.status) === 5) t.status = 3
    if (t.need_archive === undefined) {
      const empty = nodeRequiredDocsEmpty(t.wbs_node_id)
      t.need_archive = empty ? 0 : 1
    }
    if (t.related_reject_id === undefined) t.related_reject_id = ''
    if (t.approval_post_id === undefined) t.approval_post_id = ''
    if (t.approval_post_name === undefined) t.approval_post_name = ''
    if (t.approver_id === undefined) t.approver_id = ''
    if (t.approver_name === undefined) t.approver_name = ''
    refreshTaskElecArchiveStatus(t)
    t.updated_at = t.updated_at || nowStr()
  })
  // 一节点一有效单：同节点多张有效单时保留最新一张，其余标为已驳回
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
}

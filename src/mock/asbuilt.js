/**
 * 实模一致验收 Mock — 对齐 QM-ASBUILT 产品架构 V1.7
 */
import { reactive } from 'vue'
import { nowStr } from '../utils/datetime.js'
import { getProjectLabel } from './laborRealName.js'
import { wbsNodes, WBS_TREE_NODE_TYPE_LABEL } from './qmInspect.js'
import {
  createAsbuiltSupervisorTodo,
  createAsbuiltPmTodo,
  discardAsbuiltTodos,
  finishAsbuiltOpenTodos,
} from './personalCenter.js'

export const STATUS_LABEL = {
  draft: '待提交',
  pending_approval: '待审批',
  approved: '已通过',
  rejected: '已驳回',
}

export const DATA_SOURCE_LABEL = {
  manual: '人工上传',
  sync: '第三方同步',
}

export const APPROVAL_NODE_LABEL = {
  applicant: '施工提交',
  supervisor: '监理审批',
  hq_pm: '指挥部项目经理终审',
}

export const ACTION_LABEL = {
  submit: '提交',
  approve: '通过',
  reject: '驳回',
}

/** 表单可选：单位工程～分项（不含检验批及分类骨架） */
export const ASBUILT_SELECTABLE_NODE_TYPES = [1, 2, 3, 4, 5]

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending_approval') return 'warning'
  if (status === 'draft') return 'info'
  return ''
}

function buildNodePath(nodeId) {
  const parts = []
  let cur = wbsNodes.find((n) => n.id === nodeId)
  const guard = new Set()
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id)
    if (![8, 9, 10].includes(Number(cur.node_type))) {
      parts.unshift(cur.node_name || cur.id)
    }
    cur = cur.parent_id ? wbsNodes.find((n) => n.id === cur.parent_id) : null
  }
  return parts.join(' / ') || String(nodeId)
}

/** 实体工程分解树（多选用）：仅实体分支下可选至分项 */
export function buildAsbuiltWbsTree() {
  const entityRoot = wbsNodes.find((n) => Number(n.node_type) === 9)
  const pool = wbsNodes.filter((n) => {
    if ([8, 10].includes(Number(n.node_type))) return false
    if (Number(n.node_type) === 9) return true
    if (Number(n.node_type) === 6) return false
    if (Number(n.node_type) === 7) return false
    return ASBUILT_SELECTABLE_NODE_TYPES.includes(Number(n.node_type)) || Number(n.node_type) === 9
  })

  function childrenOf(pid) {
    return pool
      .filter((n) => n.parent_id === pid)
      .map((n) => {
        const selectable = ASBUILT_SELECTABLE_NODE_TYPES.includes(Number(n.node_type))
        const kids = childrenOf(n.id)
        return {
          id: n.id,
          label: `${n.node_name}（${WBS_TREE_NODE_TYPE_LABEL[n.node_type] || n.node_type}）`,
          disabled: !selectable,
          children: kids.length ? kids : undefined,
        }
      })
  }

  if (!entityRoot) {
    return childrenOf(null)
  }
  return [
    {
      id: entityRoot.id,
      label: entityRoot.node_name,
      disabled: true,
      children: childrenOf(entityRoot.id),
    },
  ]
}

const store = reactive({
  seq: 3,
  fileSeq: 4,
  arSeq: 4,
  list: [
    {
      id: 'AB-001',
      biz_no: 'AB-202608-001',
      project_id: 'p-000',
      title: 'T2 混凝土分项实模一致验收',
      compare_url: 'https://example.com/asbuilt-compare/p-000/ab-001',
      data_source: 'manual',
      status: 'draft',
      external_ref: '',
      submitter_id: 'u-constructor',
      submitter_name: '施工-李工',
      submitted_at: '',
      related_reject_id: '',
      current_node: 'none',
      created_at: '2026-08-08 10:00:00',
      updated_at: '2026-08-08 10:00:00',
      nodes: [
        {
          id: 'abn-1',
          wbs_node_id: 'wn-item-3',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-1',
          file_name: '实模一致性报告-混凝土分项.pdf',
          file_url: '#',
          file_size: 1024 * 820,
          mime_type: 'application/pdf',
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-08-08 10:00:00',
        },
      ],
    },
    {
      id: 'AB-002',
      biz_no: 'AB-202608-002',
      project_id: 'p-000',
      title: '防水分项实模一致（同步）',
      compare_url: 'https://example.com/asbuilt-compare/p-000/ab-002',
      data_source: 'sync',
      status: 'pending_approval',
      external_ref: 'EXT-ASB-7788',
      submitter_id: 'u-constructor',
      submitter_name: '施工-李工',
      submitted_at: '2026-08-09 14:20:00',
      related_reject_id: '',
      current_node: 'supervisor',
      created_at: '2026-08-09 11:00:00',
      updated_at: '2026-08-09 14:20:00',
      nodes: [
        {
          id: 'abn-2',
          wbs_node_id: 'wn-item-4',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-2',
          file_name: '实模一致性报告-防水分项.pdf',
          file_url: '#',
          file_size: 1024 * 640,
          mime_type: 'application/pdf',
          source: 'sync',
          uploader_id: '',
          uploaded_at: '2026-08-09 11:00:00',
        },
      ],
    },
    {
      id: 'AB-003',
      biz_no: 'AB-202607-003',
      project_id: 'p-000',
      title: '电缆敷设分项实模一致',
      compare_url: 'https://example.com/asbuilt-compare/p-000/ab-003',
      data_source: 'manual',
      status: 'approved',
      external_ref: '',
      submitter_id: 'u-constructor',
      submitter_name: '施工-王工',
      submitted_at: '2026-07-20 09:10:00',
      related_reject_id: '',
      current_node: 'none',
      created_at: '2026-07-18 16:00:00',
      updated_at: '2026-07-22 11:30:00',
      nodes: [
        {
          id: 'abn-3',
          wbs_node_id: 'wn-item-2',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-3',
          file_name: '实模一致性报告-电缆敷设.pdf',
          file_url: '#',
          file_size: 1024 * 900,
          mime_type: 'application/pdf',
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-07-18 16:00:00',
        },
      ],
    },
  ],
  approvals: [
    {
      id: 'abar-1',
      acceptance_id: 'AB-002',
      node_code: 'applicant',
      action: 'submit',
      comment: '提交审批',
      actor_id: 'u-constructor',
      actor_name: '施工-李工',
      acted_at: '2026-08-09 14:20:00',
    },
    {
      id: 'abar-2',
      acceptance_id: 'AB-003',
      node_code: 'applicant',
      action: 'submit',
      comment: '提交审批',
      actor_id: 'u-constructor',
      actor_name: '施工-王工',
      acted_at: '2026-07-20 09:10:00',
    },
    {
      id: 'abar-3',
      acceptance_id: 'AB-003',
      node_code: 'supervisor',
      action: 'approve',
      comment: '同意',
      actor_id: 'u-supervisor',
      actor_name: '监理-钱工',
      acted_at: '2026-07-21 15:00:00',
    },
    {
      id: 'abar-4',
      acceptance_id: 'AB-003',
      node_code: 'hq_pm',
      action: 'approve',
      comment: '终审通过',
      actor_id: 'u-hqpm',
      actor_name: '姚远东',
      acted_at: '2026-07-22 11:30:00',
    },
  ],
})

function hydrateNodePaths(row) {
  ;(row.nodes || []).forEach((n) => {
    if (!n.wbs_node_path) n.wbs_node_path = buildNodePath(n.wbs_node_id)
  })
  return row
}

store.list.forEach(hydrateNodePaths)

function nextBizNo() {
  store.seq += 1
  return `AB-202608-${String(store.seq).padStart(3, '0')}`
}

function pushApproval(row) {
  store.arSeq += 1
  store.approvals.unshift({
    id: `abar-${store.arSeq}`,
    ...row,
  })
}

function validateComplete(payload) {
  const nodes = payload.nodes || []
  const files = payload.files || []
  const url = String(payload.compare_url || '').trim()
  if (!nodes.length) return '请至少选择一个实体工程分解节点'
  if (!files.length) return '请至少上传一份实模一致性报告（PDF）'
  if (!url) return '请填写实模一致性对比可访问地址'
  if (!/^https?:\/\//i.test(url)) return '对比可访问地址须为 http/https 链接'
  const badFile = files.find((f) => f.mime_type && f.mime_type !== 'application/pdf')
  if (badFile) return '报告仅支持 PDF 格式'
  return ''
}

export function listAsbuilt(projectId, { keyword = '', status = '' } = {}) {
  let rows = store.list.filter((r) => r.project_id === projectId).map((r) => hydrateNodePaths({ ...r, nodes: [...(r.nodes || [])], files: [...(r.files || [])] }))
  const kw = String(keyword || '').trim()
  if (kw) {
    rows = rows.filter(
      (r) =>
        `${r.biz_no}${r.title}${r.compare_url}${(r.nodes || []).map((n) => n.wbs_node_path).join('')}`.includes(kw),
    )
  }
  if (status) rows = rows.filter((r) => r.status === status)
  return rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
}

/**
 * 验评填报可引用的实模一致单据（默认仅已通过；可选限定与验收节点有交集）
 */
export function listAsbuiltForInspectLink(projectId, { wbsNodeId = '', includeStatuses = ['approved'] } = {}) {
  if (!projectId || projectId === 'hq') return []
  let rows = listAsbuilt(projectId).filter((r) => includeStatuses.includes(r.status))
  if (wbsNodeId) {
    const matched = rows.filter((r) => (r.nodes || []).some((n) => n.wbs_node_id === wbsNodeId))
    if (matched.length) rows = matched
  }
  return rows.map((r) => ({
    acceptance_id: r.id,
    biz_no: r.biz_no,
    title: r.title,
    compare_url: r.compare_url,
    report_names: (r.files || []).map((f) => f.file_name).join('；') || '—',
    status: r.status,
    node_paths: (r.nodes || []).map((n) => n.wbs_node_path || n.wbs_node_id).join('；'),
  }))
}

export function getAsbuilt(id) {
  const row = store.list.find((r) => r.id === id)
  if (!row) return null
  return hydrateNodePaths({
    ...row,
    nodes: (row.nodes || []).map((n) => ({ ...n })),
    files: (row.files || []).map((f) => ({ ...f })),
  })
}

export function listAsbuiltApprovals(acceptanceId) {
  return store.approvals
    .filter((a) => a.acceptance_id === acceptanceId)
    .slice()
    .sort((a, b) => String(a.acted_at).localeCompare(String(b.acted_at)))
}

export function saveAsbuiltDraft(payload = {}) {
  const projectId = payload.project_id
  if (!projectId || projectId === 'hq') return { ok: false, msg: '请先切换到具体项目' }
  const title = String(payload.title || '').trim()
  if (!title) return { ok: false, msg: '请填写验收任务名称' }

  const err = validateComplete(payload)
  if (err) return { ok: false, msg: err }

  const nodes = (payload.nodes || []).map((n, i) => ({
    id: n.id || `abn-${Date.now()}-${i}`,
    wbs_node_id: n.wbs_node_id,
    wbs_node_path: n.wbs_node_path || buildNodePath(n.wbs_node_id),
    sort_order: i + 1,
  }))
  const uniq = new Set(nodes.map((n) => n.wbs_node_id))
  if (uniq.size !== nodes.length) return { ok: false, msg: '所选实体工程节点不可重复' }

  const files = (payload.files || []).map((f, i) => ({
    id: f.id || `abf-${Date.now()}-${i}`,
    file_name: f.file_name,
    file_url: f.file_url || '#',
    file_size: f.file_size || 0,
    mime_type: 'application/pdf',
    source: f.source || 'upload',
    uploader_id: f.uploader_id || 'u-constructor',
    uploaded_at: f.uploaded_at || nowStr(),
  }))

  const stamp = nowStr()
  if (payload.id) {
    const row = store.list.find((r) => r.id === payload.id)
    if (!row) return { ok: false, msg: '单据不存在' }
    if (row.status !== 'draft') return { ok: false, msg: '仅待提交可编辑' }
    Object.assign(row, {
      title,
      compare_url: String(payload.compare_url || '').trim(),
      related_reject_id: payload.related_reject_id || '',
      nodes,
      files,
      updated_at: stamp,
    })
    return { ok: true, data: getAsbuilt(row.id) }
  }

  store.seq += 1
  const id = `AB-${String(store.seq).padStart(3, '0')}`
  const row = {
    id,
    biz_no: nextBizNo(),
    project_id: projectId,
    title,
    compare_url: String(payload.compare_url || '').trim(),
    data_source: payload.data_source || 'manual',
    status: 'draft',
    external_ref: payload.external_ref || '',
    submitter_id: 'u-constructor',
    submitter_name: '施工-李工',
    submitted_at: '',
    related_reject_id: payload.related_reject_id || '',
    current_node: 'none',
    created_at: stamp,
    updated_at: stamp,
    nodes,
    files,
  }
  store.list.unshift(row)
  return { ok: true, data: getAsbuilt(id) }
}

export function deleteAsbuiltDraft(id) {
  const idx = store.list.findIndex((r) => r.id === id)
  if (idx < 0) return { ok: false, msg: '单据不存在' }
  if (store.list[idx].status !== 'draft') return { ok: false, msg: '仅待提交可删除' }
  store.list.splice(idx, 1)
  return { ok: true }
}

export function submitAsbuilt(id) {
  const row = store.list.find((r) => r.id === id)
  if (!row) return { ok: false, msg: '单据不存在' }
  if (row.status !== 'draft') return { ok: false, msg: '仅待提交可提交审批' }
  const err = validateComplete(row)
  if (err) return { ok: false, msg: err }

  const stamp = nowStr()
  row.status = 'pending_approval'
  row.current_node = 'supervisor'
  row.submitted_at = stamp
  row.updated_at = stamp
  pushApproval({
    acceptance_id: id,
    node_code: 'applicant',
    action: 'submit',
    comment: '提交审批',
    actor_id: row.submitter_id,
    actor_name: row.submitter_name,
    acted_at: stamp,
  })
  createAsbuiltSupervisorTodo({
    acceptanceId: id,
    bizNo: row.biz_no,
    title: row.title,
    projectId: row.project_id,
    projectLabel: getProjectLabel(row.project_id),
    applicantName: row.submitter_name,
    applyTime: stamp,
    compareUrl: row.compare_url,
    nodePaths: (row.nodes || []).map((n) => n.wbs_node_path || buildNodePath(n.wbs_node_id)).join('；'),
  })
  return { ok: true, data: getAsbuilt(id) }
}

export function supervisorApproveAsbuilt(id, { action, comment } = {}) {
  const row = store.list.find((r) => r.id === id)
  if (!row) return { ok: false, msg: '单据不存在' }
  if (row.status !== 'pending_approval' || row.current_node !== 'supervisor') {
    return { ok: false, msg: '当前不在监理审批环节' }
  }
  if (action === 'reject' && !String(comment || '').trim()) {
    return { ok: false, msg: '驳回意见必填' }
  }
  const stamp = nowStr()
  pushApproval({
    acceptance_id: id,
    node_code: 'supervisor',
    action: action === 'approve' ? 'approve' : 'reject',
    comment: String(comment || '').trim() || (action === 'approve' ? '同意' : ''),
    actor_id: 'u-supervisor',
    actor_name: '监理-钱工',
    acted_at: stamp,
  })
  finishAsbuiltOpenTodos(id, action === 'approve' ? '监理通过' : '监理驳回')
  if (action === 'reject') {
    row.status = 'rejected'
    row.current_node = 'none'
    row.updated_at = stamp
    return { ok: true, data: getAsbuilt(id) }
  }
  row.current_node = 'hq_pm'
  row.updated_at = stamp
  createAsbuiltPmTodo({
    acceptanceId: id,
    bizNo: row.biz_no,
    title: row.title,
    projectId: row.project_id,
    projectLabel: getProjectLabel(row.project_id),
    applicantName: row.submitter_name,
    applyTime: row.submitted_at,
    compareUrl: row.compare_url,
    nodePaths: (row.nodes || []).map((n) => n.wbs_node_path || buildNodePath(n.wbs_node_id)).join('；'),
    supervisorTime: stamp,
    supervisorName: '监理-钱工',
  })
  return { ok: true, data: getAsbuilt(id) }
}

export function pmApproveAsbuilt(id, { action, comment } = {}) {
  const row = store.list.find((r) => r.id === id)
  if (!row) return { ok: false, msg: '单据不存在' }
  if (row.status !== 'pending_approval' || row.current_node !== 'hq_pm') {
    return { ok: false, msg: '当前不在指挥部项目经理终审环节' }
  }
  if (action === 'reject' && !String(comment || '').trim()) {
    return { ok: false, msg: '驳回意见必填' }
  }
  const stamp = nowStr()
  pushApproval({
    acceptance_id: id,
    node_code: 'hq_pm',
    action: action === 'approve' ? 'approve' : 'reject',
    comment: String(comment || '').trim() || (action === 'approve' ? '终审通过' : ''),
    actor_id: 'u-hqpm',
    actor_name: '姚远东',
    acted_at: stamp,
  })
  finishAsbuiltOpenTodos(id, action === 'approve' ? '终审通过' : '终审驳回')
  row.status = action === 'approve' ? 'approved' : 'rejected'
  row.current_node = 'none'
  row.updated_at = stamp
  return { ok: true, data: getAsbuilt(id) }
}

/** Demo：模拟第三方同步入库（报告+地址齐全才建单） */
export function simulateAsbuiltSync(projectId) {
  if (!projectId || projectId === 'hq') return { ok: false, msg: '请先切换到具体项目' }
  const selectable = wbsNodes.filter((n) => ASBUILT_SELECTABLE_NODE_TYPES.includes(Number(n.node_type)))
  const pick = selectable[0]
  if (!pick) return { ok: false, msg: '暂无可选实体工程节点' }
  const stamp = nowStr()
  store.seq += 1
  store.fileSeq += 1
  const id = `AB-${String(store.seq).padStart(3, '0')}`
  const row = {
    id,
    biz_no: nextBizNo(),
    project_id: projectId,
    title: `同步入库·${pick.node_name}`,
    compare_url: `https://example.com/asbuilt-compare/${projectId}/${id.toLowerCase()}`,
    data_source: 'sync',
    status: 'draft',
    external_ref: `EXT-${Date.now()}`,
    submitter_id: 'u-constructor',
    submitter_name: '施工-李工',
    submitted_at: '',
    related_reject_id: '',
    current_node: 'none',
    created_at: stamp,
    updated_at: stamp,
    nodes: [
      {
        id: `abn-${Date.now()}`,
        wbs_node_id: pick.id,
        wbs_node_path: buildNodePath(pick.id),
        sort_order: 1,
      },
    ],
    files: [
      {
        id: `abf-${store.fileSeq}`,
        file_name: `实模一致性报告-同步-${pick.node_name}.pdf`,
        file_url: '#',
        file_size: 1024 * 512,
        mime_type: 'application/pdf',
        source: 'sync',
        uploader_id: '',
        uploaded_at: stamp,
      },
    ],
  }
  store.list.unshift(row)
  return { ok: true, data: getAsbuilt(id) }
}

export { discardAsbuiltTodos }

/**
 * 实模一致验收 Mock — 仅支持手动上报（无第三方同步）
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
  seedAsbuiltStartedFromList,
  seedAsbuiltDoneFromList,
  upsertAsbuiltStarted,
} from './personalCenter.js'
import {
  findBrandProjectUser,
  rememberBrandProjectApprovers,
} from './brand.js'

export const STATUS_LABEL = {
  pending_approval: '待审批',
  approved: '已通过',
  rejected: '已驳回',
}

/** 当前审批节点（列表/详情，对齐品牌报审） */
export const NODE_LABEL = {
  supervisor: '待监理审',
  hq_pm: '待项目经理审',
  none: '无',
}

/** 报告附件：Word / PDF，最多 9 个，单文件 ≤30MB */
export const ASBUILT_REPORT_MAX_COUNT = 9
export const ASBUILT_REPORT_MAX_SIZE = 30 * 1024 * 1024
export const ASBUILT_REPORT_ACCEPT = '.pdf,.doc,.docx'
const ASBUILT_REPORT_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export function asbuiltReportFileTypeLabel(file = {}) {
  const name = String(file.file_name || '').toLowerCase()
  const mime = String(file.mime_type || '').toLowerCase()
  if (name.endsWith('.pdf') || mime === 'application/pdf') return 'PDF'
  if (
    name.endsWith('.doc') ||
    name.endsWith('.docx') ||
    mime === 'application/msword' ||
    mime.includes('wordprocessingml')
  ) {
    return 'WORD'
  }
  return '文件'
}

function guessReportMime(fileName = '', mimeType = '') {
  const mime = String(mimeType || '').toLowerCase()
  if (ASBUILT_REPORT_MIME.has(mime)) return mime
  const name = String(fileName || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  if (name.endsWith('.doc')) return 'application/msword'
  return mime
}

function isAllowedReportFile(file = {}) {
  const mime = guessReportMime(file.file_name, file.mime_type)
  if (ASBUILT_REPORT_MIME.has(mime)) return true
  const name = String(file.file_name || '').toLowerCase()
  return name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')
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
  seq: 8,
  fileSeq: 8,
  arSeq: 13,
  list: [
    {
      id: 'AB-001',
      biz_no: 'AB-202608-001',
      project_id: 'p-000',
      title: 'T2 混凝土分项实模一致验收',
      remark: '',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'rejected',
      submitter_id: 'u-constructor',
      submitter_name: '施工-李工',
      submitted_at: '2026-08-08 11:00:00',
      current_node: 'none',
      copy_from_id: '',
      copy_from_biz_no: '',
      created_at: '2026-08-08 10:00:00',
      updated_at: '2026-08-08 16:30:00',
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
      title: '防水分项实模一致验收',
      remark: '地下室防水节点已完成实模对比',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'pending_approval',
      submitter_id: 'u-constructor',
      submitter_name: '施工-李工',
      submitted_at: '2026-08-09 14:20:00',
      current_node: 'supervisor',
      copy_from_id: '',
      copy_from_biz_no: '',
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
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-08-09 11:00:00',
        },
      ],
    },
    {
      id: 'AB-003',
      biz_no: 'AB-202607-003',
      project_id: 'p-000',
      title: '电缆敷设分项实模一致',
      remark: '',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'approved',
      submitter_id: 'u-constructor',
      submitter_name: '施工-王工',
      submitted_at: '2026-07-20 09:10:00',
      current_node: 'none',
      copy_from_id: '',
      copy_from_biz_no: '',
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
    {
      id: 'AB-004',
      biz_no: 'AB-202608-004',
      project_id: 'p-000',
      title: '钢结构分项实模一致验收',
      remark: '钢梁节点已完成实模对比',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'pending_approval',
      submitter_id: 'u-constructor',
      submitter_name: '施工-王工',
      submitted_at: '2026-08-12 10:00:00',
      current_node: 'hq_pm',
      copy_from_id: '',
      copy_from_biz_no: '',
      created_at: '2026-08-12 09:00:00',
      updated_at: '2026-08-13 11:00:00',
      nodes: [
        {
          id: 'abn-4',
          wbs_node_id: 'wn-item-3',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-4',
          file_name: '实模一致性报告-钢结构.docx',
          file_url: '#',
          file_size: 1024 * 512,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-08-12 09:00:00',
        },
      ],
    },
    {
      id: 'AB-005',
      biz_no: 'AB-202607-005',
      project_id: 'p-000',
      title: '幕墙分项实模一致验收',
      remark: '',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'approved',
      submitter_id: 'u-constructor',
      submitter_name: '施工-李工',
      submitted_at: '2026-07-25 09:00:00',
      current_node: 'none',
      copy_from_id: '',
      copy_from_biz_no: '',
      created_at: '2026-07-24 16:00:00',
      updated_at: '2026-07-26 15:00:00',
      nodes: [
        {
          id: 'abn-5',
          wbs_node_id: 'wn-item-4',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-5',
          file_name: '实模一致性报告-幕墙.pdf',
          file_url: '#',
          file_size: 1024 * 700,
          mime_type: 'application/pdf',
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-07-24 16:00:00',
        },
      ],
    },
    {
      id: 'AB-006',
      biz_no: 'AB-202608-006',
      project_id: 'p-000',
      title: '地坪分项实模一致验收',
      remark: '基层含水率记录不全',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'rejected',
      submitter_id: 'u-constructor',
      submitter_name: '施工-王工',
      submitted_at: '2026-08-10 09:30:00',
      current_node: 'none',
      copy_from_id: '',
      copy_from_biz_no: '',
      created_at: '2026-08-10 09:00:00',
      updated_at: '2026-08-10 16:00:00',
      nodes: [
        {
          id: 'abn-6',
          wbs_node_id: 'wn-item-2',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-6',
          file_name: '实模一致性报告-地坪.pdf',
          file_url: '#',
          file_size: 1024 * 480,
          mime_type: 'application/pdf',
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-08-10 09:00:00',
        },
      ],
    },
    {
      id: 'AB-007',
      biz_no: 'AB-202608-007',
      project_id: 'p-000',
      title: 'T2 混凝土分项实模一致验收',
      remark: '已按驳回意见补充节点照片对照页',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'pending_approval',
      submitter_id: 'u-constructor',
      submitter_name: '施工-李工',
      submitted_at: '2026-08-14 10:00:00',
      current_node: 'supervisor',
      copy_from_id: 'AB-001',
      copy_from_biz_no: 'AB-202608-001',
      created_at: '2026-08-14 09:30:00',
      updated_at: '2026-08-14 10:00:00',
      nodes: [
        {
          id: 'abn-7',
          wbs_node_id: 'wn-item-3',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-7',
          file_name: '实模一致性报告-混凝土分项-补正.pdf',
          file_url: '#',
          file_size: 1024 * 900,
          mime_type: 'application/pdf',
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-08-14 09:30:00',
        },
      ],
    },
    {
      id: 'AB-008',
      biz_no: 'AB-202608-008',
      project_id: 'p-000',
      title: '地坪分项实模一致验收',
      remark: '已补含水率检测记录与对照照片',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      pm_approver_user_id: 'u-pm-01',
      pm_approver_name: '王建国',
      status: 'pending_approval',
      submitter_id: 'u-constructor',
      submitter_name: '施工-王工',
      submitted_at: '2026-08-15 11:00:00',
      current_node: 'supervisor',
      copy_from_id: 'AB-006',
      copy_from_biz_no: 'AB-202608-006',
      created_at: '2026-08-15 10:30:00',
      updated_at: '2026-08-15 11:00:00',
      nodes: [
        {
          id: 'abn-8',
          wbs_node_id: 'wn-item-2',
          wbs_node_path: '',
          sort_order: 1,
        },
      ],
      files: [
        {
          id: 'abf-8',
          file_name: '实模一致性报告-地坪-补正.pdf',
          file_url: '#',
          file_size: 1024 * 560,
          mime_type: 'application/pdf',
          source: 'upload',
          uploader_id: 'u-constructor',
          uploaded_at: '2026-08-15 10:30:00',
        },
      ],
    },
  ],
  approvals: [
    {
      id: 'abar-0',
      acceptance_id: 'AB-001',
      node_code: 'applicant',
      action: 'submit',
      comment: '提交审批',
      actor_id: 'u-constructor',
      actor_name: '施工-李工',
      acted_at: '2026-08-08 11:00:00',
    },
    {
      id: 'abar-0b',
      acceptance_id: 'AB-001',
      node_code: 'supervisor',
      action: 'reject',
      comment: '报告内容不完整，请补充后重新申报',
      actor_id: 'u-jl-01',
      actor_name: '李总监',
      acted_at: '2026-08-08 16:30:00',
    },
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
      actor_id: 'u-jl-01',
      actor_name: '李总监',
      acted_at: '2026-07-21 15:00:00',
    },
    {
      id: 'abar-4',
      acceptance_id: 'AB-003',
      node_code: 'hq_pm',
      action: 'approve',
      comment: '终审通过',
      actor_id: 'u-pm-01',
      actor_name: '王建国',
      acted_at: '2026-07-22 11:30:00',
    },
    {
      id: 'abar-5',
      acceptance_id: 'AB-004',
      node_code: 'applicant',
      action: 'submit',
      comment: '提交审批',
      actor_id: 'u-constructor',
      actor_name: '施工-王工',
      acted_at: '2026-08-12 10:00:00',
    },
    {
      id: 'abar-6',
      acceptance_id: 'AB-004',
      node_code: 'supervisor',
      action: 'approve',
      comment: '同意，请项目经理终审',
      actor_id: 'u-jl-01',
      actor_name: '李总监',
      acted_at: '2026-08-13 11:00:00',
    },
    {
      id: 'abar-7',
      acceptance_id: 'AB-005',
      node_code: 'applicant',
      action: 'submit',
      comment: '提交审批',
      actor_id: 'u-constructor',
      actor_name: '施工-李工',
      acted_at: '2026-07-25 09:00:00',
    },
    {
      id: 'abar-8',
      acceptance_id: 'AB-005',
      node_code: 'supervisor',
      action: 'approve',
      comment: '同意',
      actor_id: 'u-jl-01',
      actor_name: '李总监',
      acted_at: '2026-07-25 16:00:00',
    },
    {
      id: 'abar-9',
      acceptance_id: 'AB-005',
      node_code: 'hq_pm',
      action: 'approve',
      comment: '终审通过',
      actor_id: 'u-pm-01',
      actor_name: '王建国',
      acted_at: '2026-07-26 15:00:00',
    },
    {
      id: 'abar-10',
      acceptance_id: 'AB-006',
      node_code: 'applicant',
      action: 'submit',
      comment: '提交审批',
      actor_id: 'u-constructor',
      actor_name: '施工-王工',
      acted_at: '2026-08-10 09:30:00',
    },
    {
      id: 'abar-11',
      acceptance_id: 'AB-006',
      node_code: 'supervisor',
      action: 'reject',
      comment: '含水率检测记录不全，请补充后重新申报',
      actor_id: 'u-jl-01',
      actor_name: '李总监',
      acted_at: '2026-08-10 16:00:00',
    },
    {
      id: 'abar-12',
      acceptance_id: 'AB-007',
      node_code: 'applicant',
      action: 'submit',
      comment: '从 AB-202608-001 重新申报',
      actor_id: 'u-constructor',
      actor_name: '施工-李工',
      acted_at: '2026-08-14 10:00:00',
    },
    {
      id: 'abar-13',
      acceptance_id: 'AB-008',
      node_code: 'applicant',
      action: 'submit',
      comment: '从 AB-202608-006 重新申报',
      actor_id: 'u-constructor',
      actor_name: '施工-王工',
      acted_at: '2026-08-15 11:00:00',
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
  if (!nodes.length) return '请至少选择一个实体工程分解节点'
  if (!files.length) return '请至少上传一份实模一致性报告'
  if (files.length > ASBUILT_REPORT_MAX_COUNT) {
    return `报告附件最多上传 ${ASBUILT_REPORT_MAX_COUNT} 个`
  }
  const oversize = files.find((f) => Number(f.file_size || 0) > ASBUILT_REPORT_MAX_SIZE)
  if (oversize) return '单个报告附件不能超过 30MB'
  const badFile = files.find((f) => !isAllowedReportFile(f))
  if (badFile) return '报告仅支持 Word（.doc/.docx）与 PDF'
  if (!String(payload.supervisor_approver_user_id || '').trim()) {
    return '请选择监理单位审批人'
  }
  if (!String(payload.pm_approver_user_id || '').trim()) {
    return '请选择项目经理审批人'
  }
  return ''
}

export function listAsbuilt(projectId, { keyword = '', status = '' } = {}) {
  let rows = store.list
    .filter((r) => r.project_id === projectId)
    .map((r) =>
      hydrateNodePaths({ ...r, nodes: [...(r.nodes || [])], files: [...(r.files || [])] }),
    )
  const kw = String(keyword || '').trim()
  if (kw) {
    rows = rows.filter((r) => {
      const hay = [
        r.biz_no,
        r.title,
        r.remark,
        r.copy_from_biz_no,
        r.supervisor_approver_name,
        r.pm_approver_name,
        (r.nodes || []).map((n) => n.wbs_node_path).join(''),
        (r.files || []).map((f) => f.file_name).join(''),
      ].join('')
      return hay.includes(kw)
    })
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

export function buildCopyPayloadFromRejected(acceptanceId) {
  const row = getAsbuilt(acceptanceId)
  if (!row || row.status !== 'rejected') return null
  return {
    title: row.title,
    remark: row.remark || '',
    copy_from_id: row.id,
    copy_from_biz_no: row.biz_no,
    supervisor_approver_user_id: row.supervisor_approver_user_id || '',
    supervisor_approver_name: row.supervisor_approver_name || '',
    pm_approver_user_id: row.pm_approver_user_id || '',
    pm_approver_name: row.pm_approver_name || '',
    selectedNodeIds: (row.nodes || []).map((n) => n.wbs_node_id),
    files: (row.files || []).map((f) => ({
      ...f,
      id: `abf-copy-${Date.now()}-${f.id || Math.random().toString(36).slice(2, 6)}`,
      source: 'upload',
    })),
  }
}

function normalizeSubmitPayload(payload = {}) {
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
    mime_type: guessReportMime(f.file_name, f.mime_type),
    source: f.source || 'upload',
    uploader_id: f.uploader_id || 'u-constructor',
    uploaded_at: f.uploaded_at || nowStr(),
  }))

  const supervisor_approver_user_id = String(payload.supervisor_approver_user_id || '').trim()
  const pm_approver_user_id = String(payload.pm_approver_user_id || '').trim()
  const supervisorUser = findBrandProjectUser(supervisor_approver_user_id)
  const pmUser = findBrandProjectUser(pm_approver_user_id)
  if (!supervisorUser) return { ok: false, msg: '监理单位审批人无效' }
  if (!pmUser) return { ok: false, msg: '项目经理审批人无效' }

  return {
    ok: true,
    projectId,
    title,
    remark: String(payload.remark || '').trim(),
    nodes,
    files,
    supervisor_approver_user_id,
    supervisor_approver_name:
      String(payload.supervisor_approver_name || '').trim() || supervisorUser.name,
    pm_approver_user_id,
    pm_approver_name: String(payload.pm_approver_name || '').trim() || pmUser.name,
  }
}

function finalizeAsbuiltSubmission(row, stamp) {
  rememberBrandProjectApprovers(
    row.project_id,
    row.supervisor_approver_user_id,
    row.supervisor_approver_name,
    row.pm_approver_user_id,
    row.pm_approver_name,
  )
  pushApproval({
    acceptance_id: row.id,
    node_code: 'applicant',
    action: 'submit',
    comment: row.copy_from_biz_no ? `从 ${row.copy_from_biz_no} 重新申报` : '提交审批',
    actor_id: row.submitter_id,
    actor_name: row.submitter_name,
    acted_at: stamp,
  })
  createAsbuiltSupervisorTodo({
    acceptanceId: row.id,
    bizNo: row.biz_no,
    title: row.title,
    remark: row.remark || '',
    projectId: row.project_id,
    projectLabel: getProjectLabel(row.project_id),
    applicantName: row.submitter_name,
    applyTime: stamp,
    nodePaths: (row.nodes || []).map((n) => n.wbs_node_path || buildNodePath(n.wbs_node_id)).join('；'),
    reportNames: (row.files || []).map((f) => f.file_name).join('；'),
  })
  upsertAsbuiltStarted(row)
}

/** 新建并提交 → 待审批（新单号） */
export function submitAsbuilt(payload = {}) {
  const checked = normalizeSubmitPayload(payload)
  if (!checked.ok) return checked

  const stamp = nowStr()
  store.seq += 1
  const id = `AB-${String(store.seq).padStart(3, '0')}`
  const row = {
    id,
    biz_no: nextBizNo(),
    project_id: checked.projectId,
    title: checked.title,
    remark: checked.remark,
    supervisor_approver_user_id: checked.supervisor_approver_user_id,
    supervisor_approver_name: checked.supervisor_approver_name,
    pm_approver_user_id: checked.pm_approver_user_id,
    pm_approver_name: checked.pm_approver_name,
    status: 'pending_approval',
    submitter_id: 'u-constructor',
    submitter_name: '施工-李工',
    submitted_at: stamp,
    current_node: 'supervisor',
    copy_from_id: '',
    copy_from_biz_no: '',
    created_at: stamp,
    updated_at: stamp,
    nodes: checked.nodes,
    files: checked.files,
  }
  store.list.unshift(row)
  finalizeAsbuiltSubmission(row, stamp)
  return { ok: true, data: getAsbuilt(id) }
}

/** 已驳回单复制新建（新单号），状态待审批 */
export function copyAsbuiltFromRejected(sourceId, payload = {}) {
  const src = store.list.find((r) => r.id === sourceId)
  if (!src || src.status !== 'rejected') {
    return { ok: false, msg: '复制来源须为已驳回验收单' }
  }
  const checked = normalizeSubmitPayload({
    ...payload,
    project_id: payload.project_id || src.project_id,
  })
  if (!checked.ok) return checked
  if (checked.projectId !== src.project_id) {
    return { ok: false, msg: '复制来源须为本项目已驳回验收单' }
  }

  const stamp = nowStr()
  store.seq += 1
  const id = `AB-${String(store.seq).padStart(3, '0')}`
  const row = {
    id,
    biz_no: nextBizNo(),
    project_id: checked.projectId,
    title: checked.title,
    remark: checked.remark,
    supervisor_approver_user_id: checked.supervisor_approver_user_id,
    supervisor_approver_name: checked.supervisor_approver_name,
    pm_approver_user_id: checked.pm_approver_user_id,
    pm_approver_name: checked.pm_approver_name,
    status: 'pending_approval',
    submitter_id: 'u-constructor',
    submitter_name: '施工-李工',
    submitted_at: stamp,
    current_node: 'supervisor',
    copy_from_id: src.id,
    copy_from_biz_no: src.biz_no,
    created_at: stamp,
    updated_at: stamp,
    nodes: checked.nodes,
    files: checked.files,
  }
  store.list.unshift(row)
  finalizeAsbuiltSubmission(row, stamp)
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
  const supervisorName = row.supervisor_approver_name || '监理'
  pushApproval({
    acceptance_id: id,
    node_code: 'supervisor',
    action: action === 'approve' ? 'approve' : 'reject',
    comment: String(comment || '').trim() || (action === 'approve' ? '同意' : ''),
    actor_id: row.supervisor_approver_user_id || 'u-supervisor',
    actor_name: supervisorName,
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
    remark: row.remark || '',
    projectId: row.project_id,
    projectLabel: getProjectLabel(row.project_id),
    applicantName: row.submitter_name,
    applyTime: row.submitted_at,
    nodePaths: (row.nodes || []).map((n) => n.wbs_node_path || buildNodePath(n.wbs_node_id)).join('；'),
    reportNames: (row.files || []).map((f) => f.file_name).join('；'),
    supervisorTime: stamp,
    supervisorName,
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
    actor_id: row.pm_approver_user_id || 'u-hqpm',
    actor_name: row.pm_approver_name || '项目经理',
    acted_at: stamp,
  })
  finishAsbuiltOpenTodos(id, action === 'approve' ? '终审通过' : '终审驳回')
  row.status = action === 'approve' ? 'approved' : 'rejected'
  row.current_node = 'none'
  row.updated_at = stamp
  return { ok: true, data: getAsbuilt(id) }
}

function buildAsbuiltTodoPayload(row) {
  return {
    acceptanceId: row.id,
    bizNo: row.biz_no,
    title: row.title,
    remark: row.remark || '',
    projectId: row.project_id,
    projectLabel: getProjectLabel(row.project_id),
    applicantName: row.submitter_name,
    applyTime: row.submitted_at,
    nodePaths: (row.nodes || []).map((n) => n.wbs_node_path || buildNodePath(n.wbs_node_id)).join('；'),
    reportNames: (row.files || []).map((f) => f.file_name).join('；'),
    supervisorName: row.supervisor_approver_name || '监理',
    pmApproverName: row.pm_approver_name || '项目经理',
    copyFromId: row.copy_from_id || '',
    copyFromBizNo: row.copy_from_biz_no || '',
  }
}

function seedOpenAsbuiltTodos() {
  for (const row of store.list) {
    if (row.status !== 'pending_approval') continue
    if (row.current_node === 'supervisor') {
      createAsbuiltSupervisorTodo(buildAsbuiltTodoPayload(row))
    } else if (row.current_node === 'hq_pm') {
      createAsbuiltPmTodo({
        ...buildAsbuiltTodoPayload(row),
        supervisorTime: row.updated_at || row.submitted_at,
        supervisorName: row.supervisor_approver_name || '监理',
      })
    }
  }
}

seedOpenAsbuiltTodos()
seedAsbuiltStartedFromList(store.list)
seedAsbuiltDoneFromList(store.list)

export { discardAsbuiltTodos }

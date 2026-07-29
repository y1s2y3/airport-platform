/**
 * 样板管理 Mock — 对齐 prd-sample-v1
 * 材料定样 / 关键工序样板：监理 → 项目经理
 */
import { reactive } from 'vue'
import { getProjectLabel } from './laborRealName.js'
import {
  createSampleSupervisorTodo,
  createSamplePmTodo,
  discardSampleTodos,
  finishSampleOpenTodos,
} from './personalCenter.js'

export const STATUS_LABEL = {
  in_approval: '审批中',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
}

export const NODE_LABEL = {
  none: '—',
  supervisor: '待监理审',
  pm: '待项目经理审',
}

/** 审批记录节点（历史轨迹用，非「待审」文案） */
export const APPROVAL_NODE_LABEL = {
  applicant: '施工提交',
  supervisor: '监理审批',
  pm: '项目经理终审',
}

export const ACTION_LABEL = {
  submit: '提交',
  withdraw: '撤回',
  resubmit: '重提',
  agree: '同意',
  reject: '退回',
}

export function actionTagType(action) {
  if (action === 'agree' || action === 'submit' || action === 'resubmit') return 'success'
  if (action === 'reject') return 'danger'
  if (action === 'withdraw') return 'info'
  return 'warning'
}

export const BIZ_TYPE_LABEL = {
  material: '材料定样',
  process: '工序样板',
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'withdrawn') return 'info'
  if (status === 'in_approval') return 'warning'
  return ''
}

function timestamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

const store = reactive({
  seq: { m: 3, p: 3, ar: 8 },
  materials: [
    {
      application_id: 'MS-001',
      project_id: 'p-000',
      material_name: '外墙真石漆',
      use_part: 'T3 航站楼外立面',
      compare_record: '比选三家样板，最终选定亚士漆色卡 A12。',
      photo_files: ['真石漆样板-正面.jpg', '真石漆样板-侧面.jpg'],
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-王工',
      submit_time: '2026-07-10 09:20:00',
      finish_time: '2026-07-12 16:40:00',
      remark: '',
    },
    {
      application_id: 'MS-002',
      project_id: 'p-000',
      material_name: '室内地砖 800×800',
      use_part: '商业区公区',
      compare_record: '两款对比，耐磨与色差达标。',
      photo_files: ['地砖样板.jpg'],
      status: 'in_approval',
      current_node: 'supervisor',
      applicant_name: '施工-李工',
      submit_time: '2026-07-25 11:05:00',
      finish_time: '',
      remark: '',
    },
    {
      application_id: 'MS-003',
      project_id: 'p-001',
      material_name: '铝单板幕墙',
      use_part: '连廊立面',
      compare_record: '色差与平整度已现场确认。',
      photo_files: ['铝单板-1.jpg'],
      status: 'in_approval',
      current_node: 'pm',
      applicant_name: '施工-赵工',
      submit_time: '2026-07-20 14:10:00',
      finish_time: '',
      remark: '',
    },
  ],
  processes: [
    {
      application_id: 'PS-001',
      project_id: 'p-000',
      process_name: '清水混凝土柱样板',
      use_part: '地下一层结构区',
      briefing_content: '模板拼缝、拆模时机、养护要求；工人扫码查看标准照片。',
      photo_files: ['清水柱-正面.jpg', '清水柱-节点.jpg'],
      video_files: ['交底讲解.mp4'],
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-王工',
      submit_time: '2026-07-08 10:00:00',
      finish_time: '2026-07-09 17:30:00',
      remark: '',
      qr_code: 'QR-PS-001',
      qr_url: '#/qm/sample/process/qr?id=PS-001',
    },
    {
      application_id: 'PS-002',
      project_id: 'p-000',
      process_name: '防水卷材铺贴样板',
      use_part: '屋面防水层',
      briefing_content: '搭接宽度、热熔顺序、节点加强。',
      photo_files: ['防水样板.jpg'],
      video_files: [],
      status: 'in_approval',
      current_node: 'supervisor',
      applicant_name: '施工-李工',
      submit_time: '2026-07-26 09:40:00',
      finish_time: '',
      remark: '',
      qr_code: '',
      qr_url: '',
    },
    {
      application_id: 'PS-003',
      project_id: 'p-001',
      process_name: '砌体样板墙',
      use_part: '办公区隔墙',
      briefing_content: '灰缝厚度、拉结筋、洞口加强。',
      photo_files: ['砌体墙.jpg'],
      video_files: ['砌体交底.mp4'],
      status: 'in_approval',
      current_node: 'pm',
      applicant_name: '施工-赵工',
      submit_time: '2026-07-22 15:20:00',
      finish_time: '',
      remark: '',
      qr_code: '',
      qr_url: '',
    },
  ],
  approvals: [
    {
      record_id: 'AR-001',
      biz_type: 'material',
      application_id: 'MS-001',
      node_code: 'applicant',
      action: 'submit',
      opinion: '直接提交',
      operator_name: '施工-王工',
      operate_time: '2026-07-10 09:20:00',
    },
    {
      record_id: 'AR-002',
      biz_type: 'material',
      application_id: 'MS-001',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '样板合格',
      operator_name: '监理用户',
      operate_time: '2026-07-11 10:00:00',
    },
    {
      record_id: 'AR-003',
      biz_type: 'material',
      application_id: 'MS-001',
      node_code: 'pm',
      action: 'agree',
      opinion: '同意定样',
      operator_name: '项目经理',
      operate_time: '2026-07-12 16:40:00',
    },
    {
      record_id: 'AR-004',
      biz_type: 'process',
      application_id: 'PS-001',
      node_code: 'applicant',
      action: 'submit',
      opinion: '直接提交',
      operator_name: '施工-王工',
      operate_time: '2026-07-08 10:00:00',
    },
    {
      record_id: 'AR-005',
      biz_type: 'process',
      application_id: 'PS-001',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '交底完整',
      operator_name: '监理用户',
      operate_time: '2026-07-09 09:00:00',
    },
    {
      record_id: 'AR-006',
      biz_type: 'process',
      application_id: 'PS-001',
      node_code: 'pm',
      action: 'agree',
      opinion: '通过并赋码',
      operator_name: '项目经理',
      operate_time: '2026-07-09 17:30:00',
    },
    {
      record_id: 'AR-007',
      biz_type: 'material',
      application_id: 'MS-003',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '同意',
      operator_name: '监理用户',
      operate_time: '2026-07-21 11:00:00',
    },
    {
      record_id: 'AR-008',
      biz_type: 'process',
      application_id: 'PS-003',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '同意',
      operator_name: '监理用户',
      operate_time: '2026-07-23 10:00:00',
    },
  ],
})

function pushApproval(row) {
  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    ...row,
    operate_time: row.operate_time || timestamp(),
  })
}

function buildTodoPayload(bizType, app) {
  const isMaterial = bizType === 'material'
  return {
    bizType,
    applicationId: app.application_id,
    title: isMaterial ? app.material_name : app.process_name,
    usePart: app.use_part || '',
    projectId: app.project_id,
    projectLabel: getProjectLabel(app.project_id) || app.project_id,
    applicantName: app.applicant_name,
    applyTime: app.submit_time,
    briefing: isMaterial ? app.compare_record : app.briefing_content,
  }
}

export function listMaterialApps(projectId, { keyword = '', status = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return store.materials
    .filter((a) => a.project_id === projectId)
    .filter((a) => !status || a.status === status)
    .filter((a) => {
      if (!kw) return true
      return (
        a.application_id.toLowerCase().includes(kw) ||
        a.material_name.toLowerCase().includes(kw) ||
        (a.use_part || '').toLowerCase().includes(kw)
      )
    })
    .slice()
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function listProcessApps(projectId, { keyword = '', status = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return store.processes
    .filter((a) => a.project_id === projectId)
    .filter((a) => !status || a.status === status)
    .filter((a) => {
      if (!kw) return true
      return (
        a.application_id.toLowerCase().includes(kw) ||
        a.process_name.toLowerCase().includes(kw) ||
        (a.use_part || '').toLowerCase().includes(kw)
      )
    })
    .slice()
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function listMaterialPending(projectId, node) {
  return store.materials.filter(
    (a) =>
      a.project_id === projectId &&
      a.status === 'in_approval' &&
      (!node || a.current_node === node),
  )
}

export function listProcessPending(projectId, node) {
  return store.processes.filter(
    (a) =>
      a.project_id === projectId &&
      a.status === 'in_approval' &&
      (!node || a.current_node === node),
  )
}

export function getMaterialDetail(applicationId) {
  const app = store.materials.find((a) => a.application_id === applicationId)
  if (!app) return null
  return {
    ...app,
    project_label: getProjectLabel(app.project_id) || app.project_id,
    approvals: store.approvals.filter(
      (r) => r.biz_type === 'material' && r.application_id === applicationId,
    ),
  }
}

export function getProcessDetail(applicationId) {
  const app = store.processes.find((a) => a.application_id === applicationId)
  if (!app) return null
  return {
    ...app,
    project_label: getProjectLabel(app.project_id) || app.project_id,
    approvals: store.approvals.filter(
      (r) => r.biz_type === 'process' && r.application_id === applicationId,
    ),
  }
}

/** 台账视图：仅已通过 */
export function listLedger(projectId, { bizType = '', keyword = '', usePart = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  const part = usePart.trim().toLowerCase()
  const rows = []
  if (!bizType || bizType === 'material') {
    store.materials
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          ledger_id: `L-${a.application_id}`,
          biz_type: 'material',
          application_id: a.application_id,
          title: a.material_name,
          use_part: a.use_part,
          status: a.status,
          project_id: a.project_id,
          finish_time: a.finish_time,
          has_qr: false,
        })
      })
  }
  if (!bizType || bizType === 'process') {
    store.processes
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          ledger_id: `L-${a.application_id}`,
          biz_type: 'process',
          application_id: a.application_id,
          title: a.process_name,
          use_part: a.use_part,
          status: a.status,
          project_id: a.project_id,
          finish_time: a.finish_time,
          has_qr: Boolean(a.qr_code),
        })
      })
  }
  return rows
    .filter((r) => {
      if (part && !(r.use_part || '').toLowerCase().includes(part)) return false
      if (!kw) return true
      return (
        r.application_id.toLowerCase().includes(kw) ||
        r.title.toLowerCase().includes(kw) ||
        (r.use_part || '').toLowerCase().includes(kw)
      )
    })
    .sort((a, b) => (a.finish_time < b.finish_time ? 1 : -1))
}

export function submitMaterialApp(payload) {
  const {
    project_id,
    material_name,
    use_part,
    compare_record,
    photo_files = [],
    remark = '',
    applicant_name = '当前用户',
  } = payload
  if (!project_id) return { ok: false, msg: '请选择项目' }
  if (!(material_name || '').trim()) return { ok: false, msg: '请填写材料名称' }
  if (!(use_part || '').trim()) return { ok: false, msg: '请填写使用部位' }
  if (!Array.isArray(photo_files) || photo_files.length < 1) {
    return { ok: false, msg: '请至少上传 1 张样板照片' }
  }
  store.seq.m += 1
  const application_id = `MS-${String(store.seq.m).padStart(3, '0')}`
  const submit_time = timestamp()
  const app = {
    application_id,
    project_id,
    material_name: material_name.trim(),
    use_part: use_part.trim(),
    compare_record: (compare_record || '').trim(),
    photo_files: [...photo_files],
    status: 'in_approval',
    current_node: 'supervisor',
    applicant_name,
    submit_time,
    finish_time: '',
    remark: remark || '',
  }
  store.materials.unshift(app)
  pushApproval({
    biz_type: 'material',
    application_id,
    node_code: 'applicant',
    action: 'submit',
    opinion: '直接提交',
    operator_name: applicant_name,
  })
  createSampleSupervisorTodo(buildTodoPayload('material', app))
  return { ok: true, data: app }
}

export function submitProcessApp(payload) {
  const {
    project_id,
    process_name,
    use_part,
    briefing_content,
    photo_files = [],
    video_files = [],
    remark = '',
    applicant_name = '当前用户',
  } = payload
  if (!project_id) return { ok: false, msg: '请选择项目' }
  if (!(process_name || '').trim()) return { ok: false, msg: '请填写工序名称' }
  if (!(use_part || '').trim()) return { ok: false, msg: '请填写使用部位' }
  if (!(briefing_content || '').trim()) return { ok: false, msg: '请填写技术交底内容' }
  store.seq.p += 1
  const application_id = `PS-${String(store.seq.p).padStart(3, '0')}`
  const submit_time = timestamp()
  const app = {
    application_id,
    project_id,
    process_name: process_name.trim(),
    use_part: use_part.trim(),
    briefing_content: briefing_content.trim(),
    photo_files: [...photo_files],
    video_files: [...video_files],
    status: 'in_approval',
    current_node: 'supervisor',
    applicant_name,
    submit_time,
    finish_time: '',
    remark: remark || '',
    qr_code: '',
    qr_url: '',
  }
  store.processes.unshift(app)
  pushApproval({
    biz_type: 'process',
    application_id,
    node_code: 'applicant',
    action: 'submit',
    opinion: '直接提交',
    operator_name: applicant_name,
  })
  createSampleSupervisorTodo(buildTodoPayload('process', app))
  return { ok: true, data: app }
}

function findApp(bizType, applicationId) {
  return bizType === 'material'
    ? store.materials.find((a) => a.application_id === applicationId)
    : store.processes.find((a) => a.application_id === applicationId)
}

export function withdrawSample(bizType, applicationId) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '仅待监理审时可撤回' }
  }
  app.status = 'withdrawn'
  app.current_node = 'none'
  app.finish_time = timestamp()
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'withdraw',
    opinion: '申请人撤回',
    operator_name: '当前用户',
  })
  discardSampleTodos(bizType, applicationId)
  return { ok: true }
}

export function resubmitSample(bizType, applicationId) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (!['rejected', 'withdrawn'].includes(app.status)) {
    return { ok: false, msg: '仅已驳回/已撤回可重提' }
  }
  app.status = 'in_approval'
  app.current_node = 'supervisor'
  app.submit_time = timestamp()
  app.finish_time = ''
  if (bizType === 'process') {
    app.qr_code = ''
    app.qr_url = ''
  }
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'resubmit',
    opinion: '重新提交',
    operator_name: '当前用户',
  })
  createSampleSupervisorTodo(buildTodoPayload(bizType, app))
  return { ok: true }
}

export function supervisorApproveSample(bizType, applicationId, { action, opinion }) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '当前不在待监理审节点' }
  }
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '退回意见必填' }
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'supervisor',
    action,
    opinion: opinion || '',
    operator_name: '监理用户',
  })
  if (action === 'agree') {
    finishSampleOpenTodos(bizType, applicationId, 'supervisor', '监理同意')
    app.current_node = 'pm'
    createSamplePmTodo(buildTodoPayload(bizType, app))
  } else {
    finishSampleOpenTodos(bizType, applicationId, 'supervisor', '监理退回')
    discardSampleTodos(bizType, applicationId)
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = timestamp()
  }
  return { ok: true }
}

export function pmApproveSample(bizType, applicationId, { action, opinion }) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'pm') {
    return { ok: false, msg: '当前不在待项目经理审节点' }
  }
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '退回意见必填' }
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'pm',
    action,
    opinion: opinion || '',
    operator_name: '项目经理',
  })
  if (action === 'agree') {
    finishSampleOpenTodos(bizType, applicationId, 'pm', '终审通过')
    discardSampleTodos(bizType, applicationId)
    app.status = 'approved'
    app.current_node = 'none'
    app.finish_time = timestamp()
    if (bizType === 'process') {
      app.qr_code = `QR-${applicationId}`
      app.qr_url = `#/qm/sample/process/qr?id=${applicationId}`
    }
  } else {
    finishSampleOpenTodos(bizType, applicationId, 'pm', '终审退回')
    discardSampleTodos(bizType, applicationId)
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = timestamp()
  }
  return { ok: true }
}

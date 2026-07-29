/**
 * 设备进场管理 Mock — 对齐 feature-list 设备到场规则
 * 无定样例外开关与材料进场共用（mat.getNoSampleAllowed）
 * 审批入口：个人中心待办（仅监理）
 */
import { reactive } from 'vue'
import { getProjectLabel } from './laborRealName.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { getNoSampleAllowed } from './mat.js'
import { createEqEntrySupervisorTodo, discardEqEntryTodos } from './personalCenter.js'

export const STATUS_LABEL = {
  pending_supervisor: '待监理审',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'withdrawn') return 'info'
  return 'warning'
}

/** 开箱清单写死四项 */
export const UNPACK_FIXED = [
  { key: 'nameplate', label: '铭牌' },
  { key: 'tools', label: '随机工具' },
  { key: 'manual', label: '技术手册' },
  { key: 'parts', label: '配件完备性' },
]

export function createDefaultUnpackItems() {
  return UNPACK_FIXED.map((x) => ({
    key: x.key,
    label: x.label,
    fixed: true,
    ok: false,
    remark: '',
  }))
}

function timestamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

/** Demo：已通过设备类定样 */
const APPROVED_SAMPLES = [
  {
    sample_id: 'EQS-001',
    project_id: 'p-000',
    equipment_name: '低压开关柜',
    use_part: '变配电所',
    brand_name: '施耐德',
    manufacturer: '施耐德电气（中国）有限公司',
    model: 'Blokset',
  },
  {
    sample_id: 'EQS-002',
    project_id: 'p-000',
    equipment_name: '配电箱',
    use_part: '商业区配电间',
    brand_name: '正泰',
    manufacturer: '正泰电器股份有限公司',
    model: 'NXB',
  },
  {
    sample_id: 'EQS-003',
    project_id: 'p-001',
    equipment_name: '冷水机组',
    use_part: '中央空调机房',
    brand_name: '开利',
    manufacturer: '开利空调销售服务（上海）有限公司',
    model: '30XW',
  },
]

/** 报审通过入选品牌（设备） */
const APPROVED_BRANDS = [
  {
    brand_id: 'EB-001',
    project_id: 'p-000',
    equipment_name: '低压开关柜',
    brand_name: '施耐德',
    manufacturer: '施耐德电气（中国）有限公司',
  },
  {
    brand_id: 'EB-002',
    project_id: 'p-000',
    equipment_name: '配电箱',
    brand_name: '正泰',
    manufacturer: '正泰电器股份有限公司',
  },
  {
    brand_id: 'EB-003',
    project_id: 'p-000',
    equipment_name: '风机盘管',
    brand_name: '麦克维尔',
    manufacturer: '麦克维尔空调制冷（苏州）有限公司',
  },
  {
    brand_id: 'EB-004',
    project_id: 'p-001',
    equipment_name: '冷水机组',
    brand_name: '开利',
    manufacturer: '开利空调销售服务（上海）有限公司',
  },
]

const store = reactive({
  seq: 2,
  entries: [
    {
      entry_id: 'EE-001',
      project_id: 'p-000',
      sample_id: 'EQS-001',
      equipment_name: '低压开关柜',
      model: 'Blokset',
      use_part: '变配电所',
      brand_name: '施耐德',
      manufacturer: '施耐德电气（中国）有限公司',
      brand_match: true,
      quantity: 4,
      unit: '台',
      supplier: '施耐德授权经销商',
      serial_no: 'SN-BLK-202607',
      cert_file: '合格证-开关柜.pdf',
      inspect_file: '质检报告-开关柜.pdf',
      photo_file: '到场现场-开关柜.jpg',
      inspect_result_checked: true,
      inspect_result_file: '送检结果-开关柜.pdf',
      unpack_items: [
        { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
        { key: 'tools', label: '随机工具', fixed: true, ok: true, remark: '' },
        { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
        { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
      ],
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-王工',
      submit_time: '2026-07-14 09:30:00',
      finish_time: '2026-07-15 11:20:00',
      remark: '',
    },
    {
      entry_id: 'EE-002',
      project_id: 'p-000',
      sample_id: 'EQS-002',
      equipment_name: '配电箱',
      model: 'NXB',
      use_part: '商业区配电间',
      brand_name: '正泰',
      manufacturer: '正泰电器股份有限公司',
      brand_match: true,
      quantity: 12,
      unit: '台',
      supplier: '正泰项目供应部',
      serial_no: 'SN-NXB-0728',
      cert_file: '合格证-配电箱.pdf',
      inspect_file: '质检报告-配电箱.pdf',
      photo_file: '到场现场-配电箱.jpg',
      inspect_result_checked: false,
      inspect_result_file: '',
      unpack_items: [
        { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
        { key: 'tools', label: '随机工具', fixed: true, ok: false, remark: '缺扳手一套' },
        { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
        { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
      ],
      status: 'pending_supervisor',
      current_node: 'supervisor',
      applicant_name: '施工-李工',
      submit_time: '2026-07-28 10:15:00',
      finish_time: '',
      remark: '',
    },
  ],
  approvals: [
    {
      approval_id: 'AR-EE-1',
      entry_id: 'EE-001',
      node: 'supervisor',
      action: 'agree',
      opinion: '开箱齐全，同意进场',
      operator: '监理-周工',
      time: '2026-07-15 11:20:00',
    },
  ],
  approvalSeq: 1,
})

function syncPendingTodos() {
  store.entries
    .filter((e) => e.status === 'pending_supervisor')
    .forEach((e) => pushTodo(e))
}

function pushTodo(entry) {
  createEqEntrySupervisorTodo({
    entryId: entry.entry_id,
    projectId: entry.project_id,
    projectLabel: getProjectLabel(entry.project_id) || entry.project_id,
    equipmentName: entry.equipment_name,
    brandName: entry.brand_name,
    applicantName: entry.applicant_name,
    applyTime: entry.submit_time,
    quantity: `${entry.quantity}${entry.unit}`,
    sampleId: entry.sample_id || '无定样',
  })
}

syncPendingTodos()

export function listApprovedSamples(projectId) {
  return APPROVED_SAMPLES.filter((s) => s.project_id === projectId)
}

export function getApprovedSample(sampleId) {
  return APPROVED_SAMPLES.find((s) => s.sample_id === sampleId) || null
}

export function listApprovedBrands(projectId, { keyword = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return APPROVED_BRANDS.filter((b) => {
    if (b.project_id !== projectId) return false
    if (!kw) return true
    return (
      b.brand_name.toLowerCase().includes(kw) ||
      b.equipment_name.toLowerCase().includes(kw) ||
      b.manufacturer.toLowerCase().includes(kw)
    )
  })
}

export function listEntries(projectId, { keyword = '', status = '', brandMatch = '' } = {}) {
  let rows = store.entries.slice()
  if (projectId) rows = rows.filter((e) => e.project_id === projectId)
  if (status) rows = rows.filter((e) => e.status === status)
  if (brandMatch === '1') rows = rows.filter((e) => e.brand_match)
  if (brandMatch === '0') rows = rows.filter((e) => !e.brand_match)
  const kw = keyword.trim().toLowerCase()
  if (kw) {
    rows = rows.filter(
      (e) =>
        e.entry_id.toLowerCase().includes(kw) ||
        e.equipment_name.toLowerCase().includes(kw) ||
        e.brand_name.toLowerCase().includes(kw) ||
        (e.sample_id || '').toLowerCase().includes(kw) ||
        (e.model || '').toLowerCase().includes(kw) ||
        (e.supplier || '').toLowerCase().includes(kw),
    )
  }
  return rows.sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function listLedger(projectId, filters = {}) {
  return listEntries(projectId, filters)
}

export function getEntryDetail(entryId) {
  const entry = store.entries.find((e) => e.entry_id === entryId)
  if (!entry) return null
  const approvals = store.approvals
    .filter((a) => a.entry_id === entryId)
    .sort((a, b) => (a.time > b.time ? 1 : -1))
  return { ...entry, approvals, project_label: getProjectLabel(entry.project_id) }
}

export function getDashboard(projectId) {
  const rows = projectId ? store.entries.filter((e) => e.project_id === projectId) : store.entries
  const closed = rows.filter((e) => e.status === 'approved' || e.status === 'rejected')
  const matched = closed.filter((e) => e.brand_match).length
  const brand_match_rate = closed.length ? Math.round((matched / closed.length) * 100) : 0
  const mismatch_open = rows.filter(
    (e) => e.status === 'approved' && !e.brand_match && !(e.exited === true),
  )
  return {
    total_batches: rows.length,
    pending_count: rows.filter((e) => e.status === 'pending_supervisor').length,
    approved_count: rows.filter((e) => e.status === 'approved').length,
    exited_count: rows.filter((e) => e.exited === true).length,
    brand_match_rate,
    mismatch_open,
    allow_no_sample: projectId ? getNoSampleAllowed(projectId) : false,
  }
}

/** 指挥部看板：按项目汇总（设备本期无退场菜单，退场次数暂为 0） */
export function buildHqDashboardByProject() {
  return COC_PROJECT_OPTIONS.map((opt) => {
    const dash = getDashboard(opt.id)
    return {
      project_id: opt.id,
      project_name: opt.label,
      entry_count: dash.total_batches,
      exit_count: dash.exited_count,
      brand_match_rate: dash.brand_match_rate,
      mismatch_not_exited: dash.mismatch_open.length,
    }
  })
}

export function submitEntry(payload) {
  const project_id = payload.project_id
  if (!project_id) return { ok: false, msg: '请切换到具体项目' }
  if (!payload.equipment_name?.trim()) return { ok: false, msg: '请填写设备名称' }
  if (!payload.brand_name?.trim()) return { ok: false, msg: '请选择或带出品牌' }
  if (!payload.quantity || Number(payload.quantity) <= 0) return { ok: false, msg: '请填写有效数量' }
  if (!payload.unit?.trim()) return { ok: false, msg: '请填写单位' }
  if (!payload.supplier?.trim()) return { ok: false, msg: '请填写供应商' }
  if (!payload.cert_file) return { ok: false, msg: '请上传合格证' }
  if (!payload.inspect_file) return { ok: false, msg: '请上传质检报告' }
  if (!payload.photo_file) return { ok: false, msg: '请上传现场照片' }

  const unpack_items = Array.isArray(payload.unpack_items) ? payload.unpack_items : []
  if (!unpack_items.length) return { ok: false, msg: '请完成开箱清单' }
  const missingFixed = UNPACK_FIXED.some(
    (f) => !unpack_items.find((i) => i.key === f.key && i.ok !== undefined),
  )
  if (missingFixed) return { ok: false, msg: '开箱清单须包含系统写死四项' }

  const allowNo = getNoSampleAllowed(project_id)
  let sample_id = (payload.sample_id || '').trim()
  let brand_name = payload.brand_name.trim()
  let manufacturer = payload.manufacturer || ''
  let equipment_name = payload.equipment_name.trim()
  let use_part = payload.use_part || ''
  let model = payload.model || ''

  if (sample_id) {
    const sample = getApprovedSample(sample_id)
    if (!sample || sample.project_id !== project_id) {
      return { ok: false, msg: '定样不存在或不属于本项目' }
    }
    equipment_name = sample.equipment_name
    use_part = sample.use_part
    brand_name = sample.brand_name
    manufacturer = sample.manufacturer
    model = sample.model || model
  } else if (!allowNo) {
    return { ok: false, msg: '须关联已通过定样（或由指挥部开启无定样例外）' }
  } else {
    const brands = listApprovedBrands(project_id)
    const hit = brands.find((b) => b.brand_name === brand_name)
    if (!hit) return { ok: false, msg: '无定样时须选择本项目报审通过入选品牌' }
    manufacturer = hit.manufacturer
  }

  const brand_match = listApprovedBrands(project_id).some((b) => b.brand_name === brand_name)

  store.seq += 1
  const entry_id = `EE-${String(store.seq).padStart(3, '0')}`
  const submit_time = timestamp()
  const entry = {
    entry_id,
    project_id,
    sample_id,
    equipment_name,
    model,
    use_part,
    brand_name,
    manufacturer,
    brand_match,
    quantity: Number(payload.quantity),
    unit: payload.unit.trim(),
    supplier: payload.supplier.trim(),
    serial_no: payload.serial_no || '',
    cert_file: payload.cert_file,
    inspect_file: payload.inspect_file,
    photo_file: payload.photo_file,
    inspect_result_checked: !!payload.inspect_result_checked,
    inspect_result_file: payload.inspect_result_checked ? payload.inspect_result_file || '' : '',
    unpack_items: unpack_items.map((i) => ({
      key: i.key,
      label: i.label,
      fixed: !!i.fixed,
      ok: !!i.ok,
      remark: i.remark || '',
    })),
    status: 'pending_supervisor',
    current_node: 'supervisor',
    applicant_name: payload.applicant_name || '当前用户',
    submit_time,
    finish_time: '',
    remark: '',
  }
  store.entries.unshift(entry)
  pushTodo(entry)
  return { ok: true, data: entry }
}

export function withdrawEntry(entryId) {
  const entry = store.entries.find((e) => e.entry_id === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (entry.status !== 'pending_supervisor') return { ok: false, msg: '仅待监理审可撤回' }
  entry.status = 'withdrawn'
  entry.current_node = 'none'
  discardEqEntryTodos(entryId)
  return { ok: true }
}

export function resubmitEntry(entryId) {
  const entry = store.entries.find((e) => e.entry_id === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (entry.status !== 'rejected' && entry.status !== 'withdrawn') {
    return { ok: false, msg: '仅已驳回或已撤回可重提' }
  }
  entry.status = 'pending_supervisor'
  entry.current_node = 'supervisor'
  entry.submit_time = timestamp()
  entry.finish_time = ''
  pushTodo(entry)
  return { ok: true }
}

export function supervisorApproveEntry(entryId, { action, opinion } = {}) {
  const entry = store.entries.find((e) => e.entry_id === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (entry.status !== 'pending_supervisor') return { ok: false, msg: '当前不可审批' }
  if (action !== 'agree' && action !== 'reject') return { ok: false, msg: '无效操作' }
  if (action === 'reject' && !String(opinion || '').trim()) {
    return { ok: false, msg: '退回意见必填' }
  }
  store.approvalSeq += 1
  const time = timestamp()
  store.approvals.push({
    approval_id: `AR-EE-${store.approvalSeq}`,
    entry_id: entryId,
    node: 'supervisor',
    action,
    opinion: String(opinion || '').trim(),
    operator: '当前用户',
    time,
  })
  if (action === 'agree') {
    entry.status = 'approved'
    entry.current_node = 'none'
    entry.finish_time = time
  } else {
    entry.status = 'rejected'
    entry.current_node = 'none'
    entry.finish_time = time
  }
  return { ok: true }
}

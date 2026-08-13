/**
 * 材料进场管理 Mock — 对齐 prd-mat-v1
 * 审批入口：个人中心待办（仅监理）
 */
import { reactive } from 'vue'
import { getProjectLabel } from './laborRealName.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { createMatEntrySupervisorTodo, discardMatEntryTodos } from './personalCenter.js'

export const STATUS_LABEL = {
  pending_review: '待审核',
  reviewing: '审核中',
  approved: '已通过',
  rejected: '已驳回',
}

export const NODE_LABEL = {
  supervisor: '审核中',
  none: '无',
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending_review') return 'info'
  return 'warning'
}

/** 可审批（个人中心待办） */
export function isReviewingStatus(status) {
  return status === 'reviewing'
}

function timestamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

/** Demo：已通过定样（含品牌，供进场引用） */
const APPROVED_SAMPLES = [
  {
    sample_id: 'MS-001',
    project_id: 'p-000',
    material_name: '外墙真石漆',
    use_part: 'T3 航站楼外立面',
    brand_name: '亚士漆',
    manufacturer: '亚士创能科技（上海）股份有限公司',
    brand_approved: true,
  },
  {
    sample_id: 'MS-101',
    project_id: 'p-000',
    material_name: '防水卷材',
    use_part: '屋面防水层',
    brand_name: '东方雨虹',
    manufacturer: '北京东方雨虹防水技术股份有限公司',
    brand_approved: true,
  },
  {
    sample_id: 'MS-102',
    project_id: 'p-001',
    material_name: '镀锌钢管',
    use_part: '给排水干管',
    brand_name: '友发',
    manufacturer: '天津友发钢管集团股份有限公司',
    brand_approved: true,
  },
  {
    sample_id: 'MS-103',
    project_id: 'p-000',
    material_name: '钢筋',
    use_part: '主体结构',
    brand_name: '宝钢',
    manufacturer: '宝山钢铁股份有限公司',
    brand_approved: true,
  },
]

/** Demo：报审通过入选品牌（进场品牌校验） */
const APPROVED_BRANDS = [
  {
    brand_id: 'B-001',
    project_id: 'p-000',
    material_name: '外墙真石漆',
    brand_name: '亚士漆',
    manufacturer: '亚士创能科技（上海）股份有限公司',
  },
  {
    brand_id: 'B-002',
    project_id: 'p-000',
    material_name: '防水卷材',
    brand_name: '东方雨虹',
    manufacturer: '北京东方雨虹防水技术股份有限公司',
  },
  {
    brand_id: 'B-003',
    project_id: 'p-000',
    material_name: '钢筋',
    brand_name: '宝钢',
    manufacturer: '宝山钢铁股份有限公司',
  },
  {
    brand_id: 'B-004',
    project_id: 'p-001',
    material_name: '镀锌钢管',
    brand_name: '友发',
    manufacturer: '天津友发钢管集团股份有限公司',
  },
]

const store = reactive({
  seq: 4,
  /** 项目级无定样例外开关（材料与设备共用） */
  noSampleSwitch: {
    'p-000': false,
    'p-001': false,
  },
  entries: [
    {
      entry_id: 'ME-001',
      project_id: 'p-000',
      sample_id: 'MS-001',
      material_name: '外墙真石漆',
      use_part: 'T3 航站楼外立面',
      brand_name: '亚士漆',
      manufacturer: '亚士创能科技（上海）股份有限公司',
      brand_match: true,
      quantity: 200,
      unit: '桶',
      supplier: '华东建材供应站',
      batch_no: 'BATCH-20260701',
      material_spec: '砂壁状真石漆 A12',
      waybill_no: 'YD-20260701-01',
      line_items: [
        {
          material_name: '外墙真石漆',
          material_spec: '砂壁状真石漆 A12',
          quantity: 200,
          unit: '桶',
          waybill_no: 'YD-20260701-01',
          batch_no: 'BATCH-20260701',
        },
      ],
      cert_file: '合格证-真石漆.pdf',
      inspect_file: '质检报告-真石漆.pdf',
      photo_file: '进场现场-1.jpg',
      inspect_result_checked: true,
      inspect_result_file: '送检结果-真石漆.pdf',
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-王工',
      submit_time: '2026-07-15 10:20:00',
      finish_time: '2026-07-16 09:10:00',
      exited: true,
      remark: '',
    },
    {
      entry_id: 'ME-002',
      project_id: 'p-000',
      sample_id: 'MS-101',
      material_name: '防水卷材',
      use_part: '屋面防水层',
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      brand_match: true,
      quantity: 500,
      unit: '卷',
      supplier: '雨虹授权经销商',
      batch_no: 'BATCH-20260720',
      cert_file: '合格证-卷材.pdf',
      inspect_file: '质检报告-卷材.pdf',
      photo_file: '进场现场-卷材.jpg',
      inspect_result_checked: false,
      inspect_result_file: '',
      status: 'reviewing',
      current_node: 'supervisor',
      applicant_name: '施工-李工',
      submit_time: '2026-07-27 14:30:00',
      finish_time: '',
      exited: false,
      remark: '',
    },
    {
      entry_id: 'ME-003',
      project_id: 'p-000',
      sample_id: 'MS-103',
      material_name: '钢筋',
      use_part: '主体结构',
      brand_name: '杂牌钢',
      manufacturer: '未知厂家',
      brand_match: false,
      quantity: 30,
      unit: '吨',
      supplier: '临时供应商',
      batch_no: 'BATCH-MISMATCH',
      cert_file: '合格证-钢筋.pdf',
      inspect_file: '质检报告-钢筋.pdf',
      photo_file: '进场-钢筋.jpg',
      inspect_result_checked: false,
      inspect_result_file: '',
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-赵工',
      submit_time: '2026-07-18 11:00:00',
      finish_time: '2026-07-18 16:00:00',
      exited: false,
      remark: '演示：品牌不一致且未退场',
    },
    {
      entry_id: 'ME-004',
      project_id: 'p-000',
      sample_id: 'MS-101',
      material_name: '防水卷材',
      use_part: '屋面防水层',
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      brand_match: true,
      quantity: 80,
      unit: '卷',
      supplier: '雨虹授权经销商',
      batch_no: 'BATCH-REJECT-01',
      material_spec: 'SBS 改性沥青防水卷材 3mm',
      waybill_no: 'YD-REJECT-01',
      line_items: [
        {
          material_name: '防水卷材',
          material_spec: 'SBS 改性沥青防水卷材 3mm',
          quantity: 80,
          unit: '卷',
          waybill_no: 'YD-REJECT-01',
          batch_no: 'BATCH-REJECT-01',
        },
      ],
      cert_file: '合格证-卷材-驳回.pdf',
      inspect_file: '质检报告-卷材-驳回.pdf',
      photo_file: '进场-卷材-驳回.jpg',
      inspect_result_checked: false,
      inspect_result_file: '',
      status: 'rejected',
      current_node: 'none',
      applicant_name: '施工-李工',
      submit_time: '2026-07-22 09:00:00',
      finish_time: '2026-07-22 16:30:00',
      exited: false,
      remark: '演示：已驳回闭环，可重开申请',
    },
  ],
  approvals: [
    {
      approval_id: 'AR-ME-1',
      entry_id: 'ME-001',
      node: 'supervisor',
      action: 'agree',
      opinion: '资料齐全，同意进场',
      operator: '监理-周工',
      time: '2026-07-16 09:10:00',
    },
    {
      approval_id: 'AR-ME-2',
      entry_id: 'ME-003',
      node: 'supervisor',
      action: 'agree',
      opinion: '先放行，后续跟踪退场',
      operator: '监理-周工',
      time: '2026-07-18 16:00:00',
    },
    {
      approval_id: 'AR-ME-3',
      entry_id: 'ME-004',
      node: 'supervisor',
      action: 'reject',
      opinion: '质检报告过期，请更换后重开申请',
      operator: '监理-周工',
      time: '2026-07-22 16:30:00',
    },
  ],
  exits: [
    {
      exit_id: 'EX-ME-001',
      entry_id: 'ME-001',
      exit_qty: 50,
      reason: '色差超标，退回供应商更换',
      photo_file: '退场现场-真石漆.jpg',
      exit_time: '2026-07-20 15:30:00',
      operator: '施工-王工',
    },
  ],
  approvalSeq: 3,
})

function syncPendingTodos() {
  store.entries
    .filter((e) => isReviewingStatus(e.status))
    .forEach((e) => {
      createMatEntrySupervisorTodo({
        entryId: e.entry_id,
        projectId: e.project_id,
        projectLabel: getProjectLabel(e.project_id) || e.project_id,
        materialName: e.material_name,
        brandName: e.brand_name,
        applicantName: e.applicant_name,
        applyTime: e.submit_time,
        quantity: `${e.quantity}${e.unit}`,
        sampleId: e.sample_id || '',
      })
    })
}

syncPendingTodos()

export function getNoSampleAllowed(projectId) {
  return !!store.noSampleSwitch[projectId]
}

export function setNoSampleAllowed(projectId, allowed) {
  if (!projectId) return { ok: false, msg: '缺少项目' }
  store.noSampleSwitch[projectId] = !!allowed
  return { ok: true }
}

/** 指挥部：全量项目无定样例外开关列表（材料/设备进场共用） */
export function listNoSampleSwitchByProject() {
  return COC_PROJECT_OPTIONS.map((opt) => ({
    project_id: opt.id,
    project_name: opt.label,
    allow_no_sample: getNoSampleAllowed(opt.id),
  }))
}

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
      b.material_name.toLowerCase().includes(kw) ||
      b.manufacturer.toLowerCase().includes(kw)
    )
  })
}

export function listEntries(projectId, { keyword = '', status = '', brandMatch = '', exited = '' } = {}) {
  let rows = store.entries.slice()
  if (projectId) rows = rows.filter((e) => e.project_id === projectId)
  if (status) rows = rows.filter((e) => e.status === status)
  if (brandMatch === '1') rows = rows.filter((e) => e.brand_match)
  if (brandMatch === '0') rows = rows.filter((e) => !e.brand_match)
  if (exited === '1') rows = rows.filter((e) => e.exited)
  if (exited === '0') rows = rows.filter((e) => !e.exited)
  const kw = keyword.trim().toLowerCase()
  if (kw) {
    rows = rows.filter((e) => {
      const lineText = (Array.isArray(e.line_items) ? e.line_items : [])
        .map((l) => `${l.material_spec || ''}${l.waybill_no || ''}${l.batch_no || ''}`)
        .join('')
      return (
        e.entry_id.toLowerCase().includes(kw) ||
        e.material_name.toLowerCase().includes(kw) ||
        e.brand_name.toLowerCase().includes(kw) ||
        (e.sample_id || '').toLowerCase().includes(kw) ||
        (e.supplier || '').toLowerCase().includes(kw) ||
        (e.manufacturer || '').toLowerCase().includes(kw) ||
        (e.use_part || '').toLowerCase().includes(kw) ||
        (e.material_spec || '').toLowerCase().includes(kw) ||
        (e.waybill_no || '').toLowerCase().includes(kw) ||
        lineText.toLowerCase().includes(kw) ||
        (e.exit_reason || '').toLowerCase().includes(kw)
      )
    })
  }
  return rows
    .map((e) => {
      const exit = store.exits.find((x) => x.entry_id === e.entry_id) || null
      return {
        ...e,
        exit,
        exit_qty: exit?.exit_qty ?? e.exit_qty ?? null,
        exit_time: exit?.exit_time ?? e.exit_time ?? '',
        exit_reason: exit?.reason ?? e.exit_reason ?? '',
        exit_operator: exit?.operator ?? e.exit_operator ?? '',
        exit_photo: exit?.photo_file ?? e.exit_photo ?? '',
        exit_id: exit?.exit_id ?? e.exit_id ?? '',
      }
    })
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
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
  const exit = store.exits.find((x) => x.entry_id === entryId) || null
  return { ...entry, approvals, exit, project_label: getProjectLabel(entry.project_id) }
}

export function getDashboard(projectId) {
  const rows = projectId ? store.entries.filter((e) => e.project_id === projectId) : store.entries
  const closed = rows.filter((e) => e.status === 'approved' || e.status === 'rejected')
  const matched = closed.filter((e) => e.brand_match).length
  const brand_match_rate = closed.length ? Math.round((matched / closed.length) * 100) : 0
  const mismatch_open = rows.filter(
    (e) => e.status === 'approved' && !e.brand_match && !e.exited,
  )
  return {
    total_batches: rows.length,
    pending_count: rows.filter((e) => e.status === 'reviewing' || e.status === 'pending_review')
      .length,
    approved_count: rows.filter((e) => e.status === 'approved').length,
    exited_count: rows.filter((e) => e.exited).length,
    brand_match_rate,
    mismatch_open,
    allow_no_sample: projectId ? getNoSampleAllowed(projectId) : false,
  }
}

/**
 * 指挥部看板：按项目汇总
 * - 进场登记次数：该项目全部进场单
 * - 退场登记次数：已退场进场单数
 * - 品牌一致率：已审结单中品牌一致占比
 * - 品牌不一致未退场：已通过且品牌不一致且未退场数量
 */
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

function pushTodo(entry) {
  createMatEntrySupervisorTodo({
    entryId: entry.entry_id,
    projectId: entry.project_id,
    projectLabel: getProjectLabel(entry.project_id) || entry.project_id,
    materialName: entry.material_name,
    brandName: entry.brand_name,
    applicantName: entry.applicant_name,
    applyTime: entry.submit_time,
    quantity: `${entry.quantity}${entry.unit}`,
    sampleId: entry.sample_id || '',
  })
}

export function submitEntry(payload) {
  const project_id = payload.project_id
  if (!project_id) return { ok: false, msg: '请切换到具体项目' }
  if (!payload.sample_id?.trim()) return { ok: false, msg: '请关联已通过定样' }
  if (!String(payload.supplier || '').trim()) return { ok: false, msg: '请填写供应商' }
  if (!payload.cert_file) return { ok: false, msg: '请上传合格证' }
  if (!payload.inspect_file) return { ok: false, msg: '请上传质检报告' }
  if (!payload.photo_file) return { ok: false, msg: '请上传现场照片' }

  let line_items = Array.isArray(payload.line_items) ? payload.line_items : []
  if (!line_items.length && payload.quantity != null) {
    line_items = [
      {
        material_name: payload.material_name,
        material_spec: payload.material_spec || '',
        quantity: payload.quantity,
        unit: payload.unit,
        waybill_no: payload.waybill_no || '',
        batch_no: payload.batch_no || '',
      },
    ]
  }
  if (!line_items.length) return { ok: false, msg: '请至少填写一条进场明细' }

  const normalizedLines = []
  for (let i = 0; i < line_items.length; i += 1) {
    const row = line_items[i] || {}
    const material_name = String(row.material_name || payload.material_name || '').trim()
    const material_spec = String(row.material_spec || '').trim()
    const quantity = Number(row.quantity)
    const unit = String(row.unit || '').trim()
    if (!material_name) return { ok: false, msg: `进场明细第 ${i + 1} 条材料名称不能为空` }
    if (!material_spec) return { ok: false, msg: `进场明细第 ${i + 1} 条请填写材料规格` }
    if (!quantity || quantity <= 0) return { ok: false, msg: `进场明细第 ${i + 1} 条请填写有效数量` }
    if (!unit) return { ok: false, msg: `进场明细第 ${i + 1} 条请填写单位` }
    normalizedLines.push({
      material_name,
      material_spec,
      quantity,
      unit,
      waybill_no: String(row.waybill_no || '').trim(),
      batch_no: String(row.batch_no || '').trim(),
    })
  }

  const related_reject_id = String(payload.related_reject_id || '').trim()
  if (related_reject_id) {
    const origin = store.entries.find((e) => e.entry_id === related_reject_id)
    if (!origin) return { ok: false, msg: '关联驳回原单不存在' }
    if (origin.status !== 'rejected') return { ok: false, msg: '仅可关联已驳回原单重开' }
    if (origin.project_id !== project_id) return { ok: false, msg: '关联原单不属于本项目' }
  }

  const sample_id = (payload.sample_id || '').trim()
  if (!sample_id) return { ok: false, msg: '请关联已通过定样' }
  const sample = getApprovedSample(sample_id)
  if (!sample || sample.project_id !== project_id) {
    return { ok: false, msg: '定样不存在或不属于本项目' }
  }
  let brand_name = sample.brand_name
  let manufacturer = sample.manufacturer
  let material_name = sample.material_name
  let use_part = sample.use_part
  let location_ids = Array.isArray(sample.location_ids)
    ? [...sample.location_ids]
    : sample.location_id
      ? [sample.location_id]
      : Array.isArray(payload.location_ids)
        ? payload.location_ids.map(String).filter(Boolean)
        : []
  if (payload.location_id && !location_ids.length) location_ids = [String(payload.location_id)]
  normalizedLines.forEach((line) => {
    line.material_name = material_name
  })

  const brand_match = listApprovedBrands(project_id).some((b) => b.brand_name === brand_name)
  const first = normalizedLines[0]
  const sameUnit = normalizedLines.every((l) => l.unit === first.unit)
  const totalQty = normalizedLines.reduce((sum, l) => sum + Number(l.quantity || 0), 0)

  store.seq += 1
  const entry_id = `ME-${String(store.seq).padStart(3, '0')}`
  const submit_time = timestamp()
  const entry = {
    entry_id,
    project_id,
    sample_id,
    material_name,
    use_part,
    location_id: location_ids[0] || '',
    location_ids,
    brand_name,
    manufacturer,
    brand_match,
    line_items: normalizedLines,
    quantity: sameUnit ? totalQty : first.quantity,
    unit: first.unit,
    supplier: String(payload.supplier || '').trim(),
    batch_no: first.batch_no || '',
    waybill_no: first.waybill_no || '',
    material_spec: first.material_spec || '',
    cert_file: payload.cert_file,
    inspect_file: payload.inspect_file,
    photo_file: payload.photo_file,
    inspect_result_checked: !!payload.inspect_result_checked,
    inspect_result_file: payload.inspect_result_checked ? payload.inspect_result_file || '' : '',
    status: 'reviewing',
    current_node: 'supervisor',
    applicant_name: payload.applicant_name || '当前用户',
    submit_time,
    finish_time: '',
    exited: false,
    remark: '',
    related_reject_id,
  }
  store.entries.unshift(entry)
  pushTodo(entry)
  return { ok: true, data: entry }
}

export function withdrawEntry(entryId) {
  const entry = store.entries.find((e) => e.entry_id === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (entry.status !== 'reviewing' && entry.status !== 'pending_review') {
    return { ok: false, msg: '仅待审核/审核中可撤回' }
  }
  entry.status = 'rejected'
  entry.current_node = 'none'
  entry.finish_time = timestamp()
  discardMatEntryTodos(entryId)
  return { ok: true }
}

/** 驳回闭环后重开：校验原单，由新建页提交新单并带 related_reject_id */
export function getRejectedEntryForReopen(entryId) {
  const entry = store.entries.find((e) => e.entry_id === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (entry.status !== 'rejected') return { ok: false, msg: '仅已驳回单据可重开申请' }
  return { ok: true, data: entry }
}

export function resubmitEntry(entryId) {
  return getRejectedEntryForReopen(entryId)
}

export function supervisorApproveEntry(entryId, { action, opinion } = {}) {
  const entry = store.entries.find((e) => e.entry_id === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (!isReviewingStatus(entry.status)) return { ok: false, msg: '当前不可审批' }
  if (action !== 'agree' && action !== 'reject') return { ok: false, msg: '无效操作' }
  if (action === 'reject' && !String(opinion || '').trim()) {
    return { ok: false, msg: '退回意见必填' }
  }
  store.approvalSeq += 1
  const time = timestamp()
  store.approvals.push({
    approval_id: `AR-ME-${store.approvalSeq}`,
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

export function listExitableEntries(projectId) {
  return store.entries.filter(
    (e) => e.project_id === projectId && e.status === 'approved' && !e.exited,
  )
}

export function listExits(projectId, { keyword = '' } = {}) {
  const kw = String(keyword || '').trim().toLowerCase()
  let rows = store.exits
    .filter((x) => {
      const e = store.entries.find((row) => row.entry_id === x.entry_id)
      return e && e.project_id === projectId
    })
    .map((x) => {
      const e = store.entries.find((row) => row.entry_id === x.entry_id)
      return {
        ...x,
        material_name: e?.material_name || '',
        brand_name: e?.brand_name || '',
        supplier: e?.supplier || '',
        manufacturer: e?.manufacturer || '',
        use_part: e?.use_part || '',
        unit: e?.unit || '',
        quantity: e?.quantity ?? null,
        sample_id: e?.sample_id || '',
      }
    })
  if (kw) {
    rows = rows.filter(
      (x) =>
        x.exit_id.toLowerCase().includes(kw) ||
        x.entry_id.toLowerCase().includes(kw) ||
        (x.material_name || '').toLowerCase().includes(kw) ||
        (x.brand_name || '').toLowerCase().includes(kw) ||
        (x.supplier || '').toLowerCase().includes(kw) ||
        (x.reason || '').toLowerCase().includes(kw),
    )
  }
  return rows.sort((a, b) => (a.exit_time < b.exit_time ? 1 : -1))
}

export function getExitDetail(exitId) {
  const x = store.exits.find((row) => row.exit_id === exitId)
  if (!x) return null
  const e = store.entries.find((row) => row.entry_id === x.entry_id)
  if (!e) return { ...x }
  return {
    ...x,
    material_name: e.material_name,
    brand_name: e.brand_name,
    supplier: e.supplier,
    manufacturer: e.manufacturer || '',
    use_part: e.use_part || '',
    unit: e.unit,
    quantity: e.quantity,
    sample_id: e.sample_id || '',
    material_spec: e.material_spec || '',
  }
}

export function registerExit(payload) {
  const entry = store.entries.find((e) => e.entry_id === payload.entry_id)
  if (!entry) return { ok: false, msg: '进场单不存在' }
  if (entry.status !== 'approved') return { ok: false, msg: '仅已通过进场单可退场' }
  if (entry.exited) return { ok: false, msg: '该进场单已退场' }
  if (!payload.reason?.trim()) return { ok: false, msg: '请填写退场原因' }
  const exit_qty = Number(payload.exit_qty)
  if (!exit_qty || exit_qty <= 0) return { ok: false, msg: '请填写有效退场数量' }
  if (exit_qty > entry.quantity) return { ok: false, msg: '退场数量不可大于进场数量' }

  const row = {
    exit_id: `EX-${entry.entry_id}`,
    entry_id: entry.entry_id,
    exit_qty,
    reason: payload.reason.trim(),
    photo_file: payload.photo_file || '',
    exit_time: timestamp(),
    operator: payload.operator || '当前用户',
  }
  store.exits.unshift(row)
  entry.exited = true
  entry.exit_id = row.exit_id
  entry.exit_qty = row.exit_qty
  entry.exit_time = row.exit_time
  entry.exit_reason = row.reason
  entry.exit_operator = row.operator
  entry.exit_photo = row.photo_file
  return { ok: true, data: row }
}

/** 验评可选：已通过且未退场；支持施工部位 / 关键词筛选 */
export function listSelectableForInspect(
  projectId,
  { keyword = '', usePart = '', locationId = '' } = {},
) {
  const kw = String(keyword || '').trim().toLowerCase()
  const part = String(usePart || '').trim().toLowerCase()
  const locId = String(locationId || '').trim()
  return store.entries
    .filter((e) => e.project_id === projectId && e.status === 'approved' && !e.exited)
    .filter((e) => {
      if (locId || part) {
        const ids = Array.isArray(e.location_ids) ? e.location_ids.map(String) : []
        if (e.location_id) ids.push(String(e.location_id))
        const idHit = locId ? ids.includes(locId) : false
        const partHit = part
          ? (e.use_part || '').toLowerCase().includes(part) ||
            part.includes((e.use_part || '').toLowerCase())
          : false
        if (!idHit && !partHit) return false
      }
      if (!kw) return true
      return (
        e.entry_id.toLowerCase().includes(kw) ||
        (e.material_name || '').toLowerCase().includes(kw) ||
        (e.brand_name || '').toLowerCase().includes(kw) ||
        (e.supplier || '').toLowerCase().includes(kw) ||
        (e.batch_no || '').toLowerCase().includes(kw) ||
        (e.use_part || '').toLowerCase().includes(kw)
      )
    })
    .map((e) => ({
      source: 'mat',
      source_label: '材料',
      material_id: e.entry_id,
      material_name: e.material_name,
      batch_no: e.batch_no || e.waybill_no || '',
      supplier: e.supplier || '',
      brand_name: e.brand_name || '',
      use_part: e.use_part || '',
      location_id: e.location_id || '',
      location_ids: Array.isArray(e.location_ids) ? [...e.location_ids] : [],
      quantity_text: `${e.quantity ?? ''}${e.unit || ''}`,
    }))
}

/**
 * 品牌报审 Mock — 对齐 research-brand；审批入口为个人中心待办
 */
import { reactive } from 'vue'
import { getProjectLabel } from './laborRealName.js'
import {
  createBrandPmTodo,
  createBrandSupervisorTodo,
  discardBrandTodos,
} from './personalCenter.js'

export const MATERIAL_TYPE = { material: '材料', equipment: '设备' }
export const STATUS_LABEL = {
  in_approval: '审批中',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
}
export const NODE_LABEL = {
  supervisor: '待监理审',
  pm: '待项目经理审',
  none: '无',
}
export const ATTACH_TYPE = {
  contract_clause: '合同文件对材料品牌的相关约定',
  vendor_profile: '生产厂商/供应商资料',
  manual_warranty: '说明书或质保材料',
  sample_photo: '材料样品照片',
  other: '其他附件资料',
}

export const ATTACH_TYPE_KEYS = Object.keys(ATTACH_TYPE)

/** 新建备选时的附件勾选槽位（自行勾选后上传） */
export function createEmptyAttachSlots() {
  return ATTACH_TYPE_KEYS.map((attach_type) => ({
    attach_type,
    is_checked: false,
    file_name: '',
    file_url: '',
  }))
}

export function createEmptyCandidate() {
  return {
    brand_lib_id: '',
    brand_name: '',
    manufacturer: '',
    remark: '',
    attachSlots: createEmptyAttachSlots(),
  }
}
export const SOURCE_TYPE = {
  hq_manual: '指挥部新增',
  project_approval: '项目报审通过',
}

const store = reactive({
  materials: [
    {
      material_id: 'M-001',
      material_name: '混凝土',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-002',
      material_name: '钢筋',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-003',
      material_name: '电缆',
      material_type: 'equipment',
      status: 'inactive',
      remark: '停用示例',
    },
    // 以下启用材料用于「从材料库导入」分页演示
    {
      material_id: 'M-004',
      material_name: '防水卷材',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-005',
      material_name: '开关柜',
      material_type: 'equipment',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-006',
      material_name: '水泥',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-007',
      material_name: '砂石',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-008',
      material_name: '模板',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-009',
      material_name: '配电箱',
      material_type: 'equipment',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-010',
      material_name: '给水管',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-011',
      material_name: '防火涂料',
      material_type: 'material',
      status: 'active',
      remark: '',
    },
    {
      material_id: 'M-012',
      material_name: '变压器',
      material_type: 'equipment',
      status: 'active',
      remark: '',
    },
  ],
  specs: [
    { spec_id: 'S-001', material_id: 'M-001', spec_model: 'C30' },
    { spec_id: 'S-002', material_id: 'M-001', spec_model: 'C40' },
    { spec_id: 'S-003', material_id: 'M-002', spec_model: 'Φ12' },
    { spec_id: 'S-004', material_id: 'M-002', spec_model: 'Φ16' },
    { spec_id: 'S-005', material_id: 'M-004', spec_model: 'SBS-3mm' },
    { spec_id: 'S-006', material_id: 'M-005', spec_model: '10kV' },
    { spec_id: 'S-007', material_id: 'M-006', spec_model: 'P.O42.5' },
    { spec_id: 'S-008', material_id: 'M-007', spec_model: '中砂' },
    { spec_id: 'S-009', material_id: 'M-008', spec_model: '木模' },
    { spec_id: 'S-010', material_id: 'M-009', spec_model: 'XL-21' },
    { spec_id: 'S-011', material_id: 'M-010', spec_model: 'DN100' },
    { spec_id: 'S-012', material_id: 'M-011', spec_model: '薄型' },
    { spec_id: 'S-013', material_id: 'M-012', spec_model: '1000kVA' },
  ],
  brands: [
    {
      brand_lib_id: 'B-001',
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      source_type: 'hq_manual',
      application_id: '',
      status: 'active',
    },
    // 同一生产厂家可对应多个品牌（厂家≠品牌唯一键）
    {
      brand_lib_id: 'B-004',
      brand_name: '海螺新材',
      manufacturer: '安徽海螺水泥股份有限公司',
      source_type: 'hq_manual',
      application_id: '',
      status: 'active',
    },
    {
      brand_lib_id: 'B-002',
      brand_name: '华润',
      manufacturer: '华润水泥控股有限公司',
      source_type: 'hq_manual',
      application_id: '',
      status: 'active',
    },
    {
      brand_lib_id: 'B-003',
      brand_name: '正泰',
      manufacturer: '正泰电气股份有限公司',
      source_type: 'hq_manual',
      application_id: '',
      status: 'inactive',
    },
  ],
  /**
   * 品牌库 ↔ 材料 ↔ 规格
   * 列表粒度：一条数据 = 一个品牌 + 一个材料 + 多个规格
   * 同一品牌可有多条数据（不同材料各一行）
   */
  brandSpecs: [
    {
      brand_lib_spec_id: 'BS-001',
      brand_lib_id: 'B-001',
      material_id: 'M-001',
      material_spec_id: 'S-001',
    },
    {
      brand_lib_spec_id: 'BS-002',
      brand_lib_id: 'B-001',
      material_id: 'M-001',
      material_spec_id: 'S-002',
    },
    {
      brand_lib_spec_id: 'BS-003',
      brand_lib_id: 'B-001',
      material_id: 'M-002',
      material_spec_id: 'S-003',
    },
    {
      brand_lib_spec_id: 'BS-004',
      brand_lib_id: 'B-001',
      material_id: 'M-002',
      material_spec_id: 'S-004',
    },
    {
      brand_lib_spec_id: 'BS-005',
      brand_lib_id: 'B-002',
      material_id: 'M-001',
      material_spec_id: 'S-001',
    },
    {
      brand_lib_spec_id: 'BS-006',
      brand_lib_id: 'B-004',
      material_id: 'M-001',
      material_spec_id: 'S-002',
    },
  ],
  applications: [
    {
      application_id: 'PP-2026-001',
      project_id: 'p-000',
      material_id: 'M-001',
      material_name: '混凝土',
      material_type: 'material',
      use_part: '主体结构',
      status: 'approved',
      current_node: 'none',
      applicant_user_id: 'u-contractor',
      applicant_name: '张工',
      submit_time: '2026-07-10 09:20:00',
      finish_time: '2026-07-12 16:00:00',
      remark: '',
    },
    {
      application_id: 'PP-2026-002',
      project_id: 'p-000',
      material_id: '',
      material_name: '防水卷材',
      material_type: 'material',
      use_part: '屋面',
      status: 'in_approval',
      current_node: 'supervisor',
      applicant_user_id: 'u-contractor',
      applicant_name: '张工',
      submit_time: '2026-07-20 11:00:00',
      finish_time: '',
      remark: '',
    },
    {
      application_id: 'PP-2026-003',
      project_id: 'p-000',
      material_id: 'M-002',
      material_name: '钢筋',
      material_type: 'material',
      use_part: '梁板',
      status: 'in_approval',
      current_node: 'pm',
      applicant_user_id: 'u-contractor',
      applicant_name: '张工',
      submit_time: '2026-07-18 14:30:00',
      finish_time: '',
      remark: '',
    },
    {
      application_id: 'PP-2026-004',
      project_id: 'p-001',
      material_id: '',
      material_name: '开关柜',
      material_type: 'equipment',
      use_part: '配电房',
      status: 'rejected',
      current_node: 'none',
      applicant_user_id: 'u-contractor',
      applicant_name: '李工',
      submit_time: '2026-07-15 10:00:00',
      finish_time: '2026-07-16 09:00:00',
      remark: '',
    },
    {
      application_id: 'PP-2026-005',
      project_id: 'p-011',
      material_id: 'M-001',
      material_name: '混凝土',
      material_type: 'material',
      use_part: '桩基',
      status: 'approved',
      current_node: 'none',
      applicant_user_id: 'u-contractor',
      applicant_name: '王工',
      submit_time: '2026-07-08 08:30:00',
      finish_time: '2026-07-09 17:20:00',
      remark: '重点项目示例数据',
    },
  ],
  appSpecs: [
    { app_spec_id: 'AS-001', application_id: 'PP-2026-001', spec_model: 'C30', material_spec_id: 'S-001', seq_no: 1 },
    { app_spec_id: 'AS-002', application_id: 'PP-2026-002', spec_model: 'SBS-3mm', material_spec_id: '', seq_no: 1 },
    { app_spec_id: 'AS-003', application_id: 'PP-2026-003', spec_model: 'Φ12', material_spec_id: 'S-003', seq_no: 1 },
    { app_spec_id: 'AS-004', application_id: 'PP-2026-003', spec_model: 'Φ16', material_spec_id: 'S-004', seq_no: 2 },
    { app_spec_id: 'AS-005', application_id: 'PP-2026-004', spec_model: '10kV', material_spec_id: '', seq_no: 1 },
    { app_spec_id: 'AS-006', application_id: 'PP-2026-005', spec_model: 'C35', material_spec_id: 'S-001', seq_no: 1 },
  ],
  candidates: [
    {
      candidate_id: 'C-001',
      application_id: 'PP-2026-001',
      brand_lib_id: 'B-001',
      seq_no: 1,
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      remark: '市场占有率高，供货稳定',
      is_selected: true,
    },
    {
      candidate_id: 'C-002',
      application_id: 'PP-2026-001',
      brand_lib_id: 'B-002',
      seq_no: 2,
      brand_name: '华润',
      manufacturer: '华润水泥控股有限公司',
      remark: '',
      is_selected: false,
    },
    {
      candidate_id: 'C-003',
      application_id: 'PP-2026-001',
      brand_lib_id: '',
      seq_no: 3,
      brand_name: '台泥',
      manufacturer: '台湾水泥股份有限公司',
      remark: '备选对比',
      is_selected: false,
    },
    {
      candidate_id: 'C-011',
      application_id: 'PP-2026-002',
      brand_lib_id: '',
      seq_no: 1,
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      remark: '合同推荐品牌，样品已送检',
      is_selected: false,
    },
    {
      candidate_id: 'C-012',
      application_id: 'PP-2026-002',
      brand_lib_id: '',
      seq_no: 2,
      brand_name: '科顺',
      manufacturer: '科顺防水科技股份有限公司',
      remark: '价格适中',
      is_selected: false,
    },
    {
      candidate_id: 'C-013',
      application_id: 'PP-2026-002',
      brand_lib_id: '',
      seq_no: 3,
      brand_name: '雨中情',
      manufacturer: '雨中情防水技术集团股份公司',
      remark: '',
      is_selected: false,
    },
    {
      candidate_id: 'C-021',
      application_id: 'PP-2026-003',
      brand_lib_id: '',
      seq_no: 1,
      brand_name: '沙钢',
      manufacturer: '江苏沙钢集团有限公司',
      remark: '工期保障较好',
      is_selected: false,
    },
    {
      candidate_id: 'C-022',
      application_id: 'PP-2026-003',
      brand_lib_id: '',
      seq_no: 2,
      brand_name: '河钢',
      manufacturer: '河钢集团有限公司',
      remark: '',
      is_selected: false,
    },
    {
      candidate_id: 'C-023',
      application_id: 'PP-2026-003',
      brand_lib_id: '',
      seq_no: 3,
      brand_name: '宝钢',
      manufacturer: '中国宝武钢铁集团有限公司',
      remark: '质量口碑佳',
      is_selected: false,
    },
    {
      candidate_id: 'C-031',
      application_id: 'PP-2026-004',
      brand_lib_id: 'B-003',
      seq_no: 1,
      brand_name: '正泰',
      manufacturer: '正泰电气股份有限公司',
      remark: '',
      is_selected: false,
    },
    {
      candidate_id: 'C-032',
      application_id: 'PP-2026-004',
      brand_lib_id: '',
      seq_no: 2,
      brand_name: '施耐德',
      manufacturer: '施耐德电气',
      remark: '',
      is_selected: false,
    },
    {
      candidate_id: 'C-033',
      application_id: 'PP-2026-004',
      brand_lib_id: '',
      seq_no: 3,
      brand_name: 'ABB',
      manufacturer: 'ABB集团',
      remark: '',
      is_selected: false,
    },
    {
      candidate_id: 'C-041',
      application_id: 'PP-2026-005',
      brand_lib_id: 'B-001',
      seq_no: 1,
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      remark: '',
      is_selected: true,
    },
    {
      candidate_id: 'C-042',
      application_id: 'PP-2026-005',
      brand_lib_id: 'B-002',
      seq_no: 2,
      brand_name: '华润',
      manufacturer: '华润水泥控股有限公司',
      remark: '',
      is_selected: false,
    },
    {
      candidate_id: 'C-043',
      application_id: 'PP-2026-005',
      brand_lib_id: '',
      seq_no: 3,
      brand_name: '台泥',
      manufacturer: '台湾水泥股份有限公司',
      remark: '',
      is_selected: false,
    },
  ],
  approvals: [
    {
      record_id: 'AR-001',
      application_id: 'PP-2026-001',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '资料齐全，同意',
      operator_user_id: 'u-supervisor',
      operator_name: '王监理',
      operate_time: '2026-07-11 10:00:00',
    },
    {
      record_id: 'AR-002',
      application_id: 'PP-2026-001',
      node_code: 'pm',
      action: 'agree',
      opinion: '选定海螺',
      operator_user_id: 'u-pm',
      operator_name: '赵经理',
      operate_time: '2026-07-12 16:00:00',
    },
    {
      record_id: 'AR-003',
      application_id: 'PP-2026-003',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '同意报审',
      operator_user_id: 'u-supervisor',
      operator_name: '王监理',
      operate_time: '2026-07-19 09:00:00',
    },
    {
      record_id: 'AR-004',
      application_id: 'PP-2026-004',
      node_code: 'supervisor',
      action: 'reject',
      opinion: '附件不足，请补充厂商资料',
      operator_user_id: 'u-supervisor',
      operator_name: '王监理',
      operate_time: '2026-07-16 09:00:00',
    },
  ],
  attachments: [
    {
      attachment_id: 'BA-001',
      candidate_id: 'C-011',
      attach_type: 'vendor_profile',
      is_checked: true,
      file_name: '东方雨虹-厂商资料.pdf',
      file_url: '#mock/yuhong-vendor.pdf',
    },
    {
      attachment_id: 'BA-002',
      candidate_id: 'C-011',
      attach_type: 'sample_photo',
      is_checked: true,
      file_name: '样品照片-01.jpg',
      file_url: '#mock/yuhong-sample.jpg',
    },
    {
      attachment_id: 'BA-003',
      candidate_id: 'C-012',
      attach_type: 'manual_warranty',
      is_checked: true,
      file_name: '科顺-质保说明.pdf',
      file_url: '#mock/keshun-warranty.pdf',
    },
    {
      attachment_id: 'BA-004',
      candidate_id: 'C-021',
      attach_type: 'contract_clause',
      is_checked: true,
      file_name: '合同品牌约定摘录.pdf',
      file_url: '#mock/contract-clause.pdf',
    },
    {
      attachment_id: 'BA-005',
      candidate_id: 'C-021',
      attach_type: 'vendor_profile',
      is_checked: true,
      file_name: '沙钢供应商资料.pdf',
      file_url: '#mock/shagang-vendor.pdf',
    },
    {
      attachment_id: 'BA-006',
      candidate_id: 'C-023',
      attach_type: 'sample_photo',
      is_checked: true,
      file_name: '宝钢样品.jpg',
      file_url: '#mock/baosteel-sample.jpg',
    },
  ],
  seq: { app: 5, cand: 43, spec: 13, brand: 4, material: 12, bs: 6, ar: 4, att: 6 },
})

function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function listMaterials({ keyword = '', status = '' } = {}) {
  let rows = [...store.materials]
  if (status) rows = rows.filter((m) => m.status === status)
  const kw = keyword.trim()
  if (kw) rows = rows.filter((m) => `${m.material_name}${m.remark || ''}`.includes(kw))
  return rows
}

export function listSpecsByMaterial(materialId) {
  return store.specs.filter((s) => s.material_id === materialId)
}

export function saveMaterial(payload) {
  const name = (payload.material_name || '').trim()
  if (!name) return { ok: false, msg: '材料名称必填' }
  if (!payload.material_type) return { ok: false, msg: '材料类型必填' }
  if (payload.material_id) {
    const row = store.materials.find((m) => m.material_id === payload.material_id)
    if (!row) return { ok: false, msg: '材料不存在' }
    Object.assign(row, {
      material_name: name,
      material_type: payload.material_type,
      status: payload.status || row.status,
      remark: payload.remark || '',
    })
    return { ok: true, data: row }
  }
  store.seq.material += 1
  const row = {
    material_id: `M-${String(store.seq.material).padStart(3, '0')}`,
    material_name: name,
    material_type: payload.material_type,
    status: payload.status || 'active',
    remark: payload.remark || '',
  }
  store.materials.push(row)
  return { ok: true, data: row }
}

export function saveSpec(materialId, specModel, specId = '') {
  const model = (specModel || '').trim()
  if (!materialId || !model) return { ok: false, msg: '材料与规格型号必填' }
  const dup = store.specs.find(
    (s) =>
      s.material_id === materialId &&
      s.spec_model.trim() === model &&
      s.spec_id !== specId,
  )
  if (dup) return { ok: false, msg: '该材料下已存在相同规格型号' }

  if (specId) {
    const row = store.specs.find((s) => s.spec_id === specId)
    if (!row) return { ok: false, msg: '规格不存在' }
    if (row.material_id !== materialId) return { ok: false, msg: '规格不属于该材料' }
    row.spec_model = model
    return { ok: true, data: row }
  }

  store.seq.spec += 1
  const row = {
    spec_id: `S-${String(store.seq.spec).padStart(3, '0')}`,
    material_id: materialId,
    spec_model: model,
  }
  store.specs.push(row)
  return { ok: true, data: row }
}

/** 删除规格；同步清理品牌库规格关联；报审单上引用的 material_spec_id 置空（保留手填型号） */
export function deleteSpec(specId) {
  if (!specId) return { ok: false, msg: '规格ID必填' }
  const idx = store.specs.findIndex((s) => s.spec_id === specId)
  if (idx < 0) return { ok: false, msg: '规格不存在' }
  store.specs.splice(idx, 1)
  for (let i = store.brandSpecs.length - 1; i >= 0; i -= 1) {
    if (store.brandSpecs[i].material_spec_id === specId) {
      store.brandSpecs.splice(i, 1)
    }
  }
  store.appSpecs.forEach((s) => {
    if (s.material_spec_id === specId) s.material_spec_id = ''
  })
  return { ok: true }
}

export function toggleMaterialStatus(materialId) {
  const row = store.materials.find((m) => m.material_id === materialId)
  if (!row) return { ok: false, msg: '材料不存在' }
  row.status = row.status === 'active' ? 'inactive' : 'active'
  return { ok: true, data: row }
}

export function listBrands({ keyword = '', status = 'active' } = {}) {
  let rows = [...store.brands]
  if (status) rows = rows.filter((b) => b.status === status)
  const kw = keyword.trim()
  if (kw) rows = rows.filter((b) => `${b.brand_name}${b.manufacturer}`.includes(kw))
  return rows
}

/** 品牌下按材料聚合的规格关联 */
export function getBrandMaterialSpecGroups(brandLibId) {
  const links = store.brandSpecs.filter((x) => x.brand_lib_id === brandLibId)
  const byMaterial = new Map()
  for (const link of links) {
    if (!byMaterial.has(link.material_id)) {
      const material = store.materials.find((m) => m.material_id === link.material_id)
      byMaterial.set(link.material_id, {
        material_id: link.material_id,
        material_name: material?.material_name || link.material_id,
        material_type: material?.material_type || '',
        specs: [],
      })
    }
    const group = byMaterial.get(link.material_id)
    const spec = store.specs.find((s) => s.spec_id === link.material_spec_id)
    if (spec && !group.specs.some((s) => s.spec_id === spec.spec_id)) {
      group.specs.push({ spec_id: spec.spec_id, spec_model: spec.spec_model })
    }
  }
  return [...byMaterial.values()]
}

/**
 * 品牌库列表行：一条数据 = 品牌 + 一个材料 + 多个规格
 * 同一品牌可对应多行（不同材料）
 */
export function listBrandMaterialRows({ keyword = '', status = '' } = {}) {
  const brands = listBrands({ keyword: '', status })
  const kw = keyword.trim()
  const rows = []
  for (const b of brands) {
    const groups = getBrandMaterialSpecGroups(b.brand_lib_id)
    if (!groups.length) {
      rows.push({
        row_key: `${b.brand_lib_id}__`,
        brand_lib_id: b.brand_lib_id,
        brand_name: b.brand_name,
        manufacturer: b.manufacturer,
        source_type: b.source_type,
        status: b.status,
        material_id: '',
        material_name: '',
        material_type: '',
        specs: [],
      })
      continue
    }
    for (const g of groups) {
      rows.push({
        row_key: `${b.brand_lib_id}__${g.material_id}`,
        brand_lib_id: b.brand_lib_id,
        brand_name: b.brand_name,
        manufacturer: b.manufacturer,
        source_type: b.source_type,
        status: b.status,
        material_id: g.material_id,
        material_name: g.material_name,
        material_type: g.material_type,
        specs: g.specs,
      })
    }
  }
  if (!kw) return rows
  return rows.filter((r) =>
    `${r.brand_name}${r.manufacturer}${r.material_name}${r.specs.map((s) => s.spec_model).join('')}`.includes(
      kw,
    ),
  )
}

export function findBrandByNameManufacturer(brandName, manufacturer, { includeInactive = false } = {}) {
  const name = (brandName || '').trim()
  const mfr = (manufacturer || '').trim()
  return (
    store.brands.find((b) => {
      if (b.brand_name.trim() !== name || b.manufacturer.trim() !== mfr) return false
      if (!includeInactive && b.status !== 'active') return false
      return true
    }) || null
  )
}

/** 删除某品牌下某一材料的全部规格关联（删掉该列表行） */
export function removeBrandMaterial(brandLibId, materialId) {
  if (!brandLibId || !materialId) return { ok: false, msg: '参数不完整' }
  let removed = 0
  for (let i = store.brandSpecs.length - 1; i >= 0; i -= 1) {
    const x = store.brandSpecs[i]
    if (x.brand_lib_id === brandLibId && x.material_id === materialId) {
      store.brandSpecs.splice(i, 1)
      removed += 1
    }
  }
  if (!removed) return { ok: false, msg: '未找到该品牌材料关联' }
  return { ok: true }
}

/** @deprecated 兼容旧调用：返回品牌关联过的材料列表 */
export function getBrandMaterials(brandLibId) {
  return getBrandMaterialSpecGroups(brandLibId).map((g) => ({
    material_id: g.material_id,
    material_name: g.material_name,
    material_type: g.material_type,
  }))
}

export function saveBrand(payload) {
  const brand_name = (payload.brand_name || '').trim()
  const manufacturer = (payload.manufacturer || '').trim()
  if (!brand_name || !manufacturer) return { ok: false, msg: '品牌名称与生产厂家必填' }

  // 编辑某一「品牌+材料」数据行：可改品牌名/厂家，并重设该材料下规格
  if (payload.brand_lib_id && payload.editMaterialId) {
    const row = store.brands.find((b) => b.brand_lib_id === payload.brand_lib_id)
    if (!row) return { ok: false, msg: '品牌不存在' }
    Object.assign(row, { brand_name, manufacturer, status: payload.status || row.status })
    const materialId = payload.material_id || payload.editMaterialId
    const specIds = Array.isArray(payload.spec_ids) ? payload.spec_ids.filter(Boolean) : []
    if (!materialId) return { ok: false, msg: '请选择材料' }
    if (!specIds.length) return { ok: false, msg: '请至少选择 1 个材料规格' }
    // 若改了材料：目标材料不能已有另一条数据
    if (materialId !== payload.editMaterialId) {
      const conflict = store.brandSpecs.some(
        (x) => x.brand_lib_id === payload.brand_lib_id && x.material_id === materialId,
      )
      if (conflict) return { ok: false, msg: '该品牌下已有目标材料数据，请直接编辑那一行' }
      removeBrandMaterial(payload.brand_lib_id, payload.editMaterialId)
      const link = linkBrandMaterialSpecs(payload.brand_lib_id, materialId, specIds)
      if (!link.ok) return link
    } else {
      const r = replaceBrandMaterialSpecs(payload.brand_lib_id, materialId, specIds)
      if (!r.ok) return r
    }
    return { ok: true, data: row }
  }

  if (payload.brand_lib_id && !payload.editMaterialId) {
    const row = store.brands.find((b) => b.brand_lib_id === payload.brand_lib_id)
    if (!row) return { ok: false, msg: '品牌不存在' }
    Object.assign(row, { brand_name, manufacturer, status: payload.status || row.status })
    if (payload.material_id && Array.isArray(payload.spec_ids)) {
      const r = replaceBrandMaterialSpecs(payload.brand_lib_id, payload.material_id, payload.spec_ids)
      if (!r.ok) return r
    }
    return { ok: true, data: row }
  }

  // 指挥部手工新增一条数据：品牌 + 一个材料 + 多规格
  // 同名同厂家品牌已存在则复用（一个品牌多条材料数据）；否则新建品牌
  // 项目报审入库：skipSpecLink 可先建品牌再补关联
  const skipSpecLink = payload.skipSpecLink === true
  const materialId = payload.material_id || ''
  const specIds = Array.isArray(payload.spec_ids) ? payload.spec_ids.filter(Boolean) : []
  if (!skipSpecLink) {
    if (!materialId) return { ok: false, msg: '请选择材料' }
    if (!specIds.length) return { ok: false, msg: '请至少选择 1 个材料规格' }
    const material = store.materials.find((m) => m.material_id === materialId && m.status === 'active')
    if (!material) return { ok: false, msg: '材料不存在或已停用' }
    for (const sid of specIds) {
      const sp = store.specs.find((s) => s.spec_id === sid)
      if (!sp || sp.material_id !== materialId) {
        return { ok: false, msg: '所选规格必须属于该材料' }
      }
    }
  }

  let row = findBrandByNameManufacturer(brand_name, manufacturer)
  if (!row) {
    store.seq.brand += 1
    row = {
      brand_lib_id: `B-${String(store.seq.brand).padStart(3, '0')}`,
      brand_name,
      manufacturer,
      source_type: payload.source_type || 'hq_manual',
      application_id: payload.application_id || '',
      status: 'active',
    }
    store.brands.push(row)
  }

  if (!skipSpecLink) {
    // 同一品牌下同一材料只允许一条数据；已存在则提示去编辑，避免「新增」误覆盖
    const materialExists = store.brandSpecs.some(
      (x) => x.brand_lib_id === row.brand_lib_id && x.material_id === materialId,
    )
    if (materialExists) {
      return { ok: false, msg: '该品牌下已有该材料数据，请编辑原行或选择其他材料' }
    }
    const r = replaceBrandMaterialSpecs(row.brand_lib_id, materialId, specIds)
    if (!r.ok) return r
  }
  return { ok: true, data: row }
}

export function toggleBrandStatus(brandLibId) {
  const row = store.brands.find((b) => b.brand_lib_id === brandLibId)
  if (!row) return { ok: false, msg: '品牌不存在' }
  row.status = row.status === 'active' ? 'inactive' : 'active'
  return { ok: true, data: row }
}

/** 品牌关联材料下的若干规格（多选追加，已存在则跳过） */
export function linkBrandMaterialSpecs(brandLibId, materialId, specIds = []) {
  if (!brandLibId || !materialId) return { ok: false, msg: '参数不完整' }
  const ids = Array.isArray(specIds) ? [...new Set(specIds.filter(Boolean))] : []
  if (!ids.length) return { ok: false, msg: '请至少选择 1 个材料规格' }
  const material = store.materials.find((m) => m.material_id === materialId)
  if (!material) return { ok: false, msg: '材料不存在' }
  for (const sid of ids) {
    const sp = store.specs.find((s) => s.spec_id === sid)
    if (!sp || sp.material_id !== materialId) {
      return { ok: false, msg: '所选规格必须属于该材料' }
    }
    const exists = store.brandSpecs.some(
      (x) =>
        x.brand_lib_id === brandLibId &&
        x.material_id === materialId &&
        x.material_spec_id === sid,
    )
    if (exists) continue
    store.seq.bs += 1
    store.brandSpecs.push({
      brand_lib_spec_id: `BS-${String(store.seq.bs).padStart(3, '0')}`,
      brand_lib_id: brandLibId,
      material_id: materialId,
      material_spec_id: sid,
    })
  }
  return { ok: true }
}

/** 兼容旧调用：仅关联材料时，挂该材料下全部规格 */
export function linkBrandMaterial(brandLibId, materialId) {
  const specIds = listSpecsByMaterial(materialId).map((s) => s.spec_id)
  if (!specIds.length) return { ok: false, msg: '该材料暂无规格，请先在材料规格库维护' }
  return linkBrandMaterialSpecs(brandLibId, materialId, specIds)
}

/** 用指定规格集合替换某品牌在某材料下的关联 */
export function replaceBrandMaterialSpecs(brandLibId, materialId, specIds = []) {
  if (!brandLibId || !materialId) return { ok: false, msg: '参数不完整' }
  const ids = Array.isArray(specIds) ? [...new Set(specIds.filter(Boolean))] : []
  if (!ids.length) return { ok: false, msg: '请至少选择 1 个材料规格' }
  for (let i = store.brandSpecs.length - 1; i >= 0; i -= 1) {
    const x = store.brandSpecs[i]
    if (x.brand_lib_id === brandLibId && x.material_id === materialId) {
      store.brandSpecs.splice(i, 1)
    }
  }
  return linkBrandMaterialSpecs(brandLibId, materialId, ids)
}

export function listApplications(projectId, { keyword = '', status = '' } = {}) {
  let rows = [...store.applications]
  if (projectId) rows = rows.filter((a) => a.project_id === projectId)
  if (status) rows = rows.filter((a) => a.status === status)
  const kw = keyword.trim()
  if (kw) {
    rows = rows.filter((a) => {
      const cands = store.candidates.filter((c) => c.application_id === a.application_id)
      const text = `${a.application_id}${a.material_name}${cands.map((c) => c.brand_name + c.manufacturer).join('')}`
      return text.includes(kw)
    })
  }
  return rows.sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function listLedger(projectId, { keyword = '' } = {}) {
  return listApplications(projectId, { keyword, status: 'approved' }).map((a) => {
    const selected = store.candidates.find((c) => c.application_id === a.application_id && c.is_selected)
    const specs = store.appSpecs
      .filter((s) => s.application_id === a.application_id)
      .map((s) => s.spec_model)
      .join('、')
    return {
      ...a,
      selected_brand: selected?.brand_name || '—',
      selected_manufacturer: selected?.manufacturer || '—',
      spec_text: specs || '—',
    }
  })
}

/** 将附件行展开为与新建页一致的勾选槽位（只读展示用） */
export function buildAttachSlotsFromRecords(records = []) {
  const byType = new Map((records || []).map((r) => [r.attach_type, r]))
  return ATTACH_TYPE_KEYS.map((attach_type) => {
    const hit = byType.get(attach_type)
    if (!hit) {
      return { attach_type, is_checked: false, file_name: '', file_url: '' }
    }
    return {
      attach_type,
      is_checked: !!hit.is_checked,
      file_name: hit.file_name || '',
      file_url: hit.file_url || '',
    }
  })
}

export function getApplicationDetail(applicationId) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return null
  const attachments = store.attachments.filter((att) =>
    store.candidates.some((c) => c.application_id === applicationId && c.candidate_id === att.candidate_id),
  )
  const candidates = store.candidates
    .filter((c) => c.application_id === applicationId)
    .sort((a, b) => a.seq_no - b.seq_no)
    .map((c) => {
      const atts = attachments.filter((a) => a.candidate_id === c.candidate_id)
      return {
        ...c,
        remark: c.remark || '',
        attachments: atts,
        attachSlots: buildAttachSlotsFromRecords(atts),
      }
    })
  return {
    app,
    specs: store.appSpecs.filter((s) => s.application_id === applicationId).sort((a, b) => a.seq_no - b.seq_no),
    candidates,
    approvals: store.approvals
      .filter((r) => r.application_id === applicationId)
      .sort((a, b) => (a.operate_time > b.operate_time ? 1 : -1)),
    attachments,
  }
}

export function searchActiveBrands(keyword = '') {
  return listBrands({ keyword, status: 'active' })
}

export function searchActiveMaterials(keyword = '') {
  return listMaterials({ keyword, status: 'active' })
}

/** 组装个人中心品牌待办所需字段 */
function buildBrandTodoPayload(app) {
  const detail = getApplicationDetail(app.application_id)
  const candidates = detail?.candidates || []
  return {
    applicationId: app.application_id,
    materialName: app.material_name,
    materialType: MATERIAL_TYPE[app.material_type] || app.material_type,
    specsText: (detail?.specs || []).map((s) => s.spec_model).join('、'),
    brandsText: candidates.map((c) => c.brand_name).join(' / '),
    projectId: app.project_id,
    projectLabel: getProjectLabel(app.project_id) || app.project_id,
    applicantName: app.applicant_name,
    applyTime: app.submit_time,
    usePart: app.use_part || '',
    candidates: candidates.map((c) => ({
      candidate_id: c.candidate_id,
      brand_name: c.brand_name,
      manufacturer: c.manufacturer,
      remark: c.remark || '',
      brand_lib_id: c.brand_lib_id || '',
    })),
    supervisorTime: timestamp(),
    supervisorName: '监理用户',
  }
}

function dupMaterialHint(projectId, materialName, excludeId = '') {
  const name = materialName.trim()
  return store.applications.some(
    (a) =>
      a.project_id === projectId &&
      a.status === 'approved' &&
      a.application_id !== excludeId &&
      a.material_name.trim() === name,
  )
}

export function submitApplication(payload) {
  const project_id = payload.project_id
  const material_name = (payload.material_name || '').trim()
  const material_type = payload.material_type
  const specs = (payload.specs || []).filter((s) => (s.spec_model || '').trim())
  const candidates = (payload.candidates || []).filter(
    (c) => (c.brand_name || '').trim() && (c.manufacturer || '').trim(),
  )
  if (!project_id) return { ok: false, msg: '请切换到具体项目' }
  if (!material_name || !material_type) return { ok: false, msg: '材料名称与材料类型必填' }
  if (specs.length < 1) return { ok: false, msg: '本单规格至少 1 条' }
  if (candidates.length < 3) return { ok: false, msg: '备选品牌至少 3 条' }

  // 库选入：有 brand_lib_id 时校验仍为启用；勾选附件须上传文件
  for (const c of candidates) {
    if (c.brand_lib_id) {
      const b = store.brands.find((x) => x.brand_lib_id === c.brand_lib_id)
      if (!b || b.status !== 'active') return { ok: false, msg: `品牌「${c.brand_name}」不可用，请删除后重选` }
    }
    const slots = Array.isArray(c.attachSlots) ? c.attachSlots : []
    for (const slot of slots) {
      if (slot.is_checked && !(slot.file_name || '').trim()) {
        return {
          ok: false,
          msg: `品牌「${c.brand_name}」已勾选「${ATTACH_TYPE[slot.attach_type] || '附件'}」，请上传文件`,
        }
      }
    }
  }
  if (payload.material_id) {
    const m = store.materials.find((x) => x.material_id === payload.material_id)
    if (!m || m.status !== 'active') return { ok: false, msg: '导入材料须为启用状态' }
    for (const s of specs) {
      if (s.material_spec_id) {
        const sp = store.specs.find((x) => x.spec_id === s.material_spec_id)
        if (!sp || sp.material_id !== payload.material_id) {
          return { ok: false, msg: '勾选规格必须属于已导入企业材料' }
        }
      }
    }
  }

  const hint = dupMaterialHint(project_id, material_name)
  store.seq.app += 1
  const application_id = `PP-2026-${String(store.seq.app).padStart(3, '0')}`
  const app = {
    application_id,
    project_id,
    material_id: payload.material_id || '',
    material_name,
    material_type,
    use_part: payload.use_part || '',
    status: 'in_approval',
    current_node: 'supervisor',
    applicant_user_id: 'u-contractor',
    applicant_name: '当前用户',
    submit_time: timestamp(),
    finish_time: '',
    remark: payload.remark || '',
  }
  store.applications.push(app)
  specs.forEach((s, i) => {
    store.seq.spec += 1
    store.appSpecs.push({
      app_spec_id: `AS-${String(store.seq.spec).padStart(3, '0')}`,
      application_id,
      spec_model: s.spec_model.trim(),
      material_spec_id: s.material_spec_id || '',
      seq_no: i + 1,
    })
  })
  candidates.forEach((c, i) => {
    store.seq.cand += 1
    const candidate_id = `C-${String(store.seq.cand).padStart(3, '0')}`
    store.candidates.push({
      candidate_id,
      application_id,
      brand_lib_id: c.brand_lib_id || '',
      seq_no: i + 1,
      brand_name: c.brand_name.trim(),
      manufacturer: c.manufacturer.trim(),
      remark: (c.remark || '').trim(),
      is_selected: false,
    })
    const slots = Array.isArray(c.attachSlots) ? c.attachSlots : []
    slots.forEach((slot) => {
      if (!slot.is_checked || !(slot.file_name || '').trim()) return
      store.seq.att += 1
      store.attachments.push({
        attachment_id: `BA-${String(store.seq.att).padStart(3, '0')}`,
        candidate_id,
        attach_type: slot.attach_type,
        is_checked: true,
        file_name: slot.file_name.trim(),
        file_url: slot.file_url || `#mock/${slot.file_name.trim()}`,
      })
    })
  })
  createBrandSupervisorTodo(buildBrandTodoPayload(app))
  return {
    ok: true,
    data: app,
    warn: hint ? `提示：本项目已存在同名材料「${material_name}」的已通过报审，可继续提交` : '',
  }
}

export function withdrawApplication(applicationId) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '仅待监理审时可撤回' }
  }
  app.status = 'withdrawn'
  app.current_node = 'none'
  app.finish_time = timestamp()
  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'withdraw',
    opinion: '申请人撤回',
    operator_user_id: 'u-contractor',
    operator_name: '当前用户',
    operate_time: timestamp(),
  })
  discardBrandTodos(applicationId)
  return { ok: true }
}

export function resubmitApplication(applicationId) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (!['rejected', 'withdrawn'].includes(app.status)) return { ok: false, msg: '仅已驳回/已撤回可重提' }
  store.candidates
    .filter((c) => c.application_id === applicationId)
    .forEach((c) => {
      c.is_selected = false
    })
  app.status = 'in_approval'
  app.current_node = 'supervisor'
  app.submit_time = timestamp()
  app.finish_time = ''
  createBrandSupervisorTodo(buildBrandTodoPayload(app))
  return { ok: true }
}

export function supervisorApprove(applicationId, { action, opinion }) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '当前不在待监理审节点' }
  }
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '退回意见必填' }
  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    application_id: applicationId,
    node_code: 'supervisor',
    action,
    opinion: opinion || '',
    operator_user_id: 'u-supervisor',
    operator_name: '监理用户',
    operate_time: timestamp(),
  })
  if (action === 'agree') {
    app.current_node = 'pm'
    createBrandPmTodo(buildBrandTodoPayload(app))
  } else {
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = timestamp()
  }
  return { ok: true }
}

export function pmApprove(applicationId, { action, opinion, selectedCandidateId, resolveMaterialId }) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'pm') {
    return { ok: false, msg: '当前不在待项目经理审节点' }
  }
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '退回意见必填' }

  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    application_id: applicationId,
    node_code: 'pm',
    action,
    opinion: opinion || '',
    operator_user_id: 'u-pm',
    operator_name: '项目经理',
    operate_time: timestamp(),
  })

  if (action === 'reject') {
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = timestamp()
    store.candidates.filter((c) => c.application_id === applicationId).forEach((c) => {
      c.is_selected = false
    })
    return { ok: true }
  }

  const cands = store.candidates.filter((c) => c.application_id === applicationId)
  cands.forEach((c) => {
    c.is_selected = c.candidate_id === selectedCandidateId
  })
  const selectedCount = cands.filter((c) => c.is_selected).length
  if (selectedCount !== 1) return { ok: false, msg: '终审同意须恰好选定 1 个入选品牌' }
  const selected = cands.find((c) => c.is_selected)

  // 入库步骤（简化完整规则）
  let materialId = app.material_id
  if (!materialId) {
    const hits = store.materials.filter(
      (m) => m.status === 'active' && m.material_name.trim() === app.material_name.trim(),
    )
    if (hits.length === 0) {
      const created = saveMaterial({
        material_name: app.material_name,
        material_type: app.material_type,
        status: 'active',
      })
      materialId = created.data.material_id
      store.appSpecs
        .filter((s) => s.application_id === applicationId)
        .forEach((s) => {
          const r = saveSpec(materialId, s.spec_model)
          if (r.ok) s.material_spec_id = r.data.spec_id
        })
    } else if (hits.length === 1) {
      materialId = hits[0].material_id
    } else {
      if (!resolveMaterialId) {
        return {
          ok: false,
          msg: '存在多条同名启用企业材料，请选择一条',
          needChooseMaterial: true,
          materials: hits,
        }
      }
      materialId = resolveMaterialId
    }
    app.material_id = materialId
  }

  let brandLibId = selected.brand_lib_id
  if (brandLibId) {
    const brand = store.brands.find((b) => b.brand_lib_id === brandLibId)
    if (brand && brand.status === 'inactive') {
      // 中途停用仍入选 → 新建启用品牌
      const created = saveBrand({
        brand_name: selected.brand_name,
        manufacturer: selected.manufacturer,
        source_type: 'project_approval',
        application_id: applicationId,
        skipSpecLink: true,
      })
      if (!created.ok) return created
      brandLibId = created.data.brand_lib_id
      selected.brand_lib_id = brandLibId
    }
  } else {
    const name = selected.brand_name.trim()
    const mfr = selected.manufacturer.trim()
    const hits = store.brands.filter(
      (b) => b.brand_name.trim() === name && b.manufacturer.trim() === mfr,
    )
    const activeHit = hits.find((b) => b.status === 'active')
    const inactiveHit = hits.find((b) => b.status === 'inactive')
    if (inactiveHit && !activeHit) {
      return { ok: false, msg: '该品牌已停用，不可入库' }
    }
    if (activeHit) {
      brandLibId = activeHit.brand_lib_id
      selected.brand_lib_id = brandLibId
    } else {
      const created = saveBrand({
        brand_name: name,
        manufacturer: mfr,
        source_type: 'project_approval',
        application_id: applicationId,
        skipSpecLink: true,
      })
      if (!created.ok) return created
      brandLibId = created.data.brand_lib_id
      selected.brand_lib_id = brandLibId
    }
  }

  // 入库：挂本单规格（有企业规格ID的优先）；否则挂材料下全部规格
  const appSpecIds = store.appSpecs
    .filter((s) => s.application_id === applicationId && s.material_spec_id)
    .map((s) => s.material_spec_id)
  if (appSpecIds.length) {
    linkBrandMaterialSpecs(brandLibId, materialId, appSpecIds)
  } else {
    linkBrandMaterial(brandLibId, materialId)
  }
  app.status = 'approved'
  app.current_node = 'none'
  app.finish_time = timestamp()
  return { ok: true }
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'in_approval') return 'warning'
  if (status === 'rejected') return 'danger'
  return 'info'
}

export function getInactiveSelectedHint(applicationId) {
  return store.candidates
    .filter((c) => c.application_id === applicationId && c.brand_lib_id)
    .map((c) => {
      const b = store.brands.find((x) => x.brand_lib_id === c.brand_lib_id)
      return b && b.status === 'inactive' ? c : null
    })
    .filter(Boolean)
}

/**
 * 样板管理 Mock — 对齐 research-sample V2.0
 * 材料定样：监理 → 项目经理；工序样板：仅监理
 */
import { reactive } from 'vue'
import { nowStr } from '../utils/datetime.js'
import { getProjectLabel } from './laborRealName.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { listSamplePickRowsFromBrand } from './brand.js'
import {
  listBrandProjectUsers,
  findBrandProjectUser,
  resolveDefaultApprovers,
  rememberBrandProjectApprovers,
  formatBrandProjectUserLabel,
  MATERIAL_TYPE,
} from './brand.js'
import {
  createSampleSupervisorTodo,
  createSamplePmTodo,
  discardSampleTodos,
  finishSampleOpenTodos,
} from './personalCenter.js'

/** 业务状态：对齐品牌报审 — 审批中（含监理审/项目经理审，由 current_node 区分）→ 已通过 / 已驳回 */
export const STATUS_LABEL = {
  in_approval: '审批中',
  approved: '已通过',
  rejected: '已驳回',
}

export function statusLabel(status) {
  // 废止码仅只读兼容展示；新材料定样不再产出 pending/withdrawn
  if (status === 'pending') return '审批中'
  if (status === 'withdrawn') return '已撤回'
  return STATUS_LABEL[status] || status || '—'
}

export const NODE_LABEL = {
  none: '—',
  supervisor: '待监理审',
  pm: '待项目经理审',
}

export const APPROVAL_NODE_LABEL = {
  applicant: '施工提交',
  supervisor: '监理审批',
  pm: '项目经理终审',
}

export const ACTION_LABEL = {
  submit: '提交',
  agree: '同意',
  reject: '退回',
  withdraw: '撤回',
}

export function actionTagType(action) {
  if (action === 'agree' || action === 'submit') return 'success'
  if (action === 'reject') return 'danger'
  return 'warning'
}

export const BIZ_TYPE_LABEL = {
  material: '材料设备定样',
  process: '工序样板',
}

/** 材料类型：与品牌报审 / 进场同源 */
export { MATERIAL_TYPE }

export function normalizeMaterialType(type) {
  return type === 'equipment' ? 'equipment' : 'material'
}

export function materialTypeLabel(type) {
  const key = normalizeMaterialType(type)
  return MATERIAL_TYPE[key] || MATERIAL_TYPE.material
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'pending' || status === 'in_approval') return 'warning'
  if (status === 'rejected' || status === 'withdrawn') return 'danger'
  return 'info'
}

function normalizeFileList(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((item) => {
      if (typeof item === 'string') return { name: item, url: '#' }
      const name = String(item?.name || '').trim()
      if (!name) return null
      return { name, url: item?.url || '#' }
    })
    .filter(Boolean)
}

const store = reactive({
  seq: { m: 4, p: 4, ar: 8 },
  materials: [
    {
      application_id: 'MS-001',
      project_id: 'p-000',
      sample_name: '外墙真石漆',
      material_name: '外墙真石漆',
      material_type: 'material',
      sample_date: '2026-07-08',
      spec: '砂壁状真石漆 A12；涂层厚度≥1.5mm；色差 ΔE≤1.0；耐洗刷≥2000 次。',
      brand_name: '亚士',
      manufacturer: '亚士创能科技股份有限公司',
      supplier: '亚士创能科技股份有限公司',
      unit_wbs_id: '',
      unit_name: 'T3 航站楼',
      use_part_wbs_id: '',
      use_part: 'T3 航站楼外立面',
      location_ids: ['loc-t3-facade'],
      indicator_desc: '砂壁状真石漆 A12；涂层厚度≥1.5mm；色差 ΔE≤1.0；耐洗刷≥2000 次。',
      sample_photos: [
        { name: '真石漆样板-正面.jpg', url: '#' },
        { name: '真石漆样板-侧面.jpg', url: '#' },
      ],
      effect_images: [
        { name: '真石漆样板-正面.jpg', url: '#' },
        { name: '真石漆样板-侧面.jpg', url: '#' },
      ],
      sign_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      approval_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      certificate_files: [{ name: '真石漆出厂质量证明.pdf', url: '#' }],
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
      sample_name: '室内地砖 800×800',
      material_name: '室内地砖 800×800',
      material_type: 'material',
      sample_date: '2026-07-24',
      spec: '通体瓷砖 800×800；吸水率≤0.5%；耐磨等级 4 级；表面平整度≤0.5mm。',
      brand_name: '马可波罗',
      manufacturer: '某陶瓷集团',
      supplier: '某陶瓷集团',
      unit_wbs_id: '',
      unit_name: '商业区',
      use_part_wbs_id: '',
      use_part: '商业区公区',
      location_ids: ['loc-mall-public'],
      indicator_desc: '通体瓷砖 800×800；吸水率≤0.5%；耐磨等级 4 级；表面平整度≤0.5mm。',
      sample_photos: [{ name: '地砖样板.jpg', url: '#' }],
      effect_images: [{ name: '地砖样板.jpg', url: '#' }],
      sign_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      approval_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      certificate_files: [{ name: '地砖出厂质量证明.pdf', url: '#' }],
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
      sample_name: '铝单板幕墙',
      material_name: '铝单板幕墙',
      material_type: 'equipment',
      sample_date: '2026-07-18',
      spec: '氟碳喷涂铝单板 2.5mm；色号 RAL9006；板面平整度≤2mm。',
      brand_name: '兴发',
      manufacturer: '某幕墙材料厂',
      supplier: '某幕墙材料厂',
      unit_wbs_id: '',
      unit_name: '连廊',
      use_part_wbs_id: '',
      use_part: '连廊立面',
      location_ids: ['loc-corridor'],
      indicator_desc: '氟碳喷涂铝单板 2.5mm；色号 RAL9006；板面平整度≤2mm。',
      sample_photos: [{ name: '铝单板-1.jpg', url: '#' }],
      effect_images: [{ name: '铝单板-1.jpg', url: '#' }],
      sign_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      approval_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      certificate_files: [{ name: '铝单板出厂质量证明.pdf', url: '#' }],
      status: 'in_approval',
      current_node: 'pm',
      applicant_name: '施工-赵工',
      submit_time: '2026-07-20 14:10:00',
      finish_time: '',
      remark: '',
    },
    {
      application_id: 'MS-004',
      project_id: 'p-000',
      sample_name: '防水卷材',
      material_name: '防水卷材',
      material_type: 'material',
      sample_date: '2026-07-16',
      spec: 'SBS 改性沥青防水卷材 3mm；低温柔性 -25℃；拉力≥800N/50mm。',
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      supplier: '北京东方雨虹防水技术股份有限公司',
      unit_wbs_id: '',
      unit_name: '屋面工程',
      use_part_wbs_id: '',
      use_part: '屋面防水层',
      location_ids: ['loc-roof'],
      indicator_desc: 'SBS 改性沥青防水卷材 3mm；低温柔性 -25℃；拉力≥800N/50mm。',
      sample_photos: [{ name: '防水卷材样板.jpg', url: '#' }],
      effect_images: [{ name: '防水卷材样板.jpg', url: '#' }],
      sign_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      approval_files: [{ name: '材料设备送样定板报审签字.pdf', url: '#' }],
      certificate_files: [{ name: '防水卷材出厂质量证明.pdf', url: '#' }],
      status: 'rejected',
      current_node: 'none',
      applicant_name: '施工-李工',
      submit_time: '2026-07-18 09:00:00',
      finish_time: '2026-07-19 15:20:00',
      remark: '演示：已驳回留档，可重新申报',
    },
  ],
  processes: [
    {
      application_id: 'PS-001',
      project_id: 'p-000',
      process_name: '清水混凝土柱样板',
      use_part: '地下一层结构区',
      location_ids: ['loc-b1-structure'],
      briefing_content: '模板拼缝、拆模时机、养护要求；样板标准照片见影像资料。',
      photo_files: ['清水柱-正面.jpg', '清水柱-节点.jpg'],
      video_files: ['交底讲解.mp4'],
      media_files: [
        { name: '清水柱-正面.jpg', kind: 'image' },
        { name: '清水柱-节点.jpg', kind: 'image' },
        { name: '交底讲解.mp4', kind: 'video' },
      ],
      doc_files: ['清水混凝土样板说明.pdf'],
      status: 'approved',
      current_node: 'none',
      applicant_name: '施工-王工',
      submit_time: '2026-07-08 10:00:00',
      finish_time: '2026-07-09 09:00:00',
      remark: '',
    },
    {
      application_id: 'PS-002',
      project_id: 'p-000',
      process_name: '防水卷材铺贴样板',
      use_part: '屋面防水层',
      location_ids: ['loc-roof'],
      briefing_content: '搭接宽度、热熔顺序、节点加强。',
      photo_files: ['防水样板.jpg'],
      video_files: [],
      media_files: [{ name: '防水样板.jpg', kind: 'image' }],
      doc_files: ['防水节点做法.docx'],
      status: 'in_approval',
      current_node: 'supervisor',
      applicant_name: '施工-李工',
      submit_time: '2026-07-26 09:40:00',
      finish_time: '',
      remark: '',
    },
    {
      application_id: 'PS-003',
      project_id: 'p-001',
      process_name: '砌体样板墙',
      use_part: '办公区隔墙',
      location_ids: ['loc-office-wall'],
      briefing_content: '灰缝厚度、拉结筋、洞口加强。',
      photo_files: ['砌体墙.jpg'],
      video_files: ['砌体交底.mp4'],
      media_files: [
        { name: '砌体墙.jpg', kind: 'image' },
        { name: '砌体交底.mp4', kind: 'video' },
      ],
      doc_files: [],
      status: 'rejected',
      current_node: 'none',
      applicant_name: '施工-赵工',
      submit_time: '2026-07-22 15:20:00',
      finish_time: '2026-07-23 11:30:00',
      remark: '演示：已驳回留档，可复制新建',
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
      opinion: '交底完整，同意通过',
      operator_name: '监理用户',
      operate_time: '2026-07-09 09:00:00',
    },
    {
      record_id: 'AR-006',
      biz_type: 'material',
      application_id: 'MS-003',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '同意',
      operator_name: '监理用户',
      operate_time: '2026-07-21 11:00:00',
    },
    {
      record_id: 'AR-007',
      biz_type: 'material',
      application_id: 'MS-004',
      node_code: 'supervisor',
      action: 'reject',
      opinion: '指标说明不完整，请补充后新建',
      operator_name: '监理用户',
      operate_time: '2026-07-19 15:20:00',
    },
    {
      record_id: 'AR-008',
      biz_type: 'process',
      application_id: 'PS-003',
      node_code: 'supervisor',
      action: 'reject',
      opinion: '影像资料不足，请补充后新建',
      operator_name: '监理用户',
      operate_time: '2026-07-23 11:30:00',
    },
  ],
})

function pushApproval(row) {
  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    ...row,
    operate_time: row.operate_time || nowStr(),
  })
}

function buildTodoPayload(bizType, app) {
  const isMaterial = bizType === 'material'
  const sampleName = isMaterial ? app.sample_name || app.material_name : app.process_name
  const photos = isMaterial
    ? normalizeFileList(app.sample_photos?.length ? app.sample_photos : app.effect_images)
    : []
  const signs = isMaterial
    ? normalizeFileList(app.sign_files?.length ? app.sign_files : app.approval_files)
    : []
  const certs = isMaterial ? normalizeFileList(app.certificate_files) : []
  return {
    bizType,
    applicationId: app.application_id,
    title: sampleName,
    usePart: app.use_part || '',
    unitName: isMaterial ? app.unit_name || '' : '',
    sampleDate: isMaterial ? app.sample_date || '' : '',
    spec: isMaterial ? app.spec || app.indicator_desc || '' : '',
    brandName: isMaterial ? app.brand_name || '' : '',
    manufacturer: isMaterial ? app.manufacturer || app.supplier || '' : '',
    projectId: app.project_id,
    projectLabel: getProjectLabel(app.project_id) || app.project_id,
    applicantName: app.applicant_name,
    applyTime: app.submit_time,
    briefing: isMaterial ? app.spec || app.indicator_desc || '' : app.briefing_content || '',
    indicatorDesc: isMaterial ? app.spec || app.indicator_desc || '' : '',
    supplier: isMaterial ? app.manufacturer || app.supplier || '' : '',
    materialType: isMaterial ? materialTypeLabel(app.material_type) : '',
    material_type: isMaterial ? normalizeMaterialType(app.material_type) : '',
    effectImages: photos,
    approvalFiles: signs,
    certificateFiles: certs,
    supervisorName: app.supervisor_approver_name || '监理用户',
    pmApproverName: app.pm_approver_name || '项目经理',
    assigneeName:
      app.current_node === 'pm'
        ? app.pm_approver_name || '项目经理'
        : app.supervisor_approver_name || '监理用户',
  }
}

export { listBrandProjectUsers, findBrandProjectUser, resolveDefaultApprovers, formatBrandProjectUserLabel }

function resolveSampleApprovers(payload, { requirePm = true } = {}) {
  const supervisor_approver_user_id = String(payload.supervisor_approver_user_id || '').trim()
  if (!supervisor_approver_user_id) {
    return { ok: false, msg: '请选择监理审批人' }
  }
  const supervisor = findBrandProjectUser(supervisor_approver_user_id)
  if (!supervisor) return { ok: false, msg: '监理审批人不在本项目可选范围内' }

  let pm = null
  if (requirePm) {
    const pm_approver_user_id = String(payload.pm_approver_user_id || '').trim()
    if (!pm_approver_user_id) return { ok: false, msg: '请选择项目经理审批人' }
    pm = findBrandProjectUser(pm_approver_user_id)
    if (!pm) return { ok: false, msg: '项目经理审批人不在本项目可选范围内' }
  }

  return {
    ok: true,
    supervisor_approver_user_id: supervisor.user_id,
    supervisor_approver_name: supervisor.name,
    supervisor_approver_post_label: supervisor.post_label || '',
    pm_approver_user_id: pm?.user_id || '',
    pm_approver_name: pm?.name || '',
    pm_approver_post_label: pm?.post_label || '',
  }
}

function rememberSampleApprovers(projectId, approvers, { requirePm = true } = {}) {
  if (!projectId || !approvers) return
  rememberBrandProjectApprovers(
    projectId,
    approvers.supervisor_approver_user_id,
    approvers.supervisor_approver_name,
    requirePm ? approvers.pm_approver_user_id : '',
    requirePm ? approvers.pm_approver_name : '',
  )
}

export function listMaterialApps(projectId, { keyword = '', status = '' } = {}) {
  const kw = keyword.trim().toLowerCase()
  return store.materials
    .filter((a) => a.project_id === projectId)
    .filter((a) => !status || a.status === status)
    .filter((a) => {
      if (!kw) return true
      const name = (a.sample_name || a.material_name || '').toLowerCase()
      return (
        a.application_id.toLowerCase().includes(kw) ||
        name.includes(kw) ||
        (a.use_part || '').toLowerCase().includes(kw) ||
        (a.unit_name || '').toLowerCase().includes(kw) ||
        (a.brand_name || '').toLowerCase().includes(kw) ||
        (a.manufacturer || a.supplier || '').toLowerCase().includes(kw)
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
      (a.status === 'pending' || a.status === 'in_approval') &&
      (!node || a.current_node === node),
  )
}

export function listProcessPending(projectId, node) {
  return store.processes.filter(
    (a) =>
      a.project_id === projectId &&
      (a.status === 'pending' || a.status === 'in_approval') &&
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

export function getRejectedMaterialAppsForCopy(projectId) {
  return store.materials
    .filter((a) => a.project_id === projectId && a.status === 'rejected')
    .map((a) => ({
      application_id: a.application_id,
      material_name: a.material_name,
      material_type: normalizeMaterialType(a.material_type),
      brand_name: a.brand_name || '',
      supplier: a.supplier,
      use_part: a.use_part,
      submit_time: a.submit_time,
    }))
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function buildCopyPayloadFromRejectedMaterial(applicationId) {
  const app = store.materials.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'rejected') return { ok: false, msg: '仅已驳回单可重新申报' }
  const photos = normalizeFileList(app.sample_photos?.length ? app.sample_photos : app.effect_images)
  const signs = normalizeFileList(app.sign_files?.length ? app.sign_files : app.approval_files)
  const certs = normalizeFileList(app.certificate_files)
  const partWbs = app.use_part_wbs_id || app.location_id || (Array.isArray(app.location_ids) ? app.location_ids[0] : '') || ''
  return {
    ok: true,
    data: {
      copy_from_application_id: app.application_id,
      sample_name: app.sample_name || app.material_name || '',
      material_name: app.sample_name || app.material_name || '',
      material_type: normalizeMaterialType(app.material_type),
      sample_date: app.sample_date || '',
      spec: app.spec || app.indicator_desc || '',
      brand_name: app.brand_name || '',
      manufacturer: app.manufacturer || app.supplier || '',
      supplier: app.manufacturer || app.supplier || '',
      unit_wbs_id: app.unit_wbs_id || '',
      unit_name: app.unit_name || '',
      use_part_wbs_id: partWbs,
      use_part: app.use_part || '',
      location_id: partWbs,
      location_ids: partWbs ? [partWbs] : [],
      indicator_desc: app.spec || app.indicator_desc || '',
      sample_photos: photos,
      effect_images: photos,
      sign_files: signs,
      approval_files: signs,
      certificate_files: certs,
      remark: app.remark || '',
      supervisor_approver_user_id: app.supervisor_approver_user_id || '',
      supervisor_approver_name: app.supervisor_approver_name || '',
      pm_approver_user_id: app.pm_approver_user_id || '',
      pm_approver_name: app.pm_approver_name || '',
    },
  }
}

/** 已撤回材料定样重新编辑预填 */
export function buildReEditPayloadFromWithdrawnMaterial(applicationId) {
  const app = store.materials.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'withdrawn') return { ok: false, msg: '仅已撤回单可重新编辑' }
  return {
    ok: true,
    data: {
      application_id: app.application_id,
      material_name: app.material_name,
      material_type: normalizeMaterialType(app.material_type),
      brand_name: app.brand_name || '',
      supplier: app.supplier,
      use_part: app.use_part,
      location_id: app.location_id || (Array.isArray(app.location_ids) ? app.location_ids[0] : '') || '',
      location_ids: Array.isArray(app.location_ids) ? [...app.location_ids] : [],
      indicator_desc: app.indicator_desc || '',
      effect_images: normalizeFileList(app.effect_images),
      approval_files: normalizeFileList(app.approval_files),
      remark: app.remark || '',
      supervisor_approver_user_id: app.supervisor_approver_user_id || '',
      supervisor_approver_name: app.supervisor_approver_name || '',
      pm_approver_user_id: app.pm_approver_user_id || '',
      pm_approver_name: app.pm_approver_name || '',
    },
  }
}

export function getRejectedProcessAppsForCopy(projectId) {
  return store.processes
    .filter((a) => a.project_id === projectId && a.status === 'rejected')
    .map((a) => ({
      application_id: a.application_id,
      process_name: a.process_name,
      use_part: a.use_part,
      submit_time: a.submit_time,
    }))
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function buildCopyPayloadFromRejectedProcess(applicationId) {
  const app = store.processes.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'rejected') return { ok: false, msg: '仅已驳回单可复制新建' }
  return {
    ok: true,
    data: {
      copy_from_application_id: app.application_id,
      process_name: app.process_name,
      use_part: app.use_part,
      location_id: app.location_id || (Array.isArray(app.location_ids) ? app.location_ids[0] : '') || '',
      location_ids: Array.isArray(app.location_ids) ? [...app.location_ids] : [],
      briefing_content: app.briefing_content || '',
      photo_files: [...(app.photo_files || [])],
      video_files: [...(app.video_files || [])],
      media_files: Array.isArray(app.media_files) ? app.media_files.map((m) => ({ ...m })) : [],
      doc_files: [...(app.doc_files || [])],
      remark: app.remark || '',
      supervisor_approver_user_id: app.supervisor_approver_user_id || '',
      supervisor_approver_name: app.supervisor_approver_name || '',
    },
  }
}

/** 已撤回工序样板重新编辑预填 */
export function buildReEditPayloadFromWithdrawnProcess(applicationId) {
  const app = store.processes.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'withdrawn') return { ok: false, msg: '仅已撤回单可重新编辑' }
  return {
    ok: true,
    data: {
      application_id: app.application_id,
      process_name: app.process_name,
      use_part: app.use_part,
      location_id: app.location_id || (Array.isArray(app.location_ids) ? app.location_ids[0] : '') || '',
      location_ids: Array.isArray(app.location_ids) ? [...app.location_ids] : [],
      briefing_content: app.briefing_content || '',
      photo_files: [...(app.photo_files || [])],
      video_files: [...(app.video_files || [])],
      media_files: Array.isArray(app.media_files) ? app.media_files.map((m) => ({ ...m })) : [],
      doc_files: [...(app.doc_files || [])],
      remark: app.remark || '',
      supervisor_approver_user_id: app.supervisor_approver_user_id || '',
      supervisor_approver_name: app.supervisor_approver_name || '',
    },
  }
}

/** 已撤回原单重新提交 → 待审批（同单号） */
export function resubmitWithdrawnSample(bizType, applicationId, payload) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'withdrawn') return { ok: false, msg: '仅已撤回单可重新编辑提交' }

  const project_id = payload.project_id || app.project_id
  if (project_id !== app.project_id) return { ok: false, msg: '不可跨项目重提' }
  const applicant_name = payload.applicant_name || app.applicant_name || '当前用户'

  if (bizType === 'material') {
    const material_name = (payload.material_name || '').trim()
    const supplier = (payload.supplier || '').trim()
    if (!material_name) return { ok: false, msg: '请选择材料名称' }
    if (!supplier) return { ok: false, msg: '请选择供应商' }
    if (!payload.material_type || !['material', 'equipment'].includes(payload.material_type)) {
      return { ok: false, msg: '请选择材料类型' }
    }
    const material_type = normalizeMaterialType(payload.material_type)

    const ids = Array.isArray(payload.location_ids) ? payload.location_ids.map(String).filter(Boolean) : []
    if (payload.location_id && !ids.length) ids.push(String(payload.location_id))
    const part = String(payload.use_part || '').trim()
    if (!part && !ids.length) return { ok: false, msg: '请选择施工部位' }

    const desc = String(payload.indicator_desc || '').trim()
    if (!desc) return { ok: false, msg: '请填写材料指标说明' }

    const effects = normalizeFileList(payload.effect_images)
    const approvals = normalizeFileList(payload.approval_files)
    if (!effects.length) return { ok: false, msg: '请至少上传 1 张效果图' }
    if (!approvals.length) return { ok: false, msg: '请至少上传 1 份审批文件' }

    let brand = String(payload.brand_name || '').trim()
    if (!brand) {
      const matched = listSamplePickRowsFromBrand(project_id).filter(
        (r) => r.supplier === supplier && r.material_name === material_name,
      )
      const names = [...new Set(matched.map((r) => (r.brand_name || '').trim()).filter(Boolean))]
      brand = names.join('/')
    }

    app.material_name = material_name
    app.material_type = material_type
    app.brand_name = brand
    app.supplier = supplier
    app.use_part = part
    app.location_id = ids[0] || String(payload.location_id || '')
    app.location_ids = ids
    app.indicator_desc = desc
    app.effect_images = effects
    app.approval_files = approvals
    app.remark = payload.remark || ''
  } else {
    const process_name = (payload.process_name || '').trim()
    if (!process_name) return { ok: false, msg: '请填写工序名称' }
    const ids = Array.isArray(payload.location_ids) ? payload.location_ids.map(String).filter(Boolean) : []
    if (payload.location_id && !ids.length) ids.push(String(payload.location_id))
    const part = String(payload.use_part || '').trim()
    if (!part && !ids.length) return { ok: false, msg: '请选择施工部位' }
    const briefing = String(payload.briefing_content || '').trim()
    if (!briefing) return { ok: false, msg: '请填写关键工序样板说明' }

    const photo_files = Array.isArray(payload.photo_files) ? payload.photo_files.filter(Boolean) : []
    const video_files = Array.isArray(payload.video_files) ? payload.video_files.filter(Boolean) : []
    const media_files = Array.isArray(payload.media_files)
      ? payload.media_files.map((m) => ({ ...m }))
      : []
    const doc_files = Array.isArray(payload.doc_files) ? payload.doc_files.filter(Boolean) : []

    app.process_name = process_name
    app.use_part = part
    app.location_id = ids[0] || String(payload.location_id || '')
    app.location_ids = ids
    app.briefing_content = briefing
    app.photo_files = photo_files
    app.video_files = video_files
    app.media_files = media_files
    app.doc_files = doc_files
    app.remark = payload.remark || ''
  }

  const approverRes = resolveSampleApprovers(payload, { requirePm: bizType === 'material' })
  if (!approverRes.ok) return approverRes
  app.supervisor_approver_user_id = approverRes.supervisor_approver_user_id
  app.supervisor_approver_name = approverRes.supervisor_approver_name
  app.supervisor_approver_post_label = approverRes.supervisor_approver_post_label
  if (bizType === 'material') {
    app.pm_approver_user_id = approverRes.pm_approver_user_id
    app.pm_approver_name = approverRes.pm_approver_name
    app.pm_approver_post_label = approverRes.pm_approver_post_label
  }

  app.status = 'in_approval'
  app.current_node = 'supervisor'
  app.submit_time = nowStr()
  app.finish_time = ''
  app.applicant_name = applicant_name

  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'submit',
    opinion: '撤回后重新提交',
    operator_name: applicant_name,
  })
  discardSampleTodos(bizType, applicationId)
  rememberSampleApprovers(project_id, app, { requirePm: bizType === 'material' })
  createSampleSupervisorTodo(buildTodoPayload(bizType, app))
  return { ok: true, data: app }
}

/** @deprecated 请使用 resubmitWithdrawnSample */
export function resubmitSample(bizType, applicationId, payload) {
  if (bizType && applicationId && payload) {
    return resubmitWithdrawnSample(bizType, applicationId, payload)
  }
  return { ok: false, msg: '请使用重新编辑提交已撤回单' }
}

function countByStatus(rows, status) {
  return rows.filter((a) => a.status === status).length
}

/** 指挥部质量看板：按项目汇总材料定样 + 工序样板 */
export function buildHqSampleStatsByProject() {
  return COC_PROJECT_OPTIONS.map((opt) => {
    const materials = store.materials.filter((a) => a.project_id === opt.id)
    const processes = store.processes.filter((a) => a.project_id === opt.id)
    const materialApproved = countByStatus(materials, 'approved')
    const processApproved = countByStatus(processes, 'approved')
    return {
      project_id: opt.id,
      project_name: opt.label,
      ledger_count: materialApproved + processApproved,
      material_approved: materialApproved,
      process_approved: processApproved,
      pending: 0,
      in_approval:
        countByStatus(materials, 'in_approval') +
        countByStatus(processes, 'in_approval') +
        countByStatus(materials, 'pending') +
        countByStatus(processes, 'pending'),
      rejected: countByStatus(materials, 'rejected') + countByStatus(processes, 'rejected'),
      withdrawn: countByStatus(materials, 'withdrawn') + countByStatus(processes, 'withdrawn'),
    }
  }).sort(
    (a, b) =>
      b.ledger_count - a.ledger_count || a.project_name.localeCompare(b.project_name, 'zh-CN'),
  )
}

export function buildHqSampleSummary() {
  const rows = buildHqSampleStatsByProject()
  return rows.reduce(
    (acc, row) => {
      acc.projectCount += 1
      acc.ledger_count += row.ledger_count
      acc.material_approved += row.material_approved
      acc.process_approved += row.process_approved
      acc.pending += row.pending
      acc.in_approval += row.in_approval
      acc.rejected += row.rejected
      acc.withdrawn += row.withdrawn
      return acc
    },
    {
      projectCount: 0,
      ledger_count: 0,
      material_approved: 0,
      process_approved: 0,
      pending: 0,
      in_approval: 0,
      rejected: 0,
      withdrawn: 0,
    },
  )
}

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
          title: a.sample_name || a.material_name,
          sample_name: a.sample_name || a.material_name,
          use_part: a.use_part,
          status: a.status,
          project_id: a.project_id,
          finish_time: a.finish_time,
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

export function listSelectableForInspect(
  projectId,
  { keyword = '', usePart = '', locationId = '', bizType = '' } = {},
) {
  const locId = String(locationId || '').trim()
  const part = String(usePart || '').trim().toLowerCase()
  const rows = []
  const pushMat = () => {
    store.materials
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          sample_id: a.application_id,
          sample_name: a.material_name,
          sample_category: '材料定样',
          biz_type: 'material',
          use_part: a.use_part || '',
          location_id: a.location_id || '',
          location_ids: Array.isArray(a.location_ids) ? [...a.location_ids] : [],
          brand_name: a.brand_name || '',
          finish_time: a.finish_time || '',
        })
      })
  }
  const pushProc = () => {
    store.processes
      .filter((a) => a.status === 'approved' && (!projectId || a.project_id === projectId))
      .forEach((a) => {
        rows.push({
          sample_id: a.application_id,
          sample_name: a.process_name,
          sample_category: '工序样板',
          biz_type: 'process',
          use_part: a.use_part || '',
          location_id: a.location_id || '',
          location_ids: Array.isArray(a.location_ids) ? [...a.location_ids] : [],
          brand_name: '',
          finish_time: a.finish_time || '',
        })
      })
  }
  if (!bizType || bizType === 'material') pushMat()
  if (!bizType || bizType === 'process') pushProc()

  const kw = String(keyword || '').trim().toLowerCase()
  return rows
    .filter((r) => {
      if (locId || part) {
        const ids = Array.isArray(r.location_ids) ? r.location_ids.map(String) : []
        if (r.location_id) ids.push(String(r.location_id))
        const idHit = locId ? ids.includes(locId) : false
        const partHit = part
          ? (r.use_part || '').toLowerCase().includes(part) ||
            part.includes((r.use_part || '').toLowerCase())
          : false
        if (!idHit && !partHit) return false
      }
      if (!kw) return true
      return (
        r.sample_id.toLowerCase().includes(kw) ||
        (r.sample_name || '').toLowerCase().includes(kw) ||
        (r.sample_category || '').toLowerCase().includes(kw) ||
        (r.use_part || '').toLowerCase().includes(kw)
      )
    })
    .sort((a, b) => (a.finish_time < b.finish_time ? 1 : -1))
}

export function submitMaterialApp(payload) {
  const project_id = payload.project_id
  const sample_name = String(payload.sample_name || payload.material_name || '').trim()
  const materialTypeRaw = payload.material_type
  const brand_name = String(payload.brand_name || '').trim()
  const manufacturer = String(payload.manufacturer || payload.supplier || '').trim()
  const sample_date = String(payload.sample_date || '').trim()
  const spec = String(payload.spec || payload.indicator_desc || '').trim()
  const unit_wbs_id = String(payload.unit_wbs_id || '').trim()
  const unit_name = String(payload.unit_name || '').trim()
  const use_part_wbs_id = String(payload.use_part_wbs_id || payload.location_id || '').trim()
  const use_part = String(payload.use_part || '').trim()
  const copy_from_application_id = String(payload.copy_from_application_id || '').trim()
  const remark = payload.remark || ''
  const applicant_name = payload.applicant_name || '当前用户'

  if (!project_id) return { ok: false, msg: '请选择项目' }
  if (!sample_name) return { ok: false, msg: '请填写样品名称' }
  if (!sample_date) return { ok: false, msg: '请选择送样日期' }
  if (!spec) return { ok: false, msg: '请填写规格（或技术参数）' }
  if (!materialTypeRaw || !['material', 'equipment'].includes(materialTypeRaw)) {
    return { ok: false, msg: '请选择材料类型' }
  }
  const material_type = normalizeMaterialType(materialTypeRaw)
  if (!brand_name) return { ok: false, msg: '请选择品牌' }
  if (!manufacturer) return { ok: false, msg: '请填写生产厂家' }
  if (!use_part_wbs_id && !use_part) return { ok: false, msg: '请选择使用部位' }
  if (!unit_name) return { ok: false, msg: '请选择使用部位以带出单位工程' }

  const photos = normalizeFileList(payload.sample_photos?.length ? payload.sample_photos : payload.effect_images)
  const signs = normalizeFileList(payload.sign_files?.length ? payload.sign_files : payload.approval_files)
  const certs = normalizeFileList(payload.certificate_files)
  if (!photos.length) return { ok: false, msg: '请至少上传 1 张样品照片' }
  if (!signs.length) return { ok: false, msg: '请至少上传 1 份材料设备送样定板报审签字附件' }
  if (!certs.length) return { ok: false, msg: '请至少上传 1 份样品出厂质量证明文件' }

  if (copy_from_application_id) {
    const origin = store.materials.find((a) => a.application_id === copy_from_application_id)
    if (!origin) return { ok: false, msg: '复制来源单不存在' }
    if (origin.status !== 'rejected') return { ok: false, msg: '仅可从已驳回单重新申报' }
    if (origin.project_id !== project_id) return { ok: false, msg: '复制来源单不属于本项目' }
  }

  const ids = []
  if (use_part_wbs_id) ids.push(use_part_wbs_id)
  else if (Array.isArray(payload.location_ids)) {
    payload.location_ids.map(String).filter(Boolean).forEach((id) => ids.push(id))
  }

  const approverRes = resolveSampleApprovers(payload, { requirePm: true })
  if (!approverRes.ok) return approverRes

  store.seq.m += 1
  const application_id = `MS-${String(store.seq.m).padStart(3, '0')}`
  const submit_time = nowStr()
  const app = {
    application_id,
    project_id,
    sample_name,
    material_name: sample_name,
    material_type,
    sample_date,
    spec,
    brand_name,
    manufacturer,
    supplier: manufacturer,
    unit_wbs_id,
    unit_name,
    use_part_wbs_id: use_part_wbs_id || ids[0] || '',
    use_part,
    location_id: use_part_wbs_id || ids[0] || '',
    location_ids: ids,
    indicator_desc: spec,
    sample_photos: photos,
    effect_images: photos,
    sign_files: signs,
    approval_files: signs,
    certificate_files: certs,
    copy_from_application_id,
    status: 'in_approval',
    current_node: 'supervisor',
    applicant_name,
    submit_time,
    finish_time: '',
    remark,
    supervisor_approver_user_id: approverRes.supervisor_approver_user_id,
    supervisor_approver_name: approverRes.supervisor_approver_name,
    supervisor_approver_post_label: approverRes.supervisor_approver_post_label,
    pm_approver_user_id: approverRes.pm_approver_user_id,
    pm_approver_name: approverRes.pm_approver_name,
    pm_approver_post_label: approverRes.pm_approver_post_label,
  }
  store.materials.unshift(app)
  rememberSampleApprovers(project_id, app, { requirePm: true })
  pushApproval({
    biz_type: 'material',
    application_id,
    node_code: 'applicant',
    action: 'submit',
    opinion: copy_from_application_id ? `从 ${copy_from_application_id} 重新申报` : '直接提交',
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
    location_id = '',
    location_ids = [],
    briefing_content,
    photo_files = [],
    video_files = [],
    media_files = [],
    doc_files = [],
    copy_from_application_id = '',
    remark = '',
    applicant_name = '当前用户',
  } = payload
  if (!project_id) return { ok: false, msg: '请选择项目' }
  if (!(process_name || '').trim()) return { ok: false, msg: '请填写工序名称' }
  const ids = Array.isArray(location_ids) ? location_ids.map(String).filter(Boolean) : []
  if (location_id && !ids.length) ids.push(String(location_id))
  const part = String(use_part || '').trim()
  if (!part && !ids.length) return { ok: false, msg: '请选择施工部位' }
  if (!(briefing_content || '').trim()) return { ok: false, msg: '请填写关键工序样板说明' }

  const copyId = String(copy_from_application_id || '').trim()
  if (copyId) {
    const origin = store.processes.find((a) => a.application_id === copyId)
    if (!origin) return { ok: false, msg: '复制来源单不存在' }
    if (origin.status !== 'rejected') return { ok: false, msg: '仅可从已驳回单复制新建' }
    if (origin.project_id !== project_id) return { ok: false, msg: '复制来源单不属于本项目' }
  }

  let photos = Array.isArray(photo_files) ? photo_files.map(String).filter(Boolean) : []
  let videos = Array.isArray(video_files) ? video_files.map(String).filter(Boolean) : []
  const media = (Array.isArray(media_files) ? media_files : [])
    .map((m) => ({
      name: String(m.name || '').trim(),
      kind: m.kind === 'video' ? 'video' : 'image',
    }))
    .filter((m) => m.name)
  if (media.length) {
    photos = media.filter((m) => m.kind === 'image').map((m) => m.name)
    videos = media.filter((m) => m.kind === 'video').map((m) => m.name)
  }
  const docs = Array.isArray(doc_files) ? doc_files.map(String).filter(Boolean) : []

  const approverRes = resolveSampleApprovers(payload, { requirePm: false })
  if (!approverRes.ok) return approverRes

  store.seq.p += 1
  const application_id = `PS-${String(store.seq.p).padStart(3, '0')}`
  const submit_time = nowStr()
  const app = {
    application_id,
    project_id,
    process_name: process_name.trim(),
    use_part: part,
    location_id: ids[0] || String(location_id || ''),
    location_ids: ids,
    briefing_content: briefing_content.trim(),
    photo_files: photos,
    video_files: videos,
    media_files: media.length
      ? media
      : [
          ...photos.map((name) => ({ name, kind: 'image' })),
          ...videos.map((name) => ({ name, kind: 'video' })),
        ],
    doc_files: docs,
    copy_from_application_id: copyId,
    status: 'in_approval',
    current_node: 'supervisor',
    applicant_name,
    submit_time,
    finish_time: '',
    remark: remark || '',
    supervisor_approver_user_id: approverRes.supervisor_approver_user_id,
    supervisor_approver_name: approverRes.supervisor_approver_name,
    supervisor_approver_post_label: approverRes.supervisor_approver_post_label,
  }
  store.processes.unshift(app)
  rememberSampleApprovers(project_id, app, { requirePm: false })
  pushApproval({
    biz_type: 'process',
    application_id,
    node_code: 'applicant',
    action: 'submit',
    opinion: copyId ? `从 ${copyId} 复制新建` : '直接提交',
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

export function supervisorApproveSample(bizType, applicationId, { action, opinion }) {
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '当前不在审批中（待监理审）节点' }
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
    if (bizType === 'process') {
      discardSampleTodos(bizType, applicationId)
      app.status = 'approved'
      app.current_node = 'none'
      app.finish_time = nowStr()
    } else {
      app.status = 'in_approval'
      app.current_node = 'pm'
      createSamplePmTodo(buildTodoPayload(bizType, app))
    }
  } else {
    finishSampleOpenTodos(bizType, applicationId, 'supervisor', '监理退回')
    discardSampleTodos(bizType, applicationId)
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = nowStr()
  }
  return { ok: true }
}

export function pmApproveSample(bizType, applicationId, { action, opinion }) {
  if (bizType === 'process') {
    return { ok: false, msg: '工序样板无需项目经理审批' }
  }
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
    app.finish_time = nowStr()
  } else {
    finishSampleOpenTodos(bizType, applicationId, 'pm', '终审退回')
    discardSampleTodos(bizType, applicationId)
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = nowStr()
  }
  return { ok: true }
}

/**
 * 材料定样对齐品牌报审：不支持撤回，已驳回请重新申报。
 * 工序样板：审批中（待监理审）仍可撤回留档。
 */
export function withdrawSampleApp(bizType, applicationId) {
  if (bizType === 'material') {
    return { ok: false, msg: '定样报审不支持撤回，已驳回请重新申报' }
  }
  const app = findApp(bizType, applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '仅审批中（待监理审）时可撤回' }
  }
  pushApproval({
    biz_type: bizType,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'withdraw',
    opinion: '申请人撤回',
    operator_name: app.applicant_name || '当前用户',
  })
  discardSampleTodos(bizType, applicationId)
  app.status = 'withdrawn'
  app.current_node = 'none'
  app.finish_time = nowStr()
  return { ok: true }
}

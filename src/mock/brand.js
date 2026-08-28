/**
 * 品牌报审 Mock — 对齐 research-brand V2.0
 * 无品牌库/材料规格库；台账 BRAND_LEDGER 独立只读，审批通过后写入
 */
import { reactive } from 'vue'
import { nowStr } from '../utils/datetime.js'
import { getProjectLabel } from './laborRealName.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { getProjectDetail, displayProjectManagerName } from './projectBasicInfo.js'
import {
  createBrandPmTodo,
  createBrandSupervisorTodo,
  discardBrandTodos,
} from './personalCenter.js'
import { formatApproverCandidateLabel } from '../utils/approverDisplay'
import { parseOneContact } from '../utils/contactValue.js'

export const MATERIAL_TYPE = { material: '材料', equipment: '设备' }
/** 业务状态：待审批=待监理审；审批中=监理已通过、待项目经理审 */
export const STATUS_LABEL = {
  pending: '待审批',
  in_approval: '审批中',
  approved: '已通过',
  rejected: '已驳回',
  withdrawn: '已撤回',
}

export function statusLabel(status) {
  return STATUS_LABEL[status] || status || '—'
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
export const ROLE_TAG = { primary: '主选', alternate: '备选' }

export const ATTACH_TYPE_KEYS = Object.keys(ATTACH_TYPE)

/** 项目级审批人选人池（演示：各项目共用同一组织范围名单） */
export const BRAND_PROJECT_USERS = [
  { user_id: 'u-jl-01', name: '李总监', phone: '13800001001', org: '深圳某监理有限公司', post_label: '总监理工程师' },
  { user_id: 'u-jl-02', name: '王代总', phone: '13800001002', org: '深圳某监理有限公司', post_label: '总监理工程师代表' },
  { user_id: 'u-jl-03', name: '赵专监', phone: '13800001003', org: '深圳某监理有限公司', post_label: '专业监理工程师' },
  { user_id: 'u-jl-04', name: '钱专监', phone: '13800001004', org: '深圳某监理有限公司', post_label: '专业监理工程师' },
  { user_id: 'u-pm-01', name: '王建国', phone: '13800138001', org: '机场建设指挥部', post_label: '项目经理' },
  { user_id: 'u-pm-02', name: '陈项目经理', phone: '13800007001', org: '中建某局机场项目部', post_label: '项目经理' },
  { user_id: 'u-pm-03', name: '郑经理', phone: '13300133000', org: '机场建设指挥部', post_label: '项目经理' },
  { user_id: 'u-pm-04', name: '裴云龙', phone: '18588955314', org: '机场建设指挥部', post_label: '项目经理' },
  { user_id: 'u-pm-05', name: '吴建设', phone: '13800004001', org: '机场建设指挥部', post_label: '项目经理' },
]

/** 按项目记忆上次审批人 */
const approverMemoryByProject = reactive({
  'p-000': {
    supervisor_user_id: 'u-jl-01',
    supervisor_name: '李总监',
    pm_user_id: 'u-pm-01',
    pm_name: '王建国',
    updated_at: '2026-07-20 11:00:00',
  },
})

function parsePortraitContact(raw) {
  return parseOneContact(raw)
}

export function listBrandProjectUsers(projectId) {
  if (!projectId) return []
  return BRAND_PROJECT_USERS.map((u) => ({ ...u }))
}

export function findBrandProjectUser(userId) {
  return BRAND_PROJECT_USERS.find((u) => u.user_id === userId) || null
}

export function formatBrandProjectUserLabel(user) {
  return formatApproverCandidateLabel(user)
}

/** 提交时快照审批人组织/岗位；详情与待办优先读快照 */
export function formatBrandApproverSnapshot(app, role) {
  if (!app) return '—'
  const isSupervisor = role === 'supervisor'
  const name = isSupervisor ? app.supervisor_approver_name : app.pm_approver_name
  const org = isSupervisor ? app.supervisor_approver_org : app.pm_approver_org
  const post = isSupervisor ? app.supervisor_approver_post_label : app.pm_approver_post_label
  if (org || post) return formatApproverOptionLabel(name, org, post)
  const userId = isSupervisor ? app.supervisor_approver_user_id : app.pm_approver_user_id
  const user = findBrandProjectUser(userId)
  if (user) return formatBrandProjectUserLabel(user)
  return name || '—'
}

function pickApproverSnapshot(user) {
  return {
    org: user?.org || '',
    post_label: user?.post_label || '',
  }
}

function applyApproverSnapshotsToApp(app, checked) {
  app.supervisor_approver_user_id = checked.supervisor_approver_user_id
  app.supervisor_approver_name = checked.supervisor_approver_name
  app.supervisor_approver_org = checked.supervisor_approver_org
  app.supervisor_approver_post_label = checked.supervisor_approver_post_label
  app.pm_approver_user_id = checked.pm_approver_user_id
  app.pm_approver_name = checked.pm_approver_name
  app.pm_approver_org = checked.pm_approver_org
  app.pm_approver_post_label = checked.pm_approver_post_label
}

export function rememberBrandProjectApprovers(
  projectId,
  supervisorUserId,
  supervisorName,
  pmUserId,
  pmName,
) {
  saveApproverMemory(projectId, supervisorUserId, supervisorName, pmUserId, pmName)
}

export function resolvePmUserFromPortrait(projectId) {
  const detail = getProjectDetail(projectId)
  if (!detail) return null
  const contact = parsePortraitContact(detail.projectManagerContact)
  const name = contact.name || displayProjectManagerName(detail)
  const phone = contact.phone
  if (!name) return null
  const hit = BRAND_PROJECT_USERS.find((u) => {
    if (phone) return u.name === name && u.phone === phone
    return u.name === name
  })
  return hit ? { user_id: hit.user_id, name: hit.name, phone: hit.phone } : null
}

export function getApproverMemory(projectId) {
  if (!projectId) return null
  return approverMemoryByProject[projectId] || null
}

function saveApproverMemory(projectId, supervisorUserId, supervisorName, pmUserId, pmName) {
  if (!projectId) return
  approverMemoryByProject[projectId] = {
    supervisor_user_id: supervisorUserId,
    supervisor_name: supervisorName,
    pm_user_id: pmUserId,
    pm_name: pmName,
    updated_at: nowStr(),
  }
}

export function resolveDefaultApprovers(projectId) {
  const empty = {
    supervisor_approver_user_id: '',
    supervisor_approver_name: '',
    pm_approver_user_id: '',
    pm_approver_name: '',
  }
  if (!projectId) return empty
  const mem = getApproverMemory(projectId)
  if (mem?.supervisor_user_id && mem?.pm_user_id) {
    return {
      supervisor_approver_user_id: mem.supervisor_user_id,
      supervisor_approver_name: mem.supervisor_name || '',
      pm_approver_user_id: mem.pm_user_id,
      pm_approver_name: mem.pm_name || '',
    }
  }
  const pm = resolvePmUserFromPortrait(projectId)
  return {
    supervisor_approver_user_id: '',
    supervisor_approver_name: '',
    pm_approver_user_id: pm?.user_id || '',
    pm_approver_name: pm?.name || '',
  }
}

/** 新建备选时的附件勾选槽位（勾选后可上传多个文件） */
export function createEmptyAttachSlots() {
  return ATTACH_TYPE_KEYS.map((attach_type) => ({
    attach_type,
    is_checked: false,
    files: [],
  }))
}

export function createEmptyCandidate() {
  return {
    ledger_id: '',
    brand_name: '',
    manufacturer: '',
    remark: '',
    is_primary: false,
    attachSlots: createEmptyAttachSlots(),
  }
}

const store = reactive({
  ledger: [
    {
      ledger_id: 'BL-001',
      project_id: 'p-000',
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      material_name: '混凝土',
      material_type: 'material',
      role_tag: 'primary',
      application_id: 'PP-2026-001',
      use_part: '主体结构',
      updated_at: '2026-07-12 16:00:00',
    },
    {
      ledger_id: 'BL-002',
      project_id: 'p-000',
      brand_name: '华润',
      manufacturer: '华润水泥控股有限公司',
      material_name: '混凝土',
      material_type: 'material',
      role_tag: 'alternate',
      application_id: 'PP-2026-001',
      use_part: '主体结构',
      updated_at: '2026-07-12 16:00:00',
    },
    {
      ledger_id: 'BL-003',
      project_id: 'p-000',
      brand_name: '台泥',
      manufacturer: '台湾水泥股份有限公司',
      material_name: '混凝土',
      material_type: 'material',
      role_tag: 'alternate',
      application_id: 'PP-2026-001',
      use_part: '主体结构',
      updated_at: '2026-07-12 16:00:00',
    },
    {
      ledger_id: 'BL-004',
      project_id: 'p-011',
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      material_name: '混凝土',
      material_type: 'material',
      role_tag: 'primary',
      application_id: 'PP-2026-005',
      use_part: '桩基',
      updated_at: '2026-07-09 17:20:00',
    },
    {
      ledger_id: 'BL-005',
      project_id: 'p-011',
      brand_name: '华润',
      manufacturer: '华润水泥控股有限公司',
      material_name: '混凝土',
      material_type: 'material',
      role_tag: 'alternate',
      application_id: 'PP-2026-005',
      use_part: '桩基',
      updated_at: '2026-07-09 17:20:00',
    },
    {
      ledger_id: 'BL-006',
      project_id: 'p-011',
      brand_name: '台泥',
      manufacturer: '台湾水泥股份有限公司',
      material_name: '混凝土',
      material_type: 'material',
      role_tag: 'alternate',
      application_id: 'PP-2026-005',
      use_part: '桩基',
      updated_at: '2026-07-09 17:20:00',
    },
    {
      ledger_id: 'BL-007',
      project_id: 'p-000',
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      material_name: '砂浆',
      material_type: 'material',
      role_tag: 'primary',
      application_id: 'PP-2026-001',
      use_part: '砌体',
      updated_at: '2026-07-12 16:05:00',
    },
    {
      ledger_id: 'BL-008',
      project_id: 'p-000',
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      material_name: '防水卷材',
      material_type: 'material',
      role_tag: 'primary',
      application_id: 'PP-2026-007',
      use_part: '屋面',
      updated_at: '2026-07-14 10:00:00',
    },
    {
      ledger_id: 'BL-009',
      project_id: 'p-000',
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      material_name: '防水涂料',
      material_type: 'material',
      role_tag: 'alternate',
      application_id: 'PP-2026-007',
      use_part: '厨卫',
      updated_at: '2026-07-14 10:00:00',
    },
    {
      ledger_id: 'BL-EQ-001',
      project_id: 'p-000',
      brand_name: '施耐德',
      manufacturer: '施耐德电气（中国）有限公司',
      material_name: '低压开关柜',
      material_type: 'equipment',
      role_tag: 'primary',
      application_id: 'PP-2026-008',
      use_part: '配电房',
      updated_at: '2026-07-15 11:00:00',
    },
    {
      ledger_id: 'BL-EQ-002',
      project_id: 'p-000',
      brand_name: '正泰',
      manufacturer: '正泰电器股份有限公司',
      material_name: '配电箱',
      material_type: 'equipment',
      role_tag: 'alternate',
      application_id: 'PP-2026-008',
      use_part: '配电房',
      updated_at: '2026-07-15 11:00:00',
    },
  ],
  applications: [
    {
      application_id: 'PP-2026-001',
      project_id: 'p-000',
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
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
    {
      application_id: 'PP-2026-002',
      project_id: 'p-000',
      material_name: '防水卷材',
      material_type: 'material',
      use_part: '屋面',
      status: 'pending',
      current_node: 'supervisor',
      applicant_user_id: 'u-contractor',
      applicant_name: '张工',
      submit_time: '2026-07-20 11:00:00',
      finish_time: '',
      remark: '',
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
    {
      application_id: 'PP-2026-003',
      project_id: 'p-000',
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
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
    {
      application_id: 'PP-2026-004',
      project_id: 'p-001',
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
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
    {
      application_id: 'PP-2026-005',
      project_id: 'p-011',
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
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
    {
      application_id: 'PP-2026-006',
      project_id: 'p-000',
      material_name: '给水管',
      material_type: 'material',
      use_part: '生活区',
      status: 'withdrawn',
      current_node: 'none',
      applicant_user_id: 'u-contractor',
      applicant_name: '张工',
      submit_time: '2026-07-05 10:00:00',
      finish_time: '2026-07-05 14:00:00',
      remark: '',
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
    {
      application_id: 'PP-2026-007',
      project_id: 'p-000',
      material_name: '防水卷材',
      material_type: 'material',
      use_part: '屋面',
      status: 'approved',
      current_node: 'none',
      applicant_user_id: 'u-contractor',
      applicant_name: '张工',
      submit_time: '2026-07-12 09:00:00',
      finish_time: '2026-07-14 10:00:00',
      remark: '',
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
    {
      application_id: 'PP-2026-008',
      project_id: 'p-000',
      material_name: '低压开关柜',
      material_type: 'equipment',
      use_part: '配电房',
      status: 'approved',
      current_node: 'none',
      applicant_user_id: 'u-contractor',
      applicant_name: '张工',
      submit_time: '2026-07-13 09:10:00',
      finish_time: '2026-07-15 11:00:00',
      remark: '',
      copy_from_application_id: '',
    supervisor_approver_user_id: 'u-jl-01',
    supervisor_approver_name: '李总监',
    pm_approver_user_id: 'u-pm-01',
    pm_approver_name: '王建国',
    },
  ],
  candidates: [
    {
      candidate_id: 'C-001',
      application_id: 'PP-2026-001',
      ledger_id: 'BL-001',
      seq_no: 1,
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      remark: '市场占有率高，供货稳定',
      is_primary: true,
    },
    {
      candidate_id: 'C-002',
      application_id: 'PP-2026-001',
      ledger_id: '',
      seq_no: 2,
      brand_name: '华润',
      manufacturer: '华润水泥控股有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-003',
      application_id: 'PP-2026-001',
      ledger_id: '',
      seq_no: 3,
      brand_name: '台泥',
      manufacturer: '台湾水泥股份有限公司',
      remark: '备选对比',
      is_primary: false,
    },
    {
      candidate_id: 'C-011',
      application_id: 'PP-2026-002',
      ledger_id: '',
      seq_no: 1,
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      remark: '合同推荐品牌，样品已送检',
      is_primary: true,
    },
    {
      candidate_id: 'C-012',
      application_id: 'PP-2026-002',
      ledger_id: '',
      seq_no: 2,
      brand_name: '科顺',
      manufacturer: '科顺防水科技股份有限公司',
      remark: '价格适中',
      is_primary: false,
    },
    {
      candidate_id: 'C-013',
      application_id: 'PP-2026-002',
      ledger_id: '',
      seq_no: 3,
      brand_name: '雨中情',
      manufacturer: '雨中情防水技术集团股份公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-021',
      application_id: 'PP-2026-003',
      ledger_id: '',
      seq_no: 1,
      brand_name: '沙钢',
      manufacturer: '江苏沙钢集团有限公司',
      remark: '工期保障较好',
      is_primary: true,
    },
    {
      candidate_id: 'C-022',
      application_id: 'PP-2026-003',
      ledger_id: '',
      seq_no: 2,
      brand_name: '河钢',
      manufacturer: '河钢集团有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-023',
      application_id: 'PP-2026-003',
      ledger_id: '',
      seq_no: 3,
      brand_name: '宝钢',
      manufacturer: '中国宝武钢铁集团有限公司',
      remark: '质量口碑佳',
      is_primary: false,
    },
    {
      candidate_id: 'C-031',
      application_id: 'PP-2026-004',
      ledger_id: '',
      seq_no: 1,
      brand_name: '正泰',
      manufacturer: '正泰电气股份有限公司',
      remark: '',
      is_primary: true,
    },
    {
      candidate_id: 'C-032',
      application_id: 'PP-2026-004',
      ledger_id: '',
      seq_no: 2,
      brand_name: '施耐德',
      manufacturer: '施耐德电气',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-033',
      application_id: 'PP-2026-004',
      ledger_id: '',
      seq_no: 3,
      brand_name: 'ABB',
      manufacturer: 'ABB集团',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-041',
      application_id: 'PP-2026-005',
      ledger_id: 'BL-004',
      seq_no: 1,
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      remark: '',
      is_primary: true,
    },
    {
      candidate_id: 'C-042',
      application_id: 'PP-2026-005',
      ledger_id: '',
      seq_no: 2,
      brand_name: '华润',
      manufacturer: '华润水泥控股有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-043',
      application_id: 'PP-2026-005',
      ledger_id: '',
      seq_no: 3,
      brand_name: '台泥',
      manufacturer: '台湾水泥股份有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-051',
      application_id: 'PP-2026-006',
      ledger_id: '',
      seq_no: 1,
      brand_name: '联塑',
      manufacturer: '中国联塑集团控股有限公司',
      remark: '',
      is_primary: true,
    },
    {
      candidate_id: 'C-052',
      application_id: 'PP-2026-006',
      ledger_id: '',
      seq_no: 2,
      brand_name: '日丰',
      manufacturer: '日丰企业集团有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-053',
      application_id: 'PP-2026-006',
      ledger_id: '',
      seq_no: 3,
      brand_name: '伟星',
      manufacturer: '伟星新材股份有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-071',
      application_id: 'PP-2026-007',
      ledger_id: 'BL-008',
      seq_no: 1,
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      remark: '',
      is_primary: true,
    },
    {
      candidate_id: 'C-072',
      application_id: 'PP-2026-007',
      ledger_id: '',
      seq_no: 2,
      brand_name: '科顺',
      manufacturer: '科顺防水科技股份有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-073',
      application_id: 'PP-2026-007',
      ledger_id: '',
      seq_no: 3,
      brand_name: '雨中情',
      manufacturer: '雨中情防水技术集团股份公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-081',
      application_id: 'PP-2026-008',
      ledger_id: 'BL-EQ-001',
      seq_no: 1,
      brand_name: '施耐德',
      manufacturer: '施耐德电气（中国）有限公司',
      remark: '',
      is_primary: true,
    },
    {
      candidate_id: 'C-082',
      application_id: 'PP-2026-008',
      ledger_id: 'BL-EQ-002',
      seq_no: 2,
      brand_name: '正泰',
      manufacturer: '正泰电器股份有限公司',
      remark: '',
      is_primary: false,
    },
    {
      candidate_id: 'C-083',
      application_id: 'PP-2026-008',
      ledger_id: '',
      seq_no: 3,
      brand_name: '西门子',
      manufacturer: '西门子（中国）有限公司',
      remark: '',
      is_primary: false,
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
      opinion: '同意报审，全部品牌写入台账',
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
    {
      record_id: 'AR-005',
      application_id: 'PP-2026-006',
      node_code: 'applicant',
      action: 'withdraw',
      opinion: '申请人撤回',
      operator_user_id: 'u-contractor',
      operator_name: '张工',
      operate_time: '2026-07-05 14:00:00',
    },
    {
      record_id: 'AR-006',
      application_id: 'PP-2026-005',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '资料齐全，同意',
      operator_user_id: 'u-supervisor',
      operator_name: '王监理',
      operate_time: '2026-07-09 09:00:00',
    },
    {
      record_id: 'AR-007',
      application_id: 'PP-2026-005',
      node_code: 'pm',
      action: 'agree',
      opinion: '同意报审，全部品牌写入台账',
      operator_user_id: 'u-pm',
      operator_name: '赵经理',
      operate_time: '2026-07-09 17:20:00',
    },
    {
      record_id: 'AR-008',
      application_id: 'PP-2026-007',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '同意报审',
      operator_user_id: 'u-supervisor',
      operator_name: '王监理',
      operate_time: '2026-07-13 10:00:00',
    },
    {
      record_id: 'AR-009',
      application_id: 'PP-2026-007',
      node_code: 'pm',
      action: 'agree',
      opinion: '同意，全部品牌写入台账',
      operator_user_id: 'u-pm',
      operator_name: '赵经理',
      operate_time: '2026-07-14 10:00:00',
    },
    {
      record_id: 'AR-010',
      application_id: 'PP-2026-008',
      node_code: 'supervisor',
      action: 'agree',
      opinion: '设备品牌符合合同约定',
      operator_user_id: 'u-supervisor',
      operator_name: '王监理',
      operate_time: '2026-07-14 15:00:00',
    },
    {
      record_id: 'AR-011',
      application_id: 'PP-2026-008',
      node_code: 'pm',
      action: 'agree',
      opinion: '同意报审，全部品牌写入台账',
      operator_user_id: 'u-pm',
      operator_name: '赵经理',
      operate_time: '2026-07-15 11:00:00',
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
  seq: { app: 16, cand: 107, ledger: 9, ar: 18, att: 8 },
})

function ledgerUniqueKey(projectId, brandName, manufacturer, materialName) {
  return [
    projectId,
    (brandName || '').trim(),
    (manufacturer || '').trim(),
    (materialName || '').trim(),
  ].join('\0')
}

function upsertLedgerFromCandidate(app, candidate) {
  const key = ledgerUniqueKey(
    app.project_id,
    candidate.brand_name,
    candidate.manufacturer,
    app.material_name,
  )
  const role_tag = candidate.is_primary ? 'primary' : 'alternate'
  const now = nowStr()
  const existing = store.ledger.find(
    (row) =>
      ledgerUniqueKey(row.project_id, row.brand_name, row.manufacturer, row.material_name) === key,
  )
  if (existing) {
    Object.assign(existing, {
      material_type: app.material_type,
      role_tag,
      application_id: app.application_id,
      use_part: app.use_part || '',
      updated_at: now,
    })
    return existing
  }
  store.seq.ledger += 1
  const row = {
    ledger_id: `BL-${String(store.seq.ledger).padStart(3, '0')}`,
    project_id: app.project_id,
    brand_name: candidate.brand_name.trim(),
    manufacturer: candidate.manufacturer.trim(),
    material_name: app.material_name.trim(),
    material_type: app.material_type,
    role_tag,
    application_id: app.application_id,
    use_part: app.use_part || '',
    updated_at: now,
  }
  store.ledger.push(row)
  return row
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

/** 材料/设备名称去首尾空格（唯一键比较口径） */
export function normalizeBrandMaterialName(name) {
  return String(name || '').trim()
}

/**
 * 查找本项目已通过报审单中与材料名 trim 后相同的记录（重复报审提示，不拦截提交）
 * @param {string} projectId
 * @param {string} materialName
 * @returns {{ application_id: string, material_name: string, submit_time: string }[]}
 */
export function findApprovedDuplicateMaterialApplications(projectId, materialName) {
  const normalized = normalizeBrandMaterialName(materialName)
  if (!projectId || !normalized) return []
  return store.applications
    .filter(
      (a) =>
        a.project_id === projectId &&
        a.status === 'approved' &&
        normalizeBrandMaterialName(a.material_name) === normalized,
    )
    .map((a) => ({
      application_id: a.application_id,
      material_name: a.material_name,
      submit_time: a.submit_time,
    }))
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

/** 品牌台账：按台账行展示（非按报审单） */
export function listLedger(projectId, { keyword = '' } = {}) {
  let rows = [...store.ledger]
  if (projectId) rows = rows.filter((r) => r.project_id === projectId)
  const kw = keyword.trim()
  if (kw) {
    rows = rows.filter((r) =>
      `${r.brand_name}${r.manufacturer}${r.material_name}${r.application_id}${r.use_part}`.includes(kw),
    )
  }
  return rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
}

/** 台账联想：按台账行返回（同品牌不同材料为多条，不合并） */
export function searchLedgerBrands(keyword = '', projectId = '', { materialType = '' } = {}) {
  if (!projectId) return []
  const kw = keyword.trim()
  let rows = store.ledger.filter((r) => r.project_id === projectId)
  if (materialType) {
    rows = rows.filter((r) => (r.material_type || 'material') === materialType)
  }
  if (kw) {
    rows = rows.filter((r) => `${r.brand_name}${r.manufacturer}${r.material_name}`.includes(kw))
  }
  const map = new Map()
  for (const row of rows) {
    const key = `${row.brand_name.trim()}\0${row.manufacturer.trim()}\0${row.material_name.trim()}`
    if (map.has(key)) continue
    map.set(key, {
      ledger_id: row.ledger_id,
      brand_name: row.brand_name,
      manufacturer: row.manufacturer,
      material_name: row.material_name,
      material_type: row.material_type,
      label: `${row.brand_name} · ${row.manufacturer} · ${row.material_name}`,
    })
  }
  return [...map.values()].slice(0, 40)
}

export function buildHqBrandApprovalStatsByProject() {
  return COC_PROJECT_OPTIONS.map((opt) => {
    const apps = listApplications(opt.id)
    const count = (status) => apps.filter((a) => a.status === status).length
    return {
      project_id: opt.id,
      project_name: opt.label,
      total: apps.length,
      pending: count('pending'),
      in_approval: count('in_approval'),
      approved: count('approved'),
      rejected: count('rejected'),
      withdrawn: count('withdrawn'),
      ledger_count: listLedger(opt.id).length,
    }
  }).sort((a, b) => b.total - a.total || a.project_name.localeCompare(b.project_name, 'zh-CN'))
}

export function buildHqBrandApprovalSummary() {
  const rows = buildHqBrandApprovalStatsByProject()
  return rows.reduce(
    (acc, row) => {
      acc.projectCount += 1
      acc.total += row.total
      acc.pending += row.pending
      acc.in_approval += row.in_approval
      acc.approved += row.approved
      acc.rejected += row.rejected
      acc.withdrawn += row.withdrawn
      acc.ledger_count += row.ledger_count
      return acc
    },
    {
      projectCount: 0,
      total: 0,
      pending: 0,
      in_approval: 0,
      approved: 0,
      rejected: 0,
      withdrawn: 0,
      ledger_count: 0,
    },
  )
}

export function buildAttachSlotsFromRecords(records = []) {
  const byType = new Map()
  for (const r of records || []) {
    if (!r?.attach_type) continue
    if (!byType.has(r.attach_type)) byType.set(r.attach_type, [])
    byType.get(r.attach_type).push({
      file_name: r.file_name || '',
      file_url: r.file_url || '',
      attachment_id: r.attachment_id || '',
    })
  }
  return ATTACH_TYPE_KEYS.map((attach_type) => {
    const files = (byType.get(attach_type) || []).filter((f) => (f.file_name || '').trim())
    return {
      attach_type,
      is_checked: files.length > 0,
      files,
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
    specs: [],
    candidates,
    approvals: store.approvals
      .filter((r) => r.application_id === applicationId)
      .sort((a, b) => (a.operate_time > b.operate_time ? 1 : -1)),
    attachments,
  }
}

export function resolveBrandTodoAssigneeUserId(todo) {
  if (todo?.assigneeUserId) return todo.assigneeUserId
  if (!todo?.brandApplicationId) return ''
  const app = store.applications.find((a) => a.application_id === todo.brandApplicationId)
  if (!app) return ''
  if (todo.brandNode === 'pm') return app.pm_approver_user_id || ''
  return app.supervisor_approver_user_id || ''
}

export function paginateBrandRows(rows, page = 1, pageSize = 20) {
  const safePage = Math.max(1, Number(page) || 1)
  const safeSize = Math.max(1, Number(pageSize) || 20)
  const total = rows.length
  const start = (safePage - 1) * safeSize
  return {
    total,
    items: rows.slice(start, start + safeSize),
  }
}

function assertBrandApprovalOperator(app, node, operatorUserId) {
  const expected =
    node === 'pm' ? app.pm_approver_user_id : app.supervisor_approver_user_id
  const label = node === 'pm' ? '项目经理审批人' : '监理单位审批人'
  if (!expected) return { ok: false, msg: `未配置${label}` }
  if (!operatorUserId || operatorUserId !== expected) {
    return { ok: false, msg: `当前用户不是本单指定的${label}，无法办理` }
  }
  return { ok: true }
}

function buildBrandTodoPayload(app) {
  const detail = getApplicationDetail(app.application_id)
  const candidates = detail?.candidates || []
  const primary = candidates.find((c) => c.is_primary)
  const alternates = candidates.filter((c) => !c.is_primary)
  const brandNode = app.current_node === 'pm' ? 'pm' : 'supervisor'
  return {
    applicationId: app.application_id,
    brandNode,
    assigneeUserId:
      brandNode === 'pm' ? app.pm_approver_user_id || '' : app.supervisor_approver_user_id || '',
    materialName: app.material_name,
    materialType: MATERIAL_TYPE[app.material_type] || app.material_type,
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
      is_primary: !!c.is_primary,
      ledger_id: c.ledger_id || '',
    })),
    primaryBrand: primary?.brand_name || '',
    alternateBrands: alternates.map((c) => c.brand_name).join('、'),
    supervisorTime: nowStr(),
    supervisorName: app.supervisor_approver_name || '监理用户',
    assigneeName:
      app.current_node === 'pm'
        ? app.pm_approver_name || '项目经理'
        : app.supervisor_approver_name || '监理用户',
    pmApproverName: app.pm_approver_name || '项目经理',
  }
}

function validateCandidates(candidates) {
  const filled = candidates.filter(
    (c) => (c.brand_name || '').trim() && (c.manufacturer || '').trim(),
  )
  const primaryCount = filled.filter((c) => c.is_primary).length
  const alternateCount = filled.filter((c) => !c.is_primary).length
  if (primaryCount !== 1) return { ok: false, msg: '须恰好标记 1 个主选品牌' }
  if (alternateCount < 2) return { ok: false, msg: '备选品牌至少 2 条' }
  return { ok: true, data: filled }
}

export function buildCopyPayloadFromRejected(applicationId) {
  const detail = getApplicationDetail(applicationId)
  if (!detail) return null
  if (detail.app.status !== 'rejected') return null
  return {
    material_name: detail.app.material_name,
    material_type: detail.app.material_type,
    use_part: detail.app.use_part || '',
    copy_from_application_id: applicationId,
    supervisor_approver_user_id: detail.app.supervisor_approver_user_id || '',
    supervisor_approver_name: detail.app.supervisor_approver_name || '',
    pm_approver_user_id: detail.app.pm_approver_user_id || '',
    pm_approver_name: detail.app.pm_approver_name || '',
    candidates: detail.candidates.map((c) => ({
      ledger_id: '',
      brand_name: c.brand_name,
      manufacturer: c.manufacturer,
      remark: c.remark || '',
      is_primary: !!c.is_primary,
      attachSlots: buildAttachSlotsFromRecords(c.attachments),
    })),
  }
}

/** 已撤回原单重新编辑预填（保留 ledger_id） */
export function buildReEditPayloadFromWithdrawn(applicationId) {
  const detail = getApplicationDetail(applicationId)
  if (!detail) return null
  if (detail.app.status !== 'withdrawn') return null
  return {
    application_id: applicationId,
    material_name: detail.app.material_name,
    material_type: detail.app.material_type,
    use_part: detail.app.use_part || '',
    remark: detail.app.remark || '',
    supervisor_approver_user_id: detail.app.supervisor_approver_user_id || '',
    supervisor_approver_name: detail.app.supervisor_approver_name || '',
    pm_approver_user_id: detail.app.pm_approver_user_id || '',
    pm_approver_name: detail.app.pm_approver_name || '',
    candidates: detail.candidates.map((c) => ({
      ledger_id: c.ledger_id || '',
      brand_name: c.brand_name,
      manufacturer: c.manufacturer,
      remark: c.remark || '',
      is_primary: !!c.is_primary,
      attachSlots: buildAttachSlotsFromRecords(c.attachments),
    })),
  }
}

function replaceBrandCandidates(application_id, project_id, validCandidates) {
  const oldCandIds = store.candidates
    .filter((c) => c.application_id === application_id)
    .map((c) => c.candidate_id)
  store.attachments = store.attachments.filter((a) => !oldCandIds.includes(a.candidate_id))
  store.candidates = store.candidates.filter((c) => c.application_id !== application_id)

  validCandidates.forEach((c, i) => {
    store.seq.cand += 1
    const candidate_id = `C-${String(store.seq.cand).padStart(3, '0')}`
    store.candidates.push({
      candidate_id,
      application_id,
      ledger_id: c.ledger_id || '',
      seq_no: i + 1,
      brand_name: c.brand_name.trim(),
      manufacturer: c.manufacturer.trim(),
      remark: (c.remark || '').trim(),
      is_primary: !!c.is_primary,
    })
    const slots = Array.isArray(c.attachSlots) ? c.attachSlots : []
    slots.forEach((slot) => {
      if (!slot.is_checked) return
      const files = Array.isArray(slot.files) ? slot.files : []
      files.forEach((f) => {
        const name = (f.file_name || '').trim()
        if (!name) return
        store.seq.att += 1
        store.attachments.push({
          attachment_id: `BA-${String(store.seq.att).padStart(3, '0')}`,
          candidate_id,
          attach_type: slot.attach_type,
          is_checked: true,
          file_name: name,
          file_url: f.file_url || `#mock/${name}`,
        })
      })
    })
  })
  void project_id
}

function validateBrandSubmitPayload(payload) {
  const project_id = payload.project_id
  const material_name = (payload.material_name || '').trim()
  const material_type = payload.material_type
  const candidates = payload.candidates || []
  if (!project_id) return { ok: false, msg: '请切换到具体项目' }
  if (!material_name || !material_type) return { ok: false, msg: '材料名称与材料类型必填' }

  const candCheck = validateCandidates(candidates)
  if (!candCheck.ok) return candCheck
  const validCandidates = candCheck.data

  for (const c of validCandidates) {
    if (c.ledger_id) {
      const ledger = store.ledger.find(
        (r) => r.ledger_id === c.ledger_id && r.project_id === project_id,
      )
      if (!ledger) {
        return { ok: false, msg: `台账品牌「${c.brand_name}」不可用，请删除后重选` }
      }
    }
    const slots = Array.isArray(c.attachSlots) ? c.attachSlots : []
    for (const slot of slots) {
      const files = Array.isArray(slot.files) ? slot.files.filter((f) => (f.file_name || '').trim()) : []
      if (slot.is_checked && !files.length) {
        return {
          ok: false,
          msg: `品牌「${c.brand_name}」已勾选「${ATTACH_TYPE[slot.attach_type] || '附件'}」，请至少上传 1 个文件`,
        }
      }
    }
  }
  const supervisor_approver_user_id = String(payload.supervisor_approver_user_id || '').trim()
  const pm_approver_user_id = String(payload.pm_approver_user_id || '').trim()
  if (!supervisor_approver_user_id) return { ok: false, msg: '请选择监理单位审批人' }
  if (!pm_approver_user_id) return { ok: false, msg: '请选择项目经理审批人' }
  const supervisorUser = findBrandProjectUser(supervisor_approver_user_id)
  const pmUser = findBrandProjectUser(pm_approver_user_id)
  if (!supervisorUser) return { ok: false, msg: '监理单位审批人不在本项目可选范围内' }
  if (!pmUser) return { ok: false, msg: '项目经理审批人不在本项目可选范围内' }
  const supervisor_approver_name =
    String(payload.supervisor_approver_name || '').trim() || supervisorUser.name
  const pm_approver_name = String(payload.pm_approver_name || '').trim() || pmUser.name
  const supSnap = pickApproverSnapshot(supervisorUser)
  const pmSnap = pickApproverSnapshot(pmUser)

  return {
    ok: true,
    project_id,
    material_name,
    material_type,
    validCandidates,
    supervisor_approver_user_id,
    supervisor_approver_name,
    supervisor_approver_org: supSnap.org,
    supervisor_approver_post_label: supSnap.post_label,
    pm_approver_user_id,
    pm_approver_name,
    pm_approver_org: pmSnap.org,
    pm_approver_post_label: pmSnap.post_label,
  }
}

function finalizeBrandSubmission(app, projectId, validCandidates, checked) {
  replaceBrandCandidates(app.application_id, projectId, validCandidates)
  saveApproverMemory(
    projectId,
    checked.supervisor_approver_user_id,
    checked.supervisor_approver_name,
    checked.pm_approver_user_id,
    checked.pm_approver_name,
  )
  createBrandSupervisorTodo(buildBrandTodoPayload(app))
}

export function submitApplication(payload) {
  const checked = validateBrandSubmitPayload(payload)
  if (!checked.ok) return checked
  const { project_id, material_name, material_type, validCandidates } = checked

  store.seq.app += 1
  const application_id = `PP-2026-${String(store.seq.app).padStart(3, '0')}`
  const app = {
    application_id,
    project_id,
    material_name,
    material_type,
    use_part: payload.use_part || '',
    location_id: payload.location_id || '',
    status: 'pending',
    current_node: 'supervisor',
    applicant_user_id: 'u-contractor',
    applicant_name: '当前用户',
    submit_time: nowStr(),
    finish_time: '',
    remark: payload.remark || '',
    copy_from_application_id: '',
  }
  applyApproverSnapshotsToApp(app, checked)
  store.applications.push(app)
  finalizeBrandSubmission(app, project_id, validCandidates, checked)
  return { ok: true, data: app }
}

/** 已驳回报审单复制新建（POST copy-from）→ 新单号 */
export function copyApplicationFromRejected(sourceApplicationId, payload) {
  const sourceId = String(sourceApplicationId || '').trim()
  const src = store.applications.find((a) => a.application_id === sourceId)
  if (!src || src.status !== 'rejected') {
    return { ok: false, msg: '复制来源须为已驳回报审单' }
  }
  const checked = validateBrandSubmitPayload({
    ...payload,
    project_id: payload.project_id || src.project_id,
  })
  if (!checked.ok) return checked
  if (checked.project_id !== src.project_id) {
    return { ok: false, msg: '复制来源须为本项目已驳回报审单' }
  }

  store.seq.app += 1
  const application_id = `PP-2026-${String(store.seq.app).padStart(3, '0')}`
  const app = {
    application_id,
    project_id: checked.project_id,
    material_name: checked.material_name,
    material_type: checked.material_type,
    use_part: payload.use_part || '',
    location_id: payload.location_id || '',
    status: 'pending',
    current_node: 'supervisor',
    applicant_user_id: 'u-contractor',
    applicant_name: '当前用户',
    submit_time: nowStr(),
    finish_time: '',
    remark: payload.remark || '',
    copy_from_application_id: sourceId,
  }
  applyApproverSnapshotsToApp(app, checked)
  store.applications.push(app)
  finalizeBrandSubmission(app, checked.project_id, checked.validCandidates, checked)
  return { ok: true, data: app }
}

export function withdrawApplication(applicationId) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'pending') {
    return { ok: false, msg: '仅待审批时可撤回' }
  }
  app.status = 'withdrawn'
  app.current_node = 'none'
  app.finish_time = nowStr()
  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'withdraw',
    opinion: '申请人撤回',
    operator_user_id: 'u-contractor',
    operator_name: '当前用户',
    operate_time: nowStr(),
  })
  discardBrandTodos(applicationId)
  return { ok: true }
}

/** 已撤回原单重新提交 → 待审批（同单号） */
export function resubmitWithdrawnBrand(applicationId, payload) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'withdrawn') return { ok: false, msg: '仅已撤回单可重新编辑提交' }

  const checked = validateBrandSubmitPayload({
    ...payload,
    project_id: payload.project_id || app.project_id,
  })
  if (!checked.ok) return checked
  const {
    project_id,
    material_name,
    material_type,
    validCandidates,
  } = checked
  if (project_id !== app.project_id) return { ok: false, msg: '不可跨项目重提' }

  app.material_name = material_name
  app.material_type = material_type
  app.use_part = payload.use_part || ''
  app.location_id = payload.location_id || app.location_id || ''
  app.remark = payload.remark || ''
  applyApproverSnapshotsToApp(app, checked)
  app.status = 'pending'
  app.current_node = 'supervisor'
  app.submit_time = nowStr()
  app.finish_time = ''
  replaceBrandCandidates(applicationId, project_id, validCandidates)
  saveApproverMemory(
    project_id,
    checked.supervisor_approver_user_id,
    checked.supervisor_approver_name,
    checked.pm_approver_user_id,
    checked.pm_approver_name,
  )

  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    application_id: applicationId,
    node_code: 'applicant',
    action: 'submit',
    opinion: '撤回后重新提交',
    operator_user_id: 'u-contractor',
    operator_name: '当前用户',
    operate_time: nowStr(),
  })
  discardBrandTodos(applicationId)
  createBrandSupervisorTodo(buildBrandTodoPayload(app))
  return { ok: true, data: app }
}

export function supervisorApprove(applicationId, { action, opinion, operatorUserId } = {}) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'pending' || app.current_node !== 'supervisor') {
    return { ok: false, msg: '当前不在待审批（待监理审）节点' }
  }
  const auth = assertBrandApprovalOperator(app, 'supervisor', operatorUserId)
  if (!auth.ok) return auth
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '驳回意见必填' }
  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    application_id: applicationId,
    node_code: 'supervisor',
    action,
    opinion: opinion || '',
    operator_user_id: app.supervisor_approver_user_id || 'u-supervisor',
    operator_name: app.supervisor_approver_name || '监理用户',
    operate_time: nowStr(),
  })
  if (action === 'agree') {
    app.status = 'in_approval'
    app.current_node = 'pm'
    createBrandPmTodo(buildBrandTodoPayload(app))
  } else {
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = nowStr()
  }
  return { ok: true }
}

export function pmApprove(applicationId, { action, opinion, operatorUserId } = {}) {
  const app = store.applications.find((a) => a.application_id === applicationId)
  if (!app) return { ok: false, msg: '单据不存在' }
  if (app.status !== 'in_approval' || app.current_node !== 'pm') {
    return { ok: false, msg: '当前不在待项目经理审节点' }
  }
  const auth = assertBrandApprovalOperator(app, 'pm', operatorUserId)
  if (!auth.ok) return auth
  if (action === 'reject' && !(opinion || '').trim()) return { ok: false, msg: '驳回意见必填' }

  store.seq.ar += 1
  store.approvals.push({
    record_id: `AR-${String(store.seq.ar).padStart(3, '0')}`,
    application_id: applicationId,
    node_code: 'pm',
    action,
    opinion: opinion || '',
    operator_user_id: app.pm_approver_user_id || 'u-pm',
    operator_name: app.pm_approver_name || '项目经理',
    operate_time: nowStr(),
  })

  if (action === 'reject') {
    app.status = 'rejected'
    app.current_node = 'none'
    app.finish_time = nowStr()
    return { ok: true }
  }

  const cands = store.candidates.filter((c) => c.application_id === applicationId)
  const primaryCount = cands.filter((c) => c.is_primary).length
  if (primaryCount !== 1) return { ok: false, msg: '报审单主选品牌数据异常' }

  cands.forEach((c) => {
    upsertLedgerFromCandidate(app, c)
  })

  app.status = 'approved'
  app.current_node = 'none'
  app.finish_time = nowStr()
  return { ok: true }
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'in_approval') return ''
  if (status === 'rejected') return 'danger'
  return 'info'
}

/** 材料定样 · 从品牌台账取可选行 */
export function listSamplePickRowsFromBrand(projectId) {
  if (!projectId) return []
  const map = new Map()
  for (const row of store.ledger.filter((r) => r.project_id === projectId)) {
    if (row.material_type !== 'material' && row.material_type) continue
    const supplier = (row.manufacturer || '').trim()
    if (!supplier) continue
    const key = `${supplier}\0${row.material_name.trim()}\0${row.brand_name.trim()}`
    if (!map.has(key)) {
      map.set(key, {
        application_id: row.application_id,
        supplier,
        brand_name: row.brand_name,
        material_id: '',
        material_name: row.material_name,
        specs: [],
      })
    }
  }
  return [...map.values()]
}

export function listSampleSuppliersFromBrand(projectId) {
  const map = new Map()
  for (const row of listSamplePickRowsFromBrand(projectId)) {
    if (!map.has(row.supplier)) {
      map.set(row.supplier, { supplier: row.supplier, brands: new Set() })
    }
    if (row.brand_name) map.get(row.supplier).brands.add(row.brand_name)
  }
  return [...map.values()]
    .map((item) => {
      const brands = [...item.brands]
      return {
        supplier: item.supplier,
        label: brands.length ? `${brands.join('/')} · ${item.supplier}` : item.supplier,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

export function listSampleMaterialsFromBrand(projectId, supplier) {
  const mfr = String(supplier || '').trim()
  if (!mfr) return []
  const map = new Map()
  for (const row of listSamplePickRowsFromBrand(projectId)) {
    if (row.supplier !== mfr || !row.material_name) continue
    if (!map.has(row.material_name)) {
      map.set(row.material_name, {
        material_id: row.material_id,
        material_name: row.material_name,
        brand_name: row.brand_name || '',
        brands: new Set(row.brand_name ? [row.brand_name] : []),
      })
    } else if (row.brand_name) {
      map.get(row.material_name).brands.add(row.brand_name)
    }
  }
  return [...map.values()]
    .map((item) => ({
      material_id: item.material_id,
      material_name: item.material_name,
      brand_name: [...item.brands].join('/') || item.brand_name || '',
    }))
    .sort((a, b) => a.material_name.localeCompare(b.material_name, 'zh-CN'))
}

/** 报审申请列表：默认项目补齐全部业务状态示例数据 */
function seedDemoApplicationsForAllStatus() {
  const project_id = 'p-000'
  const applicant_user_id = 'u-contractor'
  const applicant_name = '张工'
  const rows = [
    {
      application_id: 'PP-2026-009',
      material_name: '外墙真石漆',
      material_type: 'material',
      use_part: '外墙饰面',
      status: 'pending',
      current_node: 'supervisor',
      submit_time: '2026-08-16 09:20:00',
      brands: [
        { id: 'C-084', brand_name: '立邦', manufacturer: '立邦涂料（中国）有限公司', is_primary: true, remark: '覆盖率高' },
        { id: 'C-085', brand_name: '多乐士', manufacturer: '阿克苏诺贝尔涂料（中国）有限公司', is_primary: false },
        { id: 'C-086', brand_name: '三棵树', manufacturer: '三棵树涂料股份有限公司', is_primary: false },
      ],
    },
    {
      application_id: 'PP-2026-010',
      material_name: '电缆桥架',
      material_type: 'equipment',
      use_part: '机电竖井',
      status: 'pending',
      current_node: 'supervisor',
      submit_time: '2026-08-15 14:10:00',
      brands: [
        { id: 'C-087', brand_name: '日海', manufacturer: '日海智能科技股份有限公司', is_primary: true },
        { id: 'C-088', brand_name: '镇江桥架', manufacturer: '江苏镇江桥架有限公司', is_primary: false },
        { id: 'C-089', brand_name: '华鹏', manufacturer: '江苏华鹏变压器有限公司', is_primary: false },
      ],
    },
    {
      application_id: 'PP-2026-011',
      material_name: '铝合金型材',
      material_type: 'material',
      use_part: '幕墙',
      status: 'in_approval',
      current_node: 'pm',
      submit_time: '2026-08-14 10:00:00',
      brands: [
        { id: 'C-090', brand_name: '凤铝', manufacturer: '广东凤铝铝业有限公司', is_primary: true, remark: '合同推荐' },
        { id: 'C-091', brand_name: '坚美', manufacturer: '广东坚美铝型材厂（集团）有限公司', is_primary: false },
        { id: 'C-092', brand_name: '兴发', manufacturer: '广东兴发铝业有限公司', is_primary: false },
      ],
      approvals: [
        {
          id: 'AR-012',
          node_code: 'supervisor',
          action: 'agree',
          opinion: '资料齐全，同意报审',
          operator_user_id: 'u-supervisor',
          operator_name: '王监理',
          operate_time: '2026-08-15 09:00:00',
        },
      ],
    },
    {
      application_id: 'PP-2026-012',
      material_name: '消防水泵',
      material_type: 'equipment',
      use_part: '消防泵房',
      status: 'in_approval',
      current_node: 'pm',
      submit_time: '2026-08-13 11:30:00',
      brands: [
        { id: 'C-093', brand_name: '南消', manufacturer: '南安市消防器材有限公司', is_primary: true },
        { id: 'C-094', brand_name: '威乐', manufacturer: '威乐水泵系统（中国）有限公司', is_primary: false },
        { id: 'C-095', brand_name: '格兰富', manufacturer: '格兰富水泵（上海）有限公司', is_primary: false },
      ],
      approvals: [
        {
          id: 'AR-013',
          node_code: 'supervisor',
          action: 'agree',
          opinion: '设备参数符合设计，同意',
          operator_user_id: 'u-supervisor',
          operator_name: '王监理',
          operate_time: '2026-08-14 16:00:00',
        },
      ],
    },
    {
      application_id: 'PP-2026-013',
      material_name: '室内地砖',
      material_type: 'material',
      use_part: '商业区公区',
      status: 'rejected',
      current_node: 'none',
      submit_time: '2026-08-12 09:00:00',
      finish_time: '2026-08-13 10:00:00',
      brands: [
        { id: 'C-096', brand_name: '东鹏', manufacturer: '东鹏控股股份有限公司', is_primary: true },
        { id: 'C-097', brand_name: '马可波罗', manufacturer: '广东马可波罗陶瓷有限公司', is_primary: false },
        { id: 'C-098', brand_name: '诺贝尔', manufacturer: '杭州诺贝尔陶瓷有限公司', is_primary: false },
      ],
      approvals: [
        {
          id: 'AR-014',
          node_code: 'supervisor',
          action: 'reject',
          opinion: '样品照片不足，请补充现场比对资料后重报',
          operator_user_id: 'u-supervisor',
          operator_name: '王监理',
          operate_time: '2026-08-13 10:00:00',
        },
      ],
    },
    {
      application_id: 'PP-2026-014',
      material_name: '干式变压器',
      material_type: 'equipment',
      use_part: '变电所',
      status: 'rejected',
      current_node: 'none',
      submit_time: '2026-08-10 09:00:00',
      finish_time: '2026-08-12 15:20:00',
      brands: [
        { id: 'C-099', brand_name: '特变电工', manufacturer: '特变电工股份有限公司', is_primary: true, remark: '供货周期较短' },
        { id: 'C-100', brand_name: '西门子', manufacturer: '西门子（中国）有限公司', is_primary: false },
        { id: 'C-101', brand_name: 'ABB', manufacturer: 'ABB（中国）有限公司', is_primary: false },
      ],
      approvals: [
        {
          id: 'AR-015',
          node_code: 'supervisor',
          action: 'agree',
          opinion: '监理审核通过，请项目经理终审',
          operator_user_id: 'u-supervisor',
          operator_name: '王监理',
          operate_time: '2026-08-11 11:00:00',
        },
        {
          id: 'AR-016',
          node_code: 'pm',
          action: 'reject',
          opinion: '主选品牌与合同推荐不一致，请调整后重新报审',
          operator_user_id: 'u-pm',
          operator_name: '赵经理',
          operate_time: '2026-08-12 15:20:00',
        },
      ],
    },
    {
      application_id: 'PP-2026-015',
      material_name: '保温岩棉',
      material_type: 'material',
      use_part: '外墙保温',
      status: 'withdrawn',
      current_node: 'none',
      submit_time: '2026-08-09 10:00:00',
      finish_time: '2026-08-09 15:00:00',
      brands: [
        { id: 'C-102', brand_name: '欧文斯科宁', manufacturer: '欧文斯科宁（中国）投资有限公司', is_primary: true },
        { id: 'C-103', brand_name: '圣戈班', manufacturer: '圣戈班集团', is_primary: false },
        { id: 'C-104', brand_name: '华能中天', manufacturer: '华能中天节能科技集团有限公司', is_primary: false },
      ],
      approvals: [
        {
          id: 'AR-017',
          node_code: 'applicant',
          action: 'withdraw',
          opinion: '申请人撤回，拟调整备选品牌',
          operator_user_id: 'u-contractor',
          operator_name: '张工',
          operate_time: '2026-08-09 15:00:00',
        },
      ],
    },
    {
      application_id: 'PP-2026-016',
      material_name: 'LED灯具',
      material_type: 'equipment',
      use_part: '公共区照明',
      status: 'withdrawn',
      current_node: 'none',
      submit_time: '2026-08-08 09:30:00',
      finish_time: '2026-08-08 11:00:00',
      brands: [
        { id: 'C-105', brand_name: '飞利浦', manufacturer: '昕诺飞（中国）投资有限公司', is_primary: true },
        { id: 'C-106', brand_name: '欧普', manufacturer: '欧普照明股份有限公司', is_primary: false },
        { id: 'C-107', brand_name: '三雄极光', manufacturer: '广东三雄极光照明股份有限公司', is_primary: false },
      ],
      approvals: [
        {
          id: 'AR-018',
          node_code: 'applicant',
          action: 'withdraw',
          opinion: '申请人撤回',
          operator_user_id: 'u-contractor',
          operator_name: '张工',
          operate_time: '2026-08-08 11:00:00',
        },
      ],
    },
  ]

  for (const row of rows) {
    if (store.applications.some((a) => a.application_id === row.application_id)) continue
    store.applications.push({
      application_id: row.application_id,
      project_id,
      material_name: row.material_name,
      material_type: row.material_type,
      use_part: row.use_part,
      status: row.status,
      current_node: row.current_node,
      applicant_user_id,
      applicant_name,
      submit_time: row.submit_time,
      finish_time: row.finish_time || '',
      remark: row.remark || '',
      copy_from_application_id: row.copy_from_application_id || '',
    })
    row.brands.forEach((b, i) => {
      store.candidates.push({
        candidate_id: b.id,
        application_id: row.application_id,
        ledger_id: '',
        seq_no: i + 1,
        brand_name: b.brand_name,
        manufacturer: b.manufacturer,
        remark: b.remark || '',
        is_primary: !!b.is_primary,
      })
    })
    for (const ar of row.approvals || []) {
      store.approvals.push({
        record_id: ar.id,
        application_id: row.application_id,
        node_code: ar.node_code,
        action: ar.action,
        opinion: ar.opinion,
        operator_user_id: ar.operator_user_id,
        operator_name: ar.operator_name,
        operate_time: ar.operate_time,
      })
    }
  }

  const extraAtts = [
    {
      attachment_id: 'BA-007',
      candidate_id: 'C-084',
      attach_type: 'vendor_profile',
      is_checked: true,
      file_name: '立邦-厂商资料.pdf',
      file_url: '#mock/nippon-vendor.pdf',
    },
    {
      attachment_id: 'BA-008',
      candidate_id: 'C-096',
      attach_type: 'sample_photo',
      is_checked: true,
      file_name: '东鹏地砖样品.jpg',
      file_url: '#mock/dongpeng-sample.jpg',
    },
  ]
  for (const att of extraAtts) {
    if (!store.attachments.some((a) => a.attachment_id === att.attachment_id)) {
      store.attachments.push(att)
    }
  }
}

seedDemoApplicationsForAllStatus()

function backfillApproverSnapshots() {
  for (const app of store.applications) {
    if (app.supervisor_approver_user_id && !app.supervisor_approver_org) {
      const u = findBrandProjectUser(app.supervisor_approver_user_id)
      if (u) {
        app.supervisor_approver_org = u.org || ''
        app.supervisor_approver_post_label = u.post_label || ''
      }
    }
    if (app.pm_approver_user_id && !app.pm_approver_org) {
      const u = findBrandProjectUser(app.pm_approver_user_id)
      if (u) {
        app.pm_approver_org = u.org || ''
        app.pm_approver_post_label = u.post_label || ''
      }
    }
  }
}

backfillApproverSnapshots()

function seedOpenBrandTodos() {
  for (const app of store.applications) {
    if (app.status === 'pending' && app.current_node === 'supervisor') {
      createBrandSupervisorTodo(buildBrandTodoPayload(app))
    } else if (app.status === 'in_approval' && app.current_node === 'pm') {
      createBrandPmTodo(buildBrandTodoPayload(app))
    }
  }
}

seedOpenBrandTodos()

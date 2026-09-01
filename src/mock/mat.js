/**
 * 材料设备进场 Mock — 对齐 research-mat-eq V2.1
 * 审批入口：个人中心待办（仅监理）；申报须指定监理审批人
 */
import { reactive } from 'vue'
import { nowStr } from '../utils/datetime.js'
import { formatApproverCandidateLabel } from '../utils/approverDisplay.js'
import { getProjectLabel } from './laborRealName.js'
import { COC_PROJECT_OPTIONS } from '../config/projectOptions.js'
import { searchLedgerBrands } from './brand.js'
import {
  createMatEntrySupervisorTodo,
  discardMatEntryTodos,
  discardEqEntryTodos,
} from './personalCenter.js'

/** 合格证 / 现场照片：仅允许图片扩展名 */
export function isImageAttachmentName(name) {
  return /\.(jpe?g|png)$/i.test(String(name || '').trim())
}

/** 质量证明文件：仅 PDF */
export function isPdfAttachmentName(name) {
  return /\.pdf$/i.test(String(name || '').trim())
}

/** 其他附件：jpg / png / pdf / word */
export function isOtherAttachmentName(name) {
  return /\.(jpe?g|png|pdf|docx?)$/i.test(String(name || '').trim())
}

/**
 * 监理审批人候选（原型暂用与品牌报审一致的监理人员池）
 * 岗位口径对齐质量验评「监理单位人员」常见岗位；后续岗位字典定稿可替换。
 */
export const MAT_SUPERVISOR_APPROVER_CANDIDATES = [
  {
    user_id: 'u-jl-01',
    name: '李总监',
    post: 'jl_chief',
    post_label: '总监理工程师',
    org: '深圳某监理有限公司',
  },
  {
    user_id: 'u-jl-02',
    name: '王代总',
    post: 'jl_deputy',
    post_label: '总监理工程师代表',
    org: '深圳某监理有限公司',
  },
  {
    user_id: 'u-jl-03',
    name: '赵专监',
    post: 'jl_pro',
    post_label: '专业监理工程师',
    org: '深圳某监理有限公司',
  },
  {
    user_id: 'u-jl-04',
    name: '钱专监',
    post: 'jl_pro',
    post_label: '专业监理工程师',
    org: '深圳某监理有限公司',
  },
  {
    user_id: 'u-jl-05',
    name: '孙监理',
    post: 'jl_site',
    post_label: '项目监理机构人员',
    org: '深圳某监理有限公司',
  },
]

export function formatMatSupervisorApproverLabel(user) {
  return formatApproverCandidateLabel(user)
}

/** 本项目监理岗位人员（单选候选） */
export function listMatSupervisorApprovers(projectId) {
  if (!projectId) return []
  return MAT_SUPERVISOR_APPROVER_CANDIDATES.map((u) => ({ ...u }))
}

export function findMatSupervisorApprover(userId) {
  return MAT_SUPERVISOR_APPROVER_CANDIDATES.find((u) => u.user_id === userId) || null
}

function resolveSupervisorApproverFields(payload) {
  const supervisor_approver_user_id = String(payload.supervisor_approver_user_id || '').trim()
  if (!supervisor_approver_user_id) {
    return { ok: false, msg: '请选择监理审批人' }
  }
  const user = findMatSupervisorApprover(supervisor_approver_user_id)
  if (!user) return { ok: false, msg: '监理审批人不在本项目监理岗位人员范围内' }
  return {
    ok: true,
    supervisor_approver_user_id: user.user_id,
    supervisor_approver_name: user.name,
    supervisor_approver_post: user.post,
    supervisor_approver_post_label: user.post_label,
  }
}

export const ENTRY_TYPE = {
  material: 'material',
  equipment: 'equipment',
}

export const ENTRY_TYPE_LABEL = {
  material: '材料',
  equipment: '设备',
}

export const STATUS_LABEL = {
  reviewing: '审批中',
  approved: '已通过',
  rejected: '已驳回',
}

export function statusLabel(status) {
  return STATUS_LABEL[status] || status || '—'
}

export const NODE_LABEL = {
  supervisor: '监理审批',
  none: '无',
}

/** 开箱清单写死四项（设备类型） */
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
    ok: true,
    remark: '',
  }))
}

export function statusTagType(status) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'reviewing') return 'warning'
  return 'info'
}

export function isReviewingStatus(status) {
  return status === 'reviewing'
}

/** Demo：已通过定样（可选关联） */
const APPROVED_SAMPLES = [
  {
    sample_application_id: 'MS-001',
    project_id: 'p-000',
    material_name: '外墙真石漆',
    use_part: 'T3 航站楼外立面',
    brand_name: '亚士漆',
    manufacturer: '亚士创能科技（上海）股份有限公司',
  },
  {
    sample_application_id: 'MS-101',
    project_id: 'p-000',
    material_name: '防水卷材',
    use_part: '屋面防水层',
    brand_name: '东方雨虹',
    manufacturer: '北京东方雨虹防水技术股份有限公司',
  },
  {
    sample_application_id: 'MS-102',
    project_id: 'p-001',
    material_name: '镀锌钢管',
    use_part: '给排水干管',
    brand_name: '友发',
    manufacturer: '天津友发钢管集团股份有限公司',
  },
]

const store = reactive({
  seq: 7,
  entries: [
    {
      entry_no: 'ME-001',
      entry_type: 'material',
      project_id: 'p-000',
      sample_application_id: 'MS-001',
      ledger_id: 'BL-001',
      material_name: '外墙真石漆',
      use_part: 'T3 航站楼外立面',
      brand_name: '亚士漆',
      manufacturer: '亚士创能科技（上海）股份有限公司',
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
          inspect_result_checked: true,
          inspect_result_file: '送检结果-真石漆.pdf',
        },
      ],
      cert_file: '合格证-真石漆.jpg',
      inspect_file: '质检报告-真石漆.pdf',
      photo_file: '进场现场-1.jpg',
      status: 'approved',
      current_node_key: 'none',
      applicant_name: '施工-王工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-07-15 10:20:00',
      finish_time: '2026-07-16 09:10:00',
      exited: true,
      remark: '',
    },
    {
      entry_no: 'ME-002',
      entry_type: 'material',
      project_id: 'p-000',
      sample_application_id: 'MS-101',
      ledger_id: 'BL-002',
      material_name: '防水卷材',
      use_part: '屋面防水层',
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      quantity: 800,
      unit: '卷',
      supplier: '雨虹授权经销商',
      batch_no: 'BATCH-20260720',
      material_spec: 'SBS 改性沥青防水卷材 3mm',
      waybill_no: 'YD-20260720',
      line_items: [
        {
          material_name: '防水卷材',
          material_spec: 'SBS 改性沥青防水卷材 3mm',
          quantity: 500,
          unit: '卷',
          purpose: '屋面防水',
          use_part: '屋面防水层',
          waybill_no: 'YD-20260720',
          batch_no: 'BATCH-20260720',
          appearance_quality: '合格',
          acceptance_result: '合格',
          entry_date: '2026-07-27 14:00:00',
          cert_file: '合格证-卷材-1.jpg',
          inspect_file: '质检报告-卷材-1.pdf',
          photo_file: '进场现场-卷材-1.jpg',
          other_file: '出厂检验单-卷材.docx',
          inspect_result_checked: true,
          inspect_result_file: '送检结果-卷材.pdf',
        },
        {
          material_name: '防水卷材',
          material_spec: 'SBS 改性沥青防水卷材 4mm',
          quantity: 300,
          unit: '卷',
          purpose: '地下室侧墙',
          use_part: '地下室防水',
          waybill_no: 'YD-20260720-B',
          batch_no: 'BATCH-20260720-B',
          appearance_quality: '合格',
          acceptance_result: '合格',
          entry_date: '2026-07-27 14:10:00',
          cert_file: '合格证-卷材-2.jpg',
          inspect_file: '质检报告-卷材-2.pdf',
          photo_file: '进场现场-卷材-2.jpg',
          other_file: '',
        },
      ],
      cert_file: '合格证-卷材-1.jpg',
      inspect_file: '质检报告-卷材-1.pdf',
      photo_file: '进场现场-卷材-1.jpg',
      other_file: '出厂检验单-卷材.docx',
      status: 'reviewing',
      current_node_key: 'supervisor',
      applicant_name: '施工-李工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-07-27 14:30:00',
      finish_time: '',
      exited: false,
      remark: '',
    },
    {
      entry_no: 'ME-003',
      entry_type: 'material',
      project_id: 'p-000',
      sample_application_id: '',
      ledger_id: 'BL-003',
      material_name: '钢筋',
      use_part: '主体结构',
      brand_name: '宝钢',
      manufacturer: '宝山钢铁股份有限公司',
      quantity: 30,
      unit: '吨',
      supplier: '宝钢直供',
      batch_no: 'BATCH-STEEL-01',
      line_items: [
        {
          material_name: '钢筋',
          material_spec: 'HRB400E Φ18',
          quantity: 30,
          unit: '吨',
          waybill_no: 'YD-STEEL-01',
          batch_no: 'BATCH-STEEL-01',
          inspect_result_checked: false,
          inspect_result_file: '',
        },
      ],
      cert_file: '合格证-钢筋.jpg',
      inspect_file: '质检报告-钢筋.pdf',
      photo_file: '进场-钢筋.jpg',
      status: 'approved',
      current_node_key: 'none',
      applicant_name: '施工-赵工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-07-18 11:00:00',
      finish_time: '2026-07-18 16:00:00',
      exited: false,
      remark: '演示：无定样，仅选品牌台账',
    },
    {
      entry_no: 'ME-004',
      entry_type: 'material',
      project_id: 'p-000',
      sample_application_id: 'MS-101',
      ledger_id: 'BL-002',
      material_name: '防水卷材',
      use_part: '屋面防水层',
      brand_name: '东方雨虹',
      manufacturer: '北京东方雨虹防水技术股份有限公司',
      quantity: 80,
      unit: '卷',
      supplier: '雨虹授权经销商',
      batch_no: 'BATCH-REJECT-01',
      line_items: [
        {
          material_name: '防水卷材',
          material_spec: 'SBS 改性沥青防水卷材 3mm',
          quantity: 80,
          unit: '卷',
          waybill_no: 'YD-REJECT-01',
          batch_no: 'BATCH-REJECT-01',
          inspect_result_checked: false,
          inspect_result_file: '',
        },
      ],
      cert_file: '合格证-卷材-驳回.jpg',
      inspect_file: '质检报告-卷材-驳回.pdf',
      photo_file: '进场-卷材-驳回.jpg',
      status: 'rejected',
      current_node_key: 'none',
      applicant_name: '施工-李工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-07-22 09:00:00',
      finish_time: '2026-07-22 16:30:00',
      exited: false,
      remark: '演示：已驳回留档，可复制新建',
    },
    {
      entry_no: 'ME-005',
      entry_type: 'equipment',
      project_id: 'p-000',
      sample_application_id: '',
      ledger_id: 'BL-EQ-001',
      equipment_name: '低压开关柜',
      material_name: '低压开关柜',
      model: 'Blokset',
      use_part: '变配电所',
      brand_name: '施耐德',
      manufacturer: '施耐德电气（中国）有限公司',
      quantity: 4,
      unit: '台',
      supplier: '施耐德授权经销商',
      serial_no: 'SN-BLK-202607',
      line_items: [
        {
          equipment_name: '低压开关柜',
          material_name: '低压开关柜',
          model: 'Blokset',
          quantity: 4,
          unit: '台',
          serial_no: 'SN-BLK-202607',
          use_part: '变配电所',
          cert_file: '合格证-开关柜.jpg',
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
        },
      ],
      unpack_items: [
        { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
        { key: 'tools', label: '随机工具', fixed: true, ok: true, remark: '' },
        { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
        { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
      ],
      cert_file: '合格证-开关柜.jpg',
      inspect_file: '质检报告-开关柜.pdf',
      photo_file: '到场现场-开关柜.jpg',
      status: 'approved',
      current_node_key: 'none',
      applicant_name: '施工-王工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-07-14 09:30:00',
      finish_time: '2026-07-15 11:20:00',
      exited: false,
      remark: '',
    },
    {
      entry_no: 'ME-006',
      entry_type: 'equipment',
      project_id: 'p-000',
      sample_application_id: '',
      ledger_id: 'BL-EQ-002',
      equipment_name: '配电箱',
      material_name: '配电箱',
      model: 'NXB',
      use_part: '商业区配电间',
      brand_name: '正泰',
      manufacturer: '正泰电器股份有限公司',
      quantity: 12,
      unit: '台',
      supplier: '正泰项目供应部',
      serial_no: 'SN-NXB-0728',
      line_items: [
        {
          equipment_name: '配电箱',
          material_name: '配电箱',
          model: 'NXB',
          quantity: 8,
          unit: '台',
          serial_no: 'SN-NXB-0728-A',
          purpose: '商业区配电',
          use_part: '商业区配电间',
          waybill_no: 'YD-EQ-0728-A',
          batch_no: 'BATCH-EQ-0728-A',
          appearance_quality: '合格',
          acceptance_result: '合格',
          entry_date: '2026-07-28 10:00:00',
          cert_file: '合格证-配电箱-1.jpg',
          inspect_file: '质检报告-配电箱-1.pdf',
          photo_file: '到场现场-配电箱-1.jpg',
          other_file: '',
          unpack_items: [
            { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
            { key: 'tools', label: '随机工具', fixed: true, ok: false, remark: '缺扳手一套' },
            { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
            { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
          ],
          inspect_result_checked: true,
          inspect_result_file: '送检结果-配电箱.pdf',
        },
        {
          equipment_name: '配电箱',
          material_name: '配电箱',
          model: 'NXB-Ⅱ',
          quantity: 4,
          unit: '台',
          serial_no: 'SN-NXB-0728-B',
          purpose: '备用回路',
          use_part: '商业区配电间',
          waybill_no: 'YD-EQ-0728-B',
          batch_no: 'BATCH-EQ-0728-B',
          appearance_quality: '合格',
          acceptance_result: '合格',
          entry_date: '2026-07-28 10:05:00',
          cert_file: '合格证-配电箱-2.jpg',
          inspect_file: '质检报告-配电箱-2.pdf',
          photo_file: '到场现场-配电箱-2.jpg',
          other_file: '装箱单-配电箱.pdf',
          unpack_items: [
            { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
            { key: 'tools', label: '随机工具', fixed: true, ok: true, remark: '' },
            { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
            { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
          ],
        },
      ],
      unpack_items: [
        { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
        { key: 'tools', label: '随机工具', fixed: true, ok: false, remark: '缺扳手一套' },
        { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
        { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
      ],
      cert_file: '合格证-配电箱-1.jpg',
      inspect_file: '质检报告-配电箱-1.pdf',
      photo_file: '到场现场-配电箱-1.jpg',
      status: 'reviewing',
      current_node_key: 'supervisor',
      applicant_name: '施工-李工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-07-28 10:15:00',
      finish_time: '',
      exited: false,
      remark: '',
    },
    {
      entry_no: 'ME-007',
      entry_type: 'equipment',
      project_id: 'p-000',
      sample_application_id: '',
      ledger_id: 'BL-EQ-001',
      equipment_name: '临时发电机',
      material_name: '临时发电机',
      model: 'C15',
      use_part: '施工临电',
      brand_name: '卡特彼勒',
      manufacturer: '卡特彼勒（中国）机械部件有限公司',
      quantity: 1,
      unit: '台',
      supplier: '临电设备租赁站',
      serial_no: 'SN-GEN-202606',
      unpack_items: [
        { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
        { key: 'tools', label: '随机工具', fixed: true, ok: true, remark: '' },
        { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
        { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
      ],
      cert_file: '合格证-发电机.jpg',
      inspect_file: '质检报告-发电机.pdf',
      photo_file: '到场现场-发电机.jpg',
      status: 'approved',
      current_node_key: 'none',
      applicant_name: '施工-王工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-06-18 09:00:00',
      finish_time: '2026-06-19 10:30:00',
      exited: true,
      remark: '',
    },
  ],
  approvals: [
    {
      approval_id: 'AR-ME-S1',
      entry_no: 'ME-001',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-王工',
      time: '2026-07-15 10:20:00',
    },
    {
      approval_id: 'AR-ME-1',
      entry_no: 'ME-001',
      node: 'supervisor',
      action: 'agree',
      opinion: '资料齐全，同意进场',
      operator_name: '监理-周工',
      time: '2026-07-16 09:10:00',
    },
    {
      approval_id: 'AR-ME-S2',
      entry_no: 'ME-002',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-李工',
      time: '2026-07-27 14:30:00',
    },
    {
      approval_id: 'AR-ME-S3',
      entry_no: 'ME-003',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-赵工',
      time: '2026-07-18 11:00:00',
    },
    {
      approval_id: 'AR-ME-2',
      entry_no: 'ME-003',
      node: 'supervisor',
      action: 'agree',
      opinion: '品牌台账一致，同意进场',
      operator_name: '监理-周工',
      time: '2026-07-18 16:00:00',
    },
    {
      approval_id: 'AR-ME-S4',
      entry_no: 'ME-004',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-李工',
      time: '2026-07-22 09:00:00',
    },
    {
      approval_id: 'AR-ME-3',
      entry_no: 'ME-004',
      node: 'supervisor',
      action: 'reject',
      opinion: '质检报告过期，请复制新建后重交',
      operator_name: '监理-周工',
      time: '2026-07-22 16:30:00',
    },
    {
      approval_id: 'AR-ME-S5',
      entry_no: 'ME-005',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-王工',
      time: '2026-07-14 09:30:00',
    },
    {
      approval_id: 'AR-ME-4',
      entry_no: 'ME-005',
      node: 'supervisor',
      action: 'agree',
      opinion: '开箱齐全，同意进场',
      operator_name: '监理-周工',
      time: '2026-07-15 11:20:00',
    },
    {
      approval_id: 'AR-ME-S6',
      entry_no: 'ME-006',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-李工',
      time: '2026-07-28 10:15:00',
    },
    {
      approval_id: 'AR-ME-S7',
      entry_no: 'ME-007',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-王工',
      time: '2026-06-18 09:00:00',
    },
    {
      approval_id: 'AR-ME-5',
      entry_no: 'ME-007',
      node: 'supervisor',
      action: 'agree',
      opinion: '临时用电设备验收通过',
      operator_name: '监理-周工',
      time: '2026-06-19 10:30:00',
    },
  ],
  exits: [
    {
      exit_no: 'EX-ME-001',
      entry_no: 'ME-001',
      exit_qty: 50,
      reason: '色差超标，退回供应商更换',
      photo_file: '退场现场-真石漆.jpg',
      exit_time: '2026-07-20 15:30:00',
      operator_name: '施工-王工',
    },
    {
      exit_no: 'EX-ME-007',
      entry_no: 'ME-007',
      exit_qty: 1,
      reason: '临电任务结束，设备退场归还租赁站',
      photo_file: '退场现场-发电机.jpg',
      exit_time: '2026-07-25 16:00:00',
      operator_name: '施工-王工',
    },
  ],
  approvalSeq: 12,
})

/** 进场申请列表：默认项目补齐全部业务状态示例（审批中 / 已通过 / 已驳回） */
function seedDemoEntriesForAllStatus() {
  const project_id = 'p-000'
  const extraEntries = [
    {
      entry_no: 'ME-008',
      entry_type: 'material',
      project_id,
      sample_application_id: '',
      ledger_id: 'BL-007',
      material_name: '砂浆',
      use_part: '砌体抹灰',
      brand_name: '海螺',
      manufacturer: '安徽海螺水泥股份有限公司',
      quantity: 80,
      unit: '吨',
      supplier: '海螺项目供应部',
      batch_no: 'BATCH-MORTAR-WD',
      material_spec: 'M10 砌筑砂浆',
      waybill_no: 'YD-MORTAR-WD',
      line_items: [
        {
          material_name: '砂浆',
          material_spec: 'M10 砌筑砂浆',
          quantity: 80,
          unit: '吨',
          waybill_no: 'YD-MORTAR-WD',
          batch_no: 'BATCH-MORTAR-WD',
          inspect_result_checked: false,
          inspect_result_file: '',
        },
      ],
      cert_file: '合格证-砂浆.jpg',
      inspect_file: '质检报告-砂浆.pdf',
      photo_file: '进场现场-砂浆.jpg',
      status: 'rejected',
      current_node_key: 'none',
      applicant_name: '施工-王工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-08-12 09:40:00',
      finish_time: '2026-08-12 11:20:00',
      exited: false,
      remark: '演示：已驳回，可复制新建重新报审',
    },
    {
      entry_no: 'ME-009',
      entry_type: 'equipment',
      project_id,
      sample_application_id: '',
      ledger_id: 'BL-EQ-001',
      equipment_name: '低压开关柜',
      material_name: '低压开关柜',
      model: 'Blokset',
      use_part: '变配电所',
      brand_name: '施耐德',
      manufacturer: '施耐德电气（中国）有限公司',
      quantity: 2,
      unit: '台',
      supplier: '施耐德授权经销商',
      serial_no: 'SN-BLK-WD-0812',
      line_items: [
        {
          equipment_name: '低压开关柜',
          material_name: '低压开关柜',
          model: 'Blokset',
          quantity: 2,
          unit: '台',
          serial_no: 'SN-BLK-WD-0812',
          use_part: '变配电所',
          cert_file: '合格证-开关柜-驳回.jpg',
          inspect_file: '质检报告-开关柜-驳回.pdf',
          photo_file: '到场现场-开关柜-驳回.jpg',
          inspect_result_checked: false,
          inspect_result_file: '',
          unpack_items: [
            { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
            { key: 'tools', label: '随机工具', fixed: true, ok: true, remark: '' },
            { key: 'manual', label: '技术手册', fixed: true, ok: false, remark: '手册待补' },
            { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
          ],
        },
      ],
      unpack_items: [
        { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
        { key: 'tools', label: '随机工具', fixed: true, ok: true, remark: '' },
        { key: 'manual', label: '技术手册', fixed: true, ok: false, remark: '手册待补' },
        { key: 'parts', label: '配件完备性', fixed: true, ok: true, remark: '' },
      ],
      cert_file: '合格证-开关柜-驳回.jpg',
      inspect_file: '质检报告-开关柜-驳回.pdf',
      photo_file: '到场现场-开关柜-驳回.jpg',
      status: 'rejected',
      current_node_key: 'none',
      applicant_name: '施工-李工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-08-11 14:00:00',
      finish_time: '2026-08-11 15:10:00',
      exited: false,
      remark: '演示：设备已驳回，可复制新建重新报审',
    },
    {
      entry_no: 'ME-010',
      entry_type: 'equipment',
      project_id,
      sample_application_id: '',
      ledger_id: 'BL-EQ-002',
      equipment_name: '配电箱',
      material_name: '配电箱',
      model: 'NXB',
      use_part: '商业区配电间',
      brand_name: '正泰',
      manufacturer: '正泰电器股份有限公司',
      quantity: 6,
      unit: '台',
      supplier: '正泰项目供应部',
      serial_no: 'SN-NXB-RJ-0810',
      line_items: [
        {
          equipment_name: '配电箱',
          material_name: '配电箱',
          model: 'NXB',
          quantity: 6,
          unit: '台',
          serial_no: 'SN-NXB-RJ-0810',
          use_part: '商业区配电间',
          cert_file: '合格证-配电箱-驳回.jpg',
          inspect_file: '质检报告-配电箱-驳回.pdf',
          photo_file: '到场现场-配电箱-驳回.jpg',
          inspect_result_checked: false,
          inspect_result_file: '',
          unpack_items: [
            { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
            { key: 'tools', label: '随机工具', fixed: true, ok: false, remark: '缺绝缘手套' },
            { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
            { key: 'parts', label: '配件完备性', fixed: true, ok: false, remark: '缺备用熔芯' },
          ],
        },
      ],
      unpack_items: [
        { key: 'nameplate', label: '铭牌', fixed: true, ok: true, remark: '' },
        { key: 'tools', label: '随机工具', fixed: true, ok: false, remark: '缺绝缘手套' },
        { key: 'manual', label: '技术手册', fixed: true, ok: true, remark: '' },
        { key: 'parts', label: '配件完备性', fixed: true, ok: false, remark: '缺备用熔芯' },
      ],
      cert_file: '合格证-配电箱-驳回.jpg',
      inspect_file: '质检报告-配电箱-驳回.pdf',
      photo_file: '到场现场-配电箱-驳回.jpg',
      status: 'rejected',
      current_node_key: 'none',
      applicant_name: '施工-赵工',
      supervisor_approver_user_id: 'u-jl-01',
      supervisor_approver_name: '李总监',
      supervisor_approver_post: 'jl_chief',
      supervisor_approver_post_label: '总监理工程师',
      submit_time: '2026-08-10 10:30:00',
      finish_time: '2026-08-10 16:40:00',
      exited: false,
      remark: '演示：设备已驳回，可复制新建',
    },
  ]

  const extraApprovals = [
    {
      approval_id: 'AR-ME-S8',
      entry_no: 'ME-008',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-王工',
      time: '2026-08-12 09:40:00',
    },
    {
      approval_id: 'AR-ME-6',
      entry_no: 'ME-008',
      node: 'supervisor',
      action: 'reject',
      opinion: '砂浆批次资料不全，请复制新建后补齐再报',
      operator_name: '监理-周工',
      time: '2026-08-12 11:20:00',
    },
    {
      approval_id: 'AR-ME-S9',
      entry_no: 'ME-009',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-李工',
      time: '2026-08-11 14:00:00',
    },
    {
      approval_id: 'AR-ME-7',
      entry_no: 'ME-009',
      node: 'supervisor',
      action: 'reject',
      opinion: '技术手册未到齐，请复制新建后补齐再报',
      operator_name: '监理-周工',
      time: '2026-08-11 15:10:00',
    },
    {
      approval_id: 'AR-ME-S10',
      entry_no: 'ME-010',
      node: 'submit',
      action: 'submit',
      opinion: '提交进场报审',
      operator_name: '施工-赵工',
      time: '2026-08-10 10:30:00',
    },
    {
      approval_id: 'AR-ME-8',
      entry_no: 'ME-010',
      node: 'supervisor',
      action: 'reject',
      opinion: '开箱缺项未闭环，请复制新建后补齐随机工具与配件',
      operator_name: '监理-周工',
      time: '2026-08-10 16:40:00',
    },
  ]

  for (const row of extraEntries) {
    if (!store.entries.some((e) => e.entry_no === row.entry_no)) {
      store.entries.push(row)
    }
  }
  for (const ar of extraApprovals) {
    if (!store.approvals.some((a) => a.approval_id === ar.approval_id)) {
      store.approvals.push(ar)
    }
  }
  store.seq = Math.max(store.seq, 10)
  store.approvalSeq = Math.max(store.approvalSeq, 18)
}

seedDemoEntriesForAllStatus()

function syncPendingTodos() {
  store.entries
    .filter((e) => isReviewingStatus(e.status))
    .forEach((e) => pushTodo(e))
}

syncPendingTodos()

export function listApprovedSamples(projectId) {
  return APPROVED_SAMPLES.filter((s) => s.project_id === projectId)
}

export function getApprovedSample(sampleId) {
  const id = String(sampleId || '').trim()
  return APPROVED_SAMPLES.find((s) => s.sample_application_id === id) || null
}

export function searchEntryBrands(keyword = '', projectId = '', { materialType = '' } = {}) {
  return searchLedgerBrands(keyword, projectId, { materialType })
}

export const QUALITY_RESULT_OPTIONS = [
  { value: '合格', label: '合格' },
  { value: '不合格', label: '不合格' },
]

/** 品牌台账按「品牌 + 厂家」去重，供进场单选择；材料名称在明细内再选 */
export function searchEntryBrandGroups(keyword = '', projectId = '', { materialType = '' } = {}) {
  const rows = searchEntryBrands(keyword, projectId, { materialType })
  const map = new Map()
  for (const row of rows) {
    const group_key = `${row.brand_name}\0${row.manufacturer}`
    if (map.has(group_key)) continue
    map.set(group_key, {
      group_key,
      ledger_id: row.ledger_id,
      brand_name: row.brand_name,
      manufacturer: row.manufacturer,
      label: `${row.brand_name} · ${row.manufacturer}`,
    })
  }
  return [...map.values()]
}

/** 某品牌+厂家在台账中对应的材料名称（去重） */
export function listMaterialsForEntryBrand(
  projectId,
  brand_name,
  manufacturer,
  { materialType = 'material' } = {},
) {
  if (!projectId || !brand_name || !manufacturer) return []
  const rows = searchEntryBrands('', projectId, { materialType })
  const names = []
  const seen = new Set()
  for (const row of rows) {
    if (row.brand_name !== brand_name || row.manufacturer !== manufacturer) continue
    const n = String(row.material_name || '').trim()
    if (!n || seen.has(n)) continue
    seen.add(n)
    names.push(n)
  }
  return names
}

export function parseBatchSeq(value, fallback = 1) {
  if (value == null || value === '') return fallback
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value)
  }
  const raw = String(value).trim()
  const labeled = raw.match(/^第\s*(\d+)\s*批$/)
  if (labeled) return Number(labeled[1]) || fallback
  if (/^\d+$/.test(raw)) {
    const n = Number(raw)
    return n > 0 ? n : fallback
  }
  return fallback
}

export function formatBatchNo(value) {
  if (value == null || value === '') return '—'
  const raw = String(value).trim()
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0 && raw === String(n)) return `第${n}批`
  const m = raw.match(/^第\s*(\d+)\s*批$/)
  if (m) return `第${m[1]}批`
  return raw
}

export function listEntries(
  projectId,
  { keyword = '', status = '', exited = '', entry_type = '' } = {},
) {
  let rows = store.entries.slice()
  if (projectId) rows = rows.filter((e) => e.project_id === projectId)
  if (entry_type) rows = rows.filter((e) => e.entry_type === entry_type)
  if (status) rows = rows.filter((e) => e.status === status)
  if (exited === '1') rows = rows.filter((e) => e.exited)
  if (exited === '0') rows = rows.filter((e) => !e.exited)
  const kw = keyword.trim().toLowerCase()
  if (kw) {
    rows = rows.filter((e) => {
      const lineText = (Array.isArray(e.line_items) ? e.line_items : [])
        .map((l) => `${l.material_spec || ''}${l.waybill_no || ''}${l.batch_no || ''}`)
        .join('')
      const name = e.entry_type === 'equipment' ? e.equipment_name : e.material_name
      return (
        e.entry_no.toLowerCase().includes(kw) ||
        (name || '').toLowerCase().includes(kw) ||
        e.brand_name.toLowerCase().includes(kw) ||
        (e.sample_application_id || '').toLowerCase().includes(kw) ||
        (e.supplier || '').toLowerCase().includes(kw) ||
        (e.manufacturer || '').toLowerCase().includes(kw) ||
        (e.use_part || '').toLowerCase().includes(kw) ||
        (e.material_spec || '').toLowerCase().includes(kw) ||
        (e.model || '').toLowerCase().includes(kw) ||
        (e.waybill_no || '').toLowerCase().includes(kw) ||
        lineText.toLowerCase().includes(kw) ||
        (e.reason || '').toLowerCase().includes(kw)
      )
    })
  }
  return rows
    .map((e) => {
      const exit = store.exits.find((x) => x.entry_no === e.entry_no) || null
      return {
        ...e,
        exit,
        exit_qty: exit?.exit_qty ?? e.exit_qty ?? null,
        exit_time: exit?.exit_time ?? e.exit_time ?? '',
        reason: exit?.reason ?? e.reason ?? '',
        exit_operator: exit?.operator_name ?? e.exit_operator ?? '',
        exit_photo: exit?.photo_file ?? e.exit_photo ?? '',
        exit_no: exit?.exit_no ?? e.exit_no ?? '',
      }
    })
    .sort((a, b) => {
      if (a.submit_time !== b.submit_time) {
        return a.submit_time < b.submit_time ? 1 : -1
      }
      return String(a.entry_no).localeCompare(String(b.entry_no), 'zh-CN')
    })
}

export function listLedger(projectId, filters = {}) {
  // 材料设备台账仅展示审批通过单据，不按状态筛选
  return listEntries(projectId, { ...filters, status: 'approved' })
}

export function getEntryDetail(entryId) {
  const entry = store.entries.find((e) => e.entry_no === entryId)
  if (!entry) return null
  const approvals = store.approvals
    .filter((a) => a.entry_no === entryId)
    .sort((a, b) => (a.time > b.time ? 1 : -1))
  const exit = store.exits.find((x) => x.entry_no === entryId) || null
  return { ...entry, approvals, exit, project_label: getProjectLabel(entry.project_id) }
}

export function getDashboard(projectId, { entry_type = '' } = {}) {
  let rows = projectId ? store.entries.filter((e) => e.project_id === projectId) : [...store.entries]
  if (entry_type) rows = rows.filter((e) => e.entry_type === entry_type)
  // 看板仅统计 PRD 状态 reviewing/approved/rejected
  return {
    total_batches: rows.length,
    material_count: rows.filter((e) => e.entry_type === 'material').length,
    equipment_count: rows.filter((e) => e.entry_type === 'equipment').length,
    in_approval_count: rows.filter((e) => e.status === 'reviewing').length,
    approved_count: rows.filter((e) => e.status === 'approved').length,
    rejected_count: rows.filter((e) => e.status === 'rejected').length,
    exited_count: rows.filter((e) => e.exited).length,
    material_exited_count: rows.filter((e) => e.entry_type === 'material' && e.exited).length,
    equipment_exited_count: rows.filter((e) => e.entry_type === 'equipment' && e.exited).length,
  }
}

/** 指挥部按项目汇总；材料/设备合并；字段与项目级看板指标对齐 */
export function buildHqDashboardByProject({ entry_type = '' } = {}) {
  return COC_PROJECT_OPTIONS.map((opt) => {
    const dash = getDashboard(opt.id, { entry_type })
    return {
      project_id: opt.id,
      project_name: opt.label,
      total_batches: dash.total_batches,
      material_count: dash.material_count,
      equipment_count: dash.equipment_count,
      in_approval_count: dash.in_approval_count,
      approved_count: dash.approved_count,
      rejected_count: dash.rejected_count,
      exited_count: dash.exited_count,
      material_exited_count: dash.material_exited_count,
      equipment_exited_count: dash.equipment_exited_count,
    }
  })
}

export function buildHqDashboardSummary({ entry_type = '' } = {}) {
  const rows = buildHqDashboardByProject({ entry_type })
  return rows.reduce(
    (acc, row) => {
      acc.projectCount += 1
      acc.total_batches += row.total_batches
      acc.material_count += row.material_count
      acc.equipment_count += row.equipment_count
      acc.in_approval_count += row.in_approval_count
      acc.approved_count += row.approved_count
      acc.rejected_count += row.rejected_count
      acc.exited_count += row.exited_count
      acc.material_exited_count += row.material_exited_count
      acc.equipment_exited_count += row.equipment_exited_count
      return acc
    },
    {
      projectCount: 0,
      total_batches: 0,
      material_count: 0,
      equipment_count: 0,
      in_approval_count: 0,
      approved_count: 0,
      rejected_count: 0,
      exited_count: 0,
      material_exited_count: 0,
      equipment_exited_count: 0,
    },
  )
}

function pushTodo(entry) {
  const isEq = entry.entry_type === 'equipment'
  const payload = {
    entryId: entry.entry_no,
    projectId: entry.project_id,
    projectLabel: getProjectLabel(entry.project_id) || entry.project_id,
    materialName: isEq ? entry.equipment_name : entry.material_name,
    equipmentName: entry.equipment_name || entry.material_name,
    brandName: entry.brand_name,
    applicantName: entry.applicant_name,
    applyTime: entry.submit_time,
    quantity: `${entry.quantity}${entry.unit}`,
    sampleId: entry.sample_application_id || '',
    entryType: entry.entry_type,
    supervisorName: entry.supervisor_approver_name || '',
  }
  createMatEntrySupervisorTodo(payload)
}

function resolveBrand(project_id, { ledger_id, brand_name, manufacturer, material_name }) {
  const brands = searchLedgerBrands('', project_id)
  if (ledger_id) {
    const hit = brands.find((b) => b.ledger_id === ledger_id)
    if (!hit) return { ok: false, msg: '品牌台账记录不存在' }
    return {
      ok: true,
      ledger_id: hit.ledger_id,
      brand_name: hit.brand_name,
      manufacturer: hit.manufacturer,
      material_name: hit.material_name,
    }
  }
  const bn = String(brand_name || '').trim()
  const mfr = String(manufacturer || '').trim()
  const mat = String(material_name || '').trim()
  if (!bn || !mfr) return { ok: false, msg: '请选择品牌台账（品牌+生产厂家+材料）' }
  let hit = null
  if (mat) {
    hit = brands.find(
      (b) => b.brand_name === bn && b.manufacturer === mfr && b.material_name === mat,
    )
  }
  if (!hit) {
    hit = brands.find((b) => b.brand_name === bn && b.manufacturer === mfr)
  }
  if (!hit) return { ok: false, msg: '品牌须选自本项目品牌台账' }
  return {
    ok: true,
    ledger_id: hit.ledger_id,
    brand_name: hit.brand_name,
    manufacturer: hit.manufacturer,
    material_name: hit.material_name,
  }
}

export function getRejectedMatAppsForCopy(projectId, { entry_type = '' } = {}) {
  return store.entries
    .filter((e) => e.project_id === projectId && e.status === 'rejected')
    .filter((e) => !entry_type || e.entry_type === entry_type)
    .map((e) => ({
      entry_no: e.entry_no,
      entry_type: e.entry_type,
      title: e.entry_type === 'equipment' ? e.equipment_name : e.material_name,
      brand_name: e.brand_name,
      submit_time: e.submit_time,
    }))
    .sort((a, b) => (a.submit_time < b.submit_time ? 1 : -1))
}

export function buildCopyPayloadFromRejectedMat(entryId) {
  const entry = store.entries.find((e) => e.entry_no === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (entry.status !== 'rejected') return { ok: false, msg: '仅已驳回单可复制新建' }
  return {
    ok: true,
    data: {
      copy_from_entry_no: entry.entry_no,
      entry_type: entry.entry_type,
      sample_application_id: entry.sample_application_id || '',
      ledger_id: entry.ledger_id || '',
      brand_name: entry.brand_name,
      manufacturer: entry.manufacturer,
      material_name: entry.material_name || '',
      equipment_name: entry.equipment_name || '',
      model: entry.model || '',
      use_part: entry.use_part || '',
      location_id: entry.location_id || '',
      location_ids: Array.isArray(entry.location_ids) ? [...entry.location_ids] : [],
      supplier: entry.supplier || '',
      line_items: Array.isArray(entry.line_items)
        ? entry.line_items.map((l) => ({ ...l }))
        : [],
      unpack_items: Array.isArray(entry.unpack_items)
        ? entry.unpack_items.map((i) => ({ ...i }))
        : createDefaultUnpackItems(),
      quantity: entry.quantity,
      unit: entry.unit,
      serial_no: entry.serial_no || '',
      cert_file: entry.cert_file || '',
      inspect_file: entry.inspect_file || '',
      photo_file: entry.photo_file || '',
      other_file: entry.other_file || '',
      supervisor_approver_user_id: entry.supervisor_approver_user_id || '',
      supervisor_approver_name: entry.supervisor_approver_name || '',
      supervisor_approver_post: entry.supervisor_approver_post || '',
      supervisor_approver_post_label: entry.supervisor_approver_post_label || '',
    },
  }
}

/** @deprecated 已取消同单号重新编辑；请从已驳回单复制新建 */
export function buildReEditPayloadFromWithdrawnMat(_entryId) {
  return { ok: false, msg: '不支持同单号重新编辑，请从已驳回单复制新建' }
}

function prepareEntryFields(payload) {
  const project_id = payload.project_id
  if (!project_id) return { ok: false, msg: '请切换到具体项目' }

  const entry_type = payload.entry_type === 'equipment' ? 'equipment' : 'material'

  if (!String(payload.supplier || '').trim()) return { ok: false, msg: '请填写供应商' }

  const approverRes = resolveSupervisorApproverFields(payload)
  if (!approverRes.ok) return approverRes
  const {
    supervisor_approver_user_id,
    supervisor_approver_name,
    supervisor_approver_post,
    supervisor_approver_post_label,
  } = approverRes

  const brandRes = resolveBrand(project_id, {
    ledger_id: payload.ledger_id,
    brand_name: payload.brand_name,
    manufacturer: payload.manufacturer,
    material_name: payload.material_name || payload.equipment_name,
  })
  if (!brandRes.ok) return brandRes

  let sample_application_id = String(payload.sample_application_id || '').trim()
  let use_part = String(payload.use_part || '').trim()
  let location_ids = Array.isArray(payload.location_ids)
    ? payload.location_ids.map(String).filter(Boolean)
    : []
  if (payload.location_id && !location_ids.length) location_ids = [String(payload.location_id)]

  let material_name = String(payload.material_name || brandRes.material_name || '').trim()
  let equipment_name = String(payload.equipment_name || '').trim()
  let model = String(payload.model || '').trim()
  let brand_name = brandRes.brand_name
  let manufacturer = brandRes.manufacturer
  let ledger_id = brandRes.ledger_id
  let brand_readonly_from_sample = false

  if (sample_application_id) {
    const sample = getApprovedSample(sample_application_id)
    if (!sample || sample.project_id !== project_id) {
      return { ok: false, msg: '定样不存在或不属于本项目' }
    }
    brand_name = sample.brand_name
    manufacturer = sample.manufacturer
    brand_readonly_from_sample = true
    if (sample.use_part && !use_part) use_part = sample.use_part
  }

  if (entry_type === 'equipment') {
    let line_items = Array.isArray(payload.line_items) ? payload.line_items : []
    if (!line_items.length && payload.quantity != null) {
      line_items = [
        {
          equipment_name: equipment_name || payload.equipment_name || material_name,
          material_spec: model || payload.model || '',
          model: model || payload.model || '',
          quantity: payload.quantity,
          unit: payload.unit,
          serial_no: payload.serial_no || '',
          purpose: payload.purpose || '',
          use_part: use_part || payload.use_part || '',
          location_id: location_ids[0] || payload.location_id || '',
          location_ids,
          waybill_no: payload.waybill_no || '',
          batch_no: payload.batch_no || 1,
          appearance_quality: payload.appearance_quality || '',
          acceptance_result: payload.acceptance_result || '',
          entry_date: payload.entry_date || '',
          cert_file: payload.cert_file || '',
          inspect_file: payload.inspect_file || '',
          photo_file: payload.photo_file || '',
          other_file: payload.other_file || '',
          inspect_result_checked: !!payload.inspect_result_checked,
          inspect_result_file: payload.inspect_result_checked
            ? payload.inspect_result_file || ''
            : '',
          unpack_items: Array.isArray(payload.unpack_items) ? payload.unpack_items : [],
        },
      ]
    }
    if (!line_items.length) return { ok: false, msg: '请至少填写一组设备明细' }

    const allowedEquipments = listMaterialsForEntryBrand(project_id, brand_name, manufacturer, {
      materialType: 'equipment',
    })
    const sampleEq = sample_application_id ? getApprovedSample(sample_application_id) : null
    if (sampleEq?.material_name && !allowedEquipments.includes(sampleEq.material_name)) {
      allowedEquipments.push(sampleEq.material_name)
    }

    const normalizedLines = []
    for (let i = 0; i < line_items.length; i += 1) {
      const row = line_items[i] || {}
      const en = String(row.equipment_name || row.material_name || equipment_name || '').trim()
      const modelSpec = String(row.model || row.material_spec || '').trim()
      const quantity = Number(row.quantity)
      const unit = String(row.unit || '').trim()
      if (!en) return { ok: false, msg: `设备明细第 ${i + 1} 组请选择设备名称` }
      if (allowedEquipments.length && !allowedEquipments.includes(en)) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组设备不在所选品牌对应范围内` }
      }
      if (!modelSpec) return { ok: false, msg: `设备明细第 ${i + 1} 组请填写规格型号` }
      if (!quantity || quantity <= 0) return { ok: false, msg: `设备明细第 ${i + 1} 组请填写有效数量` }
      if (!unit) return { ok: false, msg: `设备明细第 ${i + 1} 组请填写单位` }
      if (!String(row.appearance_quality || '').trim()) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组请选择外观质量` }
      }
      if (!String(row.acceptance_result || '').trim()) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组请选择验收结论` }
      }
      if (!String(row.entry_date || '').trim()) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组请填写进场日期` }
      }
      const cert_file = String(row.cert_file || payload.cert_file || '').trim()
      const inspect_file = String(row.inspect_file || payload.inspect_file || '').trim()
      const photo_file = String(row.photo_file || payload.photo_file || '').trim()
      const other_file = String(row.other_file || '').trim()
      const inspect_result_checked = !!row.inspect_result_checked
      const inspect_result_file = inspect_result_checked
        ? String(row.inspect_result_file || '').trim()
        : ''
      if (!cert_file) return { ok: false, msg: `设备明细第 ${i + 1} 组请上传合格证` }
      if (!isImageAttachmentName(cert_file)) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组合格证仅支持图片` }
      }
      if (!inspect_file) return { ok: false, msg: `设备明细第 ${i + 1} 组请上传质量证明文件` }
      if (!isPdfAttachmentName(inspect_file)) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组质量证明文件仅支持 PDF` }
      }
      if (!photo_file) return { ok: false, msg: `设备明细第 ${i + 1} 组请上传现场照片` }
      if (!isImageAttachmentName(photo_file)) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组现场照片仅支持图片` }
      }
      if (other_file && !isOtherAttachmentName(other_file)) {
        return { ok: false, msg: `设备明细第 ${i + 1} 组其他附件仅支持 jpg / png / pdf / word` }
      }
      const unpack_items = Array.isArray(row.unpack_items) ? row.unpack_items : []
      if (!unpack_items.length) return { ok: false, msg: `设备明细第 ${i + 1} 组请完成开箱清单` }
      const missingFixed = UNPACK_FIXED.some(
        (f) => !unpack_items.find((item) => item.key === f.key && item.ok !== undefined),
      )
      if (missingFixed) return { ok: false, msg: `设备明细第 ${i + 1} 组开箱清单须包含系统写死四项` }
      const rowLocationIds = Array.isArray(row.location_ids)
        ? row.location_ids.map(String).filter(Boolean)
        : []
      if (row.location_id && !rowLocationIds.length) rowLocationIds.push(String(row.location_id))
      normalizedLines.push({
        equipment_name: en,
        material_name: en,
        material_spec: modelSpec,
        model: modelSpec,
        quantity,
        unit,
        serial_no: String(row.serial_no || '').trim(),
        purpose: String(row.purpose || '').trim(),
        use_part: String(row.use_part || '').trim(),
        location_id: rowLocationIds[0] || String(row.location_id || ''),
        location_ids: rowLocationIds,
        waybill_no: String(row.waybill_no || '').trim(),
        batch_no: parseBatchSeq(row.batch_no, 1),
        appearance_quality: String(row.appearance_quality || '').trim(),
        acceptance_result: String(row.acceptance_result || '').trim(),
        entry_date: String(row.entry_date || '').trim(),
        cert_file,
        inspect_file,
        photo_file,
        other_file,
        inspect_result_checked,
        inspect_result_file,
        unpack_items: unpack_items.map((item) => ({
          key: item.key,
          label: item.label,
          fixed: !!item.fixed,
          ok: !!item.ok,
          remark: item.remark || '',
        })),
      })
    }

    equipment_name = normalizedLines[0].equipment_name
    model = normalizedLines[0].model
    const first = normalizedLines[0]
    const sameUnit = normalizedLines.every((l) => l.unit === first.unit)
    const totalQty = normalizedLines.reduce((sum, l) => sum + Number(l.quantity || 0), 0)
    if (first.use_part) use_part = first.use_part
    if (first.location_ids?.length) location_ids = [...first.location_ids]

    const byEq = searchEntryBrands('', project_id, { materialType: 'equipment' }).find(
      (b) =>
        b.brand_name === brand_name &&
        b.manufacturer === manufacturer &&
        b.material_name === first.equipment_name,
    )
    if (byEq) ledger_id = byEq.ledger_id

    return {
      ok: true,
      fields: {
        entry_type: 'equipment',
        project_id,
        sample_application_id,
        ledger_id,
        equipment_name,
        material_name: equipment_name,
        model,
        use_part,
        location_id: location_ids[0] || '',
        location_ids,
        brand_name,
        manufacturer,
        brand_readonly_from_sample,
        line_items: normalizedLines,
        quantity: sameUnit ? totalQty : first.quantity,
        unit: first.unit,
        supplier: String(payload.supplier || '').trim(),
        serial_no: first.serial_no || '',
        batch_no: first.batch_no || '',
        waybill_no: first.waybill_no || '',
        material_spec: first.material_spec || '',
        unpack_items: first.unpack_items.map((item) => ({ ...item })),
        cert_file: first.cert_file,
        inspect_file: first.inspect_file,
        photo_file: first.photo_file,
        other_file: first.other_file || '',
        supervisor_approver_user_id,
        supervisor_approver_name,
        supervisor_approver_post,
        supervisor_approver_post_label,
      },
    }
  }

  let line_items = Array.isArray(payload.line_items) ? payload.line_items : []
  if (!line_items.length && payload.quantity != null) {
    line_items = [
      {
        material_name: material_name,
        material_spec: payload.material_spec || '',
        quantity: payload.quantity,
        unit: payload.unit,
        waybill_no: payload.waybill_no || '',
        batch_no: payload.batch_no || '',
      },
    ]
  }
  if (!line_items.length) return { ok: false, msg: '请至少填写一条进场明细' }

  const allowedMaterials = listMaterialsForEntryBrand(project_id, brand_name, manufacturer, {
    materialType: 'material',
  })
  const sample = sample_application_id ? getApprovedSample(sample_application_id) : null
  if (sample?.material_name && !allowedMaterials.includes(sample.material_name)) {
    allowedMaterials.push(sample.material_name)
  }

  const normalizedLines = []
  for (let i = 0; i < line_items.length; i += 1) {
    const row = line_items[i] || {}
    const mn = String(row.material_name || material_name || '').trim()
    const material_spec = String(row.material_spec || '').trim()
    const quantity = Number(row.quantity)
    const unit = String(row.unit || '').trim()
    if (!mn) return { ok: false, msg: `进场明细第 ${i + 1} 组请选择材料名称` }
    if (allowedMaterials.length && !allowedMaterials.includes(mn)) {
      return { ok: false, msg: `进场明细第 ${i + 1} 组材料不在所选品牌对应范围内` }
    }
    if (!material_spec) return { ok: false, msg: `进场明细第 ${i + 1} 组请填写规格型号` }
    if (!quantity || quantity <= 0) return { ok: false, msg: `进场明细第 ${i + 1} 组请填写有效数量` }
    if (!unit) return { ok: false, msg: `进场明细第 ${i + 1} 组请填写单位` }
    const cert_file = String(row.cert_file || payload.cert_file || '').trim()
    const inspect_file = String(row.inspect_file || payload.inspect_file || '').trim()
    const photo_file = String(row.photo_file || payload.photo_file || '').trim()
    const other_file = String(row.other_file || '').trim()
    const inspect_result_checked = !!row.inspect_result_checked
    const inspect_result_file = inspect_result_checked
      ? String(row.inspect_result_file || '').trim()
      : ''
    if (!cert_file) return { ok: false, msg: `进场明细第 ${i + 1} 组请上传合格证` }
    if (!isImageAttachmentName(cert_file)) {
      return { ok: false, msg: `进场明细第 ${i + 1} 组合格证仅支持图片` }
    }
    if (!inspect_file) return { ok: false, msg: `进场明细第 ${i + 1} 组请上传质量证明文件` }
    if (!isPdfAttachmentName(inspect_file)) {
      return { ok: false, msg: `进场明细第 ${i + 1} 组质量证明文件仅支持 PDF` }
    }
    if (!photo_file) return { ok: false, msg: `进场明细第 ${i + 1} 组请上传现场照片` }
    if (!isImageAttachmentName(photo_file)) {
      return { ok: false, msg: `进场明细第 ${i + 1} 组现场照片仅支持图片` }
    }
    if (other_file && !isOtherAttachmentName(other_file)) {
      return { ok: false, msg: `进场明细第 ${i + 1} 组其他附件仅支持 jpg / png / pdf / word` }
    }
    const rowLocationIds = Array.isArray(row.location_ids)
      ? row.location_ids.map(String).filter(Boolean)
      : []
    if (row.location_id && !rowLocationIds.length) rowLocationIds.push(String(row.location_id))
    normalizedLines.push({
      material_name: mn,
      material_spec,
      quantity,
      unit,
      purpose: String(row.purpose || '').trim(),
      use_part: String(row.use_part || '').trim(),
      location_id: rowLocationIds[0] || String(row.location_id || ''),
      location_ids: rowLocationIds,
      waybill_no: String(row.waybill_no || '').trim(),
      batch_no: parseBatchSeq(row.batch_no, 1),
      appearance_quality: String(row.appearance_quality || '').trim(),
      acceptance_result: String(row.acceptance_result || '').trim(),
      entry_date: String(row.entry_date || '').trim(),
      cert_file,
      inspect_file,
      photo_file,
      other_file,
      inspect_result_checked,
      inspect_result_file,
    })
  }

  material_name = normalizedLines[0].material_name
  const first = normalizedLines[0]
  const sameUnit = normalizedLines.every((l) => l.unit === first.unit)
  const totalQty = normalizedLines.reduce((sum, l) => sum + Number(l.quantity || 0), 0)
  if (first.use_part) use_part = first.use_part
  if (first.location_ids?.length) location_ids = [...first.location_ids]

  const byMat = searchEntryBrands('', project_id, { materialType: 'material' }).find(
    (b) =>
      b.brand_name === brand_name &&
      b.manufacturer === manufacturer &&
      b.material_name === first.material_name,
  )
  if (byMat) ledger_id = byMat.ledger_id

  return {
    ok: true,
    fields: {
      entry_type: 'material',
      project_id,
      sample_application_id,
      ledger_id,
      material_name,
      equipment_name: '',
      model: '',
      use_part,
      location_id: location_ids[0] || '',
      location_ids,
      brand_name,
      manufacturer,
      brand_readonly_from_sample,
      line_items: normalizedLines,
      quantity: sameUnit ? totalQty : first.quantity,
      unit: first.unit,
      supplier: String(payload.supplier || '').trim(),
      batch_no: first.batch_no || '',
      waybill_no: first.waybill_no || '',
      material_spec: first.material_spec || '',
      serial_no: '',
      unpack_items: undefined,
      cert_file: first.cert_file,
      inspect_file: first.inspect_file,
      photo_file: first.photo_file,
      other_file: first.other_file || '',
      supervisor_approver_user_id,
      supervisor_approver_name,
      supervisor_approver_post,
      supervisor_approver_post_label,
    },
  }
}

/** @deprecated 已取消同单号重提；请 submitEntry 从驳回单复制新建 */
export function resubmitEntry(_entryId, _payload) {
  return { ok: false, msg: '不支持同单号重新提交，请从已驳回单复制新建' }
}

/** @deprecated 兼容旧调用 */
export function getRejectedEntryForReopen(entryId) {
  return buildCopyPayloadFromRejectedMat(entryId)
}

function pushSubmitApprovalRecord(entry) {
  store.approvalSeq += 1
  store.approvals.push({
    approval_id: `AR-ME-${store.approvalSeq}`,
    entry_no: entry.entry_no,
    node: 'submit',
    action: 'submit',
    opinion: entry.copy_from_entry_no
      ? `从 ${entry.copy_from_entry_no} 复制新建提交`
      : '提交进场报审',
    operator_name: entry.applicant_name || '当前用户',
    time: entry.submit_time || nowStr(),
  })
}

export function submitEntry(payload) {
  const prepared = prepareEntryFields(payload)
  if (!prepared.ok) return prepared
  const { fields } = prepared

  const copy_from_entry_no = String(payload.copy_from_entry_no || payload.related_reject_id || '').trim()
  if (copy_from_entry_no) {
    const origin = store.entries.find((e) => e.entry_no === copy_from_entry_no)
    if (!origin) return { ok: false, msg: '复制来源单不存在' }
    if (origin.status !== 'rejected') return { ok: false, msg: '仅可从已驳回单复制新建' }
    if (origin.project_id !== fields.project_id) return { ok: false, msg: '复制来源单不属于本项目' }
  }

  store.seq += 1
  const entry_no = `ME-${String(store.seq).padStart(3, '0')}`
  const submit_time = nowStr()
  const entry = {
    entry_no,
    ...fields,
    status: 'reviewing',
    current_node_key: 'supervisor',
    applicant_name: payload.applicant_name || '当前用户',
    submit_time,
    finish_time: '',
    exited: false,
    remark: '',
    copy_from_entry_no,
  }
  if (fields.entry_type === 'equipment') {
    // 设备明细保留 line_items；表头 unpack_items 为首组副本便于旧页面兼容
  } else {
    delete entry.unpack_items
    delete entry.serial_no
    delete entry.model
    delete entry.equipment_name
  }
  store.entries.unshift(entry)
  pushSubmitApprovalRecord(entry)
  pushTodo(entry)
  return { ok: true, data: entry }
}

/** @deprecated 已取消同单号重提；请 submitEntry 从驳回单复制新建 */
export function resubmitWithdrawnEntry(_entryId, _payload) {
  return { ok: false, msg: '不支持同单号重新提交，请从已驳回单复制新建' }
}

/** 进场申请不再支持撤回 */
export function withdrawEntry(_entryId) {
  return { ok: false, msg: '不支持撤回' }
}

export function supervisorApproveEntry(entryId, { action, opinion } = {}) {
  const entry = store.entries.find((e) => e.entry_no === entryId)
  if (!entry) return { ok: false, msg: '单据不存在' }
  if (!isReviewingStatus(entry.status)) return { ok: false, msg: '当前不可审批' }
  if (action !== 'agree' && action !== 'reject') return { ok: false, msg: '无效操作' }
  if (action === 'reject' && !String(opinion || '').trim()) {
    return { ok: false, msg: '驳回意见必填' }
  }
  store.approvalSeq += 1
  const time = nowStr()
  store.approvals.push({
    approval_id: `AR-ME-${store.approvalSeq}`,
    entry_no: entryId,
    node: 'supervisor',
    action,
    opinion: String(opinion || '').trim(),
    operator_name: '当前用户',
    time,
  })
  discardMatEntryTodos(entryId)
  discardEqEntryTodos(entryId)
  if (action === 'agree') {
    entry.status = 'approved'
    entry.current_node_key = 'none'
    entry.finish_time = time
  } else {
    entry.status = 'rejected'
    entry.current_node_key = 'none'
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
      const e = store.entries.find((row) => row.entry_no === x.entry_no)
      return e && e.project_id === projectId
    })
    .map((x) => {
      const e = store.entries.find((row) => row.entry_no === x.entry_no)
      return {
        ...x,
        entry_type: e?.entry_type || 'material',
        material_name:
          e?.entry_type === 'equipment'
            ? e?.equipment_name || e?.material_name || ''
            : e?.material_name || '',
        brand_name: e?.brand_name || '',
        supplier: e?.supplier || '',
        manufacturer: e?.manufacturer || '',
        use_part: e?.use_part || '',
        unit: e?.unit || '',
        quantity: e?.quantity ?? null,
        sample_application_id: e?.sample_application_id || '',
      }
    })
  if (kw) {
    rows = rows.filter(
      (x) =>
        x.exit_no.toLowerCase().includes(kw) ||
        x.entry_no.toLowerCase().includes(kw) ||
        (x.material_name || '').toLowerCase().includes(kw) ||
        (x.brand_name || '').toLowerCase().includes(kw) ||
        (x.supplier || '').toLowerCase().includes(kw) ||
        (x.reason || '').toLowerCase().includes(kw),
    )
  }
  return rows.sort((a, b) => (a.exit_time < b.exit_time ? 1 : -1))
}

export function getExitDetail(exitId) {
  const x = store.exits.find((row) => row.exit_no === exitId)
  if (!x) return null
  const e = store.entries.find((row) => row.entry_no === x.entry_no)
  if (!e) return { ...x }
  return {
    ...x,
    entry_type: e.entry_type || 'material',
    material_name:
      e.entry_type === 'equipment'
        ? e.equipment_name || e.material_name || ''
        : e.material_name || '',
    brand_name: e.brand_name,
    supplier: e.supplier,
    manufacturer: e.manufacturer || '',
    use_part: e.use_part || '',
    unit: e.unit,
    quantity: e.quantity,
    sample_application_id: e.sample_application_id || '',
    material_spec: e.material_spec || e.model || '',
  }
}

export function registerExit(payload) {
  const entry = store.entries.find((e) => e.entry_no === payload.entry_no)
  if (!entry) return { ok: false, msg: '进场单不存在' }
  if (entry.status !== 'approved') return { ok: false, msg: '仅已通过进场单可退场' }
  if (entry.exited) return { ok: false, msg: '该进场单已退场' }
  if (!payload.reason?.trim()) return { ok: false, msg: '请填写退场原因' }
  const exit_qty = Number(payload.exit_qty)
  if (!exit_qty || exit_qty <= 0) return { ok: false, msg: '请填写有效退场数量' }
  if (exit_qty > entry.quantity) return { ok: false, msg: '退场数量不可大于进场数量' }

  const operator_name = payload.operator_name || payload.operator || '当前用户'
  const row = {
    exit_no: `EX-${entry.entry_no}`,
    entry_no: entry.entry_no,
    exit_qty,
    reason: payload.reason.trim(),
    photo_file: payload.photo_file || '',
    exit_time: nowStr(),
    operator_name,
  }
  store.exits.unshift(row)
  entry.exited = true
  entry.exit_no = row.exit_no
  entry.exit_qty = row.exit_qty
  entry.exit_time = row.exit_time
  entry.reason = row.reason
  entry.exit_operator = row.operator_name
  entry.exit_photo = row.photo_file
  return { ok: true, data: row }
}

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
      const name = e.entry_type === 'equipment' ? e.equipment_name : e.material_name
      return (
        e.entry_no.toLowerCase().includes(kw) ||
        (name || '').toLowerCase().includes(kw) ||
        (e.brand_name || '').toLowerCase().includes(kw) ||
        (e.supplier || '').toLowerCase().includes(kw) ||
        (e.batch_no || '').toLowerCase().includes(kw) ||
        (e.use_part || '').toLowerCase().includes(kw)
      )
    })
    .map((e) => ({
      source: e.entry_type === 'equipment' ? 'eq' : 'mat',
      source_label: e.entry_type === 'equipment' ? '设备' : '材料',
      material_id: e.entry_no,
      material_name: e.entry_type === 'equipment' ? e.equipment_name : e.material_name,
      batch_no: e.batch_no || e.serial_no || e.waybill_no || '',
      supplier: e.supplier || '',
      brand_name: e.brand_name || '',
      use_part: e.use_part || '',
      location_id: e.location_id || '',
      location_ids: Array.isArray(e.location_ids) ? [...e.location_ids] : [],
      quantity_text: `${e.quantity ?? ''}${e.unit || ''}`,
    }))
}

/** 设备类型专用查询（eq.js 转调） */
export function listEquipmentEntries(projectId, filters = {}) {
  return listEntries(projectId, { ...filters, entry_type: 'equipment' })
}

export function getEquipmentEntryDetail(entryId) {
  const detail = getEntryDetail(entryId)
  if (!detail || detail.entry_type !== 'equipment') return null
  return detail
}

export function supervisorApproveEquipmentEntry(entryId, opts) {
  const detail = getEntryDetail(entryId)
  if (!detail || detail.entry_type !== 'equipment') {
    return { ok: false, msg: '设备进场单不存在' }
  }
  return supervisorApproveEntry(entryId, opts)
}

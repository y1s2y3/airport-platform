/**
 * 分包单位报审 / 指挥部台账 Mock
 * - 项目层：报审（待审批→审批中→已通过/已驳回；可撤回）
 * - 已驳回 / 已撤回：支持重新报审
 * - 指挥部：仅展示已通过记录
 * - 审批：个人中心待办推进；通过后同步项目画像
 */
import { reactive } from 'vue'
import { projectList } from './projectBasicInfo'
import { createSubcontractorBlock, mergeSafetyProfile } from './projectSafetyProfile'

export const subcontractorTypeOptions = ['专业分包', '劳务分包']
export const subcontractorApproveStatusOptions = ['待审批', '审批中', '已通过', '已驳回', '已撤回']

export function isSubcontractorInApproval(status) {
  return status === '待审批' || status === '审批中'
}

export function canResubmitSubcontractor(status) {
  return status === '已驳回' || status === '已撤回'
}

/** 审批节点（提交后依次推进；抄送不卡流程） */
export const SUBCONTRACTOR_APPROVAL_NODES = [
  { key: 'pm', title: '项目经理审批', user: '项目经理' },
  { key: 'dept_head', title: '项目部部长审批', user: '项目部部长' },
  { key: 'design_lin', title: '设计部·林坩审批', user: '林坩' },
  { key: 'design_leader', title: '设计部领导审批', user: '设计部领导' },
]

export const SUBCONTRACTOR_CC = {
  key: 'cc_zhu',
  title: '抄送副指挥长（朱指挥）',
  user: '朱指挥',
}

function nowStr() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

function emptyQualification() {
  return { certNo: '', fileName: '', fileUrl: '' }
}

function emptySafetyLicense() {
  return { licenseNo: '', expiry: '', photoName: '', photoUrl: '' }
}

function emptyLaborContract() {
  return { contractNo: '', fileName: '', fileUrl: '', amount: '' }
}

export function createEmptySubcontractorApplication(projectId = '', projectName = '') {
  return {
    id: `sc-app-${Date.now()}`,
    projectId,
    projectName,
    name: '',
    unitType: '专业分包',
    projectLeaderContact: '',
    safetyManagerContact: '',
    orgStructureDesc: '',
    qualifications: [emptyQualification()],
    safetyLicense: emptySafetyLicense(),
    laborContract: emptyLaborContract(),
    status: '',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '',
    approvalFlow: [],
    createdAt: nowStr(),
    updatedAt: nowStr(),
  }
}

export function cloneSubcontractorApplication(row) {
  const primary = String(row.safetyManagerContact || '').trim()
  const secondary = String(row.safetyManagerContact2 || '').trim()
  const safetyManagerContact = [primary, secondary].filter(Boolean).join('；')
  const next = {
    ...row,
    safetyManagerContact,
    qualifications: (row.qualifications || []).map((item) => ({ ...item })),
    safetyLicense: { ...(row.safetyLicense || emptySafetyLicense()) },
    laborContract: { ...(row.laborContract || emptyLaborContract()) },
    approvalFlow: (row.approvalFlow || []).map((item) => ({ ...item })),
  }
  delete next.safetyManagerContact2
  return next
}

function buildSubmitFlow(applicant, applyTime) {
  return [
    {
      title: '施工单位提交',
      time: applyTime,
      user: applicant || '施工单位',
      remark: '已提交报审',
      status: 'done',
      nodeKey: 'submit',
    },
    ...SUBCONTRACTOR_APPROVAL_NODES.map((node, index) => ({
      title: node.title,
      time: '',
      user: node.user,
      remark: index === 0 ? '待审批' : '待流转',
      status: index === 0 ? 'current' : 'pending',
      nodeKey: node.key,
    })),
    {
      title: SUBCONTRACTOR_CC.title,
      time: '',
      user: SUBCONTRACTOR_CC.user,
      remark: '审批通过后抄送',
      status: 'pending',
      nodeKey: SUBCONTRACTOR_CC.key,
      isCc: true,
    },
  ]
}

/** 已走到指定节点（currentNodeKey）的审批流 */
function buildFlowAtNode(applicant, submitTime, currentNodeKey, remarks = {}) {
  const flow = buildSubmitFlow(applicant, submitTime)
  const nodeKeys = SUBCONTRACTOR_APPROVAL_NODES.map((n) => n.key)
  const currentIdx = nodeKeys.indexOf(currentNodeKey)
  if (currentIdx < 0) return flow
  flow.forEach((step) => {
    if (step.nodeKey === 'submit' || step.isCc) return
    const idx = nodeKeys.indexOf(step.nodeKey)
    if (idx < currentIdx) {
      step.status = 'done'
      step.time = submitTime
      step.remark = remarks[step.nodeKey] || '同意'
    } else if (idx === currentIdx) {
      step.status = 'current'
      step.remark = '待审批'
      step.time = ''
    } else {
      step.status = 'pending'
      step.remark = '待流转'
      step.time = ''
    }
  })
  return flow
}

function buildApprovedFlow(applicant, submitTime, approveTime) {
  return [
    {
      title: '施工单位提交',
      time: submitTime,
      user: applicant || '施工单位',
      remark: '已提交报审',
      status: 'done',
      nodeKey: 'submit',
    },
    ...SUBCONTRACTOR_APPROVAL_NODES.map((node) => ({
      title: node.title,
      time: approveTime,
      user: node.user,
      remark: '同意',
      status: 'done',
      nodeKey: node.key,
    })),
    {
      title: SUBCONTRACTOR_CC.title,
      time: approveTime,
      user: SUBCONTRACTOR_CC.user,
      remark: '已抄送知悉',
      status: 'done',
      nodeKey: SUBCONTRACTOR_CC.key,
      isCc: true,
    },
  ]
}

function buildWithdrawnFlow(applicant, submitTime, withdrawTime) {
  return [
    {
      title: '施工单位提交',
      time: submitTime,
      user: applicant || '施工单位',
      remark: '已提交报审',
      status: 'done',
      nodeKey: 'submit',
    },
    {
      title: '申请人撤回',
      time: withdrawTime,
      user: applicant || '施工单位',
      remark: '已撤回报审',
      status: 'done',
      nodeKey: 'withdraw',
    },
  ]
}

function buildRejectedFlow(applicant, submitTime, rejectTime, rejectNodeKey, rejectRemark) {
  const flow = buildFlowAtNode(applicant, submitTime, rejectNodeKey)
  const step = flow.find((s) => s.nodeKey === rejectNodeKey)
  if (step) {
    step.status = 'done'
    step.time = rejectTime
    step.remark = rejectRemark || '驳回，请补充材料后重新提交'
  }
  flow.forEach((s) => {
    if (s.status === 'current' || s.status === 'pending') {
      s.status = 'pending'
      s.remark = s.isCc ? '审批未通过，未抄送' : '已终止'
      s.time = ''
    }
  })
  return flow
}

const seedList = [
  {
    id: 'sc-app-001',
    projectId: 'p-000',
    projectName: '宝安国际机场T2航站区及配套工程',
    name: '深圳市政集团有限公司',
    unitType: '专业分包',
    projectLeaderContact: '陈市政 / 13600136006',
    safetyManagerContact: '赵安全 / 13500135007；钱安全 / 13400134008',
    orgStructureDesc: '项目经理部下设安全部、技术部、质量部；现场设专职安全员 2 名。',
    qualifications: [
      { certNo: 'D1440000005566778', fileName: '市政总包一级资质.pdf', fileUrl: '' },
      { certNo: 'D2440000001122334', fileName: '公路二级资质.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2023〕009876',
      expiry: '2026-12-31',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-T2-FB-2025-012',
      fileName: '劳务合同.pdf',
      fileUrl: '',
      amount: '2800',
    },
    status: '已通过',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-06-10 09:20:00',
    approvalFlow: buildApprovedFlow('施工单位', '2026-06-10 09:20:00', '2026-06-12 09:10:00'),
    createdAt: '2026-06-10 09:00:00',
    updatedAt: '2026-06-12 09:10:00',
  },
  {
    id: 'sc-app-002',
    projectId: 'p-000',
    projectName: '宝安国际机场T2航站区及配套工程',
    name: '深圳广田装饰集团股份有限公司',
    unitType: '专业分包',
    projectLeaderContact: '郑经理 / 12800128014',
    safetyManagerContact: '冯安全 / 12700127015',
    orgStructureDesc: '装饰专业分包，现场配置项目负责人、安全员及质量员。',
    qualifications: [
      { certNo: 'D1440000006677889', fileName: '装饰一级资质.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2021〕003210',
      expiry: '2025-12-31',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-T2-FB-2025-018',
      fileName: '劳务分包合同.pdf',
      fileUrl: '',
      amount: '960',
    },
    status: '待审批',
    currentNodeKey: 'pm',
    submitter: '施工单位',
    submitTime: '2026-08-18 10:00:00',
    approvalFlow: buildSubmitFlow('施工单位', '2026-08-18 10:00:00'),
    createdAt: '2026-08-18 09:40:00',
    updatedAt: '2026-08-18 10:00:00',
  },
  {
    id: 'sc-app-003',
    projectId: 'p-003',
    projectName: '深圳机场三跑道扩建工程',
    name: '广东建工集团有限公司',
    unitType: '劳务分包',
    projectLeaderContact: '刘经理 / 13300133009',
    safetyManagerContact: '吴安全 / 13200132010',
    orgStructureDesc: '劳务分包队伍，按工种编组管理。',
    qualifications: [
      { certNo: 'D3440000004455667', fileName: '地基基础一级.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2025〕004321',
      expiry: '2028-03-15',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-SPD-LW-2026-003',
      fileName: '劳务合同.pdf',
      fileUrl: '',
      amount: '1500',
    },
    status: '已通过',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-05-20 11:00:00',
    approvalFlow: buildApprovedFlow('施工单位', '2026-05-20 11:00:00', '2026-05-22 10:00:00'),
    createdAt: '2026-05-20 10:30:00',
    updatedAt: '2026-05-22 10:00:00',
  },
  {
    id: 'sc-app-004',
    projectId: 'p-000',
    projectName: '宝安国际机场T2航站区及配套工程',
    name: '中建三局集团有限公司',
    unitType: '专业分包',
    projectLeaderContact: '周建华 / 13800138021',
    safetyManagerContact: '孙安全 / 13700137022；李安管 / 13600136023',
    orgStructureDesc: '钢结构专业分包，设项目部、安全组、质量组，专职安全员 3 名。',
    qualifications: [
      { certNo: 'D1440000007788990', fileName: '钢结构一级资质.pdf', fileUrl: '' },
      { certNo: 'D2440000002233445', fileName: '起重设备安装资质.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2024〕011234',
      expiry: '2027-06-30',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-T2-FB-2026-021',
      fileName: '钢结构分包合同.pdf',
      fileUrl: '',
      amount: '4200',
    },
    status: '审批中',
    currentNodeKey: 'dept_head',
    submitter: '施工单位',
    submitTime: '2026-08-12 09:30:00',
    approvalFlow: buildFlowAtNode('施工单位', '2026-08-12 09:30:00', 'dept_head'),
    createdAt: '2026-08-12 09:00:00',
    updatedAt: '2026-08-13 16:20:00',
  },
  {
    id: 'sc-app-005',
    projectId: 'p-000',
    projectName: '宝安国际机场T2航站区及配套工程',
    name: '深圳市金螳螂建筑装饰股份有限公司',
    unitType: '专业分包',
    projectLeaderContact: '王装修 / 13900139024',
    safetyManagerContact: '陈安员 / 13800138025',
    orgStructureDesc: '精装修专业分包，现场设项目负责人及专职安全员。',
    qualifications: [
      { certNo: 'D1440000008899001', fileName: '建筑装修装饰一级.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2022〕007654',
      expiry: '2026-08-31',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-T2-FB-2026-025',
      fileName: '装饰分包合同.pdf',
      fileUrl: '',
      amount: '1860',
    },
    status: '已撤回',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-08-19 10:00:00',
    approvalFlow: buildWithdrawnFlow('施工单位', '2026-08-19 10:00:00', '2026-08-19 15:10:00'),
    createdAt: '2026-08-19 14:20:00',
    updatedAt: '2026-08-19 15:10:00',
  },
  {
    id: 'sc-app-006',
    projectId: 'p-000',
    projectName: '宝安国际机场T2航站区及配套工程',
    name: '广东水电二局股份有限公司',
    unitType: '劳务分包',
    projectLeaderContact: '黄水电 / 13700137026',
    safetyManagerContact: '林安管 / 13600136027；何安全 / 13500135028',
    orgStructureDesc: '机电安装劳务队伍，按班组编组，设专职安全员 2 名。',
    qualifications: [
      { certNo: 'D3440000005566778', fileName: '机电安装劳务资质.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2023〕005432',
      expiry: '2026-11-30',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-T2-LW-2026-008',
      fileName: '劳务合同.pdf',
      fileUrl: '',
      amount: '680',
    },
    status: '已驳回',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-08-05 11:00:00',
    approvalFlow: buildRejectedFlow(
      '施工单位',
      '2026-08-05 11:00:00',
      '2026-08-06 15:30:00',
      'pm',
      '驳回：请补充专职安全员资格证书扫描件',
    ),
    createdAt: '2026-08-05 10:30:00',
    updatedAt: '2026-08-06 15:30:00',
  },
  {
    id: 'sc-app-007',
    projectId: 'p-001',
    projectName: '深圳宝安国际机场T1航站区及配套设施工程项目',
    name: '中国建筑第八工程局有限公司',
    unitType: '专业分包',
    projectLeaderContact: '张八局 / 13600136031',
    safetyManagerContact: '赵安监 / 13500135032',
    orgStructureDesc: '土建专业分包，配置项目经理、技术负责人、安全负责人。',
    qualifications: [
      { certNo: 'D1440000009900112', fileName: '房建总承包一级.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2024〕008765',
      expiry: '2027-12-31',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-T1-FB-2026-004',
      fileName: '专业分包合同.pdf',
      fileUrl: '',
      amount: '5600',
    },
    status: '已通过',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-07-08 09:00:00',
    approvalFlow: buildApprovedFlow('施工单位', '2026-07-08 09:00:00', '2026-07-10 11:20:00'),
    createdAt: '2026-07-08 08:40:00',
    updatedAt: '2026-07-10 11:20:00',
  },
  {
    id: 'sc-app-008',
    projectId: 'p-001',
    projectName: '深圳宝安国际机场T1航站区及配套设施工程项目',
    name: '深圳市建安集团股份有限公司',
    unitType: '劳务分包',
    projectLeaderContact: '罗建安 / 13400134033',
    safetyManagerContact: '邓安全 / 13300133034；谢安员 / 13200132035',
    orgStructureDesc: '脚手架及模板劳务分包，现场设安全巡查岗。',
    qualifications: [
      { certNo: 'D3440000006677889', fileName: '模板脚手架劳务资质.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2025〕002198',
      expiry: '2028-05-20',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-T1-LW-2026-011',
      fileName: '劳务合同.pdf',
      fileUrl: '',
      amount: '420',
    },
    status: '审批中',
    currentNodeKey: 'design_lin',
    submitter: '施工单位',
    submitTime: '2026-08-15 14:00:00',
    approvalFlow: buildFlowAtNode('施工单位', '2026-08-15 14:00:00', 'design_lin'),
    createdAt: '2026-08-15 13:30:00',
    updatedAt: '2026-08-16 17:00:00',
  },
  {
    id: 'sc-app-009',
    projectId: 'p-003',
    projectName: '深圳机场三跑道扩建工程',
    name: '中交第二航务工程局有限公司',
    unitType: '专业分包',
    projectLeaderContact: '马二航 / 13100131036',
    safetyManagerContact: '高安全 / 13000130037；徐安管 / 12900129038；蒋安员 / 12800128039',
    orgStructureDesc: '道面及场道工程专业分包，设安全总监及专职安全员 3 名。',
    qualifications: [
      { certNo: 'D1440000001122334', fileName: '机场场道工程一级.pdf', fileUrl: '' },
      { certNo: 'D2440000003344556', fileName: '公路路面一级.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（鄂）JZ安许证字〔2023〕015678',
      expiry: '2026-09-30',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-SPD-FB-2026-015',
      fileName: '场道专业分包合同.pdf',
      fileUrl: '',
      amount: '8900',
    },
    status: '审批中',
    currentNodeKey: 'design_leader',
    submitter: '施工单位',
    submitTime: '2026-08-10 10:15:00',
    approvalFlow: buildFlowAtNode('施工单位', '2026-08-10 10:15:00', 'design_leader'),
    createdAt: '2026-08-10 09:50:00',
    updatedAt: '2026-08-14 11:40:00',
  },
  {
    id: 'sc-app-010',
    projectId: 'p-003',
    projectName: '深圳机场三跑道扩建工程',
    name: '中铁十二局集团有限公司',
    unitType: '劳务分包',
    projectLeaderContact: '秦十二 / 12700127040',
    safetyManagerContact: '韩安全 / 12600126041',
    orgStructureDesc: '土石方劳务分包，按施工段编组管理。',
    qualifications: [
      { certNo: 'D3440000007788990', fileName: '土石方劳务资质.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（晋）JZ安许证字〔2024〕009876',
      expiry: '2027-04-30',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-SPD-LW-2026-019',
      fileName: '劳务合同.pdf',
      fileUrl: '',
      amount: '2100',
    },
    status: '已撤回',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-08-18 10:00:00',
    approvalFlow: buildWithdrawnFlow('施工单位', '2026-08-18 10:00:00', '2026-08-18 16:40:00'),
    createdAt: '2026-08-18 16:00:00',
    updatedAt: '2026-08-18 16:40:00',
  },
  {
    id: 'sc-app-011',
    projectId: 'p-pump-002',
    projectName: '深圳宝安国际机场T2航站区及配套设施工程-新建2号雨水提升泵站工程',
    name: '深圳市水务建设工程有限公司',
    unitType: '专业分包',
    projectLeaderContact: '蔡水务 / 12500125042',
    safetyManagerContact: '潘安全 / 12400124043；袁安管 / 12300123044',
    orgStructureDesc: '泵站机电及管道专业分包，设项目负责人、安全员、质量员。',
    qualifications: [
      { certNo: 'D1440000004455667', fileName: '市政公用工程一级.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2025〕006543',
      expiry: '2028-01-15',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-BZ-FB-2026-002',
      fileName: '机电分包合同.pdf',
      fileUrl: '',
      amount: '1250',
    },
    status: '已通过',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-07-22 09:40:00',
    approvalFlow: buildApprovedFlow('施工单位', '2026-07-22 09:40:00', '2026-07-24 15:00:00'),
    createdAt: '2026-07-22 09:10:00',
    updatedAt: '2026-07-24 15:00:00',
  },
  {
    id: 'sc-app-012',
    projectId: 'p-pump-002',
    projectName: '深圳宝安国际机场T2航站区及配套设施工程-新建2号雨水提升泵站工程',
    name: '广东腾越建筑工程有限公司',
    unitType: '劳务分包',
    projectLeaderContact: '邹腾越 / 12200122045',
    safetyManagerContact: '尹安全 / 12100121046',
    orgStructureDesc: '基坑支护劳务分包，现场配备专职安全员。',
    qualifications: [
      { certNo: 'D3440000008899001', fileName: '基坑支护劳务资质.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（粤）JZ安许证字〔2022〕004321',
      expiry: '2026-10-31',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-BZ-LW-2026-006',
      fileName: '劳务合同.pdf',
      fileUrl: '',
      amount: '380',
    },
    status: '待审批',
    currentNodeKey: 'pm',
    submitter: '施工单位',
    submitTime: '2026-08-19 09:00:00',
    approvalFlow: buildSubmitFlow('施工单位', '2026-08-19 09:00:00'),
    createdAt: '2026-08-19 08:30:00',
    updatedAt: '2026-08-19 09:00:00',
  },
  {
    id: 'sc-app-013',
    projectId: 'p-east-terminal',
    projectName: '深圳宝安国际机场东航站区、停车楼及配套业务设施项目',
    name: '上海建工集团股份有限公司',
    unitType: '专业分包',
    projectLeaderContact: '沈建工 / 13910139047',
    safetyManagerContact: '唐安全 / 13810138048',
    orgStructureDesc: '停车楼主体结构专业分包，设安全部及质量部。',
    qualifications: [
      { certNo: 'D1440000002233445', fileName: '建筑工程施工总承包一级.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（沪）JZ安许证字〔2024〕012345',
      expiry: '2027-08-31',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-DHZ-FB-2026-007',
      fileName: '主体结构分包合同.pdf',
      fileUrl: '',
      amount: '7300',
    },
    status: '已驳回',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-08-01 10:20:00',
    approvalFlow: buildRejectedFlow(
      '施工单位',
      '2026-08-01 10:20:00',
      '2026-08-03 09:50:00',
      'dept_head',
      '驳回：组织架构说明与现场人员配置不一致，请修订后重提',
    ),
    createdAt: '2026-08-01 09:50:00',
    updatedAt: '2026-08-03 09:50:00',
  },
  {
    id: 'sc-app-014',
    projectId: 'p-phase3',
    projectName: '综合配套三期(A319-004-04-03-02)及南区下穿通道工程(A319-004-04-01-01)项目',
    name: '中铁建设集团有限公司',
    unitType: '专业分包',
    projectLeaderContact: '魏中铁 / 13710137049',
    safetyManagerContact: '姜安全 / 13610136050；崔安管 / 13510135051',
    orgStructureDesc: '下穿通道及综合管廊专业分包，配置专职安全管理人员 2 名。',
    qualifications: [
      { certNo: 'D1440000003344556', fileName: '市政公用工程一级.pdf', fileUrl: '' },
      { certNo: 'D2440000005566778', fileName: '隧道工程专业承包.pdf', fileUrl: '' },
    ],
    safetyLicense: {
      licenseNo: '（京）JZ安许证字〔2023〕018765',
      expiry: '2026-12-15',
      photoName: '安全生产许可证.jpg',
      photoUrl: '',
    },
    laborContract: {
      contractNo: 'HT-ZH3-FB-2026-009',
      fileName: '管廊分包合同.pdf',
      fileUrl: '',
      amount: '3450',
    },
    status: '已通过',
    currentNodeKey: '',
    submitter: '施工单位',
    submitTime: '2026-06-28 11:00:00',
    approvalFlow: buildApprovedFlow('施工单位', '2026-06-28 11:00:00', '2026-07-01 10:00:00'),
    createdAt: '2026-06-28 10:20:00',
    updatedAt: '2026-07-01 10:00:00',
  },
]

export const subcontractorList = reactive(seedList.map((item) => cloneSubcontractorApplication(item)))

export function listApprovedSubcontractors(projectId = '') {
  return subcontractorList.filter((row) => {
    if (row.status !== '已通过') return false
    if (projectId && row.projectId !== projectId) return false
    return true
  })
}

export function listProjectApplications(projectId) {
  if (!projectId) return []
  return subcontractorList.filter((row) => row.projectId === projectId)
}

export function getSubcontractorDetail(id) {
  const item = subcontractorList.find((row) => row.id === id)
  return item ? cloneSubcontractorApplication(item) : null
}

export function findSubcontractorApplication(id) {
  return subcontractorList.find((row) => row.id === id) || null
}

function validateApplication(data) {
  if (!data?.projectId) return '请选择所属项目'
  if (!data?.name?.trim()) return '请填写分包单位名称'
  if (!data?.unitType) return '请选择分包类型'
  if (!data?.projectLeaderContact?.trim()) return '请填写项目负责人姓名及电话'
  if (!data?.safetyManagerContact?.trim()) return '请填写安全管理人员姓名及电话'
  if (!data?.orgStructureDesc?.trim()) return '请填写分包组织架构说明'
  if (!data?.qualifications?.length || !data.qualifications.some((q) => q.certNo?.trim())) {
    return '请至少填写一条资质证书编号'
  }
  if (!data?.safetyLicense?.licenseNo?.trim()) return '请填写安全生产许可证编号'
  if (!data?.safetyLicense?.expiry) return '请选择安全生产许可证有效期'
  if (!data?.laborContract?.contractNo?.trim()) return '请填写劳务合同编号'
  return ''
}

export function saveSubcontractorDraft(payload) {
  const data = cloneSubcontractorApplication(payload)
  data.name = data.name?.trim() || ''
  data.status = data.status || ''
  data.currentNodeKey = ''
  data.updatedAt = nowStr()
  const idx = subcontractorList.findIndex((item) => item.id === data.id)
  if (idx >= 0) {
    Object.assign(subcontractorList[idx], data)
    return { ok: true, data: subcontractorList[idx] }
  }
  subcontractorList.unshift(data)
  return { ok: true, data }
}

export function submitSubcontractorApplication(payload) {
  const err = validateApplication(payload)
  if (err) return { ok: false, msg: err }
  if (payload?.status && !canResubmitSubcontractor(payload.status) && payload.status !== '') {
    return { ok: false, msg: '当前状态不可重新提交' }
  }
  const applyTime = nowStr()
  const data = cloneSubcontractorApplication(payload)
  data.name = data.name.trim()
  data.status = '待审批'
  data.currentNodeKey = 'pm'
  data.submitter = data.submitter || '施工单位'
  data.submitTime = applyTime
  data.approvalFlow = buildSubmitFlow(data.submitter, applyTime)
  data.updatedAt = applyTime

  const idx = subcontractorList.findIndex((item) => item.id === data.id)
  if (idx >= 0) Object.assign(subcontractorList[idx], data)
  else subcontractorList.unshift(data)

  const saved = findSubcontractorApplication(data.id)
  return { ok: true, data: saved, needTodo: true }
}

function toPortraitBlock(row) {
  return createSubcontractorBlock({
    unitName: row.name,
    projectLeaderContact: row.projectLeaderContact,
    safetyManagerContact: row.safetyManagerContact,
    hasSafetyLicense: Boolean(row.safetyLicense?.licenseNo),
    safetyLicenseNo: row.safetyLicense?.licenseNo || '',
    safetyLicenseExpiry: row.safetyLicense?.expiry || '',
    safetyLicensePhoto: row.safetyLicense?.photoName || '',
    qualifications: [
      { label: '资质证件', possessed: (row.qualifications || []).length > 0 },
      { label: '职称证书', possessed: false },
      { label: '资格证书', possessed: false },
    ],
  })
}

/** 审批通过后同步到项目画像「专业分包及劳务分包」 */
export function syncApprovedSubcontractorToPortrait(row) {
  if (!row?.projectId || row.status !== '已通过') return
  const project = projectList.find((item) => item.id === row.projectId)
  if (!project) return
  if (!project.safetyProfile) {
    project.safetyProfile = mergeSafetyProfile({})
  }
  const blocks = project.safetyProfile.subcontractorBlocks || []
  const nextBlock = toPortraitBlock(row)
  const existIdx = blocks.findIndex((item) => item.unitName === row.name)
  if (existIdx >= 0) blocks.splice(existIdx, 1, nextBlock)
  else {
    const emptyIdx = blocks.findIndex((item) => !item.unitName)
    if (emptyIdx >= 0) blocks.splice(emptyIdx, 1, nextBlock)
    else blocks.push(nextBlock)
  }
  project.safetyProfile.subcontractorBlocks = blocks
  if (project.subcontractorUnit) {
    const names = String(project.subcontractorUnit)
      .split(/[；;、，,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (!names.includes(row.name)) names.push(row.name)
    project.subcontractorUnit = names.join('；')
  } else {
    project.subcontractorUnit = row.name
  }
}

/**
 * 个人中心审批
 * @param {{ action: 'agree'|'reject', opinion?: string }} opts
 */
export function approveSubcontractorApplication(id, opts = {}) {
  const row = findSubcontractorApplication(id)
  if (!row) return { ok: false, msg: '未找到报审单' }
  if (!isSubcontractorInApproval(row.status)) return { ok: false, msg: '当前状态不可审批' }

  const action = opts.action === 'reject' ? 'reject' : 'agree'
  const opinion = String(opts.opinion || '').trim()
  if (action === 'reject' && !opinion) return { ok: false, msg: '驳回意见必填' }

  const now = nowStr()
  const flow = (row.approvalFlow || []).map((step) => ({ ...step }))
  const currentIdx = flow.findIndex((step) => step.status === 'current' && !step.isCc)
  if (currentIdx < 0) return { ok: false, msg: '未找到当前审批节点' }

  if (action === 'reject') {
    flow[currentIdx] = {
      ...flow[currentIdx],
      status: 'done',
      time: now,
      user: flow[currentIdx].user || '当前用户',
      remark: opinion || '驳回',
    }
    for (let i = currentIdx + 1; i < flow.length; i += 1) {
      flow[i] = { ...flow[i], status: 'pending', remark: '已终止', time: '' }
    }
    row.approvalFlow = flow
    row.status = '已驳回'
    row.currentNodeKey = ''
    row.updatedAt = now
    return { ok: true, data: row, finished: true, rejected: true }
  }

  flow[currentIdx] = {
    ...flow[currentIdx],
    status: 'done',
    time: now,
    user: flow[currentIdx].user || '当前用户',
    remark: opinion || '同意',
  }

  const nextIdx = flow.findIndex((step, index) => index > currentIdx && !step.isCc && step.status === 'pending')
  if (nextIdx >= 0) {
    flow[nextIdx] = {
      ...flow[nextIdx],
      status: 'current',
      remark: '待审批',
    }
    row.approvalFlow = flow
    row.currentNodeKey = flow[nextIdx].nodeKey
    // 首节点通过后进入后续节点 → 审批中
    row.status = '审批中'
    row.updatedAt = now
    return {
      ok: true,
      data: row,
      finished: false,
      nextNodeKey: flow[nextIdx].nodeKey,
      nextNodeTitle: flow[nextIdx].title,
    }
  }

  // 最终节点通过 → 抄送办结
  const ccIdx = flow.findIndex((step) => step.isCc)
  if (ccIdx >= 0) {
    flow[ccIdx] = {
      ...flow[ccIdx],
      status: 'done',
      time: now,
      remark: '已抄送知悉',
    }
  }
  row.approvalFlow = flow
  row.status = '已通过'
  row.currentNodeKey = ''
  row.updatedAt = now
  syncApprovedSubcontractorToPortrait(row)
  return { ok: true, data: row, finished: true, rejected: false, needCc: true }
}

export function approveStatusTagClass(status) {
  if (status === '已通过') return 'ap-tag-enabled'
  if (status === '待审批') return 'ap-tag-medium'
  if (status === '审批中') return 'ap-tag-medium'
  if (status === '已驳回') return 'ap-tag-high'
  if (status === '已撤回') return 'ap-tag-draft'
  return 'ap-tag-draft'
}

/** 兼容旧引用 */
export function createEmptyParticipantUnit(projectId = '', projectName = '') {
  return createEmptySubcontractorApplication(projectId, projectName)
}

export function cloneParticipantUnit(row) {
  return cloneSubcontractorApplication(row)
}

export function entryStatusTagClass() {
  return 'ap-tag-enabled'
}

export function creditLevelTagClass() {
  return 'ap-tag-low'
}

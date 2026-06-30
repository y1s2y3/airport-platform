export const subcontractorStatusOptions = ['在场', '待进场', '退场中', '已退场']
export const creditLevelOptions = ['A', 'B', 'C', 'D']

export const subcontractorList = [
  {
    id: 'sc-001',
    name: '中建三局第一建设工程有限责任公司',
    shortName: '中建三局',
    projectName: '宝安国际机场T2航站区及配套工程',
    projectId: 'p-000',
    contractScope: 'T2航站楼主体结构及配套土建施工',
    entryStatus: '在场',
    violationCount: 2,
    rectificationCount: 5,
    progressRate: 68,
    creditScore: 86,
    creditLevel: 'A',
    syncSource: '一期供应商库',
    syncTime: '2026-06-20 09:30',
  },
  {
    id: 'sc-002',
    name: '深圳市政集团有限公司',
    shortName: '深圳市政',
    projectName: '宝安国际机场T2航站区及配套工程',
    projectId: 'p-000',
    contractScope: '站坪道面及市政配套工程',
    entryStatus: '在场',
    violationCount: 1,
    rectificationCount: 3,
    progressRate: 52,
    creditScore: 82,
    creditLevel: 'A',
    syncSource: '一期供应商库',
    syncTime: '2026-06-18 14:20',
  },
  {
    id: 'sc-003',
    name: '广东建工集团有限公司',
    shortName: '广东建工',
    projectName: '深圳机场三跑道扩建工程',
    projectId: 'p-003',
    contractScope: '三跑道土石方及地基处理',
    entryStatus: '在场',
    violationCount: 4,
    rectificationCount: 8,
    progressRate: 45,
    creditScore: 74,
    creditLevel: 'B',
    syncSource: '一期供应商库',
    syncTime: '2026-06-15 11:00',
  },
  {
    id: 'sc-004',
    name: '中铁建工集团华南分公司',
    shortName: '中铁建工',
    projectName: '综合配套区市政工程',
    projectId: 'p-004',
    contractScope: '综合配套区道路及管网施工',
    entryStatus: '退场中',
    violationCount: 0,
    rectificationCount: 2,
    progressRate: 96,
    creditScore: 91,
    creditLevel: 'A',
    syncSource: '一期供应商库',
    syncTime: '2026-05-28 16:45',
  },
  {
    id: 'sc-005',
    name: '深圳广田装饰集团股份有限公司',
    shortName: '广田装饰',
    projectName: '深圳宝安国际机场T1航站区及配套设施工程项目',
    projectId: 'p-001',
    contractScope: 'T1航站楼精装修及幕墙工程',
    entryStatus: '已退场',
    violationCount: 3,
    rectificationCount: 6,
    progressRate: 100,
    creditScore: 78,
    creditLevel: 'B',
    syncSource: '一期供应商库',
    syncTime: '2026-04-10 10:15',
  },
]

const detailMap = {
  'sc-001': {
    basicInfo: {
      supplierCode: 'GYS-2024-0086',
      unifiedCreditCode: '91440300123456789X',
      legalPerson: '张建国',
      registeredCapital: '50000万元',
      contact: '王经理',
      phone: '138****5566',
      address: '深圳市福田区深南大道1001号',
      contractNo: 'HT-T2-2025-012',
      contractAmount: '12.8亿元',
      contractScope:
        'T2航站楼主体结构、配套土建、部分机电预留预埋；含施工组织设计、质量安全管理及文明施工。',
      entryDate: '2025-03-15',
      plannedExitDate: '2027-06-30',
    },
    managementStructure: [
      { role: '项目经理', name: '王建国', phone: '138****1201', cert: '一级建造师' },
      { role: '安全总监', name: '李安全', phone: '139****3302', cert: '注册安全工程师' },
      { role: '质量负责人', name: '陈质量', phone: '136****8890', cert: '高级工程师' },
      { role: '技术负责人', name: '赵技术', phone: '137****2210', cert: '一级建造师' },
    ],
    keyPersonnel: [
      { name: '王建国', position: '项目经理', certType: '一级建造师', certNo: '粤1442019200123456', expiry: '2028-05-20', status: '有效' },
      { name: '李安全', position: '安全总监', certType: '注册安全工程师', certNo: '4403002020123456', expiry: '2027-11-30', status: '有效' },
      { name: '刘电工', position: '特种作业人员', certType: '电工操作证', certNo: 'T4403002023001234', expiry: '2026-08-15', status: '有效' },
    ],
    entryEducation: [
      { date: '2025-03-16', topic: '进场安全教育', trainer: '指挥部安全部', attendees: 128, passRate: '100%', recorder: '李安全' },
      { date: '2025-06-10', topic: '高处作业专项教育', trainer: '项目安全部', attendees: 45, passRate: '97.8%', recorder: '李安全' },
      { date: '2026-01-08', topic: '春节复工安全教育', trainer: '指挥部安全部', attendees: 112, passRate: '100%', recorder: '王建国' },
    ],
    safetyAgreements: [
      { name: '安全生产责任书', signDate: '2025-03-15', partyA: '工程指挥部', partyB: '中建三局', status: '已签署' },
      { name: '文明施工协议', signDate: '2025-03-15', partyA: '工程指挥部', partyB: '中建三局', status: '已签署' },
      { name: '消防安全管理协议', signDate: '2025-04-02', partyA: '安全管理部', partyB: '中建三局', status: '已签署' },
    ],
    performanceLedger: [
      { date: '2026-06-01', type: '月度履约检查', content: '6月现场履约检查，整体良好', result: '合格', inspector: '指挥部工程部' },
      { date: '2026-05-20', type: '人员到岗核查', content: '关键岗位人员到岗率100%', result: '合格', inspector: '劳务管理部' },
      { date: '2026-05-08', type: '材料进场验收', content: '钢筋批次验收，资料齐全', result: '合格', inspector: '质量管理部' },
    ],
    violations: [
      { no: 'WG-2026-042', date: '2026-05-12', type: '违规单', issue: '未佩戴安全帽', status: '已闭环', handler: '李安全' },
      { no: 'WG-2026-068', date: '2026-06-03', type: '违规单', issue: '临边防护不到位', status: '整改中', handler: '李安全' },
    ],
    rectifications: [
      { no: 'AQ-2026-015', date: '2026-04-18', issue: '脚手架连墙件不足', deadline: '2026-04-22', status: '已闭环' },
      { no: 'AQ-2026-028', date: '2026-05-25', issue: '消防通道堆放材料', deadline: '2026-05-27', status: '已闭环' },
      { no: 'AQ-2026-036', date: '2026-06-08', issue: '配电箱未上锁', deadline: '2026-06-10', status: '已闭环' },
      { no: 'AQ-2026-041', date: '2026-06-15', issue: '深基坑监测数据异常', deadline: '2026-06-18', status: '整改中' },
      { no: 'AQ-2026-045', date: '2026-06-20', issue: '动火作业手续不全', deadline: '2026-06-22', status: '待整改' },
    ],
    progressStats: {
      overallRate: 68,
      milestones: [
        { name: '基础工程', plan: '2025-08-30', actual: '2025-08-28', rate: 100 },
        { name: '主体结构', plan: '2026-09-30', actual: '-', rate: 72 },
        { name: '机电预留预埋', plan: '2026-12-31', actual: '-', rate: 45 },
      ],
    },
    creditScores: [
      { period: '2026年6月', score: 86, level: 'A', quality: 88, safety: 84, progress: 85, cooperation: 87 },
      { period: '2026年5月', score: 84, level: 'A', quality: 86, safety: 82, progress: 83, cooperation: 85 },
      { period: '2026年4月', score: 82, level: 'A', quality: 84, safety: 80, progress: 81, cooperation: 83 },
      { period: '2026-Q1节点', score: 80, level: 'B', quality: 82, safety: 78, progress: 79, cooperation: 81 },
    ],
    exitChecklist: [
      { item: '工程尾项完成确认', dept: '工程管理部', required: true, checked: false, reviewer: '', date: '' },
      { item: '质量资料移交完成', dept: '质量管理部', required: true, checked: false, reviewer: '', date: '' },
      { item: '安全整改全部闭环', dept: '安全管理部', required: true, checked: false, reviewer: '', date: '' },
      { item: '劳务人员工资结清', dept: '劳务管理部', required: true, checked: false, reviewer: '', date: '' },
      { item: '现场物资清场完成', dept: '物资管理部', required: true, checked: false, reviewer: '', date: '' },
      { item: '保证金退还手续', dept: '合约成本部', required: true, checked: false, reviewer: '', date: '' },
    ],
    exitReviews: [],
    finalReport: null,
  },
  'sc-004': {
    basicInfo: {
      supplierCode: 'GYS-2023-0156',
      unifiedCreditCode: '91440300987654321Y',
      legalPerson: '周铁建',
      registeredCapital: '30000万元',
      contact: '孙经理',
      phone: '135****6678',
      address: '深圳市南山区科技园南路88号',
      contractNo: 'HT-PT-2024-008',
      contractAmount: '3.2亿元',
      contractScope: '综合配套区道路、管网、绿化及附属工程施工。',
      entryDate: '2024-06-01',
      plannedExitDate: '2026-07-31',
    },
    managementStructure: [
      { role: '项目经理', name: '孙经理', phone: '135****6678', cert: '一级建造师' },
      { role: '安全总监', name: '钱安全', phone: '134****9900', cert: '注册安全工程师' },
    ],
    keyPersonnel: [
      { name: '孙经理', position: '项目经理', certType: '一级建造师', certNo: '粤1442018200987654', expiry: '2027-03-15', status: '有效' },
    ],
    entryEducation: [
      { date: '2024-06-02', topic: '进场安全教育', trainer: '指挥部安全部', attendees: 86, passRate: '100%', recorder: '钱安全' },
    ],
    safetyAgreements: [
      { name: '安全生产责任书', signDate: '2024-06-01', partyA: '工程指挥部', partyB: '中铁建工', status: '已签署' },
    ],
    performanceLedger: [
      { date: '2026-06-18', type: '退场前履约检查', content: '尾项施工完成，资料整理中', result: '基本合格', inspector: '指挥部工程部' },
    ],
    violations: [],
    rectifications: [
      { no: 'AQ-2026-032', date: '2026-05-10', issue: '围挡标识缺失', deadline: '2026-05-12', status: '已闭环' },
      { no: 'AQ-2026-038', date: '2026-06-01', issue: '临时用电不规范', deadline: '2026-06-03', status: '已闭环' },
    ],
    progressStats: {
      overallRate: 96,
      milestones: [
        { name: '道路工程', plan: '2026-03-31', actual: '2026-03-28', rate: 100 },
        { name: '管网工程', plan: '2026-06-30', actual: '2026-06-25', rate: 98 },
        { name: '绿化工程', plan: '2026-07-31', actual: '-', rate: 90 },
      ],
    },
    creditScores: [
      { period: '2026年6月', score: 91, level: 'A', quality: 92, safety: 90, progress: 93, cooperation: 89 },
      { period: '2026年5月', score: 89, level: 'A', quality: 90, safety: 88, progress: 91, cooperation: 87 },
    ],
    exitChecklist: [
      { item: '工程尾项完成确认', dept: '工程管理部', required: true, checked: true, reviewer: '赵工', date: '2026-06-20' },
      { item: '质量资料移交完成', dept: '质量管理部', required: true, checked: true, reviewer: '陈静', date: '2026-06-21' },
      { item: '安全整改全部闭环', dept: '安全管理部', required: true, checked: true, reviewer: '李安全', date: '2026-06-22' },
      { item: '劳务人员工资结清', dept: '劳务管理部', required: true, checked: true, reviewer: '王芳', date: '2026-06-23' },
      { item: '现场物资清场完成', dept: '物资管理部', required: true, checked: false, reviewer: '', date: '' },
      { item: '保证金退还手续', dept: '合约成本部', required: true, checked: false, reviewer: '', date: '' },
    ],
    exitReviews: [
      { dept: '工程管理部', reviewer: '赵工', opinion: '同意退场', status: '已通过', date: '2026-06-20' },
      { dept: '质量管理部', reviewer: '陈静', opinion: '资料已移交', status: '已通过', date: '2026-06-21' },
      { dept: '安全管理部', reviewer: '李安全', opinion: '整改已闭环', status: '已通过', date: '2026-06-22' },
      { dept: '劳务管理部', reviewer: '王芳', opinion: '工资已结清', status: '已通过', date: '2026-06-23' },
      { dept: '物资管理部', reviewer: '-', opinion: '-', status: '待审核', date: '' },
      { dept: '合约成本部', reviewer: '-', opinion: '-', status: '待审核', date: '' },
    ],
    finalReport: null,
  },
  'sc-005': {
    basicInfo: {
      supplierCode: 'GYS-2022-0234',
      unifiedCreditCode: '91440300555566677Z',
      legalPerson: '林装饰',
      registeredCapital: '8000万元',
      contact: '郑经理',
      phone: '133****4455',
      address: '深圳市罗湖区笋岗东路3001号',
      contractNo: 'HT-T1-2023-006',
      contractAmount: '1.5亿元',
      contractScope: 'T1航站楼精装修、幕墙及室内机电安装。',
      entryDate: '2023-09-01',
      plannedExitDate: '2025-12-31',
    },
    managementStructure: [
      { role: '项目经理', name: '郑经理', phone: '133****4455', cert: '一级建造师' },
    ],
    keyPersonnel: [
      { name: '郑经理', position: '项目经理', certType: '一级建造师', certNo: '粤1442017200555666', expiry: '2026-12-31', status: '有效' },
    ],
    entryEducation: [
      { date: '2023-09-02', topic: '进场安全教育', trainer: '指挥部安全部', attendees: 62, passRate: '100%', recorder: '郑经理' },
    ],
    safetyAgreements: [
      { name: '安全生产责任书', signDate: '2023-09-01', partyA: '工程指挥部', partyB: '广田装饰', status: '已签署' },
    ],
    performanceLedger: [
      { date: '2025-12-15', type: '退场履约评估', content: '工程全部完成，进入退场流程', result: '合格', inspector: '指挥部工程部' },
    ],
    violations: [
      { no: 'WG-2025-112', date: '2025-08-20', type: '违规单', issue: '高空作业未系安全带', status: '已闭环', handler: '郑经理' },
      { no: 'WG-2025-128', date: '2025-10-05', type: '违规单', issue: '材料堆放不规范', status: '已闭环', handler: '郑经理' },
      { no: 'WG-2025-145', date: '2025-11-18', type: '违规单', issue: '动火监护不到位', status: '已闭环', handler: '郑经理' },
    ],
    rectifications: [
      { no: 'AQ-2025-086', date: '2025-07-12', issue: '临电线路老化', deadline: '2025-07-15', status: '已闭环' },
      { no: 'AQ-2025-102', date: '2025-09-08', issue: '脚手架验收滞后', deadline: '2025-09-10', status: '已闭环' },
      { no: 'AQ-2025-118', date: '2025-10-22', issue: '消防器材过期', deadline: '2025-10-24', status: '已闭环' },
      { no: 'AQ-2025-125', date: '2025-11-05', issue: '噪音控制措施不足', deadline: '2025-11-08', status: '已闭环' },
      { no: 'AQ-2025-132', date: '2025-11-20', issue: '成品保护不到位', deadline: '2025-11-22', status: '已闭环' },
      { no: 'AQ-2025-138', date: '2025-12-01', issue: '退场清场不彻底', deadline: '2025-12-05', status: '已闭环' },
    ],
    progressStats: { overallRate: 100, milestones: [{ name: '精装修', plan: '2025-11-30', actual: '2025-11-28', rate: 100 }] },
    creditScores: [
      { period: '2025年12月', score: 78, level: 'B', quality: 80, safety: 75, progress: 82, cooperation: 76 },
      { period: '2025年11月', score: 80, level: 'B', quality: 82, safety: 78, progress: 80, cooperation: 79 },
    ],
    exitChecklist: [
      { item: '工程尾项完成确认', dept: '工程管理部', required: true, checked: true, reviewer: '赵工', date: '2025-12-10' },
      { item: '质量资料移交完成', dept: '质量管理部', required: true, checked: true, reviewer: '陈静', date: '2025-12-11' },
      { item: '安全整改全部闭环', dept: '安全管理部', required: true, checked: true, reviewer: '李安全', date: '2025-12-12' },
      { item: '劳务人员工资结清', dept: '劳务管理部', required: true, checked: true, reviewer: '王芳', date: '2025-12-13' },
      { item: '现场物资清场完成', dept: '物资管理部', required: true, checked: true, reviewer: '刘物资', date: '2025-12-14' },
      { item: '保证金退还手续', dept: '合约成本部', required: true, checked: true, reviewer: '张合约', date: '2025-12-15' },
    ],
    exitReviews: [
      { dept: '工程管理部', reviewer: '赵工', opinion: '同意退场', status: '已通过', date: '2025-12-10' },
      { dept: '质量管理部', reviewer: '陈静', opinion: '资料完整', status: '已通过', date: '2025-12-11' },
      { dept: '安全管理部', reviewer: '李安全', opinion: '整改闭环', status: '已通过', date: '2025-12-12' },
      { dept: '劳务管理部', reviewer: '王芳', opinion: '工资结清', status: '已通过', date: '2025-12-13' },
      { dept: '物资管理部', reviewer: '刘物资', opinion: '清场完成', status: '已通过', date: '2025-12-14' },
      { dept: '合约成本部', reviewer: '张合约', opinion: '保证金已退', status: '已通过', date: '2025-12-15' },
    ],
    finalReport: {
      reportNo: 'LYBG-2025-005',
      generateDate: '2025-12-20',
      overallScore: 78,
      level: 'B',
      summary:
        '该分包单位完成合同范围内全部工程，履约总体良好。存在3次违规记录均已闭环，安全整改响应及时。建议纳入集团客商考评B级名录。',
      permissionRevoked: true,
      revokeDate: '2025-12-16',
      revokeCount: 42,
    },
  },
}

function buildDefaultDetail(item) {
  return {
    basicInfo: {
      supplierCode: '-',
      unifiedCreditCode: '-',
      legalPerson: '-',
      registeredCapital: '-',
      contact: '-',
      phone: '-',
      address: '-',
      contractNo: '-',
      contractAmount: '-',
      contractScope: item.contractScope,
      entryDate: '-',
      plannedExitDate: '-',
    },
    managementStructure: [],
    keyPersonnel: [],
    entryEducation: [],
    safetyAgreements: [],
    performanceLedger: [],
    violations: [],
    rectifications: [],
    progressStats: { overallRate: item.progressRate, milestones: [] },
    creditScores: [{ period: '2026年6月', score: item.creditScore, level: item.creditLevel, quality: '-', safety: '-', progress: '-', cooperation: '-' }],
    exitChecklist: [],
    exitReviews: [],
    finalReport: null,
  }
}

export function getSubcontractorDetail(id) {
  const item = subcontractorList.find((row) => row.id === id)
  if (!item) return null
  const detail = detailMap[id] || buildDefaultDetail(item)
  return { ...item, ...detail }
}

export function entryStatusTagClass(status) {
  if (status === '在场') return 'ap-tag-enabled'
  if (status === '待进场') return 'ap-tag-draft'
  if (status === '退场中') return 'ap-tag-medium'
  return 'ap-tag-disabled'
}

export function creditLevelTagClass(level) {
  if (level === 'A') return 'ap-tag-enabled'
  if (level === 'B') return 'ap-tag-low'
  if (level === 'C') return 'ap-tag-medium'
  return 'ap-tag-high'
}

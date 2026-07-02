export const subcontractorStatusOptions = ['在场', '待进场', '退场中', '已退场']
export const creditLevelOptions = ['A', 'B', 'C', 'D']

function emptyQualifications() {
  return [
    { name: '', certNo: '', photo: '' },
    { name: '', certNo: '', photo: '' },
    { name: '', certNo: '', photo: '' },
  ]
}

function withRegistration(item) {
  return {
    safetyLicenseNo: '',
    safetyLicenseExpiry: '',
    safetyLicensePhoto: '',
    projectManagerContact: '',
    safetyManagerContact: '',
    safetyManagerContact2: '',
    qualifications: emptyQualifications(),
    entryStatus: '在场',
    creditScore: 80,
    creditLevel: 'B',
    syncSource: '项目登记',
    syncTime: '2026-06-20',
    contractScope: '',
    ...item,
    qualifications: item.qualifications?.length ? item.qualifications : emptyQualifications(),
  }
}

export const subcontractorList = [
  withRegistration({
    id: 'sc-001',
    name: '中建三局第一建设工程有限责任公司',
    shortName: '中建三局',
    projectName: '宝安国际机场T2航站区及配套工程',
    projectId: 'p-000',
    safetyLicenseNo: '（粤）JZ安许证字〔2024〕012345',
    safetyLicenseExpiry: '2027-06-30',
    safetyLicensePhoto: '安全生产许可证.jpg',
    projectManagerContact: '王建国 / 13800138001',
    safetyManagerContact: '李安全 / 13900139002',
    safetyManagerContact2: '周专职 / 13700137003',
    qualifications: [
      { name: '建筑工程施工总承包一级', certNo: 'D1440000001234567', photo: '资质证书-总包一级.jpg' },
      { name: '钢结构工程专业承包一级', certNo: 'D2440000007654321', photo: '资质证书-钢结构.jpg' },
      { name: '建筑装修装饰工程专业承包二级', certNo: 'D3440000009988776', photo: '资质证书-装饰.jpg' },
    ],
  }),
  withRegistration({
    id: 'sc-002',
    name: '深圳市政集团有限公司',
    shortName: '深圳市政',
    projectName: '宝安国际机场T2航站区及配套工程',
    projectId: 'p-000',
    safetyLicenseNo: '（粤）JZ安许证字〔2023〕009876',
    safetyLicenseExpiry: '2026-12-31',
    safetyLicensePhoto: '安全生产许可证.jpg',
    projectManagerContact: '陈市政 / 13600136006',
    safetyManagerContact: '赵安全 / 13500135007',
    safetyManagerContact2: '钱安全 / 13400134008',
    qualifications: [
      { name: '市政公用工程施工总承包一级', certNo: 'D1440000005566778', photo: '资质证书-市政一级.jpg' },
      { name: '公路工程施工总承包二级', certNo: 'D2440000001122334', photo: '资质证书-公路二级.jpg' },
      { name: '', certNo: '', photo: '' },
    ],
  }),
  withRegistration({
    id: 'sc-003',
    name: '广东建工集团有限公司',
    shortName: '广东建工',
    projectName: '深圳机场三跑道扩建工程',
    projectId: 'p-003',
    safetyLicenseNo: '（粤）JZ安许证字〔2025〕004321',
    safetyLicenseExpiry: '2028-03-15',
    safetyLicensePhoto: '安全生产许可证.jpg',
    projectManagerContact: '刘经理 / 13300133009',
    safetyManagerContact: '吴安全 / 13200132010',
    safetyManagerContact2: '',
    qualifications: [
      { name: '地基基础工程专业承包一级', certNo: 'D3440000004455667', photo: '资质证书-地基.jpg' },
      { name: '', certNo: '', photo: '' },
      { name: '', certNo: '', photo: '' },
    ],
  }),
  withRegistration({
    id: 'sc-004',
    name: '中铁建工集团华南分公司',
    shortName: '中铁建工',
    projectName: '综合配套区市政工程',
    projectId: 'p-004',
    safetyLicenseNo: '（粤）JZ安许证字〔2022〕007654',
    safetyLicenseExpiry: '2026-08-20',
    safetyLicensePhoto: '安全生产许可证.jpg',
    projectManagerContact: '孙经理 / 13100131011',
    safetyManagerContact: '钱安全 / 13000130012',
    safetyManagerContact2: '郑安全 / 12900129013',
    qualifications: [
      { name: '市政公用工程施工总承包一级', certNo: 'D1440000003344556', photo: '资质证书-市政.jpg' },
      { name: '环保工程专业承包二级', certNo: 'D2440000007788990', photo: '资质证书-环保.jpg' },
      { name: '', certNo: '', photo: '' },
    ],
  }),
  withRegistration({
    id: 'sc-005',
    name: '深圳广田装饰集团股份有限公司',
    shortName: '广田装饰',
    projectName: '深圳宝安国际机场T1航站区及配套设施工程项目',
    projectId: 'p-001',
    safetyLicenseNo: '（粤）JZ安许证字〔2021〕003210',
    safetyLicenseExpiry: '2025-12-31',
    safetyLicensePhoto: '安全生产许可证.jpg',
    projectManagerContact: '郑经理 / 12800128014',
    safetyManagerContact: '冯安全 / 12700127015',
    safetyManagerContact2: '',
    qualifications: [
      { name: '建筑装修装饰工程专业承包一级', certNo: 'D1440000006677889', photo: '资质证书-装饰一级.jpg' },
      { name: '建筑幕墙工程专业承包一级', certNo: 'D2440000008899001', photo: '资质证书-幕墙.jpg' },
      { name: '', certNo: '', photo: '' },
    ],
  }),
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
    ],
    keyPersonnel: [],
    entryEducation: [],
    safetyAgreements: [],
    performanceLedger: [],
    violations: [],
    rectifications: [],
    progressStats: { overallRate: 68, milestones: [] },
    creditScores: [],
    exitChecklist: [],
    exitReviews: [],
    finalReport: null,
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
      contractScope: '-',
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
    progressStats: { overallRate: 0, milestones: [] },
    creditScores: [],
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

export function getSubcontractorProjects() {
  const map = new Map()
  for (const row of subcontractorList) {
    if (!map.has(row.projectId)) {
      map.set(row.projectId, { id: row.projectId, name: row.projectName })
    }
  }
  return [...map.values()]
}

let participantIdSeq = 100

export function createEmptyParticipantUnit(projectId = '', projectName = '') {
  return withRegistration({
    id: `sc-new-${Date.now()}-${participantIdSeq++}`,
    name: '',
    shortName: '',
    projectId,
    projectName,
  })
}

export function cloneParticipantUnit(row) {
  return {
    ...row,
    qualifications: (row.qualifications || emptyQualifications()).map((item) => ({ ...item })),
  }
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

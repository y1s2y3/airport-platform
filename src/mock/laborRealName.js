import {
  REALNAME_ENTRY_STATUS,
  REALNAME_ENTRY_STATUS_OPTIONS,
  ONSITE_STATUS_OPTIONS,
  getOnSiteStatus,
  realNameEntryStatusTagClass,
  onSiteStatusTagClass,
} from '../constants/laborPersonStatus.js'

export {
  REALNAME_ENTRY_STATUS_OPTIONS as entryStatusOptions,
  REALNAME_ENTRY_STATUS_OPTIONS as statusOptions,
  ONSITE_STATUS_OPTIONS as onSiteStatusOptions,
  realNameEntryStatusTagClass as entryStatusTagClass,
  onSiteStatusTagClass,
  realNameEntryStatusTagClass as statusTagClass,
}

export const projectTree = [
  {
    id: 'hq',
    label: '工程指挥部',
    children: [
      { id: 'p-000', label: 'T2航站区及配套工程', count: 1286 },
      { id: 'p-001', label: 'T1航站区配套工程', count: 432 },
      { id: 'p-003', label: '三跑道扩建工程', count: 856 },
      { id: 'p-004', label: '综合配套区市政工程', count: 268 },
      { id: 'p-005', label: '捷运线延长段工程', count: 156 },
    ],
  },
]

export const workTypeOptions = ['钢筋工', '木工', '混凝土工', '架子工', '电工', '焊工', '起重工', '普工', '安全员', '测量员']
export const genderOptions = ['男', '女']

const personnelTemplates = [
  { name: '张强', gender: '男', workType: '钢筋工', team: '钢筋一班', subcontractor: '中建三局', special: false },
  { name: '李华', gender: '男', workType: '木工', team: '木工二班', subcontractor: '中建三局', special: false },
  { name: '王芳', gender: '女', workType: '普工', team: '综合班组', subcontractor: '深圳市政', special: false },
  { name: '赵磊', gender: '男', workType: '电工', team: '机电班组', subcontractor: '中建三局', special: true, certNo: 'T4403002023001234' },
  { name: '刘洋', gender: '男', workType: '焊工', team: '钢结构班', subcontractor: '广东建工', special: true, certNo: 'T4403002023005678' },
  { name: '陈静', gender: '女', workType: '安全员', team: '安全管理组', subcontractor: '中建三局', special: false },
  { name: '周杰', gender: '男', workType: '架子工', team: '脚手架班', subcontractor: '中铁建工', special: true, certNo: 'T4403002023009012' },
  { name: '吴敏', gender: '女', workType: '测量员', team: '测量组', subcontractor: '深圳市政', special: false },
  { name: '郑伟', gender: '男', workType: '混凝土工', team: '混凝土班', subcontractor: '中建三局', special: false },
  { name: '孙涛', gender: '男', workType: '起重工', team: '塔吊班', subcontractor: '广东建工', special: true, certNo: 'T4403002023003456' },
  { name: '马超', gender: '男', workType: '普工', team: '杂工班', subcontractor: '中铁建工', special: false, entryStatus: REALNAME_ENTRY_STATUS.EXITED },
  { name: '黄丽', gender: '女', workType: '钢筋工', team: '钢筋二班', subcontractor: '深圳市政', special: false },
]

function maskIdCard(id) {
  return `${id.slice(0, 6)}********${id.slice(-4)}`
}

function buildTodayPunch(seq, entryStatus) {
  if (entryStatus === REALNAME_ENTRY_STATUS.EXITED) {
    return { clockIn: '', clockOut: '', onSiteStatus: '—' }
  }
  const pattern = seq % 5
  if (pattern <= 2) {
    const time = `07:${String(30 + (seq % 25)).padStart(2, '0')}:00`
    return { clockIn: time, clockOut: '', onSiteStatus: getOnSiteStatus(time, '') }
  }
  if (pattern === 3) {
    const clockIn = '07:45:00'
    const clockOut = `17:${String(20 + (seq % 30)).padStart(2, '0')}:00`
    return { clockIn, clockOut, onSiteStatus: getOnSiteStatus(clockIn, clockOut) }
  }
  return { clockIn: '', clockOut: '', onSiteStatus: getOnSiteStatus('', '') }
}

function buildPersonnel(projectId, index, tpl, offset = 0) {
  const seq = index + offset + 1
  const idBase = 440300199001010000 + seq * 137
  const idCard = String(idBase).padStart(18, '0')
  const entryStatus = tpl.entryStatus || REALNAME_ENTRY_STATUS.ENTERED
  const punch = buildTodayPunch(seq, entryStatus)

  return {
    id: `${projectId}-${seq}`,
    projectId,
    name: tpl.name,
    idCard: maskIdCard(idCard),
    idCardRaw: idCard,
    gender: tpl.gender,
    age: 25 + (seq % 20),
    workType: tpl.workType,
    team: tpl.team,
    subcontractor: tpl.subcontractor,
    phone: `138${String(10000000 + seq * 12345).slice(0, 8)}`,
    entryDate: `2025-${String((seq % 12) + 1).padStart(2, '0')}-${String((seq % 28) + 1).padStart(2, '0')}`,
    exitDate: entryStatus === REALNAME_ENTRY_STATUS.EXITED ? '2026-05-30' : '',
    entryStatus,
    status: entryStatus,
    clockIn: punch.clockIn,
    clockOut: punch.clockOut,
    onSiteStatus: punch.onSiteStatus,
    isSpecial: tpl.special,
    certNo: tpl.certNo || '',
    safetyTraining: '已完成',
    accessStatus: entryStatus === REALNAME_ENTRY_STATUS.ENTERED ? '正常通行' : '已注销',
  }
}

function buildProjectPersonnel(projectId, count) {
  const list = []
  for (let i = 0; i < count; i++) {
    const tpl = personnelTemplates[i % personnelTemplates.length]
    list.push(buildPersonnel(projectId, i, tpl))
  }
  return list
}

export const personnelByProject = {
  'p-000': buildProjectPersonnel('p-000', 12),
  'p-001': buildProjectPersonnel('p-001', 8),
  'p-003': buildProjectPersonnel('p-003', 10),
  'p-004': buildProjectPersonnel('p-004', 6),
  'p-005': buildProjectPersonnel('p-005', 5),
}

export function getProjectPersonnel(projectId) {
  return personnelByProject[projectId] || []
}

export function getDefaultProjectId() {
  return 'p-000'
}

export function getProjectLabel(projectId) {
  for (const group of projectTree) {
    const node = group.children?.find((item) => item.id === projectId)
    if (node) return node.label
  }
  return ''
}

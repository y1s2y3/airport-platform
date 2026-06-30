import { projectTree } from './laborRealName.js'

export { projectTree }

export const projectList = projectTree[0].children.map((item) => ({
  id: item.id,
  name: item.label.replace(/\(\d+\)$/, ''),
  count: item.count,
}))

export const laborDashboardData = {
  summary: {
    total: 2998,
    manager: 186,
    special: 412,
    worker: 2400,
    onSite: 2654,
    todayPresent: 2486,
    attendanceRate: '93.6%',
  },
  accessAbnormalList: [
    { name: '赵某', company: '中建三局', blockType: '未培训', time: '08:12' },
    { name: '钱某', company: '广东建工', blockType: '证件过期', time: '09:35' },
    { name: '孙某', company: '深圳市政', blockType: '黑名单', time: '10:08' },
    { name: '李某', company: '中铁建工', blockType: '未培训', time: '11:22' },
  ],
  trainingAbnormalList: [
    { name: '周某', company: '中建三局', abnormalType: '证书过期', expireDate: '2026-05-30' },
    { name: '吴某', company: '广东建工', abnormalType: '未完成教育', expireDate: '-' },
    { name: '郑某', company: '深圳市政', abnormalType: '证书过期', expireDate: '2026-06-15' },
  ],
  projectRanking: [
    { projectName: 'T2航站区及配套工程', onSite: 1286, present: 1208, rate: '93.9%' },
    { projectName: '三跑道扩建工程', onSite: 856, present: 798, rate: '93.2%' },
    { projectName: 'T1航站区配套工程', onSite: 432, present: 386, rate: '89.4%' },
    { projectName: '综合配套区市政工程', onSite: 268, present: 252, rate: '94.0%' },
    { projectName: '捷运线延长段工程', onSite: 156, present: 142, rate: '91.0%' },
  ],
}

export const accessStatsSummary = {
  projectCount: 5,
  totalOnSite: 2998,
  todayAccess: 4526,
  passCount: 4412,
  blockCount: 114,
  passRate: '97.5%',
}

export const accessStatsByProject = [
  { projectId: 'p-000', projectName: 'T2航站区及配套工程', onSite: 1286, todayAccess: 1862, passCount: 1818, blockCount: 44, passRate: '97.6%', violationCount: 3, noTraining: 28, expiredCert: 12, blacklist: 1 },
  { projectId: 'p-003', projectName: '三跑道扩建工程', onSite: 856, todayAccess: 1248, passCount: 1216, blockCount: 32, passRate: '97.4%', violationCount: 2, noTraining: 18, expiredCert: 9, blacklist: 0 },
  { projectId: 'p-001', projectName: 'T1航站区配套工程', onSite: 432, todayAccess: 628, passCount: 602, blockCount: 26, passRate: '95.9%', violationCount: 4, noTraining: 15, expiredCert: 8, blacklist: 2 },
  { projectId: 'p-004', projectName: '综合配套区市政工程', onSite: 268, todayAccess: 412, passCount: 404, blockCount: 8, passRate: '98.1%', violationCount: 0, noTraining: 5, expiredCert: 2, blacklist: 0 },
  { projectId: 'p-005', projectName: '捷运线延长段工程', onSite: 156, todayAccess: 376, passCount: 372, blockCount: 4, passRate: '98.9%', violationCount: 0, noTraining: 3, expiredCert: 1, blacklist: 0 },
]

export const accessBlockDetailsByProject = {
  'p-000': [
    { name: '赵某', idCard: '440300199005121234', phone: '13800138011', workType: '钢筋工', company: '中建三局', team: '钢筋一班', blockType: '未培训', blockReason: '未完成三级安全教育', gate: 'T2东门闸机', time: '2026-06-29 08:12:35' },
    { name: '钱某', idCard: '440300198812089876', phone: '13900139022', workType: '电工', company: '广东建工', team: '机电班组', blockType: '证件过期', blockReason: '特种作业操作证已过期', gate: 'T2西门闸机', time: '2026-06-29 09:35:18' },
    { name: '孙某', idCard: '440300199203156789', phone: '', workType: '普工', company: '深圳市政', team: '综合班组', blockType: '黑名单', blockReason: '存在于劳务黑名单', gate: 'T2北门闸机', time: '2026-06-29 10:08:42' },
    { name: '李某', idCard: '440300198711223344', phone: '13700137033', workType: '架子工', company: '中铁建工', team: '脚手架班', blockType: '未培训', blockReason: '进场安全教育未完成', gate: 'T2东门闸机', time: '2026-06-29 11:22:05' },
  ],
  'p-003': [
    { name: '周某', idCard: '440300199108156543', phone: '13600136044', workType: '焊工', company: '广东建工', team: '钢结构班', blockType: '证件过期', blockReason: '焊工证有效期已过', gate: '三跑道1号门', time: '2026-06-29 07:48:20' },
    { name: '吴某', idCard: '440300198905098765', phone: '13500135055', workType: '普工', company: '中建三局', team: '杂工班', blockType: '未培训', blockReason: '未参加复工安全教育', gate: '三跑道2号门', time: '2026-06-29 08:56:11' },
  ],
  'p-001': [
    { name: '郑某', idCard: '440300199406121122', phone: '13400134066', workType: '木工', company: '深圳市政', team: '木工二班', blockType: '黑名单', blockReason: '劳务黑名单人员', gate: 'T1南门', time: '2026-06-29 09:15:33' },
    { name: '王某', idCard: '440300198803045566', phone: '', workType: '起重工', company: '中铁建工', team: '塔吊班', blockType: '证件过期', blockReason: '起重机械操作证过期', gate: 'T1北门', time: '2026-06-29 10:42:08' },
  ],
  'p-004': [
    { name: '冯某', idCard: '440300199012187788', phone: '13300133077', workType: '混凝土工', company: '深圳市政', team: '混凝土班', blockType: '未培训', blockReason: '安全教育记录缺失', gate: '配套区主入口', time: '2026-06-29 08:30:45' },
  ],
  'p-005': [
    { name: '陈某', idCard: '440300198709034455', phone: '13200132088', workType: '安全员', company: '广东建工', team: '安全管理组', blockType: '违规准入', blockReason: '非授权时段强行刷卡', gate: '捷运线入口', time: '2026-06-29 07:22:16' },
  ],
}

export function getAccessBlockDetails(projectId) {
  return accessBlockDetailsByProject[projectId] || []
}

export function maskIdCard(idCard) {
  if (!idCard || idCard.length < 8) return idCard
  return `${idCard.slice(0, 6)}********${idCard.slice(-4)}`
}

export const blockTypeOptions = ['未培训', '证件过期', '黑名单', '违规准入']

export const attendancePersonList = [
  { name: '张强', company: '中建三局', workType: '钢筋工', attendanceDays: 22, totalHours: 198, avgHours: 9.0, lateCount: 1, earlyLeaveCount: 0, absentCount: 0, overtimeHours: 12, attendanceRate: '100%' },
  { name: '李华', company: '中建三局', workType: '木工', attendanceDays: 21, totalHours: 185, avgHours: 8.8, lateCount: 2, earlyLeaveCount: 1, absentCount: 1, overtimeHours: 8, attendanceRate: '95.5%' },
  { name: '赵磊', company: '广东建工', workType: '电工', attendanceDays: 20, totalHours: 176, avgHours: 8.8, lateCount: 0, earlyLeaveCount: 0, absentCount: 2, overtimeHours: 16, attendanceRate: '90.9%' },
  { name: '刘洋', company: '深圳市政', workType: '焊工', attendanceDays: 22, totalHours: 202, avgHours: 9.2, lateCount: 0, earlyLeaveCount: 0, absentCount: 0, overtimeHours: 20, attendanceRate: '100%' },
  { name: '陈静', company: '中铁建工', workType: '安全员', attendanceDays: 22, totalHours: 176, avgHours: 8.0, lateCount: 0, earlyLeaveCount: 0, absentCount: 0, overtimeHours: 4, attendanceRate: '100%' },
  { name: '周杰', company: '中建三局', workType: '架子工', attendanceDays: 19, totalHours: 168, avgHours: 8.8, lateCount: 3, earlyLeaveCount: 2, absentCount: 3, overtimeHours: 10, attendanceRate: '86.4%' },
]

export const attendanceTeamList = [
  { team: '钢筋一班', company: '中建三局', headcount: 32, presentDays: 680, avgRate: '96.2%', absentTotal: 12, overtimeHours: 86 },
  { team: '木工二班', company: '中建三局', headcount: 28, presentDays: 588, avgRate: '94.8%', absentTotal: 18, overtimeHours: 64 },
  { team: '机电班组', company: '广东建工', headcount: 24, presentDays: 512, avgRate: '97.1%', absentTotal: 6, overtimeHours: 120 },
  { team: '钢结构班', company: '深圳市政', headcount: 18, presentDays: 378, avgRate: '93.5%', absentTotal: 10, overtimeHours: 48 },
]

export const workTypes = ['钢筋工', '木工', '混凝土工', '架子工', '电工', '焊工', '起重工', '普工', '安全员']

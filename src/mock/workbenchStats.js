export const summaryCards = [
  {
    title: '质量验评风险',
    value: '37',
    todayNew: 6,
    todayDone: 4,
    icon: 'DocumentChecked',
    iconBg: '#fff7e6',
    iconColor: '#fa8c16',
  },
  {
    title: '材料入场风险',
    value: '24',
    todayNew: 5,
    todayDone: 7,
    icon: 'Box',
    iconBg: '#e6f4ff',
    iconColor: '#1677ff',
  },
  {
    title: '人员入场风险',
    value: '18',
    todayNew: 3,
    todayDone: 9,
    icon: 'UserFilled',
    iconBg: '#f3e5f5',
    iconColor: '#8e24aa',
  },
  {
    title: '设备高风险预警',
    value: '12',
    todayNew: 2,
    todayDone: 5,
    icon: 'Warning',
    iconBg: '#fff1f0',
    iconColor: '#e53935',
  },
]

/** 各项目待整改隐患数量（已按数量降序） */
export const pendingHazardByProject = [
  { projectName: 'T2航站区及配套工程', count: 28 },
  { projectName: '三跑道扩建工程', count: 22 },
  { projectName: 'T1航站区配套工程', count: 18 },
  { projectName: '综合配套区市政工程', count: 12 },
  { projectName: '捷运线延长段工程', count: 6 },
]

export const pendingHazardTotal = pendingHazardByProject.reduce((s, r) => s + r.count, 0)

export const workloadProjects = [
  { name: '项目A', values: [40, 30, 20] },
  { name: '项目B', values: [35, 25, 15] },
  { name: '项目C', values: [50, 20, 18] },
  { name: '项目D', values: [28, 32, 22] },
  { name: '项目E', values: [45, 28, 12] },
]

export const workloadLegend = [
  { label: '蓝色', color: '#4285f4' },
  { label: '黄色', color: '#ffc107' },
  { label: '青色', color: '#00bcd4' },
]

export const workloadSummary = [
  { label: '安全管理事项总量', value: '2,020', icon: 'DataLine', color: '#1677ff' },
  { label: '线上智能识别隐患', value: '1,020', icon: 'View', color: '#00acc1' },
  { label: '线下整改闭环事项', value: '1,000', icon: 'CircleCheck', color: '#43a047' },
]

/** 劳务异常统计卡片 */
export const laborAbnormalCards = [
  { label: '违规准入', count: 14, color: '#e53935', bg: '#fff1f0' },
  { label: '证件异常', count: 32, color: '#fa8c16', bg: '#fff7e6' },
  { label: '培训异常', count: 45, color: '#1677ff', bg: '#e6f4ff' },
  { label: '黑名单人员入场', count: 3, color: '#8e24aa', bg: '#f3e5f5' },
]

/** 出勤环状图分段 */
export const laborAttendanceSegments = [
  { name: '正常出勤', value: 2486, color: '#4285f4' },
  { name: '缺勤', value: 312, color: '#ff9800' },
  { name: '请假', value: 128, color: '#9e9e9e' },
  { name: '未登记', value: 72, color: '#e0e0e0' },
]

export const laborAttendanceTotal = laborAttendanceSegments.reduce((s, r) => s + r.value, 0)

/** 项目验评看板（一行 8 个色块，多行展示） */
const EVAL_COLORS = ['#4285f4', '#00bcd4', '#43a047', '#ff9800', '#9c27b0', '#e53935', '#00897b', '#5c6bc0']
const EVAL_SHORT_NAMES = [
  'T2航站区配套', 'T1航站区配套', '三跑道扩建', 'T2空侧捷运线', '东北站坪', 'T2航站楼基础',
  '综保区一期', '东综合枢纽', '卫星厅站坪', '南货运区改扩建', '国际货站扩建', '公务机坪',
  '围界安防升级', '能源中心扩建', '智慧工地试点', '安全教育基地',
]

export const projectEvalBoard = EVAL_SHORT_NAMES.map((projectName, i) => ({
  projectName,
  completionRate: 52 + ((i * 17) % 38),
  passRate: `${(85 + (i * 3) % 12).toFixed(1)}%`,
  color: EVAL_COLORS[i % EVAL_COLORS.length],
}))

/** 系统使用情况：月活 / 日活 / 当前在线 */
export const systemActivityMetrics = [
  { key: 'mau', label: '系统月活', value: 1286, unit: '人' },
  { key: 'dau', label: '系统日活', value: 342, unit: '人' },
  { key: 'online', label: '当前在线人数', value: 87, unit: '人' },
]

/** 各项目设备报警统计（按报警数降序） */
export const deviceAlarmByProject = [
  { projectName: 'T2航站区配套', alarmCount: 18, unhandled: 5 },
  { projectName: '三跑道扩建', alarmCount: 14, unhandled: 3 },
  { projectName: 'T2空侧捷运线', alarmCount: 11, unhandled: 4 },
  { projectName: '东北站坪', alarmCount: 9, unhandled: 2 },
  { projectName: 'T1航站区配套', alarmCount: 7, unhandled: 1 },
  { projectName: 'T2航站楼基础', alarmCount: 6, unhandled: 2 },
]

export const deviceAlarmTotal = deviceAlarmByProject.reduce((s, r) => s + r.alarmCount, 0)

export const pendingTaskModules = [
  { label: '质量管理', count: 12 },
  { label: '安全管理', count: 8 },
  { label: '物资管理', count: 5 },
  { label: '调度会', count: 3 },
]

/** 工作台任务待办 · 面板默认展示条数 */
export const pendingTaskDisplayLimit = 5

/** 任务待办全量（支持审批） */
export const pendingTaskAllList = [
  {
    id: 1,
    module: '质量管理',
    title: '检验批审核 · 三跑道基础段',
    project: '三跑道扩建工程',
    applicant: '李工',
    time: '2026-06-15 10:20',
    needsApproval: true,
    approvalStatus: '待审批',
  },
  {
    id: 2,
    module: '质量管理',
    title: '主材复检审批 · T2指廊A区',
    project: 'T2航站区及配套工程',
    applicant: '王质检',
    time: '2026-06-15 09:45',
    needsApproval: true,
    approvalStatus: '待审批',
  },
  {
    id: 3,
    module: '安全管理',
    title: '隐患整改验收 · 临边防护',
    project: 'T2航站区及配套工程',
    applicant: '赵安全',
    time: '2026-06-15 09:12',
    needsApproval: true,
    approvalStatus: '待审批',
  },
  {
    id: 4,
    module: '安全管理',
    title: '危险作业计划审批',
    project: '三跑道扩建工程',
    applicant: '陈计划',
    time: '2026-06-14 16:30',
    needsApproval: true,
    approvalStatus: '待审批',
  },
  {
    id: 5,
    module: '物资管理',
    title: '钢筋进场报审',
    project: 'T1航站区配套工程',
    applicant: '周物资',
    time: '2026-06-14 15:08',
    needsApproval: true,
    approvalStatus: '待审批',
  },
  {
    id: 6,
    module: '调度会',
    title: '调度事项闭环确认',
    project: '综合配套区市政工程',
    applicant: '吴调度',
    time: '2026-06-14 11:20',
    needsApproval: false,
    approvalStatus: null,
  },
  {
    id: 7,
    module: '质量管理',
    title: '分部分项验收资料审核',
    project: '捷运线延长段工程',
    applicant: '孙资料',
    time: '2026-06-14 10:05',
    needsApproval: true,
    approvalStatus: '已通过',
    approvalOpinion: '资料齐全，同意验收。',
    approvalResult: '通过',
    approvalTime: '2026-06-14 14:20',
  },
  {
    id: 8,
    module: '安全管理',
    title: '特种作业人员进场审批',
    project: '东北站坪',
    applicant: '钱劳务',
    time: '2026-06-13 17:40',
    needsApproval: true,
    approvalStatus: '已驳回',
    approvalOpinion: '证件复印件不清晰，请补充后重新提交。',
    approvalResult: '驳回',
    approvalTime: '2026-06-14 09:10',
  },
  {
    id: 9,
    module: '物资管理',
    title: '商砼供应计划变更审批',
    project: 'T2航站楼基础',
    applicant: '郑供应',
    time: '2026-06-13 15:22',
    needsApproval: true,
    approvalStatus: '待审批',
  },
  {
    id: 10,
    module: '调度会',
    title: '周例会督办事项销项确认',
    project: '工程指挥部',
    applicant: '指挥部',
    time: '2026-06-13 11:00',
    needsApproval: false,
    approvalStatus: null,
  },
]

/** @deprecated 使用 pendingTaskAllList */
export const pendingTaskList = pendingTaskAllList

export const noticePenaltyList = [
  {
    id: 1,
    type: 'notice',
    typeLabel: '任务单',
    title: '临边防护整改任务',
    project: 'T2空侧捷运线',
    date: '2026-06-15',
    status: '待阅',
  },
  {
    id: 2,
    type: 'penalty',
    typeLabel: '处罚单',
    title: '塔吊作业区警戒标识不足',
    project: 'T2空侧捷运线',
    date: '2026-06-14',
    status: '待处理',
  },
  {
    id: 3,
    type: 'notice',
    typeLabel: '任务单',
    title: '基坑监测数据异常任务',
    project: '三跑道扩建',
    date: '2026-06-13',
    status: '已阅',
  },
  {
    id: 4,
    type: 'penalty',
    typeLabel: '处罚单',
    title: '特种作业人员持证上岗',
    project: '东北站坪',
    date: '2026-06-12',
    status: '整改中',
  },
]

export const alertMessages = [
  {
    id: 1,
    category: '人员',
    level: 'warning',
    text: '3号塔吊区特种作业人员证书 7 日内到期',
    time: '2026-06-15 09:15',
  },
  {
    id: 2,
    category: '隐患逾期',
    level: 'danger',
    text: '临边防护隐患整改已超期 2 天，请督办',
    time: '2026-06-15 08:40',
  },
  {
    id: 3,
    category: '监测设备',
    level: 'warning',
    text: '基坑位移监测点 J-03 数据中断',
    time: '2026-06-14 22:10',
  },
  {
    id: 4,
    category: '人员',
    level: 'info',
    text: '今日新进劳务人员 24 人待安全教育登记',
    time: '2026-06-14 07:30',
  },
  {
    id: 5,
    category: '隐患逾期',
    level: 'warning',
    text: '消防通道堆物隐患即将到达整改期限',
    time: '2026-06-13 17:20',
  },
]

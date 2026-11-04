/**
 * 数字周报 · 指标定义与演示数据
 *
 * 口径来源：调研记录/10、数字周报/数字周报_需求要点_v1.md
 * 结构约定：每章统一 { key, chapter, title, summary, columns, rows, totals }
 *   - summary 为「总体说明」文案（总）
 *   - columns + rows 为「分项目统计表」（分），列内可含要点明细（detail: true）
 *
 * 演示说明：W41～W44 使用本文件的演示数据工厂（页面标注「演示数据」）；
 * 其余周次由 utils/weeklyReportBuilder.js 从各模块台账实时取数。
 */

/* ------------------------------------------------------------------ *
 * 1. 周信息工具
 * ------------------------------------------------------------------ */

const DAY = 86400000

/** 一天零点的本地 Date */
export function dateAtMidnight(input) {
  const d = input instanceof Date ? new Date(input.getTime()) : new Date(`${String(input).slice(0, 10)}T00:00:00`)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatYmd(date) {
  const d = dateAtMidnight(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(ymd, days) {
  const d = dateAtMidnight(ymd)
  return formatYmd(new Date(d.getTime() + days * DAY))
}

/** 返回该日期所在自然周的周一（周一为一周起点） */
export function mondayOf(input) {
  const d = dateAtMidnight(input)
  const weekday = d.getDay() || 7
  return formatYmd(new Date(d.getTime() - (weekday - 1) * DAY))
}

/** ISO-8601 周序号（跨年边界：属于哪一年的第几周） */
export function isoWeekOf(input) {
  const d = dateAtMidnight(input)
  const target = new Date(d.getTime())
  const dayNr = (d.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3) // 本周周四
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDayNr = (firstThursday.getDay() + 6) % 7
  const firstThursdayYmd = new Date(firstThursday.getTime() - firstDayNr * DAY + 3 * DAY)
  const weekNo = 1 + Math.round((target.getTime() - firstThursdayYmd.getTime()) / (7 * DAY))
  return { year: target.getFullYear(), weekNo }
}

/** 周信息：{ weekKey, weekStart, weekEnd, year, weekNo, label } */
export function getWeekInfo(input) {
  const weekStart = mondayOf(input)
  const weekEnd = addDays(weekStart, 6)
  const { year, weekNo } = isoWeekOf(weekStart)
  const weekKey = `${year}-W${String(weekNo).padStart(2, '0')}`
  return {
    weekKey,
    weekStart,
    weekEnd,
    year,
    weekNo,
    label: `${year} 年第 ${weekNo} 周`,
    rangeLabel: `${weekStart} ~ ${weekEnd}`,
  }
}

/** 上一周信息 */
export function previousWeekInfo(weekStartOrKey) {
  const weekStart = String(weekStartOrKey).includes('W') ? weekOfKey(weekStartOrKey).weekStart : mondayOf(weekStartOrKey)
  return getWeekInfo(addDays(weekStart, -7))
}

/** 由 2026-W44 反解周一日期 */
export function weekOfKey(weekKey) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(weekKey || ''))
  if (!match) return getWeekInfo(new Date())
  const year = Number(match[1])
  const weekNo = Number(match[2])
  // ISO 第 1 周的周一 = 1 月 4 日所在周的周一
  const jan4 = new Date(year, 0, 4)
  const jan4Weekday = (jan4.getDay() + 6) % 7
  const firstMonday = new Date(jan4.getTime() - jan4Weekday * DAY)
  const weekStart = formatYmd(new Date(firstMonday.getTime() + (weekNo - 1) * 7 * DAY))
  return getWeekInfo(weekStart)
}

/* ------------------------------------------------------------------ *
 * 2. 演示项目画像（8 个在建项目，表现分档决定各项指标基础值）
 * ------------------------------------------------------------------ */

export const DEMO_PROJECTS = [
  { name: 'T2航站区配套', tier: 'good', owner: '李志钦' },
  { name: 'T1航站区配套', tier: 'good', owner: '刘国旗' },
  { name: '三跑道扩建', tier: 'mid', owner: '孙先群' },
  { name: 'T2空侧捷运线', tier: 'mid', owner: '陈清云' },
  { name: '东北站坪', tier: 'good', owner: '王建华' },
  { name: '综合配套区市政', tier: 'weak', owner: '赵安全' },
  { name: '捷运线延长段', tier: 'weak', owner: '钱劳务' },
  { name: 'T2航站楼基础', tier: 'mid', owner: '周物资' },
]

/** 表现因子：good 0.88 / mid 0.74 / weak 0.58 */
export const TIER_FACTOR = { good: 0.88, mid: 0.74, weak: 0.58 }

/** 参与演示的周（这四周走演示数据，其余走真实台账） */
export const DEMO_WEEK_KEYS = ['2026-W41', '2026-W42', '2026-W43', '2026-W44']

export function isDemoWeek(weekKey) {
  return DEMO_WEEK_KEYS.includes(weekKey)
}

/** 确定性伪随机：同一周同一项目同一盐值结果固定，保证多次生成一致 */
export function seededRandom(weekKey, projectIndex, salt) {
  let h = 2166136261
  const text = `${weekKey}|${projectIndex}|${salt}`
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (Math.abs(h) % 100000) / 100000
}

function pick(seed, min, max) {
  return Math.round(min + (max - min) * seed)
}

/* ------------------------------------------------------------------ *
 * 3. 常用枚举与文案
 * ------------------------------------------------------------------ */

export const DANGER_WORK_TYPES = ['动火作业', '高处作业', '受限空间作业', '临时用电作业', '吊装作业', '动土作业']

export const HAZARD_LEVELS = ['一般', '较大', '重大']

const HAZARD_TITLES = [
  '临边防护栏杆缺失',
  '配电箱未上锁且无警示标识',
  '高处作业未系安全带',
  '基坑边坡堆载超限',
  '消防通道被材料占用',
  '动火作业看火人脱岗',
  '脚手架连墙件设置不足',
  '裸土未覆盖产生扬尘',
  '临时用电线路拖地泡水',
  '吊装作业警戒区未封闭',
  '模板支撑架立杆间距超标',
  '洞口盖板未固定',
]

const QUALITY_TITLES = [
  '回填土含水量偏高',
  '集水井井口外包尼龙网破损',
  '局部混凝土外观蜂窝麻面',
  '钢筋保护层厚度不足',
  '防水卷材搭接宽度不足',
  '砌体灰缝饱满度不达标',
  '幕墙预埋件位置偏差',
]

const TASK_TITLES = [
  '高处作业安全与质量检查',
  '防台防汛专项检查',
  '临时用电专项检查',
  '脚手架专项检查',
  '动火作业旁站检查',
  '基坑支护日常巡查',
  '起重吊装作业检查',
]

export function riskLevelOf(index) {
  return HAZARD_LEVELS[(index + 1) % 3] === '重大' && index % 7 !== 0 ? '较大' : HAZARD_LEVELS[(index + 1) % 3]
}

/* ------------------------------------------------------------------ *
 * 4. 演示数据：各章节构建
 * ------------------------------------------------------------------ */

/** 统一列定义：{ prop, label, width?, minWidth?, unit?, align?, detail? } */

/** 概览指标卡定义（10 张） */
export const OVERVIEW_CARDS = [
  { key: 'meetings', label: '调度场次', unit: '次', rule: '本周已结束的调度会议记录数', source: 'COC 会议记录' },
  { key: 'coverage', label: '调度覆盖项目数', unit: '个', rule: '会议记录中调度项目去重数／在建项目数', source: 'COC 会议记录' },
  { key: 'attendRate', label: '值班人员参会率', unit: '%', rule: '已参会人次 ÷ 应参会人次', source: 'COC 会议记录' },
  { key: 'reportRate', label: '危险作业上报率', unit: '%', rule: '实报天数 ÷ 应报天数', source: '每日施工作业' },
  { key: 'newHazard', label: '新增隐患', unit: '条', rule: '安全巡检＋调度隐患＋监理会议＋质量问题 新增合计', source: '隐患四源统一池' },
  { key: 'closeRate', label: '隐患闭环率', unit: '%', rule: '本周闭环数 ÷ 本周新增数', source: '隐患四源统一池' },
  { key: 'taskRate', label: '巡检任务完成率', unit: '%', rule: '本周完成任务 ÷ 本周发起任务', source: '巡检任务' },
  { key: 'overdueHazard', label: '逾期未闭环隐患', unit: '条', rule: '截止日已过且未闭环的隐患数', source: '隐患四源统一池' },
  { key: 'qmRectifyRate', label: '质量问题整改率', unit: '%', rule: '已闭环 ÷ 需整改', source: '质量问题' },
  { key: 'gapProjects', label: '应报未报项目数', unit: '个', rule: '本周任一必报模块无数据的项目数', source: '各模块台账' },
]

/** 附录口径说明 */
export const METRIC_APPENDIX = [
  { name: '自然周', unit: '—', rule: '周一 00:00 ~ 周日 24:00 为一个统计周；跨月周按周一所在月归属', source: '周报通用' },
  { name: '数据截止与冻结', unit: '—', rule: '统计周日 24:00 状态快照；生成后冻结，后续补录不改已生成周报', source: '周报通用' },
  { name: '跨项目汇总', unit: '—', rule: '计数类各项目相加；比率类 ∑分子 ÷ ∑分母（加权）', source: '数据大屏 §0.3' },
  { name: '空值', unit: '—', rule: '无数据或分母为 0 显示「--」，不显示 0', source: '周报通用' },
  { name: '隐患闭环', unit: '—', rule: '安全巡检「已关闭」计闭环；「待复查」仍算未闭环（项目经理审批中）；质量问题「已完成/已关闭」计闭环', source: '隐患四源统一池' },
  { name: '逾期', unit: '—', rule: '有整改期限且未闭环、截止日早于统计截止日即逾期；无期限单列「无期限」不计入逾期', source: '隐患四源统一池' },
  { name: '隐患整改率', unit: '%', rule: '已闭环数 ÷ 需整改数；与考核评分第 2 项同口径（周报为过程值，考核以考核模块固化结果为准）', source: '考核评分十项指标' },
  { name: '验收通过率', unit: '%', rule: '已通过 ÷ 验收任务数（原型演示按通过率展示；接正式数据后可按「重新申报来源为空」计算一次性通过率）', source: '质量验评看板' },
  { name: '危险作业上报率', unit: '%', rule: '有每日施工作业记录的天数 ÷ 应报自然日天数', source: '每日施工作业' },
]

const COL_PROJECT = { prop: 'project', label: '项目', minWidth: 132, fixed: true }

function pct(numerator, denominator) {
  if (!denominator) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function fmtPct(value) {
  return value === null || value === undefined ? '--' : `${value}%`
}

/* ---------- 2.1 调度会议 ---------- */

function buildCocMeeting(weekKey) {
  const meetings = [
    { no: 1, date: addDays(weekOfKey(weekKey).weekStart, 0), projectCount: 8 },
    { no: 2, date: addDays(weekOfKey(weekKey).weekStart, 2), projectCount: 5 },
    { no: 3, date: addDays(weekOfKey(weekKey).weekStart, 4), projectCount: 3 },
  ]
  const coveredIndexes = [[0, 1, 2, 3, 4, 5, 6, 7], [0, 1, 2, 3, 4], [0, 5, 6]]
  const rows = DEMO_PROJECTS.map((project, index) => {
    const dispatched = coveredIndexes.filter((list) => list.includes(index)).length
    const shouldAttend = dispatched * 4
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'attend')
    const absent = dispatched === 0 ? 0 : Math.min(shouldAttend, Math.max(0, Math.round((1 - tierFactor) * shouldAttend * (0.4 + seed))))
    const joined = shouldAttend - absent
    const absentNames = []
    if (absent > 0) {
      const pool = [
        `${project.owner}（项目经理/夜班）`,
        '陈现场（施工员/白班）',
        '孙监理（监理员/白班）',
        '周安全（安全员/夜班）',
      ]
      absentNames.push(...pool.slice(0, Math.min(absent, pool.length)))
      if (absent > absentNames.length) absentNames.push(`等 ${absent} 人`)
    }
    const dutyStatus = dispatched === 0 ? '未覆盖' : seed > 0.78 ? '缺 1 天' : seed > 0.62 ? '缺 2 天' : '已排满'
    return {
      project: project.name,
      dispatched,
      shouldAttend,
      joined,
      absent,
      rate: pct(joined, shouldAttend),
      absentNames: absentNames.length ? absentNames.join('、') : '--',
      dutyStatus,
    }
  })
  const totalShould = rows.reduce((sum, row) => sum + row.shouldAttend, 0)
  const totalJoined = rows.reduce((sum, row) => sum + row.joined, 0)
  const totalAbsent = rows.reduce((sum, row) => sum + row.absent, 0)
  const totalDispatched = rows.reduce((sum, row) => sum + row.dispatched, 0)
  const coverage = rows.filter((row) => row.dispatched > 0).length
  return {
    key: 'cocMeeting',
    chapter: '二、COC 调度',
    title: '2.1 调度会议情况',
    summary:
      `本周开展调度会议 ${meetings.length} 场，覆盖项目 ${coverage} 个／在建 ${DEMO_PROJECTS.length} 个（覆盖率 ` +
      `${fmtPct(pct(coverage, DEMO_PROJECTS.length))}）；应参会 ${totalShould} 人次、已参会 ${totalJoined} 人次、` +
      `未参会 ${totalAbsent} 人次，参会率 ${fmtPct(pct(totalJoined, totalShould))}。会议日期：` +
      `${meetings.map((item) => item.date.slice(5)).join('、')}；本周边被调度次数合计 ${totalDispatched} 次。`,
    columns: [
      COL_PROJECT,
      { prop: 'dispatched', label: '被调度次数', unit: '次', width: 104, align: 'center' },
      { prop: 'shouldAttend', label: '应参会人次', unit: '人次', width: 104, align: 'center' },
      { prop: 'joined', label: '已参会', unit: '人次', width: 92, align: 'center' },
      { prop: 'absent', label: '未参会', unit: '人次', width: 88, align: 'center' },
      { prop: 'rate', label: '参会率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'absentNames', label: '未参会人员', minWidth: 230, detail: true },
      { prop: 'dutyStatus', label: '值班排班', width: 96, align: 'center' },
    ],
    rows,
    totals: { project: '合计', dispatched: totalDispatched, shouldAttend: totalShould, joined: totalJoined, absent: totalAbsent, rate: pct(totalJoined, totalShould), absentNames: '—', dutyStatus: '—' },
    extra: { meetings, coverage },
  }
}

/* ---------- 2.2 危险作业上报 ---------- */

function buildCocDangerWork(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'danger')
    const shouldDays = 7
    const miss = Math.max(0, Math.round((1 - tierFactor) * 5 * (0.2 + seed)))
    const actualDays = shouldDays - Math.min(3, miss)
    const dangerCount = Math.max(0, pick(seed, 1, 5))
    const typeCount = Math.max(1, Math.min(3, dangerCount))
    const types = DANGER_WORK_TYPES.filter((_, typeIndex) => (index + typeIndex) % 3 === 0).slice(0, typeCount)
    const mainTypes = dangerCount ? types.map((type, typeIndex) => `${type} ${Math.max(1, dangerCount - typeIndex)}`).join('、') : '--'
    const missDates = []
    for (let d = 0; d < Math.min(3, miss); d += 1) {
      missDates.push(addDays(weekOfKey(weekKey).weekStart, (index + d * 2) % 7).slice(5))
    }
    return {
      project: project.name,
      shouldDays,
      actualDays,
      rate: pct(actualDays, shouldDays),
      dangerCount,
      mainTypes,
      missDates: missDates.length ? missDates.join('、') : '--',
      remark: miss ? '存在漏报' : '按日上报',
    }
  })
  const totalShould = rows.reduce((sum, row) => sum + row.shouldDays, 0)
  const totalActual = rows.reduce((sum, row) => sum + row.actualDays, 0)
  const totalDanger = rows.reduce((sum, row) => sum + row.dangerCount, 0)
  const gapProjects = rows.filter((row) => row.actualDays < row.shouldDays).length
  return {
    key: 'cocDangerWork',
    chapter: '二、COC 调度',
    title: '2.2 危险作业上报情况',
    summary:
      `本周应报 ${DEMO_PROJECTS.length} 个项目 × ${rows[0]?.shouldDays || 7} 天 = ${totalShould} 天次，实报 ${totalActual} 天次，` +
      `上报率 ${fmtPct(pct(totalActual, totalShould))}；其中危险作业 ${totalDanger} 条，涉及 ${rows.filter((row) => row.dangerCount > 0).length} 个项目；` +
      `类别以动火、高处、受限空间作业为主；${gapProjects} 个项目存在漏报。`,
    columns: [
      COL_PROJECT,
      { prop: 'shouldDays', label: '应报天数', unit: '天', width: 92, align: 'center' },
      { prop: 'actualDays', label: '实报天数', unit: '天', width: 92, align: 'center' },
      { prop: 'rate', label: '上报率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'dangerCount', label: '危险作业条数', unit: '条', width: 112, align: 'center' },
      { prop: 'mainTypes', label: '主要作业类别', minWidth: 220, detail: true },
      { prop: 'missDates', label: '未上报日期', minWidth: 132 },
      { prop: 'remark', label: '备注', width: 110 },
    ],
    rows,
    totals: { project: '合计', shouldDays: totalShould, actualDays: totalActual, rate: pct(totalActual, totalShould), dangerCount: totalDanger, mainTypes: '—', missDates: '—', remark: '—' },
  }
}

/* ---------- 2.3 调度过程新增隐患 ---------- */

function buildCocHazard(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'hazard')
    const dispatchSrc = Math.max(0, pick(seed, 0, 4))
    const supervisionSrc = Math.max(0, pick(seededRandom(weekKey, index, 'supervision'), 0, 3))
    const total = dispatchSrc + supervisionSrc
    const quality = Math.max(0, Math.min(total, Math.round(total * (0.2 + seed * 0.3))))
    const safety = total - quality
    const high = total ? Math.max(0, pick(seededRandom(weekKey, index, 'high'), 0, 1)) : 0
    const mid = total ? Math.max(0, pick(seededRandom(weekKey, index, 'mid'), 0, 2) - (high > 0 ? 0 : 0)) : 0
    const low = Math.max(0, total - high - mid)
    const closed = Math.max(0, Math.min(total, Math.round(total * (0.35 + tierFactor * 0.4))))
    const open = total - closed
    const overdue = Math.min(open, Math.max(0, pick(seededRandom(weekKey, index, 'overdue'), 0, 2)))
    const firstTitle = HAZARD_TITLES[(index + (total || 0)) % HAZARD_TITLES.length]
    const secondTitle = HAZARD_TITLES[(index + 3) % HAZARD_TITLES.length]
    const mainHazards = total
      ? [firstTitle, ...(total > 2 ? [secondTitle] : [])].join('；')
      : '--'
    return {
      project: project.name,
      total,
      dispatchSrc,
      supervisionSrc,
      safety,
      quality,
      low,
      mid,
      high,
      closed,
      open,
      overdue,
      mainHazards,
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'cocHazard',
    chapter: '二、COC 调度',
    title: '2.3 调度过程新增隐患',
    summary:
      `本周调度过程新增隐患 ${sum('total')} 条，按来源：调度隐患 ${sum('dispatchSrc')} 条、监理会议 ${sum('supervisionSrc')} 条；` +
      `按类型：安全 ${sum('safety')} 条、质量 ${sum('quality')} 条；按等级：一般 ${sum('low')}、较大 ${sum('mid')}、重大 ${sum('high')}；` +
      `已闭环 ${sum('closed')} 条、未闭环 ${sum('open')} 条、逾期 ${sum('overdue')} 条。`,
    columns: [
      COL_PROJECT,
      { prop: 'total', label: '新增合计', unit: '条', width: 92, align: 'center' },
      { prop: 'dispatchSrc', label: '调度隐患', unit: '条', width: 92, align: 'center' },
      { prop: 'supervisionSrc', label: '监理会议', unit: '条', width: 92, align: 'center' },
      { prop: 'safety', label: '安全', unit: '条', width: 72, align: 'center' },
      { prop: 'quality', label: '质量', unit: '条', width: 72, align: 'center' },
      { prop: 'low', label: '一般', unit: '条', width: 72, align: 'center' },
      { prop: 'mid', label: '较大', unit: '条', width: 72, align: 'center' },
      { prop: 'high', label: '重大', unit: '条', width: 72, align: 'center' },
      { prop: 'closed', label: '已闭环', unit: '条', width: 84, align: 'center' },
      { prop: 'open', label: '未闭环', unit: '条', width: 84, align: 'center' },
      { prop: 'overdue', label: '逾期', unit: '条', width: 72, align: 'center' },
      { prop: 'mainHazards', label: '主要隐患', minWidth: 230, detail: true },
    ],
    rows,
    totals: { project: '合计', total: sum('total'), dispatchSrc: sum('dispatchSrc'), supervisionSrc: sum('supervisionSrc'), safety: sum('safety'), quality: sum('quality'), low: sum('low'), mid: sum('mid'), high: sum('high'), closed: sum('closed'), open: sum('open'), overdue: sum('overdue'), mainHazards: '—' },
  }
}

/* ---------- 2.4 隐患抽检 ---------- */

function buildCocSampling(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'sampling')
    const tasks = seed > 0.7 ? 1 : 0
    const count = tasks ? pick(seededRandom(weekKey, index, 'sampleCount'), 3, 10) : 0
    const fail = tasks ? Math.max(0, Math.round((1 - tierFactor) * 4 * seed)) : 0
    const pending = tasks ? Math.max(0, Math.round(count * 0.1)) : 0
    const pass = Math.max(0, count - fail - pending)
    const failPoints = fail
      ? `${QUALITY_TITLES[(index + fail) % QUALITY_TITLES.length]}（复核不通过）`
      : '--'
    return {
      project: project.name,
      tasks,
      count,
      pass,
      fail,
      pending,
      rate: pct(pass, count ? pass + fail : 0),
      failPoints,
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'cocSampling',
    chapter: '二、COC 调度',
    title: '2.4 隐患抽检情况',
    summary:
      `本周抽检任务 ${sum('tasks')} 个（指挥部下发），抽检隐患 ${sum('count')} 条：合格 ${sum('pass')} 条、不合格 ${sum('fail')} 条` +
      `（合格率 ${fmtPct(pct(sum('pass'), sum('pass') + sum('fail')))}）、未复核 ${sum('pending')} 条；` +
      `抽检规则：近 90 天隐患按 30% 抽取、最少 3 条。`,
    columns: [
      COL_PROJECT,
      { prop: 'tasks', label: '抽检任务数', unit: '个', width: 104, align: 'center' },
      { prop: 'count', label: '抽检隐患条数', unit: '条', width: 118, align: 'center' },
      { prop: 'pass', label: '合格', unit: '条', width: 76, align: 'center' },
      { prop: 'fail', label: '不合格', unit: '条', width: 84, align: 'center' },
      { prop: 'pending', label: '未复核', unit: '条', width: 84, align: 'center' },
      { prop: 'rate', label: '合格率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'failPoints', label: '不合格要点', minWidth: 240, detail: true },
    ],
    rows,
    totals: { project: '合计', tasks: sum('tasks'), count: sum('count'), pass: sum('pass'), fail: sum('fail'), pending: sum('pending'), rate: pct(sum('pass'), sum('pass') + sum('fail')), failPoints: '—' },
  }
}

/* ---------- 3.1 巡检任务 ---------- */

function buildSafetyTask(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'task')
    const created = pick(seed, 2, 5)
    const done = Math.max(1, Math.min(created, Math.round(created * (0.6 + tierFactor * 0.35))))
    const withHazard = Math.max(0, Math.min(done, Math.round(done * (0.2 + seed * 0.3))))
    const overdue = Math.max(0, created - done > 0 ? Math.min(created - done, Math.round((1 - tierFactor) * 3)) : 0)
    const maxOverdueDays = overdue ? pick(seededRandom(weekKey, index, 'od'), 1, 6) : 0
    const overdueNames = overdue
      ? TASK_TITLES.slice(index % 4, (index % 4) + Math.min(overdue, 2)).join('、')
      : '--'
    return {
      project: project.name,
      created,
      done,
      rate: pct(done, created),
      withHazard,
      overdue,
      maxOverdueDays,
      overdueNames,
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'safetyTask',
    chapter: '三、安全管理',
    title: '3.1 巡检任务',
    summary:
      `本周发起巡检任务 ${sum('created')} 个、完成 ${sum('done')} 个（完成率 ${fmtPct(pct(sum('done'), sum('created')))}）、` +
      `有隐患任务 ${sum('withHazard')} 个、逾期任务 ${sum('overdue')} 个（最长逾期 ${Math.max(...rows.map((row) => row.maxOverdueDays), 0)} 天）。`,
    columns: [
      COL_PROJECT,
      { prop: 'created', label: '发起', unit: '个', width: 76, align: 'center' },
      { prop: 'done', label: '完成', unit: '个', width: 76, align: 'center' },
      { prop: 'rate', label: '完成率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'withHazard', label: '有隐患任务', unit: '个', width: 104, align: 'center' },
      { prop: 'overdue', label: '逾期任务', unit: '个', width: 92, align: 'center' },
      { prop: 'maxOverdueDays', label: '最长逾期天数', unit: '天', width: 116, align: 'center' },
      { prop: 'overdueNames', label: '逾期任务要点', minWidth: 230, detail: true },
    ],
    rows,
    totals: { project: '合计', created: sum('created'), done: sum('done'), rate: pct(sum('done'), sum('created')), withHazard: sum('withHazard'), overdue: sum('overdue'), maxOverdueDays: Math.max(...rows.map((row) => row.maxOverdueDays), 0), overdueNames: '—' },
  }
}

/* ---------- 3.2 隐患整治（安全管理口径） ---------- */

function buildSafetyHazard(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'safetyHazard')
    const created = pick(seed, 3, 9)
    const closed = Math.max(1, Math.min(created, Math.round(created * (0.45 + tierFactor * 0.5))))
    const open = Math.max(0, pick(seededRandom(weekKey, index, 'open'), 2, 8))
    const pendingFix = Math.max(0, Math.round(open * 0.6))
    const pendingReview = Math.max(0, Math.round(open * 0.25))
    const reviewed = Math.max(0, open - pendingFix - pendingReview)
    const overdue = Math.max(0, Math.min(open, Math.round((1 - tierFactor) * 3 + seed)))
    const avgDays = Math.round((1.5 + (1 - tierFactor) * 6 + seed * 2) * 10) / 10
    return {
      project: project.name,
      created,
      closed,
      open,
      pendingFix,
      pendingReview,
      reviewed,
      overdue,
      rate: pct(closed, created),
      avgDays,
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  const avgDays = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + row.avgDays, 0) / rows.length) * 10) / 10
    : null
  return {
    key: 'safetyHazard',
    chapter: '三、安全管理',
    title: '3.2 隐患整治',
    summary:
      `本周发现隐患 ${sum('created')} 条、闭环 ${sum('closed')} 条（闭环率 ${fmtPct(pct(sum('closed'), sum('created')))}）、` +
      `未闭环存量 ${sum('open')} 条（待整改 ${sum('pendingFix')}、待验收 ${sum('pendingReview')}、待复查 ${sum('reviewed')}）、` +
      `逾期 ${sum('overdue')} 条；本周闭环隐患平均整改时长 ${avgDays} 天。`,
    columns: [
      COL_PROJECT,
      { prop: 'created', label: '新增', unit: '条', width: 76, align: 'center' },
      { prop: 'closed', label: '闭环', unit: '条', width: 76, align: 'center' },
      { prop: 'open', label: '未闭环', unit: '条', width: 84, align: 'center' },
      { prop: 'pendingFix', label: '待整改', unit: '条', width: 84, align: 'center' },
      { prop: 'pendingReview', label: '待验收', unit: '条', width: 84, align: 'center' },
      { prop: 'reviewed', label: '待复查', unit: '条', width: 84, align: 'center' },
      { prop: 'overdue', label: '逾期', unit: '条', width: 76, align: 'center' },
      { prop: 'rate', label: '整改率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'avgDays', label: '平均整改天数', unit: '天', width: 116, align: 'center' },
    ],
    rows,
    totals: { project: '合计', created: sum('created'), closed: sum('closed'), open: sum('open'), pendingFix: sum('pendingFix'), pendingReview: sum('pendingReview'), reviewed: sum('reviewed'), overdue: sum('overdue'), rate: pct(sum('closed'), sum('created')), avgDays },
  }
}

/* ---------- 3.3 / 4.6 排名（通用） ---------- */

function buildRankSection({ key, chapter, title, sourceSection, rateLabel }) {
  const ranked = [...sourceSection.rows]
    .filter((row) => row.created > 0 || row.closed > 0)
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || String(a.project).localeCompare(String(b.project), 'zh-CN'))
  let lastRate = null
  let lastRank = 0
  const rows = ranked.map((row, index) => {
    const rank = lastRate !== null && row.rate === lastRate ? lastRank : index + 1
    lastRate = row.rate
    lastRank = rank
    const mark = row.rate === null ? '未纳入' : row.rate >= 90 ? '优' : row.rate >= 80 ? '良' : '需关注'
    return {
      rank,
      project: row.project,
      rate: row.rate,
      closedCreated: `${row.closed}/${row.created}`,
      overdue: row.overdue,
      open: row.open,
      mark,
    }
  })
  const notIncluded = sourceSection.rows.filter((row) => !(row.created > 0 || row.closed > 0)).length
  return {
    key,
    chapter,
    title,
    summary: `排名口径：按${rateLabel}降序、同值并列（1、2、2、4）；本周未上报项目不参与排名${notIncluded ? `（${notIncluded} 个项目未纳入）` : ''}。`,
    columns: [
      { prop: 'rank', label: '名次', width: 64, align: 'center' },
      { prop: 'project', label: '项目', minWidth: 132 },
      { prop: 'rate', label: rateLabel, unit: '%', width: 96, align: 'center', format: 'pct' },
      { prop: 'closedCreated', label: '闭环/新增', width: 100, align: 'center' },
      { prop: 'overdue', label: '逾期数', unit: '条', width: 84, align: 'center' },
      { prop: 'open', label: '未闭环', unit: '条', width: 84, align: 'center' },
      { prop: 'mark', label: '标记', width: 92, align: 'center' },
    ],
    rows,
  }
}

/* ---------- 3.4 逾期与跨周遗留 ---------- */

function buildSafetyOverdue(weekKey, hazardSection) {
  const rows = []
  DEMO_PROJECTS.forEach((project, index) => {
    const hazardRow = hazardSection.rows.find((row) => row.project === project.name)
    const count = Math.min(2, hazardRow?.overdue || 0)
    for (let i = 0; i < count; i += 1) {
      const seed = seededRandom(weekKey, index, `od-${i}`)
      const deadline = addDays(weekOfKey(weekKey).weekStart, -pick(seed, 1, 6))
      const overdueDays = pick(seededRandom(weekKey, index, `odd-${i}`), 1, 12)
      rows.push({
        project: project.name,
        hazardNo: `AQYH-${weekOfKey(weekKey).weekStart.replace(/-/g, '').slice(0, 6)}-${String(index + 1).padStart(3, '0')}${String(i + 1)}`,
        title: HAZARD_TITLES[(index + i) % HAZARD_TITLES.length],
        type: i % 3 === 0 ? '质量' : '安全',
        level: HAZARD_LEVELS[(index + i) % 3],
        owner: project.owner,
        deadline,
        overdueDays,
        status: i === 0 ? '待整改' : '待验收',
        isLegacy: i === 0 && seed > 0.5 ? '是' : '否',
      })
    }
  })
  const legacy = rows.filter((row) => row.isLegacy === '是').length
  return {
    key: 'safetyOverdue',
    chapter: '三、安全管理',
    title: '3.4 逾期与跨周遗留',
    summary:
      `本周逾期未闭环 ${rows.length} 条，其中上周遗留 ${legacy} 条（本周已闭环 ${Math.max(0, legacy - 1)} 条，遗留闭环率 ` +
      `${fmtPct(pct(Math.max(0, legacy - 1), legacy))}）；逾期事项按项目分布见下表，供周会逐项督办。`,
    columns: [
      { prop: 'project', label: '项目', minWidth: 132 },
      { prop: 'hazardNo', label: '隐患编号', minWidth: 148 },
      { prop: 'title', label: '隐患描述', minWidth: 200, detail: true },
      { prop: 'type', label: '类型', width: 76, align: 'center' },
      { prop: 'level', label: '等级', width: 76, align: 'center' },
      { prop: 'owner', label: '责任人', width: 96 },
      { prop: 'deadline', label: '截止日', width: 110, align: 'center' },
      { prop: 'overdueDays', label: '逾期天数', unit: '天', width: 100, align: 'center' },
      { prop: 'status', label: '当前状态', width: 100, align: 'center' },
      { prop: 'isLegacy', label: '是否上周遗留', width: 116, align: 'center' },
    ],
    rows,
  }
}

/* ---------- 4.1 质量问题整治 ---------- */

function buildQmIssue(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'qmIssue')
    const created = Math.max(0, pick(seed, 0, 3))
    const platform = created ? Math.max(0, Math.round(created * 0.7)) : 0
    const bim = created - platform
    const closed = Math.max(0, Math.min(created, Math.round(created * (0.5 + tierFactor * 0.45))))
    const open = Math.max(0, pick(seededRandom(weekKey, index, 'qmOpen'), 0, 4))
    const overdue = Math.max(0, Math.min(open, Math.round((1 - tierFactor) * 2)))
    return {
      project: project.name,
      created,
      platform,
      bim,
      closed,
      open,
      overdue,
      rate: pct(closed, created),
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'qmIssue',
    chapter: '四、质量管理',
    title: '4.1 质量问题整治',
    summary:
      `本周新增质量问题 ${sum('created')} 条（平台侧 ${sum('platform')} 条、BIM 对接 ${sum('bim')} 条，双源不合并计数）；` +
      `已闭环 ${sum('closed')} 条（整改率 ${fmtPct(pct(sum('closed'), sum('created')))}）、未整改存量 ${sum('open')} 条、逾期 ${sum('overdue')} 条。`,
    columns: [
      COL_PROJECT,
      { prop: 'created', label: '新增', unit: '条', width: 76, align: 'center' },
      { prop: 'platform', label: '平台侧', unit: '条', width: 84, align: 'center' },
      { prop: 'bim', label: 'BIM 对接', unit: '条', width: 92, align: 'center' },
      { prop: 'closed', label: '已闭环', unit: '条', width: 84, align: 'center' },
      { prop: 'open', label: '未整改', unit: '条', width: 84, align: 'center' },
      { prop: 'overdue', label: '逾期', unit: '条', width: 76, align: 'center' },
      { prop: 'rate', label: '整改率', unit: '%', width: 88, align: 'center', format: 'pct' },
    ],
    rows,
    totals: { project: '合计', created: sum('created'), platform: sum('platform'), bim: sum('bim'), closed: sum('closed'), open: sum('open'), overdue: sum('overdue'), rate: pct(sum('closed'), sum('created')) },
  }
}

/* ---------- 4.2 质量验评 ---------- */

function buildQmInspect(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'qmInspect')
    const tasks = pick(seed, 2, 7)
    const pending = pick(seededRandom(weekKey, index, 'pending'), 0, 2)
    const approving = pick(seededRandom(weekKey, index, 'approving'), 0, 2)
    const rejected = Math.max(0, Math.round((1 - tierFactor) * 2 * seed))
    const approved = Math.max(0, tasks - pending - approving - rejected)
    const firstPassRate = approved ? Math.max(50, Math.min(100, Math.round((tierFactor + 0.08) * 100 - rejected * 2))) : null
    const nodeTotal = pick(seededRandom(weekKey, index, 'node'), 8, 24)
    const nodeDone = Math.round(nodeTotal * (0.25 + tierFactor * 0.5))
    return {
      project: project.name,
      tasks,
      pending,
      approving,
      approved,
      rejected,
      firstPassRate,
      nodeTotal,
      nodeDone,
      nodeRate: pct(nodeDone, nodeTotal),
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'qmInspect',
    chapter: '四、质量管理',
    title: '4.2 质量验评',
    summary:
      `本周验收任务 ${sum('tasks')} 个：待提交 ${sum('pending')}、审批中 ${sum('approving')}、已通过 ${sum('approved')}、已驳回 ${sum('rejected')}；` +
      `通过率 ${fmtPct(pct(sum('approved'), sum('tasks')))}；验收节点完成率 ${fmtPct(pct(sum('nodeDone'), sum('nodeTotal')))}。`,
    columns: [
      COL_PROJECT,
      { prop: 'tasks', label: '任务数', unit: '个', width: 84, align: 'center' },
      { prop: 'pending', label: '待提交', unit: '个', width: 84, align: 'center' },
      { prop: 'approving', label: '审批中', unit: '个', width: 84, align: 'center' },
      { prop: 'approved', label: '已通过', unit: '个', width: 84, align: 'center' },
      { prop: 'rejected', label: '已驳回', unit: '个', width: 84, align: 'center' },
      { prop: 'firstPassRate', label: '通过率', unit: '%', width: 100, align: 'center', format: 'pct' },
      { prop: 'nodeTotal', label: '节点总数', unit: '个', width: 92, align: 'center' },
      { prop: 'nodeDone', label: '已完成节点', unit: '个', width: 108, align: 'center' },
      { prop: 'nodeRate', label: '节点完成率', unit: '%', width: 108, align: 'center', format: 'pct' },
    ],
    rows,
    totals: { project: '合计', tasks: sum('tasks'), pending: sum('pending'), approving: sum('approving'), approved: sum('approved'), rejected: sum('rejected'), firstPassRate: pct(sum('approved'), sum('tasks')), nodeTotal: sum('nodeTotal'), nodeDone: sum('nodeDone'), nodeRate: pct(sum('nodeDone'), sum('nodeTotal')) },
  }
}

/* ---------- 4.3 品牌报审 ---------- */

function buildQmBrand(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const seed = seededRandom(weekKey, index, 'qmBrand')
    const brandTotal = pick(seededRandom(weekKey, index, 'brandTotal'), 3, 16)
    const applications = Math.max(0, pick(seed, 0, 3))
    const rejected = applications ? Math.max(0, Math.round((1 - TIER_FACTOR[project.tier]) * 2 * seed)) : 0
    const approving = applications ? Math.max(0, Math.round(applications * 0.3)) : 0
    const approved = Math.max(0, applications - rejected - approving)
    return {
      project: project.name,
      brandTotal,
      applications,
      approving,
      approved,
      rejected,
      firstPassRate: applications ? pct(approved - rejected, applications) : null,
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'qmBrand',
    chapter: '四、质量管理',
    title: '4.3 品牌报审',
    summary:
      `本周报审 ${sum('applications')} 项：审批中 ${sum('approving')}、已通过 ${sum('approved')}、已驳回 ${sum('rejected')}；` +
      `一次通过率 ${fmtPct(pct(sum('approved'), sum('applications') || 0))}；累计品牌库 ${sum('brandTotal')} 项。`,
    columns: [
      COL_PROJECT,
      { prop: 'brandTotal', label: '品牌总数', unit: '项', width: 92, align: 'center' },
      { prop: 'applications', label: '报审合计', unit: '项', width: 92, align: 'center' },
      { prop: 'approving', label: '审批中', unit: '项', width: 84, align: 'center' },
      { prop: 'approved', label: '已通过', unit: '项', width: 84, align: 'center' },
      { prop: 'rejected', label: '已驳回', unit: '项', width: 84, align: 'center' },
      { prop: 'firstPassRate', label: '一次通过率', unit: '%', width: 116, align: 'center', format: 'pct' },
    ],
    rows,
    totals: { project: '合计', brandTotal: sum('brandTotal'), applications: sum('applications'), approving: sum('approving'), approved: sum('approved'), rejected: sum('rejected'), firstPassRate: pct(sum('approved'), sum('applications')) },
  }
}

/* ---------- 4.4 材料设备进场 ---------- */

function buildQmMat(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const seed = seededRandom(weekKey, index, 'qmMat')
    const matIn = pick(seededRandom(weekKey, index, 'matIn'), 0, 4)
    const eqIn = pick(seededRandom(weekKey, index, 'eqIn'), 0, 2)
    const total = matIn + eqIn
    const matOut = Math.max(0, Math.round(matIn * 0.25))
    const eqOut = Math.max(0, Math.round(eqIn * 0.25))
    const rejected = total ? Math.max(0, Math.round((1 - TIER_FACTOR[project.tier]) * 2 * seed)) : 0
    const approving = total ? Math.max(0, Math.round(total * 0.25)) : 0
    const approved = Math.max(0, total - rejected - approving)
    return {
      project: project.name,
      total,
      matIn,
      matOut,
      eqIn,
      eqOut,
      approving,
      approved,
      rejected,
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'qmMat',
    chapter: '四、质量管理',
    title: '4.4 材料设备进场',
    summary:
      `本周进场 ${sum('total')} 批（材料 ${sum('matIn')} 批、设备 ${sum('eqIn')} 批）、退场 ${sum('matOut') + sum('eqOut')} 批；` +
      `审批中 ${sum('approving')}、已通过 ${sum('approved')}、已驳回 ${sum('rejected')}。`,
    columns: [
      COL_PROJECT,
      { prop: 'total', label: '进场合计', unit: '批', width: 92, align: 'center' },
      { prop: 'matIn', label: '材料进场', unit: '批', width: 92, align: 'center' },
      { prop: 'matOut', label: '材料退场', unit: '批', width: 92, align: 'center' },
      { prop: 'eqIn', label: '设备进场', unit: '批', width: 92, align: 'center' },
      { prop: 'eqOut', label: '设备退场', unit: '批', width: 92, align: 'center' },
      { prop: 'approving', label: '审批中', unit: '批', width: 84, align: 'center' },
      { prop: 'approved', label: '已通过', unit: '批', width: 84, align: 'center' },
      { prop: 'rejected', label: '已驳回', unit: '批', width: 84, align: 'center' },
    ],
    rows,
    totals: { project: '合计', total: sum('total'), matIn: sum('matIn'), matOut: sum('matOut'), eqIn: sum('eqIn'), eqOut: sum('eqOut'), approving: sum('approving'), approved: sum('approved'), rejected: sum('rejected') },
  }
}

/* ---------- 4.5 实模一致验收 ---------- */

function buildQmAsbuilt(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const seed = seededRandom(weekKey, index, 'qmAsbuilt')
    const count = pick(seed, 0, 2)
    const rejected = count ? Math.max(0, Math.round((1 - TIER_FACTOR[project.tier]) * 2 * seed)) : 0
    const approved = Math.max(0, count - rejected)
    const failPoints = rejected
      ? `${QUALITY_TITLES[(index + 2) % QUALITY_TITLES.length]}；构件位置偏差需复核`
      : '--'
    return {
      project: project.name,
      count,
      approved,
      rejected,
      rate: pct(approved, count),
      failPoints,
    }
  })
  const sum = (key) => rows.reduce((total, row) => total + (row[key] || 0), 0)
  return {
    key: 'qmAsbuilt',
    chapter: '四、质量管理',
    title: '4.5 实模一致验收',
    summary:
      `本周实模一致验收 ${sum('count')} 项：通过 ${sum('approved')} 项、未通过 ${sum('rejected')} 项，通过率 ${fmtPct(pct(sum('approved'), sum('count')))}。`,
    columns: [
      COL_PROJECT,
      { prop: 'count', label: '验收数', unit: '项', width: 84, align: 'center' },
      { prop: 'approved', label: '已通过', unit: '项', width: 84, align: 'center' },
      { prop: 'rejected', label: '未通过', unit: '项', width: 84, align: 'center' },
      { prop: 'rate', label: '通过率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'failPoints', label: '未通过要点', minWidth: 240, detail: true },
    ],
    rows,
    totals: { project: '合计', count: sum('count'), approved: sum('approved'), rejected: sum('rejected'), rate: pct(sum('approved'), sum('count')), failPoints: '—' },
  }
}

/* ---------- 5.1 项目运行画像（红黑榜） ---------- */

function buildOverviewProject(sections) {
  const taskRows = sections.safetyTask?.rows || []
  const hazardRows = sections.safetyHazard?.rows || []
  const dangerRows = sections.cocDangerWork?.rows || []
  const rows = (sections.safetyHazard?.rows || []).map((row) => {
    const task = taskRows.find((item) => item.project === row.project)
    const danger = dangerRows.find((item) => item.project === row.project)
    const score = (row.rate ?? 0) * 0.5 + (task?.rate ?? 0) * 0.3 + (danger?.rate ?? 0) * 0.2
    return {
      project: row.project,
      score,
      closeRate: row.rate,
      taskRate: task?.rate ?? null,
      reportRate: danger?.rate ?? null,
      overdue: row.overdue,
    }
  })
  const sorted = [...rows].sort((a, b) => b.score - a.score)
  const red = sorted.slice(0, 2)
  const black = sorted.slice(-2).filter((row) => row.score < 75)
  const tableRows = [
    ...red.map((row) => ({
      project: row.project,
      mark: '红榜',
      highlight: `闭环率 ${fmtPct(row.closeRate)}、任务完成率 ${fmtPct(row.taskRate)}，本周无重大逾期`,
      closeRate: row.closeRate,
      taskRate: row.taskRate,
      reportRate: row.reportRate,
    })),
    ...black.map((row) => ({
      project: row.project,
      mark: '黑榜',
      highlight: `逾期 ${row.overdue} 条、任务完成率 ${fmtPct(row.taskRate)}，需下周重点督办`,
      closeRate: row.closeRate,
      taskRate: row.taskRate,
      reportRate: row.reportRate,
    })),
  ]
  return {
    key: 'overviewProject',
    chapter: '五、综合运行',
    title: '5.1 项目运行画像（红黑榜）',
    summary:
      `本周红榜 ${red.length} 个项目、黑榜 ${black.length} 个项目；评选依据：隐患闭环率（权重 50%）＋巡检任务完成率（30%）＋` +
      `危险作业上报率（20%），黑榜取综合表现末位且低于 75 分的项目。`,
    columns: [
      { prop: 'project', label: '项目', minWidth: 132 },
      { prop: 'mark', label: '标记', width: 88, align: 'center' },
      { prop: 'highlight', label: '主要亮点／问题', minWidth: 300, detail: true },
      { prop: 'closeRate', label: '隐患闭环率', unit: '%', width: 108, align: 'center', format: 'pct' },
      { prop: 'taskRate', label: '任务完成率', unit: '%', width: 108, align: 'center', format: 'pct' },
      { prop: 'reportRate', label: '危险作业上报率', unit: '%', width: 128, align: 'center', format: 'pct' },
    ],
    rows: tableRows,
  }
}

/* ---------- 5.2 应报未报项目清单 ---------- */

function buildPlatformGap(sections) {
  const rows = []
  const dangerRows = sections.cocDangerWork?.rows || []
  const taskRows = sections.safetyTask?.rows || []
  const hazardRows = sections.safetyHazard?.rows || []
  const qmRows = sections.qmIssue?.rows || []
  DEMO_PROJECTS.forEach((project, index) => {
    const modules = []
    const danger = dangerRows.find((row) => row.project === project.name)
    const task = taskRows.find((row) => row.project === project.name)
    const hazard = hazardRows.find((row) => row.project === project.name)
    const qm = qmRows.find((row) => row.project === project.name)
    if (danger && danger.actualDays < danger.shouldDays) modules.push('每日施工作业')
    if (task && task.created === 0) modules.push('巡检任务')
    if (hazard && hazard.created === 0) modules.push('隐患报送')
    if (qm && qm.created === 0) modules.push('质量问题')
    if (!modules.length) return
    const seed = seededRandom('gap', index, 'days')
    rows.push({
      project: project.name,
      modules: modules.join('、'),
      days: pick(seed, 1, 4),
      impact: '影响上报率、任务完成率、整改率等指标口径',
    })
  })
  return {
    key: 'platformGap',
    chapter: '五、综合运行',
    title: '5.2 应报未报项目清单',
    summary:
      `本周 ${rows.length} 个项目存在应报未报，涉及每日施工作业、巡检任务、隐患报送、质量问题等模块；` +
      `应报未报直接影响相关指标的可比性，建议纳入下周督办。`,
    columns: [
      { prop: 'project', label: '项目', minWidth: 132 },
      { prop: 'modules', label: '未报模块', minWidth: 240, detail: true },
      { prop: 'days', label: '未报天数', unit: '天', width: 100, align: 'center' },
      { prop: 'impact', label: '对指标的影响', minWidth: 260, detail: true },
    ],
    rows,
  }
}

/* ---------- 5.3 下周关注事项 ---------- */

function buildNextWatch(sections) {
  const rows = []
  const overdueRows = sections.safetyOverdue?.rows || []
  const gapSection = sections.platformGap
  overdueRows.slice(0, 4).forEach((row) => {
    rows.push({ item: `督办逾期隐患：${row.title}`, project: row.project, basis: `已逾期 ${row.overdueDays} 天` })
  })
  ;(gapSection?.rows || []).slice(0, 2).forEach((row) => {
    rows.push({ item: `跟进应报未报：${row.modules}`, project: row.project, basis: `连续 ${row.days} 天未报` })
  })
  rows.push({ item: '核对下周值班表排班完整性', project: '全部项目', basis: '值班表需 7 天 × 4 槽位排满' })
  return {
    key: 'nextWatch',
    chapter: '五、综合运行',
    title: '5.3 下周关注事项',
    summary: `根据本周逾期、未上报情况自动生成关注事项 ${rows.length} 条，供周会逐项落实。`,
    columns: [
      { prop: 'seq', label: '序号', width: 64, align: 'center' },
      { prop: 'item', label: '关注事项', minWidth: 300, detail: true },
      { prop: 'project', label: '项目', minWidth: 132 },
      { prop: 'basis', label: '依据', minWidth: 200 },
    ],
    rows: rows.map((row, index) => ({ seq: index + 1, ...row })),
  }
}

/* ------------------------------------------------------------------ *
 * 5. 演示周报组装
 * ------------------------------------------------------------------ */

function buildOverview(sections, weekInfo, prevOverview) {
  const meeting = sections.cocMeeting
  const danger = sections.cocDangerWork
  const hazard = sections.cocHazard
  const safetyHazard = sections.safetyHazard
  const safetyTask = sections.safetyTask
  const qmIssue = sections.qmIssue
  const gap = sections.platformGap

  const totalHazard = (hazard.totals?.total || 0) + (qmIssue.totals?.created || 0)
  const closedHazard = (hazard.totals?.closed || 0) + (safetyHazard.totals?.closed || 0)
  const createdHazard = (hazard.totals?.total || 0) + (safetyHazard.totals?.created || 0)

  const cards = [
    { key: 'meetings', value: meeting.extra?.meetings?.length || 0 },
    { key: 'coverage', value: meeting.extra?.coverage || 0, extra: `／在建 ${DEMO_PROJECTS.length} 个` },
    { key: 'attendRate', value: meeting.totals?.rate ?? null },
    { key: 'reportRate', value: danger.totals?.rate ?? null },
    { key: 'newHazard', value: totalHazard },
    { key: 'closeRate', value: pct(closedHazard, createdHazard || (hazard.totals?.total || 0) + (safetyHazard.totals?.created || 0)) },
    { key: 'taskRate', value: safetyTask.totals?.rate ?? null },
    { key: 'overdueHazard', value: (safetyHazard.totals?.overdue || 0) + (sections.cocHazard.totals?.overdue || 0) },
    { key: 'qmRectifyRate', value: qmIssue.totals?.rate ?? null },
    { key: 'gapProjects', value: gap?.rows?.length || 0 },
  ].map((card) => {
    const meta = OVERVIEW_CARDS.find((item) => item.key === card.key) || {}
    const prevValue = prevOverview?.cards?.find((item) => item.key === card.key)?.value ?? null
    let delta = null
    if (typeof card.value === 'number' && typeof prevValue === 'number') {
      delta = Math.round((card.value - prevValue) * 10) / 10
    }
    return { ...meta, value: card.value, extra: card.extra || '', prevValue, delta }
  })

  return {
    title: '一、本周概览',
    summary:
      `本周（${weekInfo.rangeLabel}）共开展调度 ${meeting.extra?.meetings?.length || 0} 次、覆盖 ${meeting.extra?.coverage || 0} 个在建项目；` +
      `新增隐患 ${totalHazard} 条、闭环率 ${fmtPct(pct(closedHazard, createdHazard))}；巡检任务完成率 ${fmtPct(safetyTask.totals?.rate)}；` +
      `质量问题整改率 ${fmtPct(qmIssue.totals?.rate)}；${(safetyHazard.totals?.overdue || 0)} 条隐患逾期未闭环，` +
      `${gap?.rows?.length || 0} 个项目存在应报未报。`,
    cards,
    warnRows: (gap?.rows || []).map((row) => ({
      project: row.project,
      type: row.modules.includes('每日施工作业') ? '应报未报' : '数据缺失',
      count: row.days,
      detail: `${row.modules} 未报 ${row.days} 天`,
    })),
  }
}

/**
 * 构建演示周报快照
 * @param {string} weekKey 2026-W44
 * @returns {object} 周报快照
 */
export function buildDemoWeeklyReport(weekKey) {
  const weekInfo = weekOfKey(weekKey)
  const sections = {}
  sections.cocMeeting = buildCocMeeting(weekKey)
  sections.cocDangerWork = buildCocDangerWork(weekKey)
  sections.cocHazard = buildCocHazard(weekKey)
  sections.cocSampling = buildCocSampling(weekKey)
  sections.safetyTask = buildSafetyTask(weekKey)
  sections.safetyHazard = buildSafetyHazard(weekKey)
  sections.safetyRank = buildRankSection({
    key: 'safetyRank',
    chapter: '三、安全管理',
    title: '3.3 项目排名（隐患整改率）',
    sourceSection: sections.safetyHazard,
    rateLabel: '隐患整改率',
  })
  sections.safetyOverdue = buildSafetyOverdue(weekKey, sections.safetyHazard)
  sections.qmIssue = buildQmIssue(weekKey)
  sections.qmInspect = buildQmInspect(weekKey)
  sections.qmBrand = buildQmBrand(weekKey)
  sections.qmMat = buildQmMat(weekKey)
  sections.qmAsbuilt = buildQmAsbuilt(weekKey)
  sections.qmRank = buildRankSection({
    key: 'qmRank',
    chapter: '四、质量管理',
    title: '4.6 项目排名（质量问题整改率）',
    sourceSection: sections.qmIssue,
    rateLabel: '质量问题整改率',
  })
  sections.overviewProject = buildOverviewProject(sections)
  sections.platformGap = buildPlatformGap(sections)
  sections.nextWatch = buildNextWatch(sections)

  const prevWeekInfo = previousWeekInfo(weekInfo.weekStart)
  const prev = isDemoWeek(prevWeekInfo.weekKey) ? buildDemoSectionsOnly(prevWeekInfo.weekKey) : null
  const overview = buildOverview(sections, weekInfo, prev?.overview)

  return {
    id: `wkr-${weekKey}`,
    weekKey,
    weekStart: weekInfo.weekStart,
    weekEnd: weekInfo.weekEnd,
    weekLabel: weekInfo.label,
    rangeLabel: weekInfo.rangeLabel,
    status: 'frozen',
    version: 1,
    isDemo: true,
    generatedAt: `${addDays(weekInfo.weekEnd, 1)} 08:00`,
    generatedBy: '系统自动生成',
    projectCount: DEMO_PROJECTS.length,
    overview,
    sections,
    appendix: METRIC_APPENDIX,
    prevWeekId: prev ? `wkr-${prevWeekInfo.weekKey}` : '',
  }
}

/** 只构建 sections（供环比取值用，避免递归构建整份周报） */
function buildDemoSectionsOnly(weekKey) {
  const sections = {}
  sections.cocMeeting = buildCocMeeting(weekKey)
  sections.cocDangerWork = buildCocDangerWork(weekKey)
  sections.cocHazard = buildCocHazard(weekKey)
  sections.cocSampling = buildCocSampling(weekKey)
  sections.safetyTask = buildSafetyTask(weekKey)
  sections.safetyHazard = buildSafetyHazard(weekKey)
  sections.qmIssue = buildQmIssue(weekKey)
  sections.platformGap = buildPlatformGap(sections)
  const weekInfo = weekOfKey(weekKey)
  return { overview: buildOverview(sections, weekInfo, null) }
}

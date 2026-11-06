/**
 * 数字周报 · 指标定义与演示数据
 *
 * 口径来源：调研记录/10、数字周报/数字周报_需求要点_v2.md
 * 结构约定：每章统一 { key, chapter, title, summary, columns, rows, totals }
 *   - summary 为「总体说明」文案（总）
 *   - columns + rows 为「分项目统计表」（分），列内可含要点明细（detail: true）
 *
 * 章节构成（2026-11-04 用户调整）：
 *   一、本周概览（COC 调度 / 安质巡检 / 质量 三组指标卡）
 *   二、COC 调度：危险作业上报、值班表登记、监理例会登记、会议记录统计、调度隐患统计、隐患抽检统计
 *   三、安质巡检：巡检任务（含自行登记）、隐患整改（含整改率排名）
 *   四、质量：质量验评、品牌报审、材料设备进场
 *   五、下周关注事项
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
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDayNr = (firstThursday.getDay() + 6) % 7
  const firstThursdayYmd = new Date(firstThursday.getTime() - firstDayNr * DAY + 3 * DAY)
  const weekNo = 1 + Math.round((target.getTime() - firstThursdayYmd.getTime()) / (7 * DAY))
  return { year: target.getFullYear(), weekNo }
}

/** 周信息：{ weekKey, weekStart, weekEnd, year, weekNo, label, rangeLabel } */
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

/** 值班表槽位：白班/夜班 × 施工/监理 */
export const DUTY_SLOTS = [
  { key: 'constructionDay', label: '白班-施工' },
  { key: 'supervisionDay', label: '白班-监理' },
  { key: 'constructionNight', label: '夜班-施工' },
  { key: 'supervisionNight', label: '夜班-监理' },
]

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

const TASK_TITLES = [
  '高处作业安全与质量检查',
  '防台防汛专项检查',
  '临时用电专项检查',
  '脚手架专项检查',
  '动火作业旁站检查',
  '基坑支护日常巡查',
  '起重吊装作业检查',
]

/** 逾期隐患清单列定义（2.5 调度隐患、3.2 隐患整改共用；真实台账取数同样复用） */
export const OVERDUE_HAZARD_COLUMNS = [
  { prop: 'seq', label: '序号', width: 64, align: 'center' },
  { prop: 'project', label: '项目', minWidth: 132 },
  { prop: 'hazardNo', label: '隐患编号', width: 132 },
  { prop: 'title', label: '隐患描述', minWidth: 240, detail: true },
  { prop: 'category', label: '类型', width: 84, align: 'center' },
  { prop: 'level', label: '等级', width: 84, align: 'center' },
  { prop: 'source', label: '来源', width: 112, align: 'center' },
  { prop: 'deadline', label: '整改期限', width: 116, align: 'center' },
  { prop: 'overdueDays', label: '逾期天数', unit: '天', width: 100, align: 'center' },
  { prop: 'status', label: '当前状态', width: 104, align: 'center' },
]

/** 演示：把分项目逾期汇总展开为逾期隐患明细清单（按逾期天数降序） */
export function buildOverdueHazardList(weekKey, rows, options = {}) {
  const { prefix = 'YH', sources = ['调度隐患'] } = options
  const weekInfo = weekOfKey(weekKey)
  const list = []
  let counter = 0
  rows.forEach((row, rowIndex) => {
    const overdue = Math.max(0, Number(row.overdue) || 0)
    for (let i = 0; i < overdue; i += 1) {
      counter += 1
      const seed = seededRandom(weekKey, rowIndex * 5 + i, `overdue-${prefix}`)
      const levelSeed = seededRandom(weekKey, rowIndex * 5 + i, `level-${prefix}`)
      const overdueDays = 1 + Math.round(seed * 12)
      list.push({
        project: row.project,
        hazardNo: `${prefix}-2026-${String(100 + counter).padStart(4, '0')}`,
        title: HAZARD_TITLES[(rowIndex + i * 3) % HAZARD_TITLES.length],
        category: seed > 0.7 ? '质量' : '安全',
        level: levelSeed > 0.9 ? '重大' : levelSeed > 0.65 ? '较大' : '一般',
        source: sources[(rowIndex + i) % sources.length],
        deadline: addDays(weekInfo.weekEnd, -overdueDays),
        overdueDays,
        status: ['待整改', '待验收', '待复查'][(rowIndex + i) % 3],
      })
    }
  })
  return list.sort((a, b) => b.overdueDays - a.overdueDays).map((row, index) => ({ seq: index + 1, ...row }))
}

/* ------------------------------------------------------------------ *
 * 3.5 章节图表数据（折线图 / 环形图；页面渲染与 Word 导出共用）
 * ------------------------------------------------------------------ */

/** 图表：隐患等级分布（环形图，2.5 调度隐患统计使用） */
export function buildHazardLevelChart(rows) {
  const data = [
    { name: '一般', value: sumOf(rows, 'low') },
    { name: '较大', value: sumOf(rows, 'mid') },
    { name: '重大', value: sumOf(rows, 'high') },
  ].filter((item) => item.value > 0)
  return {
    key: 'hazardLevel',
    type: 'donut',
    title: '本周隐患等级分布',
    unit: '条',
    data: data.length ? data : [{ name: '无隐患', value: 0 }],
  }
}

/** 图表：隐患整改状态分布（环形图，3.2 隐患整改使用） */
export function buildRectifyStatusChart(rows) {
  const data = [
    { name: '待整改', value: sumOf(rows, 'pendingFix') },
    { name: '待验收', value: sumOf(rows, 'pendingReview') },
    { name: '待复查', value: sumOf(rows, 'reviewed') },
    { name: '已关闭', value: sumOf(rows, 'closed') },
  ].filter((item) => item.value > 0)
  return {
    key: 'rectifyStatus',
    type: 'donut',
    title: '本周隐患整改状态分布',
    unit: '条',
    data: data.length ? data : [{ name: '无隐患', value: 0 }],
  }
}

/**
 * 图表：近 6 周隐患新增与闭环趋势（折线图，3.2 隐患整改使用）
 * @param {string} weekKey 目标周
 * @param {{ history?: Array<{label,created,closed}>, created?: number, closed?: number }} options
 *   - 传 history（含本周）时按实际数据绘制（真实台账）；
 *   - 不传时：本周用 created/closed，前 5 周用数据工厂生成（演示周）。
 */
export function buildHazardTrendChart(weekKey, options = {}) {
  const { history = null, created = 0, closed = 0 } = options
  const weekInfo = weekOfKey(weekKey)
  const categories = []
  const createdData = []
  const closedData = []
  if (Array.isArray(history) && history.length) {
    history.forEach((item) => {
      categories.push(item.label || '--')
      createdData.push(item.created === null || item.created === undefined ? null : Number(item.created))
      closedData.push(item.closed === null || item.closed === undefined ? null : Number(item.closed))
    })
  } else {
    for (let i = 5; i >= 0; i -= 1) {
      const info = getWeekInfo(addDays(weekInfo.weekStart, -7 * i))
      categories.push(`第 ${info.weekNo} 周`)
      if (i === 0) {
        createdData.push(Number(created) || 0)
        closedData.push(Number(closed) || 0)
      } else {
        const seed = seededRandom(weekKey, i, 'trend')
        const base = 38 + Math.round(seed * 14)
        createdData.push(base)
        closedData.push(Math.round(base * (0.68 + seed * 0.18)))
      }
    }
  }
  return {
    key: 'hazardTrend',
    type: 'line',
    title: '近 6 周隐患新增与闭环趋势',
    unit: '条',
    categories,
    series: [
      { name: '新增隐患', data: createdData },
      { name: '闭环隐患', data: closedData },
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 4. 概览指标卡（三组：COC 调度 / 安质巡检 / 质量）
 * ------------------------------------------------------------------ */

export const OVERVIEW_GROUPS = [
  {
    key: 'coc',
    title: 'COC 调度',
    cards: [
      { key: 'meetings', label: '调度场次', unit: '次', rule: '本周已结束的调度会议记录数', source: 'COC 会议记录' },
      { key: 'coverage', label: '调度覆盖项目', unit: '个', rule: '会议记录中调度项目去重数／在建项目数', source: 'COC 会议记录' },
      { key: 'attendRate', label: '值班人员参会率', unit: '%', rule: '已参会人次 ÷ 应参会人次（会议记录）', source: 'COC 会议记录' },
      { key: 'dutyRate', label: '值班表登记完整率', unit: '%', rule: '已排槽位 ÷ 应排槽位（7 天 × 4 槽位 = 28）', source: '每周值班表' },
      { key: 'meetingReportRate', label: '监理例会上报率', unit: '%', rule: '本周已上报例会次数 ÷ 应召开次数（每周每项目 1 次）', source: '监理会议管理' },
      { key: 'reportRate', label: '危险作业上报率', unit: '%', rule: '实报天数 ÷ 应报天数', source: '每日施工作业' },
    ],
  },
  {
    key: 'anzi',
    title: '安质巡检',
    cards: [
      { key: 'taskRate', label: '巡检任务完成率', unit: '%', rule: '本周完成任务 ÷ 本周任务数（任务下发＋自行登记）', source: '巡检任务' },
      { key: 'selfTaskCount', label: '自行登记任务', unit: '个', rule: '来源为「系统自建」的巡检任务数', source: '巡检任务' },
      { key: 'newHazard', label: '新增隐患', unit: '条', rule: '本周新登记隐患条数（安全＋质量）', source: '隐患清单' },
      { key: 'closeRate', label: '隐患整改率', unit: '%', rule: '已闭环 ÷ 本周新增隐患', source: '隐患清单' },
      { key: 'overdueHazard', label: '逾期未闭环隐患', unit: '条', rule: '截止日已过且未闭环的隐患数', source: '隐患清单' },
    ],
  },
  {
    key: 'quality',
    title: '质量',
    cards: [
      { key: 'qmInspectTasks', label: '验收任务数', unit: '个', rule: '本周质量验评任务数', source: '质量验评' },
      { key: 'qmPassRate', label: '验收通过率', unit: '%', rule: '已通过 ÷ 验收任务数', source: '质量验评' },
      { key: 'qmBrandCount', label: '品牌报审', unit: '项', rule: '本周品牌报审申请数', source: '品牌报审' },
      { key: 'qmMatCount', label: '材料设备进场', unit: '批', rule: '本周材料设备进场批次数', source: '材料设备进场' },
    ],
  },
]

/** 扁平化后的全部指标卡（列表摘要与导出兼容用） */
export const OVERVIEW_CARDS = OVERVIEW_GROUPS.flatMap((group) => group.cards.map((card) => ({ ...card, group: group.key, groupTitle: group.title })))

/** 附录口径说明 */
export const METRIC_APPENDIX = [
  { name: '自然周', unit: '—', rule: '周一 00:00 ~ 周日 24:00 为一个统计周；跨月周按周一所在月归属', source: '周报通用' },
  { name: '数据截止与冻结', unit: '—', rule: '统计周日 24:00 状态快照；生成后冻结，后续补录不改已生成周报；不支持重新生成', source: '周报通用' },
  { name: '跨项目汇总', unit: '—', rule: '计数类各项目相加；比率类 ∑分子 ÷ ∑分母（加权）', source: '数据大屏 §0.3' },
  { name: '空值', unit: '—', rule: '无数据或分母为 0 显示「--」，不显示 0', source: '周报通用' },
  { name: '值班表登记完整率', unit: '%', rule: '已排槽位 ÷ 应排槽位；每周 7 天 × 4 槽位（白班-施工/白班-监理/夜班-施工/夜班-监理）= 28 个槽位，任一槽位为空即未排满', source: '每周值班表' },
  { name: '监理例会上报率', unit: '%', rule: '本周已上报监理例会次数 ÷ 应召开次数；应召开＝项目数 × 1 次（每周一次）', source: '监理会议管理' },
  { name: '危险作业上报率', unit: '%', rule: '有每日施工作业记录的天数 ÷ 应报自然日天数', source: '每日施工作业' },
  { name: '自行登记任务', unit: '个', rule: '巡检任务来源为「系统自建」的任务数（项目自行发起，非指挥部下发）', source: '巡检任务' },
  { name: '隐患闭环', unit: '—', rule: '安全巡检「已关闭」计闭环；「待复查」仍算未闭环（项目经理审批中）', source: '隐患清单' },
  { name: '隐患整改率', unit: '%', rule: '已闭环数 ÷ 需整改数；与考核评分第 2 项同口径（周报为过程值，考核以考核模块固化结果为准）', source: '考核评分十项指标' },
  { name: '逾期', unit: '—', rule: '有整改期限且未闭环、截止日早于统计截止日即逾期；无期限单列「无期限」不计入逾期', source: '隐患清单' },
  { name: '验收通过率', unit: '%', rule: '已通过 ÷ 验收任务数（原型演示按通过率展示；接正式数据后可按「重新申报来源为空」计算一次性通过率）', source: '质量验评看板' },
]

const COL_PROJECT = { prop: 'project', label: '项目', minWidth: 132 }

function pct(numerator, denominator) {
  if (!denominator) return null
  return Math.round((numerator / denominator) * 1000) / 10
}

function fmtPct(value) {
  return value === null || value === undefined ? '--' : `${value}%`
}

function sumOf(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)
}

/* ------------------------------------------------------------------ *
 * 5. 二、COC 调度
 * ------------------------------------------------------------------ */

/* ---------- 2.1 危险作业上报情况 ---------- */

function buildCocDangerWork(weekKey) {
  const weekInfo = weekOfKey(weekKey)
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
      missDates.push(addDays(weekInfo.weekStart, (index + d * 2) % 7).slice(5))
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
  const totalShould = sumOf(rows, 'shouldDays')
  const totalActual = sumOf(rows, 'actualDays')
  return {
    key: 'cocDangerWork',
    chapter: 'chapter-coc',
    title: '2.1 危险作业上报情况',
    summary:
      `本周应报 ${DEMO_PROJECTS.length} 个项目 × ${rows[0]?.shouldDays || 7} 天 = ${totalShould} 天次，实报 ${totalActual} 天次，` +
      `上报率 ${fmtPct(pct(totalActual, totalShould))}；其中危险作业 ${sumOf(rows, 'dangerCount')} 条，涉及 ${rows.filter((row) => row.dangerCount > 0).length} 个项目；` +
      `${rows.filter((row) => row.actualDays < row.shouldDays).length} 个项目存在漏报。`,
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
    totals: { project: '合计', shouldDays: totalShould, actualDays: totalActual, rate: pct(totalActual, totalShould), dangerCount: sumOf(rows, 'dangerCount'), mainTypes: '—', missDates: '—', remark: '—' },
  }
}

/* ---------- 2.2 值班表登记情况 ---------- */

function buildCocDuty(weekKey) {
  const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'duty')
    const shouldSlots = 7 * DUTY_SLOTS.length
    const missingDays = Math.max(0, Math.round((1 - tierFactor) * 4 * (0.2 + seed)))
    const filledDays = 7 - Math.min(3, missingDays)
    const filledSlots = filledDays * DUTY_SLOTS.length
    const missingSlotLabels = []
    if (filledDays < 7) {
      const missingCount = 7 - filledDays
      for (let i = 0; i < missingCount; i += 1) {
        const dayIndex = (index + i * 2) % 7
        const slot = DUTY_SLOTS[(index + i) % DUTY_SLOTS.length]
        missingSlotLabels.push(`${weekdayLabels[dayIndex]} ${slot.label}`)
      }
    }
    return {
      project: project.name,
      shouldSlots,
      filledSlots,
      rate: pct(filledSlots, shouldSlots),
      filledDays,
      personTotal: filledDays * 3 + (index % 2),
      status: filledDays === 7 ? '已排满' : `缺 ${7 - filledDays} 天`,
      missingSlots: missingSlotLabels.length ? missingSlotLabels.join('、') : '--',
    }
  })
  const totalShould = sumOf(rows, 'shouldSlots')
  const totalFilled = sumOf(rows, 'filledSlots')
  return {
    key: 'cocDuty',
    chapter: 'chapter-coc',
    title: '2.2 值班表登记情况',
    summary:
      `本周应排 ${DEMO_PROJECTS.length} 张周表、共 ${totalShould} 个槽位（7 天 × 4 槽位），已排 ${totalFilled} 个，` +
      `登记完整率 ${fmtPct(pct(totalFilled, totalShould))}；${rows.filter((row) => row.filledDays === 7).length} 个项目排满，` +
      `${rows.filter((row) => row.filledDays < 7).length} 个项目存在缺排。`,
    columns: [
      COL_PROJECT,
      { prop: 'shouldSlots', label: '应排槽位', unit: '个', width: 96, align: 'center' },
      { prop: 'filledSlots', label: '已排槽位', unit: '个', width: 96, align: 'center' },
      { prop: 'rate', label: '完整率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'filledDays', label: '排班天数', unit: '天', width: 96, align: 'center' },
      { prop: 'personTotal', label: '值班人次', unit: '人次', width: 96, align: 'center' },
      { prop: 'status', label: '登记状态', width: 96, align: 'center' },
      { prop: 'missingSlots', label: '缺排槽位', minWidth: 230, detail: true },
    ],
    rows,
    totals: { project: '合计', shouldSlots: totalShould, filledSlots: totalFilled, rate: pct(totalFilled, totalShould), filledDays: sumOf(rows, 'filledDays'), personTotal: sumOf(rows, 'personTotal'), status: '—', missingSlots: '—' },
  }
}

/* ---------- 2.3 监理例会登记情况 ---------- */

function buildCocSupervisionMeeting(weekKey) {
  const weekInfo = weekOfKey(weekKey)
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'supervision')
    const shouldCount = 1
    const reported = seed < tierFactor + 0.05 ? 1 : 0
    const hazardParsed = reported ? Math.max(0, pick(seededRandom(weekKey, index, 'spHazard'), 1, 4)) : 0
    const meetingDate = reported ? addDays(weekInfo.weekStart, Math.floor(seed * 5)) : ''
    const minutes = reported ? (seed > 0.4 ? '已上传' : '待补传') : '--'
    return {
      project: project.name,
      shouldCount,
      reported,
      status: reported ? '已上报' : '未上报',
      meetingDate: meetingDate || '--',
      minutes,
      hazardParsed,
      remark: reported ? '纪要已归档' : '缺本周例会纪要',
    }
  })
  const reportedCount = sumOf(rows, 'reported')
  const shouldTotal = sumOf(rows, 'shouldCount')
  return {
    key: 'cocSupervisionMeeting',
    chapter: 'chapter-coc',
    title: '2.3 监理例会登记情况',
    summary:
      `本周应召开监理例会 ${shouldTotal} 次（每项目每周 1 次），已上报 ${reportedCount} 次，上报率 ${fmtPct(pct(reportedCount, shouldTotal))}；` +
      `已上报纪要中解析隐患 ${sumOf(rows, 'hazardParsed')} 条；${shouldTotal - reportedCount} 个项目未上报。`,
    columns: [
      COL_PROJECT,
      { prop: 'shouldCount', label: '应召开', unit: '次', width: 88, align: 'center' },
      { prop: 'reported', label: '已上报', unit: '次', width: 88, align: 'center' },
      { prop: 'status', label: '上报状态', width: 92, align: 'center' },
      { prop: 'meetingDate', label: '会议日期', width: 110, align: 'center' },
      { prop: 'minutes', label: '纪要附件', width: 96, align: 'center' },
      { prop: 'hazardParsed', label: '解析隐患', unit: '条', width: 96, align: 'center' },
      { prop: 'remark', label: '备注', minWidth: 170 },
    ],
    rows,
    totals: { project: '合计', shouldCount: shouldTotal, reported: reportedCount, status: '—', meetingDate: '—', minutes: '—', hazardParsed: sumOf(rows, 'hazardParsed'), remark: '—' },
  }
}

/* ---------- 2.4 会议记录统计（调度会议签到） ---------- */

function buildCocMeeting(weekKey) {
  const weekInfo = weekOfKey(weekKey)
  const meetings = [
    { no: 1, date: addDays(weekInfo.weekStart, 0), projectCount: 8 },
    { no: 2, date: addDays(weekInfo.weekStart, 2), projectCount: 5 },
    { no: 3, date: addDays(weekInfo.weekStart, 4), projectCount: 3 },
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
    return {
      project: project.name,
      dispatched,
      shouldAttend,
      joined,
      absent,
      rate: pct(joined, shouldAttend),
      absentNames: absentNames.length ? absentNames.join('、') : '--',
      dutyStatus: dispatched === 0 ? '未覆盖' : seed > 0.78 ? '缺 1 天' : seed > 0.62 ? '缺 2 天' : '已排满',
    }
  })
  const totalShould = sumOf(rows, 'shouldAttend')
  const totalJoined = sumOf(rows, 'joined')
  const totalAbsent = sumOf(rows, 'absent')
  const coverage = rows.filter((row) => row.dispatched > 0).length
  return {
    key: 'cocMeeting',
    chapter: 'chapter-coc',
    title: '2.4 会议记录统计',
    summary:
      `本周开展调度会议 ${meetings.length} 场，覆盖项目 ${coverage} 个／在建 ${DEMO_PROJECTS.length} 个（覆盖率 ` +
      `${fmtPct(pct(coverage, DEMO_PROJECTS.length))}）；应参会 ${totalShould} 人次、已参会 ${totalJoined} 人次、` +
      `未参会 ${totalAbsent} 人次，参会率 ${fmtPct(pct(totalJoined, totalShould))}。`,
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
    totals: { project: '合计', dispatched: sumOf(rows, 'dispatched'), shouldAttend: totalShould, joined: totalJoined, absent: totalAbsent, rate: pct(totalJoined, totalShould), absentNames: '—', dutyStatus: '—' },
    extra: { meetings, coverage },
  }
}

/* ---------- 2.5 调度隐患统计 ---------- */

function buildCocHazard(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const seed = seededRandom(weekKey, index, 'hazard')
    const dispatchSrc = Math.max(0, pick(seed, 0, 4))
    const supervisionSrc = Math.max(0, pick(seededRandom(weekKey, index, 'supervision'), 0, 3))
    const total = dispatchSrc + supervisionSrc
    const quality = Math.max(0, Math.min(total, Math.round(total * (0.2 + seed * 0.3))))
    const safety = total - quality
    const high = total ? Math.max(0, pick(seededRandom(weekKey, index, 'high'), 0, 1)) : 0
    const mid = total ? Math.max(0, pick(seededRandom(weekKey, index, 'mid'), 0, 2)) : 0
    const low = Math.max(0, total - high - mid)
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const closed = Math.max(0, Math.min(total, Math.round(total * (0.35 + tierFactor * 0.4))))
    const open = total - closed
    const overdue = Math.min(open, Math.max(0, pick(seededRandom(weekKey, index, 'overdue'), 0, 2)))
    const firstTitle = HAZARD_TITLES[(index + (total || 0)) % HAZARD_TITLES.length]
    const secondTitle = HAZARD_TITLES[(index + 3) % HAZARD_TITLES.length]
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
      mainHazards: total ? [firstTitle, ...(total > 2 ? [secondTitle] : [])].join('；') : '--',
    }
  })
  const overdueList = buildOverdueHazardList(weekKey, rows, { prefix: 'DD', sources: ['调度隐患', '监理会议'] })
  const levelChart = buildHazardLevelChart(rows)

  return {
    key: 'cocHazard',
    chapter: 'chapter-coc',
    title: '2.5 调度隐患统计',
    summary:
      `本周调度过程新增隐患 ${sumOf(rows, 'total')} 条，按来源：调度隐患 ${sumOf(rows, 'dispatchSrc')} 条、监理会议 ${sumOf(rows, 'supervisionSrc')} 条；` +
      `按类型：安全 ${sumOf(rows, 'safety')} 条、质量 ${sumOf(rows, 'quality')} 条；按等级：一般 ${sumOf(rows, 'low')}、较大 ${sumOf(rows, 'mid')}、重大 ${sumOf(rows, 'high')}；` +
      `已闭环 ${sumOf(rows, 'closed')} 条、未闭环 ${sumOf(rows, 'open')} 条、逾期 ${sumOf(rows, 'overdue')} 条。`,
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
    ],
    rows,
    totals: {
      project: '合计',
      total: sumOf(rows, 'total'),
      dispatchSrc: sumOf(rows, 'dispatchSrc'),
      supervisionSrc: sumOf(rows, 'supervisionSrc'),
      safety: sumOf(rows, 'safety'),
      quality: sumOf(rows, 'quality'),
      low: sumOf(rows, 'low'),
      mid: sumOf(rows, 'mid'),
      high: sumOf(rows, 'high'),
      closed: sumOf(rows, 'closed'),
      open: sumOf(rows, 'open'),
      overdue: sumOf(rows, 'overdue'),
      mainHazards: '—',
    },
    extraTables: [
      {
        title: '逾期隐患清单',
        summary: `截至统计截止日，调度过程中发现的逾期未闭环隐患 ${overdueList.length} 条，按逾期天数降序排列，需在调度会逐条督办。`,
        columns: OVERDUE_HAZARD_COLUMNS,
        rows: overdueList,
      },
    ],
    charts: [levelChart],
  }
}

/* ---------- 2.6 隐患抽检统计 ---------- */

function buildCocSampling(weekKey) {
  // 演示编排：确保「指挥部抽检 → 下发监理抽检任务 → 下发项目全面复查任务」三阶段都有数据
  const HQ_SAMPLED = [0, 1, 2, 3, 4, 6] // 被指挥部抽检的项目序号
  const HQ_FAILED = [0, 2, 4] // 指挥部抽检出现不合格的项目
  const SUPERVISOR_TASKED = [0, 2] // 下发监理抽检任务的项目
  const REVIEW_TASKED = [0, 2] // 下发项目全面复查任务的项目
  const REVIEW_DONE = [0] // 复查已完成的项目（其余为未完成）
  const rows = DEMO_PROJECTS.map((project, index) => {
    const seed = seededRandom(weekKey, index, 'sampling')
    // ① 指挥部抽检
    const hqCount = HQ_SAMPLED.includes(index) ? pick(seededRandom(weekKey, index, 'hqCount'), 4, 8) : 0
    const hqFail = HQ_FAILED.includes(index) ? Math.max(1, Math.min(hqCount, pick(seed, 1, 2))) : 0
    const hqPass = Math.max(0, hqCount - hqFail)
    // ② 下发监理抽检任务
    const supervisorTasks = SUPERVISOR_TASKED.includes(index) ? 1 : 0
    const supervisorHazards = supervisorTasks ? pick(seededRandom(weekKey, index, 'spHazards'), 5, 9) : 0
    const supervisorFail = supervisorTasks ? Math.max(1, Math.min(supervisorHazards, pick(seed, 1, 3))) : 0
    const supervisorPending = supervisorTasks ? Math.min(supervisorHazards - supervisorFail, pick(seed, 0, 2)) : 0
    const supervisorPass = Math.max(0, supervisorHazards - supervisorFail - supervisorPending)
    // ③ 下发项目全面复查任务
    const reviewTasks = REVIEW_TASKED.includes(index) ? 1 : 0
    const reviewCompleted = reviewTasks && REVIEW_DONE.includes(index) ? 1 : 0
    return {
      project: project.name,
      hqCount,
      hqPass,
      hqFail,
      supervisorTasks,
      supervisorHazards,
      supervisorPass,
      supervisorFail,
      supervisorPending,
      reviewTasks,
      reviewCompleted,
      reviewPending: reviewTasks - reviewCompleted,
    }
  })
  const sampledProjects = rows.filter((row) => row.hqCount > 0).length
  const totals = {
    project: '合计',
    hqCount: sumOf(rows, 'hqCount'),
    hqPass: sumOf(rows, 'hqPass'),
    hqFail: sumOf(rows, 'hqFail'),
    supervisorTasks: sumOf(rows, 'supervisorTasks'),
    supervisorHazards: sumOf(rows, 'supervisorHazards'),
    supervisorPass: sumOf(rows, 'supervisorPass'),
    supervisorFail: sumOf(rows, 'supervisorFail'),
    supervisorPending: sumOf(rows, 'supervisorPending'),
    reviewTasks: sumOf(rows, 'reviewTasks'),
    reviewCompleted: sumOf(rows, 'reviewCompleted'),
    reviewPending: sumOf(rows, 'reviewPending'),
  }
  return {
    key: 'cocSampling',
    chapter: 'chapter-coc',
    title: '2.6 隐患抽检统计',
    summary:
      `本周指挥部抽检项目 ${sampledProjects} 个、抽检隐患 ${totals.hqCount} 条（合格 ${totals.hqPass} 条、不合格 ${totals.hqFail} 条）；` +
      `下发监理抽检任务 ${totals.supervisorTasks} 个，监理抽检隐患 ${totals.supervisorHazards} 条（合格 ${totals.supervisorPass} 条、` +
      `不合格 ${totals.supervisorFail} 条、未抽检 ${totals.supervisorPending} 条）；` +
      `下发项目全面复查任务 ${totals.reviewTasks} 个（已完成 ${totals.reviewCompleted} 个、未完成 ${totals.reviewPending} 个）。`,
    extra: { sampledProjects },
    columns: [
      COL_PROJECT,
      { prop: 'hqCount', label: '指挥部抽检', unit: '条', width: 108, align: 'center' },
      { prop: 'hqPass', label: '合格', unit: '条', width: 76, align: 'center' },
      { prop: 'hqFail', label: '不合格', unit: '条', width: 84, align: 'center' },
      { prop: 'supervisorTasks', label: '监理抽检任务', unit: '个', width: 116, align: 'center' },
      { prop: 'supervisorHazards', label: '监理抽检隐患', unit: '条', width: 120, align: 'center' },
      { prop: 'supervisorPass', label: '合格', unit: '条', width: 76, align: 'center' },
      { prop: 'supervisorFail', label: '不合格', unit: '条', width: 84, align: 'center' },
      { prop: 'supervisorPending', label: '未抽检', unit: '条', width: 84, align: 'center' },
      { prop: 'reviewTasks', label: '全面复查任务', unit: '个', width: 116, align: 'center' },
      { prop: 'reviewCompleted', label: '已完成', unit: '个', width: 84, align: 'center' },
      { prop: 'reviewPending', label: '未完成', unit: '个', width: 84, align: 'center' },
    ],
    rows,
    totals,
  }
}

/* ------------------------------------------------------------------ *
 * 6. 三、安质巡检
 * ------------------------------------------------------------------ */

/* ---------- 3.1 巡检任务（任务下发 + 自行登记） ---------- */

function buildAnziTask(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'task')
    const dispatched = pick(seed, 2, 5)
    const selfCreated = pick(seededRandom(weekKey, index, 'selfTask'), 0, 3)
    const created = dispatched + selfCreated
    const done = Math.max(1, Math.min(created, Math.round(created * (0.6 + tierFactor * 0.35))))
    const withHazard = Math.max(0, Math.min(done, Math.round(done * (0.2 + seed * 0.3))))
    const overdue = Math.max(0, created - done > 0 ? Math.min(created - done, Math.round((1 - tierFactor) * 3)) : 0)
    const maxOverdueDays = overdue ? pick(seededRandom(weekKey, index, 'od'), 1, 6) : 0
    return {
      project: project.name,
      dispatched,
      selfCreated,
      created,
      done,
      rate: pct(done, created),
      selfRate: pct(selfCreated, created),
      withHazard,
      overdue,
      maxOverdueDays,
      overdueNames: overdue ? TASK_TITLES.slice(index % 4, (index % 4) + Math.min(overdue, 2)).join('、') : '--',
    }
  })
  return {
    key: 'anziTask',
    chapter: 'chapter-anzi',
    title: '3.1 巡检任务',
    summary:
      `本周巡检任务 ${sumOf(rows, 'created')} 个（指挥部下发 ${sumOf(rows, 'dispatched')} 个、项目自行登记 ${sumOf(rows, 'selfCreated')} 个），` +
      `完成 ${sumOf(rows, 'done')} 个（完成率 ${fmtPct(pct(sumOf(rows, 'done'), sumOf(rows, 'created')))}）；` +
      `有隐患任务 ${sumOf(rows, 'withHazard')} 个、逾期任务 ${sumOf(rows, 'overdue')} 个（最长逾期 ${Math.max(...rows.map((row) => row.maxOverdueDays), 0)} 天）。`,
    columns: [
      COL_PROJECT,
      { prop: 'dispatched', label: '任务下发', unit: '个', width: 88, align: 'center' },
      { prop: 'selfCreated', label: '自行登记', unit: '个', width: 88, align: 'center' },
      { prop: 'created', label: '任务合计', unit: '个', width: 88, align: 'center' },
      { prop: 'done', label: '完成', unit: '个', width: 76, align: 'center' },
      { prop: 'rate', label: '完成率', unit: '%', width: 84, align: 'center', format: 'pct' },
      { prop: 'selfRate', label: '自行登记占比', unit: '%', width: 112, align: 'center', format: 'pct' },
      { prop: 'withHazard', label: '有隐患任务', unit: '个', width: 104, align: 'center' },
      { prop: 'overdue', label: '逾期任务', unit: '个', width: 92, align: 'center' },
      { prop: 'maxOverdueDays', label: '最长逾期', unit: '天', width: 92, align: 'center' },
      { prop: 'overdueNames', label: '逾期任务要点', minWidth: 200, detail: true },
    ],
    rows,
    totals: {
      project: '合计',
      dispatched: sumOf(rows, 'dispatched'),
      selfCreated: sumOf(rows, 'selfCreated'),
      created: sumOf(rows, 'created'),
      done: sumOf(rows, 'done'),
      rate: pct(sumOf(rows, 'done'), sumOf(rows, 'created')),
      selfRate: pct(sumOf(rows, 'selfCreated'), sumOf(rows, 'created')),
      withHazard: sumOf(rows, 'withHazard'),
      overdue: sumOf(rows, 'overdue'),
      maxOverdueDays: Math.max(...rows.map((row) => row.maxOverdueDays), 0),
      overdueNames: '—',
    },
  }
}

/* ---------- 3.2 隐患整改（含整改率排名合并） ---------- */

function buildAnziHazard(weekKey) {
  const rows = DEMO_PROJECTS.map((project, index) => {
    const tierFactor = TIER_FACTOR[project.tier] || 0.7
    const seed = seededRandom(weekKey, index, 'anziHazard')
    const created = pick(seed, 3, 9)
    const qualityCreated = Math.max(0, Math.min(created, Math.round(created * (0.2 + seed * 0.25))))
    const safetyCreated = created - qualityCreated
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
      safetyCreated,
      qualityCreated,
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

  // 合并排名：按整改率降序，同值并列（1、2、2、4）
  const ranked = [...rows]
    .filter((row) => row.created > 0 || row.closed > 0)
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || String(a.project).localeCompare(String(b.project), 'zh-CN'))
  let lastRate = null
  let lastRank = 0
  const rankedRows = ranked.map((row, index) => {
    const rank = lastRate !== null && row.rate === lastRate ? lastRank : index + 1
    lastRate = row.rate
    lastRank = rank
    return {
      ...row,
      rank,
      mark: row.rate === null ? '未纳入' : row.rate >= 90 ? '优' : row.rate >= 80 ? '良' : '需关注',
    }
  })

  const overdueList = buildOverdueHazardList(weekKey, rows, { prefix: 'AQ', sources: ['安质巡检'] })
  const createdTotal = sumOf(rows, 'created')
  const closedTotal = sumOf(rows, 'closed')
  const trendChart = buildHazardTrendChart(weekKey, { created: createdTotal, closed: closedTotal })
  const statusChart = buildRectifyStatusChart(rows)

  return {
    key: 'anziHazard',
    chapter: 'chapter-anzi',
    title: '3.2 隐患整改',
    summary:
      `本周发现隐患 ${sumOf(rows, 'created')} 条（安全 ${sumOf(rows, 'safetyCreated')} 条、质量 ${sumOf(rows, 'qualityCreated')} 条）、` +
      `闭环 ${sumOf(rows, 'closed')} 条（整改率 ${fmtPct(pct(sumOf(rows, 'closed'), sumOf(rows, 'created')))}）、` +
      `未闭环存量 ${sumOf(rows, 'open')} 条（待整改 ${sumOf(rows, 'pendingFix')}、待验收 ${sumOf(rows, 'pendingReview')}、待复查 ${sumOf(rows, 'reviewed')}）、` +
      `逾期 ${sumOf(rows, 'overdue')} 条；本周闭环隐患平均整改时长 ${(rows.reduce((sum, row) => sum + row.avgDays, 0) / rows.length).toFixed(1)} 天。` +
      `下表按隐患整改率降序排列并给出项目名次（同值并列、未上报不参与排名）。`,
    columns: [
      { prop: 'rank', label: '名次', width: 64, align: 'center' },
      COL_PROJECT,
      { prop: 'created', label: '新增', unit: '条', width: 72, align: 'center' },
      { prop: 'safetyCreated', label: '安全', unit: '条', width: 72, align: 'center' },
      { prop: 'qualityCreated', label: '质量', unit: '条', width: 72, align: 'center' },
      { prop: 'closed', label: '闭环', unit: '条', width: 72, align: 'center' },
      { prop: 'open', label: '未闭环', unit: '条', width: 80, align: 'center' },
      { prop: 'pendingFix', label: '待整改', unit: '条', width: 80, align: 'center' },
      { prop: 'pendingReview', label: '待验收', unit: '条', width: 80, align: 'center' },
      { prop: 'reviewed', label: '待复查', unit: '条', width: 80, align: 'center' },
      { prop: 'overdue', label: '逾期', unit: '条', width: 72, align: 'center' },
      { prop: 'rate', label: '整改率', unit: '%', width: 84, align: 'center', format: 'pct' },
      { prop: 'avgDays', label: '平均整改天数', unit: '天', width: 116, align: 'center' },
      { prop: 'mark', label: '标记', width: 84, align: 'center' },
    ],
    rows: rankedRows,
    totals: {
      project: '合计',
      created: sumOf(rows, 'created'),
      safetyCreated: sumOf(rows, 'safetyCreated'),
      qualityCreated: sumOf(rows, 'qualityCreated'),
      closed: sumOf(rows, 'closed'),
      open: sumOf(rows, 'open'),
      pendingFix: sumOf(rows, 'pendingFix'),
      pendingReview: sumOf(rows, 'pendingReview'),
      reviewed: sumOf(rows, 'reviewed'),
      overdue: sumOf(rows, 'overdue'),
      rate: pct(sumOf(rows, 'closed'), sumOf(rows, 'created')),
      avgDays: Math.round((rows.reduce((sum, row) => sum + row.avgDays, 0) / rows.length) * 10) / 10,
      mark: '—',
    },
    extraTables: [
      {
        title: '逾期隐患清单',
        summary: `截至统计截止日，安质巡检发现的逾期未闭环隐患 ${overdueList.length} 条，按逾期天数降序排列，需逐条督办整改。`,
        columns: OVERDUE_HAZARD_COLUMNS,
        rows: overdueList,
      },
    ],
    charts: [trendChart, statusChart],
  }
}

/* ------------------------------------------------------------------ *
 * 7. 四、质量
 * ------------------------------------------------------------------ */

/* ---------- 4.1 质量验评 ---------- */

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
  return {
    key: 'qmInspect',
    chapter: 'chapter-quality',
    title: '4.1 质量验评',
    summary:
      `本周验收任务 ${sumOf(rows, 'tasks')} 个：待提交 ${sumOf(rows, 'pending')}、审批中 ${sumOf(rows, 'approving')}、已通过 ${sumOf(rows, 'approved')}、已驳回 ${sumOf(rows, 'rejected')}；` +
      `通过率 ${fmtPct(pct(sumOf(rows, 'approved'), sumOf(rows, 'tasks')))}；验收节点完成率 ${fmtPct(pct(sumOf(rows, 'nodeDone'), sumOf(rows, 'nodeTotal')))}。`,
    columns: [
      COL_PROJECT,
      { prop: 'tasks', label: '任务数', unit: '个', width: 84, align: 'center' },
      { prop: 'pending', label: '待提交', unit: '个', width: 84, align: 'center' },
      { prop: 'approving', label: '审批中', unit: '个', width: 84, align: 'center' },
      { prop: 'approved', label: '已通过', unit: '个', width: 84, align: 'center' },
      { prop: 'rejected', label: '已驳回', unit: '个', width: 84, align: 'center' },
      { prop: 'firstPassRate', label: '通过率', unit: '%', width: 88, align: 'center', format: 'pct' },
      { prop: 'nodeTotal', label: '节点总数', unit: '个', width: 92, align: 'center' },
      { prop: 'nodeDone', label: '已完成节点', unit: '个', width: 108, align: 'center' },
      { prop: 'nodeRate', label: '节点完成率', unit: '%', width: 108, align: 'center', format: 'pct' },
    ],
    rows,
    totals: {
      project: '合计',
      tasks: sumOf(rows, 'tasks'),
      pending: sumOf(rows, 'pending'),
      approving: sumOf(rows, 'approving'),
      approved: sumOf(rows, 'approved'),
      rejected: sumOf(rows, 'rejected'),
      firstPassRate: pct(sumOf(rows, 'approved'), sumOf(rows, 'tasks')),
      nodeTotal: sumOf(rows, 'nodeTotal'),
      nodeDone: sumOf(rows, 'nodeDone'),
      nodeRate: pct(sumOf(rows, 'nodeDone'), sumOf(rows, 'nodeTotal')),
    },
  }
}

/* ---------- 4.2 品牌报审 ---------- */

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
  return {
    key: 'qmBrand',
    chapter: 'chapter-quality',
    title: '4.2 品牌报审',
    summary:
      `本周报审 ${sumOf(rows, 'applications')} 项：审批中 ${sumOf(rows, 'approving')}、已通过 ${sumOf(rows, 'approved')}、已驳回 ${sumOf(rows, 'rejected')}；` +
      `一次通过率 ${fmtPct(pct(sumOf(rows, 'approved'), sumOf(rows, 'applications') || 0))}；累计品牌库 ${sumOf(rows, 'brandTotal')} 项。`,
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
    totals: { project: '合计', brandTotal: sumOf(rows, 'brandTotal'), applications: sumOf(rows, 'applications'), approving: sumOf(rows, 'approving'), approved: sumOf(rows, 'approved'), rejected: sumOf(rows, 'rejected'), firstPassRate: pct(sumOf(rows, 'approved'), sumOf(rows, 'applications')) },
  }
}

/* ---------- 4.3 材料设备进场 ---------- */

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
  return {
    key: 'qmMat',
    chapter: 'chapter-quality',
    title: '4.3 材料设备进场',
    summary:
      `本周进场 ${sumOf(rows, 'total')} 批（材料 ${sumOf(rows, 'matIn')} 批、设备 ${sumOf(rows, 'eqIn')} 批）、退场 ${sumOf(rows, 'matOut') + sumOf(rows, 'eqOut')} 批；` +
      `审批中 ${sumOf(rows, 'approving')}、已通过 ${sumOf(rows, 'approved')}、已驳回 ${sumOf(rows, 'rejected')}。`,
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
    totals: { project: '合计', total: sumOf(rows, 'total'), matIn: sumOf(rows, 'matIn'), matOut: sumOf(rows, 'matOut'), eqIn: sumOf(rows, 'eqIn'), eqOut: sumOf(rows, 'eqOut'), approving: sumOf(rows, 'approving'), approved: sumOf(rows, 'approved'), rejected: sumOf(rows, 'rejected') },
  }
}

/* ------------------------------------------------------------------ *
 * 8. 五、下周关注事项
 * ------------------------------------------------------------------ */

function buildNextWatch(sections) {
  const rows = []
  const hazardRows = sections.anziHazard?.rows || []
  const dutyRows = sections.cocDuty?.rows || []
  const meetingRows = sections.cocSupervisionMeeting?.rows || []
  const dangerRows = sections.cocDangerWork?.rows || []
  const taskRows = sections.anziTask?.rows || []

  hazardRows
    .filter((row) => row.overdue > 0)
    .slice(0, 4)
    .forEach((row) => {
      rows.push({ item: `督办逾期隐患整改（${row.overdue} 条未闭环）`, project: row.project, basis: `逾期 ${row.overdue} 条，整改率 ${row.rate ?? '--'}%` })
    })
  dutyRows
    .filter((row) => row.filledDays < 7)
    .slice(0, 3)
    .forEach((row) => {
      rows.push({ item: '补齐下周值班表缺排槽位', project: row.project, basis: `本周缺排 ${7 - row.filledDays} 天` })
    })
  meetingRows
    .filter((row) => row.reported === 0)
    .slice(0, 3)
    .forEach((row) => {
      rows.push({ item: '补报监理例会纪要', project: row.project, basis: '本周未上报（应召开 1 次）' })
    })
  dangerRows
    .filter((row) => row.actualDays < row.shouldDays)
    .slice(0, 2)
    .forEach((row) => {
      rows.push({ item: '补报每日施工作业（危险作业上报）', project: row.project, basis: `漏报日期 ${row.missDates}` })
    })
  taskRows
    .filter((row) => row.overdue > 0)
    .slice(0, 2)
    .forEach((row) => {
      rows.push({ item: '完成逾期巡检任务', project: row.project, basis: `逾期 ${row.overdue} 个任务，最长 ${row.maxOverdueDays} 天` })
    })
  rows.push({ item: '核对下周值班表排班完整性（7 天 × 4 槽位）', project: '全部项目', basis: '值班表需在调度会前排满' })

  return {
    key: 'nextWatch',
    chapter: 'chapter-next',
    title: '5.1 下周关注事项',
    summary: `根据本周逾期未闭环、值班表缺排、监理例会未报、危险作业漏报等情况，自动生成下周关注事项 ${rows.length} 条，供调度会逐项落实。`,
    columns: [
      { prop: 'seq', label: '序号', width: 64, align: 'center' },
      { prop: 'item', label: '关注事项', minWidth: 300, detail: true },
      { prop: 'project', label: '项目', minWidth: 132 },
      { prop: 'basis', label: '依据', minWidth: 220 },
    ],
    rows: rows.map((row, index) => ({ seq: index + 1, ...row })),
  }
}

/* ------------------------------------------------------------------ *
 * 9. 概览与整份周报组装
 * ------------------------------------------------------------------ */

function buildOverviewCards(sections) {
  const values = {
    meetings: sections.cocMeeting?.extra?.meetings?.length ?? null,
    coverage: sections.cocMeeting?.extra?.coverage ?? null,
    attendRate: sections.cocMeeting?.totals?.rate ?? null,
    dutyRate: sections.cocDuty?.totals?.rate ?? null,
    meetingReportRate: pct(sections.cocSupervisionMeeting?.totals?.reported, sections.cocSupervisionMeeting?.totals?.shouldCount),
    reportRate: sections.cocDangerWork?.totals?.rate ?? null,
    taskRate: sections.anziTask?.totals?.rate ?? null,
    selfTaskCount: sections.anziTask?.totals?.selfCreated ?? null,
    newHazard: sections.anziHazard?.totals?.created ?? null,
    closeRate: sections.anziHazard?.totals?.rate ?? null,
    overdueHazard: sections.anziHazard?.totals?.overdue ?? null,
    qmInspectTasks: sections.qmInspect?.totals?.tasks ?? null,
    qmPassRate: sections.qmInspect?.totals?.firstPassRate ?? null,
    qmBrandCount: sections.qmBrand?.totals?.applications ?? null,
    qmMatCount: sections.qmMat?.totals?.total ?? null,
  }

  const groups = []
  const cards = []
  OVERVIEW_GROUPS.forEach((group) => {
    const groupCards = group.cards.map((card) => {
      const item = { ...card, group: group.key, groupTitle: group.title, value: values[card.key] ?? null }
      cards.push(item)
      return item
    })
    groups.push({ key: group.key, title: group.title, cards: groupCards })
  })
  return { groups, cards }
}

function buildOverview(sections, weekInfo, prevReport) {
  const { groups, cards } = buildOverviewCards(sections)
  const prevCards = prevReport?.overview?.cards || []
  const withDelta = cards.map((card) => {
    const prevValue = prevCards.find((item) => item.key === card.key)?.value ?? null
    const delta = typeof card.value === 'number' && typeof prevValue === 'number' ? Math.round((card.value - prevValue) * 10) / 10 : null
    return { ...card, prevValue, delta }
  })
  const groupsWithDelta = groups.map((group) => ({
    ...group,
    cards: group.cards.map((card) => withDelta.find((item) => item.key === card.key) || card),
  }))

  const find = (key) => withDelta.find((card) => card.key === key)?.value
  return {
    title: '一、本周概览',
    summary:
      `本周（${weekInfo.rangeLabel}）COC 调度方面：调度会议 ${find('meetings') ?? '--'} 场、覆盖 ${find('coverage') ?? '--'} 个在建项目，` +
      `值班表登记完整率 ${fmtPct(find('dutyRate'))}、监理例会上报率 ${fmtPct(find('meetingReportRate'))}、危险作业上报率 ${fmtPct(find('reportRate'))}；` +
      `安质巡检方面：巡检任务完成率 ${fmtPct(find('taskRate'))}（自行登记 ${find('selfTaskCount') ?? '--'} 个），新增隐患 ${find('newHazard') ?? '--'} 条、整改率 ${fmtPct(find('closeRate'))}，` +
      `逾期未闭环 ${find('overdueHazard') ?? '--'} 条；质量方面：验收任务 ${find('qmInspectTasks') ?? '--'} 个、通过率 ${fmtPct(find('qmPassRate'))}，` +
      `品牌报审 ${find('qmBrandCount') ?? '--'} 项、材料设备进场 ${find('qmMatCount') ?? '--'} 批。`,
    groups: groupsWithDelta,
    cards: withDelta,
  }
}

/* ------------------------------------------------------------------ *
 * 10. 演示周报组装
 * ------------------------------------------------------------------ */

/**
 * 构建演示周报快照
 * @param {string} weekKey 2026-W44
 * @returns {object} 周报快照
 */
export function buildDemoWeeklyReport(weekKey) {
  const weekInfo = weekOfKey(weekKey)
  const sections = {}
  sections.cocDangerWork = buildCocDangerWork(weekKey)
  sections.cocDuty = buildCocDuty(weekKey)
  sections.cocSupervisionMeeting = buildCocSupervisionMeeting(weekKey)
  sections.cocMeeting = buildCocMeeting(weekKey)
  sections.cocHazard = buildCocHazard(weekKey)
  sections.cocSampling = buildCocSampling(weekKey)
  sections.anziTask = buildAnziTask(weekKey)
  sections.anziHazard = buildAnziHazard(weekKey)
  sections.qmInspect = buildQmInspect(weekKey)
  sections.qmBrand = buildQmBrand(weekKey)
  sections.qmMat = buildQmMat(weekKey)
  sections.nextWatch = buildNextWatch(sections)

  const prevWeekInfo = previousWeekInfo(weekInfo.weekStart)
  const prev = isDemoWeek(prevWeekInfo.weekKey) ? buildDemoPrevOverview(prevWeekInfo.weekKey) : null
  const overview = buildOverview(sections, weekInfo, prev ? { overview: prev.overview } : null)

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

/** 只为环比取值构建上一周概览（避免递归构建整份周报） */
function buildDemoPrevOverview(weekKey) {
  const sections = {}
  sections.cocDangerWork = buildCocDangerWork(weekKey)
  sections.cocDuty = buildCocDuty(weekKey)
  sections.cocSupervisionMeeting = buildCocSupervisionMeeting(weekKey)
  sections.cocMeeting = buildCocMeeting(weekKey)
  sections.cocHazard = buildCocHazard(weekKey)
  sections.cocSampling = buildCocSampling(weekKey)
  sections.anziTask = buildAnziTask(weekKey)
  sections.anziHazard = buildAnziHazard(weekKey)
  sections.qmInspect = buildQmInspect(weekKey)
  sections.qmBrand = buildQmBrand(weekKey)
  sections.qmMat = buildQmMat(weekKey)
  const weekInfo = weekOfKey(weekKey)
  return { overview: buildOverview(sections, weekInfo, null) }
}

/** 周报章节顺序（详情页与导出一致） */
export const WEEKLY_SECTION_ORDER = [
  'cocDangerWork',
  'cocDuty',
  'cocSupervisionMeeting',
  'cocMeeting',
  'cocHazard',
  'cocSampling',
  'anziTask',
  'anziHazard',
  'qmInspect',
  'qmBrand',
  'qmMat',
  'nextWatch',
]

/** 章节分组（详情页导航与导出用） */
export const SECTION_CHAPTER = {
  cocDangerWork: 'chapter-coc',
  cocDuty: 'chapter-coc',
  cocSupervisionMeeting: 'chapter-coc',
  cocMeeting: 'chapter-coc',
  cocHazard: 'chapter-coc',
  cocSampling: 'chapter-coc',
  anziTask: 'chapter-anzi',
  anziHazard: 'chapter-anzi',
  qmInspect: 'chapter-quality',
  qmBrand: 'chapter-quality',
  qmMat: 'chapter-quality',
  nextWatch: 'chapter-next',
}

export const CHAPTER_TITLES = {
  'chapter-coc': '二、COC 调度',
  'chapter-anzi': '三、安质巡检',
  'chapter-quality': '四、质量',
  'chapter-next': '五、下周关注事项',
}

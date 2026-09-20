/**
 * 考核评分原型数据。
 * 计分：满分 100，未达标扣分，不涉及扣 0 且不转移扣分上限。
 * 排名按自然月，每月 1 日统计上月。任务、隐患、预警只计上月新建记录。
 * 出勤和摄像头按已结束日期求平均；塔吊、升降机按月累计；每日施工作业统计填报天数。
 * 已结束月份冻结。
 */
import { buildCocProjectOptions } from './projectBasicInfo.js'

export const INDICATOR_FIELDS = [
  { id: 'inspect_should', name: '月度应完成巡检任务数', module: '巡检管理', grain: '月度' },
  { id: 'inspect_created', name: '月度生成巡检任务数', module: '巡检管理', grain: '月度' },
  { id: 'inspect_done', name: '月度已完成巡检任务数', module: '巡检管理', grain: '月度' },
  { id: 'inspect_overdue', name: '月度逾期未完成巡检任务数', module: '巡检管理', grain: '月度' },
  { id: 'hazard_should', name: '月度应整改隐患数', module: '隐患清单', grain: '月度' },
  { id: 'hazard_due', name: '月度创建隐患数', module: '隐患清单', grain: '月度' },
  { id: 'hazard_closed', name: '月度已关闭隐患数', module: '隐患清单', grain: '月度' },
  { id: 'hazard_overdue', name: '月度逾期未关闭隐患数', module: '隐患清单', grain: '月度' },
  { id: 'manage_actual', name: '当日管理人员实际出勤人次', module: '人员实名制', grain: '当日' },
  { id: 'manage_due', name: '当日管理人员应出勤人次', module: '人员实名制', grain: '当日' },
  { id: 'manage_rate_month', name: '月度管理人员出勤率', module: '人员实名制', grain: '月度' },
  { id: 'labor_actual', name: '当日建筑工人实际出勤人次', module: '人员实名制', grain: '当日' },
  { id: 'labor_due', name: '当日建筑工人应出勤人次', module: '人员实名制', grain: '当日' },
  { id: 'labor_rate_month', name: '月度劳务人员出勤率', module: '人员实名制', grain: '月度' },
  { id: 'labor_created', name: '月度生成实名制预警条数', module: '人员实名制', grain: '月度' },
  { id: 'labor_pending', name: '月度仍待处理实名制预警条数', module: '人员实名制', grain: '月度' },
  { id: 'labor_closed', name: '月度已关闭实名制预警条数', module: '人员实名制', grain: '月度' },
  { id: 'crane_alarm', name: '当日塔吊报警次数', module: '塔吊运行监管', grain: '当日' },
  { id: 'crane_count', name: '当日在场塔吊台数', module: '塔吊运行监管', grain: '当日' },
  { id: 'crane_alarm_month', name: '月累计塔吊报警次数', module: '塔吊运行监管', grain: '月累计' },
  { id: 'crane_machine_days', name: '月累计塔吊在场台日', module: '塔吊运行监管', grain: '月累计' },
  { id: 'lift_alarm', name: '当日升降机报警次数', module: '升降机运行监管', grain: '当日' },
  { id: 'lift_count', name: '当日在场升降机台数', module: '升降机运行监管', grain: '当日' },
  { id: 'lift_alarm_month', name: '月累计升降机报警次数', module: '升降机运行监管', grain: '月累计' },
  { id: 'lift_machine_days', name: '月累计升降机在场台日', module: '升降机运行监管', grain: '月累计' },
  { id: 'major_done', name: '月度已处置危大预警数', module: '危大工程监测', grain: '月度' },
  { id: 'major_total', name: '月度生成危大预警数', module: '危大工程监测', grain: '月度' },
  { id: 'major_pending', name: '月度未处置危大预警数', module: '危大工程监测', grain: '月度' },
  { id: 'camera_online', name: '当日在线摄像头数量', module: '视频监控', grain: '当日' },
  { id: 'camera_total', name: '当日摄像头总数', module: '视频监控', grain: '当日' },
  { id: 'camera_rate_month', name: '月度摄像头在线率', module: '视频监控', grain: '月度' },
  { id: 'ai_done', name: '月度已处置AI预警数', module: 'AI应用', grain: '月度' },
  { id: 'ai_total', name: '月度生成AI预警数', module: 'AI应用', grain: '月度' },
  { id: 'ai_unsafe', name: '月度生成不安全行为预警数', module: 'AI应用', grain: '月度' },
  { id: 'ai_hazard', name: '月度生成现场隐患预警数', module: 'AI应用', grain: '月度' },
  { id: 'ai_fence', name: '月度生成围栏入侵预警数', module: 'AI应用', grain: '月度' },
  { id: 'report_today', name: '当日是否已填报', module: '每日施工作业', grain: '当日' },
  { id: 'report_days', name: '月度填报天数', module: '每日施工作业', grain: '月度' },
  { id: 'ended_days', name: '月度已结束自然日天数', module: '每日施工作业', grain: '月度' },
  { id: 'miss_days', name: '月度缺报天数', module: '每日施工作业', grain: '月度' },
]

const FORMULA_OP_LABEL = { add: '+', sub: '−', mul: '×', div: '÷' }

export function formatIndicatorFormula(formula) {
  if (!Array.isArray(formula) || !formula.length) return ''
  return formula.map((token) => {
    if (token.kind === 'op') return FORMULA_OP_LABEL[token.op] || ''
    if (token.kind === 'const') {
      if (token.value === null || token.value === undefined || token.value === '') return ''
      return String(token.value)
    }
    return INDICATOR_FIELDS.find((item) => item.id === token.field)?.name || ''
  }).filter(Boolean).join(' ')
}

const RULE_SYMBOL = {
  '+': '+',
  '-': '-',
  '−': '-',
  '*': '*',
  '×': '*',
  '/': '/',
  '÷': '/',
  '(': '(',
  ')': ')',
  '（': '(',
  '）': ')',
  ',': ',',
  '，': ',',
}

const RULE_FUNCS = [
  { name: '求平均', kind: 'avg' },
  { name: '求和', kind: 'sum' },
]

export function validateIndicatorRule(text) {
  const source = String(text || '').replace(/\s+/g, '')
  if (!source) return { ok: false, msg: '请配置指标规则' }
  const names = INDICATOR_FIELDS.map((item) => item.name).sort((left, right) => right.length - left.length)
  const tokens = []
  let index = 0
  while (index < source.length) {
    const name = names.find((item) => source.startsWith(item, index))
    if (name) {
      tokens.push({ type: 'field' })
      index += name.length
      continue
    }
    const number = /^\d+(?:\.\d+)?/.exec(source.slice(index))
    if (number) {
      tokens.push({ type: 'num', value: Number(number[0]) })
      index += number[0].length
      continue
    }
    const func = RULE_FUNCS.find((item) => source.startsWith(item.name, index))
    if (func) {
      tokens.push({ type: 'call', name: func.kind, label: func.name })
      index += func.name.length
      continue
    }
    const mapped = RULE_SYMBOL[source[index]]
    if (!mapped) return { ok: false, msg: `无法识别「${source[index]}」` }
    if (mapped === ',') tokens.push({ type: 'comma' })
    else tokens.push({ type: mapped === '(' || mapped === ')' ? 'paren' : 'op', op: mapped })
    index += 1
  }
  if (!tokens.some((item) => item.type === 'field')) return { ok: false, msg: '规则须包含至少一个带时间维度的统计字段' }

  let cursor = 0
  const fail = (msg) => {
    const error = new Error(msg)
    error.rule = true
    throw error
  }
  const peek = () => tokens[cursor]
  const take = () => tokens[cursor++]
  function parseExpr() {
    let value = parseTerm()
    while (peek()?.type === 'op' && (peek().op === '+' || peek().op === '-')) {
      const op = take().op
      const right = parseTerm()
      value = op === '+' ? value + right : value - right
    }
    return value
  }
  function parseTerm() {
    let value = parseFactor()
    while (peek()?.type === 'op' && (peek().op === '*' || peek().op === '/')) {
      const op = take().op
      const right = parseFactor()
      if (op === '/' && right === 0) fail('规则无法计算，除数不能为 0')
      value = op === '*' ? value * right : value / right
    }
    return value
  }
  function parseFactor() {
    const token = peek()
    if (!token) fail('规则不完整')
    if (token.type === 'op' && token.op === '-') {
      take()
      return -parseFactor()
    }
    if (token.type === 'call') {
      const label = token.label
      const kind = token.name
      take()
      const open = take()
      if (!open || open.op !== '(') fail(`${label}后面须跟括号`)
      if (peek()?.op === ')') fail(`${label}括号内至少要有一项`)
      const args = []
      while (true) {
        args.push(parseExpr())
        if (peek()?.type === 'comma') {
          take()
          if (!peek() || peek().op === ')' || peek().type === 'comma') fail('逗号后面还要有一项')
          continue
        }
        break
      }
      const close = take()
      if (!close || close.op !== ')') fail('括号不匹配')
      const total = args.reduce((sum, item) => sum + item, 0)
      return kind === 'avg' ? total / args.length : total
    }
    if (token.type === 'paren' && token.op === '(') {
      take()
      const value = parseExpr()
      const close = take()
      if (!close || close.op !== ')') fail('括号不匹配')
      return value
    }
    if (token.type === 'field') {
      take()
      return 1
    }
    if (token.type === 'num') {
      take()
      return token.value
    }
    fail('规则不完整')
    return 0
  }
  try {
    const value = parseExpr()
    if (cursor !== tokens.length) {
      if (tokens[cursor]?.type === 'comma') return { ok: false, msg: '逗号只能用在求和、求平均的括号里' }
      return { ok: false, msg: '规则没有写完' }
    }
    if (!Number.isFinite(value)) return { ok: false, msg: '规则无法计算，请检查除数是否为 0' }
    return { ok: true, msg: '规则有效' }
  } catch (error) {
    return { ok: false, msg: error.rule ? error.message : '规则无法计算' }
  }
}

export const ASSESSMENT_INDICATORS = [
  {
    id: 'inspect',
    name: '巡检任务完成率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。只计入上月生成的巡检任务。完成率 = 已完成数 / 上月生成任务数',
    not_involved: '应完成任务数为 0',
    bands: [
      { min: 80, max: 100, min_inclusive: false, max_inclusive: true, deduct: 0 },
      { min: 60, max: 80, min_inclusive: false, max_inclusive: true, deduct: 2 },
      { min: 40, max: 60, min_inclusive: false, max_inclusive: true, deduct: 4 },
      { min: null, max: 40, min_inclusive: false, max_inclusive: true, deduct: 7 },
    ],
  },
  {
    id: 'hazard',
    name: '隐患整改率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。只计入上月创建的隐患。整改率 = 已关闭数 / 上月创建隐患数',
    not_involved: '应整改隐患数为 0',
    bands: [
      { min: 100, max: 100, min_inclusive: true, max_inclusive: true, deduct: 0 },
      { min: 90, max: 100, min_inclusive: false, max_inclusive: false, deduct: 1 },
      { min: 80, max: 90, min_inclusive: false, max_inclusive: true, deduct: 2 },
      { min: 70, max: 80, min_inclusive: false, max_inclusive: true, deduct: 3 },
      { min: 60, max: 70, min_inclusive: false, max_inclusive: true, deduct: 4 },
      { min: null, max: 60, min_inclusive: false, max_inclusive: true, deduct: 7 },
    ],
  },
  {
    id: 'manage_att',
    name: '管理人员出勤率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每个自然日日终统计当天出勤率。月得分取该月已结束日期出勤率的算术平均。出勤率 = 实际出勤人次 / 应出勤人次',
    not_involved: '应出勤人次为 0',
    bands: [
      { min: 85, max: null, min_inclusive: false, max_inclusive: true, deduct: 0 },
      { min: 80, max: 85, min_inclusive: false, max_inclusive: true, deduct: 1 },
      { min: 70, max: 80, min_inclusive: false, max_inclusive: true, deduct: 2 },
      { min: 65, max: 70, min_inclusive: false, max_inclusive: true, deduct: 3 },
      { min: 60, max: 65, min_inclusive: false, max_inclusive: true, deduct: 4 },
      { min: null, max: 60, min_inclusive: false, max_inclusive: true, deduct: 7 },
    ],
  },
  {
    id: 'labor_att',
    name: '劳务人员出勤率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每个自然日日终统计当天出勤率。月得分取该月已结束日期出勤率的算术平均。出勤率 = 实际出勤人次 / 应出勤人次',
    not_involved: '应出勤人次为 0',
    bands: [
      { min: 85, max: null, min_inclusive: false, max_inclusive: true, deduct: 0 },
      { min: 80, max: 85, min_inclusive: false, max_inclusive: true, deduct: 1 },
      { min: 70, max: 80, min_inclusive: false, max_inclusive: true, deduct: 2 },
      { min: 65, max: 70, min_inclusive: false, max_inclusive: true, deduct: 3 },
      { min: 60, max: 65, min_inclusive: false, max_inclusive: true, deduct: 4 },
      { min: null, max: 60, min_inclusive: false, max_inclusive: true, deduct: 7 },
    ],
  },
  {
    id: 'crane',
    name: '塔吊报警强度',
    cap: 8,
    value_unit: '次/台·日',
    calc_rule: '每个自然日日终固化当天报警次数和在场台数。月报警强度按全月累计计算：累计报警次数 / 累计在场台日。不按各日强度再平均。台数事后不回写',
    not_involved: '在场台数为 0',
    bands: [
      { min: null, max: 10, min_inclusive: false, max_inclusive: true, deduct: 0 },
      { min: 10, max: 20, min_inclusive: false, max_inclusive: true, deduct: 0.8 },
      { min: 20, max: 40, min_inclusive: false, max_inclusive: true, deduct: 1.6 },
      { min: 40, max: 60, min_inclusive: false, max_inclusive: true, deduct: 2.4 },
      { min: 60, max: 100, min_inclusive: false, max_inclusive: true, deduct: 3.2 },
      { min: 100, max: null, min_inclusive: false, max_inclusive: true, deduct: 5.6 },
    ],
  },
  {
    id: 'lift',
    name: '升降机报警强度',
    cap: 6,
    value_unit: '次/台·日',
    calc_rule: '每个自然日日终固化当天报警次数和在场台数。月报警强度按全月累计计算：累计报警次数 / 累计在场台日。不按各日强度再平均。台数事后不回写',
    not_involved: '在场台数为 0',
    bands: [
      { min: null, max: 10, min_inclusive: false, max_inclusive: true, deduct: 0 },
      { min: 10, max: 20, min_inclusive: false, max_inclusive: true, deduct: 0.6 },
      { min: 20, max: 40, min_inclusive: false, max_inclusive: true, deduct: 1.2 },
      { min: 40, max: 60, min_inclusive: false, max_inclusive: true, deduct: 1.8 },
      { min: 60, max: 100, min_inclusive: false, max_inclusive: true, deduct: 2.4 },
      { min: 100, max: null, min_inclusive: false, max_inclusive: true, deduct: 4.2 },
    ],
  },
  {
    id: 'major',
    name: '危大监测预警处置率',
    cap: 6,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。只计入上月生成的危大监测预警。处置率 = 已处置数 / 上月生成预警数',
    not_involved: '预警总数为 0',
    bands: [
      { min: 100, max: 100, min_inclusive: true, max_inclusive: true, deduct: 0 },
      { min: 90, max: 100, min_inclusive: true, max_inclusive: false, deduct: 0.6 },
      { min: 80, max: 90, min_inclusive: true, max_inclusive: false, deduct: 1.2 },
      { min: 70, max: 80, min_inclusive: true, max_inclusive: false, deduct: 1.8 },
      { min: 60, max: 70, min_inclusive: true, max_inclusive: false, deduct: 2.4 },
      { min: null, max: 60, min_inclusive: false, max_inclusive: false, deduct: 4.2 },
    ],
  },
  {
    id: 'camera',
    name: '摄像头在线率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每个自然日日终统计当天在线率。月得分取该月已结束且有摄像头日期的在线率算术平均。在线率 = 在线数量 / 摄像头总数',
    not_involved: '已结束的日期里都没有摄像头',
    bands: [
      { min: 95, max: null, min_inclusive: true, max_inclusive: true, deduct: 0 },
      { min: 90, max: 95, min_inclusive: true, max_inclusive: false, deduct: 1 },
      { min: 80, max: 90, min_inclusive: true, max_inclusive: false, deduct: 2 },
      { min: 70, max: 80, min_inclusive: true, max_inclusive: false, deduct: 3 },
      { min: null, max: 70, min_inclusive: false, max_inclusive: false, deduct: 7 },
    ],
  },
  {
    id: 'ai',
    name: 'AI 预警处置率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。只计入上月生成的预警。现场不安全行为、现场隐患事件、围栏入侵合并。处置率 = 已处置数 / 上月生成预警数',
    not_involved: '预警总数为 0',
    bands: [
      { min: 100, max: 100, min_inclusive: true, max_inclusive: true, deduct: 0 },
      { min: 90, max: 100, min_inclusive: true, max_inclusive: false, deduct: 1 },
      { min: 80, max: 90, min_inclusive: true, max_inclusive: false, deduct: 2 },
      { min: 70, max: 80, min_inclusive: true, max_inclusive: false, deduct: 3 },
      { min: 60, max: 70, min_inclusive: true, max_inclusive: false, deduct: 4 },
      { min: null, max: 60, min_inclusive: false, max_inclusive: false, deduct: 7 },
    ],
  },
  {
    id: 'daily_work',
    name: '每日施工作业填报',
    cap: 10,
    value_unit: '天',
    band_unit: '天',
    calc_rule: '每个自然日日终记录当天是否已填报。月统计值为填报天数，即已结束自然日中已填报的天数。不按缺报率',
    not_involved: '不单设。未纳入评分的项目不进入本项',
    bands: [
      { min: null, max: 15, min_inclusive: false, max_inclusive: false, deduct: 10 },
      { min: 15, max: 21, min_inclusive: true, max_inclusive: false, deduct: 8 },
      { min: 21, max: 25, min_inclusive: true, max_inclusive: false, deduct: 5 },
      { min: 25, max: 28, min_inclusive: true, max_inclusive: false, deduct: 2 },
      { min: 28, max: null, min_inclusive: true, max_inclusive: false, deduct: 0 },
    ],
  },
  {
    id: 'labor_warn',
    name: '实名制预警未处置',
    cap: 10,
    value_unit: '条',
    calc_rule: '每月 1 日统计上月。只计入上月生成、且截至次月 1 日仍为「待处理」的预警条数。已关闭、已读、未读不计入',
    not_involved: '项目未接入人员实名制',
    bands: [
      { min: 0, max: 0, min_inclusive: true, max_inclusive: true, deduct: 0 },
      { min: 1, max: 2, min_inclusive: true, max_inclusive: true, deduct: 2 },
      { min: 3, max: 5, min_inclusive: true, max_inclusive: true, deduct: 5 },
      { min: 6, max: 10, min_inclusive: true, max_inclusive: true, deduct: 8 },
      { min: 10, max: null, min_inclusive: false, max_inclusive: true, deduct: 10 },
    ],
  },
]

const DEFAULT_FORMULAS = {
  inspect: [
    { kind: 'field', field: 'inspect_done' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'inspect_created' },
  ],
  hazard: [
    { kind: 'field', field: 'hazard_closed' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'hazard_due' },
  ],
  manage_att: [
    { kind: 'field', field: 'manage_rate_month' },
  ],
  labor_att: [
    { kind: 'field', field: 'labor_rate_month' },
  ],
  crane: [
    { kind: 'field', field: 'crane_alarm_month' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'crane_machine_days' },
  ],
  lift: [
    { kind: 'field', field: 'lift_alarm_month' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'lift_machine_days' },
  ],
  major: [
    { kind: 'field', field: 'major_done' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'major_total' },
  ],
  camera: [
    { kind: 'field', field: 'camera_rate_month' },
  ],
  ai: [
    { kind: 'field', field: 'ai_done' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'ai_total' },
  ],
  daily_work: [
    { kind: 'field', field: 'report_days' },
  ],
  labor_warn: [
    { kind: 'field', field: 'labor_pending' },
  ],
}

export const PERIOD_GROUPS = [
  {
    id: 'week',
    label: '周排名',
    options: [
      { id: 'week-prev', label: '2026第37周（09-07~09-13）', ongoing: false },
      { id: 'week-current', label: '2026第38周（09-14~09-20）', ongoing: true },
    ],
  },
  {
    id: 'month',
    label: '月度排名',
    options: [
      { id: 'month-prev', label: '2026年8月', ongoing: false },
      { id: 'month-current', label: '2026年9月（统计至昨日 2026-09-18）', ongoing: true },
    ],
  },
  {
    id: 'quarter',
    label: '季度排名',
    options: [
      { id: 'quarter-prev', label: '2026年第二季度（4–6月）', ongoing: false },
      { id: 'quarter-current', label: '2026年第三季度（统计至 2026-09-18）', ongoing: true },
    ],
  },
]

const DEFAULT_GRADES = [
  { id: 'g1', name: '优', min: 80, max: 100, min_inclusive: false, color: '#67c23a' },
  { id: 'g2', name: '良', min: 60, max: 80, min_inclusive: false, color: '#409eff' },
  { id: 'g3', name: '中', min: 40, max: 60, min_inclusive: false, color: '#e6a23c' },
  { id: 'g4', name: '差', min: 0, max: 40, min_inclusive: true, color: '#f56c6c' },
]

/** 扣分为 null 表示不涉及。顺序与 ASSESSMENT_INDICATORS 一致。 */
const WEEK_DEDUCT = {
  0: [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  1: [0, 2, 0, 0, null, null, 0, 1, 0, 2, 0],
  2: [7, 7, 4, 4, 3.2, 1.2, 1.8, 3, 2, 10, 2],
  3: [7, 7, 7, 7, 5.6, 4.2, 4.2, 7, 7, 8, 10],
  4: [2, 2, 1, 1, 0.8, 0, 0.6, 7, 2, 2, 2],
  5: [2, 7, 2, 2, 1.6, 1.2, 1.2, 2, 3, 5, 5],
  6: [0, 1, 3, 4, 0, 0.6, 0, 1, 1, 0, 2],
  7: [2, 1, 2, 2, 0, 0, null, 2, 1, 0, 0],
}

const NOT_INVOLVED_NOTE = {
  crane: '本周期无在场塔吊',
  lift: '本周期无在场升降机',
  major: '本周期无危大监测预警',
}

const catalog = buildCocProjectOptions().slice(0, 9)

const projectMatrix = {}
catalog.forEach((item) => {
  const participate = item.status !== '历史'
  projectMatrix[item.id] = {}
  ASSESSMENT_INDICATORS.forEach((indicator) => {
    projectMatrix[item.id][indicator.id] = participate
  })
})

let excludeHistorical = true

function isHistoricalProject(projectId) {
  const item = catalog.find((row) => row.id === projectId)
  return item?.status === '历史'
}

function projectUsesIndicator(projectId, indicatorId) {
  if (excludeHistorical && isHistoricalProject(projectId)) return false
  return !!projectMatrix[projectId]?.[indicatorId]
}

function isProjectIncluded(projectId) {
  return indicatorState.some((indicator) => indicator.enabled && projectUsesIndicator(projectId, indicator.id))
}
function cloneIndicator(item, enabled = item.enabled) {
  return {
    ...item,
    builtin: !!item.builtin,
    enabled: enabled !== undefined ? enabled : true,
    formula: (item.formula || []).map((token) => ({ ...token })),
    rule_text: item.rule_text || '',
    rule_desc: item.rule_desc || '',
    bands: (item.bands || []).map((band) => ({ ...band })),
  }
}

let indicatorState = ASSESSMENT_INDICATORS.map((item) => cloneIndicator({
  ...item,
  builtin: true,
  rule_desc: item.calc_rule,
  formula: DEFAULT_FORMULAS[item.id] || [{ kind: 'field', field: '' }],
}, true))
let gradeState = DEFAULT_GRADES.map((item) => ({ ...item }))

function periodKind(periodId) {
  if (String(periodId).startsWith('month')) return 'month'
  if (String(periodId).startsWith('quarter')) return 'quarter'
  return 'week'
}

function deductOf(projectIndex, indicatorIndex, periodId) {
  const weekRow = WEEK_DEDUCT[projectIndex]
  if (!weekRow) return 0
  const base = weekRow[indicatorIndex]
  if (base === null || base === undefined) return null
  const kind = periodKind(periodId)
  const cap = ASSESSMENT_INDICATORS[indicatorIndex].cap
  if (kind === 'week') return base
  if (kind === 'month') return Math.min(cap, Math.max(0, Math.round((base - (indicatorIndex % 2 === 0 ? 1 : 0)) * 10) / 10))
  return Math.min(cap, Math.round((base + (indicatorIndex % 3 === 0 ? 1 : 0)) * 10) / 10)
}

function valueText(indicator, deduct) {
  if (deduct === null) return ''
  if (indicator.value_unit === '百分比') {
    const rate = Math.max(0, 100 - deduct * 4)
    return `${rate.toFixed(1)}%`
  }
  if (indicator.value_unit === '次/台·日') {
    return deduct === 0 ? '0 次/台·日' : `${(deduct * 2).toFixed(1)} 次/台·日`
  }
  if (indicator.value_unit === '天') {
    const days = Math.max(0, Math.round(28 - deduct * 1.3))
    return `${days} 天`
  }
  const count = deduct === 0 ? 0 : Math.max(1, Math.round(deduct / 2))
  return `${count} 条`
}

function gradeName(score) {
  const hit = gradeState.find((item) => {
    if (item.min_inclusive) return score >= item.min && score <= item.max
    return score > item.min && score <= item.max
  })
  return hit ? hit.name : ''
}

function buildLines(projectIndex, periodId, projectId) {
  return indicatorState
    .filter((item) => item.enabled && projectUsesIndicator(projectId, item.id))
    .map((item) => {
      const indicatorIndex = ASSESSMENT_INDICATORS.findIndex((row) => row.id === item.id)
      const custom = indicatorIndex < 0
      const raw = custom ? 0 : deductOf(projectIndex, indicatorIndex, periodId)
      const involved = raw !== null
      const deduct = involved ? Math.min(item.cap, raw) : 0
      return {
        indicator_id: item.id,
        indicator_name: item.name,
        cap: item.cap,
        involved,
        value_text: involved ? valueText(item, deduct) : '',
        deduct,
        note: custom ? '公式不重算，本项扣 0 分' : (involved ? (deduct > 0 ? '未达标' : '达标') : (NOT_INVOLVED_NOTE[item.id] || '不涉及')),
      }
    })
}

function projectIndex(projectId) {
  return catalog.findIndex((item) => item.id === projectId)
}

export function listAssessmentProjects() {
  return catalog.map((item) => ({
    project_id: item.id,
    project_name: item.label,
    project_full_name: item.fullName || item.label,
    project_status: !item.status || item.status === '—' ? '--' : item.status,
    switches: { ...(projectMatrix[item.id] || {}) },
  }))
}

export function getAssessmentGrades() {
  return gradeState.map((item) => ({ ...item }))
}

function withFormulaRule(item) {
  const copy = cloneIndicator(item)
  if (copy.builtin) {
    const origin = ASSESSMENT_INDICATORS.find((row) => row.id === copy.id)
    if (origin) copy.calc_rule = origin.calc_rule
    return copy
  }
  copy.calc_rule = copy.rule_text || copy.calc_rule || ''
  return copy
}

export function listIndicatorConfigs() {
  return indicatorState.map((item) => withFormulaRule(item))
}

export function getAssessmentIndicators() {
  return indicatorState.filter((item) => item.enabled).map((item) => withFormulaRule(item))
}

export function listPeriodGroups() {
  return PERIOD_GROUPS
}

export function buildRanking(periodId) {
  const rows = catalog
    .filter((item) => isProjectIncluded(item.id))
    .map((item) => {
      const index = projectIndex(item.id)
      const lines = buildLines(index, periodId, item.id)
      const deduct_total = Math.round(lines.reduce((sum, line) => sum + line.deduct, 0) * 10) / 10
      const score = Math.max(0, Math.round((100 - deduct_total) * 10) / 10)
      return {
        project_id: item.id,
        project_name: item.label,
        score,
        deduct_total,
        grade: gradeName(score),
        lines,
      }
    })
    .sort((a, b) => b.score - a.score || a.project_name.localeCompare(b.project_name, 'zh-CN'))

  let lastScore = null
  let lastRank = 0
  return rows.map((row, index) => {
    const rank = lastScore !== null && row.score === lastScore ? lastRank : index + 1
    lastScore = row.score
    lastRank = rank
    return { ...row, rank }
  })
}

export function getProjectAssessment(projectId, periodId) {
  const project = catalog.find((item) => item.id === projectId)
  if (!project) {
    return { included: false, project_name: '', score: null, deduct_total: null, grade: '', lines: [] }
  }
  if (!isProjectIncluded(project.id)) {
    return { included: false, project_name: project.label, score: null, deduct_total: null, grade: '', lines: [] }
  }
  const ranked = buildRanking(periodId).find((row) => row.project_id === projectId)
  return {
    included: true,
    project_name: project.label,
    score: ranked.score,
    deduct_total: ranked.deduct_total,
    grade: ranked.grade,
    rank: ranked.rank,
    lines: ranked.lines,
  }
}

export function summarizeRanking(rows) {
  const count = rows.length
  const avg = count ? Math.round((rows.reduce((sum, row) => sum + row.score, 0) / count) * 10) / 10 : null
  const grades = {}
  gradeState.forEach((item) => {
    grades[item.name] = rows.filter((row) => row.grade === item.name).length
  })
  return { count, avg, grades }
}

function capsValid(indicators) {
  const enabled = indicators.filter((item) => item.enabled)
  if (!enabled.length) return { ok: false, msg: '至少启用一项考核指标' }
  const sum = Math.round(enabled.reduce((total, item) => total + Number(item.cap), 0) * 10) / 10
  if (sum !== 100) return { ok: false, msg: `启用指标的扣分上限之和须为 100 分，当前为 ${sum} 分` }
  const bad = enabled.find((item) => Number(item.cap) < 0)
  if (bad) return { ok: false, msg: '扣分上限不能小于 0 分' }
  return { ok: true }
}

export function getExcludeHistorical() {
  return excludeHistorical
}

export function saveAssessmentProjects(rows, options = {}) {
  if (typeof options.excludeHistorical === 'boolean') excludeHistorical = options.excludeHistorical
  rows.forEach((row) => {
    if (!projectMatrix[row.project_id]) return
    const blocked = excludeHistorical && row.project_status === '历史'
    indicatorState.forEach((indicator) => {
      if (projectMatrix[row.project_id][indicator.id] === undefined && row.switches?.[indicator.id] === undefined) return
      projectMatrix[row.project_id][indicator.id] = blocked ? false : !!row.switches?.[indicator.id]
    })
  })
  return { ok: true }
}

function boundNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isNaN(number) ? null : number
}

export function saveIndicatorBands(id, payload) {
  const target = indicatorState.find((item) => item.id === id)
  if (!target) return { ok: false, msg: '未找到该指标' }
  const bands = payload.bands || []
  if (!bands.length) return { ok: false, msg: '至少配置一档扣分' }
  if (payload.cap === null || payload.cap === undefined || payload.cap === '') return { ok: false, msg: '请填写扣分上限' }
  const cap = Number(payload.cap)
  if (Number.isNaN(cap) || cap < 0 || cap > 100) return { ok: false, msg: '扣分上限须在 0 分到 100 分之间' }
  const nextCap = Math.round(cap * 10) / 10
  const preview = indicatorState.map((item) => (item.id === id ? { ...item, cap: nextCap } : item))
  const capCheck = capsValid(preview)
  if (!capCheck.ok) return capCheck
  const nextBands = []
  for (const band of bands) {
    const deduct = Number(band.deduct)
    if (Number.isNaN(deduct) || deduct < 0) return { ok: false, msg: '本档扣分不能小于 0 分' }
    if (deduct > nextCap) return { ok: false, msg: `本档扣分不能大于扣分上限 ${nextCap} 分` }
    const min = boundNumber(band.min)
    const max = boundNumber(band.max)
    if ((band.min !== null && band.min !== undefined && band.min !== '' && min === null) || (band.max !== null && band.max !== undefined && band.max !== '' && max === null)) {
      return { ok: false, msg: '下限和上限须为数字，留空表示不限' }
    }
    if (min !== null && max !== null && min > max) return { ok: false, msg: '下限不能大于上限' }
    nextBands.push({
      min,
      max,
      min_inclusive: min === null ? false : !!band.min_inclusive,
      max_inclusive: max === null ? false : !!band.max_inclusive,
      deduct,
    })
  }
  target.not_involved = String(payload.not_involved || '').trim()
  target.bands = nextBands
  target.cap = nextCap
  return { ok: true, indicator: cloneIndicator(target) }
}

export function saveIndicatorConfigs(rows) {
  if (!rows.length) return { ok: false, msg: '至少保留一项指标' }
  const names = rows.map((item) => String(item.name || '').trim())
  if (names.some((name) => !name)) return { ok: false, msg: '请填写指标名称' }
  if (new Set(names).size !== names.length) return { ok: false, msg: '指标名称不能重复' }
  const builtinIds = ASSESSMENT_INDICATORS.map((item) => item.id)
  if (builtinIds.some((id) => !rows.some((item) => item.id === id))) {
    return { ok: false, msg: '默认指标不能删除' }
  }
  for (const row of rows) {
    if (builtinIds.includes(row.id)) continue
    if (!String(row.rule_desc || '').trim()) return { ok: false, msg: `${String(row.name).trim() || '未命名指标'}：请填写考核规则说明` }
    const check = validateIndicatorRule(row.rule_text)
    if (!check.ok) return { ok: false, msg: `${String(row.name).trim()}：${check.msg}` }
  }
  const previous = new Map(indicatorState.map((item) => [item.id, item]))
  indicatorState = rows.map((row) => {
    const origin = previous.get(row.id)
    const builtin = builtinIds.includes(row.id)
    const preset = ASSESSMENT_INDICATORS.find((item) => item.id === row.id)
    return cloneIndicator({
      ...(origin || {}),
      id: row.id,
      name: String(row.name).trim(),
      builtin,
      enabled: !!row.enabled,
      formula: builtin ? (DEFAULT_FORMULAS[row.id] || origin?.formula || []) : [],
      rule_text: builtin ? '' : String(row.rule_text || '').trim(),
      rule_desc: builtin ? (preset?.calc_rule || origin?.rule_desc || '') : String(row.rule_desc || '').trim(),
      cap: origin ? origin.cap : 0,
      value_unit: origin?.value_unit || '',
      band_unit: origin?.band_unit,
      not_involved: origin?.not_involved || '',
      bands: origin?.bands || [],
      calc_rule: builtin ? (preset?.calc_rule || origin?.calc_rule || '') : String(row.rule_text || '').trim(),
    }, row.enabled)
  })
  indicatorState.forEach((item) => {
    catalog.forEach((project) => {
      if (!projectMatrix[project.id]) projectMatrix[project.id] = {}
      if (projectMatrix[project.id][item.id] !== undefined) return
      const historical = project.status === '历史'
      projectMatrix[project.id][item.id] = excludeHistorical && historical ? false : project.status !== '历史'
    })
  })
  return { ok: true }
}

export function saveAssessmentIndicators(indicators) {
  const check = capsValid(indicators)
  if (!check.ok) return check
  indicators.forEach((item) => {
    const origin = indicatorState.find((row) => row.id === item.id)
    if (!origin || !origin.enabled) return
    origin.cap = Number(item.cap)
  })
  return { ok: true }
}

export function saveAssessmentGrades(grades) {
  if (!grades.length) return { ok: false, msg: '至少保留一个等级' }
  const names = grades.map((item) => String(item.name || '').trim())
  if (names.some((name) => !name)) return { ok: false, msg: '请填写等级名称' }
  if (new Set(names).size !== names.length) return { ok: false, msg: '等级名称不能重复' }
  const rows = grades.map((item, index) => ({
    id: item.id || `g${index + 1}`,
    name: String(item.name).trim(),
    min: Math.round(Number(item.min) * 10) / 10,
    max: Math.round(Number(item.max) * 10) / 10,
    min_cmp: item.min_cmp || (index === 0 ? 'gte' : 'gt'),
  }))
  for (const item of rows) {
    if (Number.isNaN(item.min) || Number.isNaN(item.max) || item.min > item.max) {
      return { ok: false, msg: '分数区间的下限不能大于上限' }
    }
    if (item.min < 0 || item.max > 100) return { ok: false, msg: '分数区间须在 0 分到 100 分之间' }
  }
  if (rows[0].min !== 0) return { ok: false, msg: '最低一档的下限须为 0 分' }
  if (rows[rows.length - 1].max !== 100) return { ok: false, msg: '最高一档的上限须为 100 分' }
  for (let index = 0; index < rows.length - 1; index += 1) {
    if (rows[index].max !== rows[index + 1].min) {
      return { ok: false, msg: '各档须从低到高首尾相接，下一档下限等于上一档上限' }
    }
  }
  const stored = [...rows].sort((left, right) => right.max - left.max || right.min - left.min)
  gradeState = stored.map((item) => ({
    id: item.id,
    name: item.name,
    min: item.min,
    max: item.max,
    min_inclusive: item.min_cmp === 'gte' || item.min === 0,
    color: /^#[0-9a-fA-F]{6}$/.test(String(item.color || '')) ? item.color : '#909399',
  }))
  return { ok: true }
}

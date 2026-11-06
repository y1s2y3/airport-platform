/**
 * 考核评分原型数据。
 * 计分：满分 100，未达标扣分，不涉及扣 0 且不转移扣分上限。
 * 排名按自然月，每月 1 日统计上月。任务、隐患、预警只计上月新建记录。
 * 出勤和摄像头按已结束日期求平均；塔吊按月累计；每日施工作业统计填报率。
 * 已结束月份冻结。
 */
import { buildCocProjectOptions } from './projectBasicInfo.js'

export const INDICATOR_FIELDS = [
  { id: 'inspect_created', name: '月度生成巡检任务数', module: '巡检管理', grain: '月度' },
  { id: 'inspect_done', name: '月度已完成巡检任务数', module: '巡检管理', grain: '月度' },
  { id: 'hazard_due', name: '月度创建隐患数', module: '隐患清单', grain: '月度' },
  { id: 'hazard_closed', name: '月度已关闭隐患数', module: '隐患清单', grain: '月度' },
  { id: 'manage_rate_month', name: '月度管理人员出勤率', module: '人员实名制', grain: '月度' },
  { id: 'crane_alarm_month', name: '月累计塔吊报警次数', module: '塔吊运行监管', grain: '月累计' },
  { id: 'crane_machine_days', name: '月累计塔吊在场台日', module: '塔吊运行监管', grain: '月累计' },
  { id: 'camera_rate_month', name: '月度摄像头在线率', module: '视频监控', grain: '月度' },
  { id: 'ai_done', name: '月度已处置AI预警数', module: 'AI应用', grain: '月度' },
  { id: 'ai_total', name: '月度生成AI预警数', module: 'AI应用', grain: '月度' },
  { id: 'report_days', name: '月度已填报天数', module: '每日施工作业', grain: '月度' },
  { id: 'ended_days', name: '月度已结束自然日天数', module: '每日施工作业', grain: '月度' },
  { id: 'duty_done', name: '月度已完整上报值班表周数', module: '值班表', grain: '月度' },
  { id: 'duty_due', name: '月度应报值班表周数', module: '值班表', grain: '月度' },
  { id: 'meeting_done', name: '月度已上报监理例会次数', module: '监理例会', grain: '月度' },
  { id: 'meeting_due', name: '月度应召开监理例会次数', module: '监理例会', grain: '月度' },
  { id: 'labor_total', name: '月度生成实名制预警数', module: '人员实名制', grain: '月度' },
  { id: 'labor_closed', name: '月度已关闭实名制预警数', module: '人员实名制', grain: '月度' },
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
    id: 'crane',
    name: '塔吊报警强度',
    cap: 10,
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
    name: '每日施工作业填报率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。填报率 = 已填报天数 / 应填报天数（已结束自然日天数）。不免除周末、节假日、停工日',
    not_involved: '上月应填报天数为 0',
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
    id: 'duty_report',
    name: '值班表上报完成率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。按自然周（周一至周日）统计；项目每周 7 天 × 4 个班次全部排满值班表记为已上报。完成率 = 已完整上报周数 / 应报周数；跨月周按周一所在月归属',
    not_involved: '应报值班周数为 0',
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
    id: 'meeting_report',
    name: '监理例会上报完成率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。监理例会每周 1 次，应召开次数 = 当月自然周数（周一至周日为一周，跨月周按周一所在月归属）；已上报 = 当月已提交监理例会纪要的次数。完成率 = 已上报次数 / 应召开次数',
    not_involved: '应召开例会次数为 0',
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
    id: 'labor_warn',
    name: '实名制预警处置率',
    cap: 10,
    value_unit: '百分比',
    calc_rule: '每月 1 日统计上月。处置率 = 已处置（已关闭）预警数 / 上月生成实名制预警数；已读、未读、待处理均不算处置',
    not_involved: '上月生成实名制预警数为 0（含未接入实名制）',
    bands: [
      { min: 100, max: 100, min_inclusive: true, max_inclusive: true, deduct: 0 },
      { min: 90, max: 100, min_inclusive: false, max_inclusive: false, deduct: 1 },
      { min: 80, max: 90, min_inclusive: false, max_inclusive: true, deduct: 2 },
      { min: 70, max: 80, min_inclusive: false, max_inclusive: true, deduct: 3 },
      { min: 60, max: 70, min_inclusive: false, max_inclusive: true, deduct: 4 },
      { min: null, max: 60, min_inclusive: false, max_inclusive: true, deduct: 7 },
    ],
  },
]

/* ------------------------------------------------------------------ *
 * 考核类型与指标分类（2026-11-05 新增）
 *  - 每个项目固定一种考核类型（前期/施工/收尾），可单独调整；
 *  - 不同类型启用不同指标、不同扣分上限（每类合计 100 分）；
 *  - 排名按综合得分混排，表格标注项目类型。
 * ------------------------------------------------------------------ */

export const INDICATOR_CATEGORIES = [
  { id: 'progress', name: '施工进度', desc: '进度计划、作业申报、里程碑' },
  { id: 'coc', name: 'COC 调度', desc: '调度会、值班、例会、任务单' },
  { id: 'safety', name: '安全管理及隐患管控', desc: '巡检、隐患、危大、人员与设备' },
  { id: 'quality', name: '质量管控', desc: '验评、隐患、报审、材料与样板' },
  { id: 'pre', name: '前期专项', desc: '报审报批、定样、开工条件（前期类型）' },
  { id: 'close', name: '收尾专项', desc: '验收、资料、缺陷整改（收尾类型）' },
]

export const ASSESSMENT_TYPES = [
  { id: 'pre', name: '前期', desc: '项目前期筹备：报审报批、定样、开工条件' },
  { id: 'build', name: '施工', desc: '施工实施阶段：进度、安全、质量、调度' },
  { id: 'close', name: '收尾', desc: '收尾阶段：验收、资料、缺陷整改' },
]

/**
 * 各考核类型下指标的扣分上限（每类合计 100 分）
 * 未列出的指标在該类型下不参与考核。
 */
export const ASSESSMENT_TYPE_CAPS = {
  pre: {
    work_apply: 10,
    daily_work: 5,
    duty_report: 5,
    meeting_report: 5,
    manage_att: 8,
    inspect: 8,
    hazard: 9,
    brand_apply: 12,
    mat_doc: 8,
    mat_sample: 12,
    plan_approve: 10,
    scheme_approve: 8,
  },
  build: {
    progress_plan: 12,
    work_apply: 8,
    milestone: 5,
    daily_work: 5,
    duty_report: 5,
    meeting_report: 5,
    inspect: 7,
    hazard: 8,
    hazard_overdue: 4,
    manage_att: 6,
    crane: 4,
    camera: 2,
    ai: 2,
    labor_warn: 2,
    qm_inspect: 10,
    qm_hazard: 10,
    brand_apply: 5,
  },
  close: {
    battle_task: 10,
    task_order: 10,
    hazard: 10,
    hazard_overdue: 8,
    inspect: 7,
    qm_inspect: 10,
    qm_pass: 10,
    qm_hazard: 5,
    asbuilt: 12,
    defect_close: 10,
    archive_doc: 8,
  },
}

const typeCapState = JSON.parse(JSON.stringify(ASSESSMENT_TYPE_CAPS))

/** 现有 10 个指标的分类归属 */
const BASE_INDICATOR_CATEGORY = {
  inspect: 'safety',
  hazard: 'safety',
  manage_att: 'safety',
  crane: 'safety',
  camera: 'safety',
  ai: 'safety',
  daily_work: 'coc',
  duty_report: 'coc',
  meeting_report: 'coc',
  labor_warn: 'safety',
}
ASSESSMENT_INDICATORS.forEach((item) => {
  item.category = BASE_INDICATOR_CATEGORY[item.id] || 'safety'
})

/** 通用分档（配置页展示用；实际扣分由台账统计值按分档匹配） */
function genericBands() {
  return [
    { min: 90, max: 100, min_inclusive: false, max_inclusive: true, deduct: 0 },
    { min: 80, max: 90, min_inclusive: false, max_inclusive: true, deduct: 1 },
    { min: 70, max: 80, min_inclusive: false, max_inclusive: true, deduct: 2 },
    { min: 60, max: 70, min_inclusive: false, max_inclusive: true, deduct: 3 },
    { min: null, max: 60, min_inclusive: false, max_inclusive: true, deduct: 5 },
  ]
}

/** 指标工厂（新增指标统一结构） */
function makeIndicator(id, name, category, value_unit, calc_rule, not_involved) {
  return { id, name, category, cap: 0, value_unit, calc_rule, not_involved, bands: genericBands() }
}

/** 新增指标（先全部列出，cap 由类型配置决定；未分配 cap 表示暂不参与计分） */
const EXTRA_INDICATORS = [
  // 施工进度
  makeIndicator('progress_plan', '月度进度计划完成率', 'progress', '百分比', '每月 1 日统计上月。完成率 = 实际完成工程量 / 计划工程量', '无计划工程量'),
  makeIndicator('work_apply', '工程作业申报及时率', 'progress', '百分比', '按截止时间统计。及时率 = 按期提交单数 / 应提交单数', '无应提交作业'),
  makeIndicator('milestone', '关键节点按期达成率', 'progress', '百分比', '按里程碑计划统计。达成率 = 按期达成节点数 / 应达成节点数', '本期无应达成节点'),
  makeIndicator('battle_task', '挂图作战任务完成率', 'progress', '百分比', '完成率 = 已完成任务数 / 已下达任务数', '本期无下达任务'),
  // COC 调度
  makeIndicator('danger_report', '危险作业上报及时率', 'coc', '百分比', '及时率 = 按时上报条数 / 应上报条数', '本期无危险作业'),
  makeIndicator('dispatch_hazard', '调度隐患闭环率', 'coc', '百分比', '闭环率 = 调度来源已闭环数 / 调度来源新增数', '本期无调度隐患'),
  makeIndicator('task_order', '调度任务单按期办结率', 'coc', '百分比', '办结率 = 按期办结单数 / 应办结单数', '本期无任务单'),
  makeIndicator('sampling_coop', '隐患抽检配合率', 'coc', '百分比', '配合率 = 已完成抽检隐患数 / 已下发抽检隐患数', '本期无抽检任务'),
  // 安全管理及隐患管控
  makeIndicator('inspect_overdue', '巡检任务逾期率', 'safety', '百分比', '逾期率 = 逾期未完成任务数 / 应完成任务数', '本期无巡检任务'),
  makeIndicator('hazard_overdue', '隐患逾期未闭环数', 'safety', '条', '按条数扣分。统计期末逾期未闭环隐患条数', '本期无逾期隐患'),
  makeIndicator('major_hazard', '重大隐患处置及时率', 'safety', '百分比', '及时率 = 按期处置重大隐患数 / 重大隐患总数', '本期无重大隐患'),
  makeIndicator('major_control', '危大工程管控要点落实率', 'safety', '百分比', '落实率 = 已落实管控项 / 应落实管控项', '本期无危大工程'),
  makeIndicator('major_patrol', '危大工程巡视频次完成率', 'safety', '百分比', '完成率 = 实际巡视次数 / 应巡视次数', '本期无巡视要求'),
  makeIndicator('risk_control', '风险点管控到位率', 'safety', '百分比', '到位率 = 已落实管控风险点数 / 应管控风险点数', '本期无风险点'),
  // 质量管控
  makeIndicator('qm_inspect', '质量验评任务完成率', 'quality', '百分比', '完成率 = 已完成验收任务数 / 应验收任务数', '本期无验收任务'),
  makeIndicator('qm_pass', '验收一次通过率', 'quality', '百分比', '通过率 = 一次通过任务数 / 验收任务数', '本期无验收任务'),
  makeIndicator('qm_hazard', '质量隐患整改率', 'quality', '百分比', '整改率 = 已闭环质量隐患数 / 新增质量隐患数', '本期无质量隐患'),
  makeIndicator('qm_hazard_overdue', '质量隐患逾期数', 'quality', '条', '按条数扣分。统计期末逾期未闭环质量隐患条数', '本期无逾期质量隐患'),
  makeIndicator('brand_apply', '品牌报审一次通过率', 'quality', '百分比', '通过率 = 一次通过报审数 / 报审总数', '本期无品牌报审'),
  makeIndicator('mat_doc', '材料设备进场资料齐全率', 'quality', '百分比', '齐全率 = 资料齐全批次 / 进场批次', '本期无材料设备进场'),
  makeIndicator('sample_pass', '样板验收合格率', 'quality', '百分比', '合格率 = 验收合格样板数 / 应做样板数', '本期无样板任务'),
  // 前期专项
  makeIndicator('mat_sample', '材料设备定样完成率', 'pre', '百分比', '完成率 = 已定样材料设备数 / 应定样数', '本期无定样要求'),
  makeIndicator('plan_approve', '进度计划报批及时率', 'pre', '百分比', '及时率 = 按期报批计划数 / 应报批计划数', '本期无报批要求'),
  makeIndicator('scheme_approve', '方案报审及时率', 'pre', '百分比', '及时率 = 按期报审方案数 / 应报审方案数', '本期无方案报审'),
  // 收尾专项
  makeIndicator('asbuilt', '实模一致验收完成率', 'close', '百分比', '完成率 = 已完成验收项 / 应验收项', '本期无实模验收'),
  makeIndicator('defect_close', '缺陷整改闭环率', 'close', '百分比', '闭环率 = 已闭环缺陷数 / 缺陷总数', '本期无缺陷'),
  makeIndicator('archive_doc', '竣工资料完整率', 'close', '百分比', '完整率 = 已归档资料项 / 应归档资料项', '本期无归档要求'),
  makeIndicator('handover', '移交保修责任落实率', 'close', '百分比', '落实率 = 已落实移交事项 / 应落实事项', '本期无移交事项'),
  makeIndicator('settle_doc', '结算资料提交及时率', 'close', '百分比', '及时率 = 按期提交结算资料数 / 应提交数', '本期无结算要求'),
]
ASSESSMENT_INDICATORS.push(...EXTRA_INDICATORS)

/** 指标 id → 分类名 */
function categoryNameOf(categoryId) {
  return INDICATOR_CATEGORIES.find((item) => item.id === categoryId)?.name || categoryId
}

/** 考核类型名 */
function typeNameOf(typeId) {
  return ASSESSMENT_TYPES.find((item) => item.id === typeId)?.name || typeId
}

/** 指标在指定类型下的扣分上限（0 表示该类型不参与） */
function typeCapOf(typeId, indicatorId) {
  return Number(typeCapState[typeId]?.[indicatorId] || 0)
}

/** 某指标在三个考核类型下的扣分上限（配置页展示用） */
export function getIndicatorTypeCaps(indicatorId) {
  return ASSESSMENT_TYPES.reduce(
    (acc, type) => ({ ...acc, [type.id]: typeCapOf(type.id, indicatorId) }),
    {},
  )
}

/** 每类型独立的指标分档：typeId -> indicatorId -> bands（未配置时继承该指标的通用分档） */
const typeBandState = {}

/**
 * 每类型下「被关闭指标」的扣分上限记忆：typeId -> indicatorId -> 关闭前的上限。
 * 关闭指标＝该类型下上限置 0（排名/台账按上限>0 过滤，自动不参与）；
 * 重新启用时用这里的记忆回填，避免用户重填分值。
 */
const typeDisabledCapState = {}

function disabledCapOf(typeId, indicatorId) {
  return Number(typeDisabledCapState[typeId]?.[indicatorId] || 0)
}

function bandsOf(typeId, indicatorId) {
  const custom = typeBandState[typeId]?.[indicatorId]
  if (custom && custom.length) return custom.map((band) => ({ ...band }))
  const state = indicatorState.find((row) => row.id === indicatorId)
  return (state?.bands || genericBands()).map((band) => ({ ...band }))
}

/** 某考核类型下的全部指标配置（含未参与项，供类型指标页使用） */
export function listTypeIndicators(typeId) {
  return INDICATOR_CATEGORIES.map((category) => {
    const indicators = ASSESSMENT_INDICATORS.filter((item) => item.category === category.id).map((item) => {
      const cap = typeCapOf(typeId, item.id)
      const state = indicatorState.find((row) => row.id === item.id)
      return {
        id: item.id,
        name: item.name,
        value_unit: item.value_unit,
        calc_rule: item.calc_rule,
        not_involved: item.not_involved,
        indicator_enabled: !!state?.enabled,
        /** 该类型下是否启用（上限 > 0 即启用） */
        enabled: cap > 0,
        /** 关闭前记住的扣分上限，重新启用时回填 */
        last_cap: disabledCapOf(typeId, item.id),
        involved: cap > 0,
        cap,
        bands: bandsOf(typeId, item.id),
        band_custom: !!typeBandState[typeId]?.[item.id],
      }
    })
    const enabledRows = indicators.filter((item) => item.enabled)
    return {
      ...category,
      indicators,
      involvedCount: enabledRows.length,
      enabledCount: enabledRows.length,
      capTotal: Math.round(enabledRows.reduce((sum, item) => sum + item.cap, 0) * 10) / 10,
    }
  })
}

/** 保存某类型的指标启用状态与扣分上限（已启用指标的上限合计须为 100 分） */
export function saveTypeIndicatorConfig(typeId, entries) {
  if (!ASSESSMENT_TYPES.some((type) => type.id === typeId)) return { ok: false, msg: '未知的考核类型' }
  const caps = {}
  const disabled = { ...(typeDisabledCapState[typeId] || {}) }
  let enabledCount = 0
  for (const item of entries || []) {
    const previous = typeCapOf(typeId, item.id)
    if (!item.involved) {
      // 关闭：记住关闭前的上限，供重新启用时回填
      if (previous > 0) disabled[item.id] = previous
      continue
    }
    const cap = Number(item.cap)
    if (Number.isNaN(cap) || cap <= 0) return { ok: false, msg: `「${item.name}」的扣分上限须大于 0 分` }
    delete disabled[item.id]
    caps[item.id] = Math.round(cap * 10) / 10
    enabledCount += 1
  }
  typeDisabledCapState[typeId] = disabled
  if (!enabledCount) return { ok: false, msg: '该类型至少启用一项考核指标' }
  return saveTypeCaps(typeId, caps)
}

/** 保存某类型下指定指标的分档规则 */
export function saveTypeIndicatorBands(typeId, indicatorId, bands) {
  const list = (bands || []).map((band) => ({
    min: band.min === null || band.min === undefined || band.min === '' ? null : Number(band.min),
    max: Number(band.max),
    deduct: Number(band.deduct),
  }))
  if (!list.length) return { ok: false, msg: '至少保留一个分档' }
  const bad = list.find((band) => Number.isNaN(band.max) || Number.isNaN(band.deduct) || band.deduct < 0)
  if (bad) return { ok: false, msg: '分档的最大值与扣分须为不小于 0 的数字' }
  const badRange = list.find((band) => band.min !== null && !Number.isNaN(band.min) && band.min >= band.max)
  if (badRange) return { ok: false, msg: '分档的最小值须小于最大值' }
  typeBandState[typeId] = { ...(typeBandState[typeId] || {}), [indicatorId]: list }
  return { ok: true }
}

/** 恢复某类型下指定指标的分档为通用分档 */
export function resetTypeIndicatorBands(typeId, indicatorId) {
  if (typeBandState[typeId]?.[indicatorId]) {
    delete typeBandState[typeId][indicatorId]
  }
  return { ok: true }
}

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
  crane: [
    { kind: 'field', field: 'crane_alarm_month' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'crane_machine_days' },
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
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'ended_days' },
  ],
  duty_report: [
    { kind: 'field', field: 'duty_done' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'duty_due' },
  ],
  meeting_report: [
    { kind: 'field', field: 'meeting_done' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'meeting_due' },
  ],
  labor_warn: [
    { kind: 'field', field: 'labor_closed' },
    { kind: 'op', op: 'div' },
    { kind: 'field', field: 'labor_total' },
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
  0: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  1: [0, 2, 0, null, 1, 0, 2, 0, 2, 0],
  2: [7, 7, 4, 3.2, 3, 2, 7, 8, 4, 2],
  3: [7, 7, 7, 5.6, 7, 7, 7, 10, 10, 7],
  4: [2, 2, 1, 0.8, 7, 2, 2, 2, 0, 2],
  5: [2, 7, 2, 1.6, 2, 3, 5, 5, 3, 5],
  6: [0, 1, 3, 0, 1, 1, 0, 0, 1, 2],
  7: [2, 1, 2, 0, 2, 1, 0, 2, 2, 0],
}

const NOT_INVOLVED_NOTE = {
  crane: '本周期无在场塔吊',
  duty_report: '本周期无应报值班表',
  meeting_report: '本周期无应召开监理例会',
  daily_work: '本周期无可填报日期',
  labor_warn: '本周期无实名制预警',
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

/** 项目考核类型（每个项目固定一种，可单独调整；演示按项目序位分配，保证三类均有代表） */
const TYPE_BY_INDEX = ['pre', 'pre', 'build', 'build', 'build', 'close', 'close']
const projectTypeState = {}
catalog.forEach((item, index) => {
  projectTypeState[item.id] = TYPE_BY_INDEX[index] || 'build'
})

/** 期次序号：prev 为已归档历史期，current 为当期（切换类型只影响当期及以后） */
const PERIOD_ORDER = {
  'week-prev': 0,
  'week-current': 1,
  'month-prev': 0,
  'month-current': 1,
  'quarter-prev': 0,
  'quarter-current': 1,
}
const CURRENT_PERIOD_ORDER = 1
/** 项目考核类型变更记录：{ previousType, changedOrder }，用于历史期按原类型计分 */
const typeHistoryState = {}

/** 指定项目在指定期次生效的考核类型（历史期不因后续调整重算） */
function typeOfPeriod(projectId, periodId) {
  const order = PERIOD_ORDER[periodId] ?? CURRENT_PERIOD_ORDER
  const history = typeHistoryState[projectId] || []
  let type = projectTypeState[projectId] || 'build'
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i].changedOrder > order) type = history[i].previousType
    else break
  }
  return type
}

export function getProjectAssessmentType(projectId) {
  return projectTypeState[projectId] || 'build'
}

/** 调整项目考核类型（历史期不重算） */
export function saveProjectAssessmentType(projectId, typeId) {
  if (!ASSESSMENT_TYPES.some((item) => item.id === typeId)) return { ok: false, msg: '未知的考核类型' }
  if (!catalog.some((item) => item.id === projectId)) return { ok: false, msg: '未找到该考核项目' }
  const previousType = projectTypeState[projectId]
  if (previousType === typeId) return { ok: true, msg: '考核类型未变化' }
  typeHistoryState[projectId] = [
    ...(typeHistoryState[projectId] || []),
    { previousType, changedOrder: CURRENT_PERIOD_ORDER },
  ]
  projectTypeState[projectId] = typeId
  return { ok: true, msg: `已调整为「${typeNameOf(typeId)}」，历史期得分不重算` }
}

/** 各类型指标构成（配置页展示：分类 → 指标 → 扣分上限） */
export function listTypeCapRows(typeId) {
  return INDICATOR_CATEGORIES.map((category) => {
    const indicators = ASSESSMENT_INDICATORS.filter((item) => item.category === category.id)
      .map((item) => ({ id: item.id, name: item.name, value_unit: item.value_unit, cap: typeCapOf(typeId, item.id) }))
      .filter((item) => item.cap > 0)
    return {
      ...category,
      indicators,
      capTotal: Math.round(indicators.reduce((sum, item) => sum + item.cap, 0) * 10) / 10,
    }
  }).filter((category) => category.indicators.length)
}

/** 校验某类型下扣分上限合计是否为 100 分 */
export function validateTypeCaps(typeId, caps) {
  const entries = Object.entries(caps || {})
  if (!entries.length) return { ok: false, msg: '至少为一个指标分配扣分上限' }
  const bad = entries.find(([, cap]) => Number.isNaN(Number(cap)) || Number(cap) < 0)
  if (bad) return { ok: false, msg: '扣分上限须为不小于 0 的数字' }
  const total = Math.round(entries.reduce((sum, [, cap]) => sum + Number(cap), 0) * 10) / 10
  if (total !== 100) return { ok: false, msg: `「${typeNameOf(typeId)}」类型的扣分上限合计须为 100 分，当前为 ${total} 分` }
  return { ok: true }
}

/** 保存某类型的指标扣分上限 */
export function saveTypeCaps(typeId, caps) {
  const check = validateTypeCaps(typeId, caps)
  if (!check.ok) return check
  typeCapState[typeId] = Object.entries(caps)
    .map(([id, cap]) => [id, Number(cap)])
    .filter(([, cap]) => cap > 0)
    .reduce((acc, [id, cap]) => ({ ...acc, [id]: Math.round(cap * 10) / 10 }), {})
  return { ok: true }
}

/** 各类型扣分上限合计（用于页面展示校验状态） */
export function listTypeTotals() {
  return ASSESSMENT_TYPES.map((type) => ({
    ...type,
    total: Math.round(Object.values(typeCapState[type.id] || {}).reduce((sum, cap) => sum + Number(cap), 0) * 10) / 10,
    indicatorCount: Object.keys(typeCapState[type.id] || {}).length,
  }))
}

let excludeHistorical = true

function isHistoricalProject(projectId) {
  const item = catalog.find((row) => row.id === projectId)
  return item?.status === '历史'
}

function projectUsesIndicator(projectId, indicatorId) {
  if (excludeHistorical && isHistoricalProject(projectId)) return false
  return !!projectMatrix[projectId]?.[indicatorId]
}

export function isProjectIncluded(projectId) {
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
  // 去年同期（-yoy）演示数据：表现略差，用于同比对比
  const factor = String(periodId).endsWith('-yoy') ? 1.35 : 1
  if (kind === 'week') return Math.min(cap, Math.round(base * factor * 10) / 10)
  if (kind === 'month') return Math.min(cap, Math.max(0, Math.round((base - (indicatorIndex % 2 === 0 ? 1 : 0)) * factor * 10) / 10))
  return Math.min(cap, Math.round((base + (indicatorIndex % 3 === 0 ? 1 : 0)) * factor * 10) / 10)
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

function rawMetricText(item, deduct) {
  if (item.value_unit === '百分比') {
    const rate = Math.max(0, 100 - deduct * 4)
    const count = (base) => `${Math.round((base * rate) / 100)}`
    const pct = rate.toFixed(1)
    switch (item.id) {
      case 'inspect':
        return `本月巡检任务 40 项，已完成 ${count(40)} 项，完成比例 ${pct}%`
      case 'hazard':
        return `本月创建隐患 30 项，已关闭 ${count(30)} 项，整改率 ${pct}%`
      case 'manage_att':
        return `本月应出勤 312 人次，实际出勤 ${count(312)} 人次，平均出勤率 ${pct}%`
      case 'camera':
        return `本月已结束日期 30 天，日均在线率 ${pct}%`
      case 'ai':
        return `本月生成 AI 预警 25 条，已处置 ${count(25)} 条，处置率 ${pct}%`
      case 'daily_work':
        return `本月应填报 30 天，已填报 ${count(30)} 天，填报率 ${pct}%`
      case 'duty_report':
        return `本月应报值班表 4 周，已完整上报 ${count(4)} 周，完成率 ${pct}%`
      case 'meeting_report':
        return `本月应召开监理例会 4 次，已上报 ${count(4)} 次，完成率 ${pct}%`
      case 'labor_warn':
        return `本月生成实名制预警 20 条，已关闭 ${count(20)} 条，处置率 ${pct}%`
      default:
        return `指标值 ${pct}%`
    }
  }
  if (item.value_unit === '次/台·日') {
    const intensity = deduct === 0 ? 0 : deduct * 2
    return `本月塔吊累计报警 ${Math.round(intensity * 30)} 次，累计在场 30 台日，报警强度 ${intensity.toFixed(1)} 次/台·日`
  }
  return ''
}

function hashSeed(text) {
  let h = 2166136261
  const str = String(text)
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (Math.abs(h) % 10000) / 10000
}

/** 新增指标演示扣分：项目表现档位 × 确定性伪随机（0 ~ cap） */
function seededDeduct(projectId, indicatorId, periodId, cap) {
  if (cap <= 0) return null
  const index = projectIndex(projectId)
  const quality = index % 3 === 0 ? 1 : index % 3 === 1 ? 0.72 : 0.46
  const seed = hashSeed(`${projectId}|${indicatorId}|${periodId}`)
  const ratio = Math.min(1, seed * (1.25 - quality))
  return Math.round(cap * ratio * 10) / 10
}

function buildLines(projectIndexValue, periodId, projectId) {
  const typeId = typeOfPeriod(projectId, periodId)
  return indicatorState
    .filter((item) => item.enabled && projectUsesIndicator(projectId, item.id))
    .map((item) => {
      // 按项目考核类型取该指标的扣分上限；为 0 表示该类型不考核此指标
      const cap = typeCapOf(typeId, item.id)
      if (cap <= 0) return null
      const indicatorIndex = ASSESSMENT_INDICATORS.findIndex((row) => row.id === item.id)
      const custom = indicatorIndex < 0
      const isLegacy = indicatorIndex >= 0 && indicatorIndex < 10
      const raw = custom
        ? 0
        : isLegacy
          ? deductOf(projectIndexValue, indicatorIndex, periodId)
          : seededDeduct(projectId, item.id, periodId, cap)
      const involved = raw !== null
      const deduct = involved ? Math.round(Math.min(cap, raw) * 10) / 10 : 0
      const category = item.category || 'safety'
      const catName = categoryNameOf(category)
      return {
        indicator_id: item.id,
        indicator_name: item.name,
        category,
        category_name: catName,
        cap,
        involved,
        value_text: custom ? '--' : (involved ? valueText(item, deduct) : ''),
        raw_text: custom
          ? '--'
          : involved
            ? isLegacy
              ? rawMetricText(item, deduct)
              : `${catName}指标，本期扣 ${deduct} 分`
            : (NOT_INVOLVED_NOTE[item.id] || '不涉及'),
        deduct,
        note: custom ? '公式不重算，本项扣 0 分' : (involved ? (deduct > 0 ? '未达标' : '达标') : (NOT_INVOLVED_NOTE[item.id] || '不涉及')),
      }
    })
    .filter(Boolean)
}

function projectIndex(projectId) {
  return catalog.findIndex((item) => item.id === projectId)
}

export function listAssessmentProjects() {
  return catalog.map((item) => ({
    project_id: item.id,
    project_name: item.label,
    project_full_name: item.fullName || item.label,
    project_status: !item.status || item.status === '--' ? '--' : item.status,
    assessment_type: getProjectAssessmentType(item.id),
    assessment_type_name: typeNameOf(getProjectAssessmentType(item.id)),
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

const PERIOD_PREV = {
  'week-current': 'week-prev',
  'month-current': 'month-prev',
  'quarter-current': 'quarter-prev',
}

function periodLabelOf(periodId) {
  for (const group of PERIOD_GROUPS) {
    const hit = (group.options || []).find((item) => item.id === periodId)
    if (hit) return hit.label
  }
  return periodId
}

function round1(value) {
  return Math.round(value * 10) / 10
}

/** 指标整改建议话术（自动结论文案用） */
const INDICATOR_ADVICE = {
  inspect: '加强巡检任务派发与过程督促，确保按期完成',
  hazard: '压实隐患整改责任，逾期未闭环隐患需挂牌督办',
  manage_att: '严格考勤管理，落实施工与监理人员到岗履职',
  crane: '加强塔吊日常检查与报警处置，降低报警强度',
  camera: '排查离线摄像头并限期恢复，保障在线率',
  ai: '提高 AI 预警响应与处置效率',
  daily_work: '落实每日施工作业按时填报',
  duty_report: '提前编排并按时上报值班表',
  meeting_report: '按期召开监理例会并上传纪要',
  labor_warn: '及时处置实名制预警，规范用工管理',
  progress_plan: '跟踪月度进度计划执行，偏差及时纠偏',
  work_apply: '按截止时间提交工程作业申报',
  milestone: '盯控关键节点，提前暴露滞后风险',
  battle_task: '加快挂图作战任务销项',
  hazard_overdue: '建立逾期隐患清单，逐条销项',
  brand_apply: '提前准备品牌报审资料，提高一次通过率',
  mat_doc: '完善材料设备进场资料，避免资料缺失',
  mat_sample: '按期完成材料设备定样',
  qm_inspect: '按节点推进质量验评，及时提交验收',
  qm_pass: '提升一次验收通过率，减少返工',
  qm_hazard: '加强质量隐患整改闭环',
  asbuilt: '加快实模一致验收',
  defect_close: '逐项闭环缺陷整改',
}

export function buildRanking(periodId) {
  const rows = catalog
    .filter((item) => isProjectIncluded(item.id))
    .map((item) => {
      const index = projectIndex(item.id)
      const lines = buildLines(index, periodId, item.id)
      const typeId = typeOfPeriod(item.id, periodId)
      const deductTotal = round1(lines.reduce((sum, line) => sum + line.deduct, 0))
      const score = Math.max(0, round1(100 - deductTotal))
      const categoryScores = INDICATOR_CATEGORIES.map((category) => {
        const catLines = lines.filter((line) => line.category === category.id)
        const cap = round1(catLines.reduce((sum, line) => sum + line.cap, 0))
        if (!cap) return null
        const deduct = round1(catLines.reduce((sum, line) => sum + line.deduct, 0))
        return {
          category: category.id,
          name: category.name,
          cap,
          deduct,
          score: Math.max(0, round1(cap - deduct)),
          indicatorCount: catLines.length,
        }
      }).filter(Boolean)
      return {
        project_id: item.id,
        project_name: item.label,
        assessment_type: typeId,
        assessment_type_name: typeNameOf(typeId),
        total_cap: 100,
        score,
        deduct_total: deductTotal,
        grade: gradeName(score),
        lines,
        category_scores: categoryScores,
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
    assessment_type: ranked.assessment_type,
    assessment_type_name: ranked.assessment_type_name,
    score: ranked.score,
    deduct_total: ranked.deduct_total,
    grade: ranked.grade,
    rank: ranked.rank,
    lines: ranked.lines,
    category_scores: ranked.category_scores,
  }
}

export function summarizeRanking(rows) {
  const count = rows.length
  const avg = count ? round1(rows.reduce((sum, row) => sum + row.score, 0) / count) : null
  const grades = {}
  gradeState.forEach((item) => {
    grades[item.name] = rows.filter((row) => row.grade === item.name).length
  })
  const typeStats = ASSESSMENT_TYPES.map((type) => ({
    ...type,
    count: rows.filter((row) => row.assessment_type === type.id).length,
  }))
  return { count, avg, grades, typeStats }
}

/**
 * 排名结论（指标卡下方的总结性/结论性内容）
 * 5 段：总体情况 / 尾部短板 / 共性短板指标 / 重点提示 / 整改建议（各段同时输出短句 short，供一行展示）
 * 全部由排名数据规则化生成，可复现、不做主观发挥。
 */
export function buildRankingConclusion(periodId) {
  const rows = buildRanking(periodId)
  const periodLabel = periodLabelOf(periodId)
  if (!rows.length) {
    return { empty: true, periodLabel, overall: null, top: null, bottom: null, weakIndicators: [], alerts: [], suggestions: [] }
  }

  const prevRows = PERIOD_PREV[periodId] ? buildRanking(PERIOD_PREV[periodId]) : []
  const avg = round1(rows.reduce((sum, row) => sum + row.score, 0) / rows.length)
  const prevAvg = prevRows.length ? round1(prevRows.reduce((sum, row) => sum + row.score, 0) / prevRows.length) : null
  const avgDelta = prevAvg === null ? null : round1(avg - prevAvg)
  const gradeStats = gradeState.map((item) => ({ name: item.name, color: item.color, count: rows.filter((row) => row.grade === item.name).length }))
  const typeStats = ASSESSMENT_TYPES.map((type) => ({ ...type, count: rows.filter((row) => row.assessment_type === type.id).length }))

  // 指标扣分聚合
  const indicatorMap = new Map()
  rows.forEach((row) => {
    row.lines.forEach((line) => {
      if (!indicatorMap.has(line.indicator_id)) {
        indicatorMap.set(line.indicator_id, {
          indicator_id: line.indicator_id,
          name: line.indicator_name,
          category_name: line.category_name,
          cap: line.cap,
          totalDeduct: 0,
          projectCount: 0,
        })
      }
      const item = indicatorMap.get(line.indicator_id)
      item.totalDeduct = round1(item.totalDeduct + line.deduct)
      if (line.deduct > 0) item.projectCount += 1
    })
  })
  const indicatorList = [...indicatorMap.values()].filter((item) => item.totalDeduct > 0).sort((a, b) => b.totalDeduct - a.totalDeduct)
  const weakIndicators = indicatorList.slice(0, 3).map((item) => ({
    ...item,
    avgDeduct: round1(item.totalDeduct / rows.length),
    capRatio: item.cap ? Math.round((item.totalDeduct / (item.cap * rows.length)) * 100) : 0,
  }))

  // 重点提示：环比（较上月）/ 同比（去年同期）
  const worstGrade = gradeState[gradeState.length - 1]
  const worstProjects = rows.filter((row) => row.grade === worstGrade?.name)

  function compareWith(baseRows) {
    if (!baseRows.length) return null
    const baseMap = new Map(baseRows.map((row) => [row.project_id, row.score]))
    const baseAvg = round1(baseRows.reduce((sum, row) => sum + row.score, 0) / baseRows.length)
    const deltas = rows
      .filter((row) => baseMap.has(row.project_id))
      .map((row) => ({ project_name: row.project_name, delta: round1(row.score - baseMap.get(row.project_id)) }))
      .sort((a, b) => b.delta - a.delta)
    return {
      baseAvg,
      avgDelta: round1(avg - baseAvg),
      up: deltas.filter((item) => item.delta > 0).length,
      down: deltas.filter((item) => item.delta < 0).length,
      flat: deltas.filter((item) => item.delta === 0).length,
      best: deltas[0] || null,
      worst: deltas[deltas.length - 1] || null,
    }
  }
  const mom = compareWith(prevRows)
  const yoy = String(periodId).startsWith('month') ? compareWith(buildRanking('month-yoy')) : null

  const bottomRow = rows[rows.length - 1]
  const bottomMain = (bottomRow.lines || []).filter((line) => line.deduct > 0).sort((a, b) => b.deduct - a.deduct)[0]

  const gradeText = gradeStats.filter((item) => item.count > 0).map((item) => `${item.name} ${item.count} 个`).join('、')
  const typeText = typeStats.filter((item) => item.count > 0).map((item) => `${item.name} ${item.count} 个`).join('、')

  // ① 总体情况
  const overall = {
    title: '总体情况',
    short: `${rows.length} 个项目 · 均分 ${avg} · ${gradeStats.filter((item) => item.count > 0).map((item) => `${item.name}${item.count}`).join('/')}`,
    text:
      `本期（${periodLabel}）纳入考核 ${rows.length} 个项目（${typeText}），平均得分 ${avg} 分` +
      (avgDelta === null ? '，上期无可比数据' : `，较上期${avgDelta >= 0 ? '提升' : '下降'} ${Math.abs(avgDelta)} 分`) +
      `；等级分布：${gradeText}。`,
    metrics: { count: rows.length, avg, avgDelta, grades: gradeStats, types: typeStats },
  }

  // ② 尾部短板
  const bottom = {
    title: '尾部短板',
    short: `${bottomRow.project_name} ${bottomRow.score} 分${bottomMain ? ` · ${bottomMain.indicator_name} 扣 ${bottomMain.deduct}` : ''}`,
    text:
      `末位为 ${bottomRow.project_name}（${bottomRow.assessment_type_name}），得分 ${bottomRow.score} 分、扣分 ${bottomRow.deduct_total} 分` +
      (bottomMain ? `，主要扣分项为「${bottomMain.indicator_name}」（扣 ${bottomMain.deduct} 分）。` : '。'),
    project_id: bottomRow.project_id,
    project_name: bottomRow.project_name,
    score: bottomRow.score,
    main_indicator: bottomMain?.indicator_name || '',
  }

  // ④ 共性短板
  const weakText = weakIndicators.length
    ? `本期扣分最集中的指标为：${weakIndicators
        .map((item) => `「${item.name}」合计扣 ${item.totalDeduct} 分（${item.projectCount} 个项目涉及，占该项满分 ${item.capRatio}%）`)
        .join('；')}。`
    : '本期各指标扣分均较低，未出现明显短板指标。'
  const weakShort = weakIndicators.length
    ? `${weakIndicators[0].name} ${weakIndicators[0].totalDeduct} 分${weakIndicators.length > 1 ? ` 等 ${weakIndicators.length} 项` : ''}`
    : '无明显短板'

  // ⑤ 重点提示：环比（较上期）/ 同比（去年同期）
  const alertItems = []
  if (mom) {
    alertItems.push({
      type: 'mom',
      short: `环比 ${mom.avgDelta >= 0 ? '+' : ''}${mom.avgDelta}`,
      text:
        `环比上月：平均分 ${mom.avgDelta >= 0 ? '提升' : '下降'} ${Math.abs(mom.avgDelta)} 分（上升 ${mom.up} 个、下降 ${mom.down} 个、持平 ${mom.flat} 个）` +
        (mom.best && mom.best.delta > 0 ? `；最大增幅 ${mom.best.project_name}（+${mom.best.delta} 分）` : '') +
        (mom.worst && mom.worst.delta < 0 ? `；最大降幅 ${mom.worst.project_name}（${mom.worst.delta} 分）` : '') +
        '。',
      projects: [],
    })
  }
  if (yoy) {
    alertItems.push({
      type: 'yoy',
      short: `同比 ${yoy.avgDelta >= 0 ? '+' : ''}${yoy.avgDelta}`,
      text: `同比去年同期：平均分 ${yoy.avgDelta >= 0 ? '提升' : '下降'} ${Math.abs(yoy.avgDelta)} 分（上升 ${yoy.up} 个、下降 ${yoy.down} 个、持平 ${yoy.flat} 个）。`,
      projects: [],
    })
  }
  if (worstProjects.length) {
    alertItems.push({
      type: 'grade',
      short: `${worstGrade.name}等级 ${worstProjects.length} 个`,
      text: `${worstGrade.name}等级项目 ${worstProjects.length} 个：${worstProjects.map((row) => row.project_name).join('、')}，需重点帮扶。`,
      projects: worstProjects.map((row) => row.project_name),
    })
  }
  if (!alertItems.length) {
    alertItems.push({
      type: 'none',
      short: '无',
      text: '暂无可比的上月或去年同期数据，本期无提示项。',
      projects: [],
    })
  }

  // ⑥ 整改建议
  const suggestions = weakIndicators.map((item) => ({
    indicator_id: item.indicator_id,
    name: item.name,
    text: INDICATOR_ADVICE[item.indicator_id] || `针对「${item.name}」制定专项改进措施，纳入下期考核跟踪`,
  }))
  const alertShort = alertItems.map((item) => item.short).filter(Boolean).join(' · ') || '无'
  const suggestionsShort = suggestions.length
    ? `${suggestions[0].name}${suggestions.length > 1 ? ` 等 ${suggestions.length} 项` : ''}`
    : '无'

  return {
    empty: false,
    periodLabel,
    overall,
    bottom,
    weakIndicators,
    weakText,
    weakShort,
    alerts: alertItems,
    alertShort,
    suggestions,
    suggestionsShort,
    generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  }
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
    if (!String(row.value_unit || '').trim()) return { ok: false, msg: `${String(row.name).trim() || '未命名指标'}：请填写单位` }
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
      value_unit: builtin
        ? (preset?.value_unit || origin?.value_unit || '')
        : String(row.value_unit ?? origin?.value_unit ?? '').trim(),
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

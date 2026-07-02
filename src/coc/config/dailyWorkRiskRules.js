/**
 * 每日施工作业 — 风险提醒规则配置与计算逻辑
 * PRD 变更时优先修改本文件中的规则定义与 evaluate 函数。
 */

const EMPTY_VALUES = new Set(['', '/', '—', '-', '无', 'null', 'undefined'])

export const DAILY_WORK_RISK_RULES = [
  {
    id: 'rule-01',
    name: '单日作业时长超限（疲劳作业风险）',
    description:
      '同一作业项单日持续时间超过16小时（或24小时不间断），存在人员疲劳作业、夜间施工监管缺位等重大安全隐患。',
    defaultEnabled: true,
    scope: 'record',
  },
  {
    id: 'rule-02',
    name: '同区段多类危险作业交叉（交叉作业风险）',
    description:
      '同一施工区域、同一时间段内，同时存在“动火作业”与“动土/吊装/高处作业”，易引发爆炸、坠落、物体打击等复合型事故，且措施中未说明空间隔离。',
    defaultEnabled: true,
    scope: 'batch',
  },
  {
    id: 'rule-03',
    name: '作业日期与报表日期不符',
    description:
      '填报的作业时间不在报表规定的统计周期内（如6月30日的报表中混入6月29日的作业记录），导致数据失效或监管遗漏。',
    defaultEnabled: true,
    scope: 'record',
  },
  {
    id: 'rule-04',
    name: '安全监管人员或监理信息未填报',
    description:
      '施工单位、监理单位的现场安全监管人手机号或姓名留空（或填“/”），导致紧急情况无法联系，违反《安全生产法》关于现场旁站的要求。',
    defaultEnabled: true,
    scope: 'record',
  },
  {
    id: 'rule-05',
    name: '管控措施大批量复制粘贴（针对性不足）',
    description:
      '不同施工区域、不同作业内容的管控措施文本完全一致（如所有动土作业都粘贴同一段“高温防中暑措施”），说明未针对具体工况进行风险评估。',
    defaultEnabled: true,
    scope: 'batch',
  },
  {
    id: 'rule-06',
    name: '特殊作业缺失高度/限高等关键安全参数',
    description:
      '高处作业未注明作业高度（米），吊装作业未注明净空限高数值，导致无法判断是否需要提级审批或是否触碰机场限高红线。',
    defaultEnabled: true,
    scope: 'record',
  },
  {
    id: 'rule-07',
    name: '核心管控区作业缺失飞行区施工审批描述',
    description:
      '施工区域包含“土面区”、“跑道”、“滑行道”、“控制区”、“卫星厅”等敏感词，但管控措施中未包含“飞行区审批”、“适航恢复”、“通行证”等必备合规表述。',
    defaultEnabled: true,
    scope: 'record',
  },
  {
    id: 'rule-08',
    name: '凌晨危险作业（00:00-06:00）缺乏提级管理说明',
    description:
      '凌晨时段施工属于高风险时段，若未明确注明“提级管控”、“夜间巡查频次”或“建设方领导带班”，则存在监管盲区。',
    defaultEnabled: true,
    scope: 'record',
  },
]

const FLIGHT_AREA_KEYWORDS = ['土面区', '跑道', '滑行道', '控制区', '飞行区', '卫星厅', '空侧']
const FLIGHT_COMPLIANCE_KEYWORDS = ['飞行区审批', '适航恢复', '通行证', '不停航施工', '民航监管']
const NIGHT_CONTROL_KEYWORDS = ['提级', '夜间巡查', '领导带班', '总监值班']
const HEIGHT_PATTERN = /\d+\s*[米mM]/
const LIFT_LIMIT_PATTERN = /(限高|净空).{0,8}\d+/i

export function isFieldEmpty(value) {
  const text = String(value ?? '').trim()
  return !text || EMPTY_VALUES.has(text)
}

export function parseDateTime(value) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const normalized = text.replace(/\./g, '-').replace('T', ' ')
  const date = new Date(normalized.replace(/-/g, '/'))
  return Number.isNaN(date.getTime()) ? null : date
}

export function diffHours(start, end) {
  const startAt = parseDateTime(start)
  const endAt = parseDateTime(end)
  if (!startAt || !endAt) return null
  let diffMs = endAt.getTime() - startAt.getTime()
  if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000
  return diffMs / (60 * 60 * 1000)
}

export function extractDatePart(value) {
  const text = String(value ?? '').trim()
  if (!text) return ''
  const match = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (!match) return ''
  const [, y, m, d] = match
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  const startA = parseDateTime(aStart)
  const endA = parseDateTime(aEnd)
  const startB = parseDateTime(bStart)
  const endB = parseDateTime(bEnd)
  if (!startA || !endA || !startB || !endB) return false
  return startA <= endB && startB <= endA
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .trim()
}

function textSimilarity(a, b) {
  const left = normalizeText(a)
  const right = normalizeText(b)
  if (!left || !right) return 0
  if (left === right) return 1
  const longer = left.length >= right.length ? left : right
  const shorter = left.length >= right.length ? right : left
  let matches = 0
  for (let i = 0; i < shorter.length; i += 1) {
    if (longer.includes(shorter[i])) matches += 1
  }
  return matches / longer.length
}

function createAlert(rule, level, message, recordId = null) {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    level,
    message,
    recordId,
  }
}

function evaluateRule01(record) {
  const hours = diffHours(record.startTime, record.endTime)
  if (hours == null) return null
  if (hours >= 24) {
    return createAlert(
      DAILY_WORK_RISK_RULES[0],
      'red',
      `作业时长 ${hours.toFixed(1)} 小时，达到 24 小时不间断阈值，触发红色预警。`,
      record.id,
    )
  }
  if (hours >= 16) {
    return createAlert(
      DAILY_WORK_RISK_RULES[0],
      'yellow',
      `作业时长 ${hours.toFixed(1)} 小时，超过 16 小时阈值，存在疲劳作业风险。`,
      record.id,
    )
  }
  return null
}

function evaluateRule02(records) {
  const alerts = []
  const groups = new Map()
  for (const record of records) {
    const key = `${record.reportDate || ''}__${record.workArea || ''}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(record)
  }

  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i]
        const b = group[j]
        if (!intervalsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) continue

        const categories = new Set(
          [a, b]
            .map((item) => String(item.dangerWorkCategory || '').trim())
            .filter(Boolean),
        )
        const hasFire = [...categories].some((c) => c.includes('动火'))
        const hasEarth = [...categories].some((c) => c.includes('动土'))

        if (hasFire && hasEarth) {
          alerts.push(
            createAlert(
              DAILY_WORK_RISK_RULES[1],
              'red',
              `区域「${a.workArea || '—'}」同时存在动火与动土交叉作业，触发红色预警。`,
              a.id,
            ),
          )
          continue
        }

        if (categories.size >= 3) {
          alerts.push(
            createAlert(
              DAILY_WORK_RISK_RULES[1],
              'yellow',
              `区域「${a.workArea || '—'}」同一时段存在 ${categories.size} 类危险作业交叉，触发黄色预警。`,
              a.id,
            ),
          )
        }
      }
    }
  }
  return alerts
}

function evaluateRule03(record) {
  const reportDate = String(record.reportDate || '').trim()
  if (!reportDate) return null
  const startDate = extractDatePart(record.startTime)
  const endDate = extractDatePart(record.endTime)
  if ((startDate && startDate !== reportDate) || (endDate && endDate !== reportDate)) {
    return createAlert(
      DAILY_WORK_RISK_RULES[2],
      'red',
      `作业日期与报表日期 ${reportDate} 不一致，数据无效，需退回修改。`,
      record.id,
    )
  }
  return null
}

function evaluateRule04(record) {
  const missing = []
  if (isFieldEmpty(record.contractorSafetyManager)) missing.push('施工单位现场安全监管人及手机号')
  if (isFieldEmpty(record.supervisorSafetyManager)) missing.push('监理单位现场安全监管人及手机号')
  if (!missing.length) return null
  return createAlert(
    DAILY_WORK_RISK_RULES[3],
    'red',
    `${missing.join('、')} 未填报，禁止提交。`,
    record.id,
  )
}

function evaluateRule05(records) {
  const alerts = []
  const groups = new Map()
  for (const record of records) {
    const key = `${record.reportDate || ''}__${record.leadUnit || ''}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(record)
  }

  for (const group of groups.values()) {
    const texts = group
      .map((item) => String(item.dangerControlMeasures || '').trim())
      .filter(Boolean)
    if (texts.length <= 3) continue

    let similarPairs = 0
    for (let i = 0; i < texts.length; i += 1) {
      for (let j = i + 1; j < texts.length; j += 1) {
        if (textSimilarity(texts[i], texts[j]) > 0.9) similarPairs += 1
      }
    }
    if (similarPairs > 3) {
      alerts.push(
        createAlert(
          DAILY_WORK_RISK_RULES[4],
          'yellow',
          `同一管理单位下 ${texts.length} 条管控措施高度雷同，建议针对性修改。`,
          group[0]?.id,
        ),
      )
    }
  }
  return alerts
}

function evaluateRule06(record) {
  const category = String(record.dangerWorkCategory || '')
  const measures = String(record.dangerControlMeasures || '')
  if (category.includes('高处作业') && !HEIGHT_PATTERN.test(measures)) {
    return createAlert(
      DAILY_WORK_RISK_RULES[5],
      'yellow',
      '高处作业未填写具体作业高度，请补充如“5米”等量化参数。',
      record.id,
    )
  }
  if (category.includes('吊装作业') && !LIFT_LIMIT_PATTERN.test(measures)) {
    return createAlert(
      DAILY_WORK_RISK_RULES[5],
      'yellow',
      '吊装作业未填写限高/净空数值，请补充关键安全参数。',
      record.id,
    )
  }
  return null
}

function evaluateRule07(record) {
  const area = String(record.workArea || '')
  const measures = String(record.dangerControlMeasures || '')
  const hitArea = FLIGHT_AREA_KEYWORDS.some((word) => area.includes(word))
  if (!hitArea) return null
  const hitCompliance = FLIGHT_COMPLIANCE_KEYWORDS.some((word) => measures.includes(word))
  if (hitCompliance) return null
  return createAlert(
    DAILY_WORK_RISK_RULES[6],
    'red',
    '该区域属于飞行区核心范围，必须补充审批文号及适航恢复措施。',
    record.id,
  )
}

function evaluateRule08(record) {
  const startAt = parseDateTime(record.startTime)
  if (!startAt) return null
  const hour = startAt.getHours()
  if (hour < 0 || hour >= 6) return null
  const measures = String(record.dangerControlMeasures || '')
  const hit = NIGHT_CONTROL_KEYWORDS.some((word) => measures.includes(word))
  if (hit) return null
  return createAlert(
    DAILY_WORK_RISK_RULES[7],
    'yellow',
    '凌晨时段作业需执行提级审批，请补充夜间值班人员信息。',
    record.id,
  )
}

const RECORD_EVALUATORS = {
  'rule-01': evaluateRule01,
  'rule-03': evaluateRule03,
  'rule-04': evaluateRule04,
  'rule-06': evaluateRule06,
  'rule-07': evaluateRule07,
  'rule-08': evaluateRule08,
}

const BATCH_EVALUATORS = {
  'rule-02': evaluateRule02,
  'rule-05': evaluateRule05,
}

/**
 * 按已启用规则计算风险提醒结果（供列表展示、提交校验等后续能力复用）
 */
export function evaluateDailyWorkRiskAlerts(records, enabledRuleIds = []) {
  const enabled = new Set(enabledRuleIds)
  const alerts = []

  for (const ruleId of enabled) {
    const batchFn = BATCH_EVALUATORS[ruleId]
    if (batchFn) {
      alerts.push(...batchFn(records).filter(Boolean))
      continue
    }
    const recordFn = RECORD_EVALUATORS[ruleId]
    if (!recordFn) continue
    for (const record of records) {
      const alert = recordFn(record)
      if (alert) alerts.push(alert)
    }
  }

  const dedup = new Map()
  for (const alert of alerts) {
    dedup.set(`${alert.ruleId}-${alert.recordId || 'batch'}-${alert.message}`, alert)
  }
  return [...dedup.values()]
}

export function getDefaultEnabledRuleIds() {
  return DAILY_WORK_RISK_RULES.filter((rule) => rule.defaultEnabled).map((rule) => rule.id)
}

export function getRuleById(ruleId) {
  return DAILY_WORK_RISK_RULES.find((rule) => rule.id === ruleId) || null
}

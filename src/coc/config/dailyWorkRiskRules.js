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
    id: 'rule-06',
    name: '特殊作业缺失高度/限高等关键安全参数',
    description:
      '高处作业未注明作业高度（米），吊装作业未注明净空限高数值，导致无法判断是否需要提级审批或是否触碰机场限高红线。',
    defaultEnabled: true,
    scope: 'record',
  },
]

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

function createAlert(ruleId, level, message, recordId = null, relatedRecordIds = null) {
  const rule = getRuleById(ruleId)
  return {
    ruleId,
    ruleName: rule?.name || ruleId,
    level,
    message,
    recordId,
    relatedRecordIds: relatedRecordIds || (recordId ? [recordId] : []),
  }
}

function evaluateRule01(record) {
  const hours = diffHours(record.startTime, record.endTime)
  if (hours == null) return null
  if (hours >= 24) {
    return createAlert(
      'rule-01',
      'red',
      `作业时长 ${hours.toFixed(1)} 小时，达到 24 小时不间断阈值，触发红色预警。`,
      record.id,
    )
  }
  if (hours >= 16) {
    return createAlert(
      'rule-01',
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
              'rule-02',
              'red',
              `区域「${a.workArea || '—'}」同时存在动火与动土交叉作业（「${a.dangerWorkCategory || '—'}」与「${b.dangerWorkCategory || '—'}」），触发红色预警。`,
              a.id,
              [a.id, b.id],
            ),
          )
          continue
        }

        if (categories.size >= 3) {
          alerts.push(
            createAlert(
              'rule-02',
              'yellow',
              `区域「${a.workArea || '—'}」同一时段存在 ${categories.size} 类危险作业交叉（「${a.dangerWorkCategory || '—'}」与「${b.dangerWorkCategory || '—'}」），触发黄色预警。`,
              a.id,
              [a.id, b.id],
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
      'rule-03',
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
    'rule-04',
    'red',
    `${missing.join('、')} 未填报，禁止提交。`,
    record.id,
  )
}

function evaluateRule06(record) {
  const category = String(record.dangerWorkCategory || '')
  const measures = String(record.dangerControlMeasures || '')
  if (category.includes('高处作业') && !HEIGHT_PATTERN.test(measures)) {
    return createAlert(
      'rule-06',
      'yellow',
      '高处作业未填写具体作业高度，请补充如“5米”等量化参数。',
      record.id,
    )
  }
  if (category.includes('吊装作业') && !LIFT_LIMIT_PATTERN.test(measures)) {
    return createAlert(
      'rule-06',
      'yellow',
      '吊装作业未填写限高/净空数值，请补充关键安全参数。',
      record.id,
    )
  }
  return null
}

const RECORD_EVALUATORS = {
  'rule-01': evaluateRule01,
  'rule-03': evaluateRule03,
  'rule-04': evaluateRule04,
  'rule-06': evaluateRule06,
}

const BATCH_EVALUATORS = {
  'rule-02': evaluateRule02,
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

/**
 * 导入/提交前风险明细：附带对应行关键数据，供确认弹窗展示。
 */
export function buildDailyWorkRiskAlertDetails(records = [], enabledRuleIds = []) {
  const stamped = (records || []).map((record, index) => ({
    ...record,
    id: record.id || `import-tmp-${index}`,
    _rowNo: index + 1,
  }))
  const alerts = evaluateDailyWorkRiskAlerts(stamped, enabledRuleIds)
  const byId = new Map(stamped.map((record) => [record.id, record]))

  return alerts.map((alert) => {
    const relatedIds = alert.relatedRecordIds?.length
      ? alert.relatedRecordIds
      : alert.recordId
        ? [alert.recordId]
        : []
    const relatedRecords = relatedIds.map((id) => byId.get(id)).filter(Boolean)
    const primary = relatedRecords[0] || byId.get(alert.recordId) || null
    const rowNo = primary?._rowNo
    const projectName = primary?.projectName || '—'
    const workArea = primary?.workArea || '—'
    const dangerWorkCategory = primary?.dangerWorkCategory || '—'
    const startTime = primary?.startTime || '—'
    const endTime = primary?.endTime || '—'
    const reportDate = primary?.reportDate || '—'
    const dataSummary = relatedRecords.length
      ? relatedRecords
          .map(
            (record) =>
              `第 ${record._rowNo} 行｜项目：${record.projectName || '—'}｜区域：${record.workArea || '—'}｜类别：${record.dangerWorkCategory || '—'}｜${record.startTime || '—'} ~ ${record.endTime || '—'}`,
          )
          .join('\n')
      : '（跨多条记录的批量规则）'
    return {
      ...alert,
      rowNo: rowNo ?? '—',
      projectName,
      workArea,
      dangerWorkCategory,
      startTime,
      endTime,
      reportDate,
      dataSummary,
      relatedRows: relatedRecords.map((record) => ({
        rowNo: record._rowNo,
        projectName: record.projectName || '—',
        workArea: record.workArea || '—',
        dangerWorkCategory: record.dangerWorkCategory || '—',
        startTime: record.startTime || '—',
        endTime: record.endTime || '—',
        reportDate: record.reportDate || '—',
      })),
    }
  })
}

export function getDefaultEnabledRuleIds() {
  return DAILY_WORK_RISK_RULES.filter((rule) => rule.defaultEnabled).map((rule) => rule.id)
}

export function getRuleById(ruleId) {
  return DAILY_WORK_RISK_RULES.find((rule) => rule.id === ruleId) || null
}

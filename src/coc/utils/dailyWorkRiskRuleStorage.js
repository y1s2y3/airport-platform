import {
  DAILY_WORK_RISK_RULES,
  getDefaultEnabledRuleIds,
} from '../config/dailyWorkRiskRules.js'

const STORAGE_KEY = 'coc-daily-work-risk-rule-config'

export function getEnabledRiskRuleIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultEnabledRuleIds()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return getDefaultEnabledRuleIds()
    const validIds = new Set(DAILY_WORK_RISK_RULES.map((rule) => rule.id))
    return parsed.filter((id) => validIds.has(id))
  } catch {
    return getDefaultEnabledRuleIds()
  }
}

export function saveEnabledRiskRuleIds(ruleIds) {
  const validIds = new Set(DAILY_WORK_RISK_RULES.map((rule) => rule.id))
  const next = (ruleIds || []).filter((id) => validIds.has(id))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function getRiskRuleConfigList() {
  const enabledSet = new Set(getEnabledRiskRuleIds())
  return DAILY_WORK_RISK_RULES.map((rule) => ({
    ...rule,
    enabled: enabledSet.has(rule.id),
  }))
}

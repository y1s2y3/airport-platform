/**
 * 指挥部级「预警推送规则」配置 —— 单一事实源（用户 2026-10-26 裁决 1A / 2A）
 *
 * 背景：机械设备预警（views/safety/AlertRecordView.vue）与危大监测预警
 * （views/majorHazard/AlertRecordMajorView.vue）的「预警规则配置」弹窗，
 * 必须是同一份规则数据：任一页面提交后，另一页面打开即为改后的值。
 *
 * 保存方式：内存级（与项目其它 mock 一致）——同一会话内两页共享，刷新页面恢复默认值。
 *
 * 预警等级沿用「重大预警 / 较大预警 / 一般预警」口径（裁决 1A），
 * 与危大记录自身的一级 / 二级 / 三级预警等级并存，互不替代。
 */

export const ALERT_HQ_PUSH_OPTIONS = ['是', '否']

export const ALERT_RECEIVER_OPTIONS = [
  '测试工程指挥部推送预警接收人',
  '工程指挥部安全负责人',
  '工程指挥部值班人员',
]

export const ALERT_PUSH_METHOD_OPTIONS = ['短信', '站内信']

export const ALERT_UPGRADE_ENABLE_OPTIONS = ['是', '否']

/** 分级推送配置默认值 */
const DEFAULT_PUSH_RULES = [
  { alertLevel: '重大预警', pushToHq: '是', receivers: ['测试工程指挥部推送预警接收人'], methods: ['短信', '站内信'] },
  { alertLevel: '较大预警', pushToHq: '是', receivers: ['工程指挥部安全负责人'], methods: ['站内信', '短信'] },
  { alertLevel: '一般预警', pushToHq: '否', receivers: [], methods: [] },
]

/** 预警超期未处理自动升级配置默认值 */
const DEFAULT_UPGRADE_RULES = [
  { alertLevel: '较大预警', overdueDays: 2, upgradeLevel: '重大预警', enabled: '是' },
  { alertLevel: '一般预警', overdueDays: 1, upgradeLevel: '较大预警', enabled: '否' },
]

/** 深拷贝，避免调用方直接改到内部状态 */
function cloneRules(rows) {
  return (rows || []).map((row) => ({
    ...row,
    receivers: Array.isArray(row.receivers) ? [...row.receivers] : [],
    methods: Array.isArray(row.methods) ? [...row.methods] : [],
  }))
}

let pushRules = cloneRules(DEFAULT_PUSH_RULES)
let upgradeRules = cloneRules(DEFAULT_UPGRADE_RULES)

/** 读取分级推送配置（返回副本） */
export function getAlertPushRules() {
  return cloneRules(pushRules)
}

/** 保存分级推送配置 */
export function saveAlertPushRules(rows) {
  pushRules = cloneRules(rows)
}

/** 读取超期升级配置（返回副本） */
export function getAlertUpgradeRules() {
  return cloneRules(upgradeRules)
}

/** 保存超期升级配置 */
export function saveAlertUpgradeRules(rows) {
  upgradeRules = cloneRules(rows)
}

/** 恢复默认（供「重置」类操作或测试使用） */
export function resetAlertRuleConfig() {
  pushRules = cloneRules(DEFAULT_PUSH_RULES)
  upgradeRules = cloneRules(DEFAULT_UPGRADE_RULES)
}

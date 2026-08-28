/**
 * 业务台账 ↔ 预警中心 反向通知钩子（避免 mock 循环依赖）
 *
 * personalCenter 注册实现；aiApp / machineAlert / majorHazard 在业务处置成功后调用。
 */

let bizDisposedHook = null
let suppressBizToWc = false

/**
 * @param {(bizModule: string, bizAlertId: string, payload: object) => void} fn
 */
export function registerWarningCenterBizDisposedHook(fn) {
  bizDisposedHook = fn
}

/** 预警中心 → 业务台账 回写期间，禁止再反向写回预警中心（避免重复/覆盖） */
export function runWithoutBizToWarningCenterSync(fn) {
  const prev = suppressBizToWc
  suppressBizToWc = true
  try {
    return fn()
  } finally {
    suppressBizToWc = prev
  }
}

/**
 * 业务页处置成功后通知预警中心
 * @param {'ai'|'machine'|'major'} bizModule
 * @param {string} bizAlertId
 * @param {{ operator?: string, disposalResult?: string, disposalNote?: string, attachments?: any[] }} [payload]
 */
export function notifyBizAlertDisposed(bizModule, bizAlertId, payload = {}) {
  if (suppressBizToWc) return
  if (!bizModule || !bizAlertId || !bizDisposedHook) return
  bizDisposedHook(bizModule, bizAlertId, payload)
}

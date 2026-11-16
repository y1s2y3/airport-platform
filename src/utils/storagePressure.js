/**
 * 本地存储空间保护（原型阶段）
 *
 * 原型所有数据都存在 localStorage（约 5MB 上限），演示数据（值班表、
 * 隐患抽检、调度隐患、截图等）体量较大，容易把配额占满，导致后续
 * 「任务单待办」等种子数据写入失败（控制台报 QuotaExceededError）。
 *
 * 策略：检测到可用空间不足时，按「可重建的演示缓存」优先级自动清理，
 * 这些 key 在对应页面/模块加载时会重新生成演示数据，不影响业务代码。
 */

/** 可安全清理的演示缓存（清空后各模块会按默认种子重新生成） */
const DEMO_CACHE_KEYS = [
  'coc-admin-screenshots', // 问题截图演示数据（含图片 base64，体量最大）
  'coc-admin-dispatch-snapshot-v1', // 调度单据示例快照
  'coc-admin-duty-roster-v1', // 值班表演示数据
  'airport-hazard-sampling-v2', // 隐患抽检演示数据
  'coc-admin-dispatch-hazards-v5', // 调度隐患演示数据
]

/** 浏览器 localStorage 常见配额（约 5MB，按 5120KB 估算） */
const ESTIMATED_QUOTA_KB = 5120

/** 当前 localStorage 占用（KB） */
export function getLocalStorageUsageKB() {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key == null) continue
      const value = localStorage.getItem(key) || ''
      total += key.length + value.length
    }
    return Math.round(total / 1024)
  } catch {
    return 0
  }
}

/**
 * 确保本地存储有足够的空闲空间；不足时清理可重建的演示缓存。
 * @param {{ minFreeKB?: number, force?: boolean }} options
 * @returns {{ usageKB: number, freeKB: number, freedKB: number, removed: Array<{key: string, kb: number}> }}
 */
export function ensureStorageRoom({ minFreeKB = 1024, force = false } = {}) {
  const usageKB = getLocalStorageUsageKB()
  const freeKB = ESTIMATED_QUOTA_KB - usageKB
  if (!force && freeKB >= minFreeKB) {
    return { usageKB, freeKB, freedKB: 0, removed: [] }
  }
  const removed = []
  for (const key of DEMO_CACHE_KEYS) {
    if (getLocalStorageUsageKB() <= ESTIMATED_QUOTA_KB - minFreeKB) break
    let raw = null
    try {
      raw = localStorage.getItem(key)
    } catch {
      raw = null
    }
    if (!raw) continue
    const kb = Math.round((key.length + raw.length) / 1024)
    try {
      localStorage.removeItem(key)
      removed.push({ key, kb })
    } catch {
      /* 单个 key 清理失败不影响其他 key */
    }
  }
  if (removed.length) {
    console.warn(
      `[本地存储] 可用空间不足（已用约 ${usageKB}KB），已自动清理演示缓存：${removed
        .map((item) => `${item.key}(${item.kb}KB)`)
        .join('、')}；对应模块重新打开时会自动重建演示数据。`,
    )
  }
  const afterUsage = getLocalStorageUsageKB()
  return {
    usageKB: afterUsage,
    freeKB: ESTIMATED_QUOTA_KB - afterUsage,
    freedKB: usageKB - afterUsage,
    removed,
  }
}

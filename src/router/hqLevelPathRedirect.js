/**
 * L11 指挥部 / 项目部等价 path 双向 redirect（与 menu.js 注释中的 path 对一致）。
 * 指挥部下访问项目部旧 URL → `/hq/...`；项目部下访问 `/hq/...` → 项目部 path。
 * 例外：台账从指挥部汇总下钻项目明细时带 `?from=hq`，不 redirect。
 */
export const HQ_LEVEL_PATH_PAIRS = [
  {
    hq: '/hq/machine-supervise/ledger',
    project: '/machine-supervise/ledger',
    skipProjectToHqWhenQuery: { from: 'hq' },
  },
  { hq: '/hq/machine-supervise/alert-record', project: '/machine-supervise/alert-record' },
  { hq: '/hq/major-hazard/alert-record', project: '/major-hazard/alert-record' },
  {
    hq: '/hq/qm/sample/ledger',
    project: '/qm/sample/ledger',
    skipProjectToHqWhenQuery: { from: 'hq' },
  },
]

function pathMatchesPrefix(path, prefix) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

function swapPath(path, fromPrefix, toPrefix) {
  if (!pathMatchesPrefix(path, fromPrefix)) return null
  return toPrefix + path.slice(fromPrefix.length)
}

function shouldSkipProjectToHq(pair, query) {
  const rules = pair.skipProjectToHqWhenQuery
  if (!rules) return false
  return Object.entries(rules).every(([key, value]) => {
    const actual = query[key]
    if (actual == null) return false
    return String(actual) === String(value)
  })
}

/**
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {boolean} isHqSelected
 * @returns {import('vue-router').RouteLocationRaw | null}
 */
export function resolveHqLevelPathRedirect(to, isHqSelected) {
  const path = to.path

  for (const pair of HQ_LEVEL_PATH_PAIRS) {
    if (isHqSelected) {
      if (!pathMatchesPrefix(path, pair.project)) continue
      if (shouldSkipProjectToHq(pair, to.query)) return null
      const targetPath = swapPath(path, pair.project, pair.hq)
      if (!targetPath || targetPath === path) return null
      return { path: targetPath, query: to.query, hash: to.hash, replace: true }
    }

    if (!pathMatchesPrefix(path, pair.hq)) continue
    const targetPath = swapPath(path, pair.hq, pair.project)
    if (!targetPath || targetPath === path) return null
    return { path: targetPath, query: to.query, hash: to.hash, replace: true }
  }

  return null
}

/** 顶栏切换层级时：项目部 path → 指挥部等价 path（含子路径后缀） */
export function resolveHqEnterPath(path) {
  for (const pair of HQ_LEVEL_PATH_PAIRS) {
    const target = swapPath(path, pair.project, pair.hq)
    if (target) return target
  }
  return null
}

/** 顶栏切换层级时：指挥部 path → 项目部等价 path（含子路径后缀） */
export function resolveHqLeavePath(path) {
  for (const pair of HQ_LEVEL_PATH_PAIRS) {
    const target = swapPath(path, pair.hq, pair.project)
    if (target) return target
  }
  return null
}

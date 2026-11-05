import { normalizeLedgerRange } from '../utils/dailyDispatchLedgerQuery.js'
import { viewDefaultRange } from '../utils/dailyDispatchCheckRules.js'

const rangeParam = value => normalizeLedgerRange(value).join(',') || 'all'
function readRange(value, fallback) {
  if (value === 'all') return []
  if (typeof value !== 'string') return [...fallback]
  try { return normalizeLedgerRange(value.split(',')) } catch { return [...fallback] }
}
const positiveInteger = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1
const scrollOffset = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0

// An absent marker initializes defaults; the explicit "all" value restores a cleared date.
export function readLedgerRouteState(query) {
  if (query.ledgerState !== '1') return null
  function pane(prefix, view) {
    const applied = readRange(query[prefix + 'Range'], viewDefaultRange(view))
    return {
      range: readRange(query[prefix + 'Draft'], applied), applied,
      pagination: {
        page: positiveInteger(query[prefix + 'Page']),
        pageSize: [10, 20, 50].includes(Number(query[prefix + 'Size'])) ? Number(query[prefix + 'Size']) : 10,
        scroll: { left: scrollOffset(query[prefix + 'X']), top: scrollOffset(query[prefix + 'Y']) },
      },
    }
  }
  return { activeTab: query.tab === 'summary' ? 'summary' : 'daily', ...pane('daily', 'list'), summary: pane('summary', 'summary') }
}

export function ledgerRouteQuery(state) {
  const query = { ledgerState: '1', tab: state.activeTab === 'summary' ? 'summary' : 'daily' }
  function pane(prefix, value) {
    if (!value) return
    query[prefix + 'Range'] = rangeParam(value.applied)
    try { query[prefix + 'Draft'] = rangeParam(value.range) }
    catch { query[prefix + 'Draft'] = query[prefix + 'Range'] }
    query[prefix + 'Page'] = String(value.pagination?.page || 1)
    query[prefix + 'Size'] = String(value.pagination?.pageSize || 10)
    query[prefix + 'X'] = String(value.pagination?.scroll?.left || 0)
    query[prefix + 'Y'] = String(value.pagination?.scroll?.top || 0)
  }
  pane('daily', state); pane('summary', state.summary)
  return query
}

export function ledgerReturnLocation(value, base) {
  if (typeof value !== 'string' || !value.startsWith(base + '?')) return { path: base }
  const query = Object.fromEntries(new URLSearchParams(value.slice(base.length + 1)))
  const state = readLedgerRouteState(query)
  return state ? { path: base, query: ledgerRouteQuery(state) } : { path: base }
}

import assert from 'node:assert/strict'
import test from 'node:test'
import { computed, effectScope, ref } from 'vue'
import { filterLedgerSummaries, ledgerSummary, normalizeLedgerRange } from '../src/utils/dailyDispatchLedgerQuery.js'
import { emptyDay, emptyCheck, summaryRows, totalMetric, viewDefaultRange } from '../src/utils/dailyDispatchCheckRules.js'
import { dailyLedgerRows, PROJECT_CHECK_SCOPE } from '../src/utils/dailyDispatchLedgerStatus.js'
import { useClientPagination } from '../src/composables/useClientPagination.js'
import { useDailyDispatchLedger } from '../src/composables/useDailyDispatchLedger.js'
import { ledgerReturnLocation, ledgerRouteQuery, readLedgerRouteState } from '../src/composables/dailyDispatchLedgerNavigation.js'

const dates = ['2024-02-29', '2025-12-31', '2026-01-01', '2026-10-31', '2026-11-01']
const records = dates.map(date => ledgerSummary(emptyDay(date, [{ id: 'historic', projectName: '历史隐藏项目' }])) )
test('all empty picker values mean unrestricted, without defaulting', () => {
  for (const value of [null, undefined, [], ['', ''], [null, null]]) {
    assert.deepEqual(normalizeLedgerRange(value), [])
    assert.equal(filterLedgerSummaries(records, value).length, dates.length)
  }
})
test('incomplete, reversed, invalid and non-business dates are rejected', () => {
  for (const value of [['2026-10-01', ''], ['2026-10-01'], ['2026-11-01', '2026-10-01'], ['2026-02-29', '2026-03-01'], ['2026-13-01', '2026-13-02'], ['2026-01-00', '2026-01-01'], ['2026-10-01T00:00:00Z', '2026-11-01'], [new Date(), new Date()], '']) assert.throws(() => normalizeLedgerRange(value), /完整的检查日期/)
})
test('range includes both endpoints, across years and leap dates', () => {
  assert.deepEqual(filterLedgerSummaries(records, ['2025-12-31', '2026-01-01']).map(row => row.date), ['2026-01-01', '2025-12-31'])
  assert.equal(filterLedgerSummaries(records, ['2024-02-29', '2024-02-29']).length, 1)
})
test('filtering never constructs dates or shifts business dates by timezone', () => {
  const original = globalThis.Date
  try {
    globalThis.Date = class { constructor() { throw new Error('No timestamp conversion allowed') } }
    assert.deepEqual(filterLedgerSummaries(records, ['2026-10-31', '2026-11-01']).map(row => row.date), ['2026-11-01', '2026-10-31'])
  } finally { globalThis.Date = original }
})
test('empty matches produce a true empty collection', () => assert.deepEqual(filterLedgerSummaries(records, ['2030-01-01', '2030-01-02']), []))
test('date clearing preserves upstream permission and other filters', () => {
  const authorized = records.filter(row => row.date.startsWith('2026'))
  assert.deepEqual(filterLedgerSummaries(authorized, null).map(row => row.date), ['2026-11-01', '2026-10-31', '2026-01-01'])
})
test('sorting is descending, repeatable and does not mutate source', () => {
  const before = structuredClone(records)
  assert.deepEqual(filterLedgerSummaries(records, []), filterLedgerSummaries(records, []))
  assert.equal(filterLedgerSummaries(records, [])[0].date, '2026-11-01')
  assert.deepEqual(records, before)
})
test('both tab defaults include exactly thirty calendar dates across month, year and leap boundaries', () => {
  const cases = [
    ['2026-11-02', '2026-10-04'],
    ['2026-11-01', '2026-10-03'],
    ['2026-10-31', '2026-10-02'],
    ['2026-03-01', '2026-01-31'],
    ['2028-03-01', '2028-02-01'],
    ['2026-01-05', '2025-12-07'],
  ]
  for (const [today, start] of cases) {
    for (const view of ['list', 'summary']) assert.deepEqual(viewDefaultRange(view, today), [start, today])
    const serial = value => Date.parse(value + 'T00:00:00Z')
    assert.equal((serial(today) - serial(start)) / 86400000 + 1, 30)
  }
  assert.deepEqual(normalizeLedgerRange(null), [])
})
function detailedDay() {
  const day = emptyDay('2026-10-31', [{ id: 'historic', projectName: '历史名称' }])
  day.hq.version = 1
  day.hq.headers.dispatcher = '已保存调度员'
  Object.assign(day.hq.rows[0], { unified: true, safety: { ...emptyCheck(), type: 'problem', problems: [{ text: 'PRIVATE_DETAIL', images: [{ url: 'data:image/png;base64,PRIVATE_ATTACHMENT' }] }] }, quality: { ...emptyCheck(), type: 'normal' } })
  day.people.historic = { duty: { schemaVersion: 4, firstSubmittedAt: 'saved', version: 1, check: { ...emptyCheck(), type: 'other', other: 'PRIVATE_PERSON_DETAIL', otherImages: [] } } }
  day.hq.note = 'PRIVATE_NOTE'
  return day
}
test('compact projections exactly preserve displayed statistics and all five states', () => {
  const day = detailedDay(), compact = ledgerSummary(day), { results, ...summary } = compact
  assert.deepEqual(summary, summaryRows([day])[0])
  assert.deepEqual({ ...summary, ...results }, dailyLedgerRows([day], [], { projectScope: PROJECT_CHECK_SCOPE })[0])
})
test('list projection does not carry complete bodies, people, locks or attachment URLs', () => {
  const day = detailedDay(), before = structuredClone(day), compact = ledgerSummary(day)
  assert.ok(!compact.hq && !compact.people && !compact.dispatchDefaults)
  assert.ok(!JSON.stringify(compact).includes('PRIVATE_'))
  assert.deepEqual(day, before)
})
test('saved blank sheets remain visible and all missing results remain dashes', () => {
  const blank = records[0]
  assert.equal(filterLedgerSummaries([blank], null).length, 1)
  assert.equal(blank.safetyQuality, null)
  assert.equal(blank.camera, null)
  assert.ok(Object.values(blank.results).every(result => result.state === 'empty'))
})
test('historic snapshots do not depend on current project visibility', () => {
  const compact = ledgerSummary(detailedDay())
  assert.deepEqual(compact.projects, ['历史名称'])
  assert.equal(compact.results.projectDuty.state, 'other')
})
test('totals cover the full filtered set and keep null distinct from zero', () => {
  const rows = [ledgerSummary(detailedDay()), records[0]]
  assert.equal(totalMetric(rows, 'safetyQuality'), 1)
  assert.equal(totalMetric(rows, 'camera'), null)
})
test('all-history results render only a page; query and page-size changes reset page one', () => {
  const scope = effectScope()
  try {
    const source = ref(Array.from({ length: 65 }, (_, index) => ({ date: `2026-10-${String(1 + index % 31).padStart(2, '0')}`, id: index }))), range = ref([])
    let pagination
    scope.run(() => { pagination = useClientPagination(computed(() => filterLedgerSummaries(source.value, range.value))) })
    assert.equal(pagination.rows.value.length, 10); assert.equal(pagination.total.value, 65)
    pagination.page.value = 3; range.value = ['2026-10-01', '2026-10-15']
    assert.equal(pagination.page.value, 1)
    pagination.page.value = 2; pagination.pageSize.value = 20
    assert.equal(pagination.page.value, 1); assert.equal(pagination.rows.value.length, 20)
    pagination.page.value = 2; range.value = null
    assert.equal(pagination.page.value, 1); assert.equal(pagination.total.value, 65)
  } finally { scope.stop() }
})
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
function loader() {
  const scope = effectScope(), pending = []
  let state
  scope.run(() => { state = useDailyDispatchLedger({ listLedgerSummaries: () => { const read = deferred(); pending.push(read); return read.promise } }) })
  return { state, pending, scope }
}
test('a stale successful read cannot replace a newer summary or loading state', async () => {
  const { state, pending, scope } = loader()
  try {
    const first = state.load(), second = state.load()
    pending[0].resolve([{ date: 'old' }]); await first
    assert.equal(state.loading.value, true); assert.deepEqual(state.summaries.value, [])
    pending[1].resolve([{ date: 'new' }]); await second
    assert.equal(state.loading.value, false); assert.equal(state.summaries.value[0].date, 'new')
  } finally { scope.stop() }
})
test('a late older success cannot overwrite the already published newer result', async () => {
  const { state, pending, scope } = loader()
  try {
    const first = state.load(), second = state.load()
    pending[1].resolve([{ date: 'newest' }]); await second
    pending[0].resolve([{ date: 'oldest' }]); await first
    assert.equal(state.summaries.value[0].date, 'newest'); assert.equal(state.loading.value, false)
  } finally { scope.stop() }
})
test('a stale failure cannot hide a newer successful result', async () => {
  const { state, pending, scope } = loader()
  try {
    const first = state.load(), second = state.load()
    pending[1].resolve(records); await second; pending[0].reject(new Error('stale failure')); await first
    assert.equal(state.error.value, ''); assert.equal(state.summaries.value.length, 5)
  } finally { scope.stop() }
})
test('latest failures are explicit and a retry recovers without losing the query source', async () => {
  const { state, pending, scope } = loader()
  try {
    const first = state.load(); pending[0].resolve(records); await first
    const failed = state.load(); pending[1].reject(new Error('本地读取失败')); await failed
    assert.equal(state.error.value, '本地读取失败'); assert.equal(state.loading.value, false); assert.equal(state.summaries.value.length, 5)
    const retry = state.load(); pending[2].resolve([records[0]]); await retry
    assert.equal(state.error.value, ''); assert.equal(state.summaries.value.length, 1)
  } finally { scope.stop() }
})
test('a disposed page ignores late responses', async () => {
  const { state, pending, scope } = loader(), read = state.load()
  scope.stop(); pending[0].resolve(records); await read
  assert.deepEqual(state.summaries.value, [])
})
test('missing return marker initializes defaults while all explicitly restores a cleared date', () => {
  assert.equal(readLedgerRouteState({}), null)
  assert.equal(readLedgerRouteState({ dailyRange: 'all' }), null)
  const value = readLedgerRouteState({ ledgerState: '1', dailyRange: 'all', dailyDraft: 'all', dailyPage: '3', dailySize: '20' })
  assert.deepEqual(value.range, []); assert.deepEqual(value.applied, [])
  assert.equal(value.pagination.page, 3); assert.equal(value.pagination.pageSize, 20)
})
test('route state round-trips both tabs, pending date input, page size and scroll', () => {
  const state = { activeTab: 'summary', range: null, applied: ['2026-10-01', '2026-10-31'], pagination: { page: 3, pageSize: 20, scroll: { left: 90, top: 500 } }, summary: { range: ['2026-07-01', '2026-08-31'], applied: ['2026-07-01', '2026-08-31'], pagination: { page: 2, pageSize: 50, scroll: { left: 8, top: 80 } } } }
  const restored = readLedgerRouteState(ledgerRouteQuery(state))
  assert.deepEqual(restored, { ...state, range: [] })
})
test('malformed URL state falls back safely without converting an explicit all-date selection', () => {
  const state = readLedgerRouteState({ ledgerState: '1', tab: 'unknown', dailyRange: 'broken', dailyPage: '-3', dailySize: '999', dailyX: 'NaN', summaryRange: 'all' })
  assert.equal(state.activeTab, 'daily'); assert.deepEqual(state.applied, viewDefaultRange('list'))
  assert.equal(state.pagination.page, 1); assert.equal(state.pagination.pageSize, 10)
  assert.equal(state.pagination.scroll.left, 0); assert.deepEqual(state.summary.applied, [])
})
test('incomplete pending date input cannot break entering details', () => {
  const state = readLedgerRouteState(ledgerRouteQuery({ activeTab: 'daily', range: ['2026-07-01', ''], applied: ['2026-07-01', '2026-07-31'] }))
  assert.deepEqual(state.range, state.applied)
})
test('return links accept only this ledger and whitelist valid state parameters', () => {
  const base = '/coc-admin/daily-dispatch-check'
  const location = ledgerReturnLocation(base + '?ledgerState=1&dailyRange=all&dailyPage=3&dailySize=20&unexpected=secret', base)
  assert.equal(location.path, base); assert.equal(location.query.dailyRange, 'all'); assert.equal(location.query.dailyPage, '3')
  assert.equal(location.query.unexpected, undefined)
  for (const value of [undefined, 'https://example.com/', '/workbench?ledgerState=1', base + '?unexpected=1']) assert.deepEqual(ledgerReturnLocation(value, base), { path: base })
})

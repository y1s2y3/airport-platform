/**
 * 品牌报审 + 材料设备进场 Mock 冒烟测试（删除废弃导出后）
 */
import {
  listApplications,
  listLedger,
  getApplicationDetail,
  buildCopyPayloadFromRejected,
  buildReEditPayloadFromWithdrawn,
  searchLedgerBrands,
  submitApplication,
  withdrawApplication,
  resubmitWithdrawnBrand,
  supervisorApprove,
  pmApprove,
  buildHqBrandApprovalStatsByProject,
  listSamplePickRowsFromBrand,
  listSampleSuppliersFromBrand,
  listSampleMaterialsFromBrand,
} from '../src/mock/brand.js'
import { getEntryDetail, listSelectableForInspect } from '../src/mock/mat.js'

const checks = []

function assert(name, condition, detail = '') {
  checks.push({ name, ok: !!condition, detail })
  if (!condition) console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`)
}

const apps = listApplications('p-000')
assert('listApplications 返回数据', apps.length > 0, `count=${apps.length}`)

const ledger = listLedger('p-000')
assert('listLedger 返回数据', Array.isArray(ledger))

const detail = getApplicationDetail(apps[0]?.application_id)
assert('getApplicationDetail 可读', !!detail?.app)

const brands = searchLedgerBrands('钢', 'p-000')
assert('searchLedgerBrands 可调用', Array.isArray(brands))

const hq = buildHqBrandApprovalStatsByProject()
assert('buildHqBrandApprovalStatsByProject 可调用', hq.length > 0)

assert('listSamplePickRowsFromBrand 可调用', Array.isArray(listSamplePickRowsFromBrand('p-000')))
assert('listSampleSuppliersFromBrand 可调用', Array.isArray(listSampleSuppliersFromBrand('p-000')))

const rejected = apps.find((a) => a.status === 'rejected')
if (rejected) {
  const copy = buildCopyPayloadFromRejected(rejected.application_id)
  assert('buildCopyPayloadFromRejected 驳回单可复制', !!copy?.material_name)
}

const withdrawn = apps.find((a) => a.status === 'withdrawn')
if (withdrawn) {
  const reEdit = buildReEditPayloadFromWithdrawn(withdrawn.application_id)
  assert('buildReEditPayloadFromWithdrawn 撤回单可预填', !!reEdit?.application_id)
}

const matRows = listSelectableForInspect('p-000')
assert('listSelectableForInspect 可调用', Array.isArray(matRows))

const entry = getEntryDetail(matRows[0]?.material_id || 'ME-2026-001')
assert('getEntryDetail 可读', entry === null || !!entry.entry_id)

const failed = checks.filter((c) => !c.ok)
console.log(`\n冒烟测试: ${checks.length - failed.length}/${checks.length} 通过`)
if (failed.length) {
  process.exit(1)
}

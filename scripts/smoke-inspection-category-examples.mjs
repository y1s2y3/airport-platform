import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { inspectionCheckItemExamples, mergeInspectionCheckItemExamples } from '../src/mock/inspectionCheckItemExamples.js'

assert.equal(inspectionCheckItemExamples.length, 8)
assert.equal(inspectionCheckItemExamples.flatMap(category => category.items).length, 32)
assert.equal(new Set(inspectionCheckItemExamples.flatMap(category => [category.id, ...category.items.map(item => item.id)])).size, 40)
assert.equal(mergeInspectionCheckItemExamples(inspectionCheckItemExamples).length, 8)
const root = resolve(import.meta.dirname, '..')
const server = await createServer({ configLoader: 'native', root, logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true, executablePath: existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  // 模拟已经使用旧版并新增过同名分类的浏览器，只在第一次加载时设置。
  await page.addInitScript(() => {
    if (localStorage.getItem('category-examples-fixture')) return
    localStorage.setItem('category-examples-fixture', '1')
    localStorage.setItem('airport-inspection-check-items-v1', JSON.stringify([
      { id: 'custom-safety', label: '用户安全分类', inspectionCategory: '安全', items: [{ id: 'custom-safety-item', label: '保留用户安全检查项' }] },
      { id: 'custom-dust', label: '扬尘防治', inspectionCategory: '生态文明', items: [{ id: 'custom-dust-item', label: '保留用户自行填写的扬尘检查项' }] },
    ]))
  })
  await page.goto(server.resolvedUrls.local[0] + '#/safety-inspection/check-items')
  const legacy = await page.evaluate(async () => {
    const { checkCategoryTree } = await import('/src/composables/useInspectionPlan.js')
    const rows = checkCategoryTree.filter(item => item.inspectionCategory === '生态文明')
    return [rows.length, rows.reduce((total, item) => total + item.items.length, 0)]
  })
  assert.deepEqual(legacy, [4, 13])
  await page.locator('.category-tabs .el-radio-button').filter({ hasText: '其他' }).click()
  assert.equal(await page.locator('.cat-item').count(), 4)
  await page.locator('.cat-item').filter({ hasText: '现场通行与秩序' }).click()
  assert.equal(await page.locator('.items-panel tbody tr').count(), 4)
  console.log('PASS 旧缓存自动补充示例，保留用户同名分类和原检查项')
  await page.evaluate(async () => {
    const { default: router } = await import('/src/router/index.js')
    await router.push('/safety-inspection/plan/create')
  })
  await page.locator('.plan-form .el-radio').filter({ hasText: '其他' }).click()
  await page.getByRole('button', { name: '选择检查项', exact: true }).click()
  await page.getByRole('dialog').getByText('现场通行与秩序', { exact: true }).click()
  await page.getByRole('dialog').getByText('现场出入口管理和访客登记记录是否完整', { exact: true }).waitFor()
  console.log('PASS 新增示例同步到下发任务选择窗口')
  await page.evaluate(async () => {
    const { checkCategoryTree } = await import('/src/composables/useInspectionPlan.js')
    const index = checkCategoryTree.findIndex(item => item.id === 'cat-other-signage')
    checkCategoryTree.splice(index, 1)
  })
  await page.reload()
  const restored = await page.evaluate(async () => {
    const { checkCategoryTree } = await import('/src/composables/useInspectionPlan.js')
    return { total: checkCategoryTree.length, deleted: checkCategoryTree.some(item => item.id === 'cat-other-signage'), custom: checkCategoryTree.find(item => item.id === 'custom-dust') }
  })
  assert.equal(restored.total, 8)
  assert.equal(restored.deleted, false)
  assert.equal(restored.custom.items[0].label, '保留用户自行填写的扬尘检查项')
  console.log('PASS 刷新不重复追加，用户删除的示例不会再次恢复')
  const fresh = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await fresh.goto(server.resolvedUrls.local[0] + '#/safety-inspection/check-items')
  const counts = await fresh.evaluate(async () => {
    const { checkCategoryTree } = await import('/src/composables/useInspectionPlan.js')
    return ['生态文明', '其他'].map(value => {
      const rows = checkCategoryTree.filter(item => item.inspectionCategory === value)
      return [rows.length, rows.reduce((total, item) => total + item.items.length, 0)]
    })
  })
  assert.deepEqual(counts, [[4, 16], [4, 16]])
  assert.deepEqual(errors, [])
  console.log('PASS 全新浏览器每类4个检查分类、16条检查项，无未处理异常')
} finally {
  await browser?.close()
  await server.close()
}

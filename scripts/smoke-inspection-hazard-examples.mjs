import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { inspectionHazardCategoryExamples, mergeInspectionHazardCategoryExamples } from '../src/mock/inspectionHazardCategoryExamples.js'

assert.equal(inspectionHazardCategoryExamples.length, 14)
assert.equal(mergeInspectionHazardCategoryExamples(inspectionHazardCategoryExamples).length, 14)
const server = await createServer({ configLoader: 'native', root: resolve(import.meta.dirname, '..'), logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
let browser
try {
  await server.listen()
  browser = await chromium.launch({ headless: true, executablePath: existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    if (localStorage.getItem('hazard-examples-test-fixture')) return
    localStorage.setItem('hazard-examples-test-fixture', '1')
    localStorage.setItem('airport-inspection-dictionaries-v1', JSON.stringify({
      types: [{ id: 'custom-type', name: '用户检查类型', enabled: true, sort: 1, remark: '保留类型' }],
      hazards: [
        { id: 'custom-quality', category: '质量', name: '材料质量', enabled: false, sort: 99, remark: '保留用户备注' },
        { id: 'custom-safety', category: '安全', name: '用户安全类别', enabled: true, sort: 1, remark: '' },
      ],
    }))
  })
  await page.goto(server.resolvedUrls.local[0] + '#/safety-inspection/hazard-categories')
  for (const [category, count] of [['质量', 8], ['其他', 6]]) {
    await page.locator('.dictionary-page .category-tabs .el-radio-button').filter({ hasText: category }).click()
    assert.equal(await page.locator('.dictionary-page .el-table__body-wrapper tbody tr').count(), count)
  }
  const preserved = await page.evaluate(async () => {
    const D = await import('/src/config/inspectionManagement.js')
    const custom = D.inspectionDictionaries.hazards.find(item => item.id === 'custom-quality')
    const renamed = D.inspectionDictionaries.hazards.find(item => item.category === '其他')
    D.saveInspectionDictionary('hazards', { ...renamed, name: '用户修改的示例类别', enabled: false })
    return { custom, safety: D.inspectionDictionaries.hazards.filter(item => item.category === '安全'), types: D.INSPECTION_TYPES }
  })
  assert.equal(preserved.custom.enabled, false)
  assert.equal(preserved.custom.sort, 99)
  assert.equal(preserved.custom.remark, '保留用户备注')
  assert.equal(preserved.safety.length, 1)
  assert.deepEqual(preserved.types, ['用户检查类型'])
  console.log('PASS 三类配置列表显示14项示例，旧检查类型、安全类别及同名用户配置完整保留')
  await page.reload()
  const restored = await page.evaluate(async () => {
    const D = await import('/src/config/inspectionManagement.js')
    const renamed = D.inspectionDictionaries.hazards.find(item => item.name === '用户修改的示例类别')
    return { count: D.inspectionDictionaries.hazards.length, enabled: renamed.enabled, qualityOptions: D.getHazardCategoryOptions('质量').map(item => item.value) }
  })
  assert.equal(restored.count, 15)
  assert.equal(restored.enabled, false)
  assert.equal(restored.qualityOptions.includes('材料质量'), false)
  console.log('PASS 刷新不重复追加，编辑和停用状态保留，新增隐患不显示停用类别')
  const fresh = await browser.newPage()
  await fresh.goto(server.resolvedUrls.local[0] + '#/safety-inspection/hazard-categories')
  const counts = await fresh.evaluate(async () => {
    const D = await import('/src/config/inspectionManagement.js')
    return D.INSPECTION_CATEGORIES.map(category => D.getHazardCategoryOptions(category).length)
  })
  assert.deepEqual(counts, [25, 8, 6])
  assert.deepEqual(errors, [])
  console.log('PASS 新浏览器保留25项安全类别，质量8项、其他6项')
} finally {
  await browser?.close()
  await server.close()
}

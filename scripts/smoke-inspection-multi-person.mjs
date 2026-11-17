import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(server.resolvedUrls.local[0])
  await page.evaluate(async () => {
    const P = await import('/src/composables/useInspectionPersonConfig.js')
    const config = P.getInspectionPersonConfig('p-000', '安全')
    if (!Array.isArray(config.rectifierId) || !Array.isArray(config.reviewerId)) throw Error('旧配置未转成数组')
    const quality = JSON.stringify(P.getInspectionPersonConfig('p-000', '质量'))
    P.saveInspectionPersonConfig('p-000', { ...config, rectifierId: ['insp-002', 'insp-005'], reviewerId: ['insp-003', 'insp-006'] })
    if (quality !== JSON.stringify(P.getInspectionPersonConfig('p-000', '质量'))) throw Error('质量配置被覆盖')
    if (P.getProjectRectifierLabel('p-000').split('、').length !== 2 || P.getProjectReviewerLabel('p-000', '其他').split('、').length !== 2) throw Error('多人带出丢失')
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = 'p-000'
    const { default: router } = await import('/src/router/index.js')
    await router.push('/safety-inspection/inspector-config')
  })
  await page.locator('.person-config-page').waitFor()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  assert.equal(await page.locator('.person-config-page .el-select .el-tag').count(), 4)
  // Cancel must discard edits rather than mutate the saved configuration through shared arrays.
  await page.locator('.person-config-page .el-tag__close').first().click()
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  assert.equal(await page.locator('.person-config-page .el-select .el-tag').count(), 4)
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await page.reload()
  assert.equal(await page.evaluate(async () => (await import('/src/composables/useInspectionPersonConfig.js')).getInspectionPersonConfig('p-000').rectifierId.length), 2)
  await page.evaluate(async () => { const { default: router } = await import('/src/router/index.js'); await router.push('/mobile/rectify') })
  await page.locator('.rec-card').first().waitFor()
  for (const text of await page.locator('.rec-card').allInnerTexts()) {
    assert.ok(text.includes('当前流程节点：'))
    assert.ok(!text.includes('整改人：') && !text.includes('复查人：'))
  }
  assert.ok((await page.locator('.m-list').innerText()).includes('施工单位项目经理验收'))
  assert.ok((await page.locator('.m-list').innerText()).includes('监理单位项目总监验收'))
  assert.deepEqual(errors, [])
  console.log('PASS 多人配置、旧单人兼容、分类隔离、全员带出、取消保护及刷新持久化；移动端卡片显示实际节点且无人员字段')
} finally { await browser.close(); await server.close() }

import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const server = await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } })
  page.setDefaultTimeout(12000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0])
  await page.evaluate(async () => {
    const { selectedProjectId } = await import('/src/composables/useCurrentProject.js')
    selectedProjectId.value = 'p-000'
    const { default: router } = await import('/src/router/index.js')
    await router.push('/workbench')
  })
  const panel = page.locator('.pc-page--embedded')
  const keyword = panel.getByRole('textbox', { name: '请输入流程名称' })
  const pickTab = name => panel.getByRole('tab', { name, exact: true }).click()
  const filter = async value => {
    await keyword.fill(value)
    await panel.getByRole('button', { name: '搜索', exact: true }).click()
  }
  const action = (name, phrase) => panel.locator('.el-table__body tr').filter({ hasText: phrase }).getByRole('button', { name, exact: true }).first()
  const selectModule = async () => {
    await panel.getByRole('combobox', { name: '请选择', exact: true }).first().press('ArrowDown')
    await page.getByRole('option', { name: '巡检管理', exact: true }).click()
  }
  const assertWorkbench = async () => {
    await panel.waitFor()
    assert.match(page.url(), /#\/workbench(?:\?|$)/)
  }

  await selectModule()
  await filter('项目经理确认')
  await action('处理', '项目经理确认').click()
  await page.locator('.handle-page').getByRole('button', { name: '返回', exact: true }).click()
  await assertWorkbench()
  assert.equal(await keyword.inputValue(), '项目经理确认')
  await panel.locator('.filter-bar').getByText('巡检管理', { exact: true }).waitFor()
  await action('处理', '项目经理确认').waitFor()

  await pickTab('我的已办')
  assert.equal(await keyword.inputValue(), '')
  await filter('施工方整改')
  await action('详情', '施工方整改').click()
  await page.locator('.handle-page').waitFor()
  await page.goBack()
  await assertWorkbench()
  assert.match(page.url(), /tab=done/)
  assert.equal(await keyword.inputValue(), '施工方整改')

  await pickTab('抄送我的')
  await filter('整改单抄送示例')
  await action('详情', '整改单抄送示例').click()
  await page.getByRole('heading', { name: '隐患详情' }).waitFor()
  await page.getByRole('button', { name: /返回/ }).click()
  await assertWorkbench()
  assert.match(page.url(), /tab=cc/)
  assert.equal(await keyword.inputValue(), '整改单抄送示例')

  await filter('巡检任务下发')
  await action('详情', '巡检任务下发').click()
  await page.getByRole('button', { name: /返回抄送我的/ }).click()
  await assertWorkbench()
  assert.equal(await keyword.inputValue(), '巡检任务下发')

  await pickTab('我的待办')
  assert.equal(await keyword.inputValue(), '项目经理确认')
  await panel.getByRole('button', { name: '重置', exact: true }).click()
  assert.equal(await keyword.inputValue(), '')
  await pickTab('我的已办')
  assert.equal(await keyword.inputValue(), '施工方整改')
  await page.reload()
  await assertWorkbench()
  assert.equal(await keyword.inputValue(), '施工方整改')
  assert.deepEqual(errors, [])
  console.log('PASS 工作台返回保留筛选，待办、已办及抄送筛选独立，重置及刷新正确')
} finally {
  await browser.close()
  await server.close()
}

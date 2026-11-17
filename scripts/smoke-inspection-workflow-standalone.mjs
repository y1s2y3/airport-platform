import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const file = resolve(import.meta.dirname, '../release/机场工程项目管理平台v2.html')
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const [stage, count, title, date] of [
    ['contractorAcceptance', 1, '施工单位项目经理验收', '施工验收日期'],
    ['directorAcceptance', 3, '监理单位项目总监验收', '总监验收日期'],
    ['approval', 4, '指挥部项目经理审批', '审批日期'],
  ]) {
    const id = `inspection-live-inspection-example-quality-a-${stage}-${count}`
    await page.goto(pathToFileURL(file).href + '#/personal-center/todo/handle?id=' + id + '&from=todo')
    await page.locator('.inspection-stage-banner').waitFor()
    assert.ok((await page.locator('.block--action .block-title').innerText()).includes(title))
    assert.equal(await page.locator(`input[placeholder="请选择${date}"]`).count(), 1)
    assert.ok((await page.locator('.page-viewport').innerText()).includes('按批准方案处理'))
    console.log('PASS 单文件直接打开：' + title)
  }
  assert.deepEqual(errors, [])
  console.log('PASS 固定预览入口已包含新版源代码，浏览器无异常')
} finally { await browser.close() }

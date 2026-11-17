import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const standalone = process.argv.includes('--standalone')
const server = standalone ? null : await createServer({ configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: 0, open: false } })
await server?.listen()
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const root = standalone ? pathToFileURL(resolve(import.meta.dirname, '../release/机场工程项目管理平台v2.html')).href : server.resolvedUrls.local[0]
const errors = []
async function open(stage, action) {
  const context = await browser.newContext({ viewport: { width: 402, height: 850 } })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${root}#/mobile/rectify/inspection-example-quality-a-${stage}${action === 'detail' ? '' : '/' + action}`)
  await page.locator('.mp .mt').waitFor()
  assert.ok((await page.locator('.mp').innerText()).includes('截止日期：'))
  assert.ok((await page.locator('.mp').innerText()).includes('状态：'))
  assert.ok((await page.locator('.mp').innerText()).includes('处理人：'))
  if (action !== 'detail') assert.equal(await page.locator('input[type=date]').inputValue(), await page.evaluate(() => { const d = new Date(); return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-') }))
  return { context, page }
}
try {
  for (const stage of ['contractorAcceptance', 'directorAcceptance']) {
    const { context, page } = await open(stage, 'review')
    await page.locator('.ab.reject').click()
    await page.getByText(/请输入.*意见/, { exact: false }).last().waitFor()
    assert.ok(page.url().endsWith('/review'))
    await page.locator('.ab.pass').click()
    await page.waitForURL(url => !url.hash.endsWith('/review'))
    await context.close()
  }
  console.log('PASS 两个验收节点：空意见不通过被拦截，通过可提交')
  for (const [stage, action, button] of [['review','review','.ab.pass'], ['approval','approval','.actions .pass']]) {
    const { context, page } = await open(stage, action)
    await page.locator(button).click()
    await page.getByText(/请输入.*意见/, { exact: false }).last().waitFor()
    assert.ok(page.url().endsWith(`/${action}`))
    if (stage === 'approval') {
      const text = await page.locator('.mp').innerText()
      for (const label of ['指挥部项目经理审批', '隐患照片', '复核日期', '施工单位项目经理验收通过', '监理单位项目总监验收通过']) assert.ok(text.includes(label), label)
    }
    await page.locator('textarea').fill('移动端核验意见')
    await page.locator(button).click()
    await page.waitForURL(url => !url.hash.endsWith(`/${action}`))
    await context.close()
  }
  console.log('PASS 复核、审批意见仍必填，填写后可流转；审批资料和前序意见可见')
  const { context, page } = await open('approval', 'detail')
  assert.equal(await page.locator('textarea, input[type=date], .actions').count(), 0)
  await context.close()
  const execute = await open('rectify', 'execute')
  await execute.context.close()
  assert.deepEqual(errors, [])
  console.log(`PASS ${standalone ? '固定HTML' : '开发页面'}移动端字段、日期默认值、只读详情，浏览器无异常`)
} finally {
  await browser.close()
  await server?.close()
}

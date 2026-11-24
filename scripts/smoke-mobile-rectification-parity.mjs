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
const basicFields = ['整改单编号', '巡检任务单编号', '项目名称', '巡检人', '整改人', '复查人', '状态', '当前流程节点', '截止日期']
const nodeLabels = {
  rectify: '施工单位整改',
  contractorAcceptance: '施工单位项目经理验收',
  review: '监理单位复核',
  directorAcceptance: '监理单位项目总监验收',
  approval: '指挥部项目经理审批',
  departmentConfirmation: '项目部长确认',
}
async function checkBasicInfo(page, expectedNode) {
  const info = page.locator('.rectify-basic-info')
  await info.waitFor()
  const fields = await info.locator('dt').allTextContents()
  assert.deepEqual(fields.filter(field => !['下发整改单抄送人', '整改单完成抄送人'].includes(field)), basicFields)
  assert.equal(await info.locator('.field').filter({ has: page.getByText('当前流程节点', { exact: true }) }).locator('dd').textContent(), expectedNode)
  assert.notEqual(await info.locator('dd').nth(3).textContent(), '--')
}
async function open(stage, action) {
  const context = await browser.newContext({ viewport: { width: 402, height: 850 } })
  const page = await context.newPage()
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${root}#/mobile/rectify/inspection-example-quality-a-${stage}${action === 'detail' ? '' : '/' + action}`)
  await page.locator('.mp .mt').waitFor()
  await checkBasicInfo(page, nodeLabels[stage])
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
  for (const [stage, action, button] of [['review','review','.ab.pass'], ['approval','approval','.actions .pass'], ['departmentConfirmation','approval','.actions .pass']]) {
    const { context, page } = await open(stage, action)
    await page.locator(button).click()
    await page.getByText(/请输入.*意见/, { exact: false }).last().waitFor()
    assert.ok(page.url().endsWith(`/${action}`))
    if (stage === 'departmentConfirmation') {
      await page.getByRole('heading', { name: '项目部长确认', exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: '通过并关闭', exact: true }).count(), 1)
    }
    if (stage === 'approval') {
      assert.equal(await page.getByRole('button', { name: '通过，提交项目部长', exact: true }).count(), 1)
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
  for (const listPath of ['/mobile/rectify', '/app/rectify']) {
    const list = await browser.newPage({ viewport: { width: 420, height: 850 } })
    list.on('pageerror', error => errors.push(error.message))
    if (listPath.startsWith('/app/')) {
      await list.goto(root + '#/app/login')
      await list.getByPlaceholder('请输入账号').fill('inspection-demo')
      await list.getByPlaceholder('请输入密码').fill('demo')
      await list.getByRole('button', { name: /登\s*录/ }).click()
      await list.getByRole('button', { name: /通知信息/ }).waitFor()
    }
    await list.goto(root + '#' + listPath)
    await list.locator('.m-tabs').getByRole('button', { name: /^待复查/ }).click()
    await list.locator('.rec-card').filter({ hasText: 'ZG202607007' }).click()
    await list.getByRole('heading', { name: '整改详情', exact: true }).filter({ visible: true }).waitFor()
    assert.ok(new URL(list.url()).hash.startsWith('#' + listPath + '/rec-007?'))
    await checkBasicInfo(list, '项目经理审批')
    const sections = await list.locator('.mp .sct').evaluateAll(nodes => nodes.map(node =>
      (node.matches('button') ? node.firstElementChild : node).textContent.trim(),
    ))
    assert.deepEqual(sections, [
      '基本信息', '隐患信息', '巡检照片', '整改信息', '复查信息', '项目经理审批', '流程记录',
    ])
    await list.getByText('审批中', { exact: true }).waitFor()
    assert.equal(await list.locator('.mp textarea, .mp input, .mp .actions').count(), 0)
    await list.getByRole('button', { name: '返回', exact: true }).click()
    await list.locator('.m-tabs .active').getByText('待复查', { exact: false }).waitFor()
    await list.close()
  }
  const execute = await open('rectify', 'execute')
  await execute.context.close()
  assert.deepEqual(errors, [])
  console.log(`PASS ${standalone ? '固定HTML' : '开发页面'}移动端字段、日期默认值、只读详情，浏览器无异常`)
} finally {
  await browser.close()
  await server?.close()
}

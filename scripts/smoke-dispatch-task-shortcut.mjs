import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer as createPortProbe } from 'node:net'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..')
const html = process.argv.find(value => value.startsWith('--html='))?.slice(7)
const built = process.argv.includes('--built') || !!html
const mode = html ? 'html' : built ? 'built' : 'dev'
const output = resolve(root, '../outputs/dispatch-task-shortcut', mode + '-' + Date.now())
mkdirSync(output, { recursive: true })
const checks = [], errors = []
const pass = (name, condition = true) => { assert.ok(condition, name); checks.push(name); console.log('PASS ' + name) }
let browser, server, currentPage
try {
  let origin
  if (built) origin = pathToFileURL(resolve(root, html || 'dist/index.html')).href
  else {
    const probe = createPortProbe()
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve) })
    const port = probe.address().port
    await new Promise(resolve => probe.close(resolve))
    server = await createServer({ root, configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, open: false } })
    await server.listen()
    origin = 'http://127.0.0.1:' + port + '/'
  }
  browser = await chromium.launch({ headless: true, executablePath: existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const newPage = async account => {
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(account => sessionStorage.setItem('web-login-session', JSON.stringify({ account })), account)
    currentPage = page
    return page
  }
  const goto = (page, path) => page.goto(origin + '#' + path)
  const records = page => page.evaluate(() => JSON.parse(localStorage.getItem('coc-admin-dispatch-notices') || '[]'))
  const rows = page => page.locator('.pc-page .el-table__body-wrapper tbody tr')
  const pageNumber = async page => Number(await page.locator('.pc-page .el-pager li.is-active').innerText())
  const first = await newPage('1')
  await goto(first, '/coc-admin/notice')
  await first.locator('.dispatch-task-prototype-hint').waitFor()
  pass('任务单标题旁显示指定的原型提示和快速入口', (await first.locator('.dispatch-task-title').innerText()).includes('原型提示：处理页面进入【工作台】-【我的待办】查看，') && await first.getByRole('button', { name: '快速入口', exact: true }).isVisible())
  for (const width of [1920, 1440, 1024]) {
    await first.setViewportSize({ width, height: 900 })
    const box = await first.locator('.dispatch-task-prototype-hint').boundingBox()
    pass(width + 'px原型提示完整留在内容区域内', box.x >= 0 && box.x + box.width <= width)
    await first.screenshot({ path: resolve(output, 'task-hint-' + width + '.png'), animations: 'disabled' })
  }
  await first.setViewportSize({ width: 1440, height: 900 })
  const initial = await records(first)
  const target = initial.find(task => task.demo && task.status === '处理中' && task.executorAssignments.some(actor => actor.userId === 'inspection-coc-demo'))
  assert.ok(target)
  await goto(first, '/workbench')
  await first.locator('.pc-page').waitFor()
  // 从普通入口逐页查找，独立核对快捷入口定位的是实际列表页码。
  let expectedPage = 1
  while (!await rows(first).filter({ hasText: target.workRequirement }).count()) {
    assert.ok(!await first.locator('.pc-page .btn-next').isDisabled(), '完整待办中应存在当前账号任务单')
    await first.locator('.pc-page .btn-next').click()
    expectedPage += 1
    await first.waitForFunction(page => Number(document.querySelector('.pc-page .el-pager li.is-active')?.textContent) === page, expectedPage)
  }
  pass('核对任务单在完整待办中的实际页码', await pageNumber(first) === expectedPage)
  await goto(first, '/coc-admin/notice')
  await first.getByRole('button', { name: '快速入口', exact: true }).click()
  await first.waitForURL(url => url.hash.startsWith('#/workbench?'))
  const focused = first.locator('.pc-page .el-table__body-wrapper .current-row')
  await focused.waitFor()
  pass('快捷入口选中我的待办，并定位高亮任务单实际所在页', await first.getByRole('tab', { name: '我的待办', exact: true }).getAttribute('aria-selected') === 'true' && await pageNumber(first) === expectedPage && (await focused.innerText()).includes(target.workRequirement))
  pass('定位保留完整待办列表，没有通过筛选伪装成第一页', await first.getByRole('textbox', { name: '请输入流程名称', exact: true }).inputValue() === '')
  await first.screenshot({ path: resolve(output, 'workbench-task-focused.png'), animations: 'disabled' })
  const anotherPage = expectedPage === 1 ? 2 : 1
  const jumper = first.locator('.pc-page .el-pagination__jump input')
  await jumper.fill(String(anotherPage))
  await jumper.press('Enter')
  await first.waitForFunction(page => Number(document.querySelector('.pc-page .el-pager li.is-active')?.textContent) === page, anotherPage)
  pass('定位完成后仍可正常手动翻页', await pageNumber(first) === anotherPage)
  await first.getByRole('tab', { name: '我的已办', exact: true }).click()
  await first.waitForURL(url => url.hash.includes('tab=done'))
  const firstDoneRows = await rows(first).allTextContents()
  pass('我的已办第一页优先显示任务单两种处理结果示例', await pageNumber(first) === 1 && firstDoneRows[0].includes('任务单·示例：') && firstDoneRows[1].includes('任务单·示例：'))
  await first.screenshot({ path: resolve(output, 'workbench-done-examples.png'), animations: 'disabled' })
  const protectedRecords = await records(first)
  const accountChecks = [['inspection.dispatch.demo', 'inspection-dispatch-demo'], ['chenjing', 'u-003'], ['videoAdmin', 'u-004']]
  let replyPage, replyTask
  for (const [account, userId] of accountChecks) {
    const page = await newPage(account)
    await goto(page, '/workbench?tab=done')
    await page.locator('.pc-page').waitFor()
    const all = await records(page)
    const owned = all.filter(task => task.demo && task.reply?.actorUserId === userId)
    pass(account + '直接进入工作台也有自己的已执行与无需执行示例', owned.some(task => task.reply.result === '已执行') && owned.some(task => task.reply.result === '无需执行') && (await rows(page).first().innerText()).includes('任务单·示例：'))
    const pending = all.find(task => task.demo && task.status === '处理中' && task.executorAssignments.some(actor => actor.userId === userId))
    pass(account + '有本账号可办理的待处理示例', !!pending)
    const countBeforeReload = all.length
    await page.reload()
    await page.locator('.pc-page').waitFor()
    pass(account + '刷新不重复增加示例，也不改其他账号记录', (await records(page)).length === countBeforeReload && protectedRecords.every(old => JSON.stringify(all.find(task => task.id === old.id)) === JSON.stringify(old)))
    await goto(page, '/coc-admin/notice')
    await page.getByRole('button', { name: '快速入口', exact: true }).click()
    await page.locator('.pc-page .current-row').waitFor()
    pass(account + '快速入口定位到本账号可处理的示例', (await page.locator('.pc-page .current-row').innerText()).includes(pending.workRequirement))
    if (account === 'chenjing') { replyPage = page; replyTask = pending }
  }
  currentPage = replyPage
  await replyPage.locator('.pc-page .current-row').getByRole('button', { name: '处理', exact: true }).click()
  await replyPage.locator('.dispatch-task-reply-form').waitFor()
  pass('默认示例可以进入完整任务处理表单', await replyPage.getByRole('textbox', { name: '处理说明', exact: true }).isVisible())
  await replyPage.locator('.dispatch-task-reply-form .el-radio').filter({ hasText: '已执行' }).click()
  await replyPage.getByRole('textbox', { name: '处理说明', exact: true }).fill('QA：本账号已核查示例任务。')
  await replyPage.getByRole('button', { name: '提交处理', exact: true }).click()
  await replyPage.waitForURL(url => !url.hash.includes('/handle'))
  const afterReply = await records(replyPage)
  await replyPage.reload()
  await goto(replyPage, '/workbench?tab=done')
  await replyPage.locator('.pc-page').waitFor()
  const reloaded = await records(replyPage)
  pass('示例处理成功归实际账号，刷新不恢复待办或补造新回复', afterReply.find(task => task.id === replyTask.id).reply.actorUserId === 'u-003' && reloaded.length === afterReply.length && reloaded.find(task => task.id === replyTask.id).status === '已完成')
  await first.goto(origin + '#/personal-center/todo/handle?from=done&id=' + encodeURIComponent('done-notice-' + encodeURIComponent(replyTask.id)))
  await first.getByText('记录不存在或已删除', { exact: true }).waitFor()
  pass('每个账号都有独立示例，其他账号仍不能越权查看这条已办')
  pass('浏览器无运行错误', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ mode, expectedPage, checks, errors }, null, 2))
  console.log(JSON.stringify({ mode, passed: checks.length, expectedPage, output }))
} catch (error) {
  await currentPage?.screenshot({ path: resolve(output, 'failure.png'), animations: 'disabled' }).catch(() => {})
  throw error
} finally { await browser?.close(); await server?.close() }

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer as createPortProbe } from 'node:net'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..'), built = process.argv.includes('--built'), mode = built ? 'built' : 'dev'
const output = resolve(root, '../outputs/dispatch-task-reply', mode + '-' + Date.now())
mkdirSync(output, { recursive: true })
const checks = [], errors = [], key = 'coc-admin-dispatch-notices', marker = 'QA_TASK_'
const pass = (name, condition = true) => { assert.ok(condition, name); checks.push(name); console.log('PASS ' + name) }
const actors = ['COC调度室', '陈静（COC调度员）']
const photoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#344f67"/><text x="80" y="180" font-size="36" fill="white">任务处理现场（核验图片）</text></svg>'
const photo = 'data:image/svg+xml,' + encodeURIComponent(photoSvg)
const make = (id, status, extra = {}) => ({ id: 'GZ-QA-' + id, project: 'T2项目', workType: '安全', workSource: '调度会议',
  workRequirement: marker + id + '：复核临边防护，回复实际处理情况。', executors: [...actors], executor: actors.join('、'),
  executorAssignments: [{ label: actors[0], userId: 'inspection-coc-demo' }, { label: actors[1], userId: 'u-003' }],
  deadline: '2026-11-20', remark: '核验数据', createdBy: '创建核验人', createdAt: '2026-11-08 08:10:00', issuedBy: '下发核验人',
  issueTime: status === '待下发' || status === '已作废' ? '--' : '2026-11-09 09:20:30', issuer: '登记核验人', status, attachments: [], ...extra })
const fixtureReply = (result, user = 0) => ({ actor: actors[user], actorUserId: user === 0 ? 'inspection-coc-demo' : 'u-003',
  time: '2026-11-09 15:20:30', result, remark: '核验处理说明\n保留换行和特殊字符 < & >。', attachments: [{ name: '核验照片.svg', url: photo }] })
const fixtures = [make('PENDING', '待下发'), make('EXECUTE', '处理中'), make('NOACTION', '处理中'), make('VOID-DRAFT', '待下发'),
  make('COMPLETED', '已完成', { reply: fixtureReply('已执行'), closedTime: '2026-11-09 15:20:30', closedBy: '系统' }),
  make('NOT-NEEDED', '无需执行', { reply: fixtureReply('无需执行', 1), closedTime: '2026-11-09 15:20:30', closedBy: '系统' }),
  make('VOID', '已作废', { voidedBy: '作废核验人', voidedAt: '2026-11-09 17:20:30' }),
  make('LEGACY', '已接收', { receivedTime: '2026-10-10 10:20:30', receivedBy: '历史签收人' }),
  make('RACE', '处理中'), make('ERROR', '处理中')]
let server, browser
try {
  let origin
  if (built) origin = pathToFileURL(resolve(root, 'dist/index.html')).href
  else {
    const probe = createPortProbe()
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve) })
    const port = probe.address().port
    await new Promise(resolve => probe.close(resolve))
    server = await createServer({ root, configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, open: false } })
    await server.listen(); origin = 'http://127.0.0.1:' + port + '/'
  }
  browser = await chromium.launch({ headless: true, executablePath: existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, timezoneId: 'America/Los_Angeles' })
  const page = await context.newPage()
  page.setDefaultTimeout(15000); page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => { if (!sessionStorage.getItem('web-login-session')) sessionStorage.setItem('web-login-session', JSON.stringify({ account: '1' })) })
  const goto = (target, path) => target.goto(origin + '#' + path)
  await goto(page, '/coc-admin/notice'); await page.locator('.admin-page').waitFor()
  await page.evaluate(records => { const old = JSON.parse(localStorage.getItem('coc-admin-dispatch-notices') || '[]'); localStorage.setItem('coc-admin-dispatch-notices', JSON.stringify([...records, ...old])) }, fixtures)
  await page.reload(); await page.locator('.admin-page').waitFor()
  const untouched = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('coc-admin-dispatch-notices')).filter(item => !item.workRequirement?.startsWith('QA_TASK_'))))
  const record = async id => page.evaluate(id => JSON.parse(localStorage.getItem('coc-admin-dispatch-notices')).find(item => item.id === 'GZ-QA-' + id), id)
  const row = id => page.locator('.admin-page .el-table__body-wrapper tbody tr').filter({ hasText: marker + id + '：' })
  const detail = () => page.locator('.dispatch-task-dialog-detail.el-dialog')
  const closeDetail = async () => { await detail().locator('.el-dialog__headerbtn').click(); await detail().waitFor({ state: 'hidden' }) }
  pass('台账首次可见五种新状态及多执行人', await row('COMPLETED').innerText().then(value => value.includes('已完成')) && await row('NOT-NEEDED').innerText().then(value => value.includes('无需执行')) && await row('EXECUTE').innerText().then(value => value.includes('陈静')))
  pass('旧已接收只转换为处理中，签收信息保留且没有伪造回复', (await row('LEGACY').innerText()).includes('处理中') && !(await record('LEGACY')).reply && (await record('LEGACY')).receivedTime === '2026-10-10 10:20:30')
  assert.deepEqual(await row('PENDING').getByRole('button').allTextContents().then(values => values.map(value => value.trim())), ['详情', '确认下发', '编辑', '作废'])
  for (const id of ['EXECUTE', 'COMPLETED', 'NOT-NEEDED', 'VOID']) assert.deepEqual(await row(id).getByRole('button').allTextContents().then(values => values.map(value => value.trim())), ['详情'])
  pass('只有待下发允许编辑、确认下发和作废，其余仅详情')
  for (const [id, titles] of [['PENDING', ['创建任务单', '下发任务单']], ['EXECUTE', ['创建任务单', '下发任务单', '执行人回复']],
    ['COMPLETED', ['创建任务单', '下发任务单', '执行人回复', '流程结束']], ['NOT-NEEDED', ['创建任务单', '下发任务单', '执行人回复', '流程结束']], ['VOID', ['创建任务单', '作废任务单']]]) {
    await row(id).getByRole('button', { name: '详情', exact: true }).click(); await detail().waitFor()
    assert.deepEqual(await detail().locator('.dispatch-task-heading').allTextContents(), ['基本信息', '任务处理详情', '处理流程'])
    assert.deepEqual(await detail().locator('.dispatch-task-flow-title').allTextContents().then(values => values.map(value => value.replace('终止', '').trim())), titles)
    if (id === 'VOID') pass('作废详情展示专属作废人和时间，未出现正常结束节点', (await detail().innerText()).includes('作废核验人 · 2026-11-09 17:20:30'))
    await closeDetail()
  }
  pass('五种状态流程节点和详情三层结构正确')
  for (const width of [1920, 1440, 1024]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 760 })
    await row('COMPLETED').getByRole('button', { name: '详情', exact: true }).click(); await detail().waitFor()
    await detail().screenshot({ path: resolve(output, 'detail-' + width + '.png'), animations: 'disabled' })
    const layout = await detail().evaluate(el => {
      const body = el.querySelector('.el-dialog__body'), sections = [...el.querySelectorAll('.dispatch-task-section')], box = el.getBoundingClientRect()
      return { x: box.x, right: box.right, top: box.top, bottom: box.bottom, bodyScroll: getComputedStyle(body).overflowY,
        gap1: sections[1].getBoundingClientRect().top - sections[0].getBoundingClientRect().bottom,
        gap2: sections[2].getBoundingClientRect().top - sections[1].getBoundingClientRect().bottom }
    })
    pass(width + 'px详情区块统一32px间距，弹窗在视口内，正文单独滚动', Math.abs(layout.gap1 - 32) < 1 && Math.abs(layout.gap2 - 32) < 1 && layout.x >= 0 && layout.right <= width && layout.top >= 0 && layout.bottom <= (width === 1920 ? 1080 : 760) && layout.bodyScroll === 'auto')
    const before = await detail().locator('.el-dialog__header').boundingBox()
    await detail().locator('.el-dialog__body').evaluate(el => { el.scrollTop = el.scrollHeight })
    await detail().screenshot({ path: resolve(output, 'detail-scrolled-' + width + '.png'), animations: 'disabled' })
    const after = await detail().locator('.el-dialog__header').boundingBox()
    pass(width + 'px滚动后标题仍固定且流程结束可见', Math.abs(before.y - after.y) < 1 && await detail().getByText('流程结束', { exact: true }).isVisible())
    await closeDetail()
  }
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.getByRole('button', { name: '新增', exact: true }).click()
  const formDialog = page.locator('.dispatch-task-dialog-form.el-dialog')
  await formDialog.waitFor()
  await formDialog.getByRole('combobox', { name: '选择或输入项目名称', exact: true }).fill('T2项目')
  await page.getByRole('option', { name: 'T2项目', exact: true }).click()
  await formDialog.locator('.el-radio-button').filter({ hasText: '安全' }).click()
  await formDialog.getByRole('textbox', { name: '请描述工作要求，将作为任务单正文', exact: true }).fill(marker + 'CREATED：通过实际表单创建多执行人任务。')
  await formDialog.locator('.el-form-item').filter({ hasText: '工作来源' }).locator('.el-select__wrapper').click()
  await page.getByRole('option', { name: '调度会议', exact: true }).click()
  const executorInput = formDialog.getByRole('combobox', { name: '选择执行人', exact: true })
  await executorInput.fill('COC调度室'); await page.getByRole('option').filter({ hasText: 'COC调度室' }).first().click()
  await executorInput.fill('陈静'); await page.getByRole('option').filter({ hasText: '陈静' }).first().click()
  await formDialog.locator('.el-form-item').filter({ hasText: '完成时限' }).locator('input').fill('2026-11-20')
  await formDialog.locator('.el-form-item').filter({ hasText: '完成时限' }).locator('input').press('Tab')
  await formDialog.screenshot({ path: resolve(output, 'create-multiple-executors.png'), animations: 'disabled' })
  pass('任务单新增表单可选择两名真实启用用户，底部保存按钮可见', await formDialog.locator('.el-select__selected-item').allTextContents().then(values => values.some(value => value.includes('COC调度室')) && values.some(value => value.includes('陈静'))) && await formDialog.getByRole('button', { name: '保存', exact: true }).isVisible())
  await formDialog.getByRole('button', { name: '保存', exact: true }).click(); await formDialog.waitFor({ state: 'hidden' })
  const created = await page.evaluate(() => JSON.parse(localStorage.getItem('coc-admin-dispatch-notices')).find(item => item.workRequirement.startsWith('QA_TASK_CREATED')))
  pass('实际创建保存多执行人账号引用及当前创建用户、秒级创建时间', created.status === '待下发' && created.executors.length === 2 && created.executorAssignments.length === 2 && created.createdBy === 'COC调度室' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(created.createdAt))
  await row('CREATED').getByRole('button', { name: '编辑', exact: true }).click(); await formDialog.waitFor()
  pass('编辑回显全部执行人，取消不改写已保存任务', await formDialog.locator('.el-select__selected-item').allTextContents().then(values => values.some(value => value.includes('COC调度室')) && values.some(value => value.includes('陈静'))))
  await formDialog.getByRole('button', { name: '取消', exact: true }).click(); await formDialog.waitFor({ state: 'hidden' })
  await row('VOID-DRAFT').getByRole('button', { name: '作废', exact: true }).click()
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('coc-admin-dispatch-notices')).find(item => item.id === 'GZ-QA-VOID-DRAFT').status === '已作废')
  pass('下发前作废写入当前用户和秒级时间', (await record('VOID-DRAFT')).voidedBy === 'COC调度室' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test((await record('VOID-DRAFT')).voidedAt))
  await row('PENDING').getByRole('button', { name: '确认下发', exact: true }).click()
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('coc-admin-dispatch-notices')).find(item => item.id === 'GZ-QA-PENDING').status === '处理中')
  pass('确认下发进入处理中并记录实际下发人和秒级时间', (await record('PENDING')).issuedBy === 'COC调度室' && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test((await record('PENDING')).issueTime))

  const peer = await context.newPage(); peer.setDefaultTimeout(15000); peer.on('pageerror', error => errors.push(error.message))
  await peer.addInitScript(() => sessionStorage.setItem('web-login-session', JSON.stringify({ account: 'chenjing' })))
  const personal = async (target, tab, text) => {
    await goto(target, '/personal-center?tab=' + tab)
    const input = target.getByRole('textbox', { name: '请输入流程名称', exact: true }); await input.waitFor(); await input.fill(text)
    return target.locator('.pc-page .el-table__body-wrapper tbody tr')
  }
  const aRows = await personal(page, 'todo', marker + 'EXECUTE')
  const bRows = await personal(peer, 'todo', marker + 'EXECUTE')
  pass('同一多执行人任务分别进入各自待办，待办入口为处理', await aRows.count() === 1 && await bRows.count() === 1 && await aRows.getByRole('button', { name: '处理', exact: true }).isVisible())
  await aRows.getByRole('button', { name: '处理', exact: true }).click()
  await bRows.getByRole('button', { name: '处理', exact: true }).click()
  await page.locator('.dispatch-task-handler').waitFor(); await peer.locator('.dispatch-task-handler').waitFor()
  pass('处理页包含任务信息、任务处理、自动时间提示和待处理状态', (await page.locator('.dispatch-task-handler').innerText()).includes('提交成功时由系统自动记录') && (await page.locator('.dispatch-task-handle-state').innerText()).includes('待处理') && await page.getByRole('textbox', { name: '处理说明', exact: true }).isVisible())
  await page.getByRole('button', { name: '提交处理', exact: true }).click()
  await page.getByText('请选择处理结果', { exact: true }).waitFor()
  await page.locator('.dispatch-task-reply-form .el-radio').filter({ hasText: '已执行' }).click()
  await page.getByRole('button', { name: '提交处理', exact: true }).click()
  await page.getByText('请填写处理说明', { exact: true }).waitFor()
  pass('处理结果和说明均必填，校验失败不结束任务', !(await record('EXECUTE')).reply)
  await page.getByRole('textbox', { name: '处理说明', exact: true }).fill('现场已核查，防护已落实。\n保留第二行说明。')
  await page.locator('.dispatch-task-reply-form input[type=file]').setInputFiles({ name: '处理照片.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(photoSvg) })
  await page.locator('.dispatch-task-reply-form .thumb-card').waitFor()
  await page.screenshot({ path: resolve(output, 'todo-processing.png'), fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '提交处理', exact: true }).click()
  await page.waitForURL(url => url.hash.startsWith('#/personal-center') && !url.hash.includes('/handle'))
  const handled = await record('EXECUTE')
  pass('实际提交生成唯一已执行回复和秒级系统时间，图片及换行保留', handled.status === '已完成' && handled.reply.actorUserId === 'inspection-coc-demo' && handled.reply.result === '已执行' && handled.reply.attachments.length === 1 && handled.reply.remark.includes('\n') && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(handled.reply.time) && handled.reply.time === handled.closedTime)
  await peer.waitForURL(url => url.hash.startsWith('#/personal-center') && !url.hash.includes('/handle'))
  pass('其余执行人的已打开待办同步失效并返回列表', !(await peer.locator('.dispatch-task-reply-form').count()))
  pass('回复者我的已办仅一条，另一执行人无待办也无已办', await (await personal(page, 'done', marker + 'EXECUTE')).count() === 1 && await (await personal(peer, 'todo', marker + 'EXECUTE')).count() === 0 && await (await personal(peer, 'done', marker + 'EXECUTE')).count() === 0)
  await (await personal(page, 'done', marker + 'EXECUTE')).getByRole('button', { name: '详情', exact: true }).click()
  await page.locator('.dispatch-task-handler').waitFor()
  pass('我的已办只读显示回复及完整流程，不允许再次处理', !await page.getByRole('button', { name: '提交处理', exact: true }).count() && (await page.locator('.dispatch-task-reply').innerText()).includes('现场已核查') && await page.locator('.dispatch-task-flow-title').count() === 4)
  const aDoneUrl = page.url()
  await peer.goto(aDoneUrl)
  await peer.getByText('记录不存在或已删除', { exact: true }).waitFor()
  pass('其他用户不能通过已办深链越权查看处理人的已办记录')
  const noRows = await personal(peer, 'todo', marker + 'NOACTION')
  await noRows.getByRole('button', { name: '处理', exact: true }).click(); await peer.locator('.dispatch-task-handler').waitFor()
  await peer.locator('.dispatch-task-reply-form .el-radio').filter({ hasText: '无需执行' }).click()
  await peer.getByRole('textbox', { name: '处理说明', exact: true }).fill('现场确认施工安排已经取消，无需执行。')
  await peer.getByRole('button', { name: '提交处理', exact: true }).click()
  await peer.waitForURL(url => url.hash.startsWith('#/personal-center') && !url.hash.includes('/handle'))
  pass('无需执行由第二执行人回复后独立终结，只归第二人的已办', (await record('NOACTION')).status === '无需执行' && (await record('NOACTION')).reply.actorUserId === 'u-003' && await (await personal(peer, 'done', marker + 'NOACTION')).count() === 1 && await (await personal(page, 'done', marker + 'NOACTION')).count() === 0)
  await page.reload()
  pass('刷新后已办从原始回复恢复且不会重复生成', await (await personal(peer, 'done', marker + 'NOACTION')).count() === 1)
  if (!built) {
    const submission = async target => target.evaluate(async () => {
      const { submitDispatchTaskReply } = await import('/src/coc/utils/dispatchMeetingStorage.js')
      return submitDispatchTaskReply('GZ-QA-RACE', { result: '已执行', remark: '同时提交的核验结果' })
    })
    const race = await Promise.all([submission(page), submission(peer)])
    pass('两个标签页同时提交仅一次成功，原始任务仅一份回复', race.filter(value => value.ok).length === 1 && !!(await record('RACE')).reply)
    const firstReply = JSON.stringify((await record('RACE')).reply)
    const repeated = await submission(page)
    pass('迟到和重复请求明确失败，首次回复保持不变', !repeated.ok && firstReply === JSON.stringify((await record('RACE')).reply))
    const failure = await page.evaluate(async () => {
      const { submitDispatchTaskReply } = await import('/src/coc/utils/dispatchMeetingStorage.js')
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = function(key, value) { if (key === 'coc-admin-dispatch-notices') throw new DOMException('QA storage full', 'QuotaExceededError'); return original.call(this, key, value) }
      try { await submitDispatchTaskReply('GZ-QA-ERROR', { result: '已执行', remark: '保存异常测试' }); return false } catch { return true } finally { Storage.prototype.setItem = original }
    })
    pass('持久化失败不会生成回复或伪造已办成功', failure && !(await record('ERROR')).reply)
  }
  const after = await page.evaluate(before => {
    const ids = new Set(JSON.parse(before).map(item => item.id))
    return JSON.stringify(JSON.parse(localStorage.getItem('coc-admin-dispatch-notices')).filter(item => ids.has(item.id)))
  }, untouched)
  pass('核验期间保留所有非测试任务和已有用户数据', untouched === after)
  await goto(page, '/coc-admin/reminder'); await page.locator('.admin-page').waitFor()
  pass('提示函仍显示原有已下发、已接收状态', (await page.locator('.admin-page').innerText()).includes('已下发') && (await page.locator('.admin-page').innerText()).includes('已接收'))
  await goto(page, '/coc-admin/penalty'); await page.locator('.penalty-ledger').waitFor()
  pass('处罚单台账及模板导出入口保留', await page.locator('.penalty-ledger').getByRole('button', { name: '导出', exact: true }).count() > 0)
  pass('浏览器无运行错误', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ mode, checks, errors }, null, 2))
  console.log(JSON.stringify({ mode, passed: checks.length, output }))
} finally { await browser?.close(); await server?.close() }

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..'), output = resolve(root, '../outputs/inspection-ledger-query')
const base = '/coc-admin/daily-dispatch-check', checks = [], errors = []
mkdirSync(output, { recursive: true })
function pass(name, condition = true) { assert.ok(condition, name); checks.push(name); console.log('PASS ' + name) }
async function freePort() {
  const server = createNetServer()
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}
async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('airport-daily-dispatch-check-v1')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction(['days', 'logs'], 'readonly')
      const days = tx.objectStore('days').getAll(), logs = tx.objectStore('logs').getAll()
      tx.oncomplete = () => { db.close(); resolve(JSON.stringify({ days: days.result, logs: logs.result })) }
      tx.onabort = () => { db.close(); reject(tx.error) }
    }
  }))
}
let server, browser, page
try {
  const port = await freePort()
  server = await createServer({ configLoader: 'native', root, logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, open: false } })
  await server.listen()
  const origin = 'http://127.0.0.1:' + port
  browser = await chromium.launch({ headless: true, executablePath: existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Los_Angeles' })
  page = await context.newPage(); page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const daily = () => page.getByRole('tabpanel', { name: '每日检查', exact: true })
  const summary = () => page.getByRole('tabpanel', { name: '检查统计', exact: true })
  const rows = pane => pane.locator('.daily-ledger-list .el-table__body-wrapper tbody tr')
  const range = pane => pane.locator('.el-range-input').evaluateAll(inputs => inputs.map(input => input.value))
  const count = async pane => Number((await pane.locator('.el-pagination__total').innerText()).match(/\d+/)[0])
  const dates = pane => rows(pane).locator('td:first-child').allTextContents().then(values => values.map(value => value.trim()))
  async function idle() { await page.waitForFunction(() => !document.querySelector('.daily-dispatch-ledger .el-loading-mask') && !document.querySelector('.daily-dispatch-detail > .el-loading-mask')) }
  async function query(pane, value) {
    const inputs = pane.locator('.el-range-input'), current = await range(pane), order = current[1] && value[0] > current[1] ? [1, 0] : [0, 1]
    for (const index of order) { await inputs.nth(index).fill(value[index]); await inputs.nth(index).press('Tab') }
    await page.keyboard.press('Escape')
    assert.deepEqual(await range(pane), value)
    await pane.getByRole('button', { name: '查询', exact: true }).click()
  }
  async function clear(pane) {
    await pane.locator('.el-date-editor').hover()
    await pane.locator('.el-range__close-icon').click()
    assert.deepEqual(await range(pane), ['', ''])
    await pane.getByRole('button', { name: '查询', exact: true }).click()
  }
  async function size(pane, value) {
    const input = pane.locator('.business-table-pagination').getByRole('combobox')
    await input.focus(); await input.press('ArrowDown')
    const id = await input.getAttribute('aria-controls')
    await page.locator(`[id="${id}"]`).getByRole('option', { name: value + '条/页', exact: true }).click()
  }
  async function jump(pane, number) { const input = pane.locator('.el-pagination__jump input'); await input.fill(String(number)); await input.press('Enter') }
  async function tab(name) { await page.getByRole('tab', { name, exact: true }).click(); await page.getByRole('tabpanel', { name, exact: true }).waitFor() }
  async function returnButton() { await page.getByRole('button', { name: '返回', exact: true }).click(); await daily().waitFor(); await idle() }
  async function detailFromDate(date, entry = '查看详情') {
    await rows(daily()).filter({ hasText: date }).getByRole('button', { name: entry, exact: true }).click()
    await page.locator('.daily-dispatch-detail').waitFor(); await idle()
  }
  pass('页面返回HTTP 200', (await page.goto(origin + '/#' + base)).status() === 200)
  await daily().waitFor(); await idle()
  const defaults = await page.evaluate(() => {
    const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 12)
    const format = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const expected = [format(start), format(now)]
    return { daily: expected, summary: [...expected] }
  })
  pass('每日检查默认含当天向前共30个自然日', JSON.stringify(await range(daily())) === JSON.stringify(defaults.daily))

  const info = await page.evaluate(async () => {
    const R = await import('/src/utils/dailyDispatchCheckRules.js')
    const { dailyDispatchRepository: repo } = await import('/src/composables/useDailyDispatchCheck.js')
    const { projectList } = await import('/src/mock/projectBasicInfo.js')
    const { sysUserRecords } = await import('/src/mock/sysUsers.js')
    const projectId = 'query-history-hidden', blankProjectId = 'query-history-hidden-blank'
    projectList.push({ ...projectList[0], id: projectId, projectName: '当前隐藏的历史项目', hidden: true }, { ...projectList[0], id: blankProjectId, projectName: '历史隐藏未填写项目', hidden: true })
    sysUserRecords.value.push({ id: 'query-dispatch', name: '查询验证调度员', status: true, orgId: 'org-quality', projectIds: [projectId] })
    const image = { name: 'DETAIL_ONLY.svg', url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#eee"/><text x="16" y="70">DETAIL_ONLY</text></svg>'), size: 200 }
    const fixtures = []
    for (let index = 0; index < 62; index++) fixtures.push(R.emptyDay(R.offsetDate('2026-07-01', index), [{ id: projectId, projectName: '历史项目名称快照' }, { id: blankProjectId, projectName: '历史隐藏未填写项目' }], '2026-07-01T00:00:00Z'))
    const day = fixtures.find(day => day.date === '2026-07-15'), at = '2026-07-15T01:00:00Z'
    Object.assign(day.hq, { version: 1, firstSubmittedAt: at, updatedAt: at })
    Object.assign(day.hq.headers, { dispatcherId: 'query-dispatch', dispatcher: '查询验证调度员', focusDepartment: '安质部' })
    Object.assign(day.hq.rows[0], { unified: true, personnel: { type: 'normal', text: '' }, safety: { ...R.emptyCheck(), type: 'problem', problems: [{ text: 'DETAIL_ONLY：历史检查问题', images: [image] }, { text: '第二条安全问题', images: [image] }] }, quality: { ...R.emptyCheck(), type: 'problem', problems: [{ text: '质量问题', images: [image] }] }, camera: { ...R.emptyCheck(), type: 'normal' } })
    day.people[projectId] = Object.fromEntries(['duty', 'manager'].map(part => [part, { ...R.emptyPerson(), userId: 'query-dispatch', name: '查询验证调度员', check: { ...R.emptyCheck(), type: 'normal', normalText: R.NORMAL_PROJECT_TEXT, normalImages: [image] }, version: 1, firstSubmittedAt: at, updatedAt: at }]))
    await new Promise((resolve, reject) => {
      const open = indexedDB.open('airport-daily-dispatch-check-v1')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result, tx = db.transaction(['days'], 'readwrite')
        for (const day of fixtures) tx.objectStore('days').put(day)
        tx.oncomplete = () => { db.close(); resolve() }; tx.onabort = () => { db.close(); reject(tx.error) }
      }
    })
    const all = await repo.listLedgerSummaries(), originalList = repo.listLedgerSummaries.bind(repo), originalDay = repo.getDay.bind(repo)
    window.__ledgerProbe = { reads: 0, details: 0, legacy: 0, failNext: false, originalList, originalDay }
    repo.listLedgerSummaries = async () => { const probe = window.__ledgerProbe; probe.reads++; if (probe.failNext) { probe.failNext = false; throw new Error('验证读取失败') } return originalList() }
    repo.getDay = (...args) => { window.__ledgerProbe.details++; return originalDay(...args) }
    repo.listDays = () => { window.__ledgerProbe.legacy++; throw new Error('台账不得读取所有完整日表') }
    return { allCount: all.length, projectId, blankProjectId, compact: !JSON.stringify(all).includes('DETAIL_ONLY'), unique: new Set(all.map(row => row.date)).size === all.length }
  })
  await daily().getByRole('button', { name: '刷新', exact: true }).click(); await idle()
  pass('台账仅接收摘要，不包含完整问题或附件URL', info.compact && info.unique)
  pass('打开台账不预读完整日表', (await page.evaluate(() => window.__ledgerProbe.details)) === 0)
  const before = await snapshot(page)
  await query(daily(), ['2026-07-01', '2026-07-31'])
  pass('日期范围包含起止日期且实际总数31条', await count(daily()) === 31 && (await dates(daily()))[0] === '2026-07-31')
  pass('默认每页10条，不一次渲染全部历史', await rows(daily()).count() === 10)
  await daily().locator('.btn-next').click()
  pass('下一页显示后续记录', (await dates(daily()))[0] === '2026-07-21')
  await daily().locator('.btn-prev').click()
  pass('上一页回到原记录', (await dates(daily()))[0] === '2026-07-31')
  await jump(daily(), 4)
  pass('指定页码和尾页正常', await rows(daily()).count() === 1 && (await dates(daily()))[0] === '2026-07-01')
  for (const value of [20, 50, 10]) { await size(daily(), value); pass('每页' + value + '条且切换回到第一页', await rows(daily()).count() === Math.min(value, 31) && await daily().locator('.btn-prev').isDisabled()) }
  await jump(daily(), 3); await query(daily(), ['2026-07-15', '2026-07-16'])
  pass('筛选变化回到第一页，包含已保存空白表', await rows(daily()).count() === 2 && await daily().locator('.btn-prev').isDisabled() && (await dates(daily())).includes('2026-07-16'))
  const readCount = await page.evaluate(() => window.__ledgerProbe.reads)
  await clear(daily())
  pass('清空日期查询所有历史且不额外读取或恢复默认日期', await count(daily()) === info.allCount && (await page.evaluate(() => window.__ledgerProbe.reads)) === readCount && await rows(daily()).count() === 10)
  await jump(daily(), Math.ceil(info.allCount / 10))
  pass('清空日期后可通过分页访问最早历史', (await dates(daily())).includes('2026-07-01'))
  await tab('检查统计')
  pass('检查统计仍默认最近30个自然日', JSON.stringify(await range(summary())) === JSON.stringify(defaults.summary))
  await query(summary(), ['2026-08-01', '2026-08-31']); await size(summary(), 20); await jump(summary(), 2)
  await tab('每日检查'); await query(daily(), ['2026-07-01', '2026-07-31']); await clear(daily()); await tab('检查统计')
  pass('清空每日日期不影响总表筛选、页码和条数', JSON.stringify(await range(summary())) === JSON.stringify(['2026-08-01', '2026-08-31']) && await rows(summary()).count() === 11 && !(await summary().locator('.btn-prev').isDisabled()))
  await query(summary(), ['2026-07-01', '2026-07-31'])
  pass('范围问题合计按全部31条计算且保留0与空白区别', JSON.stringify(await summary().locator('.daily-totals strong').allTextContents()) === JSON.stringify(['3', '0']) && await count(summary()) === 31)
  await clear(summary()); pass('总表日期也可清空为所有历史', await count(summary()) === info.allCount && await rows(summary()).count() === 20)
  await summary().getByRole('button', { name: '重置', exact: true }).click()
  pass('总表重置恢复最近30日，不改变既定默认', JSON.stringify(await range(summary())) === JSON.stringify(defaults.summary))
  await query(summary(), ['2026-08-01', '2026-08-31']); await jump(summary(), 2)
  await tab('每日检查'); await query(daily(), ['2030-01-01', '2030-01-02'])
  pass('无匹配结果显示标准空状态与真实0条', await count(daily()) === 0 && await daily().getByText('暂无符合条件的记录', { exact: true }).isVisible())
  await daily().getByRole('button', { name: '重置', exact: true }).click()
  pass('每日重置恢复含当天最近30个自然日', JSON.stringify(await range(daily())) === JSON.stringify(defaults.daily))
  await query(daily(), ['2026-07-01', '2026-07-31']); await jump(daily(), 2)
  const browsed = await dates(daily())
  await daily().locator('.el-table__body-wrapper .el-scrollbar__wrap').evaluate(node => { node.scrollLeft = 80; node.scrollTop = 180 })
  const scrollBefore = await daily().locator('.el-table__body-wrapper .el-scrollbar__wrap').evaluate(node => ({ left: node.scrollLeft, top: node.scrollTop }))
  const beforeOpenReads = await page.evaluate(() => window.__ledgerProbe.reads)
  await detailFromDate('2026-07-15')
  pass('写入来源参数没有重复触发台账读取或重挂载', (await page.evaluate(() => window.__ledgerProbe.reads)) === beforeOpenReads)
  pass('点击详情才按日期读取完整日表', (await page.evaluate(() => window.__ledgerProbe.details)) > 0)
  pass('历史当前隐藏项目和未填项目行均保留', await page.locator('.daily-inspection-table').getByText('历史项目名称快照', { exact: true }).isVisible() && await page.locator('.daily-inspection-table').getByText('历史隐藏未填写项目', { exact: true }).isVisible())
  await page.locator('.daily-inspection-table').getByRole('button', { name: '查看详情', exact: true }).first().click()
  const drawer = page.locator('.daily-dispatch-drawer'); await drawer.waitFor()
  pass('详情按问题关联读取完整文字及图片', await drawer.getByText('DETAIL_ONLY：历史检查问题', { exact: true }).isVisible() && await drawer.locator('.ap-attach-item').count() > 0)
  await drawer.locator('.ap-attach-item').first().click()
  const preview = page.getByRole('dialog', { name: '图片预览', exact: true }); await preview.waitFor()
  await preview.locator('img').waitFor()
  pass('图片预览正常解码且保留放大查看', await preview.locator('img').evaluate(image => image.complete && image.naturalWidth > 0))
  await preview.getByRole('button', { name: '关闭', exact: true }).click()
  await drawer.getByRole('button', { name: '关闭项目检查抽屉', exact: true }).click(); await drawer.waitFor({ state: 'hidden' })
  await returnButton()
  pass('返回只执行一次最新摘要读取', (await page.evaluate(() => window.__ledgerProbe.reads)) === beforeOpenReads + 1)
  pass('页面返回恢复原日期与第2页的实际记录', JSON.stringify(await range(daily())) === JSON.stringify(['2026-07-01', '2026-07-31']) && JSON.stringify(await dates(daily())) === JSON.stringify(browsed))
  const scrollAfter = await daily().locator('.el-table__body-wrapper .el-scrollbar__wrap').evaluate(node => ({ left: node.scrollLeft, top: node.scrollTop }))
  pass('返回时尽量恢复表内滚动位置', Math.abs(scrollBefore.left - scrollAfter.left) < 2 && Math.abs(scrollBefore.top - scrollAfter.top) < 2)
  await tab('检查统计'); pass('往返也保留另一页签的独立日期、20条和第2页', JSON.stringify(await range(summary())) === JSON.stringify(['2026-08-01', '2026-08-31']) && await rows(summary()).count() === 11)
  await tab('每日检查'); await clear(daily()); await size(daily(), 20); await jump(daily(), 3)
  const allPage3 = await dates(daily())
  const rowDate = allPage3[0]; await detailFromDate(rowDate)
  await page.goBack(); await daily().waitFor(); await idle()
  pass('浏览器后退恢复日期不限、20条及第3页', JSON.stringify(await range(daily())) === JSON.stringify(['', '']) && JSON.stringify(await dates(daily())) === JSON.stringify(allPage3) && await rows(daily()).count() === 20)
  await detailFromDate(rowDate, '项目部检查填写'); await returnButton()
  pass('从项目部填写返回也保留第3页和20条', JSON.stringify(await dates(daily())) === JSON.stringify(allPage3) && await rows(daily()).count() === 20)
  pass('纯查询和导航未删除、覆盖或重建任何历史内容', (await snapshot(page)) === before)
  await query(daily(), ['2026-07-01', '2026-07-31']); await size(daily(), 10); await jump(daily(), 2)
  const beforeSave = await page.evaluate(async () => window.__ledgerProbe.originalDay('2026-07-15'))
  await detailFromDate('2026-07-15', '统一调度检查填写')
  const note = page.getByRole('textbox', { name: '当日整体备注', exact: true }); await note.waitFor(); await note.fill('查询返回验证：尚未保存的备注')
  await page.evaluate(async () => { const { DAILY_CHANGE_EVENT } = await import('/src/mock/dailyDispatchCheck.js'); window.dispatchEvent(new CustomEvent(DAILY_CHANGE_EVENT, { detail: { date: '2026-07-15' } })) })
  await idle()
  pass('保存通知和详情刷新不清空未保存表单', await note.inputValue() === '查询返回验证：尚未保存的备注')
  await page.getByRole('button', { name: '保存', exact: true }).click(); await note.waitFor({ state: 'hidden' })
  await daily().waitFor(); await idle()
  const afterSave = await page.evaluate(async () => { const p = window.__ledgerProbe; return { day: await p.originalDay('2026-07-15'), rows: await p.originalList() } })
  pass('保存后返回保持筛选和原页码', JSON.stringify(await dates(daily())) === JSON.stringify(browsed))
  pass('保存后摘要更新时间刷新且两项问题数量不变', afterSave.rows.find(row => row.date === '2026-07-15').updatedAt !== beforeSave.hq.updatedAt && afterSave.rows.find(row => row.date === '2026-07-15').safetyQuality === 3)
  pass('统一调度保存未覆盖值班人员和项目经理内容', JSON.stringify(afterSave.day.people) === JSON.stringify(beforeSave.people))
  for (const value of [['2026-07-01', '2026-08-31'], ['2026-07-01', '2026-07-02'], ['2026-08-01', '2026-08-31']]) { await query(daily(), value); if (await count(daily()) > 10) await jump(daily(), 2) }
  pass('连续筛选和翻页没有混入旧范围数据', (await dates(daily())).every(date => date >= '2026-08-01' && date <= '2026-08-31'))
  await page.evaluate(() => { window.__ledgerProbe.failNext = true })
  await daily().getByRole('button', { name: '刷新', exact: true }).click()
  await page.getByText('验证读取失败', { exact: true }).waitFor()
  pass('加载失败明确提示，不冒充0条空结果', await daily().getByText('数据加载失败，请点击刷新重试', { exact: true }).isVisible() && await daily().locator('.el-pagination').count() === 0)
  await daily().getByRole('button', { name: '刷新', exact: true }).click(); await idle()
  pass('刷新可以重试且仍使用原日期条件', await count(daily()) === 31 && JSON.stringify(await range(daily())) === JSON.stringify(['2026-08-01', '2026-08-31']))
  pass('台账从未退回完整历史日表读取', (await page.evaluate(() => window.__ledgerProbe.legacy)) === 0)
  for (const viewport of [{ width: 1440, height: 900 }, { width: 720, height: 900 }]) {
    await page.setViewportSize(viewport)
    pass(viewport.width + 'px窗口分页位于表格下方并可用', await daily().locator('.business-table-pagination').isVisible())
    await page.screenshot({ path: resolve(output, 'ledger-' + viewport.width + '.png'), fullPage: true })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  const repositoryChecks = await page.evaluate(async () => (await import('/scripts/inspection-v4-repository-cases.mjs')).repositoryCases())
  pass('既有IndexedDB事务与独立保存回归通过', Array.isArray(repositoryChecks) && repositoryChecks.length > 0)
  const repositoryCount = repositoryChecks.length
  await page.reload(); await daily().waitFor(); await idle()
  pass('刷新页面按原默认初始化，不永久记忆临时筛选', JSON.stringify(await range(daily())) === JSON.stringify(defaults.daily) && await daily().locator('.el-pagination__sizes').innerText().then(text => text.includes('10')))
  await query(daily(), ['2026-07-01', '2026-07-31']); await detailFromDate('2026-07-31')
  await page.evaluate(async base => { await document.querySelector('#app').__vue_app__.config.globalProperties.$router.push(base) }, base)
  await daily().waitFor(); await idle()
  pass('通过不含返回参数的菜单地址重新进入时使用默认', JSON.stringify(await range(daily())) === JSON.stringify(defaults.daily))
  // Exercise the actual summary detail action and its origin state.
  await tab('检查统计'); await query(summary(), ['2026-07-01', '2026-08-31']); await size(summary(), 20); await jump(summary(), 3)
  const summaryPage3 = await dates(summary())
  await rows(summary()).first().getByRole('button', { name: '查看详情', exact: true }).click()
  await page.locator('.daily-dispatch-detail').waitFor(); await idle()
  await page.getByRole('button', { name: '返回', exact: true }).click(); await summary().waitFor(); await idle()
  pass('总表实际详情入口返回恢复页签、日期、20条及第3页', JSON.stringify(await dates(summary())) === JSON.stringify(summaryPage3) && await rows(summary()).count() === 20)
  pass('总表操作列仅提供查看详情，继续无填写入口', await summary().getByRole('button', { name: /填写|编辑/ }).count() === 0 && await rows(summary()).first().getByRole('button', { name: '查看详情', exact: true }).count() === 1)
  await page.evaluate(async base => {
    const { ledgerRouteQuery } = await import('/src/composables/dailyDispatchLedgerNavigation.js')
    const router = document.querySelector('#app').__vue_app__.config.globalProperties.$router
    await router.push({ path: base, query: ledgerRouteQuery({ activeTab: 'daily', range: ['2026-07-15', '2026-07-16'], applied: ['2026-07-15', '2026-07-16'], pagination: { page: 99, pageSize: 20 } }) })
  }, base)
  await daily().waitFor(); await idle()
  pass('返回页码超过当前匹配结果时修正到有效页', await rows(daily()).count() === 2 && await daily().locator('.btn-prev').isDisabled() && await daily().locator('.btn-next').isDisabled())
  const shanghai = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'Asia/Shanghai' })
  const otherPage = await shanghai.newPage(); await otherPage.goto(origin + '/#' + base)
  await otherPage.locator('.daily-ledger-list').waitFor()
  const timezoneCheck = await otherPage.evaluate(async () => {
    const { filterLedgerSummaries } = await import('/src/utils/dailyDispatchLedgerQuery.js')
    return filterLedgerSummaries([{ date: '2026-07-14' }, { date: '2026-07-15' }, { date: '2026-07-16' }, { date: '2026-07-17' }], ['2026-07-15', '2026-07-16']).map(row => row.date)
  })
  pass('北京时间浏览器同样包含业务起止日期且无时区偏差', JSON.stringify(timezoneCheck) === JSON.stringify(['2026-07-16', '2026-07-15']))
  await shanghai.close()
  pass('无控制台或未捕获JavaScript错误', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ checks, errors, repositoryCount }, null, 2))
  console.log(`Ledger query browser: ${checks.length} checks; ${repositoryCount} repository checks passed`)
} catch (error) {
  if (page) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {})
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ checks, errors, failure: error.stack }, null, 2))
  throw error
} finally {
  await browser?.close()
  await server?.close()
}

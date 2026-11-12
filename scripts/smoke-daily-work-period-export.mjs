import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer as createPortProbe } from 'node:net'
import * as XLSX from 'xlsx'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { exportFixtures, exportMarker, exportRecord, exportMajorFixtures } from './fixtures/daily-work-export.mjs'

const root = resolve(import.meta.dirname, '..')
const built = process.argv.includes('--built'), mode = built ? 'built' : 'dev'
const output = resolve(root, '../outputs/daily-work-major-export', mode + '-' + Date.now())
const checks = [], errors = [], geometry = []
mkdirSync(output, { recursive: true })
function pass(name, value = true) { assert.ok(value, name); checks.push(name); console.log('PASS ' + name) }
const fixtures = [...exportFixtures, ...exportMajorFixtures, ...Array.from({ length: 12 }, (_, index) => exportRecord('批量' + index, '2026-06-30', '08:00', '09:00'))]
let browser, server, page, downloadCount = 0
try {
  let origin
  if (built) {
    assert.ok(existsSync(resolve(root, 'dist/index.html')), '先运行 npm run build')
    origin = pathToFileURL(resolve(root, 'dist/index.html')).href
  } else {
    const probe = createPortProbe()
    await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve) })
    const port = probe.address().port
    await new Promise(resolve => probe.close(resolve))
    server = await createServer({ root, configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, open: false } })
    await server.listen()
    origin = 'http://127.0.0.1:' + server.httpServer.address().port + '/'
  }
  browser = await chromium.launch({ headless: true, executablePath: existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Los_Angeles', acceptDownloads: true })
  await context.addInitScript(records => {
    sessionStorage.setItem('web-login-session', JSON.stringify({ account: '1' }))
    if (localStorage.getItem('qa-export-dialog-installed')) return
    localStorage.setItem('coc-admin-daily-work', JSON.stringify(records))
    localStorage.setItem('qa-export-dialog-installed', '1')
  }, fixtures)
  page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.setFixedTime(new Date('2026-11-11T07:30:00Z'))
  const response = await page.goto(origin + '#/major-hazard/daily-work')
  await page.getByRole('heading', { name: '每日施工作业', exact: true }).waitFor()
  if (!built) pass('开发预览HTTP200', response.status() === 200)
  await page.reload()
  const card = page.locator('.major-hazard-daily-work-page .admin-page')
  const ledgerDate = card.locator('.date-filter input'), search = card.locator('.search-input input')
  const dialog = page.locator('.dw-export-dialog.el-dialog')
  const exportDate = () => dialog.locator('.dw-export-date input')
  const confirm = () => dialog.getByRole('button', { name: '确认导出', exact: true })
  const open = async () => {
    await card.getByRole('button', { name: '导出', exact: true }).click()
    await dialog.waitFor()
    await page.locator('.dw-export-overlay').evaluate(async el => Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))))
  }
  const cancel = async () => { await dialog.getByRole('button', { name: '取消', exact: true }).click(); await dialog.waitFor({ state: 'hidden' }) }
  const setLedgerDate = async value => { await ledgerDate.fill(value); await ledgerDate.press('Enter'); await ledgerDate.blur() }
  const toggle = async name => dialog.locator('.dw-export-sheet').filter({ hasText: name }).click()
  const allChecked = async () => await dialog.locator('.dw-export-sheet input:checked').count() === 3
  const download = async () => {
    const event = page.waitForEvent('download')
    await confirm().click()
    const file = await event, path = resolve(output, String(++downloadCount).padStart(2, '0') + '_' + file.suggestedFilename())
    await file.saveAs(path)
    await dialog.waitFor({ state: 'hidden' })
    return { name: file.suggestedFilename(), workbook: XLSX.read(readFileSync(path), { type: 'buffer' }) }
  }
  const noOuterScroll = async () => dialog.evaluate(el => {
    const outer = el.closest('.el-overlay-dialog'), documentScroller = document.scrollingElement
    return outer.scrollHeight <= outer.clientHeight + 1 && documentScroller.scrollHeight <= documentScroller.clientHeight + 1 &&
      getComputedStyle(document.body).overflowY === 'hidden'
  })
  const savedBefore = await page.evaluate(() => localStorage.getItem('coc-admin-daily-work'))
  pass('施工日期不再默认浏览器当地当天，进入页面为空', await ledgerDate.inputValue() === '')
  await setLedgerDate('2026-06-30')
  await search.fill(exportMarker)
  const backgroundBefore = await card.boundingBox()
  await open()
  pass('导出日期沿用台账，三种表单默认全部勾选', await exportDate().inputValue() === '2026-06-30' && await allChecked())
  pass('危大工程不再标注模板示例', await dialog.locator('.el-tag').count() === 0)
  pass('全部导出复选框和整个预览区已删除', await dialog.getByRole('checkbox').count() === 3 &&
    await dialog.getByText('全部导出', { exact: true }).count() === 0 && await dialog.getByText('导出预览', { exact: true }).count() === 0 &&
    await dialog.locator('.dw-export-preview').count() === 0)
  pass('说明句、表单说明和文件格式提示已删除，三种表单均无示例标签', await dialog.locator('p, .dw-export-notes, .dw-export-hint, .dw-export-format, .dw-export-sheet-description').count() === 0 &&
    !/可选择多个日期|ZIP|沿用当前关键词|取数包含|统计为0/.test(await dialog.innerText()) &&
    await dialog.getByText('模板示例', { exact: true }).count() === 0)
  pass('打开弹窗不挤压或移动后台台账', await card.boundingBox().then(box => Math.abs(box.x - backgroundBefore.x) < 1 && Math.abs(box.width - backgroundBefore.width) < 1))
  for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768], [1661, 943], [1024, 576]]) {
    await page.setViewportSize({ width, height })
    const measurement = await dialog.evaluate(el => {
      const rect = el.getBoundingClientRect(), outer = el.closest('.el-overlay-dialog')
      return {
        viewport: [innerWidth, innerHeight], center: [rect.left + rect.width / 2, rect.top + rect.height / 2],
        bounds: [rect.left, rect.top, rect.right, rect.bottom],
        overlayHeight: [outer.scrollHeight, outer.clientHeight],
        documentHeight: [document.scrollingElement.scrollHeight, document.scrollingElement.clientHeight],
      }
    })
    geometry.push(measurement)
    pass(width + '×' + height + '弹窗相对整个窗口水平和垂直居中，外层无滚动条',
      Math.abs(measurement.center[0] - width / 2) < 1 && Math.abs(measurement.center[1] - height / 2) < 1 &&
      measurement.bounds[0] >= 16 && measurement.bounds[1] >= 16 && measurement.bounds[2] <= width - 16 && measurement.bounds[3] <= height - 16 &&
      await noOuterScroll())
    await exportDate().click()
    const picker = page.locator('.el-picker-panel:visible')
    await picker.waitFor()
    await picker.evaluate(async el => Promise.all(el.closest('.el-popper').getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {}))))
    pass(width + '×' + height + '单日期日历完整显示，不产生整页滚动条', await noOuterScroll() && await picker.evaluate(el => {
      const rect = el.getBoundingClientRect()
      return rect.top >= 0 && rect.left >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth
    }))
    await page.screenshot({ path: resolve(output, 'calendar-' + width + 'x' + height + '.png'), fullPage: true, animations: 'disabled' })
    await dialog.locator('.el-dialog__title').click()
    await picker.waitFor({ state: 'hidden' })
    await page.screenshot({ path: resolve(output, 'dialog-' + width + 'x' + height + '.png'), fullPage: true, animations: 'disabled' })
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const day of [28, 29, 30]) {
    await exportDate().click()
    const picker = page.locator('.el-picker-panel:visible')
    await picker.locator('td.available').filter({ hasText: new RegExp('^' + day + '$') }).click()
    await picker.waitFor({ state: 'hidden' })
    assert.equal(await exportDate().inputValue(), '2026-06-' + day)
    assert.ok(await noOuterScroll())
  }
  pass('多次选日始终替换为一个日期，日历自动收起且外层不滚动')
  await page.mouse.move(10, 100); await page.mouse.wheel(0, 500)
  pass('遮罩上滚轮不会滚动整页或台账', await page.evaluate(() => window.scrollY === 0 && document.querySelector('.page-viewport').scrollTop === 0))
  for (const name of ['夜间作业', '危险作业', '危大工程']) await toggle(name)
  pass('可以分别取消三项，全不选时禁止导出', await dialog.locator('.dw-export-sheet input:checked').count() === 0 && await confirm().isDisabled())
  await toggle('夜间作业')
  const single = await download(), night = single.workbook.Sheets['夜间作业']
  pass('单日单表下载xlsx，仅含所选夜间Sheet', single.name === '每日施工作业_2026-06-30.xlsx' &&
    JSON.stringify(single.workbook.SheetNames) === JSON.stringify(['夜间作业']))
  pass('20点夜间取数、次日08:00原结束时间和危险类别统计保持原规则', night.I6.v === '2026-07-01 08:00' &&
    night.A1.v.includes('6月30日20:00-次日07:00') &&
    night.A8.v.includes('3个项目共计5项作业，其中危险作业2个项目3项') && !night.A8.v.includes('不涉及危险作业'))
  await open()
  pass('每次打开默认重新勾选三种表单，台账筛选未改变', await allChecked() && await ledgerDate.inputValue() === '2026-06-30')
  const full = await download()
  pass('默认导出实际三Sheet并连续编号，危险作业16项及危大3条均正确',
    full.name === '每日施工作业_2026-06-30.xlsx' &&
    JSON.stringify(full.workbook.SheetNames) === JSON.stringify(['夜间作业', '危险作业', '危大工程']) &&
    full.workbook.Sheets['危险作业'].A19.v.includes('共计16项危险作业') &&
    full.workbook.Sheets['危大工程']['!ref'] === 'A1:L5' &&
    full.workbook.Sheets['危大工程'].G3.v === '2026-06-29 09:00' &&
    full.workbook.Sheets['危大工程'].H3.v === '2026-07-02 18:00' &&
    full.workbook.SheetNames.every((name, index) => full.workbook.Sheets[name].A1.v.startsWith((index + 1) + '建设工程指挥部')))
  await open()
  await toggle('夜间作业')
  const two = (await download()).workbook
  pass('只选危险及危大时标题编号连续为1、2',
    JSON.stringify(two.SheetNames) === JSON.stringify(['危险作业', '危大工程']) &&
    two.Sheets['危险作业'].A1.v.startsWith('1建设') && two.Sheets['危大工程'].A1.v.startsWith('2建设'))
  await open()
  await toggle('夜间作业'); await toggle('危险作业')
  const majorOnly = (await download()).workbook
  pass('单独危大Sheet以1编号且原值导出实际登记数据',
    JSON.stringify(majorOnly.SheetNames) === JSON.stringify(['危大工程']) &&
    majorOnly.Sheets['危大工程'].A1.v.startsWith('1建设') && majorOnly.Sheets['危大工程'].E3.v === '危大跨多日')
  await search.fill('只匹配不存在的计划')
  await open()
  const empty = (await download()).workbook
  pass('空结果仍可导出零统计Sheet，删除预览不影响导出', empty.Sheets['夜间作业']['!ref'] === 'A1:P3' &&
    empty.Sheets['夜间作业'].A3.v.includes('0个项目共计0项') && empty.Sheets['危险作业'].A3.v.includes('0项危险作业'))
  pass('无匹配危大记录只保留标题表头，不残留模板示例与统计行', empty.Sheets['危大工程']['!ref'] === 'A1:L2' && empty.Sheets['危大工程'].A3 == null)
  await setLedgerDate('')
  await card.getByRole('button', { name: '导出', exact: true }).click()
  pass('台账施工日期为空时点导出被拦截并提示先选日期', await page.getByText('请先选择施工日期后再导出').count() > 0 && !(await dialog.isVisible()))
  await setLedgerDate('2026-06-30')
  await open()
  await exportDate().fill('')
  pass('弹窗日期清空后禁止导出', await exportDate().inputValue() === '' && await confirm().isDisabled())
  await cancel()
  await search.fill(exportMarker); await setLedgerDate('2026-06-30')
  await open()
  await exportDate().click()
  await page.locator('.el-picker-panel:visible td.available').filter({ hasText: /^29$/ }).click()
  const different = await download()
  pass('弹窗更换日期仅下载该日一个xlsx，保留原台账日期', different.name === '每日施工作业_2026-06-29.xlsx' &&
    await ledgerDate.inputValue() === '2026-06-30')
  pass('原始作业存储逐字节不变', savedBefore === await page.evaluate(() => localStorage.getItem('coc-admin-daily-work')))
  await page.goto(origin + '#/major-hazard/major-work')
  await page.getByRole('heading', { name: '危大工程信息登记', exact: true }).waitFor()
  await page.getByPlaceholder('搜索项目、单位、类别、监管人…').fill(exportMarker)
  await page.getByRole('cell', { name: '危大跨多日', exact: true }).waitFor()
  pass('危大工程登记台账能查看同一来源的跨多日导出记录', await page.getByRole('cell', { name: '危大跨多日', exact: true }).count() === 1)
  await page.screenshot({ path: resolve(output, 'major-register-source.png'), fullPage: true, animations: 'disabled' })
  pass('查看登记模块也不改变原始作业存储', savedBefore === await page.evaluate(() => localStorage.getItem('coc-admin-daily-work')))
  pass('浏览器无运行错误', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ mode, passed: checks.length, checks, errors, geometry }, null, 2))
  console.log(JSON.stringify({ mode, passed: checks.length, output }))
} catch (error) {
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true, animations: 'disabled' }).catch(() => {})
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ checks, errors, geometry, error: error.stack }, null, 2))
  throw error
} finally {
  await browser?.close()
  await server?.close()
}

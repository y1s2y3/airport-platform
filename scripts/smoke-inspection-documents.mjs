import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer as createNetServer } from 'node:net'
import { basename, resolve } from 'node:path'
import { chromium } from 'playwright'
import { createServer, preview } from 'vite'

const codeRoot = resolve(import.meta.dirname, '..')
const built = process.argv.includes('--built')
const mode = built ? 'built' : 'dev'
const output = resolve(codeRoot, '../outputs/inspection-prd-v1.2-documents', mode)
const sourceFile = resolve(codeRoot, 'docs/features/daily-dispatch-check/requirements/Daily_Dispatch_Check_PRD_v1.2.docx')
const expected = readFileSync(sourceFile)
const title = '每日调度检查需求文档（PRD）'
const route = '/coc-admin/daily-dispatch-check'
const base = built ? '/document-download-preview/' : '/'
const checks = [], errors = []
mkdirSync(output, { recursive: true })
function pass(name, condition = true) { assert.ok(condition, name); checks.push(name); console.log('PASS ' + name) }
async function freePort() {
  const probe = createNetServer()
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve) })
  const port = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  return port
}
async function snapshot(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('airport-daily-dispatch-check-v1')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction(['days', 'logs'], 'readonly')
      const days = tx.objectStore('days').getAll(), logs = tx.objectStore('logs').getAll()
      tx.oncomplete = () => { const value = JSON.stringify({ days: days.result, logs: logs.result }); db.close(); resolve(value) }
      tx.onabort = () => { db.close(); reject(tx.error) }
    }
  }))
}
let server, browser, page
try {
  const port = await freePort()
  server = built
    ? await preview({ configLoader: 'native', root: codeRoot, base, logLevel: 'error', preview: { host: '127.0.0.1', port, strictPort: true, open: false } })
    : await createServer({ configLoader: 'native', root: codeRoot, base, logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, open: false } })
  if (!built) await server.listen()
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe') })
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
  page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const response = await page.goto('http://127.0.0.1:' + port + base + '#' + route)
  pass('The page responds successfully', response.status() === 200)
  const rows = page.locator('.daily-ledger-list .el-table__body-wrapper tbody tr')
  await rows.first().waitFor()
  const date = (await rows.first().locator('td').first().innerText()).trim()
  const before = await snapshot(page)
  const dialog = () => page.getByRole('dialog', { name: '每日调度检查 · 原型说明', exact: true })
  async function openNote() { await page.getByRole('button', { name: '原型说明', exact: true }).click(); await dialog().waitFor() }
  async function closeNote() { await dialog().getByRole('button', { name: '知道了', exact: true }).click(); await dialog().waitFor({ state: 'hidden' }) }
  async function download(name, fileName, content, prefix) {
    const event = page.waitForEvent('download')
    await dialog().getByRole('button', { name: '下载' + name, exact: true }).click()
    const result = await event
    pass(prefix + ' preserves the intended filename', result.suggestedFilename() === fileName)
    const destination = resolve(output, prefix + '-' + fileName)
    await result.saveAs(destination)
    pass(prefix + ' downloads the exact source bytes', readFileSync(destination).equals(content))
    pass(prefix + ' leaves the note open', await dialog().isVisible())
  }
  await openNote()
  pass('Related documents appear at the top of the note', await dialog().locator('.daily-prototype-documents').isVisible())
  const configuredCount = await dialog().locator('.daily-prototype-document').count()
  pass('Only the user-designated Word PRD is listed', configuredCount === 1 && await dialog().getByRole('button', { name: '下载' + title, exact: true }).count() === 1 && (await dialog().locator('.daily-document-format').first().innerText()).includes('.docx'))
  pass('The binary source is a Word ZIP container', expected[0] === 0x50 && expected[1] === 0x4b)
  pass('Notes state the v1.2 source and retain the existing business rules', (await dialog().innerText()).includes('v1.2') && (await dialog().innerText()).includes('功能规则沿用v1.1') && (await dialog().innerText()).includes('标签关闭、无有效值或无法读取时全部默认“否”') && (await dialog().innerText()).includes('首次成功保存后以已保存内容为准'))
  await download(title, basename(sourceFile), expected, 'PRD')
  await page.screenshot({ path: resolve(output, '01-原型说明-1440.png'), fullPage: true })
  await closeNote()

  const fixture = { id: 'download-smoke-reference', title: '补充说明（验证用）', fileName: '补充说明_验证.md', format: 'Markdown · .md', description: '仅存在于本次隔离浏览器验证中。', mimeType: 'text/markdown;charset=utf-8', content: '# 补充说明\n\n第二份文档独立下载，中文内容正确。\n' }
  if (!built) {
    await page.evaluate(async fixture => { const { dailyDispatchDocuments } = await import('/src/config/dailyDispatchDocuments.js'); dailyDispatchDocuments.push(fixture) }, fixture)
  }
  await page.evaluate(hash => { location.hash = hash }, route + '/records/' + date)
  await page.getByRole('heading', { name: 'COC调度会检查记录表详情', exact: true }).waitFor()
  await openNote()
  pass('The same download list is available from the detail page', await dialog().getByRole('button', { name: '下载' + title, exact: true }).isVisible())
  if (!built) {
    pass('Multiple configured documents render as separate entries', await dialog().locator('.daily-prototype-document').count() === configuredCount + 1)
    await download(fixture.title, fixture.fileName, Buffer.from(fixture.content), 'second-document')
  }
  for (const viewport of [{ width: 720, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport)
    const layout = await dialog().evaluate(element => {
      const rect = element.getBoundingClientRect()
      return { fits: rect.left >= -1 && rect.right <= innerWidth + 1, entriesFit: [...element.querySelectorAll('.daily-prototype-document')].every(entry => entry.scrollWidth <= entry.clientWidth + 1) }
    })
    pass(viewport.width + 'px document list fits the dialog', layout.fits && layout.entriesFit)
    pass(viewport.width + 'px PRD download remains available', await dialog().getByRole('button', { name: '下载' + title, exact: true }).isVisible())
    await page.screenshot({ path: resolve(output, '02-原型说明-' + viewport.width + '.png'), fullPage: true })
  }
  pass('Opening notes and downloading leave inspection records and logs unchanged', await snapshot(page) === before)
  await closeNote()
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const entry of ['project', 'unified']) {
    await page.evaluate(hash => { location.hash = hash }, route + '/records/' + date + '?entry=' + entry)
    await page.getByRole('heading', { name: entry === 'unified' ? '统一调度检查填写' : '项目部检查填写', exact: true }).waitFor()
    await page.waitForFunction(() => !document.querySelector('.daily-dispatch-detail > .el-loading-mask'))
    const savedBefore = await snapshot(page)
    await openNote()
    pass(entry + ' filling uses the shared v1.2 Word download', await dialog().getByRole('button', { name: '下载' + title, exact: true }).count() === 1)
    await download(title, basename(sourceFile), expected, entry + '-PRD')
    await closeNote()
    pass(entry + ' note leaves stored form content and audit untouched', await snapshot(page) === savedBefore)
  }
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await page.getByRole('dialog', { name: '未保存内容', exact: true }).getByRole('button', { name: '确认放弃', exact: true }).click()
  const summary = page.getByRole('tab', { name: '检查统计', exact: true }); await summary.waitFor(); await summary.click()
  await openNote()
  pass('The summary tab also uses the same Word source', await dialog().getByRole('button', { name: '下载' + title, exact: true }).count() === 1)
  await download(title, basename(sourceFile), expected, 'summary-PRD')
  pass('No obsolete Markdown or SQL handoff downloads remain', await dialog().getByRole('button', { name: /下载.*(数据库|建表|符合性)/ }).count() === 0)
  await closeNote()
  pass('No console or unhandled browser errors', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ completedAt: new Date().toISOString(), mode, sourceFile, checks, errors }, null, 2))
  console.log('Inspection documents (' + mode + '): ' + checks.length + ' checks passed')
} catch (error) {
  if (page) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {})
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, checks, errors }, null, 2))
  throw error
} finally {
  await browser?.close()
  if (server?.close) await server.close()
  else if (server?.httpServer) await new Promise(resolve => server.httpServer.close(resolve))
}

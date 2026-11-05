import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer as netServer } from 'node:net'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { createServer, preview } from 'vite'

const root = resolve(import.meta.dirname, '..'), built = process.argv.includes('--built'), mode = built ? 'built' : 'dev'
const output = resolve(root, '../outputs/inspection-report-1103', mode), route = '/coc-admin/daily-dispatch-check', base = built ? '/report-review-preview/' : '/'
const checks = [], errors = []
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iK1cAAAAASUVORK5CYII=', 'base64')
mkdirSync(output, { recursive: true })
function pass(name, ok = true) { assert.ok(ok, name); checks.push(name); console.log('PASS ' + name) }
async function freePort() { const probe = netServer(); await new Promise((r, j) => { probe.once('error', j); probe.listen(0, '127.0.0.1', r) }); const port = probe.address().port; await new Promise(r => probe.close(r)); return port }
let server, browser, page
try {
  const port = await freePort()
  server = built ? await preview({ configLoader: 'native', root, base, logLevel: 'error', preview: { host: '127.0.0.1', port, strictPort: true, open: false } }) : await createServer({ configLoader: 'native', root, base, logLevel: 'error', server: { host: '127.0.0.1', port, strictPort: true, open: false } })
  if (!built) await server.listen()
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files/Google/Chrome/Application/chrome.exe') })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  page = await context.newPage(); page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const daily = () => page.getByRole('tabpanel', { name: '每日检查', exact: true }), summary = () => page.getByRole('tabpanel', { name: '检查统计', exact: true })
  const rows = scope => scope.locator('.el-table__body-wrapper tbody tr'), projectTable = () => page.locator('.business-paged-table').filter({ has: page.locator('.daily-inspection-table') }), drawer = () => page.locator('.daily-dispatch-drawer:visible')
  async function idle() { await page.waitForFunction(() => !document.querySelector('.daily-dispatch-detail > .el-loading-mask') && !document.querySelector('.daily-dispatch-ledger .el-loading-mask')) }
  async function shot(name) { await page.screenshot({ path: resolve(output, name + '.png'), fullPage: true, animations: 'disabled' }) }
  async function query(scope, date) { for (const input of await scope.locator('.el-range-input').all()) { await input.fill(date); await input.press('Tab') }; await page.keyboard.press('Escape'); await scope.getByRole('button', { name: '查询', exact: true }).click(); await idle() }
  async function size(scope, value) { const input = scope.locator('.business-table-pagination').getByRole('combobox'); await input.focus(); await input.press('ArrowDown'); const id = await input.getAttribute('aria-controls'); await page.locator(`[id="${id}"]`).getByRole('option', { name: value + '条/页', exact: true }).click() }
  async function jump(scope, value) { const input = scope.locator('.el-pagination__jump input'); await input.fill(String(value)); await input.press('Enter') }
  async function choose(scope, label, value) { const input = scope.getByRole('combobox', { name: label, exact: true }); await input.focus(); await input.press('ArrowDown'); const id = await input.getAttribute('aria-controls'); await page.locator(`[id="${id}"]`).getByRole('option', { name: value, exact: true }).click() }
  async function user(scope, label) { await scope.getByRole('combobox', { name: label, exact: true }).click(); await page.locator('.daily-user-picker-dropdown:visible').getByRole('option').first().click(); await page.locator('.el-popper.daily-user-picker-dropdown:visible').waitFor({ state: 'hidden' }) }
  async function upload(scope) { await scope.locator('input[type=file]').first().setInputFiles({ name: '评审验证.png', mimeType: 'image/png', buffer: png }); await scope.locator('.ap-attach-item').first().waitFor() }
  async function readDay(date) { return page.evaluate(date => new Promise((resolve, reject) => { const r = indexedDB.open('airport-daily-dispatch-check-v1'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, q = db.transaction('days').objectStore('days').get(date); q.onsuccess = () => { db.close(); resolve(q.result) }; q.onerror = () => reject(q.error) } }), date) }
  pass('HTTP 200', (await page.goto('http://127.0.0.1:' + port + base + '#' + route)).status() === 200)
  await rows(daily()).first().waitFor(); const date = (await rows(daily()).first().locator('td').first().innerText()).trim()
  const info = await page.evaluate(async ({ date, png }) => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('airport-daily-dispatch-check-v1'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const day = await new Promise((resolve, reject) => { const r = db.transaction('days').objectStore('days').get(date); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const real = day.hq.rows.slice(0, 2).map(row => ({ projectId: row.projectId, projectName: row.projectName, unified: false }))
    if (real.length !== 2) throw new Error('Need two demo projects')
    const image = { name: '已有检查.png', url: 'data:image/png;base64,' + png, size: 68, kind: 'image' }, at = date + 'T09:00:00.000Z'
    const check = (type = '') => ({ schemaVersion: 4, type, normalText: '', normalImages: [], problems: [], other: '', otherImages: [] })
    const history = Array.from({ length: 10 }, (_, i) => ({ projectId: 'review-history-' + i, projectName: '历史纳入未填项目' + (i + 1), unified: false }))
    real[0].unified = true; real[0].personnel = { type: 'normal', text: '' }; real[0].safety = { ...check('problem'), problems: [{ text: '已有安全问题', images: [image] }] }; real[0].quality = check('normal'); real[0].camera = { ...check('other'), other: '已有其他说明' }
    day.hq = { ...day.hq, rows: [...history, ...real], headers: { focusDepartment: '安质部', attendance: '参会', dispatcherId: 'inspection-dispatch-demo', dispatcher: '安质部示例调度员', departmentAttendance: '参会' }, note: '原整体备注', version: 1, firstSubmittedAt: at, updatedAt: at, operator: { id: 'review-fixture', name: '评审验证' } }
    day.people = {}; day.dispatchDefaults = { initializedAt: at, initializedBy: { id: 'review-fixture' }, projectIds: [real[0].projectId] }; delete day.demoScenario
    await new Promise((resolve, reject) => { const tx = db.transaction('days', 'readwrite'); tx.objectStore('days').put(day); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error) }); db.close()
    return { real, date }
  }, { date, png: png.toString('base64') })
  await daily().getByRole('button', { name: '刷新', exact: true }).click(); await idle(); await query(daily(), date)
  pass('Filled records still use the fixed 填写 entry labels', await rows(daily()).first().getByRole('button', { name: '统一调度检查填写', exact: true }).count() === 1 && await rows(daily()).first().getByRole('button', { name: '项目部检查填写', exact: true }).count() === 1)
  pass('Empty results use two short hyphens', (await daily().locator('.daily-ledger-empty').allTextContents()).every(value => value.trim() === '--') && !(await daily().innerText()).includes('—'))
  const other = daily().locator('.daily-result-other.el-tag').first(); await other.waitFor()
  pass('Other status has a light grey background', await other.evaluate(n => { const rgb = getComputedStyle(n).backgroundColor.match(/\d+/g).slice(0, 3).map(Number); return Math.min(...rgb) > 230 && Math.max(...rgb) - Math.min(...rgb) < 8 }))
  await rows(daily()).first().hover()
  pass('Row hover is theme tinted and distinct from the header', await rows(daily()).first().evaluate(row => { const table = row.closest('.el-table'), cell = row.querySelector('td'); return getComputedStyle(table).getPropertyValue('--el-table-row-hover-bg-color').includes('color-mix') && getComputedStyle(cell).backgroundColor !== getComputedStyle(table.querySelector('th')).backgroundColor }))
  pass('Hover styling remains module scoped', await page.evaluate(() => { const node = document.createElement('div'); node.className = 'el-table'; document.body.append(node); const value = getComputedStyle(node).getPropertyValue('--el-table-row-hover-bg-color'); node.remove(); return !value.includes('color-mix') }))
  await page.getByRole('tab', { name: '检查统计', exact: true }).click(); await query(summary(), date)
  pass('Summary has one eye/detail action and no write entry', await rows(summary()).first().getByRole('button', { name: '查看详情', exact: true }).count() === 1 && await summary().getByRole('button', { name: /填写|编辑/ }).count() === 0)
  await rows(summary()).first().getByRole('button', { name: '查看详情', exact: true }).click(); await projectTable().waitFor(); await idle()
  await jump(projectTable(), 2); await projectTable().locator('.daily-row-name').filter({ hasText: info.real[0].projectName }).waitFor()
  pass('Project inspection screenshots are thumbnails, with no picture-count prose', await projectTable().getByText(/图片\d+张/).count() === 0 && await projectTable().locator('.daily-thumbnail').count() > 0)
  await projectTable().locator('.daily-thumbnail').first().click()
  const previewDialog = page.getByRole('dialog', { name: '图片预览', exact: true }); await previewDialog.waitFor()
  pass('Thumbnail preview decodes and does not open a project drawer', await previewDialog.locator('img').evaluate(n => n.complete && n.naturalWidth > 0) && await drawer().count() === 0)
  await previewDialog.getByRole('button', { name: '关闭', exact: true }).click()
  await projectTable().locator('.daily-row-name').filter({ hasText: info.real[0].projectName }).click(); await drawer().waitFor()
  pass('Existing row click remains available', await drawer().getByRole('tab', { name: '统一调度检查情况', exact: true }).count() === 1)
  pass('Readonly unified flag is in the shared drawer context', await drawer().locator('.daily-drawer-unified').innerText().then(t => t.includes('当日统一调度') && t.includes('是')) && await drawer().locator('.daily-drawer-unified input').count() === 0)
  await drawer().getByRole('button', { name: '关闭项目检查抽屉', exact: true }).click()
  await page.getByRole('button', { name: '返回', exact: true }).click(); await summary().waitFor(); await idle()
  pass('Actual summary detail return restores its tab and dates', (await summary().locator('.el-range-input').evaluateAll(nodes => nodes.map(n => n.value))).every(value => value === date))
  await page.getByRole('tab', { name: '每日检查', exact: true }).click(); await rows(daily()).first().getByRole('button', { name: '统一调度检查填写', exact: true }).click(); await projectTable().waitFor(); await idle()
  await jump(projectTable(), 2); await projectTable().locator('.daily-row-name').filter({ hasText: info.real[0].projectName }).click(); await drawer().waitFor()
  const contextOrder = await drawer().evaluate(n => ({ date: n.querySelector('.daily-drawer-context').getBoundingClientRect().top, flag: n.querySelector('.daily-drawer-unified').getBoundingClientRect().top, tabs: n.querySelector('.el-tabs__header').getBoundingClientRect().top }))
  pass('Unified flag sits below date and above both tabs', contextOrder.date < contextOrder.flag && contextOrder.flag < contextOrder.tabs)
  pass('HQ flag uses a checkbox without redundant label text', await drawer().locator('.daily-drawer-unified .el-checkbox').innerText().then(t => !t.trim()) && await drawer().getByRole('checkbox', { name: '抽屉当日统一调度', exact: true }).count() === 1)
  pass('HQ flag-to-tab spacing is compact', await drawer().evaluate(n => { const flag=n.querySelector('.daily-drawer-unified').getBoundingClientRect(), tabs=n.querySelector('.el-tabs__header').getBoundingClientRect(); return tabs.top-flag.bottom >= -1 && tabs.top-flag.bottom <= 12 }))
  const field = label => drawer().getByRole('region', { name: label, exact: true })
  pass('HQ editable headers show all current result states', await field('人员履职').locator('.daily-read-field-header .daily-result-normal').count() === 1 && await field('安全检查情况').locator('.daily-read-field-header .daily-result-problem').count() === 1 && await field('质量检查情况').locator('.daily-read-field-header .daily-result-normal').count() === 1 && await field('摄像头检查情况').locator('.daily-read-field-header .daily-result-other').count() === 1)
  await choose(field('人员履职'), '人员履职', '其他'); await field('人员履职').getByRole('textbox', { name: '人员履职具体情况', exact: true }).fill('临时履职说明')
  pass('Editable status follows the draft before applying', await field('人员履职').locator('.daily-read-field-header .daily-result-other').count() === 1)
  await field('人员履职').locator('.daily-read-field-toggle').click()
  pass('Collapsing HQ edit keeps its status in the heading', await field('人员履职').locator('.daily-read-field-toggle').getAttribute('aria-expanded') === 'false' && await field('人员履职').locator('.daily-result-other').isVisible())
  await field('人员履职').locator('.daily-read-field-toggle').click()
  pass('Reopening HQ edit retains its unsaved text', await field('人员履职').getByRole('textbox', { name: '人员履职具体情况', exact: true }).inputValue() === '临时履职说明')
  await choose(field('人员履职'), '人员履职', '正常')
  pass('Status is aligned immediately before the collapse icon', await field('人员履职').evaluate(n => { const tag=n.querySelector('.daily-read-field-header .daily-check-status').getBoundingClientRect(), icon=n.querySelector('.daily-read-field-chevron').getBoundingClientRect(); return tag.right <= icon.left+1 && icon.left-tag.right <= 24 }))
  await shot('00-unified-drawer')
  const beforeApply = await readDay(date)
  assert.equal(await drawer().getByRole('checkbox').first().isChecked(), true); await drawer().locator('.daily-drawer-unified .el-checkbox').click(); await drawer().getByRole('tab', { name: '项目部检查情况', exact: true }).click()
  pass('Unified flag remains visible outside either tab', await drawer().locator('.daily-drawer-unified').isVisible())
  await drawer().getByRole('button', { name: '应用到当前表单', exact: true }).click(); await drawer().waitFor({ state: 'hidden' })
  pass('Applying unified flag changes only the unsaved form', (await readDay(date)).hq.rows.find(row => row.projectId === info.real[0].projectId).unified === beforeApply.hq.rows.find(row => row.projectId === info.real[0].projectId).unified)
  await projectTable().locator('.daily-row-name').filter({ hasText: info.real[0].projectName }).click(); await drawer().waitFor(); assert.equal(await drawer().getByRole('checkbox').first().isChecked(), false); await drawer().locator('.daily-drawer-unified .el-checkbox').click()
  const safety = drawer().locator('.daily-drawer-edit-group').filter({ hasText: '安全检查情况' }).first()
  await safety.getByRole('button', { name: '新增问题', exact: true }).click(); const second = safety.locator('.dispatch-problem-input').nth(1)
  await second.getByRole('textbox', { name: '安全检查情况问题2', exact: true }).fill('新增安全问题，需逐条配图')
  await safety.locator('.daily-read-field-toggle').click()
  await drawer().getByRole('button', { name: '应用到当前表单', exact: true }).click()
  await second.locator('.daily-field-error').getByText('请至少上传1张检查情况截图', { exact: true }).waitFor()
  pass('Each HQ problem requires its own image')
  pass('Invalid collapsed HQ group expands to reveal its errors', await safety.locator('.daily-read-field-toggle').getAttribute('aria-expanded') === 'true')
  await upload(second); await drawer().getByRole('button', { name: '应用到当前表单', exact: true }).click(); await drawer().waitFor({ state: 'hidden' })
  await page.locator('.daily-detail-footer').getByRole('button', { name: '保存', exact: true }).click(); await page.waitForURL(u => u.hash.split('?')[0] === '#' + route); await daily().waitFor(); await idle()
  const hqSaved = await readDay(date)
  pass('Valid HQ problems save independently with their own images', hqSaved.hq.rows.find(row => row.projectId === info.real[0].projectId).safety.problems.every(problem => problem.images.length >= 1))
  await daily().waitFor(); await idle(); await rows(daily()).first().getByRole('button', { name: '项目部检查填写', exact: true }).click(); await projectTable().waitFor(); await idle()
  pass('Project entry has only the project inspection table', await page.locator('.daily-header-form,.daily-overall-note,.daily-project-picker-section').count() === 0 && !(await projectTable().locator('th').allTextContents()).some(text => /人员履职|安全检查|质量检查|摄像头|备注/.test(text)))
  pass('Project list begins at ten items and preserves historic blank rows', await rows(projectTable()).count() === 10 && (await projectTable().locator('.el-pagination__total').innerText()).includes('12'))
  await size(projectTable(), 20); pass('Project pagination supports twenty items', await rows(projectTable()).count() === 12); await size(projectTable(), 10); await jump(projectTable(), 2)
  await shot('01-project-ledger')
  await projectTable().locator('.daily-row-name').filter({ hasText: info.real[0].projectName }).click(); await drawer().waitFor()
  pass('Project drawer omits the redundant tab and unified flag', await drawer().getByRole('tab').count() === 0 && await drawer().locator('.daily-drawer-unified').count() === 0)
  const duty = () => drawer().getByTestId('project-duty'), manager = () => drawer().getByTestId('project-manager')
  const toggle = scope => scope.locator(':scope > .daily-read-field-header > .daily-read-field-toggle')
  const beforeFold = await readDay(date)
  pass('Project date-to-first-group spacing is compact', await drawer().evaluate(n => { const date=n.querySelector('.daily-drawer-context').getBoundingClientRect(), group=n.querySelector('.daily-project-part').getBoundingClientRect(); return group.top-date.bottom >= 0 && group.top-date.bottom <= 16 }))
  await toggle(duty()).click()
  pass('Project groups collapse independently', await toggle(duty()).getAttribute('aria-expanded') === 'false' && await toggle(manager()).getAttribute('aria-expanded') === 'true' && JSON.stringify(await readDay(date)) === JSON.stringify(beforeFold))
  await duty().getByRole('button', { name: '填写', exact: true }).click()
  await duty().getByRole('combobox', { name: '项目部值班人员检查情况姓名', exact: true }).waitFor()
  pass('Starting a collapsed project group opens it without toggling twice', await toggle(duty()).getAttribute('aria-expanded') === 'true' && await duty().locator('.daily-read-field-header .daily-result-normal').count() === 1)
  await user(duty(), '项目部值班人员检查情况姓名'); await choose(duty(), '项目部值班人员检查情况', '发现问题')
  await duty().getByRole('textbox', { name: '项目部值班人员检查情况问题1', exact: true }).fill('值班问题一'); await upload(duty().locator('.dispatch-problem-input').first())
  await duty().getByRole('button', { name: '新增问题', exact: true }).click(); await duty().getByRole('textbox', { name: '项目部值班人员检查情况问题2', exact: true }).fill('值班问题二')
  await toggle(duty()).click()
  pass('Project editing can collapse while retaining its live problem status', await toggle(duty()).getAttribute('aria-expanded') === 'false' && await duty().locator('.daily-read-field-header .daily-result-problem').isVisible())
  await toggle(duty()).click()
  pass('Project collapse retains descriptions and images', await duty().getByRole('textbox', { name: '项目部值班人员检查情况问题2', exact: true }).inputValue() === '值班问题二' && await duty().locator('.ap-attach-item').count() === 1)
  await duty().getByRole('button', { name: '保存', exact: true }).click(); await duty().locator('.dispatch-problem-input').nth(1).locator('.daily-field-error').getByText('请至少上传1张检查情况截图', { exact: true }).waitFor()
  pass('Project problem two cannot borrow problem one image', !(await readDay(date)).people[info.real[0].projectId]?.duty)
  await upload(duty().locator('.dispatch-problem-input').nth(1)); await shot('02-project-form'); await duty().getByRole('button', { name: '保存', exact: true }).click(); await duty().locator('form').waitFor({ state: 'hidden' })
  await drawer().getByRole('button', { name: '关闭', exact: true }).click(); await drawer().waitFor({ state: 'hidden' })
  const firstSaved = await readDay(date)
  pass('Independent duty save leaves HQ and manager intact', JSON.stringify(firstSaved.hq) === JSON.stringify(hqSaved.hq) && !firstSaved.people[info.real[0].projectId].manager && firstSaved.people[info.real[0].projectId].duty.check.problems.every(problem => problem.images.length === 1))
  pass('Project page two survives drawer save and close', await projectTable().locator('.daily-row-name').filter({ hasText: info.real[0].projectName }).isVisible() && await rows(projectTable()).count() === 2)
  await projectTable().locator('.daily-row-name').filter({ hasText: info.real[1].projectName }).click(); await drawer().waitFor(); await duty().getByRole('button', { name: '填写', exact: true }).click(); await user(duty(), '项目部值班人员检查情况姓名')
  await duty().getByRole('textbox', { name: '正常检查说明', exact: true }).fill('第二项目尚未保存的值班说明')
  await manager().getByRole('button', { name: '填写', exact: true }).click(); await user(manager(), '项目经理检查情况姓名'); await manager().getByRole('button', { name: '保存', exact: true }).click(); await manager().getByText('请至少上传1张检查情况截图', { exact: true }).waitFor()
  pass('Manager normal still requires its own screenshot')
  await upload(manager()); await manager().getByRole('button', { name: '保存', exact: true }).click(); await manager().locator('form').waitFor({ state: 'hidden' })
  await drawer().getByRole('button', { name: '关闭', exact: true }).click(); const confirm = page.getByRole('dialog', { name: '未保存内容', exact: true }); await confirm.waitFor(); await confirm.getByRole('button', { name: '继续填写', exact: true }).click()
  pass('Closing respects an unsent independent part', await drawer().isVisible() && await duty().getByRole('textbox', { name: '正常检查说明', exact: true }).inputValue() === '第二项目尚未保存的值班说明')
  await drawer().getByRole('button', { name: '关闭', exact: true }).click(); await confirm.getByRole('button', { name: '确认放弃', exact: true }).click(); await drawer().waitFor({ state: 'hidden' })
  const secondSaved = await readDay(date)
  pass('Multiple project saves remain independent', secondSaved.people[info.real[1].projectId].manager.check.type === 'normal' && !secondSaved.people[info.real[1].projectId].duty && JSON.stringify(secondSaved.people[info.real[0].projectId]) === JSON.stringify(firstSaved.people[info.real[0].projectId]) && JSON.stringify(secondSaved.hq) === JSON.stringify(hqSaved.hq))
  await page.getByRole('button', { name: '添加项目', exact: true }).click(); const add = page.getByRole('dialog', { name: '添加项目', exact: true }); await add.waitFor(); await add.getByRole('combobox').click(); await page.locator('.el-select__popper:visible').getByRole('option').first().click(); await add.getByRole('button', { name: '添加', exact: true }).click(); await drawer().waitFor(); await drawer().getByRole('button', { name: '关闭', exact: true }).click(); await drawer().waitFor({ state: 'hidden' })
  const added = await readDay(date)
  pass('Adding a project uses a shared unique row without a business submit', added.hq.rows.length === 13 && new Set(added.hq.rows.map(row => row.projectId)).size === 13 && added.hq.updatedAt === secondSaved.hq.updatedAt && JSON.stringify(added.people) === JSON.stringify(secondSaved.people))
  await page.setViewportSize({ width: 720, height: 1000 }); await projectTable().locator('.daily-row-name').filter({ hasText: info.real[0].projectName }).click(); await drawer().waitFor()
  await page.waitForFunction(() => { const n = document.querySelector('.daily-dispatch-drawer'); if (!n) return false; const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 })
  pass('Narrow drawer stays within the viewport', await drawer().evaluate(n => { const r = n.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 }))
  pass('Saved project status appears once in its group header', await duty().locator('.daily-read-field-header .daily-result-problem').count() === 1 && await duty().locator('.daily-check-status').count() === 1)
  pass('Narrow project header keeps title, status and actions inside its bounds', await duty().locator(':scope > .daily-read-field-header').evaluate(n => { const box=n.getBoundingClientRect(), title=n.querySelector('.daily-read-field-title').getBoundingClientRect(), status=n.querySelector('.daily-check-status').getBoundingClientRect(), actions=n.querySelector('.daily-read-field-actions').getBoundingClientRect(), icon=n.querySelector('.daily-read-field-chevron').getBoundingClientRect(); return title.left>=box.left && title.right<=status.left+1 && status.right<=actions.left+1 && icon.right<=box.right }))
  await shot('03-project-720'); await drawer().getByRole('button', { name: '关闭', exact: true }).click()
  pass('No console or unhandled browser errors', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ mode, checks, errors, passed: true }, null, 2)); console.log('Report review (' + mode + '): ' + checks.length + ' checks passed')
} catch (error) {
  if (page) await page.screenshot({ path: resolve(output, 'failure.png'), fullPage: true, animations: 'disabled' }).catch(() => {})
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, checks, errors }, null, 2)); throw error
} finally { await browser?.close(); if (server?.close) await server.close(); else if (server?.httpServer) await new Promise(resolve => server.httpServer.close(resolve)) }

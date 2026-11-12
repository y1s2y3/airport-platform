import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer as createPortProbe } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import JSZip from 'jszip'
import { chromium } from 'playwright'
import { createServer } from 'vite'

const root = resolve(import.meta.dirname, '..'), built = process.argv.includes('--built'), mode = built ? 'built' : 'dev'
const output = resolve(root, '../outputs/penalty-template-export', mode + '-' + Date.now())
const marker = '处罚导出专项', checks = [], errors = []
mkdirSync(output, { recursive: true })
const pass = (name, condition = true) => { assert.ok(condition, name); checks.push(name); console.log('PASS ' + name) }
const picture = (label, color) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="${color}"/><rect x="35" y="35" width="570" height="290" fill="none" stroke="white" stroke-width="4"/><text x="60" y="100" fill="white" font-size="28" font-family="Microsoft YaHei">${label}</text></svg>`)
const attachments = [{ name: '处罚单补充附件-现场1.svg', url: picture('现场整改前照片', '#334c65') }, { name: '处罚单补充附件-现场2.svg', url: picture('现场整改区域全景', '#56734d') }]
const make = (id, status, extra = {}) => ({
  id: 'CF-PENALTY-QA-' + id, project: 'T2项目', unit: '旧单位不得作为责任单位', workType: '安全',
  penaltyContent: `${marker}：施工现场临边防护缺失，应立即整改并落实安全防护。\n补充说明含 & < > 字符。`,
  assignee: '测试指派人（施工负责人）', executor: '测试指派人（施工负责人）',
  deadline: '2026-11-20', issueTime: '2026/11/10 10:15:30', status,
  penaltyClause: '施工合同第18条', amount: '5000元', reportResult: '已补齐临边防护，完成现场整改。', acceptRemark: '现场复核通过，同意关闭。',
  source: '后台录入', attachments: [], ...extra,
})
const fixtures = [
  make('PENDING', '待下发', { issueTime: '--' }),
  make('PROCESSING', '处理中', { attachments, snapshot: attachments[0].url }),
  make('ACCEPT', '待验收', { attachments }),
  make('CLOSED', '已关闭', { attachments, closeType: 'acceptance', acceptedTime: '2026-11-10 15:00', acceptedBy: '测试验收人' }),
  make('MANUAL', '已关闭', { closeType: 'manual', closedTime: '2026-11-10 15:00', acceptedTime: '', acceptedBy: '' }),
  make('APPEAL', '申诉中'), make('APPEAL-CLOSED', '已关闭', { closeType: 'appeal', appealResolution: '通过' }),
  ...Array.from({ length: 18 }, (_, index) => make('PAGE-' + index, '处理中')),
]
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
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, timezoneId: 'America/Los_Angeles', acceptDownloads: true })
  const page = await context.newPage(); page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  const response = await page.goto(origin + '#/coc-admin/penalty')
  await page.locator('.penalty-ledger').waitFor()
  if (!built) pass('预览返回HTTP 200', response.status() === 200)
  await page.evaluate(records => {
    const existing = JSON.parse(localStorage.getItem('coc-admin-dispatch-penalties') || '[]')
    localStorage.setItem('coc-admin-dispatch-penalties', JSON.stringify([...records, ...existing]))
  }, fixtures)
  await page.reload(); await page.locator('.penalty-ledger').waitFor()
  const baseline = await page.evaluate(() => localStorage.getItem('coc-admin-dispatch-penalties'))
  const search = page.getByRole('textbox', { name: '关键字', exact: true }), unit = page.getByRole('textbox', { name: '责任单位', exact: true })
  const query = async text => { await search.fill(text); await page.getByRole('button', { name: '搜索', exact: true }).click() }
  await query(marker)
  const rows = () => page.locator('.penalty-table .el-table__body-wrapper tbody tr')
  const record = id => rows().filter({ has: page.getByText('CF-PENALTY-QA-' + id, { exact: true }) })
  pass('搜索后显示真实25条总数且默认每页10条', (await page.locator('.penalty-record-count').innerText()).includes('25') && await rows().count() === 10)
  const headers = await page.locator('.penalty-table .el-table__header-wrapper th').allTextContents()
  assert.deepEqual(headers.map(text => text.trim()), ['序号', '编号', '项目名称', '类型', '责任单位', '事由', '指派人', '完成时限', '条款', '操作'])
  pass('表格列顺序与参考图一致，责任单位关联项目施工单位', (await record('PENDING').locator('td').nth(4).innerText()).includes('中建三局') && !(await record('PENDING').innerText()).includes('旧单位'))
  const actions = id => record(id).locator('.penalty-row-actions .el-button').allTextContents().then(items => items.map(item => item.trim()))
  assert.deepEqual(await actions('PENDING'), ['详情', '编辑', '下发', '关闭'])
  assert.deepEqual(await actions('PROCESSING'), ['详情', '导出', '纳入黑榜'])
  assert.deepEqual(await actions('ACCEPT'), ['详情', '导出', '纳入黑榜'])
  assert.deepEqual(await actions('CLOSED'), ['详情', '导出'])
  assert.deepEqual(await actions('MANUAL'), ['详情'])
  assert.deepEqual(await actions('APPEAL'), ['详情'])
  assert.deepEqual(await actions('APPEAL-CLOSED'), ['详情', '导出'])
  pass('各状态操作及三类模板导出权限正确，手动关闭和申诉中无导出')
  for (const width of [1920, 1440, 1024]) {
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 900 })
    pass(width + 'px白底卡片、灰色表头、筛选区和固定操作列正常', await page.locator('.penalty-ledger').evaluate(el => getComputedStyle(el).backgroundColor === 'rgb(255, 255, 255)') &&
      await page.locator('.penalty-table th').first().evaluate(el => getComputedStyle(el).backgroundColor) === 'rgb(238, 240, 243)' && await record('PENDING').getByRole('button', { name: '关闭', exact: true }).isVisible())
    await page.screenshot({ path: resolve(output, 'penalty-' + width + '.png'), fullPage: true })
  }
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.locator('.penalty-pagination .btn-next').click()
  await page.waitForFunction(() => document.querySelector('.penalty-table .el-table__body-wrapper tbody tr td').textContent.trim() === '11')
  pass('第二页序号从11开始', true)
  await page.locator('.penalty-pagination .el-select').click()
  await page.getByRole('option', { name: '20条/页', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.penalty-table .el-table__body-wrapper tbody tr').length === 20)
  pass('切换每页20条后返回第一页且显示20行', (await rows().first().locator('td').first().innerText()).trim() === '1')
  for (const [id, key] of [['PROCESSING', 'processing'], ['ACCEPT', 'pending-acceptance'], ['CLOSED', 'closed']]) {
    const waiting = page.waitForEvent('download')
    await record(id).getByRole('button', { name: '导出', exact: true }).click()
    const download = await waiting, path = resolve(output, download.suggestedFilename())
    await download.saveAs(path)
    const generated = await JSZip.loadAsync(readFileSync(path)), template = await JSZip.loadAsync(readFileSync(resolve(root, 'src/assets/penalty-templates', key + '.docx')))
    const xml = await generated.file('word/document.xml').async('string')
    const plain = xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    pass(id + '下载真实docx，项目名称、日期及模板字段已填写', plain.includes('项目名称：T2项目') && plain.includes('2026-11-10') && !plain.includes('10:15:30') && !plain.includes('#{') && !plain.includes('注意只取到日期'))
    const images = Object.keys(generated.files).filter(name => /^word\/media\/.*\.png$/.test(name))
    pass(id + '两张补充图片嵌入且使用行内图像', images.length === 2 && (xml.match(/<wp:inline\b/g) || []).length === 2 && !xml.includes('<wp:anchor'))
    for (const name of Object.keys(template.files)) {
      if (template.files[name].dir || ['word/document.xml', 'word/_rels/document.xml.rels', '[Content_Types].xml'].includes(name)) continue
      assert.deepEqual(await generated.file(name).async('uint8array'), await template.file(name).async('uint8array'), name)
    }
    pass(id + '保留源模板样式、字体、页面及其他包条目原字节', true)
  }
  await record('PENDING').getByRole('button', { name: '详情', exact: true }).click()
  const detail = page.getByRole('dialog', { name: '处罚单详情', exact: true }); await detail.waitFor()
  await detail.locator('.el-dialog__headerbtn').click(); await detail.waitFor({ state: 'hidden' })
  await record('PENDING').getByRole('button', { name: '编辑', exact: true }).click()
  const edit = page.getByRole('dialog', { name: '编辑处罚单', exact: true }); await edit.waitFor()
  await edit.getByRole('button', { name: '取消', exact: true }).click(); await edit.waitFor({ state: 'hidden' })
  pass('原详情和编辑入口仍可正常打开和取消', true)
  await page.locator('.penalty-filter-form .el-select').click()
  await page.getByRole('option', { name: '待验收', exact: true }).click()
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.waitForFunction(() => document.querySelectorAll('.penalty-table .el-table__body-wrapper tbody tr').length === 1)
  await unit.fill('不存在的责任单位')
  pass('修改筛选输入后需搜索才更新结果', await rows().count() === 1)
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.locator('.penalty-table .el-table__empty-block').waitFor()
  pass('关键词、状态和责任单位组合筛选及空结果正常', await rows().count() === 0)
  await page.getByRole('button', { name: '重置', exact: true }).click()
  pass('重置清空筛选并恢复10条第一页', await search.inputValue() === '' && await unit.inputValue() === '' && await rows().count() === 10)
  pass('查询、分页、详情、取消和导出均未改写处罚单存储', baseline === await page.evaluate(() => localStorage.getItem('coc-admin-dispatch-penalties')))
  pass('浏览器无运行错误', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ mode, checks, errors }, null, 2))
  console.log(JSON.stringify({ mode, passed: checks.length, output }))
} finally { await browser?.close(); await server?.close() }

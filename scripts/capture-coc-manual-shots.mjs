/**
 * COC 操作手册截图采集（正式工程 localhost:5173）
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../../调研记录/02、COC调度中心/shots')
const BASE = 'http://localhost:5173'
const PROJECT_LABEL = 'T2空侧捷运线'

mkdirSync(outDir, { recursive: true })

async function shot(page, name) {
  const file = join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log('saved', name)
}

async function gotoCoc(page) {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(`${BASE}/#/coc`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForSelector('.screen-canvas', { timeout: 90000 })
  await page.waitForTimeout(2200)
}

async function selectProject(page, label = PROJECT_LABEL) {
  const treeItem = page.locator('.project-tree .el-tree-node__content').filter({ hasText: label }).first()
  if (await treeItem.isVisible({ timeout: 4000 }).catch(() => false)) {
    await treeItem.click({ timeout: 10000 })
    await page.waitForTimeout(1600)
    return
  }
  const trigger = page.locator('.org-tree-select .el-select__wrapper').first()
  await trigger.click({ timeout: 10000 })
  await page.waitForTimeout(500)
  await page.locator('.coc-org-tree-select-popper .el-tree-node__content').filter({ hasText: '工程指挥部' }).first().click({ timeout: 10000 })
  await page.waitForTimeout(300)
  await page.locator('.coc-org-tree-select-popper .el-tree-node__label').filter({ hasText: label }).first().click({ timeout: 10000 })
  await page.waitForTimeout(1600)
}

async function selectHq(page) {
  const backBtn = page.getByRole('button', { name: '返回指挥部' })
  if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await backBtn.click()
    await page.waitForTimeout(1400)
    return
  }
  const trigger = page.locator('.org-tree-select .el-select__wrapper').first()
  if (await trigger.isVisible({ timeout: 2000 }).catch(() => false)) {
    await trigger.click({ timeout: 10000 })
    await page.waitForTimeout(400)
    await page.locator('.coc-org-tree-select-popper .el-tree-node__content').filter({ hasText: '工程指挥部' }).first().click({ timeout: 10000 })
    await page.waitForTimeout(1400)
  }
}

async function gotoAdmin(page, hashPath) {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${BASE}/#${hashPath}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(2000)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
let failed = 0

async function run(label, fn) {
  try {
    await fn()
  } catch (e) {
    failed += 1
    console.error(`[FAIL] ${label}:`, e.message)
  }
}

await run('01-hq-home', async () => {
  await gotoCoc(page)
  await selectHq(page)
  await shot(page, '01-指挥部总览')
})

await run('02-meeting-panel', async () => {
  await gotoCoc(page)
  await selectHq(page)
  const fab = page.locator('.ai-fab-btn, button').filter({ hasText: '会议管控' }).first()
  if (await fab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await fab.click()
    await page.waitForTimeout(1000)
  }
  await shot(page, '02-会议管控浮窗')
})

await run('03-project-view', async () => {
  await gotoCoc(page)
  await selectProject(page)
  await shot(page, '03-项目视图')
})

await run('04-project-dispatch', async () => {
  await gotoCoc(page)
  await selectProject(page)
  const btn = page.getByRole('button', { name: '项目调度' })
  if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btn.click()
  } else {
    await page.locator('.dispatch-cell.clickable, .dispatch-entry').first().click({ timeout: 10000 })
  }
  await page.waitForSelector('.project-dispatch-layout', { timeout: 20000 })
  await page.waitForTimeout(2000)
  await shot(page, '04-项目调度')
})

await run('05-leader-speech', async () => {
  await gotoCoc(page)
  await selectHq(page)
  await page.getByRole('button', { name: '领导讲话' }).click({ timeout: 15000 })
  await page.waitForSelector('.command-meeting-layout', { timeout: 20000 })
  await page.waitForTimeout(2000)
  await shot(page, '05-领导讲话')
})

const adminPages = [
  ['06-后台-任务单', '/coc-admin/notice'],
  ['07-后台-提示函', '/coc-admin/reminder'],
  ['08-后台-处罚单', '/coc-admin/penalty'],
  ['09-后台-黑红榜', '/coc-admin/red-black'],
  ['10-后台-巡检仪', '/coc-admin/patrol-device'],
  ['11-后台-监理会议', '/coc-admin/supervision-meeting'],
  ['12-后台-调度隐患', '/coc-admin/dispatch-hazard'],
  ['13-个人中心', '/personal-center'],
]

for (const [name, path] of adminPages) {
  await run(name, async () => {
    await gotoAdmin(page, path)
    await shot(page, name)
  })
}

await browser.close()
if (failed) {
  console.error(`completed with ${failed} failures`)
  process.exitCode = 1
} else {
  console.log('all shots ok')
}

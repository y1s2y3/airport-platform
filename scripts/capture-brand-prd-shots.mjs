/**
 * 品牌报审 PRD 截图（从 Airport 工程运行，playwright 依赖本仓库 node_modules）
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.VITE_PORT || process.env.PORT || '5173'
const BASE = `http://localhost:${PORT}/#`
const OUT_DIR = path.resolve(
  __dirname,
  '../../调研记录/03、质量管理/2、品牌报审/screenshots/brand'
)

const chromePath =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1228/chrome-win64/chrome.exe')

async function dismissMessages(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.el-message, .el-notification').forEach((el) => el.remove())
  })
}

async function shot(page, file, locator) {
  await dismissMessages(page)
  await page.waitForTimeout(450)
  const outPath = path.join(OUT_DIR, file)
  if (locator) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator
    if (await el.count()) {
      await el.screenshot({ path: outPath })
      console.log('saved', outPath)
      return
    }
  }
  const main = page.locator('.page-viewport, .page-card, .detail-page, .brand-page, .qm-page').first()
  if (await main.count()) await main.screenshot({ path: outPath })
  else await page.screenshot({ path: outPath, fullPage: true })
  console.log('saved', outPath)
}

async function setProject(page, mode) {
  const sel = page.locator('.project-select')
  if (!(await sel.count())) return
  await sel.click()
  await page.waitForTimeout(350)
  const dropdown = page.locator('.project-select-dropdown:visible')
  if (mode === 'hq') {
    await dropdown.locator('.el-select-dropdown__item').filter({ hasText: '工程指挥部' }).first().click()
  } else {
    const t2 = dropdown.locator('.el-select-dropdown__item').filter({ hasText: 'T2' }).first()
    if (await t2.count()) await t2.click()
    else await dropdown.locator('.el-select-dropdown__item').nth(1).click()
  }
  await page.waitForTimeout(900)
}

async function goto(page, hashPath) {
  await page.goto(`${BASE}${hashPath}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
}

async function captureBrand(page) {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  await goto(page, '/workbench')
  await setProject(page, 'project')

  await goto(page, '/qm/brand/ledger')
  await shot(page, '01-ledger-list.png')

  await goto(page, '/qm/brand/applications')
  await shot(page, '02-application-list.png')

  await goto(page, '/qm/brand/applications/edit')
  await page.waitForTimeout(1200)
  await shot(page, '03-create-form.png')

  await goto(page, '/qm/brand/applications/detail?id=PP-2026-001')
  await shot(page, '04-detail-approved.png')

  await goto(page, '/qm/brand/applications/detail?id=PP-2026-002')
  await shot(page, '05-detail-pending.png')

  await goto(page, '/qm/brand/applications/detail?id=PP-2026-003')
  await shot(page, '06-detail-in-approval.png')

  await goto(page, '/qm/brand/applications/detail?id=PP-2026-004')
  await shot(page, '07-detail-rejected.png')

  await goto(page, '/qm/brand/applications/detail?id=PP-2026-006')
  await shot(page, '08-detail-withdrawn.png')

  await goto(page, '/qm/brand/applications/edit?id=PP-2026-006&reEdit=1')
  await page.waitForTimeout(1200)
  await shot(page, '09-reedit-withdrawn.png')

  await goto(page, '/qm/brand/applications/edit?copyFrom=PP-2026-004')
  await page.waitForTimeout(1200)
  await shot(page, '10-reapply-rejected.png')

  await setProject(page, 'hq')
  await goto(page, '/qm/quality-board/brand-stats')
  await shot(page, '11-hq-brand-stats.png')

  await setProject(page, 'project')
  await goto(page, '/personal-center/todo/handle?id=todo-brand-1')
  await page.waitForTimeout(1200)
  await shot(page, '12-todo-supervisor.png')

  await goto(page, '/personal-center/todo/handle?id=todo-brand-2')
  await page.waitForTimeout(1200)
  await shot(page, '13-todo-pm.png')
}

async function main() {
  const launchOpts = { headless: true }
  if (fs.existsSync(chromePath)) launchOpts.executablePath = chromePath

  const browser = await chromium.launch(launchOpts)
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  try {
    await captureBrand(page)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

/**
 * Extra detail screenshots for PRD from localhost:5173
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE = 'http://localhost:5173/#'
const OUT_DIR = path.resolve(
  __dirname,
  '../../调研记录/4、安全管理/人员、车辆管理/screenshots',
)
const HQ_ID = 'hq'
const PROJECT_ID = 'p-000'

const chromePath =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  path.join(
    process.env.LOCALAPPDATA || '',
    'ms-playwright/chromium-1228/chrome-win64/chrome.exe',
  )

async function setProject(page, projectId) {
  await page.locator('.project-select').click()
  await page.waitForTimeout(400)
  const dropdown = page.locator('.project-select-dropdown:visible')
  if (projectId === HQ_ID) {
    await dropdown.locator('.el-select-dropdown__item').filter({ hasText: '工程指挥部' }).first().click()
  } else {
    const item = dropdown.locator('.el-select-dropdown__item').filter({ hasText: 'T2' }).first()
    if (await item.count()) await item.click()
    else await dropdown.locator('.el-select-dropdown__item').nth(1).click()
  }
  await page.waitForTimeout(900)
}

async function shot(page, file) {
  await page.evaluate(() => {
    document.querySelectorAll('.el-message').forEach((el) => el.remove())
  })
  const outPath = path.join(OUT_DIR, file)
  const main = page.locator('.page-viewport').first()
  if (await main.count()) await main.screenshot({ path: outPath })
  else await page.screenshot({ path: outPath })
  console.log('saved', outPath)
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  })
  const page = await context.newPage()

  await page.goto(`${BASE}/workbench`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(800)
  await setProject(page, PROJECT_ID)

  // 人员详情
  await page.goto(`${BASE}/labor/realname`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1000)
  const detailBtn = page.locator('a, button, .el-button').filter({ hasText: /详情|查看/ }).first()
  if (await detailBtn.count()) {
    await detailBtn.click()
    await page.waitForTimeout(1200)
  } else {
    const row = page.locator('.el-table__body tr').first()
    await row.click()
    await page.waitForTimeout(1200)
  }
  await shot(page, '12-realname-detail.png')

  // 预警详情
  await page.goto(`${BASE}/labor/warning-list`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1000)
  const warnBtn = page.locator('a, button, .el-button').filter({ hasText: /详情|处置|查看/ }).first()
  if (await warnBtn.count()) {
    await warnBtn.click()
    await page.waitForTimeout(1200)
  } else {
    await page.locator('.el-table__body tr').first().click()
    await page.waitForTimeout(1200)
  }
  await shot(page, '13-warning-detail.png')

  // 项目侧车辆看板
  await page.goto(`${BASE}/vehicle/dashboard`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(1200)
  await shot(page, '14-vehicle-dashboard-project.png')

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

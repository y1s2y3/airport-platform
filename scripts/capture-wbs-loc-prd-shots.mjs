/**
 * 基础数据 · 实体工程分解 / 施工部位管理 PRD 截图
 * 依赖：npm run dev（默认 http://localhost:5175）
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.VITE_PORT || process.env.PORT || '5175'
const BASE = `http://localhost:${PORT}/#`
const OUT = path.resolve(__dirname, '../../调研记录/07、基础数据/screenshots/wbs-loc')

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
  const outPath = path.join(OUT, file)
  if (locator) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator
    if (await el.count()) {
      await el.screenshot({ path: outPath })
      console.log('saved', outPath)
      return
    }
  }
  const main = page.locator('.qm-page.page-card, .page-viewport, .page-card').first()
  if (await main.count()) await main.screenshot({ path: outPath })
  else await page.screenshot({ path: outPath, fullPage: true })
  console.log('saved', outPath)
}

async function shotDialog(page, file) {
  await dismissMessages(page)
  await page.waitForTimeout(500)
  const dlg = page.locator('.el-dialog:visible').last()
  await dlg.waitFor({ state: 'visible', timeout: 8000 })
  await shot(page, file, dlg)
}

async function setProject(page, mode) {
  await page.locator('.project-select').click()
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

async function captureEntityBreakdown(page) {
  await setProject(page, 'hq')
  await page.goto(`${BASE}/basic-data/entity-breakdown`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  await shot(page, '01-entity-hq.png')

  await setProject(page, 'project')
  await page.goto(`${BASE}/basic-data/entity-breakdown`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
  await shot(page, '02-entity-main.png')

  const editBtn = page.locator('.el-table .el-button').filter({ hasText: '编辑' }).first()
  if (await editBtn.count()) {
    await editBtn.click()
    await shotDialog(page, '03-entity-edit-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '取消' }).first().click()
    await page.waitForTimeout(400)
  }

  const addChild = page.locator('.node-summary .el-button').filter({ hasText: '添加子节点' }).first()
  if (await addChild.count()) {
    await addChild.click()
    await shotDialog(page, '04-entity-create-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '取消' }).first().click()
  }
}

async function captureConstructionLocation(page) {
  await setProject(page, 'hq')
  await page.goto(`${BASE}/basic-data/construction-location`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  await shot(page, '05-location-hq.png')

  await setProject(page, 'project')
  await page.goto(`${BASE}/basic-data/construction-location`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)

  const divisionNode = page
    .locator('.el-tree-node__content')
    .filter({ hasText: /分部工程|子分部工程/ })
    .first()
  if (await divisionNode.count()) {
    await divisionNode.click()
    await page.waitForTimeout(800)
  }
  await shot(page, '06-location-query-mode.png')

  const itemNode = page.locator('.el-tree-node__content').filter({ hasText: '分项工程' }).first()
  if (await itemNode.count()) {
    await itemNode.click()
    await page.waitForTimeout(800)
    await shot(page, '07-location-maintain-mode.png')
  } else {
    await shot(page, '07-location-maintain-mode.png')
  }

  const addBtn = page.locator('.toolbar .el-button').filter({ hasText: '新增同级部位' }).first()
  if (await addBtn.isEnabled()) {
    await addBtn.click()
    await shotDialog(page, '08-location-create-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '取消' }).first().click()
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
  })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  })
  const page = await context.newPage()

  try {
    await page.goto(`${BASE}/workbench`, { waitUntil: 'networkidle', timeout: 90000 })
    await captureEntityBreakdown(page)
    await captureConstructionLocation(page)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

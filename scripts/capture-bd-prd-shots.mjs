/**
 * 基础数据 · 项目信息管理 / 分包单位管理 PRD 截图
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.VITE_PORT || process.env.PORT || '5174'
const BASE = `http://localhost:${PORT}/#`
const OUT_ROOT = path.resolve(__dirname, '../../调研记录/07、基础数据/screenshots')
const PROJ_OUT = path.join(OUT_ROOT, 'project-info')
const SUB_OUT = path.join(OUT_ROOT, 'subcontractor')

const chromePath =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright/chromium-1228/chrome-win64/chrome.exe')

async function dismissMessages(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.el-message, .el-notification').forEach((el) => el.remove())
  })
}

async function shot(page, outDir, file, locator) {
  await dismissMessages(page)
  await page.waitForTimeout(400)
  const outPath = path.join(outDir, file)
  if (locator) {
    const el = typeof locator === 'string' ? page.locator(locator).first() : locator
    if (await el.count()) {
      await el.screenshot({ path: outPath })
      console.log('saved', outPath)
      return
    }
  }
  const main = page.locator('.page-viewport, .page-card, .detail-page').first()
  if (await main.count()) await main.screenshot({ path: outPath })
  else await page.screenshot({ path: outPath, fullPage: true })
  console.log('saved', outPath)
}

async function shotDialog(page, outDir, file) {
  await dismissMessages(page)
  await page.waitForTimeout(500)
  const dlg = page.locator('.el-dialog:visible').last()
  await dlg.waitFor({ state: 'visible', timeout: 8000 })
  await shot(page, outDir, file, dlg)
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

async function scrollToText(page, text) {
  await page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (node.textContent && node.textContent.includes(t)) {
        node.parentElement?.scrollIntoView({ block: 'start', behavior: 'instant' })
        return
      }
    }
  }, text)
  await page.waitForTimeout(600)
}

async function captureProjectInfo(page) {
  fs.mkdirSync(PROJ_OUT, { recursive: true })

  await page.goto(`${BASE}/workbench`, { waitUntil: 'networkidle', timeout: 90000 })
  await setProject(page, 'hq')
  await page.goto(`${BASE}/basic-data/project/info`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  await shot(page, PROJ_OUT, '01-list-hq.png')

  await setProject(page, 'project')
  await page.goto(`${BASE}/basic-data/project/info`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  await shot(page, PROJ_OUT, '02-list-project.png')

  await setProject(page, 'hq')
  await page.goto(`${BASE}/basic-data/project/info/create`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
  await shot(page, PROJ_OUT, '03-create.png')

  await page.goto(`${BASE}/basic-data/project/info/p-000/portrait`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1200)
  await scrollToText(page, '一、项目基础信息')
  await shot(page, PROJ_OUT, '04-portrait-ch1.png')

  await scrollToText(page, '二、项目管理人员信息')
  await shot(page, PROJ_OUT, '05-portrait-ch2.png')

  await scrollToText(page, '三、危大工程、危险作业信息')
  await shot(page, PROJ_OUT, '06-portrait-ch3.png')

  await scrollToText(page, '四、工地施工机械、设备情况')
  await shot(page, PROJ_OUT, '07-portrait-ch4.png')

  await scrollToText(page, '五、营地、生活区情况')
  await shot(page, PROJ_OUT, '08-portrait-ch5.png')

  await page.goto(`${BASE}/basic-data/project/info/p-000/portrait?mode=edit`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  })
  await page.waitForTimeout(1000)
  await scrollToText(page, '一、项目基础信息')
  await shot(page, PROJ_OUT, '09-portrait-edit.png')

  await scrollToText(page, '施工地点')
  await page.waitForTimeout(300)
  const mapBtn = page.locator('button, .el-button').filter({ hasText: '地图选点' }).first()
  if (await mapBtn.count()) {
    await mapBtn.scrollIntoViewIfNeeded()
    await mapBtn.click()
    await shotDialog(page, PROJ_OUT, '10-map-picker-dialog.png')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
  } else {
    console.warn('map picker button not found')
  }

  await scrollToText(page, '二、项目管理人员信息')
  const subLink = page.locator('button.unit-link').first()
  if (await subLink.count()) {
    await subLink.click()
    await shotDialog(page, PROJ_OUT, '11-subcontractor-detail-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '关闭' }).first().click()
    await page.waitForTimeout(400)
  }

  await scrollToText(page, '三、危大工程、危险作业信息')
  const majorPane = page.locator('.stat-pane.is-clickable').filter({ hasText: '危大工程作业' }).first()
  if (await majorPane.count()) {
    await majorPane.click()
    await shotDialog(page, PROJ_OUT, '12-major-list-dialog.png')
    const firstRow = page.locator('.el-dialog:visible .el-table__body tr').first()
    if (await firstRow.count()) {
      await firstRow.click()
      await shotDialog(page, PROJ_OUT, '13-major-row-detail-dialog.png')
      await page.locator('.el-dialog:visible .el-button').filter({ hasText: '关闭' }).last().click()
      await page.waitForTimeout(300)
    }
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '关闭' }).first().click()
    await page.waitForTimeout(400)
  }

  const dangerPane = page.locator('.stat-pane.is-clickable').filter({ hasText: '危险作业' }).first()
  if (await dangerPane.count()) {
    await dangerPane.click()
    await shotDialog(page, PROJ_OUT, '14-danger-list-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '关闭' }).first().click()
    await page.waitForTimeout(400)
  }

  await scrollToText(page, '四、工地施工机械、设备情况')
  const equipmentPane = page.locator('.stat-pane.is-clickable').filter({ hasText: '设备类型统计' }).first()
  if (await equipmentPane.count()) {
    await equipmentPane.click()
    await shotDialog(page, PROJ_OUT, '15-equipment-list-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '关闭' }).first().click()
  }
}

async function captureSubcontractor(page, context) {
  fs.mkdirSync(SUB_OUT, { recursive: true })

  await setProject(page, 'hq')
  await page.goto(`${BASE}/basic-data/project/subcontractor`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  await shot(page, SUB_OUT, '01-list-hq.png')

  await setProject(page, 'project')
  await page.goto(`${BASE}/basic-data/project/subcontractor`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(1000)
  await shot(page, SUB_OUT, '02-list-project.png')

  const createBtn = page.locator('.el-button').filter({ hasText: '新建报审' }).first()
  if (await createBtn.count()) {
    await createBtn.click()
    await shotDialog(page, SUB_OUT, '03-create-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '取消' }).first().click()
    await page.waitForTimeout(400)
  }

  // 详情页使用独立 page，避免多标签残留导致截到上一单
  async function shotDetail(file, appId, statusText) {
    const detailPage = await context.newPage()
    await detailPage.goto(`${BASE}/workbench`, { waitUntil: 'networkidle', timeout: 90000 })
    await setProject(detailPage, 'project')
    await detailPage.goto(`${BASE}/basic-data/project/subcontractor/${appId}`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    })
    await detailPage.waitForTimeout(1200)
    const detail = detailPage.locator('.detail-page').filter({ hasText: statusText }).first()
    await detail.waitFor({ state: 'visible', timeout: 8000 })
    await shot(detailPage, SUB_OUT, file, detail)
    await detailPage.close()
  }

  await shotDetail('04-detail-approving.png', 'sc-app-004', '审批中')
  await shotDetail('05-detail-rejected.png', 'sc-app-006', '已驳回')

  await page.goto(`${BASE}/basic-data/project/subcontractor`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(800)
  const resubmitBtn = page.locator('.el-button').filter({ hasText: '重新报审' }).first()
  if (await resubmitBtn.count()) {
    await resubmitBtn.click()
    await shotDialog(page, SUB_OUT, '06-resubmit-dialog.png')
    await page.locator('.el-dialog:visible .el-button').filter({ hasText: '取消' }).first().click()
  }
}

async function main() {
  fs.mkdirSync(OUT_ROOT, { recursive: true })
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
    await captureProjectInfo(page)
    await captureSubcontractor(page, context)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

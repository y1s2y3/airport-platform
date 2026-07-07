import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../docs/coc-screen-shots')
const baseUrl = 'http://localhost:5173/#/coc'
const PROJECT_LABEL = 'T2空侧捷运线'

mkdirSync(outDir, { recursive: true })

async function waitForScreen(page) {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForSelector('.screen-canvas', { timeout: 60000 })
  await page.waitForTimeout(2500)
}

async function capture(name, page) {
  const file = join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`saved: ${file}`)
  return file
}

async function selectProject(page, label = PROJECT_LABEL) {
  const treeItem = page.locator('.project-tree .el-tree-node__content').filter({ hasText: label }).first()
  if (await treeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
    await treeItem.click({ timeout: 10000 })
    await page.waitForTimeout(1800)
    return
  }
  const trigger = page.locator('.org-tree-select .el-select__wrapper').first()
  await trigger.click({ timeout: 10000 })
  await page.waitForTimeout(600)
  await page.locator('.coc-org-tree-select-popper .el-tree-node__content').filter({ hasText: '工程指挥部' }).first().click({ timeout: 10000 })
  await page.waitForTimeout(400)
  await page.locator('.coc-org-tree-select-popper .el-tree-node__label').filter({ hasText: label }).first().click({ timeout: 10000 })
  await page.waitForTimeout(1800)
}

async function selectHq(page) {
  const backBtn = page.getByRole('button', { name: '返回指挥部' })
  if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await backBtn.click()
    await page.waitForTimeout(1500)
    return
  }
  const trigger = page.locator('.org-tree-select .el-select__wrapper').first()
  await trigger.click({ timeout: 10000 })
  await page.waitForTimeout(600)
  await page.locator('.coc-org-tree-select-popper .el-tree-node__content').filter({ hasText: '工程指挥部' }).first().click({ timeout: 10000 })
  await page.waitForTimeout(1500)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
let failed = false

try {
  await waitForScreen(page)
  await capture('01-coc-hq-home', page)

  await selectProject(page)
  await capture('02-coc-project-view', page)

  await page.getByRole('button', { name: '项目调度' }).click()
  await page.waitForSelector('.project-dispatch-layout', { timeout: 15000 })
  await page.waitForTimeout(2000)
  await capture('03-coc-project-dispatch', page)

  await page.getByRole('button', { name: '返回' }).first().click()
  await page.waitForSelector('.main-layout', { timeout: 15000 })
  await page.waitForTimeout(1200)
  await selectHq(page)
  await page.getByRole('button', { name: '领导讲话' }).click()
  await page.waitForSelector('.command-meeting-layout', { timeout: 15000 })
  await page.waitForTimeout(2000)
  await capture('04-coc-leader-speech', page)
} catch (error) {
  failed = true
  console.error('batch-1 failed:', error.message)
}

try {
  await waitForScreen(page)
  await selectProject(page)
  await page.locator('.expand-btn').first().click({ timeout: 10000 })
  await page.waitForSelector('.project-progress-detail', { timeout: 15000 })
  await page.waitForTimeout(1500)
  await capture('05-coc-progress-detail', page)
} catch (error) {
  failed = true
  console.error('batch-2 failed:', error.message)
}

try {
  await waitForScreen(page)
  await selectProject(page)
  await page.locator('.dispatch-cell.clickable').first().click({ timeout: 10000 })
  await page.waitForSelector('.project-dispatch-layout', { timeout: 15000 })
  await page.waitForTimeout(2000)
  await capture('06-coc-dispatch-device-view', page)
} catch (error) {
  failed = true
  console.error('batch-3 failed:', error.message)
}

if (failed) process.exitCode = 1
await browser.close()

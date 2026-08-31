/**
 * 补拍：项目调度、领导讲话
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
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: false })
  console.log('saved', name)
}

async function gotoCoc(page) {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(`${BASE}/#/coc`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('.screen-canvas', { timeout: 90000 })
  await page.waitForTimeout(2800)
}

async function selectProject(page) {
  const treeItem = page.locator('.project-tree .el-tree-node__content').filter({ hasText: PROJECT_LABEL }).first()
  if (await treeItem.isVisible({ timeout: 5000 }).catch(() => false)) {
    await treeItem.click()
    await page.waitForTimeout(1800)
    return
  }
  const trigger = page.locator('.org-tree-select .el-select__wrapper, .org-tree-select').first()
  await trigger.click({ timeout: 15000 })
  await page.waitForTimeout(600)
  await page.locator('.el-tree-node__content, .el-tree-node__label').filter({ hasText: PROJECT_LABEL }).first().click({ timeout: 15000 })
  await page.waitForTimeout(1800)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  await gotoCoc(page)
  await selectProject(page)
  await page.waitForSelector('.project-dispatch-btn', { timeout: 20000 })
  await page.locator('.project-dispatch-btn').click()
  await page.waitForSelector('.project-dispatch-layout', { timeout: 20000 })
  await page.waitForTimeout(2200)
  await shot(page, '04-项目调度')
} catch (e) {
  console.error('dispatch fail', e.message)
  await shot(page, '04-项目调度-fail')
}

try {
  await gotoCoc(page)
  await page.waitForSelector('.hq-leader-speech', { timeout: 20000 })
  await page.locator('.hq-leader-speech').click()
  await page.waitForSelector('.command-meeting-layout', { timeout: 20000 })
  await page.waitForTimeout(2200)
  await shot(page, '05-领导讲话')
} catch (e) {
  console.error('leader fail', e.message)
  await shot(page, '05-领导讲话-fail')
}

await browser.close()

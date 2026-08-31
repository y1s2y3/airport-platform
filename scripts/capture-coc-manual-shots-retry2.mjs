/**
 * 补拍领导讲话 + 后台页（修复 defineAsyncComponent 后）
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../../调研记录/02、COC调度中心/shots')
const BASE = 'http://localhost:5173'
mkdirSync(outDir, { recursive: true })

async function shot(page, name) {
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: false })
  console.log('saved', name)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

// 领导讲话：强制回到指挥部总览再点
await page.setViewportSize({ width: 1920, height: 1080 })
await page.goto(`${BASE}/#/coc`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForTimeout(3500)
// 若仍在调度页，点返回
const back = page.locator('button, .back-btn, a').filter({ hasText: /返回/ }).first()
if (await back.isVisible({ timeout: 2000 }).catch(() => false)) {
  await back.click()
  await page.waitForTimeout(2000)
}
// 选择工程指挥部
const org = page.locator('.org-tree-select .el-select__wrapper, .org-tree-select').first()
if (await org.isVisible({ timeout: 3000 }).catch(() => false)) {
  const txt = await org.innerText().catch(() => '')
  if (!txt.includes('工程指挥部')) {
    await org.click()
    await page.waitForTimeout(500)
    await page.locator('.el-tree-node__content').filter({ hasText: '工程指挥部' }).first().click()
    await page.waitForTimeout(2000)
  }
}
await page.waitForSelector('.hq-leader-speech, .leader-btn', { timeout: 25000 })
await page.locator('.hq-leader-speech, .leader-btn').first().click()
await page.waitForSelector('.command-meeting-layout', { timeout: 25000 })
await page.waitForTimeout(2500)
await shot(page, '05-领导讲话')

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
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${BASE}/#${path}`, { waitUntil: 'networkidle', timeout: 90000 })
  await page.waitForTimeout(2800)
  // 等待列表表格或空态出现，避免仍显示 Promise
  await page.waitForSelector('.el-table, .page-card, .empty-tip, .personal-center', { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(800)
  await shot(page, name)
}

await browser.close()
console.log('done')

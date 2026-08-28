import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../docs/prd-shots/labor-warning-center')
const baseUrl = 'http://localhost:5173/#'

mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  // Web: 个人中心 · 预警中心列表
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${baseUrl}/personal-center?tab=warning-center`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1800)
  await page.screenshot({
    path: join(outDir, '01-web-warning-center-list.png'),
    fullPage: false,
  })
  console.log('saved web list')

  // Web: 打开第一条详情
  const detailBtn = page.locator('.el-table .el-button').filter({ hasText: '详情' }).first()
  await detailBtn.click()
  await page.waitForTimeout(2000)
  await page.screenshot({
    path: join(outDir, '02-web-warning-detail.png'),
    fullPage: false,
  })
  console.log('saved web detail')

  // APP: 个人中心 · 预警中心
  await page.setViewportSize({ width: 430, height: 900 })
  await page.goto(`${baseUrl}/labor/mobile/personal-center?tab=warning-center`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  })
  await page.waitForTimeout(1800)
  // 确保在预警中心
  const warnTab = page.getByRole('button', { name: /预警中心/ })
  if (await warnTab.count()) {
    await warnTab.click()
    await page.waitForTimeout(800)
  }
  await page.screenshot({
    path: join(outDir, '03-app-warning-center.png'),
    fullPage: false,
  })
  console.log('saved app warning center')
} catch (error) {
  console.error('capture failed:', error)
  process.exitCode = 1
}

await browser.close()

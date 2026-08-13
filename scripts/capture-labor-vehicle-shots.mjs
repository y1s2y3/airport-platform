/**
 * Capture prototype screenshots from http://localhost:5173 and embed into requirements Word.
 */
import { chromium } from 'playwright'
import { spawnSync } from 'child_process'
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

const SHOTS = [
  { file: '01-realname-stats.png', path: '/labor/realname-stats', project: HQ_ID },
  { file: '02-labor-dashboard.png', path: '/labor/dashboard', project: PROJECT_ID },
  { file: '03-realname-list.png', path: '/labor/realname', project: PROJECT_ID },
  { file: '04-attendance-detail.png', path: '/labor/attendance-detail', project: PROJECT_ID },
  { file: '05-warning-list.png', path: '/labor/warning-list', project: PROJECT_ID },
  { file: '06-warning-config.png', path: '/labor/warning-config', project: HQ_ID },
  { file: '07-blacklist.png', path: '/labor/blacklist', project: HQ_ID },
  { file: '08-vehicle-dashboard-hq.png', path: '/vehicle/dashboard', project: HQ_ID },
  { file: '09-vehicle-access.png', path: '/vehicle/access', project: PROJECT_ID },
  { file: '10-vehicle-track-config.png', path: '/vehicle/track-config', project: HQ_ID },
  { file: '11-vehicle-device.png', path: '/vehicle/device', project: PROJECT_ID },
]

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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const chromePath =
    process.env.PLAYWRIGHT_CHROME_PATH ||
    path.join(
      process.env.LOCALAPPDATA || '',
      'ms-playwright/chromium-1228/chrome-win64/chrome.exe',
    )
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
  await page.waitForTimeout(1200)

  let current = null
  for (const shot of SHOTS) {
    if (shot.project !== current) {
      await page.goto(`${BASE}/workbench`, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForTimeout(600)
      await setProject(page, shot.project)
      current = shot.project
    }
    const url = `${BASE}${shot.path}`
    console.log('goto', url)
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(1400)
    await page.evaluate(() => {
      document.querySelectorAll('.el-message').forEach((el) => el.remove())
    })
    const outPath = path.join(OUT_DIR, shot.file)
    const main = page.locator('.page-viewport').first()
    if (await main.count()) {
      await main.screenshot({ path: outPath })
    } else {
      await page.screenshot({ path: outPath })
    }
    console.log('saved', outPath)
  }

  await browser.close()

  const py = path.join(OUT_DIR, '_embed_shots.py')
  const r = spawnSync('python', [py], { stdio: 'inherit', shell: true })
  process.exit(r.status ?? 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

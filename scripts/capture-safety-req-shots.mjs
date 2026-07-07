import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../docs/safety-req-shots')
const baseUrl = 'http://localhost:5173/#'

mkdirSync(outDir, { recursive: true })

const shots = [
  { name: '01-labor-dashboard', path: '/labor/dashboard' },
  { name: '02-labor-realname', path: '/labor/realname' },
  { name: '03-labor-warning-list', path: '/labor/warning-list' },
  { name: '04-labor-warning-config', path: '/labor/warning-config' },
  { name: '05-vehicle-dashboard', path: '/vehicle/dashboard' },
  { name: '06-vehicle-access', path: '/vehicle/access' },
  { name: '07-vehicle-track', path: '/vehicle/track' },
  { name: '08-vehicle-registry-warning', path: '/vehicle/registry' },
]

async function capture(page, name, path) {
  await page.setViewportSize({ width: 1600, height: 900 })
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(2000)
  const file = join(outDir, `${name}.png`)
  await page.screenshot({ path: file, fullPage: false })
  console.log(`saved: ${file}`)
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

try {
  for (const item of shots) {
    await capture(page, item.name, item.path)
  }
} catch (error) {
  console.error('capture failed:', error.message)
  process.exitCode = 1
}

await browser.close()

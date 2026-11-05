import assert from 'node:assert/strict'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createServer as createNetServer } from 'node:net'

const root = process.env.DAILY_TEST_ROOT || resolve(import.meta.dirname, '..')
const require = createRequire(resolve(root, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')))
const { chromium } = require('playwright')
const output = resolve(root, '../outputs/inspection-attachments')
mkdirSync(output, { recursive: true })
const checks = [], errors = []
const pass = (name, value = true) => { assert.ok(value, name); checks.push(name); console.log('PASS ' + name) }
let server, browser, page
try {
  const probe = createNetServer()
  await new Promise((resolve, reject) => { probe.once('error', reject); probe.listen(0, '127.0.0.1', resolve) })
  const availablePort = probe.address().port
  await new Promise(resolve => probe.close(resolve))
  server = await createServer({ root, configLoader: 'native', logLevel: 'error', server: { host: '127.0.0.1', port: availablePort, strictPort: true, open: false } })
  await server.listen()
  const port = server.httpServer.address().port
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(chromium.executablePath()) ? chromium.executablePath() : 'C:/Program Files/Google/Chrome/Application/chrome.exe') })
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.setDefaultTimeout(15000)
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto('http://127.0.0.1:' + port + '/#/coc-admin/daily-dispatch-check')
  await page.locator('.daily-ledger-list .el-table__body-wrapper tbody tr').first().waitFor()
  await page.evaluate(async () => {
    const Vue = await import('/node_modules/.vite/deps/vue.js')
    const { default: ElementPlus } = await import('/node_modules/.vite/deps/element-plus.js')
    const { default: AttachmentUpload } = await import('/src/components/common/AttachmentUpload.vue')
    window.mountAttachmentFixture = async (options = {}) => {
      window.attachmentFixture?.app.unmount()
      window.attachmentFixture?.host.remove()
      const host = document.createElement('section')
      host.className = 'attachment-compat-fixture'
      host.style.cssText = 'position:fixed;inset:70px 40px 40px;z-index:100000;background:white;padding:30px;overflow:auto'
      document.body.append(host)
      const values = Vue.ref(options.values || []), readonly = Vue.ref(false), emissions = []
      const app = Vue.createApp({ setup: () => () => Vue.h(AttachmentUpload, { preset: 'image', max: 9, ...options, modelValue: values.value, readonly: readonly.value, 'onUpdate:modelValue': value => { emissions.push(value.map(item => item.name)); values.value = value } }) })
      app.use(ElementPlus)
      app.mount(host)
      window.attachmentFixture = { app, host, values, readonly, emissions }
      await Vue.nextTick()
    }
    window.pauseAttachmentReads = () => {
      const NativeReader = window.FileReader
      window.restoreAttachmentReads = () => { window.FileReader = NativeReader }
      window.pendingAttachmentReads = []
      window.FileReader = class extends NativeReader {
        readAsDataURL(file) {
          const handler = this.onload
          this.onload = event => window.pendingAttachmentReads.push(() => handler?.call(this, event))
          super.readAsDataURL(file)
        }
      }
    }
    window.flushAttachmentReads = () => {
      const pending = window.pendingAttachmentReads.splice(0)
      for (const finish of pending) finish()
    }
  })
  const fixture = page.locator('.attachment-compat-fixture')
  const input = () => fixture.locator('input[type=file]')
  const svg = index => ({ name: '现场' + index + '.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>') })
  const mount = options => page.evaluate(options => window.mountAttachmentFixture(options), options)
  const snapshot = () => page.evaluate(() => ({ names: window.attachmentFixture.values.value.map(item => item.name), images: window.attachmentFixture.values.value, emissions: window.attachmentFixture.emissions.length }))
  await mount({})
  pass('Existing pages retain the team upload label', await fixture.getByText('上传图片', { exact: true }).count() === 1)
  await input().setInputFiles([svg(1), svg(2), svg(3)])
  await page.waitForFunction(() => window.attachmentFixture.values.value.length === 3)
  pass('Three files selected together all survive asynchronous reads', new Set((await snapshot()).names).size === 3)
  await input().setInputFiles([svg(4), svg(5)])
  await page.waitForFunction(() => window.attachmentFixture.values.value.length === 5)
  pass('A later selection appends without replacing earlier images', (await snapshot()).names.includes('现场1.svg') && (await snapshot()).names.includes('现场5.svg'))
  await mount({ uploadText: '点击上传' })
  pass('Daily inspection can retain its requested label', await fixture.getByText('点击上传', { exact: true }).count() === 1)
  await input().setInputFiles(Array.from({ length: 10 }, (_, index) => svg(index + 1)))
  await page.waitForFunction(() => window.attachmentFixture.values.value.length === 9)
  await page.waitForTimeout(150)
  pass('Concurrent reads cannot exceed the nine-image limit', (await snapshot()).names.length === 9)
  await mount({})
  const pngBase64 = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 3200; canvas.height = 1600; canvas.getContext('2d').fillRect(0, 0, 3200, 1600); return canvas.toDataURL('image/png').split(',')[1] })
  const photo = { name: '现场照片.png', mimeType: 'image/png', buffer: Buffer.from(pngBase64, 'base64') }
  await input().setInputFiles(photo)
  await page.waitForFunction(() => window.attachmentFixture.values.value.length === 1)
  pass('Compression remains off by default and preserves the original file bytes', (await snapshot()).images[0].url === 'data:image/png;base64,' + pngBase64)
  await mount({ compress: true, maxEdge: 1600, maxKb: 1024 })
  await input().setInputFiles(photo)
  await page.waitForFunction(() => window.attachmentFixture.values.value.length === 1)
  const size = await page.evaluate(async () => { const item = window.attachmentFixture.values.value[0], image = new Image(); image.src = item.url; await image.decode(); return { width: image.width, height: image.height, jpeg: item.url.startsWith('data:image/jpeg;') } })
  pass('The team optional image compression still works', size.jpeg && size.width === 1600 && size.height === 800)
  await mount({ compress: true })
  await input().setInputFiles(svg(1))
  await page.waitForFunction(() => window.attachmentFixture.values.value.length === 1)
  pass('SVG images retain the team compression bypass', (await snapshot()).images[0].url.startsWith('data:image/svg+xml;'))
  await mount({})
  await page.evaluate(() => window.pauseAttachmentReads())
  await input().setInputFiles(svg(1))
  await page.waitForFunction(() => window.pendingAttachmentReads.length === 1)
  await page.evaluate(async () => { window.attachmentFixture.readonly.value = true; await Promise.resolve() })
  await page.evaluate(() => { window.flushAttachmentReads(); window.restoreAttachmentReads() })
  pass('A read finishing after the field becomes read-only does not write back', (await snapshot()).emissions === 0)
  await mount({})
  await page.evaluate(() => window.pauseAttachmentReads())
  await input().setInputFiles(svg(1))
  await page.waitForFunction(() => window.pendingAttachmentReads.length === 1)
  await page.evaluate(() => { window.attachmentFixture.app.unmount(); window.flushAttachmentReads(); window.restoreAttachmentReads() })
  pass('A read finishing after the upload field closes does not write back', (await snapshot()).emissions === 0)
  await mount({ uploadText: '点击上传' })
  await input().setInputFiles([svg(1), svg(2), svg(3)])
  await page.waitForFunction(() => window.attachmentFixture.values.value.length === 3)
  await page.screenshot({ path: resolve(output, 'upload-compatibility.png'), fullPage: true, animations: 'disabled' })
  pass('No console or unhandled browser errors', errors.length === 0)
  writeFileSync(resolve(output, 'verification.json'), JSON.stringify({ checks, errors, passed: true }, null, 2))
  console.log('Attachment compatibility: ' + checks.length + ' checks passed')
} catch (error) {
  await page?.screenshot({ path: resolve(output, 'failure.png'), fullPage: true }).catch(() => {})
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, stack: error.stack, checks, errors }, null, 2))
  throw error
} finally {
  await browser?.close()
  await server?.close()
}

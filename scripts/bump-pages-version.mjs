/**
 * GitHub Pages 发布后递增版本末位 x（v1.0.2.x）
 * 用法：node scripts/bump-pages-version.mjs
 * 可选环境变量 NOTES：以「|」分隔的更新要点，写入新版本 changelog
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const filePath = path.resolve(__dirname, '../src/config/appVersion.js')
const raw = fs.readFileSync(filePath, 'utf8')

const patchMatch = raw.match(/export const APP_VERSION_PATCH = (\d+)/)
if (!patchMatch) {
  console.error('Cannot find APP_VERSION_PATCH in appVersion.js')
  process.exit(1)
}

const prev = Number(patchMatch[1])
const next = prev + 1
const today = new Date().toISOString().slice(0, 10)
const version = `v1.0.2.${next}`

let nextRaw = raw.replace(
  /export const APP_VERSION_PATCH = \d+/,
  `export const APP_VERSION_PATCH = ${next}`,
)

const notesEnv = (process.env.NOTES || '').trim()
const highlights = notesEnv
  ? notesEnv.split('|').map((s) => s.trim()).filter(Boolean)
  : []

if (highlights.length) {
  const highlightLines = highlights.map((h) => `      '${h.replace(/'/g, "\\'")}',`).join('\n')
  const entry = `  {
    version: '${version}',
    date: '${today}',
    highlights: [
${highlightLines}
    ],
  },
`
  const marker = 'export const VERSION_CHANGELOG = [\n'
  const idx = nextRaw.indexOf(marker)
  if (idx === -1) {
    console.error('Cannot find VERSION_CHANGELOG in appVersion.js')
    process.exit(1)
  }
  nextRaw = nextRaw.slice(0, idx + marker.length) + entry + nextRaw.slice(idx + marker.length)
}

fs.writeFileSync(filePath, nextRaw, 'utf8')
console.log(`Bumped version: v1.0.2.${prev} → ${version}${highlights.length ? ' (with notes)' : ''}`)

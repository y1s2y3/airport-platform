/**

 * 将 NOTES 写入当前 APP_VERSION 对应的 changelog（用于 workflow_dispatch）

 * NOTES：多项用 | 分隔

 */

import fs from 'node:fs'

import path from 'node:path'

import { fileURLToPath } from 'node:url'



const __dirname = path.dirname(fileURLToPath(import.meta.url))

const filePath = path.resolve(__dirname, '../src/config/appVersion.js')

const raw = fs.readFileSync(filePath, 'utf8')



const baseMatch = raw.match(/export const APP_VERSION_BASE = '([^']+)'/)

const patchMatch = raw.match(/export const APP_VERSION_PATCH = (\d+)/)

if (!baseMatch || !patchMatch) {

  console.error('Cannot find APP_VERSION_BASE / APP_VERSION_PATCH')

  process.exit(1)

}



const notesEnv = (process.env.NOTES || '').trim()

const highlights = notesEnv.split('|').map((s) => s.trim()).filter(Boolean)

if (!highlights.length) {

  console.log('No NOTES provided, skip')

  process.exit(0)

}



const base = baseMatch[1]

const patch = Number(patchMatch[1])

const version = `v${base}.${patch}`

const today = new Date().toISOString().slice(0, 10)

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

const idx = raw.indexOf(marker)

if (idx === -1) {

  console.error('Cannot find VERSION_CHANGELOG')

  process.exit(1)

}



// 若已有同版本条目则替换，否则插入到最前

const versionRe = new RegExp(

  `  \\{\\s*version: '${version.replace(/\./g, '\\.')}'[\\s\\S]*?\\},\\n`,

)

let nextRaw = raw

if (versionRe.test(raw)) {

  nextRaw = raw.replace(versionRe, entry)

} else {

  nextRaw = raw.slice(0, idx + marker.length) + entry + raw.slice(idx + marker.length)

}



fs.writeFileSync(filePath, nextRaw, 'utf8')

console.log(`Applied release notes for ${version}`)



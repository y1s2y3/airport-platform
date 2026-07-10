import { execSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const releaseDir = resolve(root, 'release')
const buildTmpDir = resolve(releaseDir, '.build-tmp-dispatch')
const baseOutputName = '项目调度.html'

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

function resolveUniqueOutputName(dir, preferredName) {
  const preferredPath = resolve(dir, preferredName)
  if (!existsSync(preferredPath)) return preferredName

  const stem = preferredName.replace(/\.html$/i, '')
  let candidate = `${stem}-${formatTimestamp()}.html`
  let index = 1
  while (existsSync(resolve(dir, candidate))) {
    candidate = `${stem}-${formatTimestamp()}-${index}.html`
    index += 1
  }
  return candidate
}

function cleanDir(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    rmSync(resolve(dir, name), { recursive: true, force: true })
  }
}

mkdirSync(releaseDir, { recursive: true })
rmSync(buildTmpDir, { recursive: true, force: true })
mkdirSync(buildTmpDir, { recursive: true })

const outputName = resolveUniqueOutputName(releaseDir, baseOutputName)
const releaseOutput = resolve(releaseDir, outputName)

console.log(`\n>>> 打包项目调度页 → ${outputName}`)
if (outputName !== baseOutputName) {
  console.log(`    （已存在 ${baseOutputName}，本次不覆盖，使用新文件名）`)
}

execSync('npm run build -- --config vite.coc-standalone.config.js', {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    COC_BOOT: JSON.stringify({ view: 'dispatch' }),
    STANDALONE_OUT_DIR: buildTmpDir,
  },
})

const builtIndex = resolve(buildTmpDir, 'coc.html')
if (!existsSync(builtIndex)) {
  throw new Error(`构建失败：未找到 ${builtIndex}`)
}

copyFileSync(builtIndex, releaseOutput)

cleanDir(buildTmpDir)
rmSync(buildTmpDir, { recursive: true, force: true })

console.log('\n✓ 项目调度单文件 HTML 已输出：')
console.log(`  ${releaseOutput}`)
console.log('  可直接双击用浏览器打开，无需启动服务器。')
console.log('  默认进入项目调度页；可通过 URL 参数切换项目，例如：')
console.log('  ?view=dispatch&project=p-001  或  #/?view=dispatch&project=p-001')

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
const buildTmpDir = resolve(releaseDir, '.build-tmp')
const baseOutputName = '机场工程项目管理平台v2.html'

function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  )
}

/** 若目标已存在，追加时间戳，避免覆盖历史打包文件 */
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

mkdirSync(releaseDir, { recursive: true })
rmSync(buildTmpDir, { recursive: true, force: true })
mkdirSync(buildTmpDir, { recursive: true })

const outputName = resolveUniqueOutputName(releaseDir, baseOutputName)
const releaseOutput = resolve(releaseDir, outputName)

console.log(`\n>>> 打包一体化平台 → ${outputName}`)
if (outputName !== baseOutputName) {
  console.log(`    （已存在 ${baseOutputName}，本次不覆盖，使用新文件名）`)
}

execSync('npm run build -- --config vite.standalone.config.js', {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    STANDALONE_OUT_DIR: buildTmpDir,
  },
})

const builtIndex = resolve(buildTmpDir, 'index.html')
copyFileSync(builtIndex, releaseOutput)

for (const name of readdirSync(buildTmpDir)) {
  rmSync(resolve(buildTmpDir, name), { recursive: true, force: true })
}
rmSync(buildTmpDir, { recursive: true, force: true })

console.log(`\n✓ 单文件 HTML 已输出：`)
console.log(`  ${releaseOutput}`)
console.log('  使用 hash 路由，可直接双击用浏览器打开，无需启动服务器。')
if (outputName !== baseOutputName) {
  console.log(`  历史文件已保留，未覆盖 ${baseOutputName}`)
}

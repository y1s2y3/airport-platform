import { execSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs'
import { resolve, dirname, basename } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const releaseDir = resolve(root, 'release')
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
const buildTmpDir = mkdtempSync(resolve(releaseDir, '.build-tmp-'))

const outputName = resolveUniqueOutputName(releaseDir, baseOutputName)
const releaseOutput = resolve(releaseDir, outputName)

console.log(`\n>>> 打包一体化平台 → ${outputName}`)
if (outputName !== baseOutputName) {
  console.log(`    （保留本次快照，并同步更新固定入口 ${baseOutputName}）`)
}

execSync('npm run build -- --config vite.standalone.config.js --configLoader native', {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    STANDALONE_OUT_DIR: buildTmpDir,
  },
})

const builtIndex = resolve(buildTmpDir, 'index.html')
copyFileSync(builtIndex, releaseOutput)
if (outputName !== baseOutputName) copyFileSync(builtIndex, resolve(releaseDir, baseOutputName))

if (dirname(buildTmpDir) !== releaseDir || !basename(buildTmpDir).startsWith('.build-tmp-')) {
  throw new Error('临时构建目录超出预期范围，停止清理')
}
try { rmSync(buildTmpDir, { recursive: true, force: true }) }
catch (error) { console.warn(`临时目录清理未完成，预览文件已生成：${buildTmpDir}（${error.message}）`) }

console.log(`\n✓ 单文件 HTML 已输出（后台 + COC 大屏）：`)
console.log(`  ${releaseOutput}`)
console.log('  使用 hash 路由，可直接双击用浏览器打开，无需启动服务器。')
console.log('  进入大屏：顶栏「COC调度大屏」，或打开 #/coc')
if (outputName !== baseOutputName) {
  console.log(`  本次快照已保留；${baseOutputName} 已更新为本次构建，一键打开与源码保持一致。`)
}

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

const variants = [
  {
    view: 'hq',
    fileName: 'COC调度大屏-指挥部.html',
    title: '指挥部默认页',
  },
  {
    view: 'project',
    fileName: 'COC调度大屏-项目视图.html',
    title: '项目级一级页面',
  },
  {
    view: 'dispatch',
    fileName: 'COC调度大屏-项目调度.html',
    title: '项目调度页面',
  },
]

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

const outputs = []

for (const variant of variants) {
  const buildTmpDir = resolve(releaseDir, `.build-tmp-${variant.view}`)
  const outputName = resolveUniqueOutputName(releaseDir, variant.fileName)
  const releaseOutput = resolve(releaseDir, outputName)

  rmSync(buildTmpDir, { recursive: true, force: true })
  mkdirSync(buildTmpDir, { recursive: true })

  console.log(`\n>>> 打包 ${variant.title} → ${outputName}`)

  execSync('npm run build -- --config vite.coc-standalone.config.js', {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      COC_BOOT: JSON.stringify({ view: variant.view }),
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

  outputs.push({ ...variant, outputName, releaseOutput })
}

console.log('\n✓ COC 调度大屏单文件 HTML 已输出：')
for (const item of outputs) {
  console.log(`  [${item.title}]`)
  console.log(`    ${item.releaseOutput}`)
}
console.log('  可直接双击用浏览器打开，无需启动服务器。')

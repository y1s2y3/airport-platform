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

/** 默认打成三视图合一；设 COC_SPLIT_VIEWS=1 时仍按视图拆成三个 HTML */
const splitViews = process.env.COC_SPLIT_VIEWS === '1'

const unifiedVariant = {
  view: 'hq',
  fileName: 'COC调度大屏.html',
  title: '三视图合一（默认指挥部，页内可切换）',
  boot: {},
}

const splitVariants = [
  {
    view: 'hq',
    fileName: 'COC调度大屏-指挥部.html',
    title: '指挥部默认页',
    boot: { view: 'hq' },
  },
  {
    view: 'project',
    fileName: 'COC调度大屏-项目视图.html',
    title: '项目级一级页面',
    boot: { view: 'project' },
  },
  {
    view: 'dispatch',
    fileName: 'COC调度大屏-项目调度.html',
    title: '项目调度页面',
    boot: { view: 'dispatch' },
  },
]

const variants = splitViews ? splitVariants : [unifiedVariant]

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
      COC_BOOT: JSON.stringify(variant.boot ?? { view: variant.view }),
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
if (!splitViews) {
  console.log('  默认打开指挥部；页内可切换到项目视图 / 项目调度。')
  console.log('  也可用 URL 直达：?view=hq | ?view=project | ?view=dispatch')
  console.log('  若仍需拆成三个 HTML：COC_SPLIT_VIEWS=1 npm run build:coc-html')
}
console.log('  可直接双击用浏览器打开，无需启动服务器。')

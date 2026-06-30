import { execSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const releaseDir = resolve(root, 'release')
const outputName = '机场工程项目管理平台.html'
const desktopCopy = resolve(root, '..', outputName)

rmSync(releaseDir, { recursive: true, force: true })
mkdirSync(releaseDir, { recursive: true })

console.log(`\n>>> 打包一体化平台 → ${outputName}`)
execSync('npm run build -- --config vite.standalone.config.js', {
  cwd: root,
  stdio: 'inherit',
})

copyFileSync(resolve(releaseDir, 'index.html'), resolve(releaseDir, outputName))
rmSync(resolve(releaseDir, 'index.html'), { force: true })

for (const name of readdirSync(releaseDir)) {
  if (!name.endsWith('.html')) {
    rmSync(resolve(releaseDir, name), { recursive: true, force: true })
  }
}

copyFileSync(resolve(releaseDir, outputName), desktopCopy)

console.log(`\n✓ 单文件 HTML 已输出：`)
console.log(`  ${resolve(releaseDir, outputName)}`)
console.log(`  ${desktopCopy}`)
console.log('  使用 hash 路由，可直接双击用浏览器打开，无需启动服务器。')

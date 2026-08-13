/**
 * 默认一键打包：仅输出一体化单文件 HTML（后台 + 内嵌 COC 大屏）
 * 输出：release/机场工程项目管理平台v2.html
 *
 * 如需单独的 COC 大屏文件，请显式执行：npm run build:coc-html
 */
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

execSync('npm run build:html', { cwd: root, stdio: 'inherit' })

console.log('\n✓ 默认只打一个 HTML（后台 + COC）。独立大屏请用：npm run build:coc-html')

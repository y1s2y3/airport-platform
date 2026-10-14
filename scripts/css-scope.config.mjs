/**
 * 子应用样式「作用域收敛」的单一事实源。
 *
 * 被两处共用，避免配置漂移：
 *   1) 构建期：scripts/postcss-scope-screens.mjs（自动给目标样式表加根类前缀）
 *   2) 发布闸门：scripts/check-style-scope.mjs（源码体检 + 产物断言）
 *
 * 背景（2026-10-14 实际事故）：本项目是单文件构建（vite-plugin-singlefile，全部 CSS 内联进
 * 一个 HTML），因此任何**未限定作用域**的样式都会在发布产物里全局生效；而开发服务器按路由
 * 懒加载 CSS，本地根本看不到 —— 于是「本地好、线上坏」。安全态势大屏 V2 曾因此把
 * `:root{--screen-bg…}`、`html,body,#app{…overflow:hidden}`、`.project-select{…}` 泄漏到
 * 主平台（顶栏变深色底、整页滚动被锁）。
 */

/** 必须作用域收敛的样式表：file 相对 src/，root 为该屏/子应用根节点类 */
export const SCOPE_TARGETS = [
  {
    file: 'src/safetyScreen/styles/screen.css',
    root: '.safety-screen-app',
    /** 刻意保留的全局选择器（必须逐字匹配，允许写在目标文件里） */
    allowGlobal: ['body.coc-hq-shell'],
  },
  {
    file: 'src/safetyScreenV1/styles/screen.css',
    root: '.safety-screen-v1',
    allowGlobal: ['body.coc-hq-shell'],
  },
]

/**
 * 允许出现全局选择器的平台基线样式（历史既有、有意为之，不属于泄漏）。
 * 说明：
 *   - src/style.css           Vite 脚手架残留（当前未被引用），保留不动
 *   - src/styles/theme.css    平台主题（:root / * / html / body / #app 属正常重置）
 *   - src/coc/styles/theme.css COC 主题，变量统一用 --coc-* 命名空间，不与他人冲突
 */
export const PLATFORM_BASELINE = [
  'src/style.css',
  'src/styles/theme.css',
  'src/coc/styles/theme.css',
]

/** 会污染整站的高危全局选择器（严格相等或作为首段出现即算命中） */
export const HIGH_RISK_GLOBAL = [':root', '*', 'html', 'body', '#app']

/** 首段涉及 html/body/#app 的选择器无法被有意义地加前缀，必须改写成门控形式 */
export const UNPREFIXABLE_ROOT = /(^|[\s>+~,.(])(html|body)(?![-\w])|#app(?![-\w])/

/**
 * 构建产物（单文件 HTML）级断言：发布前/后核验线上形态。
 * 断言串一律用正则，避免压缩器重排声明顺序造成假通过。
 */
export const DIST_SIGNATURES = [
  { label: '裸 :root 承载屏内变量（泄漏特征）', pattern: /:root\s*\{[^}]*--screen-/, expect: 'absent' },
  { label: '屏根作用域变量块（V2）', pattern: /\.safety-screen-app\s*\{[^}]*--screen-/, expect: 'present' },
  { label: '屏根作用域变量块（V1）', pattern: /\.safety-screen-app\.safety-screen-v1\s*\{[^}]*--screen-/, expect: 'present' },
  { label: '裸 .project-select 规则（泄漏特征）', pattern: /(^|\})\s*\.project-select\s*[,{]/, expect: 'absent' },
  { label: '泄漏到整站的 html/body/#app 滚动锁定', pattern: /html\s*,\s*body\s*,\s*#app\s*\{[^}]*overflow\s*:\s*hidden/, expect: 'absent' },
  { label: '门控后的满屏重置（body.coc-hq-shell）', pattern: /body\.coc-hq-shell\s*\{/, expect: 'present' },
]

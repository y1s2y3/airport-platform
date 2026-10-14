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

/**
 * 必须「自动作用域收敛」的样式表：适用于**独立全屏子应用**（渲染时整页归它，屏内元素全在根节点内）。
 * file 相对项目根；root 为该屏根节点类。
 * allowGlobal 为**选择器前缀**白名单（命中 `=== 前缀` 或 `startsWith(前缀)`）。
 */
export const SCOPE_TARGETS = [
  {
    file: 'src/safetyScreen/styles/screen.css',
    root: '.safety-screen-app',
    allowGlobal: ['body.coc-hq-shell'],
  },
  {
    file: 'src/safetyScreenV1/styles/screen.css',
    root: '.safety-screen-v1',
    allowGlobal: ['body.coc-hq-shell'],
  },
]

/**
 * 必须「门控式收敛」的样式表：适用于**与主平台共存的壳 / 内嵌页**——不能整体加前缀
 * （它们的类名会被平台内嵌页面复用，加前缀即打散样式），但要求：除 allowGlobal 外，
 * **每条选择器都必须受 gate 门控**，否则会污染整站。
 */
export const SHELL_GATED_TARGETS = [
  {
    file: 'src/coc/styles/hq-dark-theme.css',
    // 该文件的规则分别以 body 类 .coc-hq-shell 与屏根类 .coc-hq-mode 门控，两者都算合规
    gate: ['.coc-hq-shell', '.coc-hq-mode'],
    // 传送到 <body> 的 popper（Element Plus 弹层），必须在门控之外也能命中
    allowGlobal: ['.hq-org-tree-select-popper', '.screenshot-mark-popper'],
    note: 'COC 调度大屏（全屏壳）主题：规则须受 .coc-hq-shell / .coc-hq-mode 门控',
  },
]

/**
 * 平台「框架层」类名（来自 src/layout/AdminLayout.vue 的顶栏/项目选择器等）。
 * 这些类名属于平台骨架，**只有其归属文件自己可以定义**；其它文件把它们写成全局规则即视为泄漏——
 * 2026-10-14 的 `.project-select{background:深蓝}`（写在 safetyScreen 里）就是这类事故。
 * 注：`.project-select-dropdown` 等 popper 类需在归属文件用**非 scoped** 样式块定义（传送层），属正常。
 */
export const PROTECTED_SELECTORS = [
  '.project-select',
  '.project-select-dropdown',
  '.project-option',
  '.project-option-main',
  '.project-option-label',
  '.project-option-status',
  '.project-option-full',
  '.project-group-header',
  '.project-group-title',
  '.status-filter-tags',
  '.brand-title',
  '.brand-version',
  '.brand-version-text',
  '.brand-version-help',
].map((selector) => ({ selector, owner: 'src/layout/AdminLayout.vue' }))

/**
 * 允许出现全局选择器的平台基线样式（历史既有、有意为之，不属于泄漏）。
 * 说明：
 *   - src/style.css            Vite 脚手架残留（当前未被引用），保留不动
 *   - src/styles/theme.css     平台主题（:root / * / html / body / #app 属正常重置）
 *   - src/coc/styles/theme.css COC 主题：变量统一 `--coc-*` 命名空间；`.panel-card`/`.panel-title`
 *                              等是与平台内嵌管理页**共用**的设计类，故登记为基线
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

/** 前缀白名单匹配：整体相等或以该前缀开头 */
export function matchAllow(list, selector) {
  return (list || []).some((p) => selector === p || selector.startsWith(p))
}

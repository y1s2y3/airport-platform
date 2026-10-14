/**
 * 构建期 PostCSS 插件：给「子应用样式表」自动做作用域收敛（治本，不依赖人工纪律）。
 *
 * 行为（幂等）：
 *   - 命中 SCOPE_TARGETS 的文件才处理，其它文件原样放行（零影响）
 *   - 普通选择器 → 加根类前缀：`.panel` → `.safety-screen-app .panel`
 *   - `:root { --x }` → 改成 `<root> { --x }`（变量随根节点继承，作用域内有效）
 *   - `* { … }` → `<root> * { … }`
 *   - 已带根类前缀的规则**跳过**（可重复运行）
 *   - allowGlobal 里的选择器（如 `body.coc-hq-shell`）原样保留
 *   - 首段涉及 html / body / #app 又不在 allowGlobal 的：**直接抛错中断构建**，
 *     避免「无法被前缀化→静默全局泄漏」——这正是 2026-10-14 事故的成因。
 *
 * 单文件构建会把全部 CSS 内联，因此这里挡住的每一条都对应一次潜在的全站污染。
 */
import path from 'node:path'
import { SCOPE_TARGETS, HIGH_RISK_GLOBAL, UNPREFIXABLE_ROOT } from './css-scope.config.mjs'

const normalize = (s) => s.replace(/\s+/g, ' ').trim()

/** 取选择器首段复合部分（到第一个组合符/后代空格为止） */
function firstCompound(selector) {
  return selector.split(/[\s>+~]/)[0]
}

function isKeyframeChild(rule) {
  let p = rule.parent
  while (p) {
    if (p.type === 'atrule' && p.name === 'keyframes') return true
    p = p.parent
  }
  return false
}

export default function scopeSubAppStyles(options = {}) {
  const targets = options.targets || SCOPE_TARGETS
  const cwd = options.cwd || process.cwd()

  return {
    postcssPlugin: 'scope-subapp-styles',
    Once(root, { result }) {
      const from = result?.opts?.from
      if (!from) return
      const rel = path.relative(cwd, from).split(path.sep).join('/')
      const target = targets.find((t) => rel.endsWith(t.file) || t.file.endsWith(rel))
      if (!target) return

      const { root: rootSel, allowGlobal = [] } = target
      const allow = new Set(allowGlobal.map(normalize))
      const errors = []

      root.walkRules((rule) => {
        if (isKeyframeChild(rule)) return
        const original = rule.selector
        const parts = original.split(',').map(normalize).filter(Boolean)
        let changed = false
        const next = parts.map((part) => {
          // 已作用域（首段含根类）→ 跳过
          if (firstCompound(part).includes(rootSel)) return part
          // 允许保留的全局
          if (allow.has(part)) return part
          changed = true
          // :root → 根类
          if (part === ':root') return rootSel
          // 无法前缀化的全局：必须显式改写（如 body.coc-hq-shell 并加入 allowGlobal）
          if (UNPREFIXABLE_ROOT.test(part)) {
            errors.push(`${target.file}: 选择器「${part}」涉及 html/body/#app，无法自动作用域化；请改写成受根类/body 类门控的形式并加入 allowGlobal`)
            return part
          }
          return `${rootSel} ${part}`
        })
        // 仅在确有改动时才写回，避免对已收敛文件产生纯格式 diff（保证幂等）
        if (changed) rule.selector = next.join(', ')
      })

      if (errors.length) {
        throw rule2Error(errors)
      }
    },
  }
}

function rule2Error(errors) {
  const e = new Error(
    `[css-scope] 子应用样式无法自动收敛，构建已中断：\n  - ` + errors.join('\n  - ') +
    `\n提示：普通选择器会被自动加根类前缀；html/body/#app 无法前缀化，需写成门控形式。`
  )
  e.name = 'CssScopeError'
  return e
}

export const postcss = true

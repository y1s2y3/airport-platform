#!/usr/bin/env node
/**
 * 样式作用域闸门（发布前后均可跑）——防「局部样式污染全局」这类只在线上显现的问题。
 *
 * 用法：
 *   node scripts/check-style-scope.mjs                # 源码体检（默认；有问题退出码 1）
 *   node scripts/check-style-scope.mjs --dist dist    # 构建产物断言（读 dist/index.html）
 *   node scripts/check-style-scope.mjs --no-fail      # 仅报告，不因问题退出（本地排查用）
 *
 * 检查项：
 *   ① 高危全局选择器（:root / * / html / body / #app / 首段涉及 html·body·#app）出现在非平台基线文件里
 *   ② 门控式目标（SHELL_GATED_TARGETS，如 COC 大屏主题）里未受 gate 门控、又不在 allowGlobal 的规则
 *   ③ 平台框架类名（PROTECTED_SELECTORS，如 .project-select）被非归属文件写成全局规则
 *   ④ 【冲突】同一裸类选择器被 ≥2 个**真全局**来源定义且取值不同 → 谁生效取决于打包顺序（必须修）
 *   ⑤ 【同值重复】同上但取值一致 → 无害但脆弱（仅提示）
 *   ⑥ 【全局样式表清单】经 JS import 全局生效的 .css（建议加命名空间或页面根类限定）
 *
 * 关键概念——「是否全局」由**引入方式**决定，不是文件位置：
 *   · `@import './x.css'` 写在 <style scoped> 里 → Vue 会给 x.css 的规则加 [data-v-]，**实际是 scoped，安全**
 *   · JS 层 `import './x.css'` → **真正全局**（单文件构建里全站生效）
 *
 * 为什么需要它：本项目是单文件构建，全部 CSS 内联进一个 HTML，任何未限定作用域的样式都会全局生效；
 * 而开发服务器按路由懒加载 CSS，本地看不出来 —— 于是「本地好、线上坏」。
 * 2026-10-14 安全态势大屏 V2 曾把 :root{} / html,body,#app{overflow:hidden} / .project-select{}
 * 泄漏到主平台（顶栏变深色底、整页滚动被锁）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  SCOPE_TARGETS, SHELL_GATED_TARGETS, PLATFORM_BASELINE, PROTECTED_SELECTORS,
  HIGH_RISK_GLOBAL, UNPREFIXABLE_ROOT, DIST_SIGNATURES, matchAllow,
} from './css-scope.config.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.resolve(HERE, '..')
const SRC = path.join(PROJECT, 'src')
const require_ = createRequire(path.join(PROJECT, 'package.json'))
const postcss = require_('postcss')

const argv = process.argv.slice(2)
const NO_FAIL = argv.includes('--no-fail')
const distIdx = argv.indexOf('--dist')
const DIST = distIdx >= 0 ? path.resolve(PROJECT, argv[distIdx + 1] || 'dist') : null

const norm = (s) => s.replace(/\s+/g, ' ').trim()
const rel = (p) => path.relative(PROJECT, p).split(path.sep).join('/')
const out = (m) => console.log(m)
const firstCompound = (s) => s.split(/[\s>+~]/)[0]
const bareClass = (sel) => {
  const m = sel.match(/^\.([A-Za-z_][\w-]*)/)
  if (!m) return null
  // 首段即该裸类（允许 :hover / .active 等后缀，但不允许后代/组合符）
  return firstCompound(sel) === sel.replace(/:.*$/, '') ? m[1] : null
}
let problems = 0
const infos = []

/* ==================== 工具 ==================== */
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else yield* [p]
  }
}
const stripStyleBlocks = (t) => t.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
function unscopedStyleBlocks(src) {
  const out2 = []
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/g
  let m
  while ((m = re.exec(src)) !== null) if (!/\bscoped\b/.test(m[1] || '')) out2.push(m[2])
  return out2
}
function isKeyframeChild(rule) {
  let p = rule.parent
  while (p) { if (p.type === 'atrule' && p.name === 'keyframes') return true; p = p.parent }
  return false
}
function atRuleContext(rule) {
  const ctx = []
  let p = rule.parent
  while (p && p.type === 'atrule') { ctx.unshift('@' + p.name + ' ' + (p.params || '')); p = p.parent }
  return ctx.join('|')
}

/* ==================== 引入方式分析（F3 的依据） ==================== */
function buildImportModes(files) {
  const refs = new Map() // relCss -> { js:Set, scopedImport:Set, otherImport:Set }
  const get = (r) => { if (!refs.has(r)) refs.set(r, { js: new Set(), scopedImport: new Set(), otherImport: new Set() }); return refs.get(r) }
  for (const f of files) {
    const ext = path.extname(f).toLowerCase()
    const rf = rel(f)
    if (ext === '.vue') {
      const t = fs.readFileSync(f, 'utf8')
      for (const m of stripStyleBlocks(t).matchAll(/(?:import|require\()\s*['"]([^'"]+\.css)['"]/g)) get(rel(path.resolve(path.dirname(f), m[1]))).js.add(rf)
      for (const m of t.matchAll(/<style([^>]*)>([\s\S]*?)<\/style>/g)) {
        const scoped = /\bscoped\b/.test(m[1] || '')
        for (const im of m[2].matchAll(/@import\s+(?:url\()?['"]([^'"]+\.css)['"]/g)) {
          const e = get(rel(path.resolve(path.dirname(f), im[1])))
          ;(scoped ? e.scopedImport : e.otherImport).add(rf)
        }
      }
    } else if (ext === '.js' || ext === '.mjs') {
      const t = fs.readFileSync(f, 'utf8')
      for (const m of t.matchAll(/(?:import|require\()\s*['"]([^'"]+\.css)['"]/g)) get(rel(path.resolve(path.dirname(f), m[1]))).js.add(rf)
    } else if (ext === '.css') {
      const t = fs.readFileSync(f, 'utf8')
      for (const im of t.matchAll(/@import\s+(?:url\()?['"]([^'"]+\.css)['"]/g)) get(rel(path.resolve(path.dirname(f), im[1]))).otherImport.add(rf)
    }
  }
  const modeOf = (r) => {
    const e = refs.get(r)
    if (!e) return 'UNREFERENCED'
    if (e.js.size) return 'GLOBAL_JS'
    if (e.otherImport.size) return 'GLOBAL_IMPORT'
    if (e.scopedImport.size) return 'SCOPED_IMPORT'
    return 'UNREFERENCED'
  }
  return { modeOf, refs }
}

/* ==================== 产物断言模式 ==================== */
function checkDist() {
  const html = path.join(DIST, 'index.html')
  if (!fs.existsSync(html)) {
    out(`❌ 未找到构建产物 ${rel(html)}（请先执行 npm run build）`)
    problems += 1
    return
  }
  const text = fs.readFileSync(html, 'utf8')
  out(`=== 产物断言：${rel(html)}（${text.length} 字符）===`)
  for (const sig of DIST_SIGNATURES) {
    const hit = new RegExp(sig.pattern.source, sig.pattern.flags.replace('g', '')).test(text)
    const ok = sig.expect === 'present' ? hit : !hit
    if (!ok) problems += 1
    out(`  ${ok ? '✅' : '❌'} [${sig.expect === 'present' ? '应存在' : '应不存在'}] ${sig.label}`)
  }
}

/* ==================== 源码体检模式 ==================== */
function checkSource() {
  const baseline = new Set(PLATFORM_BASELINE)
  const targetByFile = new Map(SCOPE_TARGETS.map((t) => [t.file, t]))
  const gatedByFile = new Map(SHELL_GATED_TARGETS.map((t) => [t.file, t]))

  const allFiles = [...walk(SRC)]
  const { modeOf } = buildImportModes(allFiles)

  // 收集所有样式来源
  const sources = []
  for (const f of allFiles) {
    const ext = path.extname(f).toLowerCase()
    const r = rel(f)
    if (ext === '.css') {
      const mode = modeOf(r)
      sources.push({ file: f, r, css: fs.readFileSync(f, 'utf8'), scopedByImport: mode === 'SCOPED_IMPORT', mode })
    } else if (ext === '.vue') {
      const blocks = unscopedStyleBlocks(fs.readFileSync(f, 'utf8'))
      if (blocks.length) sources.push({ file: f, r, css: blocks.join('\n'), scopedByImport: false, mode: 'VUE_UNSCOPED' })
    }
  }

  out(`=== 源码体检：扫描 ${sources.length} 个样式来源 ===`)
  out(`    （平台基线 ${PLATFORM_BASELINE.length} 个跳过；自动作用域目标 ${SCOPE_TARGETS.length} 个；门控式目标 ${SHELL_GATED_TARGETS.length} 个；受保护类名 ${PROTECTED_SELECTORS.length} 个）`)

  let scanned = 0
  for (const { file: f, r, css, scopedByImport } of sources) {
    if (baseline.has(r)) continue
    scanned += 1
    const target = targetByFile.get(r)
    const gated = gatedByFile.get(r)
    const allow = (target?.allowGlobal || gated?.allowGlobal || []).map(norm)
    const rootSel = target?.root
    const gate = gated?.gate

    let root
    try {
      root = postcss.parse(css, { from: f })
    } catch (e) {
      problems += 1
      out(`  ❌ ${r}: CSS 解析失败 — ${e.message.slice(0, 90)}`)
      continue
    }

    root.walkRules((rule) => {
      if (isKeyframeChild(rule)) return
      const line = rule.source?.start?.line ?? '?'
      for (const part of rule.selector.split(',').map(norm).filter(Boolean)) {
        const first = firstCompound(part)

        // ① 高危全局选择器
        const isHigh = HIGH_RISK_GLOBAL.includes(part)
          || HIGH_RISK_GLOBAL.includes(first)
          || UNPREFIXABLE_ROOT.test(part)
        if (isHigh) {
          if (matchAllow(allow, part)) continue
          if (rootSel && first.includes(rootSel)) continue
          // 经 <style scoped> 里的 @import 引入的 CSS 会被 Vue 加 [data-v-]，实际不全局（提示级）
          if (scopedByImport) { infos.push(`${r}:${line}  [scoped-by-import] 「${part}」由 <style scoped> 的 @import 引入，Vue 会加 [data-v-]，实际不全局`); continue }
          problems += 1
          out(`  ❌ ${r}:${line}  [高危全局] 「${part}」`
            + (target ? `（该文件应作用于 ${rootSel}）` : '（未登记为平台基线）'))
          continue
        }

        // ② 门控式目标：非 allowGlobal 的规则必须受 gate 门控
        const gates = Array.isArray(gate) ? gate : (gate ? [gate] : [])
        if (gates.length && !gates.some((g) => part.startsWith(g))) {
          if (matchAllow(allow, part)) continue
          problems += 1
          out(`  ❌ ${r}:${line}  [未门控] 「${part}」应以 ${gates.join(' 或 ')} 开头（或登记进 allowGlobal）`)
          continue
        }

        // ③ 平台受保护类名被「非归属文件」写成全局规则（自动作用域目标的文件会在构建期加前缀，故豁免）
        if (!target) {
          const hit = PROTECTED_SELECTORS.find((p) => p.selector === first && p.owner !== r)
          if (hit) {
            problems += 1
            out(`  ❌ ${r}:${line}  [平台受保护类名] 「${part}」属平台框架（归属 ${hit.owner}），请改用作用域/门控`)
          }
        }
      }
    })
  }

  /* ---- ④⑤ 冲突 / 同值重复：只在「真全局」来源之间比对 ---- */
  const defs = new Map() // `class|atruleCtx` -> Map(sourceRel -> SignatureSet)
  const addDef = (cls, ctx, srcRel, sig) => {
    const key = `${cls}|${ctx}`
    if (!defs.has(key)) defs.set(key, new Map())
    const m = defs.get(key)
    if (!m.has(srcRel)) m.set(srcRel, new Set())
    m.get(srcRel).add(sig)
  }
  for (const { file: f, r, css, scopedByImport, mode } of sources) {
    if (baseline.has(r)) continue
    if (targetByFile.has(r)) continue           // 自动作用域目标：构建期会加前缀，不参与
    if (gatedByFile.has(r)) continue            // 门控目标：已单独检查
    if (scopedByImport) continue                // 实际 scoped，不参与
    if (mode === 'UNREFERENCED') continue       // 未进构建，不参与
    let root
    try { root = postcss.parse(css, { from: f }) } catch { continue }
    root.walkRules((rule) => {
      if (isKeyframeChild(rule)) return
      const sig = (rule.nodes || []).map((n) => (n.type === 'decl' ? `${n.prop}:${n.value}` : n.type)).sort().join(';')
      const ctx = atRuleContext(rule)
      for (const part of rule.selector.split(',').map(norm).filter(Boolean)) {
        const cls = bareClass(part)
        if (!cls) continue
        addDef(cls, ctx, r, `${part.replace(/^\.([A-Za-z_][\w-]*)/, '')}=${sig}`)
      }
    })
  }
  const conflicts = [], sameValue = []
  for (const [key, m] of defs) {
    if (m.size < 2) continue
    const [cls] = key.split('|')
    const all = new Set([...m.values()].flatMap((s) => [...s]))
    ;(all.size > 1 ? conflicts : sameValue).push([cls, key, m])
  }

  out(`\n--- ④⑤ 全局裸类重复检查（仅比对「真全局」来源）---`)
  if (conflicts.length) {
    problems += conflicts.length
    out(`  ❌ 冲突 ${conflicts.length} 个（取值不同 → 由打包顺序决定谁生效，必须修）：`)
    for (const [cls, key, m] of conflicts) {
      out(`     .${cls}${key.includes('|@') ? '  [' + key.split('|')[1] + ']' : ''}`)
      for (const [src, sigs] of m) out(`         ${src}  →  ${[...sigs].join(' ; ').slice(0, 110)}`)
    }
  } else out(`  ✅ 无冲突（0 个）`)
  if (sameValue.length) {
    infos.push(`同值重复 ${sameValue.length} 个：${sameValue.map(([c]) => '.' + c).join(', ')}`)
    out(`  ℹ️ 同值重复 ${sameValue.length} 个（无害但脆弱，建议归并到共享样式表）：${sameValue.map(([c]) => '.' + c).join(', ')}`)
  }

  /* ---- ⑥ 全局样式表清单（F3）---- */
  const globals = sources.filter((s) => s.mode === 'GLOBAL_JS' || s.mode === 'GLOBAL_IMPORT').map((s) => s.r)
  const unreferenced = sources.filter((s) => s.mode === 'UNREFERENCED').map((s) => s.r)
  out(`\n--- ⑥ 全局样式表清单（经 JS import / 非 scoped @import → 全站生效）: ${globals.length} 个 ---`)
  out('     建议：模块级全局样式表用**模块前缀类名**，或把页面壳类限定到页面根类（见 AGENTS.md §2.14）')
  for (const g of globals) out(`     · ${g}`)
  if (unreferenced.length) {
    infos.push(`未被引用的样式文件 ${unreferenced.length} 个：${unreferenced.join(', ')}`)
    out(`\n--- ℹ️ 未被任何地方引用的样式文件（不进构建）: ${unreferenced.length} 个 ---`)
    for (const u of unreferenced) out(`     · ${u}`)
  }

  if (!problems && !infos.length) out(`\n  ✅ 未发现问题（体检 ${scanned} 个文件）`)
}

/* ==================== 主流程 ==================== */
if (DIST) checkDist()
else checkSource()

if (infos.length && !DIST) {
  out(`\n--- 提示级（不影响通过）: ${infos.length} 条 ---`)
  for (const i of infos.slice(0, 20)) out(`   ℹ️ ${i}`)
  if (infos.length > 20) out(`   …另 ${infos.length - 20} 条`)
}
if (problems) {
  out(`\n结论：发现 ${problems} 处问题${NO_FAIL ? '（--no-fail：不中断）' : ''}`)
  if (!NO_FAIL) process.exit(1)
} else {
  out('\n结论：通过')
}

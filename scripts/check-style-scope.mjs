#!/usr/bin/env node
/**
 * 样式作用域闸门（发布前后均可跑）——防「子应用样式全局泄漏」这类只在线上显现的问题。
 *
 * 用法：
 *   node scripts/check-style-scope.mjs                # 源码体检（默认；有问题退出码 1）
 *   node scripts/check-style-scope.mjs --dist dist    # 构建产物断言（读 dist/index.html）
 *   node scripts/check-style-scope.mjs --no-fail      # 仅报告，不因问题退出（本地排查用）
 *
 * 检查三类问题：
 *   ① 高危全局选择器（:root / * / html / body / #app / 首段涉及 html·body·#app）出现在非平台基线文件里
 *   ② 门控式目标（SHELL_GATED_TARGETS，如 COC 大屏主题）里未受 gate 门控、又不在 allowGlobal 的规则
 *   ③ 平台框架层类名（PROTECTED_SELECTORS，如 .project-select）被非基线样式**全局重定义**
 *
 * 为什么需要它：本项目是单文件构建，全部 CSS 内联进一个 HTML，任何**未限定作用域**的样式都会
 * 在发布产物里全局生效；而开发服务器按路由懒加载 CSS，本地看不出来 —— 于是「本地好、线上坏」。
 * 2026-10-14 安全态势大屏 V2 曾把 :root{} / html,body,#app{overflow:hidden} / .project-select{}
 * 泄漏到主平台（顶栏变深色底、整页滚动被锁）。本脚本把那套人工排查固化成闸门。
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
let problems = 0

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
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* walk(p)
    else yield* [p]
  }
}

/** 取 .vue 里**非 scoped** 的 <style> 块（scoped 块由 Vue 自动加 [data-v-]，天然隔离） */
function unscopedStyleBlocks(src) {
  const outBlocks = []
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/g
  let m
  while ((m = re.exec(src)) !== null) {
    if (/\bscoped\b/.test(m[1] || '')) continue
    outBlocks.push(m[2])
  }
  return outBlocks
}

function isKeyframeChild(rule) {
  let p = rule.parent
  while (p) {
    if (p.type === 'atrule' && p.name === 'keyframes') return true
    p = p.parent
  }
  return false
}

function checkSource() {
  const baseline = new Set(PLATFORM_BASELINE)
  const targetByFile = new Map(SCOPE_TARGETS.map((t) => [t.file, t]))
  const gatedByFile = new Map(SHELL_GATED_TARGETS.map((t) => [t.file, t]))

  const sources = []
  for (const f of walk(SRC)) {
    const ext = path.extname(f).toLowerCase()
    if (ext === '.css') sources.push({ file: f, css: fs.readFileSync(f, 'utf8') })
    else if (ext === '.vue') {
      const blocks = unscopedStyleBlocks(fs.readFileSync(f, 'utf8'))
      if (blocks.length) sources.push({ file: f, css: blocks.join('\n') })
    }
  }

  out(`=== 源码体检：扫描 ${sources.length} 个样式来源 ===`)
  out(`    （平台基线 ${PLATFORM_BASELINE.length} 个跳过；自动作用域目标 ${SCOPE_TARGETS.length} 个；门控式目标 ${SHELL_GATED_TARGETS.length} 个；受保护类名 ${PROTECTED_SELECTORS.length} 个）`)

  let scanned = 0
  for (const { file: f, css } of sources) {
    const r = rel(f)
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
          problems += 1
          out(`  ❌ ${r}:${line}  [高危全局] 「${part}」`
            + (target ? `（该文件应作用于 ${rootSel}）` : '（未登记为平台基线）'))
          continue
        }

        // ② 门控式目标：非 allowGlobal 的规则必须受 gate 门控（gate 可为多个前缀）
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
  if (!problems) out(`  ✅ 未发现未登记的高危全局选择器 / 未门控规则 / 受保护类名重定义（体检 ${scanned} 个文件）`)
}

/* ==================== 主流程 ==================== */
if (DIST) checkDist()
else checkSource()

if (problems) {
  out(`\n结论：发现 ${problems} 处问题${NO_FAIL ? '（--no-fail：不中断）' : ''}`)
  if (!NO_FAIL) process.exit(1)
} else {
  out('\n结论：通过')
}

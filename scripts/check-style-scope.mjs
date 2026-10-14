#!/usr/bin/env node
/**
 * 样式作用域闸门（发布前后均可跑）——防「子应用样式全局泄漏」这类只在线上显现的问题。
 *
 * 用法：
 *   node scripts/check-style-scope.mjs                # 源码体检（默认；有问题退出码 1）
 *   node scripts/check-style-scope.mjs --dist dist    # 构建产物断言（读 dist/index.html）
 *   node scripts/check-style-scope.mjs --no-fail      # 仅报告，不因问题退出（本地排查用）
 *
 * 为什么需要它：本项目是单文件构建，全部 CSS 内联进一个 HTML，因此任何**未限定作用域**的
 * 样式都会在发布产物里全局生效；而开发服务器按路由懒加载 CSS，本地看不出来 —— 于是
 * 「本地好、线上坏」。2026-10-14 安全态势大屏 V2 曾把 :root{} / html,body,#app{overflow:hidden} /
 * .project-select{} 泄漏到主平台（顶栏变深色底、整页滚动被锁）。本脚本把那套人工排查固化成闸门。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import {
  SCOPE_TARGETS, PLATFORM_BASELINE, HIGH_RISK_GLOBAL, UNPREFIXABLE_ROOT, DIST_SIGNATURES,
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
    // 正则加 g 时需要重置 lastIndex，这里统一不带 g 使用
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

  const sources = []
  for (const f of walk(SRC)) {
    const ext = path.extname(f).toLowerCase()
    if (ext === '.css') sources.push({ file: f, css: fs.readFileSync(f, 'utf8') })
    else if (ext === '.vue') {
      const blocks = unscopedStyleBlocks(fs.readFileSync(f, 'utf8'))
      if (blocks.length) sources.push({ file: f, css: blocks.join('\n') })
    }
  }

  out(`=== 源码体检：扫描 ${sources.length} 个样式来源（平台基线 ${PLATFORM_BASELINE.length} 个已登记跳过）===`)
  let scanned = 0
  for (const { file: f, css } of sources) {
    const r = rel(f)
    if (baseline.has(r)) continue
    scanned += 1
    const target = targetByFile.get(r)
    const allow = new Set((target?.allowGlobal || []).map(norm))
    const rootSel = target?.root

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
        const first = part.split(/[\s>+~]/)[0]
        const isHigh = HIGH_RISK_GLOBAL.includes(part)
          || HIGH_RISK_GLOBAL.includes(first)
          || UNPREFIXABLE_ROOT.test(part)
        if (!isHigh) continue
        if (allow.has(part)) continue                                  // 已登记的刻意全局
        if (rootSel && first.includes(rootSel)) continue                // 已作用域（含屏根复合）
        problems += 1
        out(`  ❌ ${r}:${line}  高危全局选择器「${part}」`
          + (target ? `（该文件应作用于 ${rootSel}）` : '（未登记为平台基线）'))
      }
    })
  }
  if (!problems) out(`  ✅ 未发现未登记的高危全局选择器（体检 ${scanned} 个文件）`)
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

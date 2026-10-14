import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import scopeSubAppStyles from './scripts/postcss-scope-screens.mjs'

// GitHub Pages 项目站需要子路径；本地 / Vercel 仍用根路径
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  css: {
    postcss: {
      // 构建期自动把子应用样式表收敛到各自的根类（目标见 scripts/css-scope.config.mjs）。
      // 原因：单文件构建会把全部 CSS 内联，未限定作用域的样式会污染整站；而 dev 按路由懒加载
      // 所以本地看不出来。此插件让「新增选择器不会再泄漏」不再依赖人工纪律。
      plugins: [scopeSubAppStyles()],
    },
  },
  plugins: [
    vue(),
    // 单文件 HTML 模式：将所有 JS/CSS 内联进 HTML
    viteSingleFile()
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    // 置 false：DSH 沙箱禁 spawn，open: true 会在每次启动时多报一次无害的 spawn EPERM
    open: false,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  },
  preview: {
    host: true,
    port: 4173,
    open: false,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  },
  build: {
    // 单文件模式关键配置：禁用代码分割，强制内联
    assetsInlineLimit: 100000000, // 100MB，几乎所有资源都内联
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // 强制内联，不生成独立 JS 文件
        // 注：单文件模式下 codeSplitting 恒为 false，不能再声明 manualChunks
        // （rolldown/vite 8 会直接报 Invalid configuration 并中断构建）
        inlineDynamicImports: true,
      },
    },
  },
})

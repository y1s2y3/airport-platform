import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import platformConfig from './vite.config.js'

/** 打包为单文件 HTML，可直接用浏览器打开（file://） */
export default defineConfig({
  ...platformConfig,
  base: './',
  build: {
    ...platformConfig.build,
    outDir: process.env.STANDALONE_OUT_DIR || 'release',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      ...platformConfig.build.rollupOptions,
      input: resolve(import.meta.dirname, 'index.html'),
    },
  },
})

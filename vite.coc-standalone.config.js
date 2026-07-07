import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'node:path'

const cocBoot = process.env.COC_BOOT || '{}'

/** 打包 COC 调度大屏为单文件 HTML，可直接用浏览器打开（file://） */
export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile()],
  define: {
    __COC_BOOT__: cocBoot,
  },
  build: {
    outDir: process.env.STANDALONE_OUT_DIR || 'release',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'coc.html'),
    },
  },
})

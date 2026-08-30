import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'node:path'

/** 打包建管 APP 为单文件 HTML，可直接用浏览器打开（file://） */
export default defineConfig({
  base: './',
  plugins: [vue(), viteSingleFile()],
  build: {
    outDir: process.env.STANDALONE_OUT_DIR || 'release',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 8000,
    rollupOptions: {
      input: resolve(import.meta.dirname, 'app.html'),
    },
  },
})

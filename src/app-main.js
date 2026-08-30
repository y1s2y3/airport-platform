/**
 * 建管 APP 独立入口（单文件 HTML 打包用）
 * 仅挂载 /app/* 路由，不包含 Web 后台与 COC 大屏。
 */
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import App from './App.vue'
import router from './router/appRouter.js'

createApp(App).use(ElementPlus, { locale: zhCn }).use(router).mount('#app')

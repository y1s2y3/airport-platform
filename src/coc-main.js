import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import CocScreenView from './views/CocScreenView.vue'

createApp(CocScreenView).use(ElementPlus, { locale: zhCn }).mount('#app')

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import './styles/theme.css'
import './styles/module-page-shell.css'
import App from './App.vue'
import router from './router'
import { ensureDispatchDemoData } from './coc/utils/dispatchMeetingStorage.js'
import { ensureStorageRoom } from './utils/storagePressure.js'

createApp(App).use(ElementPlus, { locale: zhCn }).use(router).mount('#app')

// 演示数据预热（任务单待办/多人并行/提示函多人）：账号水合可能晚于首帧，按次数重试直到生成
let demoSeedAttempts = 0
const warmupDemoData = () => {
  // 先确保本地存储有空间：演示数据体量大，配额占满时种子写入会失败（任务单待办不出现）
  ensureStorageRoom()
  ensureDispatchDemoData()
  demoSeedAttempts += 1
  if (demoSeedAttempts < 8) setTimeout(warmupDemoData, 600)
}
warmupDemoData()

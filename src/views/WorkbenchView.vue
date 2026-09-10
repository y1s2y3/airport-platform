<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Notebook,
  DocumentChecked,
  Warning,
  DataAnalysis,
  Medal,
  Box,
  User,
  Bell,
  VideoCamera,
  Connection,
  WarnTriangleFilled,
} from '@element-plus/icons-vue'
import { useCurrentProject } from '../composables/useCurrentProject'
import { listWorkbenchShortcuts } from '../mock/workbenchShortcuts.js'
import PersonalCenterPanels from './personalCenter/PersonalCenterPanels.vue'

const router = useRouter()
const { isHqSelected } = useCurrentProject()

const shortcutIconMap = {
  Notebook,
  DocumentChecked,
  Warning,
  DataAnalysis,
  Medal,
  Box,
  User,
  Bell,
  VideoCamera,
  Connection,
  WarnTriangleFilled,
}

const shortcuts = computed(() => listWorkbenchShortcuts(isHqSelected.value))

function openShortcut(item) {
  if (!item?.path) return
  router.push(item.path)
}
</script>

<template>
  <div class="workbench-page">
    <section class="shortcut-panel">
      <div class="shortcut-head">
        <h2 class="shortcut-title">常用功能</h2>
        <span class="shortcut-tip">点击进入对应菜单</span>
      </div>
      <div class="shortcut-row">
        <button
          v-for="item in shortcuts"
          :key="item.key"
          type="button"
          class="shortcut-item"
          @click="openShortcut(item)"
        >
          <span
            class="shortcut-icon"
            :style="{ background: item.iconBg, color: item.iconColor }"
          >
            <el-icon :size="22">
              <component :is="shortcutIconMap[item.icon]" />
            </el-icon>
          </span>
          <span class="shortcut-label">{{ item.label }}</span>
        </button>
      </div>
    </section>

    <section class="pc-embed">
      <PersonalCenterPanels :show-title="false" base-path="/workbench" />
    </section>
  </div>
</template>

<style scoped>
.workbench-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shortcut-panel {
  background: #fff;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 8px;
  padding: 16px 18px 18px;
}

.shortcut-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 14px;
}

.shortcut-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text, #303133);
}

.shortcut-tip {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}

.shortcut-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 96px;
  padding: 10px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.shortcut-item:hover {
  background: #fafafa;
  border-color: var(--ap-border, #ebeef5);
}

.shortcut-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcut-label {
  font-size: 13px;
  color: var(--ap-text, #303133);
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

.pc-embed {
  min-width: 0;
}

@media (max-width: 768px) {
  .shortcut-item {
    width: 80px;
  }
}
</style>

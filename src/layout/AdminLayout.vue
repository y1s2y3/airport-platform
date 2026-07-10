<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Monitor,
  DataBoard,
  Warning,
  Medal,
  Box,
  User,
  FolderOpened,
  Setting,
  ArrowDown,
  SwitchButton,
  Fold,
  Expand,
  Connection,
  Notebook,
  Collection,
  VideoCamera,
  Van,
  OfficeBuilding,
} from '@element-plus/icons-vue'
import { sidebarMenu } from '../config/menu'
import {
  HQ_PROJECT_OPTION,
  COC_PROJECT_OPTIONS,
} from '../config/projectOptions'
import { selectedProjectId } from '../composables/useCurrentProject'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const expandedKeys = ref([])

const projectOptions = COC_PROJECT_OPTIONS

const iconMap = {
  Monitor,
  DataBoard,
  Warning,
  Medal,
  Box,
  User,
  FolderOpened,
  Setting,
  Connection,
  Notebook,
  Collection,
  VideoCamera,
  Van,
  OfficeBuilding,
}

const activeMenu = computed(() => route.meta.sidebarKey || 'workbench')
const openTabs = ref([
  { key: 'workbench', label: '首页', path: '/workbench' },
])
const activeTab = computed(() => route.meta.tabKey || 'workbench')

const cocScreenHref = computed(() => {
  const { href } = router.resolve({ name: 'CocScreen' })
  if (/^https?:\/\//i.test(href)) return href
  return `${window.location.origin}${window.location.pathname}${href}`
})

function isGroupActive(item) {
  if (item.path && route.path === item.path) return true
  return item.children?.some((child) => isGroupActive(child)) ?? false
}

function isChildActive(child) {
  if (child.path) return route.path === child.path
  return child.children?.some((item) => isChildActive(item)) ?? false
}

function ensureExpandedForRoute() {
  for (const group of sidebarMenu) {
    if (!group.children?.length) continue
    if (isGroupActive(group) && !expandedKeys.value.includes(group.key)) {
      expandedKeys.value.push(group.key)
    }
    for (const child of group.children) {
      if (child.children?.length && isGroupActive(child) && !expandedKeys.value.includes(child.key)) {
        expandedKeys.value.push(child.key)
      }
    }
  }
}

watch(
  () => route.fullPath,
  () => {
    ensureExpandedForRoute()
    const key = route.meta?.tabKey || route.name || route.path
    const label = route.meta?.title || '页面'
    const path = route.path
    const existing = openTabs.value.find((t) => t.key === key)
    if (existing) {
      existing.label = label
      existing.path = path
    } else {
      openTabs.value.push({ key, label, path })
    }
  },
  { immediate: true },
)

function toggleGroup(key) {
  if (expandedKeys.value.includes(key)) {
    expandedKeys.value = expandedKeys.value.filter((k) => k !== key)
  } else {
    expandedKeys.value.push(key)
  }
}

function navigate(path) {
  router.push(path)
}

function closeTab(tab, e) {
  e.stopPropagation()
  openTabs.value = openTabs.value.filter((t) => t.key !== tab.key)
  if (activeTab.value === tab.key && openTabs.value.length) {
    router.push(openTabs.value[openTabs.value.length - 1].path)
  }
}
</script>

<template>
  <div class="admin-shell">
    <header class="top-header">
      <div class="header-brand">
        <div class="brand-logo" aria-hidden="true">
          <svg viewBox="0 0 36 36" width="32" height="32">
            <circle cx="18" cy="18" r="17" fill="#8f0045" />
            <path d="M10 24 L18 11 L26 24 Z" fill="none" stroke="#fff" stroke-width="1.8" />
            <line x1="12" y1="24" x2="24" y2="24" stroke="#fff" stroke-width="1.8" />
          </svg>
        </div>
        <span class="brand-title">智慧工程建设管控一体化平台</span>
        <el-select
          v-model="selectedProjectId"
          class="project-select"
          popper-class="project-select-dropdown"
          size="default"
          filterable
          placeholder="选择项目"
        >
          <el-option :label="HQ_PROJECT_OPTION.label" :value="HQ_PROJECT_OPTION.id">
            <div class="project-option">
              <span class="project-option-label">{{ HQ_PROJECT_OPTION.label }}</span>
            </div>
          </el-option>
          <el-option-group label="项目">
            <el-option
              v-for="item in projectOptions"
              :key="item.id"
              :label="item.label"
              :value="item.id"
            >
              <div class="project-option">
                <span class="project-option-label">{{ item.label }}</span>
                <span class="project-option-full">{{ item.fullName }}</span>
              </div>
            </el-option>
          </el-option-group>
        </el-select>
      </div>

      <div class="header-actions">
        <a
          class="screen-btn"
          :href="cocScreenHref"
          target="_blank"
          rel="noopener noreferrer"
        >
          COC调度大屏
        </a>
        <div class="user-block">
          <el-avatar :size="32" class="user-avatar">调</el-avatar>
          <span class="user-name">COC调度室</span>
          <el-icon :size="12" color="#8f959e"><ArrowDown /></el-icon>
        </div>
        <button type="button" class="logout-btn">
          <el-icon :size="16"><SwitchButton /></el-icon>
          <span>退出</span>
        </button>
      </div>
    </header>

    <div class="admin-body">
      <aside class="sidebar" :class="{ collapsed }">
        <nav class="sidebar-nav">
          <template v-for="item in sidebarMenu" :key="item.key">
            <div v-if="item.children" class="menu-group">
              <button
                type="button"
                class="menu-item group-title"
                :class="{ active: isGroupActive(item) }"
                @click="toggleGroup(item.key)"
              >
                <el-icon :size="16"><component :is="iconMap[item.icon]" /></el-icon>
                <span v-if="!collapsed">{{ item.label }}</span>
                <span v-if="!collapsed" class="expand-arrow">{{ expandedKeys.includes(item.key) ? '▾' : '▸' }}</span>
              </button>
              <div v-if="expandedKeys.includes(item.key) && !collapsed" class="sub-menu">
                <template v-for="child in item.children" :key="child.key">
                  <div v-if="child.children?.length" class="sub-group">
                    <button
                      type="button"
                      class="menu-item sub-item sub-group-title"
                      :class="{ active: isChildActive(child) }"
                      @click="toggleGroup(child.key)"
                    >
                      <span>{{ child.label }}</span>
                      <span class="expand-arrow">{{ expandedKeys.includes(child.key) ? '▾' : '▸' }}</span>
                    </button>
                    <div v-if="expandedKeys.includes(child.key)" class="sub-menu nested">
                      <button
                        v-for="leaf in child.children"
                        :key="leaf.key"
                        type="button"
                        class="menu-item sub-item nested-item"
                        :class="{ active: isChildActive(leaf) }"
                        @click="navigate(leaf.path)"
                      >
                        <span>{{ leaf.label }}</span>
                        <span v-if="leaf.badge" class="menu-badge" />
                      </button>
                    </div>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="menu-item sub-item"
                    :class="{ active: isChildActive(child) }"
                    @click="navigate(child.path)"
                  >
                    <span>{{ child.label }}</span>
                    <span v-if="child.badge" class="menu-badge" />
                  </button>
                </template>
              </div>
            </div>
            <button
              v-else
              type="button"
              class="menu-item"
              :class="{ active: activeMenu === item.key }"
              @click="navigate(item.path)"
            >
              <el-icon :size="16"><component :is="iconMap[item.icon]" /></el-icon>
              <span v-if="!collapsed">{{ item.label }}</span>
            </button>
          </template>
        </nav>

        <button type="button" class="collapse-btn" @click="collapsed = !collapsed">
          <el-icon :size="14"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          <span v-if="!collapsed">收起菜单</span>
        </button>
      </aside>

      <main class="main-content">
        <div class="page-tabs">
          <button
            v-for="tab in openTabs"
            :key="tab.key"
            type="button"
            class="page-tab"
            :class="{ active: activeTab === tab.key }"
            @click="navigate(tab.path)"
          >
            {{ tab.label }}
            <span class="tab-close" @click="closeTab(tab, $event)">×</span>
          </button>
        </div>
        <div class="page-viewport">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--ap-bg);
}

.top-header {
  height: var(--ap-header-h);
  background: #fff;
  border-bottom: 1px solid var(--ap-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 20px;
  flex-shrink: 0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ap-text);
  white-space: nowrap;
  flex-shrink: 0;
}

.project-select {
  width: 240px;
  flex-shrink: 0;
}

.project-select :deep(.el-select__wrapper) {
  justify-content: flex-start;
  text-align: left;
}

.project-select :deep(.el-select__selected-item),
.project-select :deep(.el-select__placeholder) {
  text-align: left;
  justify-content: flex-start;
}

.project-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  line-height: 1.5;
  padding: 4px 0;
  text-align: left;
}

.project-option-label {
  font-size: 14px;
  color: var(--ap-text);
}

.project-option-full {
  font-size: 12px;
  color: var(--ap-text-muted);
  white-space: normal;
  word-break: break-all;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  margin-left: auto;
}

.screen-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  border: 1px solid var(--ap-primary);
  border-radius: 6px;
  background: #fff;
  color: var(--ap-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}

.screen-btn:hover {
  background: var(--ap-primary);
  color: #fff;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-avatar {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-size: 13px;
}

.user-name {
  font-size: 14px;
  color: var(--ap-text);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--ap-text-secondary);
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
}

.logout-btn:hover {
  color: var(--ap-primary);
  background: var(--ap-primary-muted);
}

.admin-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar {
  width: var(--ap-sidebar-w);
  background: #fff;
  border-right: 1px solid var(--ap-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.2s;
}

.sidebar.collapsed {
  width: 56px;
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: none;
  background: none;
  padding: 11px 16px;
  font-size: 14px;
  color: var(--ap-text-secondary);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.menu-item:hover {
  color: var(--ap-primary);
  background: var(--ap-primary-muted);
}

.menu-item.active {
  color: #fff;
  background: var(--ap-primary);
  font-weight: 500;
}

.group-title {
  justify-content: flex-start;
}

.expand-arrow {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.7;
}

.sub-menu {
  padding: 2px 0 4px;
}

.sub-item {
  padding-left: 42px;
  font-size: 13px;
}

.sub-group-title {
  justify-content: flex-start;
}

.sub-menu.nested {
  padding: 0;
}

.nested-item {
  padding-left: 56px;
  font-size: 13px;
}

.sub-item.active {
  color: var(--ap-primary);
  background: var(--ap-primary-light);
  font-weight: 600;
}

.menu-badge {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ap-danger);
  margin-left: auto;
}

.collapse-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  color: var(--ap-text-muted);
  cursor: pointer;
  font-size: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--ap-border);
}

.collapse-btn:hover {
  color: var(--ap-primary);
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 16px 0;
  background: var(--ap-bg);
  flex-shrink: 0;
}

.page-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ap-border);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: #eef0f3;
  color: var(--ap-text-secondary);
  font-size: 13px;
  padding: 8px 14px;
  cursor: pointer;
}

.page-tab.active {
  background: #fff;
  color: var(--ap-primary);
  font-weight: 600;
  border-color: var(--ap-border);
}

.tab-close {
  font-size: 14px;
  opacity: 0.5;
  line-height: 1;
}

.tab-close:hover {
  opacity: 1;
}

.page-viewport {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: var(--ap-bg);
}
</style>

<style>
.project-select-dropdown .el-select-dropdown__item {
  height: auto;
  min-height: 52px;
  padding: 12px 20px;
  line-height: 1.5;
}

.project-select-dropdown .el-select-group__title {
  padding: 12px 20px 8px;
  font-size: 13px;
}

.project-select-dropdown .project-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
  text-align: left;
}

.project-select-dropdown .project-option-label {
  font-size: 14px;
  color: var(--ap-text, #303133);
}

.project-select-dropdown .project-option-full {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
  white-space: normal;
  word-break: break-all;
}
</style>

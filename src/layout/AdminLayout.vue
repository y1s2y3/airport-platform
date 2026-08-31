<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, SwitchButton, Fold, Expand } from '@element-plus/icons-vue'
import {
  menuTree,
  filterMenuByLevel,
  resolveMenuTree,
  flattenMenuLeaves,
  getMenuPathByKey,
  getMenuLabelByPath,
} from '../config/menu'
import {
  HQ_PROJECT_OPTION,
  buildCocProjectOptions,
} from '../config/projectOptions'
import { projectList } from '../mock/projectBasicInfo'
import { selectedProjectId, useCurrentProject } from '../composables/useCurrentProject'
import { TRACK_EXTERNAL_MENU_KEYS, openTrackExternalByMenuKey } from '../utils/trackExternalJump'
import { SAMPLE_APPROVE_MENU_KEYS } from '../utils/sampleHiddenMenuKeys.js'
import {
  APP_VERSION,
  getChangelogByVersion,
  getPublishedChangelogs,
} from '../config/appVersion'
import { resolveHqEnterPath, resolveHqLeavePath } from '../router/hqLevelPathRedirect'
import SidebarMenuNode from './SidebarMenuNode.vue'

const route = useRoute()
const router = useRouter()
const { isHqSelected } = useCurrentProject()

const changelogVisible = ref(false)
const changelogHistoryVisible = ref(false)
const changelog = computed(() => getChangelogByVersion(APP_VERSION))
const publishedChangelogs = computed(() => getPublishedChangelogs())
const collapsed = ref(false)

const projectOptions = computed(() => {
  // 依赖 projectList 以响应列表 hidden 开关
  void projectList.length
  void projectList.map((item) => item.hidden)
  return buildCocProjectOptions()
})

watch(
  projectOptions,
  (options) => {
    if (selectedProjectId.value === HQ_PROJECT_OPTION.id) return
    if (options.some((item) => item.id === selectedProjectId.value)) return
    selectedProjectId.value = HQ_PROJECT_OPTION.id
  },
  { deep: true },
)

/** 当前层级：指挥部 / 项目 */
const currentLevel = computed(() => (isHqSelected.value ? 'hq' : 'project'))

/** 侧栏可见菜单 = 按层级过滤 → 排序 → 名称覆盖 → 剔除已迁个人中心的样板审批入口 */
const visibleSidebarMenu = computed(() => {
  const stripApprove = (items = []) =>
    items
      .filter((item) => !SAMPLE_APPROVE_MENU_KEYS.has(item.key))
      .map((item) =>
        item.children?.length ? { ...item, children: stripApprove(item.children) } : item,
      )
      .filter((item) => !item.children || item.children.length > 0)
  const scoped = filterMenuByLevel(menuTree, currentLevel.value)
  return stripApprove(resolveMenuTree(scoped, currentLevel.value))
})

/** 高亮：把 route.meta.sidebarKey 解析成父菜单 path，兜底 route.path */
const activePath = computed(
  () => getMenuPathByKey(route.meta.sidebarKey, currentLevel.value) || route.path,
)

/** 菜单点击：外链 / 新标签 / 路由跳转 */
const leafByPath = new Map(flattenMenuLeaves(menuTree).map((leaf) => [leaf.path, leaf]))

function onMenuSelect(path) {
  const item = leafByPath.get(path)
  const menuKey = item?.key || ''
  if (menuKey && TRACK_EXTERNAL_MENU_KEYS.has(menuKey)) {
    openTrackExternalByMenuKey(menuKey)
    return
  }
  if (item?.openInNewTab) {
    const href = router.resolve({ path }).href
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  if (path) router.push(path)
}

/* ---------- 标签页 ---------- */
const openTabs = ref([{ key: 'workbench', label: '工作台', path: '/workbench' }])
const activeTab = computed(() => route.meta.tabKey || 'workbench')

function resolveCurrentTabLabel() {
  const label = getMenuLabelByPath(route.path, currentLevel.value)
  return label || route.meta?.title || '页面'
}

watch(
  () => route.fullPath,
  () => {
    const key = route.meta?.tabKey || route.name || route.path
    const label = resolveCurrentTabLabel()
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

function closeTab(tab, e) {
  e.stopPropagation()
  openTabs.value = openTabs.value.filter((t) => t.key !== tab.key)
  if (activeTab.value === tab.key && openTabs.value.length) {
    router.push(openTabs.value[openTabs.value.length - 1].path)
  }
}

/* ---------- 切换层级：关闭对面层级专属页 ---------- */
function collectLevelPaths(level) {
  const paths = []
  const walk = (items = []) =>
    items.forEach((item) => {
      if (item.path && item.levels === level) paths.push(item.path)
      if (item.children?.length) walk(item.children)
    })
  walk(menuTree)
  return paths
}

/** 离开指挥部专属页时，尽量落到对应项目能力页 */
const HQ_LEAVE_REDIRECT = {
  '/labor/realname-stats': '/labor/realname',
  '/labor/track-system': '/labor/personnel-track',
  '/vehicle/track-system': '/vehicle/track',
  '/labor/warning-config': '/labor/warning-list',
  '/labor/blacklist': '/labor/warning-list',
  '/vehicle/track-config': '/vehicle/dashboard',
  '/video-monitor/stats': '/video-monitor/preview',
  '/safety-inspection/dashboard': '/mobile/tasks',
  '/safety-inspection/plan': '/mobile/tasks',
  '/safety-inspection/check-items': '/mobile/tasks',
  '/qm/quality-board/brand-stats': '/qm/brand/ledger',
  '/safety-board': '/workbench',
}

watch(isHqSelected, (hq) => {
  const restricted = collectLevelPaths(hq ? 'project' : 'hq')
  const onRestricted = restricted.some(
    (p) => route.path === p || route.path.startsWith(`${p}/`),
  )
  if (!onRestricted) return
  openTabs.value = openTabs.value.filter(
    (tab) => !restricted.some((p) => tab.path === p || tab.path.startsWith(`${p}/`)),
  )
  let target = '/workbench'
  if (hq) {
    target = resolveHqEnterPath(route.path) || '/workbench'
  } else {
    const hqPairTarget = resolveHqLeavePath(route.path)
    if (hqPairTarget) {
      target = hqPairTarget
    } else {
      const hit = Object.entries(HQ_LEAVE_REDIRECT).find(
        ([p]) => route.path === p || route.path.startsWith(`${p}/`),
      )
      target = hit?.[1] || '/workbench'
    }
  }
  router.push(target)
})

/* ---------- 顶栏 ---------- */
function resolveScreenHref(routeName, fallbackPath, query = {}) {
  const { href, fullPath } = router.resolve({ name: routeName, query })
  if (/^https?:\/\//i.test(href)) return href
  const hash = href.startsWith('#')
    ? href
    : `#${fullPath.startsWith('/') ? fullPath : `/${fullPath || fallbackPath}`}`
  const path = window.location.pathname || '/'
  return `${window.location.origin}${path}${hash.startsWith('#') ? hash : `#${hash}`}`
}

const cocScreenHref = computed(() => resolveScreenHref('CocScreen', 'coc'))
const safetyScreenHref = computed(() => resolveScreenHref(
  'SafetySituationScreen',
  'safety-situation-screen',
  { projectId: selectedProjectId.value || HQ_PROJECT_OPTION.id },
))

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确认退出当前演示账号？', '退出登录', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  ElMessage.success('已退出')
  selectedProjectId.value = HQ_PROJECT_OPTION.id
  openTabs.value = [{ key: 'workbench', label: '工作台', path: '/workbench' }]
  router.push('/workbench')
}

function skipToMain(e) {
  e?.preventDefault?.()
  const el = document.getElementById('main-content')
  if (!el) return
  el.focus({ preventScroll: false })
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div class="admin-shell">
    <a class="skip-link" href="#main-content" @click="skipToMain">跳到主内容</a>

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
        <span class="brand-version">
          <span class="brand-version-text">{{ APP_VERSION }}</span>
          <button
            type="button"
            class="brand-version-help"
            title="查看本版更新说明"
            aria-label="查看本版更新说明"
            @click="changelogVisible = true"
          >?</button>
        </span>
        <el-select
          v-model="selectedProjectId"
          class="project-select"
          popper-class="project-select-dropdown"
          size="default"
          filterable
          placeholder="选择项目"
          aria-label="选择项目"
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
          title="打开 COC 调度大屏"
          aria-label="打开 COC 调度大屏"
        >
          COC调度大屏
        </a>
        <a
          class="screen-btn safety-screen-btn"
          :href="safetyScreenHref"
          target="_blank"
          rel="noopener noreferrer"
          title="打开安全态势大屏"
          aria-label="打开安全态势大屏"
        >
          安全态势大屏
        </a>
        <div class="user-block">
          <el-avatar :size="32" class="user-avatar">调</el-avatar>
          <span class="user-name">COC调度室</span>
          <el-icon :size="12" color="#8f959e"><ArrowDown /></el-icon>
        </div>
        <button type="button" class="logout-btn" aria-label="退出登录" @click="handleLogout">
          <el-icon :size="16"><SwitchButton /></el-icon>
          <span>退出</span>
        </button>
      </div>
    </header>

    <el-dialog
      v-model="changelogVisible"
      :title="`${changelog?.version || APP_VERSION} 更新说明`"
      width="460px"
      append-to-body
      destroy-on-close
    >
      <p v-if="changelog" class="changelog-meta">
        发布日期：{{ changelog.date }}
        <template v-if="changelog.version !== APP_VERSION">
          （当前页头为 {{ APP_VERSION }}，展示最近一版说明）
        </template>
      </p>
      <ul v-if="changelog?.highlights?.length" class="changelog-list">
        <li v-for="(item, idx) in changelog.highlights" :key="idx">{{ item }}</li>
      </ul>
      <p v-else class="changelog-empty">暂无更新说明</p>
      <template #footer>
        <div class="changelog-footer">
          <el-button @click="changelogHistoryVisible = true">更新日志</el-button>
          <el-button type="primary" @click="changelogVisible = false">知道了</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-model="changelogHistoryVisible"
      title="更新日志"
      width="520px"
      append-to-body
      destroy-on-close
      class="changelog-history-dialog"
    >
      <p class="changelog-history-tip">仅展示已发布到线上的版本记录</p>
      <div v-if="publishedChangelogs.length" class="changelog-history-list">
        <section
          v-for="entry in publishedChangelogs"
          :key="entry.version"
          class="changelog-history-item"
        >
          <header class="changelog-history-head">
            <span class="changelog-history-version">{{ entry.version }}</span>
            <span class="changelog-history-date">{{ entry.date }}</span>
          </header>
          <ul v-if="entry.highlights?.length" class="changelog-list">
            <li v-for="(item, idx) in entry.highlights" :key="idx">{{ item }}</li>
          </ul>
          <p v-else class="changelog-empty">暂无更新说明</p>
        </section>
      </div>
      <p v-else class="changelog-empty">暂无已发布的更新记录</p>
    </el-dialog>

    <div class="admin-body">
      <aside class="sidebar" :class="{ collapsed }">
        <el-menu
          class="sidebar-menu"
          :default-active="activePath"
          :collapse="collapsed"
          :collapse-transition="false"
          @select="onMenuSelect"
        >
          <SidebarMenuNode
            v-for="item in visibleSidebarMenu"
            :key="item.key"
            :item="item"
            :level="0"
            @select="onMenuSelect"
          />
        </el-menu>

        <button
          type="button"
          class="collapse-btn"
          :aria-label="collapsed ? '展开菜单' : '收起菜单'"
          @click="collapsed = !collapsed"
        >
          <el-icon :size="14"><Fold v-if="!collapsed" /><Expand v-else /></el-icon>
          <span v-if="!collapsed">收起菜单</span>
        </button>
      </aside>

      <main id="main-content" class="main-content" tabindex="-1">
        <div class="page-tabs" role="tablist" aria-label="已打开页面">
          <button
            v-for="tab in openTabs"
            :key="tab.key"
            type="button"
            class="page-tab"
            role="tab"
            :aria-selected="activeTab === tab.key"
            :class="{ active: activeTab === tab.key }"
            @click="router.push(tab.path)"
          >
            {{ tab.label }}
            <span
              class="tab-close"
              role="button"
              tabindex="0"
              :aria-label="`关闭标签 ${tab.label}`"
              @click="closeTab(tab, $event)"
              @keydown.enter.prevent="closeTab(tab, $event)"
            >×</span>
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
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--ap-bg);
}

.skip-link {
  position: absolute;
  left: 12px;
  top: 0;
  z-index: 10000;
  padding: 8px 14px;
  border-radius: 0 0 6px 6px;
  background: var(--ap-primary, #8f0045);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transform: translateY(-120%);
  transition: transform 0.15s ease;
}

.skip-link:focus {
  transform: translateY(0);
  outline: 2px solid #fff;
  outline-offset: 2px;
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

.brand-version {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: -4px;
}

.brand-version-text {
  font-size: 13px;
  font-weight: 600;
  color: #8f0045;
  letter-spacing: 0.02em;
}

.brand-version-help {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #c9cdd4;
  background: #fff;
  color: #646a73;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.brand-version-help:hover {
  border-color: #8f0045;
  color: #8f0045;
}

.changelog-meta {
  margin: 0 0 12px;
  font-size: 13px;
  color: #8f959e;
}

.changelog-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  line-height: 1.55;
  color: #1f2329;
}

.changelog-empty {
  margin: 0;
  color: #8f959e;
  font-size: 14px;
}

.changelog-footer {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.changelog-history-tip {
  margin: 0 0 14px;
  font-size: 13px;
  color: #8f959e;
}

.changelog-history-list {
  max-height: min(60vh, 480px);
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 4px;
}

.changelog-history-item {
  padding-bottom: 16px;
  border-bottom: 1px solid #eef0f3;
}

.changelog-history-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.changelog-history-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.changelog-history-version {
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
}

.changelog-history-date {
  font-size: 13px;
  color: #8f959e;
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

.safety-screen-btn {
  border-color: #0d7377;
  color: #0d7377;
}

.safety-screen-btn:hover {
  background: #0d7377;
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
  width: 64px;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
}

/* el-menu 主题覆写：对齐深酒红规范 */
.sidebar-menu :deep(.el-menu-item),
.sidebar-menu :deep(.el-sub-menu__title) {
  color: var(--ap-text-secondary);
}

.sidebar-menu :deep(.el-menu-item:hover),
.sidebar-menu :deep(.el-sub-menu__title:hover) {
  color: var(--ap-primary);
  background: var(--ap-primary-muted);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: var(--ap-primary);
  font-weight: 500;
}

.sidebar-menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: var(--ap-primary);
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

.main-content:focus {
  outline: none;
}

.main-content:focus-visible {
  outline: 2px solid var(--ap-primary, #8f0045);
  outline-offset: -2px;
}

.page-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 2px;
  padding: 8px 16px 0;
  background: var(--ap-bg);
  flex-shrink: 0;
  overflow-x: auto;
  min-width: 0;
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
  flex-shrink: 0;
  white-space: nowrap;
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

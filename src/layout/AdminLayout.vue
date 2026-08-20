<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  SetUp,
  Document,
  Bell,
  Goods,
  PictureFilled,
  DocumentChecked,
  WarnTriangleFilled,
  DataAnalysis,
  Cpu,
  MapLocation,
} from '@element-plus/icons-vue'
import { sidebarMenu } from '../config/menu'
import {
  HQ_PROJECT_OPTION,
  COC_PROJECT_OPTIONS,
} from '../config/projectOptions'
import { selectedProjectId, useCurrentProject } from '../composables/useCurrentProject'
import { TRACK_EXTERNAL_MENU_KEYS, openTrackExternalByMenuKey } from '../utils/trackExternalJump'
import {
  MENU_SCOPE_HQ,
  MENU_SCOPE_PROJECT,
  filterMenuByScope,
  isHqOnlyMenuKey,
  isProjectOnlyMenuKey,
} from '../utils/menuPermissionTree'
import {
  SAMPLE_APPROVE_MENU_KEYS,
} from '../utils/sampleDemoRole.js'
import {
  APP_VERSION,
  getChangelogByVersion,
  getPublishedChangelogs,
} from '../config/appVersion'

const route = useRoute()
const router = useRouter()
const changelogVisible = ref(false)
const changelogHistoryVisible = ref(false)
const changelog = computed(() => getChangelogByVersion(APP_VERSION))
const publishedChangelogs = computed(() => getPublishedChangelogs())
const collapsed = ref(false)
const expandedKeys = ref([])
/** 收起侧栏时当前展开的悬浮子菜单 key */
const flyoutKey = ref('')
const flyoutStyle = ref({})
const flyoutItem = computed(() =>
  visibleSidebarMenu.value.find((item) => item.key === flyoutKey.value && item.children?.length) || null,
)
const { isHqSelected } = useCurrentProject()

const projectOptions = COC_PROJECT_OPTIONS

/** 新标签页带 ?project_id= 时切到对应项目层级（如施工部位「去配置」） */
watch(
  () => route.query.project_id || route.query.projectId,
  (raw) => {
    if (!raw) return
    const pid = String(Array.isArray(raw) ? raw[0] : raw).trim()
    if (!pid || pid === HQ_PROJECT_OPTION.id) return
    const known = COC_PROJECT_OPTIONS.some((p) => p.id === pid)
    if (!known && !/^p-/.test(pid)) return
    if (selectedProjectId.value !== pid) selectedProjectId.value = pid
  },
  { immediate: true },
)

/** 同一菜单按层级切换显示名（如分包单位管理 / 分包单位报审） */
function applyScopeLabels(items = [], hq) {
  return items.map((item) => {
    const next = { ...item }
    if (hq && item.hqLabel) next.label = item.hqLabel
    if (!hq && item.projectLabel) next.label = item.projectLabel
    if (item.children?.length) next.children = applyScopeLabels(item.children, hq)
    return next
  })
}

/** 企业级隐藏视频监控；项目级隐藏指挥部专属菜单；样板审批入口已迁个人中心，侧栏始终隐藏 */
const visibleSidebarMenu = computed(() => {
  const scoped = filterMenuByScope(
    sidebarMenu,
    isHqSelected.value ? MENU_SCOPE_HQ : MENU_SCOPE_PROJECT,
  )
  const stripApprove = (items = []) =>
    items
      .filter((item) => !SAMPLE_APPROVE_MENU_KEYS.has(item.key))
      .map((item) =>
        item.children?.length ? { ...item, children: stripApprove(item.children) } : item,
      )
      .filter((item) => !item.children || item.children.length > 0)
  return applyScopeLabels(stripApprove(scoped), isHqSelected.value)
})

function collectMenuPathsBy(pred, items = sidebarMenu, acc = []) {
  for (const item of items) {
    if (item.path && pred(item.key)) acc.push(item.path)
    if (item.children?.length) collectMenuPathsBy(pred, item.children, acc)
  }
  return acc
}

const hqOnlyPaths = collectMenuPathsBy(isHqOnlyMenuKey)
const projectOnlyPaths = collectMenuPathsBy(isProjectOnlyMenuKey)

/** 离开指挥部专属页时，尽量落到对应项目能力页，避免一律踢回工作台 */
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

function resolveLeaveTarget(paths) {
  if (paths !== hqOnlyPaths) return '/workbench'
  const hit = Object.entries(HQ_LEAVE_REDIRECT).find(
    ([hqPath]) => route.path === hqPath || route.path.startsWith(`${hqPath}/`),
  )
  return hit?.[1] || '/workbench'
}

function leaveRestrictedPages(paths) {
  closeFlyout()
  const onRestricted = paths.some(
    (path) => route.path === path || route.path.startsWith(`${path}/`),
  )
  if (!onRestricted) return
  openTabs.value = openTabs.value.filter(
    (tab) => !paths.some((path) => tab.path === path || tab.path.startsWith(`${path}/`)),
  )
  router.push(resolveLeaveTarget(paths))
}

watch(isHqSelected, (hq) => {
  closeFlyout()
  if (hq) leaveRestrictedPages(projectOnlyPaths)
  else leaveRestrictedPages(hqOnlyPaths)
})

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
  SetUp,
  Document,
  Bell,
  Goods,
  PictureFilled,
  DocumentChecked,
  WarnTriangleFilled,
  DataAnalysis,
  Cpu,
  MapLocation,
}

const activeMenu = computed(() => route.meta.sidebarKey || 'workbench')
const openTabs = ref([
  { key: 'workbench', label: '工作台', path: '/workbench' },
])
const activeTab = computed(() => route.meta.tabKey || 'workbench')

/** Hash 路由下稳定指向 COC 大屏，避免 resolve href 拼接异常导致打不开 */
function resolveScreenHref(routeName, fallbackPath) {
  const { href, fullPath } = router.resolve({ name: routeName })
  if (/^https?:\/\//i.test(href)) return href
  const hash = href.startsWith('#')
    ? href
    : `#${fullPath.startsWith('/') ? fullPath : `/${fullPath || fallbackPath}`}`
  const path = window.location.pathname || '/'
  return `${window.location.origin}${path}${hash.startsWith('#') ? hash : `#${hash}`}`
}

const cocScreenHref = computed(() => resolveScreenHref('CocScreen', 'coc'))

function isGroupActive(item) {
  if (item.path && route.path === item.path) return true
  return item.children?.some((child) => isGroupActive(child)) ?? false
}

function isChildActive(child) {
  if (child.path) return route.path === child.path
  return child.children?.some((item) => isChildActive(item)) ?? false
}

function ensureExpandedForRoute() {
  const walk = (nodes) => {
    for (const node of nodes || []) {
      if (!node.children?.length) continue
      if (isGroupActive(node) && !expandedKeys.value.includes(node.key)) {
        expandedKeys.value.push(node.key)
      }
      walk(node.children)
    }
  }
  walk(visibleSidebarMenu.value)
}

function resolveCurrentTabLabel() {
  if (isHqSelected.value && route.path === '/machine-supervise/ledger') {
    return '机械设备台账'
  }
  return route.meta?.title || '页面'
}

watch(
  () => route.fullPath,
  () => {
    closeFlyout()
    ensureExpandedForRoute()
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

function toggleGroup(key) {
  if (expandedKeys.value.includes(key)) {
    expandedKeys.value = expandedKeys.value.filter((k) => k !== key)
  } else {
    expandedKeys.value.push(key)
  }
}

function onGroupClick(item) {
  if (collapsed.value) {
    if (flyoutKey.value === item.key) {
      closeFlyout()
      return
    }
    flyoutKey.value = item.key
    nextTick(() => positionFlyout(item.key))
    return
  }
  toggleGroup(item.key)
}

function closeFlyout() {
  flyoutKey.value = ''
  flyoutStyle.value = {}
}

function positionFlyout(key) {
  const btn = document.querySelector(`.menu-group[data-menu-key="${key}"] .group-title`)
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  const top = Math.min(rect.top, window.innerHeight - 240)
  flyoutStyle.value = {
    top: `${Math.max(8, top)}px`,
    left: `${rect.right + 8}px`,
  }
}

function navigate(path, menuKey = '', item = null) {
  if (menuKey && TRACK_EXTERNAL_MENU_KEYS.has(menuKey)) {
    openTrackExternalByMenuKey(menuKey)
    closeFlyout()
    return
  }
  const openBlank = item?.openInNewTab || menuKey === 'qm-archive-fill'
  if (openBlank && path) {
    const href = router.resolve({ path }).href
    window.open(href, '_blank', 'noopener,noreferrer')
    closeFlyout()
    return
  }
  if (path) router.push(path)
  closeFlyout()
}

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

function onDocumentClick(e) {
  if (!collapsed.value || !flyoutKey.value) return
  const t = e.target
  if (t?.closest?.('.menu-group') || t?.closest?.('.menu-flyout')) return
  closeFlyout()
}

watch(collapsed, (v) => {
  if (!v) closeFlyout()
})

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))

function closeTab(tab, e) {
  e.stopPropagation()
  openTabs.value = openTabs.value.filter((t) => t.key !== tab.key)
  if (activeTab.value === tab.key && openTabs.value.length) {
    router.push(openTabs.value[openTabs.value.length - 1].path)
  }
}

/** Hash 路由下勿用 href="#id"，避免与路由 hash 冲突 */
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
        <nav class="sidebar-nav">
          <template v-for="item in visibleSidebarMenu" :key="item.key">
            <div v-if="item.children" class="menu-group" :data-menu-key="item.key">
              <button
                type="button"
                class="menu-item group-title"
                :class="{ active: isGroupActive(item) }"
                :title="collapsed ? item.label : undefined"
                @click.stop="onGroupClick(item)"
              >
                <el-icon :size="16"><component :is="iconMap[item.icon]" /></el-icon>
                <span v-if="!collapsed">{{ item.label }}</span>
                <span v-if="!collapsed" class="expand-arrow">{{ expandedKeys.includes(item.key) ? '▾' : '▸' }}</span>
              </button>

              <!-- 展开态：内嵌子菜单 -->
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
                      <template v-for="leaf in child.children" :key="leaf.key">
                        <div v-if="leaf.children?.length" class="sub-group deep-group">
                          <button
                            type="button"
                            class="menu-item sub-item nested-item sub-group-title"
                            :class="{ active: isChildActive(leaf) }"
                            @click="toggleGroup(leaf.key)"
                          >
                            <span>{{ leaf.label }}</span>
                            <span class="expand-arrow">{{ expandedKeys.includes(leaf.key) ? '▾' : '▸' }}</span>
                          </button>
                          <div v-if="expandedKeys.includes(leaf.key)" class="sub-menu nested deep">
                            <button
                              v-for="deep in leaf.children"
                              :key="deep.key"
                              type="button"
                              class="menu-item sub-item deep-item"
                              :class="{ active: isChildActive(deep) }"
                              @click="navigate(deep.path, deep.key, deep)"
                            >
                              <span>{{ deep.label }}</span>
                              <span v-if="deep.badge" class="menu-badge" />
                            </button>
                          </div>
                        </div>
                        <button
                          v-else
                          type="button"
                          class="menu-item sub-item nested-item"
                          :class="{ active: isChildActive(leaf) }"
                          @click="navigate(leaf.path, leaf.key, leaf)"
                        >
                          <span>{{ leaf.label }}</span>
                          <span v-if="leaf.badge" class="menu-badge" />
                        </button>
                      </template>
                    </div>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="menu-item sub-item"
                    :class="{ active: isChildActive(child) }"
                    @click="navigate(child.path, child.key, child)"
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
              @click="navigate(item.path, item.key)"
            >
              <el-icon :size="16"><component :is="iconMap[item.icon]" /></el-icon>
              <span v-if="!collapsed">{{ item.label }}</span>
            </button>
          </template>
        </nav>

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
            @click="navigate(tab.path)"
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

    <!-- 收起侧栏：Teleport 到 body，避免 overflow:hidden 裁切 -->
    <Teleport to="body">
      <div
        v-if="collapsed && flyoutItem"
        class="menu-flyout"
        :style="flyoutStyle"
        @click.stop
      >
        <div class="flyout-title">{{ flyoutItem.label }}</div>
        <template v-for="child in flyoutItem.children" :key="child.key">
          <div v-if="child.children?.length" class="flyout-subgroup">
            <div class="flyout-sub-label">{{ child.label }}</div>
            <template v-for="leaf in child.children" :key="leaf.key">
              <div v-if="leaf.children?.length" class="flyout-deep-group">
                <div class="flyout-deep-label">{{ leaf.label }}</div>
                <button
                  v-for="deep in leaf.children"
                  :key="deep.key"
                  type="button"
                  class="flyout-item flyout-deep-item"
                  :class="{ active: isChildActive(deep) }"
                  @click="navigate(deep.path, deep.key, deep)"
                >
                  {{ deep.label }}
                </button>
              </div>
              <button
                v-else
                type="button"
                class="flyout-item"
                :class="{ active: isChildActive(leaf) }"
                @click="navigate(leaf.path, leaf.key, leaf)"
              >
                {{ leaf.label }}
              </button>
            </template>
          </div>
          <button
            v-else
            type="button"
            class="flyout-item"
            :class="{ active: isChildActive(child) }"
            @click="navigate(child.path, child.key, child)"
          >
            {{ child.label }}
          </button>
        </template>
      </div>
    </Teleport>
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
  overflow: visible;
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  overflow-y: auto;
}

.sidebar.collapsed .sidebar-nav {
  overflow: visible;
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

.menu-group {
  position: relative;
}

.expand-arrow {
  margin-left: auto;
  font-size: 12px;
  opacity: 0.7;
}

.menu-flyout {
  position: fixed;
  z-index: 3200;
  min-width: 188px;
  max-width: 260px;
  max-height: min(70vh, 480px);
  overflow-y: auto;
  padding: 8px;
  background: #fff;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.flyout-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ap-text-muted);
  padding: 4px 10px 8px;
  border-bottom: 1px solid var(--ap-border);
  margin-bottom: 6px;
}
.flyout-sub-label {
  font-size: 11px;
  color: var(--ap-text-muted);
  padding: 6px 10px 2px;
}
.flyout-item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--ap-text-secondary);
  cursor: pointer;
}
.flyout-item:hover {
  color: var(--ap-primary);
  background: var(--ap-primary-muted);
}
.flyout-item.active {
  color: var(--ap-primary);
  background: var(--ap-primary-light);
  font-weight: 600;
}
.flyout-subgroup + .flyout-item,
.flyout-item + .flyout-subgroup {
  margin-top: 4px;
}

.sidebar.collapsed .menu-item {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
}
.sidebar.collapsed .menu-item .el-icon {
  margin: 0;
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

.deep-group .sub-group-title.nested-item {
  padding-left: 56px;
}

.sub-menu.nested.deep {
  padding: 0;
}

.deep-item {
  padding-left: 72px;
  font-size: 12px;
}

.flyout-deep-group {
  padding-left: 4px;
}

.flyout-deep-label {
  font-size: 11px;
  color: var(--ap-text-muted);
  padding: 4px 10px 2px 16px;
}

.flyout-deep-item {
  padding-left: 22px;
  font-size: 12px;
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

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Aim,
  AlarmClock,
  Avatar,
  Bell,
  BellFilled,
  Bottom,
  Box,
  Briefcase,
  Calendar,
  Camera,
  Cellphone,
  ChatDotRound,
  ChatLineRound,
  Checked,
  CircleCheck,
  CircleCloseFilled,
  Close,
  Collection,
  CollectionTag,
  Compass,
  Cpu,
  DataAnalysis,
  DataBoard,
  DataLine,
  Document,
  DocumentAdd,
  DocumentChecked,
  DocumentCopy,
  Download,
  EditPen,
  Failed,
  Files,
  FirstAidKit,
  Flag,
  Folder,
  FolderChecked,
  FolderOpened,
  Goods,
  GoodsFilled,
  Grid,
  Guide,
  Headset,
  Histogram,
  HomeFilled,
  House,
  Iphone,
  Key,
  Lightning,
  Link,
  List,
  Location,
  LocationFilled,
  Lock,
  MagicStick,
  Management,
  MapLocation,
  Medal,
  Memo,
  Menu,
  Message,
  Monitor,
  MuteNotification,
  Notebook,
  Notification,
  Odometer,
  OfficeBuilding,
  Operation,
  Opportunity,
  Phone,
  Picture,
  PictureFilled,
  PictureRounded,
  PieChart,
  Place,
  Platform,
  Plus,
  Pointer,
  Position,
  Postcard,
  PriceTag,
  Promotion,
  Rank,
  RefreshRight,
  ScaleToOriginal,
  Search,
  Select,
  SetUp,
  Setting,
  Share,
  Ship,
  SoldOut,
  Stamp,
  Suitcase,
  SuitcaseLine,
  Sunny,
  Switch,
  Tickets,
  Tools,
  TrendCharts,
  Trophy,
  Unlock,
  Upload,
  User,
  UserFilled,
  Van,
  VideoCamera,
  VideoPlay,
  View,
  WarnTriangleFilled,
  Warning,
  WarningFilled,
  WindPower,
} from '@element-plus/icons-vue'
import { useCurrentProject } from '../composables/useCurrentProject'
import {
  MAX_SHORTCUT_COUNT,
  buildWorkbenchTreeData,
  listWorkbenchMenuLeaves,
  listWorkbenchShortcuts,
  loadWorkbenchShortcutKeys,
  saveWorkbenchShortcutKeys,
} from '../mock/workbenchShortcuts.js'
import { TRACK_EXTERNAL_MENU_KEYS, openTrackExternalByMenuKey } from '../utils/trackExternalJump'
import PersonalCenterPanels from './personalCenter/PersonalCenterPanels.vue'

const router = useRouter()
const { isHqSelected } = useCurrentProject()

const shortcutIconMap = {
  Aim,
  AlarmClock,
  Avatar,
  Bell,
  BellFilled,
  Bottom,
  Box,
  Briefcase,
  Calendar,
  Camera,
  Cellphone,
  ChatDotRound,
  ChatLineRound,
  Checked,
  CircleCheck,
  CircleCloseFilled,
  Collection,
  CollectionTag,
  Compass,
  Cpu,
  DataAnalysis,
  DataBoard,
  DataLine,
  Document,
  DocumentAdd,
  DocumentChecked,
  DocumentCopy,
  Download,
  EditPen,
  Failed,
  Files,
  FirstAidKit,
  Flag,
  Folder,
  FolderChecked,
  FolderOpened,
  Goods,
  GoodsFilled,
  Grid,
  Guide,
  Headset,
  Histogram,
  HomeFilled,
  House,
  Iphone,
  Key,
  Lightning,
  Link,
  List,
  Location,
  LocationFilled,
  Lock,
  MagicStick,
  Management,
  MapLocation,
  Medal,
  Memo,
  Menu,
  Message,
  Monitor,
  MuteNotification,
  Notebook,
  Notification,
  Odometer,
  OfficeBuilding,
  Operation,
  Opportunity,
  Phone,
  Picture,
  PictureFilled,
  PictureRounded,
  PieChart,
  Place,
  Platform,
  Pointer,
  Position,
  Postcard,
  PriceTag,
  Promotion,
  Rank,
  RefreshRight,
  ScaleToOriginal,
  Select,
  SetUp,
  Setting,
  Share,
  Ship,
  SoldOut,
  Stamp,
  Suitcase,
  SuitcaseLine,
  Sunny,
  Switch,
  Tickets,
  Tools,
  TrendCharts,
  Trophy,
  Unlock,
  Upload,
  User,
  UserFilled,
  Van,
  VideoCamera,
  VideoPlay,
  View,
  WarnTriangleFilled,
  Warning,
  WarningFilled,
  WindPower,
}

const shortcutKeys = ref([])
const pickerVisible = ref(false)
const pickerFilter = ref('')
const pickerTreeRef = ref(null)
const pickerCheckedCount = ref(0)

const levelLabel = computed(() => (isHqSelected.value ? '指挥部' : '项目'))
const shortcuts = computed(() => listWorkbenchShortcuts(isHqSelected.value, shortcutKeys.value))

const pickerTreeData = computed(() => buildWorkbenchTreeData(isHqSelected.value))

const leafKeySet = computed(
  () => new Set(listWorkbenchMenuLeaves(isHqSelected.value).map((item) => item.key)),
)

watch(
  isHqSelected,
  () => {
    shortcutKeys.value = loadWorkbenchShortcutKeys(isHqSelected.value)
    pickerVisible.value = false
  },
  { immediate: true },
)

watch(pickerFilter, (value) => {
  pickerTreeRef.value?.filter(value)
})

function iconComponent(name) {
  return shortcutIconMap[name] || Document
}

const dragKey = ref('')
const dragOverKey = ref('')
const dragging = ref(false)
let suppressClick = false

function persistKeys(keys, opts) {
  shortcutKeys.value = saveWorkbenchShortcutKeys(isHqSelected.value, keys, opts)
}

function moveShortcut(fromKey, toKey, place = 'before') {
  if (!fromKey || fromKey === toKey) return
  const keys = [...shortcutKeys.value]
  const from = keys.indexOf(fromKey)
  if (from < 0) return
  keys.splice(from, 1)
  if (!toKey || place === 'end') {
    keys.push(fromKey)
  } else {
    let to = keys.indexOf(toKey)
    if (to < 0) {
      keys.push(fromKey)
    } else {
      if (place === 'after') to += 1
      keys.splice(to, 0, fromKey)
    }
  }
  persistKeys(keys)
}

function onDragStart(event, item) {
  dragKey.value = item.key
  dragging.value = true
  dragOverKey.value = ''
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.key)
    const card = event.currentTarget.closest('.shortcut-item')
    if (card) {
      const rect = card.getBoundingClientRect()
      event.dataTransfer.setDragImage(card, event.clientX - rect.left, event.clientY - rect.top)
    }
  }
}

function onDragOver(event, item) {
  if (!dragKey.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  if (dragKey.value === item.key) return
  const rect = event.currentTarget.getBoundingClientRect()
  const place = event.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
  dragOverKey.value = `${item.key}:${place}`
}

function onDrop(event, item) {
  event.preventDefault()
  const fromKey = dragKey.value
  const over = dragOverKey.value || `${item.key}:before`
  const place = over.endsWith(':after') ? 'after' : 'before'
  moveShortcut(fromKey, item.key, place)
  suppressClick = true
  dragKey.value = ''
  dragOverKey.value = ''
  dragging.value = false
}

function onDropAdd(event) {
  event.preventDefault()
  moveShortcut(dragKey.value, '', 'end')
  suppressClick = true
  dragKey.value = ''
  dragOverKey.value = ''
  dragging.value = false
}

function onDragOverAdd(event) {
  if (!dragKey.value) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  dragOverKey.value = '__add__'
}

function onDragEnd() {
  suppressClick = true
  dragKey.value = ''
  dragOverKey.value = ''
  dragging.value = false
  window.setTimeout(() => {
    suppressClick = false
  }, 50)
}

function onShortcutClick(item) {
  if (suppressClick || dragging.value) return
  openShortcut(item)
}

function openPicker() {
  if (suppressClick || dragging.value) return
  pickerFilter.value = ''
  pickerVisible.value = true
}

function openShortcut(item) {
  if (!item?.key) return
  if (TRACK_EXTERNAL_MENU_KEYS.has(item.key)) {
    openTrackExternalByMenuKey(item.key)
    return
  }
  const location = { path: item.path, query: item.query }
  if (item.openInNewTab) {
    const href = router.resolve(location).href
    window.open(href, '_blank', 'noopener,noreferrer')
    return
  }
  if (item.path) router.push(location)
}

function removeShortcut(item) {
  persistKeys(shortcutKeys.value.filter((key) => key !== item.key))
  ElMessage.success(`已移除「${item.label}」`)
}

function filterPickerNode(value, data) {
  if (!value) return true
  return String(data.label || '').includes(value)
}

function syncPickerChecked() {
  const keys = shortcutKeys.value.filter((key) => leafKeySet.value.has(key))
  pickerTreeRef.value?.setCheckedKeys(keys)
  pickerCheckedCount.value = keys.length
  pickerTreeRef.value?.filter(pickerFilter.value)
}

function collectCheckedLeafKeys() {
  const raw = pickerTreeRef.value?.getCheckedKeys(true) || []
  return raw.filter((key) => leafKeySet.value.has(key))
}

function onPickerCheck(data) {
  let keys = collectCheckedLeafKeys()
  if (keys.length > MAX_SHORTCUT_COUNT) {
    keys = keys.filter((key) => key !== data.key)
    pickerTreeRef.value?.setCheckedKeys(keys)
    pickerCheckedCount.value = keys.length
    ElMessage.warning(`常用功能最多选择 ${MAX_SHORTCUT_COUNT} 个，请先取消已选项再勾选`)
    return
  }
  pickerTreeRef.value?.setCheckedKeys(keys)
  pickerCheckedCount.value = keys.length
}

function confirmPicker() {
  persistKeys(collectCheckedLeafKeys(), { keepExistingOrder: true })
  pickerVisible.value = false
  ElMessage.success(`${levelLabel.value}常用功能已更新`)
}

function dragOverClass(item) {
  if (!dragOverKey.value || !item?.key) return ''
  if (dragOverKey.value === `${item.key}:before`) return 'is-drop-before'
  if (dragOverKey.value === `${item.key}:after`) return 'is-drop-after'
  return ''
}
</script>

<template>
  <div class="workbench-page">
    <section class="shortcut-panel">
      <div class="shortcut-head">
        <h2 class="shortcut-title">常用功能</h2>
      </div>
      <div class="shortcut-row">
        <div
          v-for="item in shortcuts"
          :key="item.key"
          class="shortcut-item"
          :class="[
            dragOverClass(item),
            { 'is-dragging': dragKey === item.key },
          ]"
          role="button"
          tabindex="0"
          @click="onShortcutClick(item)"
          @keydown.enter.prevent="onShortcutClick(item)"
          @keydown.space.prevent="onShortcutClick(item)"
          @dragover="onDragOver($event, item)"
          @drop="onDrop($event, item)"
        >
          <span
            class="shortcut-drag"
            draggable="true"
            role="button"
            tabindex="0"
            aria-label="拖动排序"
            title="拖动排序"
            @click.stop
            @keydown.stop
            @dragstart="onDragStart($event, item)"
            @dragend="onDragEnd"
          >
            <el-icon :size="12"><Rank /></el-icon>
          </span>
          <span
            class="shortcut-icon"
            :style="{ background: item.iconBg, color: item.iconColor }"
          >
            <el-icon :size="22">
              <component :is="iconComponent(item.icon)" />
            </el-icon>
          </span>
          <span class="shortcut-label">{{ item.label }}</span>
          <span
            class="shortcut-remove"
            role="button"
            tabindex="0"
            aria-label="移出常用功能"
            @click.stop="removeShortcut(item)"
            @mousedown.stop
            @keydown.enter.stop="removeShortcut(item)"
          >
            <el-icon :size="12"><Close /></el-icon>
          </span>
        </div>
        <button
          type="button"
          class="shortcut-item shortcut-add"
          :class="{ 'is-drop-add': dragOverKey === '__add__' }"
          aria-label="新增常用功能"
          @click="openPicker"
          @dragover="onDragOverAdd"
          @drop="onDropAdd"
        >
          <span class="shortcut-icon shortcut-icon-add">
            <el-icon :size="22"><Plus /></el-icon>
          </span>
          <span class="shortcut-label">新增</span>
        </button>
      </div>
    </section>

    <section class="pc-embed">
      <PersonalCenterPanels :show-title="false" base-path="/workbench" />
    </section>

    <el-dialog
      v-model="pickerVisible"
      :title="`选择常用功能（${levelLabel}）`"
      width="560px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      @opened="syncPickerChecked"
    >
      <p class="picker-tip">
        仅可勾选最末级菜单，最多 {{ MAX_SHORTCUT_COUNT }} 个（已选 {{ pickerCheckedCount }}）。当前配置仅作用于{{ levelLabel }}层级。
      </p>
      <el-input
        v-model="pickerFilter"
        class="picker-search"
        clearable
        placeholder="搜索菜单名称"
        :prefix-icon="Search"
      />
      <el-tree
        ref="pickerTreeRef"
        class="shortcut-menu-tree"
        :data="pickerTreeData"
        show-checkbox
        check-strictly
        default-expand-all
        node-key="key"
        :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
        :filter-node-method="filterPickerNode"
        @check="onPickerCheck"
      />
      <template #footer>
        <el-button @click="pickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPicker">确定</el-button>
      </template>
    </el-dialog>
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

.shortcut-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.shortcut-item {
  position: relative;
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
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  user-select: none;
}

.shortcut-item:hover {
  background: #fafafa;
  border-color: var(--ap-border, #ebeef5);
}

.shortcut-item.is-dragging {
  opacity: 0.45;
}

.shortcut-drag {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  display: none;
  align-items: center;
  justify-content: center;
  color: #909399;
  cursor: grab;
}

.shortcut-item:hover .shortcut-drag,
.shortcut-drag:focus {
  display: flex;
}

.shortcut-item.is-dragging .shortcut-drag {
  display: flex;
  cursor: grabbing;
  color: var(--ap-primary, #1677ff);
}

.shortcut-item.is-drop-before {
  box-shadow: inset 3px 0 0 var(--ap-primary, #1677ff);
}

.shortcut-item.is-drop-after {
  box-shadow: inset -3px 0 0 var(--ap-primary, #1677ff);
}

.shortcut-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.shortcut-icon :deep(svg) {
  color: inherit;
}

.shortcut-label {
  font-size: 13px;
  color: var(--ap-text, #303133);
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

.shortcut-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  display: none;
  align-items: center;
  justify-content: center;
  background: #909399;
  color: #fff;
  cursor: pointer;
  padding: 0;
}

.shortcut-item.is-dragging .shortcut-remove {
  display: none;
}

.shortcut-item:hover .shortcut-remove,
.shortcut-remove:focus {
  display: flex;
}

.shortcut-add {
  cursor: pointer;
}

.shortcut-add .shortcut-icon-add {
  background: #f5f7fa;
  color: #909399;
  border: 1px dashed #c0c4cc;
}

.shortcut-add:hover .shortcut-icon-add,
.shortcut-add.is-drop-add .shortcut-icon-add {
  color: var(--ap-primary, #1677ff);
  border-color: var(--ap-primary, #1677ff);
  background: #f0f7ff;
}

.picker-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--ap-text-muted, #909399);
}

.picker-search {
  margin-bottom: 12px;
}

.shortcut-menu-tree {
  max-height: 420px;
  overflow: auto;
  padding: 4px 0;
  border: 1px solid var(--ap-border, #ebeef5);
  border-radius: 6px;
}

.shortcut-menu-tree :deep(.el-tree-node__content) {
  height: 34px;
}

.shortcut-menu-tree :deep(.el-tree-node.is-disabled > .el-tree-node__content) {
  color: var(--ap-text, #303133);
  cursor: default;
}

.shortcut-menu-tree :deep(.el-checkbox.is-disabled) {
  visibility: hidden;
  width: 0;
  height: 0;
  margin: 0;
  overflow: hidden;
  pointer-events: none;
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

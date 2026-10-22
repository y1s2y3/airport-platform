<script setup>
import {
  AlarmClock,
  Bell,
  Bottom,
  Brush,
  Calendar,
  Camera,
  Cellphone,
  ChatLineRound,
  CircleCheck,
  CircleClose,
  CirclePlus,
  Close,
  CollectionTag,
  Compass,
  Crop,
  DataAnalysis,
  DataLine,
  Delete,
  Document,
  DocumentAdd,
  DocumentChecked,
  DocumentCopy,
  Download,
  EditPen,
  Eleme,
  Files,
  Folder,
  FolderChecked,
  FolderOpened,
  Guide,
  Headset,
  Help,
  Iphone,
  Key,
  Lightning,
  Link,
  List,
  Location,
  Lock,
  Management,
  MapLocation,
  Memo,
  Menu,
  Message,
  Monitor,
  More,
  Notebook,
  Operation,
  Phone,
  Picture,
  Place,
  Plus,
  Pointer,
  Position,
  Rank,
  RefreshRight,
  Remove,
  School,
  Search,
  Setting,
  SetUp,
  Share,
  ShoppingBag,
  ShoppingCart,
  Star,
  SuitcaseLine,
  Sunrise,
  Switch,
  Ticket,
  Tickets,
  Tools,
  TopRight,
  TrendCharts,
  TrophyBase,
  Unlock,
  Upload,
  User,
  Van,
  VideoCamera,
  VideoPlay,
  View,
  Wallet,
  Warning,
} from '@element-plus/icons-vue'
import { resolveMenuIconName } from '../utils/menuIcon.js'
import AiScreenIcon from '../components/icons/AiScreenIcon.vue'
import SafetyScreenIcon from '../components/icons/SafetyScreenIcon.vue'

const props = defineProps({
  item: { type: Object, required: true },
  level: { type: Number, default: 0 },
})
const emit = defineEmits(['select'])

const icons = {
  AlarmClock,
  Bell,
  Bottom,
  Brush,
  Calendar,
  Camera,
  Cellphone,
  ChatLineRound,
  CircleCheck,
  CircleClose,
  CirclePlus,
  Close,
  CollectionTag,
  Compass,
  Crop,
  DataAnalysis,
  DataLine,
  Delete,
  Document,
  DocumentAdd,
  DocumentChecked,
  DocumentCopy,
  Download,
  EditPen,
  Eleme,
  Files,
  Folder,
  FolderChecked,
  FolderOpened,
  Guide,
  Headset,
  Help,
  Iphone,
  Key,
  Lightning,
  Link,
  List,
  Location,
  Lock,
  Management,
  MapLocation,
  Memo,
  Menu,
  Message,
  Monitor,
  More,
  Notebook,
  Operation,
  Phone,
  Picture,
  Place,
  Plus,
  Pointer,
  Position,
  Rank,
  RefreshRight,
  Remove,
  School,
  Search,
  Setting,
  SetUp,
  Share,
  ShoppingBag,
  ShoppingCart,
  Star,
  SuitcaseLine,
  Sunrise,
  Switch,
  Ticket,
  Tickets,
  Tools,
  TrendCharts,
  TrophyBase,
  Unlock,
  Upload,
  User,
  Van,
  VideoCamera,
  VideoPlay,
  View,
  Wallet,
  Warning,
  AI: AiScreenIcon,
  Safety: SafetyScreenIcon,
}

function iconComponent(name) {
  return icons[resolveMenuIconName(name)] || icons[name] || null
}

function menuIndex(item) {
  const query = new URLSearchParams(item.query || {}).toString()
  return query ? `${item.path}?${query}` : item.path
}

function onSelect(path) {
  emit('select', path)
}
</script>

<template>
  <el-sub-menu v-if="item.children && item.children.length" :index="item.key">
    <template #title>
      <el-icon v-if="item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
      <span class="menu-group-label" :title="item.label">{{ item.label }}</span>
    </template>
    <SidebarMenuNode
      v-for="child in item.children"
      :key="child.key"
      :item="child"
      :level="level + 1"
      @select="onSelect"
    />
  </el-sub-menu>
  <el-menu-item v-else :index="menuIndex(item)">
    <el-icon v-if="item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
    <template #title>
      <span class="menu-leaf-label" :title="item.label">{{ item.label }}</span>
      <span
        v-if="item.externalJump"
        class="p1-mark p1-mark--link"
        title="一期系统功能，点击在新窗口打开"
      >
        <el-icon><TopRight /></el-icon>
      </span>
    </template>
  </el-menu-item>
</template>

<style scoped>
/* 一期功能标记：金色圆形「外链 ↗」图标
   - 不写文字，用外链箭头表达「点击去一期 / 新窗口打开」，更直观
   - 金色与平台酒红互补，在白色侧栏与选中态（酒红底）上都清晰 */
.p1-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 6px;
  border-radius: 50%;
  color: #7a5200;
  background: linear-gradient(135deg, #ffe6a0 0%, #f2c22e 100%);
  border: 1px solid rgba(150, 100, 0, 0.22);
  box-shadow: 0 1px 3px rgba(190, 130, 0, 0.28);
  vertical-align: middle;
  flex-shrink: 0;
  cursor: help;
  transition: transform 0.15s, box-shadow 0.15s;
}

.p1-mark .el-icon {
  font-size: 10px;
  font-weight: 700;
}

/* 叶子上的标记略小，避免抢标题注意力 */
.p1-mark--link {
  width: 15px;
  height: 15px;
  opacity: 0.95;
}

/* 悬停/选中态：轻微放大 + 加强阴影，保持金色可读 */
.el-menu-item:hover .p1-mark,
.el-sub-menu__title:hover .p1-mark {
  transform: scale(1.08);
  box-shadow: 0 2px 6px rgba(190, 130, 0, 0.42);
}

.el-menu-item.is-active .p1-mark {
  border-color: rgba(255, 255, 255, 0.55);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
}

/* 分组标题文字与叶子文字允许换行截断规则由 AdminLayout 统一控制 */
.menu-group-label,
.menu-leaf-label {
  min-width: 0;
}
</style>

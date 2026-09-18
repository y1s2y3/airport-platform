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
import { isTextMenuIcon, resolveMenuIconName, textMenuIconLabel } from '../utils/menuIcon.js'

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
}

function iconComponent(name) {
  if (isTextMenuIcon(name)) return null
  return icons[resolveMenuIconName(name)] || icons[name] || null
}

function onSelect(path) {
  emit('select', path)
}
</script>

<template>
  <el-sub-menu v-if="item.children && item.children.length" :index="item.key">
    <template #title>
      <span v-if="isTextMenuIcon(item.icon)" class="menu-text-icon" aria-hidden="true">{{ textMenuIconLabel(item.icon) }}</span>
      <el-icon v-else-if="item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
      <span>{{ item.label }}</span>
    </template>
    <SidebarMenuNode
      v-for="child in item.children"
      :key="child.key"
      :item="child"
      :level="level + 1"
      @select="onSelect"
    />
  </el-sub-menu>
  <el-menu-item v-else :index="item.path">
    <span v-if="isTextMenuIcon(item.icon)" class="menu-text-icon" aria-hidden="true">{{ textMenuIconLabel(item.icon) }}</span>
    <el-icon v-else-if="item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
    <template #title>{{ item.label }}</template>
  </el-menu-item>
</template>

<style scoped>
.menu-text-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  min-width: 1em;
  height: 1em;
  margin-right: 5px;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: inherit;
  flex-shrink: 0;
}
</style>

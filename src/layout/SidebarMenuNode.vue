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

function onSelect(path) {
  emit('select', path)
}
</script>

<template>
  <el-sub-menu v-if="item.children && item.children.length" :index="item.key">
    <template #title>
      <el-icon v-if="item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
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
    <el-icon v-if="item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
    <template #title>{{ item.label }}</template>
  </el-menu-item>
</template>

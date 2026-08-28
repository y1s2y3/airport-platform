<script setup>
import {
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
} from '@element-plus/icons-vue'

const props = defineProps({
  item: { type: Object, required: true },
  level: { type: Number, default: 0 },
})
const emit = defineEmits(['select'])

const icons = {
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

function iconComponent(name) {
  return icons[name] || null
}

function onSelect(path) {
  emit('select', path)
}
</script>

<template>
  <el-sub-menu v-if="item.children && item.children.length" :index="item.key">
    <template #title>
      <el-icon v-if="level === 0 && item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
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
    <el-icon v-if="level === 0 && item.icon"><component :is="iconComponent(item.icon)" /></el-icon>
    <template #title>{{ item.label }}</template>
  </el-menu-item>
</template>

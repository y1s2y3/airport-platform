<script setup>
import { computed, defineAsyncComponent, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getVideoMonitorItem } from '../../config/menu.js'
import { ensureVideoDeviceLedgerSeed } from '../../coc/utils/videoDeviceLedgerStorage.js'
import { ensureVideoDeviceGroupSeed } from '../../coc/utils/videoDeviceGroupStorage.js'
import '../../coc/admin/admin.css'
import '../../coc/admin/admin-video.css'

onMounted(() => {
  ensureVideoDeviceLedgerSeed()
  ensureVideoDeviceGroupSeed()
})

const route = useRoute()
const item = computed(() => getVideoMonitorItem(route.meta.videoMonitorKey))

/** viewLoaders 为 () => import(...)，须包一层 defineAsyncComponent 才能作为 :is 渲染 */
const contentComponent = computed(() => {
  const loader = item.value?.component
  if (!loader) return null
  return defineAsyncComponent(loader)
})
</script>

<template>
  <component
    v-if="contentComponent"
    :is="contentComponent"
    :title="item.label"
    :description="item.description"
  />
</template>

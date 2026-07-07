<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getVideoMonitorItem } from '../../config/videoMonitorMenu.js'
import { ensureMonitorGroupSeed } from '../../coc/utils/monitorAdminStorage.js'
import { ensureNvrDeviceSeed } from '../../coc/utils/nvrDeviceStorage.js'
import '../../coc/admin/admin.css'
import '../../coc/admin/admin-video.css'

onMounted(() => {
  ensureMonitorGroupSeed()
  ensureNvrDeviceSeed()
})

const route = useRoute()
const item = computed(() => getVideoMonitorItem(route.meta.videoMonitorKey))
</script>

<template>
  <component v-if="item" :is="item.component" :title="item.label" :description="item.description" />
</template>

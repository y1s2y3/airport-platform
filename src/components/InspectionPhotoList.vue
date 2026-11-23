<script setup>
import { computed } from 'vue'

const props = defineProps({
  photos: { type: Array, default: () => [] },
  namePrefix: { type: String, default: '巡检照片' },
})
const entries = computed(() => props.photos.map((photo, index) => {
  const url = typeof photo === 'string' ? (/^(blob:|data:image\/)/.test(photo) ? photo : '') : photo?.url
  const name = (typeof photo === 'string' ? (url ? '' : photo) : photo?.name) || props.namePrefix + ' ' + (index + 1)
  return { name, url }
}))
const previews = computed(() => entries.value.map(item => item.url).filter(Boolean))
</script>

<template>
  <div class="inspection-photos">
    <div v-for="(item, index) in entries" :key="index">
      <el-image
        v-if="item.url"
        :src="item.url"
        :alt="item.name"
        :preview-src-list="previews"
        :initial-index="previews.indexOf(item.url)"
        fit="cover"
        preview-teleported
      />
      <span v-else>{{ item.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.inspection-photos { display: flex; flex-wrap: wrap; gap: 8px; min-width: 0; }
.el-image { display: block; width: 64px; height: 64px; border-radius: 6px; }
</style>

<script setup>
import { ref, computed, watch } from 'vue'
import AttachmentUpload from '../../../components/common/AttachmentUpload.vue'
import DailyCheckDialog from './DailyCheckDialog.vue'
import { asAttachList } from '../../../constants/attachmentUpload.js'
const props = defineProps({ modelValue: { type: Array, default: () => [] }, readonly: Boolean, required: Boolean, compact: Boolean, previewLimit: { type: Number, default: 3 } })
defineEmits(['update:modelValue'])
const target = ref(null), previewOpen = ref(false), previewIndex = ref(0)
const images = computed(() => asAttachList(props.modelValue))
const currentImage = computed(() => images.value[previewIndex.value])
function showPreview(index) { previewIndex.value = index; previewOpen.value = true }
function openPreview(event) {
  if (props.compact) return
  const item = event.target.closest('.ap-attach-item')
  if (!item || event.target.closest('button')) return
  const index = [...target.value.querySelectorAll('.ap-attach-item')].indexOf(item)
  if (index < 0 || !images.value[index]?.url) return
  event.preventDefault(); event.stopPropagation(); previewIndex.value = index; previewOpen.value = true
}
watch(() => images.value.length, length => { if (!length) previewOpen.value = false; else previewIndex.value = Math.min(previewIndex.value, length - 1) })
</script>
<template>
  <div ref="target" class="daily-check-images" :class="{ 'is-compact': compact }" @click.capture="openPreview">
    <div v-if="compact" class="daily-thumbnail-strip">
      <button v-for="(item, index) in images.slice(0, previewLimit)" :key="index" type="button" class="daily-thumbnail" :aria-label="`预览${item.name || '检查图片'}`" :title="item.name || '查看图片'" @click.stop="showPreview(index)"><img :src="item.url" :alt="item.name || '检查图片'" loading="lazy" /></button>
      <button v-if="images.length > previewLimit" type="button" class="daily-thumbnail daily-thumbnail-more" :aria-label="`查看其余${images.length - previewLimit}张图片`" @click.stop="showPreview(previewLimit)">+{{ images.length - previewLimit }}</button>
    </div>
    <AttachmentUpload v-else :model-value="modelValue" preset="image" :min="required ? 1 : 0" :max="9" :readonly="readonly" compact upload-text="点击上传" @update:model-value="$emit('update:modelValue', $event)" />
  </div>
  <DailyCheckDialog v-model="previewOpen" title="图片预览" width="960px">
    <el-image v-if="currentImage" :src="currentImage.url" :alt="currentImage.name" fit="contain" class="daily-preview-image" />
    <template #footer><div class="daily-preview-footer"><span>{{ previewIndex + 1 }} / {{ images.length }}</span><div><el-button :disabled="previewIndex === 0" @click="previewIndex--">上一张</el-button><el-button :disabled="previewIndex >= images.length - 1" @click="previewIndex++">下一张</el-button><el-button type="primary" @click="previewOpen = false">关闭</el-button></div></div></template>
  </DailyCheckDialog>
</template>
<style scoped>
.daily-check-images { width: 100%; min-width: 0; }
.daily-preview-image { display: block; width: 100%; height: min(500px, calc(100dvh - 220px)); }
.daily-preview-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
.daily-thumbnail-strip { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.daily-thumbnail { display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; padding: 0; border: 1px solid var(--ap-border); border-radius: 4px; overflow: hidden; background: var(--ap-bg-soft); cursor: pointer; flex: 0 0 auto; }
.daily-thumbnail img { width: 100%; height: 100%; object-fit: cover; }
.daily-thumbnail:hover { border-color: var(--ap-primary); }
.daily-thumbnail:focus-visible { outline: 2px solid var(--ap-primary); outline-offset: 2px; }
.daily-thumbnail-more { color: var(--ap-text-secondary); font-size: 12px; }
</style>

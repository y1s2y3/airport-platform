<script setup>
/**
 * 附件展示：图片类型显示缩略图（可预览），其他类型显示文件名
 */
import { computed } from 'vue'
import { Document, Picture } from '@element-plus/icons-vue'
import heroImg from '../../assets/hero.png'

const props = defineProps({
  name: { type: String, default: '' },
  url: { type: String, default: '' },
  /** 空态文案 */
  emptyText: { type: String, default: '未上传' },
  /** 缩略图尺寸 */
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
})

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i

const hasFile = computed(() => Boolean(String(props.name || '').trim() || String(props.url || '').trim()))

const isImage = computed(() => {
  const url = String(props.url || '')
  const name = String(props.name || '')
  if (/^data:image\//i.test(url)) return true
  if (IMAGE_EXT_RE.test(url)) return true
  if (IMAGE_EXT_RE.test(name)) return true
  return false
})

const previewSrc = computed(() => {
  const url = String(props.url || '').trim()
  if (/^(data:|https?:|blob:|\/)/.test(url)) return url
  // 演示数据仅有图片文件名、无真实地址时，用占位图便于看缩略图效果
  if (isImage.value && String(props.name || '').trim()) return heroImg
  return ''
})

const displayName = computed(() => String(props.name || '').trim() || '图片附件')
</script>

<template>
  <div v-if="!hasFile" class="attach-empty">{{ emptyText }}</div>
  <div v-else-if="isImage && previewSrc" class="attach-image" :class="`size-${size}`">
    <el-image
      :src="previewSrc"
      :preview-src-list="[previewSrc]"
      fit="cover"
      preview-teleported
      class="attach-thumb"
    >
      <template #error>
        <div class="attach-thumb-fallback">
          <el-icon><Picture /></el-icon>
        </div>
      </template>
    </el-image>
    <span class="attach-name" :title="displayName">{{ displayName }}</span>
  </div>
  <div v-else class="attach-file">
    <el-icon class="attach-file-icon"><Document /></el-icon>
    <span class="attach-name" :title="displayName">{{ displayName }}</span>
  </div>
</template>

<style scoped>
.attach-empty {
  font-size: 13px;
  color: var(--ap-text-muted, #8a94a6);
}

.attach-image {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.attach-thumb {
  flex-shrink: 0;
  border-radius: 4px;
  border: 1px solid var(--ap-border, #dce3ec);
  background: #f5f7fa;
  overflow: hidden;
  cursor: pointer;
}

.size-sm .attach-thumb {
  width: 36px;
  height: 36px;
}

.size-md .attach-thumb {
  width: 48px;
  height: 48px;
}

.size-lg .attach-thumb {
  width: 72px;
  height: 72px;
}

.attach-thumb :deep(img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.attach-thumb-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background: #f0f2f5;
}

.attach-file {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.attach-file-icon {
  color: var(--ap-primary, #8f0045);
  flex-shrink: 0;
}

.attach-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--ap-text-secondary, #5c6573);
  line-height: 1.4;
}
</style>

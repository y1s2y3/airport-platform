<script setup>
/**
 * 关键工序样板 · 现场影像资料（图片 + 视频，缩略图上传样式）
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, VideoCamera, ZoomIn } from '@element-plus/icons-vue'
import { ATTACH_PRESETS, validateAttachFile } from '../../../constants/attachmentUpload.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
  namePrefix: { type: String, default: '现场影像' },
  max: { type: Number, default: 9 },
  maxSizeMb: { type: Number, default: ATTACH_PRESETS.media.maxSizeMb },
})

const emit = defineEmits(['update:modelValue'])

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi)(\?|$)/i

function detectKind(file, name = '', url = '') {
  const type = String(file?.type || '')
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (IMAGE_EXT_RE.test(name) || IMAGE_EXT_RE.test(url)) return 'image'
  if (VIDEO_EXT_RE.test(name) || VIDEO_EXT_RE.test(url)) return 'video'
  return ''
}

function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && (item.url || item.name))
    .map((item, index) => ({
      name: item.name || `${props.namePrefix}-${index + 1}`,
      url: item.url || '',
      kind: item.kind === 'video' ? 'video' : 'image',
    }))
}

const files = computed(() => normalizeList(props.modelValue))

const previewList = computed(() =>
  files.value.filter((f) => f.kind === 'image' && f.url).map((f) => f.url),
)

function extFromFile(file, kind) {
  const fromName = String(file.name || '').match(/\.([a-z0-9]+)$/i)
  if (fromName) return `.${fromName[1].toLowerCase()}`
  if (kind === 'video') return '.mp4'
  const type = String(file.type || '')
  if (type.includes('png')) return '.png'
  if (type.includes('webp')) return '.webp'
  return '.jpg'
}

function nextIndexedName(ext) {
  return `${props.namePrefix}-${normalizeList(props.modelValue).length + 1}${ext}`
}

function handleUpload(uploadFile) {
  const file = uploadFile.raw || uploadFile
  const current = normalizeList(props.modelValue)
  const err = validateAttachFile(file, 'media', { currentCount: current.length, max: props.max })
  if (err) {
    ElMessage.warning(err)
    return false
  }
  const kind = detectKind(file, file?.name || '')
  if (!kind) {
    ElMessage.warning('仅支持图片或视频格式（mp4 / mov / m4v / avi）')
    return false
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    emit('update:modelValue', [
      ...current,
      {
        name: nextIndexedName(extFromFile(file, kind)),
        url: event.target?.result || '',
        kind,
      },
    ])
  }
  reader.readAsDataURL(file)
  return false
}

function removeAt(index) {
  const next = normalizeList(props.modelValue)
  next.splice(index, 1)
  emit(
    'update:modelValue',
    next.map((item, i) => {
      const ext = String(item.name || '').match(/(\.[a-z0-9]+)$/i)?.[1] || (item.kind === 'video' ? '.mp4' : '.jpg')
      return { ...item, name: `${props.namePrefix}-${i + 1}${ext}` }
    }),
  )
}

function imagePreviewIndex(file) {
  return previewList.value.indexOf(file.url)
}
</script>

<template>
  <div class="sample-media-attachments" :class="{ 'is-readonly': readonly }">
    <div class="thumb-grid">
      <div v-for="(file, index) in files" :key="`${file.name}-${index}`" class="thumb-card">
        <el-image
          v-if="file.kind === 'image' && file.url"
          :src="file.url"
          :alt="file.name"
          fit="cover"
          class="thumb"
          :preview-src-list="previewList"
          :initial-index="Math.max(0, imagePreviewIndex(file))"
          preview-teleported
        >
          <template #error>
            <div class="thumb placeholder">无预览</div>
          </template>
        </el-image>
        <div v-else class="thumb video-thumb">
          <el-icon :size="28"><VideoCamera /></el-icon>
          <span class="video-label">视频</span>
        </div>
        <div class="thumb-mask">
          <span class="thumb-name" :title="file.name">{{ file.name }}</span>
          <el-button
            v-if="!readonly"
            link
            type="danger"
            size="small"
            @click.stop="removeAt(index)"
          >
            删除
          </el-button>
          <el-icon v-else class="zoom-icon"><ZoomIn /></el-icon>
        </div>
      </div>

      <el-upload
        v-if="!readonly && files.length < max"
        class="upload-tile"
        :show-file-list="false"
        :accept="ATTACH_PRESETS.media.accept"
        :before-upload="handleUpload"
      >
        <div class="upload-inner">
          <el-icon :size="22"><Plus /></el-icon>
          <span>上传图片/视频</span>
        </div>
      </el-upload>
    </div>
    <p v-if="!readonly" class="hint">
      支持图片与视频（mp4 / mov / m4v / avi），单个不超过 {{ maxSizeMb }}MB，最多 {{ max }} 个
    </p>
    <p v-else-if="!files.length" class="empty">—</p>
  </div>
</template>

<style scoped>
.sample-media-attachments {
  width: 100%;
}
.hint,
.empty {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
.thumb-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.thumb-card {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  background: #f5f7fa;
}
.thumb {
  width: 100%;
  height: 100%;
  display: block;
}
.placeholder,
.video-thumb {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #909399;
  background: #f0f2f5;
}
.video-label {
  font-size: 12px;
}
.thumb-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 4px 6px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.thumb-name {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.zoom-icon {
  color: #fff;
}
.upload-tile {
  width: 104px;
  height: 104px;
}
.upload-tile :deep(.el-upload) {
  width: 104px;
  height: 104px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fff;
}
.upload-inner {
  width: 104px;
  height: 104px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #909399;
  font-size: 12px;
}
</style>

<script setup>
/**
 * 处罚单等调度单据 · 图片附件（仅图片，多图缩略图）
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, ZoomIn } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  /** 只读展示（详情） */
  readonly: {
    type: Boolean,
    default: false,
  },
  /**
   * 统一命名前缀，如「处罚单补充附件」「上报结果附件」「申诉附件」
   * 上传后自动命名为：前缀-1.jpg
   */
  namePrefix: {
    type: String,
    default: '图片附件',
  },
  max: {
    type: Number,
    default: 9,
  },
  maxSizeMb: {
    type: Number,
    default: 5,
  },
})

const emit = defineEmits(['update:modelValue'])

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i

function isImageItem(item) {
  if (!item) return false
  const url = String(item.url || '')
  const name = String(item.name || '')
  if (url.startsWith('data:image/')) return true
  if (url && IMAGE_EXT_RE.test(url)) return true
  if (name && IMAGE_EXT_RE.test(name)) return true
  // 有 url 但无扩展名：上传组件产出的 dataURL / blob 已在上传时校验
  if (url && !/\.\w{2,5}(\?|$)/.test(url.split('/').pop() || '')) return !!url
  return false
}

function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && (item.url || item.name) && isImageItem(item))
    .map((item, index) => ({
      name: item.name || `${props.namePrefix}-${index + 1}`,
      url: item.url || '',
    }))
}

const files = computed(() => normalizeList(props.modelValue))

function extFromFile(file) {
  const fromName = String(file.name || '').match(/\.([a-z0-9]+)$/i)
  if (fromName) return `.${fromName[1].toLowerCase()}`
  const type = String(file.type || '')
  if (type.includes('png')) return '.png'
  if (type.includes('webp')) return '.webp'
  if (type.includes('gif')) return '.gif'
  return '.jpg'
}

function nextIndexedName(ext) {
  const current = normalizeList(props.modelValue)
  const seq = current.length + 1
  return `${props.namePrefix}-${seq}${ext}`
}

function handleUpload(uploadFile) {
  const file = uploadFile.raw || uploadFile
  if (!file || !String(file.type || '').startsWith('image/')) {
    ElMessage.warning('附件仅支持图片格式（jpg/png/gif/webp 等）')
    return false
  }
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    ElMessage.warning(`图片大小不超过 ${props.maxSizeMb}MB`)
    return false
  }
  const current = normalizeList(props.modelValue)
  if (current.length >= props.max) {
    ElMessage.warning(`最多上传 ${props.max} 张图片`)
    return false
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    emit('update:modelValue', [
      ...current,
      {
        name: nextIndexedName(extFromFile(file)),
        url: event.target?.result || '',
      },
    ])
  }
  reader.readAsDataURL(file)
  return false
}

function removeAt(index) {
  const next = normalizeList(props.modelValue)
  next.splice(index, 1)
  // 删除后按序号重命名，保持「前缀-1、前缀-2…」连续
  const renamed = next.map((item, i) => {
    const ext = String(item.name || '').match(/(\.[a-z0-9]+)$/i)?.[1] || '.jpg'
    return {
      ...item,
      name: `${props.namePrefix}-${i + 1}${ext}`,
    }
  })
  emit('update:modelValue', renamed)
}

const previewList = computed(() => files.value.map((f) => f.url).filter(Boolean))
</script>

<template>
  <div class="dispatch-image-attachments" :class="{ 'is-readonly': readonly }">
    <div class="thumb-grid">
      <div v-for="(file, index) in files" :key="`${file.name}-${index}`" class="thumb-card">
        <el-image
          v-if="file.url"
          :src="file.url"
          :alt="file.name"
          fit="cover"
          class="thumb"
          :preview-src-list="previewList"
          :initial-index="index"
          preview-teleported
        >
          <template #error>
            <div class="thumb placeholder">无预览</div>
          </template>
        </el-image>
        <div v-else class="thumb placeholder">无预览</div>
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
        accept="image/*"
        :before-upload="handleUpload"
      >
        <div class="upload-inner">
          <el-icon :size="22"><Plus /></el-icon>
          <span>上传图片</span>
        </div>
      </el-upload>
    </div>

    <p v-if="!readonly" class="hint">
      {{ namePrefix }} · 仅支持图片，单张不超过 {{ maxSizeMb }}MB，最多 {{ max }} 张
    </p>
    <p v-else-if="!files.length" class="empty">—</p>
  </div>
</template>

<style scoped>
.dispatch-image-attachments {
  width: 100%;
}

.hint,
.empty {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.5;
}

.thumb-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.thumb-card,
.upload-tile {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  background: #f5f7fa;
  flex-shrink: 0;
}

.thumb {
  width: 96px;
  height: 96px;
  display: block;
}

.thumb :deep(.el-image__inner) {
  width: 96px;
  height: 96px;
}

.thumb.placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #909399;
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
  min-height: 28px;
}

.thumb-name {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.zoom-icon {
  color: #fff;
  font-size: 14px;
  flex-shrink: 0;
}

.upload-tile {
  border-style: dashed;
  cursor: pointer;
}

.upload-tile :deep(.el-upload) {
  width: 100%;
  height: 100%;
  display: block;
}

.upload-inner {
  width: 100%;
  height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}

.upload-inner:hover {
  color: #409eff;
}

.is-readonly .thumb-card {
  background: #fff;
}
</style>

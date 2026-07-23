<script setup>
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'

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

function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .filter((item) => item && (item.url || item.name))
    .map((item) => ({
      name: item.name || '图片',
      url: item.url || '',
    }))
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
        name: file.name,
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
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="dispatch-image-attachments" :class="{ 'is-readonly': readonly }">
    <template v-if="!readonly">
      <el-upload
        :show-file-list="false"
        accept="image/*"
        :before-upload="handleUpload"
      >
        <el-button :icon="Upload" size="small">上传图片</el-button>
      </el-upload>
      <p class="hint">仅支持图片格式，单张不超过 {{ maxSizeMb }}MB，最多 {{ max }} 张</p>
    </template>

    <ul v-if="normalizeList(modelValue).length" class="image-list">
      <li
        v-for="(file, index) in normalizeList(modelValue)"
        :key="`${file.name}-${index}`"
        class="image-item"
      >
        <a
          v-if="file.url"
          :href="file.url"
          target="_blank"
          rel="noopener noreferrer"
          class="thumb-link"
        >
          <img :src="file.url" :alt="file.name" class="thumb" />
        </a>
        <div v-else class="thumb placeholder">无预览</div>
        <div class="meta">
          <span class="name" :title="file.name">{{ file.name }}</span>
          <el-button v-if="!readonly" link type="danger" @click="removeAt(index)">删除</el-button>
        </div>
      </li>
    </ul>
    <p v-else-if="readonly" class="empty">—</p>
  </div>
</template>

<style scoped>
.dispatch-image-attachments {
  width: 100%;
}

.hint,
.empty {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.5;
}

.image-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.image-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  border-radius: 6px;
  background: #fafafa;
}

.thumb-link {
  flex-shrink: 0;
  display: block;
}

.thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 4px;
  display: block;
  background: #eee;
}

.thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #909399;
}

.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-size: 13px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-readonly .image-item {
  background: #fff;
}
</style>

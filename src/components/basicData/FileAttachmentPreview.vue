<script setup>
/**
 * 附件展示：图片缩略图可预览；所有类型支持「预览 / 下载」
 */
import { computed, ref } from 'vue'
import { Document, Picture } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  detectAttachmentKind,
  resolveAttachmentPreviewUrl,
  triggerAttachmentDownload,
} from '../../utils/fileAttachmentPreview.js'

const props = defineProps({
  name: { type: String, default: '' },
  url: { type: String, default: '' },
  /** 空态文案 */
  emptyText: { type: String, default: '未上传' },
  /** 缩略图尺寸 */
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
  /** 是否展示预览/下载操作 */
  showActions: { type: Boolean, default: true },
})

const previewVisible = ref(false)
const previewTitle = ref('')
const previewUrl = ref('')
const previewKind = ref('other')

const hasFile = computed(() => Boolean(String(props.name || '').trim() || String(props.url || '').trim()))

const displayName = computed(() => String(props.name || '').trim() || '附件')

const resolvedUrl = computed(() => resolveAttachmentPreviewUrl(props.name, props.url))

const kind = computed(() => detectAttachmentKind(props.name, resolvedUrl.value))

const isImage = computed(() => kind.value === 'image')

const previewSrc = computed(() => (isImage.value ? resolvedUrl.value : ''))

function openPreview() {
  const name = displayName.value
  const src = resolvedUrl.value
  if (!src) {
    ElMessage.warning('当前附件暂无预览内容（历史数据仅保留文件名），请重新上传后可预览')
    return
  }

  const detected = detectAttachmentKind(name, src)
  if (detected === 'other') {
    const opened = window.open(src, '_blank', 'noopener,noreferrer')
    if (!opened) {
      triggerAttachmentDownload(name, props.url)
      ElMessage.success('已触发下载，可在本地查看附件')
    } else {
      ElMessage.success('已在新窗口打开附件')
    }
    return
  }

  previewTitle.value = name
  previewUrl.value = src
  previewKind.value = detected === 'pdf' ? 'pdf' : detected
  previewVisible.value = true
}

function handleDownload() {
  const ok = triggerAttachmentDownload(displayName.value, props.url)
  if (!ok) {
    ElMessage.warning('当前附件暂无内容，请重新上传后可下载')
    return
  }
  ElMessage.success('已开始下载附件')
}
</script>

<template>
  <div v-if="!hasFile" class="attach-empty">{{ emptyText }}</div>
  <div v-else class="attach-wrap" :class="`size-${size}`">
    <div v-if="isImage && previewSrc" class="attach-image">
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
    </div>
    <div v-else class="attach-file">
      <el-icon class="attach-file-icon"><Document /></el-icon>
    </div>

    <div class="attach-main">
      <span class="attach-name" :title="displayName">{{ displayName }}</span>
      <div v-if="showActions" class="attach-actions">
        <el-button link type="primary" @click="openPreview">预览</el-button>
        <el-button link type="primary" @click="handleDownload">下载</el-button>
      </div>
    </div>
  </div>

  <el-dialog
    v-model="previewVisible"
    :title="previewTitle || '附件预览'"
    width="860px"
    destroy-on-close
    append-to-body
    class="attachment-preview-dialog"
  >
    <div class="preview-body">
      <el-image
        v-if="previewKind === 'image'"
        :src="previewUrl"
        fit="contain"
        class="preview-image"
        :preview-src-list="[previewUrl]"
        preview-teleported
      />
      <iframe
        v-else-if="previewKind === 'pdf' || previewKind === 'html'"
        class="preview-frame"
        :src="previewUrl"
        title="附件预览"
      />
    </div>
  </el-dialog>
</template>

<style scoped>
.attach-empty {
  font-size: 13px;
  color: var(--ap-text-muted, #8a94a6);
}

.attach-wrap {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}

.attach-image {
  flex-shrink: 0;
}

.attach-thumb {
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
  justify-content: center;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  border: 1px solid var(--ap-border, #dce3ec);
  background: #f8fafc;
}

.size-md .attach-file {
  width: 48px;
  height: 48px;
}

.size-lg .attach-file {
  width: 72px;
  height: 72px;
}

.attach-file-icon {
  color: var(--ap-primary, #8f0045);
  font-size: 20px;
}

.attach-main {
  min-width: 0;
  flex: 1;
}

.attach-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--ap-text-secondary, #5c6573);
  line-height: 1.4;
}

.attach-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.attach-actions :deep(.el-button) {
  padding: 0;
  height: auto;
  font-size: 13px;
}

.preview-body {
  min-height: 420px;
}

.preview-image {
  width: 100%;
  max-height: 70vh;
}

.preview-frame {
  width: 100%;
  min-height: 420px;
  border: 0;
  background: #fff;
}
</style>

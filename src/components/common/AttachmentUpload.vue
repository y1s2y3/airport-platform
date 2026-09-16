<script setup>
/**
 * 系统附件位：按档位校验类型/大小/个数，多文件用换行网格展示。
 * v-model 为数组；传入字符串会规范化后回写成数组。
 */
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Document, Plus, VideoCamera, ZoomIn } from '@element-plus/icons-vue'
import {
  attachHint,
  asAttachList,
  detectAttachKind,
  getAttachPreset,
  normalizeAttachItem,
  validateAttachFile,
} from '../../constants/attachmentUpload.js'

const props = defineProps({
  modelValue: { type: [Array, String, Object], default: () => [] },
  preset: { type: String, default: 'file' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 9 },
  readonly: { type: Boolean, default: false },
  namePrefix: { type: String, default: '附件' },
  nameKey: { type: String, default: 'name' },
  urlKey: { type: String, default: 'url' },
  sizeKey: { type: String, default: 'size' },
  hint: { type: String, default: '' },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const conf = computed(() => getAttachPreset(props.preset))

const files = computed(() =>
  asAttachList(props.modelValue).map((item, index) => ({
    ...item,
    kind: item.kind || detectAttachKind(item, props.preset),
    _index: index,
  })),
)

const canAdd = computed(() => !props.readonly && files.value.length < props.max)

const previewList = computed(() =>
  files.value.filter((f) => f.kind === 'image' && f.url).map((f) => f.url),
)

const hintText = computed(
  () => props.hint || attachHint(props.preset, { min: props.min, max: props.max }),
)

function emitList(list) {
  emit('update:modelValue', list)
}

function buildItem(file, url, index) {
  const kind = detectAttachKind(file, props.preset) || (props.preset === 'image' ? 'image' : 'file')
  const extMatch = String(file.name || '').match(/(\.[a-z0-9]+)$/i)
  const ext = extMatch ? extMatch[1].toLowerCase() : kind === 'video' ? '.mp4' : kind === 'image' ? '.jpg' : ''
  const name = file.name || `${props.namePrefix}-${index + 1}${ext}`
  return {
    [props.nameKey]: name,
    [props.urlKey]: url,
    [props.sizeKey]: file.size || 0,
    name,
    url,
    size: file.size || 0,
    kind,
  }
}

function handleUpload(uploadFile) {
  const file = uploadFile.raw || uploadFile
  const err = validateAttachFile(file, props.preset, {
    currentCount: files.value.length,
    max: props.max,
  })
  if (err) {
    ElMessage.warning(err)
    return false
  }
  const current = asAttachList(props.modelValue)
  const reader = new FileReader()
  reader.onload = (event) => {
    const url = event.target?.result || ''
    emitList([...current, buildItem(file, url, current.length)])
  }
  reader.readAsDataURL(file)
  return false
}

function removeAt(index) {
  const next = asAttachList(props.modelValue)
  next.splice(index, 1)
  emitList(next.map((item, i) => normalizeAttachItem(item, i)))
}

function imagePreviewIndex(file) {
  return Math.max(0, previewList.value.indexOf(file.url))
}

function isThumb(file) {
  return file.kind === 'image' || file.kind === 'video'
}

function openFile(file) {
  if (file?.url) {
    window.open(file.url, '_blank', 'noopener,noreferrer')
    return
  }
  ElMessage.info(`预览附件：${file?.name || '附件'}`)
}
</script>

<template>
  <div
    class="ap-attach-upload"
    :class="{ 'is-readonly': readonly, 'is-compact': compact }"
  >
    <div class="ap-attach-grid">
      <div
        v-for="file in files"
        :key="`${file.name}-${file._index}`"
        class="ap-attach-item"
        :class="isThumb(file) ? 'is-thumb' : 'is-file'"
      >
        <template v-if="isThumb(file)">
          <el-image
            v-if="file.kind === 'image' && file.url"
            :src="file.url"
            :alt="file.name"
            fit="cover"
            class="ap-attach-thumb"
            :preview-src-list="previewList"
            :initial-index="imagePreviewIndex(file)"
            preview-teleported
          >
            <template #error>
              <div class="ap-attach-placeholder">无预览</div>
            </template>
          </el-image>
          <button
            v-else
            type="button"
            class="ap-attach-placeholder"
            :class="{ 'is-video': file.kind === 'video' }"
            @click="openFile(file)"
          >
            <el-icon :size="24">
              <VideoCamera v-if="file.kind === 'video'" />
              <ZoomIn v-else />
            </el-icon>
            <span>{{ file.kind === 'video' ? '视频' : '图片' }}</span>
          </button>
          <div class="ap-attach-mask">
            <span class="ap-attach-filename" :title="file.name">{{ file.name }}</span>
            <el-button v-if="!readonly" link type="danger" size="small" @click.stop="removeAt(file._index)">
              删除
            </el-button>
            <el-icon v-else class="ap-attach-zoom"><ZoomIn /></el-icon>
          </div>
        </template>
        <template v-else>
          <button type="button" class="ap-attach-filechip" @click="openFile(file)">
            <el-icon class="ap-attach-file-icon"><Document /></el-icon>
            <span class="ap-attach-filename" :title="file.name">{{ file.name }}</span>
          </button>
          <el-button
            v-if="!readonly"
            class="ap-attach-file-del"
            link
            type="danger"
            size="small"
            @click.stop="removeAt(file._index)"
          >
            删除
          </el-button>
        </template>
      </div>

      <el-upload
        v-if="canAdd"
        class="ap-attach-add"
        :class="{ 'is-file': preset !== 'image' && preset !== 'media' }"
        :show-file-list="false"
        :accept="conf.accept"
        :multiple="max > 1"
        :before-upload="handleUpload"
      >
        <div class="ap-attach-add-inner">
          <el-icon :size="20"><Plus /></el-icon>
          <span>{{ preset === 'image' ? '上传图片' : preset === 'media' ? '上传图片/视频' : '上传文件' }}</span>
        </div>
      </el-upload>
    </div>
    <p v-if="!readonly" class="ap-attach-hint">{{ hintText }}</p>
    <p v-else-if="!files.length" class="ap-attach-empty">--</p>
  </div>
</template>

<style scoped>
.ap-attach-upload {
  width: 100%;
  min-width: 0;
}
.ap-attach-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: stretch;
}
.ap-attach-item.is-thumb,
.ap-attach-add:not(.is-file) {
  position: relative;
  width: 96px;
  height: 96px;
  flex: 0 0 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter, #ebeef5);
  background: #f5f7fa;
}
.is-compact .ap-attach-item.is-thumb,
.is-compact .ap-attach-add:not(.is-file) {
  width: 80px;
  height: 80px;
  flex-basis: 80px;
}
.ap-attach-thumb {
  width: 100%;
  height: 100%;
  display: block;
}
.ap-attach-thumb :deep(.el-image__inner) {
  width: 100%;
  height: 100%;
}
.ap-attach-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  background: #f0f2f5;
  border: 0;
  cursor: pointer;
}
.ap-attach-mask {
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
.ap-attach-mask .ap-attach-filename {
  color: #fff;
  font-size: 10px;
}
.ap-attach-zoom {
  color: #fff;
  flex-shrink: 0;
}
.ap-attach-item.is-file {
  position: relative;
  flex: 1 1 200px;
  min-width: 180px;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}
.is-compact .ap-attach-item.is-file {
  flex: 1 1 140px;
  min-width: 140px;
  max-width: 100%;
}
.ap-attach-placeholder {
  border: 0;
  cursor: pointer;
}
.ap-attach-filechip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.ap-attach-file-icon {
  flex-shrink: 0;
  color: var(--el-color-primary);
  font-size: 18px;
}
.ap-attach-filename {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #303133;
}
.ap-attach-file-del {
  flex-shrink: 0;
}
.ap-attach-add {
  cursor: pointer;
}
.ap-attach-add.is-file {
  flex: 0 0 auto;
  width: auto;
  height: auto;
  border: none;
  background: transparent;
}
.ap-attach-add :deep(.el-upload) {
  display: block;
  width: 100%;
  height: 100%;
}
.ap-attach-add:not(.is-file) {
  border-style: dashed;
}
.ap-attach-add-inner {
  width: 100%;
  height: 100%;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}
.is-compact .ap-attach-add-inner {
  min-height: 80px;
}
.ap-attach-add.is-file .ap-attach-add-inner {
  min-height: 40px;
  min-width: 104px;
  padding: 8px 12px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background: #fff;
}
.ap-attach-add-inner:hover {
  color: #409eff;
}
.ap-attach-hint,
.ap-attach-empty {
  margin: 8px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}
</style>

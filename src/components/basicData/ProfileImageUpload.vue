<script setup>
import { computed } from 'vue'
import { isUploadedImage } from '../../mock/profileImageDemo'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  demoSrc: {
    type: String,
    default: '',
  },
  demoVariant: {
    type: String,
    default: 'photo',
    validator: (value) => ['photo', 'certificate'].includes(value),
  },
  compact: {
    type: Boolean,
    default: false,
  },
  /** 操作区置于图片右侧 */
  sideActions: {
    type: Boolean,
    default: false,
  },
  hint: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const isUploaded = computed(() => isUploadedImage(props.modelValue))
const showPhotoPreview = computed(() => {
  if (isUploaded.value) return true
  return props.demoVariant === 'photo' && Boolean(props.demoSrc)
})
const showCertificateDemo = computed(() => !isUploaded.value && props.demoVariant === 'certificate')
const previewSrc = computed(() => {
  if (isUploaded.value) return props.modelValue
  if (props.demoVariant === 'photo') return props.demoSrc
  return ''
})

function beforeUpload(file) {
  if (!file.type.startsWith('image/')) return false
  const reader = new FileReader()
  reader.onload = () => {
    emit('update:modelValue', String(reader.result || ''))
  }
  reader.readAsDataURL(file)
  return false
}

function clearImage() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div
    class="profile-image-upload"
    :class="{
      compact,
      'is-certificate': demoVariant === 'certificate',
      'side-actions': sideActions,
    }"
  >
    <div class="preview-box" :class="{ 'preview-box--certificate': showCertificateDemo }">
      <img v-if="showPhotoPreview && previewSrc" :src="previewSrc" alt="图片预览" class="preview-img" />
      <div v-else-if="showCertificateDemo" class="certificate-demo">
        <div class="certificate-demo__frame">
          <div class="certificate-demo__title">证 书</div>
          <div class="certificate-demo__line" />
          <div class="certificate-demo__line certificate-demo__line--short" />
          <div class="certificate-demo__line certificate-demo__line--short" />
          <div class="certificate-demo__seal" />
        </div>
        <span class="demo-tag demo-tag--cert">演示</span>
      </div>
      <div v-else class="preview-empty">暂无图片</div>
      <span v-if="showPhotoPreview && !isUploaded" class="demo-tag">演示</span>
    </div>
    <div class="upload-side">
      <div class="upload-actions">
        <el-upload :show-file-list="false" accept="image/*" :before-upload="beforeUpload">
          <el-button
            v-if="sideActions"
            size="small"
            type="primary"
            plain
          >
            {{ modelValue ? '更换文件' : '选择文件' }}
          </el-button>
          <el-button v-else size="small" type="primary" link>
            {{ modelValue ? '更换图片' : '上传图片' }}
          </el-button>
        </el-upload>
        <el-button v-if="modelValue" size="small" link type="danger" @click="clearImage">清除</el-button>
      </div>
      <div v-if="hint" class="upload-hint">{{ hint }}</div>
    </div>
  </div>
</template>

<style scoped>
.profile-image-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.profile-image-upload.side-actions {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  width: auto;
}

.profile-image-upload.compact .preview-box {
  width: 120px;
  height: 84px;
}

.profile-image-upload.is-certificate.compact .preview-box {
  width: 112px;
  height: 78px;
}

.profile-image-upload.side-actions .preview-box {
  width: 160px;
  max-width: 160px;
  height: 100px;
  flex-shrink: 0;
}

.preview-box {
  position: relative;
  width: 100%;
  max-width: 160px;
  height: 100px;
  border: 1px dashed #7ea8c9;
  border-radius: 4px;
  background: #f8fbfd;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-box--certificate {
  border-style: solid;
  border-color: #c9d8e6;
  background: #fafbfd;
  padding: 4px;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-empty {
  font-size: 12px;
  color: #999;
}

.certificate-demo {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.certificate-demo__frame {
  position: relative;
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  border: 1.5px solid #b8860b;
  border-radius: 2px;
  background: linear-gradient(180deg, #fffef8 0%, #f7f3e8 100%);
  box-shadow: inset 0 0 0 1px rgba(184, 134, 11, 0.15);
  padding: 6px 8px 8px;
  overflow: hidden;
}

.certificate-demo__title {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #8b4513;
  letter-spacing: 3px;
  line-height: 1.2;
}

.certificate-demo__line {
  height: 3px;
  margin-top: 5px;
  border-radius: 2px;
  background: linear-gradient(90deg, #e8dcc8, #f5efe3, #e8dcc8);
}

.certificate-demo__line--short {
  width: 72%;
  margin-left: auto;
  margin-right: auto;
}

.certificate-demo__seal {
  position: absolute;
  right: 6px;
  bottom: 5px;
  width: 22px;
  height: 22px;
  border: 1.5px solid rgba(196, 30, 58, 0.75);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, rgba(255, 120, 120, 0.35), rgba(196, 30, 58, 0.12));
}

.certificate-demo__seal::after {
  content: '章';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  color: rgba(196, 30, 58, 0.85);
}

.demo-tag {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
}

.demo-tag--cert {
  top: 2px;
  right: 2px;
  font-size: 10px;
  background: rgba(139, 69, 19, 0.72);
}

.upload-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.side-actions .upload-side {
  align-items: flex-start;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.side-actions .upload-actions {
  justify-content: flex-start;
}

.upload-hint {
  font-size: 12px;
  color: var(--ap-text-muted, #8a94a6);
  line-height: 1.45;
  max-width: 220px;
}
</style>

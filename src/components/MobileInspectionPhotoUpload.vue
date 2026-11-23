<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { validateAttachFile } from '../constants/attachmentUpload.js'

const photos = defineModel({ type: Array, required: true })
const reading = defineModel('reading', { type: Boolean, default: false })
const input = ref(null)

function choosePhoto(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || reading.value) return
  const error = validateAttachFile(file, 'image', { currentCount: photos.value.length })
  if (error) {
    ElMessage.warning(error)
    return
  }

  const reader = new FileReader()
  reading.value = true
  reader.onload = () => {
    photos.value = [...photos.value, { name: file.name, url: reader.result }]
  }
  reader.onerror = () => ElMessage.warning('巡检照片读取失败，请重新上传')
  reader.onloadend = () => { reading.value = false }
  reader.readAsDataURL(file)
}

function removePhoto(index) {
  photos.value = photos.value.filter((_, photoIndex) => photoIndex !== index)
}
</script>

<template>
  <div class="mobile-inspection-photo-upload">
    <div v-for="(photo, index) in photos" :key="index" class="photo-box">
      <img :src="photo.url" :alt="photo.name" />
      <button type="button" class="photo-del" :aria-label="`移除巡检照片 ${index + 1}`" @click="removePhoto(index)">✕</button>
    </div>
    <input ref="input" type="file" accept="image/*" capture="environment" hidden @change="choosePhoto" />
    <button type="button" class="photo-add" aria-label="上传巡检照片" :disabled="reading" @click="input.click()">
      {{ reading ? '读取中…' : '+ 上传照片' }}
    </button>
  </div>
</template>

<style scoped>
.mobile-inspection-photo-upload { flex: 1; display: flex; gap: 8px; flex-wrap: wrap; }
.photo-box { width: 56px; height: 56px; position: relative; }
.photo-box img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.photo-del { position: absolute; top: 2px; right: 2px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(0, 0, 0, .65); color: #fff; font-size: 12px; cursor: pointer; }
.photo-add { width: 68px; min-height: 56px; border: 1.5px dashed #ddd; border-radius: 8px; background: #fafafa; font-size: 12px; color: #616975; cursor: pointer; }
.photo-add:disabled { cursor: wait; }
</style>

<script setup>
/**
 * 建管 APP · 新版本弹窗
 * 展示新版本号、发布日期、更新内容与安装包信息，并提供「下载更新」
 * 定位说明：position: fixed 在手机壳（有 transform）内以手机壳为包含块，故各页均可直接复用
 */
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** checkAppUpdate() 的返回结果 */
  info: { type: Object, default: null },
})
const emit = defineEmits(['update:visible'])

const downloading = ref(false)

function close() {
  if (downloading.value) return
  emit('update:visible', false)
}

function onDownload() {
  if (downloading.value || !props.info) return
  downloading.value = true
  ElMessage.info('更新包下载中，请稍候…')
  setTimeout(() => {
    downloading.value = false
    ElMessage.success('更新包下载完成，安装后即可使用新版本')
    emit('update:visible', false)
  }, 1200)
}
</script>

<template>
  <div v-if="visible && info" class="update-mask" @click.self="close">
    <div class="update-dialog" role="dialog" aria-label="发现新版本">
      <div class="dialog-head">
        <span class="head-title">发现新版本</span>
        <button type="button" class="head-close" aria-label="关闭" @click="close">×</button>
      </div>
      <div class="dialog-body">
        <div class="version-row">
          <span class="version-current">{{ info.currentVersion }}</span>
          <span class="version-arrow" aria-hidden="true">→</span>
          <span class="version-new">{{ info.latestVersion }}</span>
          <span class="version-date">{{ info.releaseDate }}</span>
        </div>
        <div class="section-label">更新内容</div>
        <ul class="note-list">
          <li v-for="(item, idx) in info.releaseNotes" :key="idx">{{ item }}</li>
        </ul>
        <div class="package-row">
          <span class="package-name">{{ info.packageName }}</span>
          <span class="package-size">{{ info.packageSize }}</span>
        </div>
      </div>
      <div class="dialog-foot">
        <button type="button" class="btn-plain" @click="close">稍后再说</button>
        <button type="button" class="btn-primary" :disabled="downloading" @click="onDownload">
          {{ downloading ? '下载中…' : '下载更新' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.update-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60px;
  box-sizing: border-box;
}
.update-dialog {
  width: 100%;
  max-width: 880px;
  background: #fff;
  border-radius: 28px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 70%;
}
.dialog-head {
  display: flex;
  align-items: center;
  padding: 28px 32px;
  border-bottom: 1px solid #f0f2f5;
  flex-shrink: 0;
}
.head-title {
  flex: 1;
  font-size: 32px;
  font-weight: 600;
  color: #1f2329;
}
.head-close {
  width: 56px;
  height: 56px;
  border: none;
  background: transparent;
  color: #909399;
  font-size: 44px;
  line-height: 1;
  cursor: pointer;
}
.dialog-body {
  padding: 28px 32px;
  overflow: auto;
}
.version-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.version-current {
  font-size: 26px;
  color: #909399;
}
.version-arrow {
  font-size: 24px;
  color: #c0c4cc;
}
.version-new {
  font-size: 34px;
  font-weight: 600;
  color: #8f0045;
}
.version-date {
  font-size: 24px;
  color: #909399;
}
.section-label {
  margin: 24px 0 12px;
  font-size: 26px;
  color: #606266;
}
.note-list {
  margin: 0;
  padding-left: 30px;
  font-size: 26px;
  line-height: 1.7;
  color: #303133;
}
.note-list li {
  margin-bottom: 8px;
}
.package-row {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 24px;
  color: #909399;
}
.dialog-foot {
  display: flex;
  gap: 20px;
  padding: 24px 32px 32px;
  flex-shrink: 0;
}
.btn-plain,
.btn-primary {
  height: 84px;
  border-radius: 42px;
  font-size: 30px;
  cursor: pointer;
}
.btn-plain {
  flex: 1;
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #606266;
}
.btn-primary {
  flex: 1.4;
  border: none;
  background: #8f0045;
  color: #fff;
  font-weight: 600;
}
.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>

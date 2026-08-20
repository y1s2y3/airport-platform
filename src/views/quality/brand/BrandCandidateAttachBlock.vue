<script setup>
/**
 * 备选品牌：附件按类型勾选后可上传多个文件 + 备注
 * editable=true 用于新建；false 用于审批/待办只读展示
 */
import { Document } from '@element-plus/icons-vue'
import { ATTACH_TYPE } from '../../../mock/brand.js'

defineProps({
  /** 备选对象：需含 attachSlots / remark */
  candidate: { type: Object, required: true },
  editable: { type: Boolean, default: true },
  /** 只读时是否展示未勾选类型（默认仅展示已有文件的类型） */
  showEmptySlots: { type: Boolean, default: false },
})

function ensureFiles(slot) {
  if (!Array.isArray(slot.files)) slot.files = []
  return slot.files
}

function onCheckChange(slot) {
  if (!slot.is_checked) {
    slot.files = []
  } else {
    ensureFiles(slot)
  }
}

function onFileChange(slot, uploadFile) {
  const raw = uploadFile?.raw
  if (!raw) return
  slot.is_checked = true
  const files = ensureFiles(slot)
  files.push({
    file_name: raw.name,
    file_url: URL.createObjectURL(raw),
  })
}

function removeFile(slot, index) {
  const files = ensureFiles(slot)
  files.splice(index, 1)
}

function slotHasFiles(slot) {
  return ensureFiles(slot).some((f) => (f.file_name || '').trim())
}

function visibleSlots(candidate, showEmptySlots) {
  const slots = candidate.attachSlots || []
  if (showEmptySlots) return slots
  return slots.filter((s) => slotHasFiles(s))
}
</script>

<template>
  <div class="attach-block" :class="{ 'is-readonly': !editable }">
    <div class="attach-title">
      附件
      <span v-if="editable" class="attach-sub">自行勾选上传，每类可传多个，非强制</span>
    </div>

    <template v-if="editable">
      <div class="attach-list is-edit">
        <div
          v-for="slot in candidate.attachSlots"
          :key="slot.attach_type"
          class="attach-item"
          :class="{ 'is-checked': slot.is_checked }"
        >
          <div class="attach-row">
            <el-checkbox v-model="slot.is_checked" @change="onCheckChange(slot)">
              {{ ATTACH_TYPE[slot.attach_type] || slot.attach_type }}
            </el-checkbox>
            <el-upload
              v-if="slot.is_checked"
              :show-file-list="false"
              :auto-upload="false"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
              @change="(f) => onFileChange(slot, f)"
            >
              <el-button size="small" type="primary" plain>上传文件</el-button>
            </el-upload>
          </div>
          <ul v-if="slot.is_checked && ensureFiles(slot).length" class="file-list">
            <li v-for="(f, fi) in ensureFiles(slot)" :key="`${f.file_name}-${fi}`" class="file-li">
              <span class="file-name" :title="f.file_name">{{ f.file_name }}</span>
              <el-button size="small" type="danger" plain @click="removeFile(slot, fi)">
                删除
              </el-button>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        v-if="visibleSlots(candidate, showEmptySlots).length"
        class="attach-readonly-list"
      >
        <div
          v-for="slot in visibleSlots(candidate, showEmptySlots)"
          :key="slot.attach_type"
          class="attach-readonly-group"
        >
          <div class="attach-type-name">
            {{ ATTACH_TYPE[slot.attach_type] || slot.attach_type }}
          </div>
          <ul class="attach-readonly-files">
            <li
              v-for="(f, fi) in ensureFiles(slot)"
              :key="`${f.file_name}-${fi}`"
              class="attach-readonly-file"
            >
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="file-name" :title="f.file_name">{{ f.file_name || '—' }}</span>
            </li>
          </ul>
        </div>
      </div>
      <p v-else class="empty-hint">未上传附件</p>
    </template>

    <div class="remark-row">
      <span class="remark-label">备注</span>
      <el-input
        v-if="editable"
        v-model="candidate.remark"
        type="textarea"
        :rows="2"
        maxlength="200"
        show-word-limit
        placeholder="选填：对本备选品牌的说明" aria-label="选填：对本备选品牌的说明"/>
      <span v-else class="remark-text">{{ candidate.remark?.trim() ? candidate.remark : '—' }}</span>
    </div>
  </div>
</template>

<style scoped>
.attach-block {
  margin-top: 4px;
  padding: 12px 14px;
  background: #f7f8fa;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.attach-block.is-readonly {
  background: #fff;
  border-color: #eef0f3;
}

.attach-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 10px;
}

.attach-sub {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: #909399;
}

.attach-list.is-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attach-item {
  padding: 6px 8px;
  border-radius: 6px;
}

.attach-item.is-checked {
  background: #fff;
  border: 1px solid #e4e7ed;
}

.attach-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-height: 32px;
}

.file-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0 4px 28px;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #303133;
}

/* —— 只读详情展示 —— */
.attach-readonly-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.attach-readonly-group {
  padding: 10px 12px;
  background: #fafbfc;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.attach-type-name {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}

.attach-readonly-files {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attach-readonly-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.file-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--el-color-primary);
}

.empty-hint {
  margin: 0 0 4px;
  font-size: 13px;
  color: #909399;
}

.remark-row {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #e4e7ed;
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.remark-label {
  flex: 0 0 40px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  line-height: 22px;
}

.remark-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
}
</style>

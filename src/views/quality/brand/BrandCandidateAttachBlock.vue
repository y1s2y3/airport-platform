<script setup>
/**
 * 备选品牌：附件按类型自行勾选上传 + 备注
 * editable=true 用于新建；false 用于审批/待办只读展示
 */
import { ATTACH_TYPE } from '../../../mock/brand.js'

defineProps({
  /** 备选对象：需含 attachSlots / remark；编辑态另含 brand_name 等 */
  candidate: { type: Object, required: true },
  editable: { type: Boolean, default: true },
  /** 只读时是否展示未勾选类型（默认仅展示已勾选） */
  showEmptySlots: { type: Boolean, default: false },
})

function onCheckChange(slot) {
  if (!slot.is_checked) {
    slot.file_name = ''
    slot.file_url = ''
  }
}

function onFileChange(slot, uploadFile) {
  const raw = uploadFile?.raw
  if (!raw) return
  slot.is_checked = true
  slot.file_name = raw.name
  slot.file_url = URL.createObjectURL(raw)
}

function clearFile(slot) {
  slot.file_name = ''
  slot.file_url = ''
}

function visibleSlots(candidate, showEmptySlots) {
  const slots = candidate.attachSlots || []
  if (showEmptySlots) return slots
  return slots.filter((s) => s.is_checked && s.file_name)
}
</script>

<template>
  <div class="attach-block" :class="{ 'is-readonly': !editable }">
    <div class="attach-title">附件<span class="attach-sub">自行勾选上传，非强制</span></div>
    <div class="attach-list" :class="{ 'is-edit': editable }">
      <div
        v-for="slot in editable ? candidate.attachSlots : visibleSlots(candidate, showEmptySlots)"
        :key="slot.attach_type"
        class="attach-row"
        :class="{ 'is-checked': slot.is_checked }"
      >
        <template v-if="editable">
          <el-checkbox v-model="slot.is_checked" @change="onCheckChange(slot)">
            {{ ATTACH_TYPE[slot.attach_type] || slot.attach_type }}
          </el-checkbox>
          <div v-if="slot.is_checked" class="attach-actions">
            <span v-if="slot.file_name" class="file-name" :title="slot.file_name">
              {{ slot.file_name }}
            </span>
            <el-upload
              :show-file-list="false"
              :auto-upload="false"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip"
              @change="(f) => onFileChange(slot, f)"
            >
              <el-button link type="primary">{{ slot.file_name ? '重新上传' : '上传文件' }}</el-button>
            </el-upload>
            <el-button v-if="slot.file_name" link type="danger" @click="clearFile(slot)">清除</el-button>
          </div>
        </template>
        <template v-else>
          <el-tag size="small" type="info" effect="plain">
            {{ ATTACH_TYPE[slot.attach_type] || slot.attach_type }}
          </el-tag>
          <a v-if="slot.file_url" class="file-link" :href="slot.file_url" @click.prevent>
            {{ slot.file_name || '已上传' }}
          </a>
          <span v-else class="file-name">{{ slot.file_name || '—' }}</span>
        </template>
      </div>
    </div>
    <p
      v-if="!editable && !visibleSlots(candidate, showEmptySlots).length"
      class="empty-hint"
    >
      未上传附件
    </p>

    <div class="remark-row">
      <span class="remark-label">备注</span>
      <el-input
        v-if="editable"
        v-model="candidate.remark"
        type="textarea"
        :rows="2"
        maxlength="200"
        show-word-limit
        placeholder="选填：对本备选品牌的说明"
      />
      <span v-else class="remark-text">{{ candidate.remark?.trim() ? candidate.remark : '—' }}</span>
    </div>
  </div>
</template>

<style scoped>
.attach-block {
  margin-top: 4px;
  padding: 12px;
  background: #f7f8fa;
  border: 1px solid #eef0f3;
  border-radius: 8px;
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
  gap: 6px;
}
.attach-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  min-height: 32px;
  padding: 4px 8px;
  border-radius: 6px;
}
.attach-row.is-checked {
  background: #fff;
  border: 1px solid #e4e7ed;
}
.attach-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.file-name {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #303133;
}
.file-link {
  font-size: 13px;
  color: var(--el-color-primary);
  cursor: default;
}
.empty-hint {
  margin: 0 0 8px;
  font-size: 12px;
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
  line-height: 32px;
}
.remark-text {
  flex: 1;
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
  white-space: pre-wrap;
}
</style>

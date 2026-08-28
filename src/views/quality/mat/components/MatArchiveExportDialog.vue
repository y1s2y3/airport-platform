<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ARCHIVE_EXPORT_SECTIONS,
  DEFAULT_ARCHIVE_EXPORT_KEYS,
} from '../../../../utils/matEntryArchiveExport.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const checkedKeys = ref([...DEFAULT_ARCHIVE_EXPORT_KEYS])

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) checkedKeys.value = [...DEFAULT_ARCHIVE_EXPORT_KEYS]
  },
)

function close() {
  emit('update:modelValue', false)
}

function onConfirm() {
  if (!checkedKeys.value.length) {
    ElMessage.warning('请至少选择一项导出内容')
    return
  }
  emit('confirm', [...checkedKeys.value])
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="选择导出文件内容"
    width="520px"
    :close-on-click-modal="!loading"
    :close-on-press-escape="!loading"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <p class="dialog-tip">勾选需要写入归档 Word 的表格内容，确认后按选择导出。</p>
    <el-checkbox-group v-model="checkedKeys" class="export-check-group">
      <el-checkbox
        v-for="item in ARCHIVE_EXPORT_SECTIONS"
        :key="item.key"
        :value="item.key"
        :label="item.key"
      >
        {{ item.label }}
      </el-checkbox>
    </el-checkbox-group>
    <template #footer>
      <el-button :disabled="loading" @click="close">取消</el-button>
      <el-button type="primary" :loading="loading" @click="onConfirm">确认导出</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-tip {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.export-check-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.export-check-group :deep(.el-checkbox) {
  height: auto;
  align-items: flex-start;
  margin-right: 0;
  white-space: normal;
}
.export-check-group :deep(.el-checkbox__label) {
  line-height: 1.5;
}
</style>

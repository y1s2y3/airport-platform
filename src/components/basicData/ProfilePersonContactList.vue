<script setup>
/**
 * 多人联系人：复用项目画像 ProfilePersonContactInput
 * 存储为「姓名/手机号」英文逗号拼接；界面可保留未填完的空行以便「添加人员」
 */
import { ref, watch, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ProfilePersonContactInput from './ProfilePersonContactInput.vue'
import { formatContact, parseContacts } from '../../utils/contactValue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  /** 最少人数（必填场景可设 1） */
  min: { type: Number, default: 0 },
  /** 最多人数 */
  max: { type: Number, default: 5 },
})

const emit = defineEmits(['update:modelValue'])

let rowUid = 0
function createRow(value = '') {
  rowUid += 1
  return { id: rowUid, value: String(value || '') }
}

const rows = ref([createRow('')])

const canAdd = computed(() => !props.readonly && rows.value.length < props.max)

function serializeRows(list) {
  return list
    .map((item) => {
      const raw = typeof item === 'string' ? item : item.value
      const c = parseContacts(raw)[0]
      if (!c) return ''
      const name = String(c.name || '').trim()
      const phone = String(c.phone || '').trim()
      if (!name && !phone) return ''
      if (!phone) return name
      return `${name}/${phone}`
    })
    .filter(Boolean)
    .join(',')
}

function parseToRows(raw) {
  const list = parseContacts(raw).map((c) => formatContact(c.name, c.phone)).filter(Boolean)
  const capped = list.slice(0, props.max)
  if (!capped.length) return props.readonly ? [] : [createRow('')]
  return capped.map((value) => createRow(value))
}

watch(
  () => props.modelValue,
  (value) => {
    const incoming = serializeRows(parseContacts(value).map((c) => formatContact(c.name, c.phone)))
    const current = serializeRows(rows.value)
    // 外部赋值变化时才重置；本地添加空行不会改变 serialize 结果，避免被冲掉
    if (incoming !== current) {
      rows.value = parseToRows(value)
    }
  },
  { immediate: true },
)

function emitParent() {
  emit('update:modelValue', serializeRows(rows.value))
}

function updateAt(index, value) {
  const next = rows.value.slice()
  if (!next[index]) return
  next[index] = { ...next[index], value: value || '' }
  rows.value = next
  emitParent()
}

function addRow() {
  if (rows.value.length >= props.max) {
    ElMessage.warning(`最多添加 ${props.max} 人`)
    return
  }
  rows.value = [...rows.value, createRow('')]
}

function removeRow(index) {
  if (rows.value.length <= props.min) return
  const next = rows.value.filter((_, i) => i !== index)
  if (!next.length && props.min > 0) {
    rows.value = [createRow('')]
  } else {
    rows.value = next
  }
  emitParent()
}
</script>

<template>
  <div class="profile-person-contact-list">
    <div v-for="(row, index) in rows" :key="row.id" class="contact-list-row">
      <ProfilePersonContactInput
        class="contact-list-input"
        :model-value="row.value"
        :readonly="readonly"
        action-layout="inline"
        @update:model-value="(v) => updateAt(index, v)"
      />
      <el-button
        v-if="!readonly"
        class="remove-btn"
        :icon="Delete"
        circle
        size="small"
        title="删除"
        :disabled="rows.length <= min"
        @click="removeRow(index)"
      />
    </div>
    <el-button
      v-if="!readonly"
      type="primary"
      link
      :icon="Plus"
      :disabled="!canAdd"
      @click="addRow"
    >
      添加人员{{ max > 0 ? `（${rows.length}/${max}）` : '' }}
    </el-button>
  </div>
</template>

<style scoped>
.profile-person-contact-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.contact-list-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.contact-list-input {
  flex: 1;
  min-width: 0;
}

.remove-btn {
  flex-shrink: 0;
}
</style>

<script setup>
import { computed } from 'vue'
import { listProfilePersons } from '../../mock/projectSafetyProfile'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  /** 是否多选；报审单人员字段用单选 */
  multiple: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const catalogPersons = listProfilePersons()

function parseOneContact(raw) {
  const text = String(raw || '').trim()
  if (!text) return { name: '', phone: '' }
  const slashParts = text.split(/\s*\/\s*/)
  if (slashParts.length >= 2) {
    const phone = slashParts[slashParts.length - 1].trim()
    if (/\d{7,}/.test(phone)) {
      return {
        name: slashParts.slice(0, -1).join(' / ').trim(),
        phone,
      }
    }
  }
  const glued = text.match(/^(.+?)(\d{11})$/)
  if (glued) {
    return { name: glued[1].trim(), phone: glued[2] }
  }
  return { name: text, phone: '' }
}

function parseContacts(raw) {
  const text = String(raw || '').trim()
  if (!text) return []
  return text
    .split(/[；;、，,\n]+/)
    .map((part) => parseOneContact(part))
    .filter((item) => item.name)
}

function formatContact(name, phone) {
  const nextName = String(name || '').trim()
  const nextPhone = String(phone || '').trim()
  if (!nextName && !nextPhone) return ''
  if (!nextPhone) return nextName
  if (!nextName) return nextPhone
  return `${nextName} / ${nextPhone}`
}

function findPhone(name, fallbackList) {
  const catalog = catalogPersons.find((item) => item.name === name)
  if (catalog?.phone) return catalog.phone
  const fallback = fallbackList.find((item) => item.name === name)
  return fallback?.phone || ''
}

const parsedList = computed(() => parseContacts(props.modelValue))

const personOptions = computed(() => {
  const map = new Map()
  for (const person of catalogPersons) {
    map.set(person.name, person)
  }
  for (const item of parsedList.value) {
    if (!map.has(item.name)) {
      map.set(item.name, {
        id: `current-${item.name}`,
        name: item.name,
        phone: item.phone,
      })
    }
  }
  return [...map.values()]
})

const selectedNames = computed({
  get() {
    return parsedList.value.map((item) => item.name)
  },
  set(names) {
    const nextNames = Array.isArray(names) ? names.filter(Boolean) : []
    const fallback = parsedList.value
    emit(
      'update:modelValue',
      nextNames
        .map((name) => formatContact(name, findPhone(name, fallback)))
        .join('；'),
    )
  },
})

const selectedName = computed({
  get() {
    return parsedList.value[0]?.name || ''
  },
  set(name) {
    if (!name) {
      emit('update:modelValue', '')
      return
    }
    emit('update:modelValue', formatContact(name, findPhone(name, parsedList.value)))
  },
})

const displayText = computed(() => {
  if (!parsedList.value.length) return '—'
  return parsedList.value
    .map((item) => formatContact(item.name, item.phone))
    .join('；')
})
</script>

<template>
  <div v-if="readonly" class="person-contact-text">{{ displayText }}</div>
  <el-select
    v-else-if="multiple"
    v-model="selectedNames"
    class="name-select"
    multiple
    filterable
    collapse-tags
    collapse-tags-tooltip
    clearable
    placeholder="请选择人员，支持搜索" aria-label="请选择人员，支持搜索">
    <el-option
      v-for="person in personOptions"
      :key="person.id"
      :label="person.phone ? `${person.name}（${person.phone}）` : person.name"
      :value="person.name"
    />
  </el-select>
  <el-select
    v-else
    v-model="selectedName"
    class="name-select"
    filterable
    clearable
    placeholder="请选择人员，支持搜索" aria-label="请选择人员，支持搜索">
    <el-option
      v-for="person in personOptions"
      :key="person.id"
      :label="person.phone ? `${person.name}（${person.phone}）` : person.name"
      :value="person.name"
    />
  </el-select>
</template>

<style scoped>
.name-select {
  width: 100%;
}

.person-contact-text {
  padding: 2px 4px;
  line-height: 1.5;
  color: #1a1a1a;
  word-break: break-all;
}
</style>

<script setup>
import { computed, ref, watch } from 'vue'
import { Plus, CircleClose } from '@element-plus/icons-vue'
import { listSysUsers } from '../../mock/sysUsers'
import { unifiedOrgTree, findTreeNode } from '../../mock/orgStructure'
import { getPosition } from '../../mock/positions'
import { formatContact, parseContacts, parseOneContact } from '../../utils/contactValue'
import { maskPhone } from '../../utils/mask'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  /** stacked：按钮在第二行（项目画像）；inline：按钮在输入框右侧 */
  actionLayout: {
    type: String,
    default: 'stacked',
    validator: (value) => ['stacked', 'inline'].includes(value),
  },
  /** 仅允许从系统用户选择，不可手填姓名/电话 */
  selectOnly: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const contactName = ref('')
const contactPhone = ref('')
const locked = ref(false)
const phoneRevealed = ref(false)
const phoneEditing = ref(false)

const pickerVisible = ref(false)
const pickerKeyword = ref('')
const pickerSelectedId = ref('')
const dialogPhoneVisibleIds = ref([])

function getUserOrgPath(orgId) {
  if (!orgId) return '—'
  const node = findTreeNode(unifiedOrgTree.value, orgId)
  return node?.orgPath || '—'
}

function getUserPositionLabels(positionIds) {
  const labels = (positionIds || [])
    .map((id) => getPosition(id)?.name)
    .filter(Boolean)
  return labels.length ? labels.join('、') : '—'
}

function findSysUserByContact(name, phone) {
  const nextName = String(name || '').trim()
  const nextPhone = String(phone || '').trim()
  if (!nextName || !nextPhone) return null
  return (
    listSysUsers().find(
      (user) => user.status !== false && user.name === nextName && user.phone === nextPhone,
    ) || null
  )
}

function buildPickerUsers() {
  return listSysUsers()
    .filter((user) => user.status !== false && user.name)
    .map((user) => ({
      id: user.id,
      name: user.name,
      phone: user.phone || '',
      orgPath: getUserOrgPath(user.orgId),
      positionLabels: getUserPositionLabels(user.positions),
    }))
}

const pickerUsers = computed(() => {
  const keyword = pickerKeyword.value.trim()
  return buildPickerUsers().filter((user) => {
    if (!keyword) return true
    return user.name.includes(keyword)
  })
})

function syncFromModelValue(value) {
  const first = parseContacts(value)[0] || parseOneContact(value)
  contactName.value = first.name
  contactPhone.value = first.phone
  locked.value = !!findSysUserByContact(first.name, first.phone)
  phoneRevealed.value = false
}

watch(
  () => props.modelValue,
  (value) => {
    syncFromModelValue(value)
  },
  { immediate: true },
)

function emitUpdate() {
  emit('update:modelValue', formatContact(contactName.value, contactPhone.value))
}

function unlockContact() {
  locked.value = false
  phoneRevealed.value = false
}

function clearContact() {
  contactName.value = ''
  contactPhone.value = ''
  unlockContact()
  emitUpdate()
}

function onNameInput(value) {
  if (locked.value) return
  contactName.value = String(value || '').trim()
  emitUpdate()
}

function onPhoneInput(value) {
  if (locked.value) return
  contactPhone.value = String(value || '').trim()
  emitUpdate()
}

function onNameClear() {
  clearContact()
}

function onPhoneClear() {
  if (locked.value) {
    clearContact()
    return
  }
  contactPhone.value = ''
  emitUpdate()
}

const phoneInputValue = computed({
  get() {
    if (!contactPhone.value) return ''
    if (phoneRevealed.value || phoneEditing.value) {
      return contactPhone.value
    }
    return maskPhone(contactPhone.value)
  },
  set(value) {
    onPhoneInput(value)
  },
})

function onPhoneFocus() {
  if (!locked.value) {
    phoneEditing.value = true
  }
}

function onPhoneBlur() {
  phoneEditing.value = false
}

function revealPhone() {
  phoneRevealed.value = true
}

function isDialogPhoneVisible(userId) {
  return dialogPhoneVisibleIds.value.includes(userId)
}

function revealDialogPhone(userId) {
  if (!dialogPhoneVisibleIds.value.includes(userId)) {
    dialogPhoneVisibleIds.value = [...dialogPhoneVisibleIds.value, userId]
  }
}

function openPicker() {
  pickerKeyword.value = ''
  pickerSelectedId.value = ''
  dialogPhoneVisibleIds.value = []
  const matched = findSysUserByContact(contactName.value, contactPhone.value)
  if (matched) {
    pickerSelectedId.value = matched.id
  }
  pickerVisible.value = true
}

function onPickerCurrentChange(row) {
  pickerSelectedId.value = row?.id || ''
}

function confirmPicker() {
  const user = buildPickerUsers().find((item) => item.id === pickerSelectedId.value)
  if (!user) return
  contactName.value = user.name
  contactPhone.value = user.phone
  locked.value = true
  phoneRevealed.value = false
  emitUpdate()
  pickerVisible.value = false
}

const readonlyDisplayPhone = computed(() => {
  if (!contactPhone.value) return '—'
  if (phoneRevealed.value) return contactPhone.value
  return maskPhone(contactPhone.value)
})

const hasContact = computed(() => !!(contactName.value || contactPhone.value))
</script>

<template>
  <div v-if="readonly" class="profile-person-contact-readonly">
    <template v-if="contactName || contactPhone">
      <span class="readonly-name">{{ contactName || '—' }}</span>
      <span class="readonly-phone">
        <span>{{ readonlyDisplayPhone }}</span>
        <el-button
          v-if="contactPhone && !phoneRevealed"
          link
          type="primary"
          size="small"
          @click="revealPhone"
        >
          查看
        </el-button>
      </span>
    </template>
    <span v-else class="readonly-empty">—</span>
  </div>

  <div
    v-else-if="selectOnly"
    class="profile-person-contact select-only"
    :class="{ 'is-inline': actionLayout === 'inline' }"
  >
    <div class="select-only-field" role="button" tabindex="0" @click="openPicker" @keydown.enter="openPicker">
      <template v-if="hasContact">
        <span class="select-only-name">{{ contactName || '—' }}</span>
        <span class="select-only-phone">
          <span>{{ phoneRevealed || !contactPhone ? contactPhone : maskPhone(contactPhone) }}</span>
          <el-button
            v-if="contactPhone && !phoneRevealed"
            link
            type="primary"
            size="small"
            @click.stop="revealPhone"
          >
            查看
          </el-button>
        </span>
      </template>
      <span v-else class="select-only-placeholder">请选择系统用户</span>
    </div>
    <div class="contact-action-row">
      <el-button
        class="clear-btn"
        :icon="CircleClose"
        circle
        size="small"
        title="清空"
        :disabled="!hasContact"
        @click.stop="clearContact"
      />
      <el-button
        class="pick-btn"
        :icon="Plus"
        circle
        size="small"
        title="选择系统用户"
        @click="openPicker"
      />
    </div>
  </div>

  <div
    v-else
    class="profile-person-contact"
    :class="{ 'is-inline': actionLayout === 'inline' }"
  >
    <div class="contact-input-row">
      <el-input
        :model-value="contactName"
        class="name-input"
        placeholder="姓名"
        :readonly="locked"
        :clearable="!locked"
        @update:model-value="onNameInput"
        @clear="onNameClear"
      />
      <el-input
        v-model="phoneInputValue"
        class="phone-input"
        placeholder="电话"
        :readonly="locked"
        :clearable="!locked"
        @focus="onPhoneFocus"
        @blur="onPhoneBlur"
        @clear="onPhoneClear"
      >
        <template v-if="contactPhone" #suffix>
          <el-button
            v-if="!phoneRevealed"
            link
            type="primary"
            size="small"
            class="phone-view-btn"
            @click.stop="revealPhone"
          >
            查看
          </el-button>
        </template>
      </el-input>
    </div>
    <div class="contact-action-row">
      <el-button
        class="clear-btn"
        :icon="CircleClose"
        circle
        size="small"
        title="清空"
        :disabled="!hasContact"
        @click="clearContact"
      />
      <el-button
        class="pick-btn"
        :icon="Plus"
        circle
        size="small"
        title="选择系统用户"
        @click="openPicker"
      />
    </div>
  </div>

  <el-dialog
    v-model="pickerVisible"
    title="选择系统用户"
    width="760px"
    append-to-body
    destroy-on-close
  >
    <el-input
      v-model="pickerKeyword"
      placeholder="请输入姓名查询"
      clearable
      class="picker-search"
    />
    <el-table
      :data="pickerUsers"
      highlight-current-row
      max-height="360"
      class="picker-table"
      @current-change="onPickerCurrentChange"
    >
      <el-table-column width="48" align="center">
        <template #default="{ row }">
          <el-radio-group v-model="pickerSelectedId">
            <el-radio :value="row.id" />
          </el-radio-group>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="姓名" width="100" show-overflow-tooltip />
      <el-table-column label="手机号" width="180">
        <template #default="{ row }">
          <div class="phone-cell">
            <span>{{ isDialogPhoneVisible(row.id) ? row.phone : maskPhone(row.phone) }}</span>
            <el-button
              v-if="row.phone && !isDialogPhoneVisible(row.id)"
              link
              type="primary"
              size="small"
              @click="revealDialogPhone(row.id)"
            >
              查看
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="orgPath" label="组织结构" min-width="220" show-overflow-tooltip />
      <el-table-column prop="positionLabels" label="岗位" min-width="140" show-overflow-tooltip />
    </el-table>
    <template #footer>
      <el-button @click="pickerVisible = false">取消</el-button>
      <el-button type="primary" :disabled="!pickerSelectedId" @click="confirmPicker">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.profile-person-contact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.profile-person-contact.is-inline {
  flex-direction: row;
  align-items: center;
  gap: 4px;
}

.profile-person-contact.is-inline .contact-input-row {
  flex: 1;
  min-width: 0;
}

.profile-person-contact.is-inline .contact-action-row {
  flex-shrink: 0;
  justify-content: flex-start;
}

.profile-person-contact.select-only.is-inline {
  flex-direction: row;
  align-items: center;
}

.profile-person-contact.select-only.is-inline .select-only-field {
  flex: 1;
  min-width: 0;
}

.contact-input-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.contact-action-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.name-input {
  flex: 0 0 38%;
  min-width: 0;
}

.phone-input {
  flex: 1;
  min-width: 0;
}

.pick-btn,
.clear-btn {
  flex-shrink: 0;
}

.phone-view-btn {
  padding: 0 2px;
  height: auto;
}

.profile-person-contact-readonly {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
  color: #1a1a1a;
  word-break: break-all;
  font-size: 12px;
}

.readonly-name {
  font-weight: 500;
}

.readonly-phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.readonly-empty {
  color: #1a1a1a;
}

.picker-search {
  margin-bottom: 12px;
}

.picker-table :deep(.el-radio__label) {
  display: none;
}

.phone-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.select-only-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  min-height: 28px;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  cursor: pointer;
  line-height: 1.35;
  font-size: 12px;
}

.select-only-field:hover {
  border-color: var(--el-color-primary);
}

.select-only-name {
  font-weight: 500;
  color: #1a1a1a;
}

.select-only-phone {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  color: #606266;
}

.select-only-placeholder {
  color: var(--el-text-color-placeholder);
  line-height: 20px;
}
</style>

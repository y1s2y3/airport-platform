<script setup>
/**
 * 施工部位树形选择（实体工程结构树）+ 「去配置」新标签
 * - 支持单选 / 多选（multiple）
 * - 验评：scopeMode=focus → 按验收节点定位所属分项并展开，全树可选不限制
 * - 验评旧行为：scopeMode=filter（或 requireScope 且未显式 focus）→ 仅展示作用域内部位
 */
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  joinLocationLabels,
  listLocationsForSelect,
  normalizeLocationFields,
  resolveLocationPathLabel,
  resolveScopeExpandKeys,
} from '../mock/constructionLocation.js'

const props = defineProps({
  locationId: { type: String, default: '' },
  locationIds: { type: Array, default: () => [] },
  locationName: { type: String, default: '' },
  projectId: { type: String, default: '' },
  /** 验评：当前验收节点，用于定位所属分项 */
  scopeWbsNodeId: { type: String, default: '' },
  /**
   * filter：仅展示作用域内分项下部位（旧行为）
   * focus：展示全树，定位并展开所属分项，其他部位也可选（验评新口径）
   * 空：无作用域逻辑
   */
  scopeMode: { type: String, default: '' },
  /**
   * 为 true 时必须先有 scopeWbsNodeId 才可选（验评发起）
   */
  requireScope: { type: Boolean, default: false },
  /** 一对多多选 */
  multiple: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** 只读且不展示去配置（如材料/设备引用定样带出） */
  hideConfig: { type: Boolean, default: false },
  placeholder: { type: String, default: '请选择施工部位（非必填）' },
})

const emit = defineEmits([
  'update:locationId',
  'update:locationIds',
  'update:locationName',
])

const router = useRouter()

const effectiveScopeMode = computed(() => {
  if (props.scopeMode === 'filter' || props.scopeMode === 'focus') return props.scopeMode
  if (props.requireScope) return 'focus'
  return ''
})

const treeData = computed(() => {
  if (!props.projectId) return []
  if (props.requireScope && !props.scopeWbsNodeId) return []
  const mode = effectiveScopeMode.value
  return listLocationsForSelect(props.projectId, {
    scopeWbsNodeId: props.scopeWbsNodeId || '',
    filterByScope: mode === 'filter',
  })
})

const locked = computed(() => props.readonly || props.disabled)

const selectDisabled = computed(
  () => locked.value || (props.requireScope && !props.scopeWbsNodeId),
)

const effectivePlaceholder = computed(() => {
  if (props.requireScope && !props.scopeWbsNodeId) {
    return '请先选择验收节点，再选择施工部位（可多选，不限所属分项）'
  }
  return props.placeholder
})

const modelValue = computed(() => {
  if (props.multiple) {
    const ids = Array.isArray(props.locationIds) ? props.locationIds.filter(Boolean) : []
    if (ids.length) return ids
    if (props.locationId) return [props.locationId]
    return []
  }
  return props.locationId || (Array.isArray(props.locationIds) && props.locationIds[0]) || undefined
})

const expandKeys = computed(() => {
  if (effectiveScopeMode.value !== 'focus' || !props.scopeWbsNodeId) return []
  return resolveScopeExpandKeys(props.scopeWbsNodeId)
})

const displayReadonly = computed(() => {
  if (props.locationName) return props.locationName
  const norm = normalizeLocationFields({
    location_ids: props.locationIds,
    location_id: props.locationId,
  })
  return norm.location_name || ''
})

/** focus 模式：换节点不清空已选；filter 模式：超范围则清空 */
watch(
  () => [props.scopeWbsNodeId, props.requireScope, effectiveScopeMode.value],
  () => {
    if (!props.requireScope) return
    if (!props.scopeWbsNodeId) {
      clearSelection()
    }
    // focus：允许跨分项，不清空
  },
)

function clearSelection() {
  emit('update:locationId', '')
  emit('update:locationIds', [])
  emit('update:locationName', '')
}

function emitSelection(ids) {
  const list = (ids || []).map(String).filter(Boolean)
  const name = joinLocationLabels(list)
  emit('update:locationIds', list)
  emit('update:locationId', list[0] || '')
  emit('update:locationName', name)
}

function onChange(val) {
  if (props.multiple) {
    const ids = Array.isArray(val) ? val : val ? [val] : []
    emitSelection(ids)
    return
  }
  const id = val || ''
  emit('update:locationId', id)
  emit('update:locationIds', id ? [id] : [])
  emit('update:locationName', id ? resolveLocationPathLabel(id) || '' : '')
}

function openConfig() {
  const query = {}
  if (props.projectId) query.project_id = props.projectId
  const href = router.resolve({
    path: '/basic-data/entity-breakdown',
    query,
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="loc-select" :class="{ 'is-multiple': multiple }">
    <template v-if="locked && hideConfig">
      <el-input
        :model-value="displayReadonly"
        disabled
        :placeholder="placeholder"
        class="loc-input" aria-label="placeholder"/>
    </template>
    <template v-else>
      <el-tree-select
        :key="`${projectId}-${scopeWbsNodeId || 'all'}-${multiple ? 'm' : 's'}-${effectiveScopeMode}`"
        :model-value="modelValue"
        :data="treeData"
        node-key="id"
        :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
        check-strictly
        filterable
        clearable
        :multiple="multiple"
        :show-checkbox="multiple"
        collapse-tags
        collapse-tags-tooltip
        :disabled="selectDisabled"
        :placeholder="effectivePlaceholder"
        class="loc-input"
        :render-after-expand="false"
        :default-expand-all="effectiveScopeMode !== 'focus'"
        :default-expanded-keys="expandKeys"
        @update:model-value="onChange"
      />
      <el-button
        v-if="!hideConfig"
        link
        type="primary"
        class="cfg-btn"
        :disabled="!projectId"
        @click="openConfig"
      >
        去配置
      </el-button>
    </template>
  </div>
</template>

<style scoped>
.loc-select {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 560px;
}
.loc-select.is-multiple {
  max-width: 720px;
}
.loc-input {
  flex: 1;
  min-width: 0;
}
.cfg-btn {
  flex-shrink: 0;
}
</style>

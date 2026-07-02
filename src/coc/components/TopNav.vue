<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import { Close } from '@element-plus/icons-vue'
import logoUrl from '../assets/logo.png'
import { FOCUS_PROJECT_ID, HQ_SELECTION_ID } from '../mock/data.js'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  selectionId: { type: String, default: HQ_SELECTION_ID },
  statusFilters: { type: Array, default: () => ['在建'] },
  focusProjectId: { type: String, default: FOCUS_PROJECT_ID },
})

const emit = defineEmits(['project-change'])

function handleCloseScreen() {
  if (window.opener && !window.opener.closed) {
    window.close()
    return
  }
  window.close()
  window.setTimeout(() => {
    if (!window.closed) {
      window.location.hash = '#/workbench'
    }
  }, 120)
}

function onKeydown(e) {
  if (e.key === 'Escape') handleCloseScreen()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const filteredProjects = computed(() =>
  props.projects.filter((p) => props.statusFilters.includes(p.status)),
)

const treeOptions = computed(() => [
  {
    value: HQ_SELECTION_ID,
    label: '工程指挥部',
    children: filteredProjects.value.map((p) => ({
      value: p.id,
      label: p.shortName || p.name,
      fullName: p.name,
      status: p.status,
      connected: p.id === props.focusProjectId,
    })),
  },
])

const selectedOrgId = computed({
  get: () => props.selectionId,
  set: (id) => {
    if (id) handleOrgChange(id)
  },
})

function statusClass(status) {
  if (status === '前期') return 'early'
  if (status === '在建') return 'building'
  if (status === '历史') return 'history'
  return 'default'
}

function handleOrgChange(id) {
  if (id === HQ_SELECTION_ID) {
    emit('project-change', HQ_SELECTION_ID)
    return
  }
  emit('project-change', id)
}
</script>

<template>
  <header class="top-nav">
    <div class="brand">
      <div class="brand-logo">
        <img :src="logoUrl" alt="深圳机场" class="logo-img" />
      </div>
      <div class="brand-text">
        <div class="brand-title">智慧工程建设管控一体化平台</div>
        <div class="brand-sub">深圳机场扩建工程 · COC调度指挥中心</div>
      </div>
    </div>

    <div class="org-select-wrap">
      <el-tree-select
        v-model="selectedOrgId"
        :data="treeOptions"
        :default-expanded-keys="[HQ_SELECTION_ID]"
        :render-after-expand="false"
        check-strictly
        filterable
        placeholder="选择组织/项目"
        class="org-tree-select"
        popper-class="coc-org-tree-select-popper"
        @change="handleOrgChange"
      >
        <template #default="{ data }">
          <span
            v-if="data.value === HQ_SELECTION_ID"
            class="org-tree-node is-root"
          >
            {{ data.label }}
          </span>
          <span
            v-else
            class="org-tree-node is-project"
            :class="{ 'is-connected': data.connected }"
            :title="data.fullName || data.label"
          >
            <span class="org-tree-label">{{ data.label }}</span>
            <span v-if="data.status" class="org-tree-status" :class="statusClass(data.status)">
              {{ data.status }}
            </span>
          </span>
        </template>
      </el-tree-select>
    </div>

    <div class="nav-actions">
      <slot name="actions" />
      <button type="button" class="logout-btn" title="关闭" @click="handleCloseScreen">
        <el-icon :size="14"><Close /></el-icon>
      </button>
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  min-height: var(--coc-header-h);
  height: auto;
  display: flex;
  align-items: center;
  padding: 6px 20px 6px 16px;
  background: #fff;
  border-bottom: 1px solid var(--coc-border);
  gap: 16px;
  flex-shrink: 0;
  overflow: visible;
  min-width: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 560px;
  padding: 4px 12px 4px 8px;
  background: linear-gradient(135deg, rgba(201, 123, 99, 0.12), rgba(212, 165, 116, 0.18));
  border-radius: 8px;
  border: 1px solid rgba(201, 123, 99, 0.2);
  position: relative;
  z-index: 2;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  background: #fff;
  border-radius: 6px;
  padding: 3px;
  box-shadow: 0 1px 4px rgba(201, 123, 99, 0.15);
}

.logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.brand-sub {
  font-size: calc(10px + var(--coc-font-boost));
  color: var(--coc-text-muted);
  margin-top: 1px;
  white-space: nowrap;
}

.org-select-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  margin-left: 4px;
  border-left: 1px solid var(--coc-border);
}

.org-tree-select {
  width: 220px;
  flex-shrink: 0;
}

.org-tree-select :deep(.el-select__wrapper) {
  min-height: 36px;
  padding: 4px 12px;
  font-size: calc(15px + var(--coc-font-boost));
  font-weight: 700;
  background: #fff;
  border: 1px solid var(--coc-border);
  box-shadow: none;
}

.org-tree-select :deep(.el-select__selected-item),
.org-tree-select :deep(.el-select__placeholder) {
  font-size: calc(15px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-left: auto;
}

.logout-btn {
  border: none;
  background: transparent;
  color: var(--coc-text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logout-btn:hover {
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}
</style>

<style>
.coc-org-tree-select-popper .org-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-width: 0;
}

.coc-org-tree-select-popper .org-tree-node.is-root {
  font-weight: 700;
  font-size: calc(14px + var(--coc-font-boost));
}

.coc-org-tree-select-popper .el-tree-node__label,
.coc-org-tree-select-popper .el-select-dropdown__item {
  font-size: calc(14px + var(--coc-font-boost));
}

.coc-org-tree-select-popper .org-tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.coc-org-tree-select-popper .org-tree-status {
  flex-shrink: 0;
  font-size: calc(11px + var(--coc-font-boost));
  padding: 0 6px;
  border-radius: 4px;
  line-height: 18px;
}

.coc-org-tree-select-popper .org-tree-status.building {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.coc-org-tree-select-popper .org-tree-status.early {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.12);
}

.coc-org-tree-select-popper .org-tree-status.history {
  color: #909399;
  background: rgba(144, 147, 153, 0.12);
}

.coc-org-tree-select-popper .org-tree-node.is-connected .org-tree-label {
  color: var(--coc-accent, #c97b63);
  font-weight: 600;
}
</style>

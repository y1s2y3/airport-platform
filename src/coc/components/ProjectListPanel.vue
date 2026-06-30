<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoCamera, Search, Rank, Star } from '@element-plus/icons-vue'
import { FOCUS_PROJECT_ID, HQ_SELECTION_ID } from '../mock/data.js'
import { sortCamerasByOrder } from '../utils/cameraOrder.js'

const STATUS_OPTIONS = ['在建', '前期', '历史']

const props = defineProps({
  projects: { type: Array, default: () => [] },
  selectionId: { type: String, default: HQ_SELECTION_ID },
  statusFilters: { type: Array, default: () => ['在建'] },
  showCameras: { type: Boolean, default: false },
  focusProjectId: { type: String, default: FOCUS_PROJECT_ID },
  videoFilter: { type: String, default: 'all' },
  cameraOrder: { type: Array, default: () => [] },
})

const emit = defineEmits(['project-change', 'status-filter', 'camera-click', 'camera-reorder', 'camera-set-key'])

const currentNodeKey = ref(props.selectionId)
const searchKeyword = ref('')
const camListRef = ref(null)
const draggingCamId = ref(null)
const dropSlot = ref(null)

const focusProject = computed(() =>
  props.projects.find((p) => p.id === props.focusProjectId),
)

const focusCameras = computed(() => {
  if (!props.showCameras || !focusProject.value) return []
  let cams = sortCamerasByOrder(focusProject.value.cameras, props.cameraOrder)
  if (props.videoFilter === 'key') cams = cams.filter((c) => c.key)
  return cams
})

watch(() => props.selectionId, (id) => {
  currentNodeKey.value = id
})

const filteredProjects = computed(() => {
  let list = props.projects.filter((p) => props.statusFilters.includes(p.status))
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        (p.shortName && p.shortName.toLowerCase().includes(kw)),
    )
  }
  return list
})

const treeData = computed(() => [
  {
    id: 'hq',
    label: '工程指挥部',
    nodeType: 'root',
    children: filteredProjects.value.map((p) => ({
      id: p.id,
      label: p.shortName || p.name,
      fullName: p.name,
      status: p.status,
      connected: p.id === props.focusProjectId,
      nodeType: 'project',
      children: [],
    })),
  },
])

const defaultExpandedKeys = computed(() => ['hq', props.focusProjectId])

function statusClass(status) {
  if (status === '前期') return 'early'
  if (status === '在建') return 'building'
  if (status === '历史') return 'history'
  return 'default'
}

function toggleStatusFilter(status) {
  const current = [...props.statusFilters]
  const idx = current.indexOf(status)
  if (idx >= 0) {
    if (current.length <= 1) {
      ElMessage.warning('至少保留一个项目状态')
      return
    }
    current.splice(idx, 1)
  } else {
    current.push(status)
  }
  emit('status-filter', current)
}

function onTreeClick(data) {
  if (data.nodeType === 'root') {
    currentNodeKey.value = HQ_SELECTION_ID
    emit('project-change', HQ_SELECTION_ID)
    return
  }
  if (data.nodeType === 'project') {
    currentNodeKey.value = data.id
    emit('project-change', data.id)
    if (data.id !== props.focusProjectId) {
      ElMessage.warning('该项目暂未接入视频监控')
    }
    return
  }
}

function onCameraClick(cam) {
  if (!focusProject.value) return
  currentNodeKey.value = cam.id
  if (props.focusProjectId !== props.selectionId) {
    emit('project-change', props.focusProjectId)
  }
  emit('camera-click', cam)
}

function resolveDropSlot(clientY) {
  const list = camListRef.value
  if (!list) return focusCameras.value.length

  const items = list.querySelectorAll('.cam-drag-item')
  if (!items.length) return 0

  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return i
  }
  return items.length
}

function onDocMouseMove(event) {
  if (!draggingCamId.value) return
  dropSlot.value = resolveDropSlot(event.clientY)
}

function finishDrag() {
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', finishDrag)

  const dragId = draggingCamId.value
  const slot = dropSlot.value
  draggingCamId.value = null
  dropSlot.value = null

  if (!dragId || slot === null || !focusProject.value) return

  const visibleIds = focusCameras.value.map((cam) => cam.id)
  const from = visibleIds.indexOf(dragId)
  if (from === -1) return

  let targetSlot = slot
  if (from < targetSlot) targetSlot -= 1
  if (targetSlot === from) return

  emit('camera-reorder', {
    projectId: focusProject.value.id,
    dragId,
    insertIndex: slot,
    visibleIds,
  })
}

function startCamDrag(cam, event) {
  if (!props.showCameras) return
  draggingCamId.value = cam.id
  dropSlot.value = resolveDropSlot(event.clientY)
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', finishDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', finishDrag)
})
</script>

<template>
  <div class="panel-card module-panel project-module">
    <div class="panel-title simple-title">
      <span>项目列表</span>
    </div>
    <div class="panel-body module-body">
      <div class="tree-toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索项目名称"
          size="large"
          clearable
          :prefix-icon="Search"
          class="tree-search"
        />
        <div class="status-filter-tags">
          <span
            v-for="status in STATUS_OPTIONS"
            :key="status"
            class="status-tag"
            :class="[statusClass(status), { active: statusFilters.includes(status) }]"
            @click="toggleStatusFilter(status)"
          >
            {{ status }}
          </span>
        </div>
        <div v-if="showCameras" class="drag-hint">拖动摄像头可调整顺序</div>
      </div>
      <el-tree
        :key="`${focusProjectId}-${videoFilter}-${searchKeyword}-${statusFilters.join(',')}-${showCameras}-${cameraOrder.join(',')}`"
        :data="treeData"
        node-key="id"
        highlight-current
        :current-node-key="currentNodeKey"
        :default-expanded-keys="defaultExpandedKeys"
        :expand-on-click-node="false"
        class="project-tree"
        :class="{ 'is-cam-dragging': !!draggingCamId }"
        @node-click="onTreeClick"
      >
        <template #default="{ node, data }">
          <span
            v-if="data.nodeType !== 'project'"
            class="tree-node"
            :class="{
              'is-root': data.nodeType === 'root',
              'is-project': data.nodeType === 'project',
            }"
          >
            <span class="tree-label" :title="data.fullName || node.label">{{ node.label }}</span>
          </span>

          <div
            v-else
            class="project-node-wrap"
            :class="{ 'is-connected': data.connected }"
          >
            <div class="project-node-head">
              <span class="tree-label" :title="data.fullName || node.label">{{ node.label }}</span>
              <span class="tree-status" :class="statusClass(data.status)">{{ data.status }}</span>
            </div>

            <ul
              v-if="showCameras && data.connected && focusCameras.length"
              ref="camListRef"
              class="cam-drag-list"
              @click.stop
              @mousedown.stop
            >
              <template v-for="(cam, index) in focusCameras" :key="cam.id">
                <li
                  v-if="draggingCamId && dropSlot === index"
                  class="cam-drop-line"
                  aria-hidden="true"
                />
                <li
                  class="cam-drag-item"
                  :class="{
                    dragging: draggingCamId === cam.id,
                    active: currentNodeKey === cam.id,
                  }"
                  @click="onCameraClick(cam)"
                >
                  <span class="cam-node">
                    <span class="cam-row-top">
                      <span class="cam-row-name">
                        <el-icon :size="11" class="cam-icon"><VideoCamera /></el-icon>
                        <span class="tree-label" :title="cam.name">{{ cam.name }}</span>
                      </span>
                      <el-tooltip content="拖动排序" placement="top" :show-after="200">
                        <span
                          class="drag-handle"
                          @mousedown.prevent.stop="startCamDrag(cam, $event)"
                        >
                          <el-icon :size="12"><Rank /></el-icon>
                        </span>
                      </el-tooltip>
                    </span>
                    <span class="cam-row-meta">
                      <span v-if="cam.key" class="tree-key">重点</span>
                      <el-tooltip v-else content="设置为重点" placement="top" :show-after="200">
                        <button
                          type="button"
                          class="fav-btn"
                          aria-label="设置为重点"
                          @click.stop="emit('camera-set-key', cam)"
                        >
                          <el-icon :size="13"><Star /></el-icon>
                        </button>
                      </el-tooltip>
                      <span class="tree-cam-status" :class="cam.online ? 'online' : 'offline'">
                        <i class="status-dot" :class="cam.online ? 'online' : 'offline'" />
                        {{ cam.online ? '在线' : '离线' }}
                      </span>
                    </span>
                  </span>
                </li>
              </template>
              <li
                v-if="draggingCamId && dropSlot === focusCameras.length"
                class="cam-drop-line"
                aria-hidden="true"
              />
            </ul>
          </div>
        </template>
      </el-tree>
    </div>
  </div>
</template>

<style scoped>
.module-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.simple-title {

  font-size: 18px;
}

.module-body {
  padding: 12px 16px 16px !important;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

.tree-toolbar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 6px;
  flex-shrink: 0;
}

.tree-search { width: 100%; }

.drag-hint {
  font-size: 10px;
  color: var(--coc-text-muted);
  line-height: 1.2;
}

.status-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.status-tag {
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 10px;
  line-height: 1.2;
  cursor: pointer;
  border: 1px solid var(--coc-border);
  background: #fff;
  color: var(--coc-text-secondary);
  user-select: none;
  transition: all 0.2s;
}

.status-tag:not(.active) { opacity: 0.55; }

.status-tag.active.building {
  color: #409eff;
  background: rgba(64, 158, 255, 0.15);
  border-color: #409eff;
  font-weight: 600;
}

.status-tag.active.early {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.15);
  border-color: #e6a23c;
  font-weight: 600;
}

.status-tag.active.history {
  color: #909399;
  background: rgba(144, 147, 153, 0.12);
  border-color: #909399;
  font-weight: 600;
}

.status-tag.active.default {
  color: var(--coc-success);
  background: rgba(103, 194, 58, 0.12);
  border-color: var(--coc-success);
  font-weight: 600;
}

.project-tree {
  flex: 1;
  overflow-y: auto;
  background: transparent;
  font-size: 13px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 0;
}

.tree-node.is-root .tree-label {
  font-size: 14px;
  font-weight: 800;
  color: var(--coc-accent);
  letter-spacing: 1px;
}

.tree-node.is-project .tree-label { font-weight: 600; }

.project-node-wrap {
  width: 100%;
  min-width: 0;
}

.project-node-head {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.project-node-head .tree-label {
  font-weight: 600;
}

.cam-drag-list {
  list-style: none;
  margin: 4px 0 0;
  padding: 0 0 0 18px;
}

.cam-drop-line {
  height: 2px;
  margin: 3px 0;
  background: #409eff;
  border-radius: 1px;
  pointer-events: none;
}

.cam-drag-item {
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
}

.cam-drag-item:hover {
  background: rgba(201, 123, 99, 0.06);
}

.cam-drag-item.active {
  background: rgba(201, 123, 99, 0.12);
}

.cam-drag-item.dragging {
  opacity: 0.42;
}

.project-tree.is-cam-dragging {
  user-select: none;
  cursor: grabbing;
}

.project-tree.is-cam-dragging .drag-handle {
  cursor: grabbing;
}

.cam-node {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 2px 0;
}

.cam-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.cam-row-name {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: var(--coc-text-muted);
  flex-shrink: 0;
  cursor: grab;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.drag-handle:hover {
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.1);
}

.cam-row-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 17px;
}

.cam-drag-item .tree-label {
  color: var(--coc-text-secondary);
  font-size: 12px;
}

.cam-icon { color: var(--coc-accent); flex-shrink: 0; }

.tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.tree-status {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 4px;
  flex-shrink: 0;
}

.tree-status.building {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.tree-status.early {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.tree-status.history {
  background: rgba(144, 147, 153, 0.12);
  color: #909399;
}

.tree-key {
  font-size: 11px;
  background: linear-gradient(135deg, var(--coc-accent), var(--coc-gold));
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.fav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--coc-text-muted);
  cursor: pointer;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 0.2s, background 0.2s;
}

.fav-btn:hover {
  color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.12);
}

.tree-cam-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
}

.tree-cam-status.online {
  color: var(--coc-success);
  background: rgba(103, 194, 58, 0.1);
}

.tree-cam-status.offline {
  color: var(--coc-danger);
  background: rgba(245, 108, 108, 0.1);
}

:deep(.el-tree-node) { margin-bottom: 0; }

:deep(.el-tree-node__content) {
  min-height: 22px;
  height: auto;
  border-radius: 8px;
  margin-bottom: 0;
  padding-top: 2px;
  padding-bottom: 2px;
}

:deep(.el-tree-node__content:has(.project-node-wrap)) {
  height: auto;
  align-items: flex-start;
  padding-top: 2px;
  padding-bottom: 2px;
}

:deep(.el-tree > .el-tree-node:first-child > .el-tree-node__content) {
  min-height: 26px;
  margin-bottom: 4px;
}

:deep(.el-tree-node__children .el-tree-node__content) {
  padding-top: 1px;
  padding-bottom: 1px;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(201, 123, 99, 0.12) !important;
}

:deep(.el-tree-node__content:hover) {
  background: rgba(201, 123, 99, 0.06);
}
</style>

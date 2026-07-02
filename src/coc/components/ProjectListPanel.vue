<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoCamera, Search, Rank, Star, Microphone } from '@element-plus/icons-vue'
import { FOCUS_PROJECT_ID, HQ_SELECTION_ID, getMonitorDispatchDevices, getDispatchDeviceTypeLabel } from '../mock/data.js'
import { sortCamerasByOrder } from '../utils/cameraOrder.js'

const STATUS_OPTIONS = ['在建', '前期', '历史']

const props = defineProps({
  projects: { type: Array, default: () => [] },
  selectionId: { type: String, default: HQ_SELECTION_ID },
  statusFilters: { type: Array, default: () => ['在建'] },
  focusProjectId: { type: String, default: FOCUS_PROJECT_ID },
  videoFilter: { type: String, default: 'all' },
  cameraOrder: { type: Array, default: () => [] },
  dispatchOrder: { type: Array, default: () => [] },
})

const emit = defineEmits([
  'status-filter',
  'camera-click',
  'camera-reorder',
  'camera-set-key',
  'dispatch-click',
  'dispatch-reorder',
  'back-to-hq',
  'project-change',
])

const currentNodeKey = ref('')
const searchKeyword = ref('')
const treeRef = ref(null)
const draggingItem = ref(null)
const draggingProjectId = ref(null)
const dropSlot = ref(null)

const isHqView = computed(() => props.selectionId === HQ_SELECTION_ID)

const activeProject = computed(() => {
  if (isHqView.value) return null
  return props.projects.find((p) => p.id === props.selectionId) || null
})

watch(() => props.selectionId, () => {
  currentNodeKey.value = ''
})

const filteredProjects = computed(() => {
  let list = props.projects.filter((p) => props.statusFilters.includes(p.status))
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter((p) => projectMatchesKeyword(p, kw))
})

function projectMatchesKeyword(project, kw) {
  if (
    project.name.toLowerCase().includes(kw) ||
    (project.shortName && project.shortName.toLowerCase().includes(kw))
  ) {
    return true
  }
  const cameras = buildVideoChildren(project)
  if (cameras.some((item) => item.label.toLowerCase().includes(kw))) return true
  const devices = buildDispatchChildren(project.id, project.shortName || project.name)
  return devices.some((item) => item.label.toLowerCase().includes(kw))
}

function isOrderedProject(projectId) {
  if (isHqView.value) return projectId === props.focusProjectId
  return projectId === props.selectionId
}

function buildVideoChildren(project) {
  if (!project) return []
  let cams = isOrderedProject(project.id)
    ? sortCamerasByOrder(project.cameras || [], props.cameraOrder)
    : (project.cameras || [])
  if (props.videoFilter === 'key') cams = cams.filter((c) => c.key)
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw && !isHqView.value) {
    cams = cams.filter((c) => c.name.toLowerCase().includes(kw))
  }
  return cams.map((cam) => ({
    id: cam.id,
    label: cam.name,
    nodeType: 'camera',
    camera: cam,
    projectId: project.id,
  }))
}

function buildDispatchChildren(projectId, projectShortName = '') {
  let devices = getMonitorDispatchDevices(projectId, projectShortName)
  devices = sortCamerasByOrder(devices, props.dispatchOrder)
  const kw = searchKeyword.value.trim().toLowerCase()
  if (kw && !isHqView.value) {
    devices = devices.filter((d) => d.name.toLowerCase().includes(kw))
  }
  return devices.map((device) => ({
    id: device.id,
    label: device.name,
    nodeType: 'dispatch',
    device,
    projectId,
  }))
}

function buildCategoryNodes(project) {
  const projectId = project.id
  const shortName = project.shortName || project.name || ''
  return [
    {
      id: `${projectId}-video`,
      label: '视频监控',
      nodeType: 'category',
      category: 'video',
      projectId,
      children: buildVideoChildren(project),
    },
    {
      id: `${projectId}-dispatch`,
      label: '巡检对讲设备',
      nodeType: 'category',
      category: 'dispatch',
      projectId,
      children: buildDispatchChildren(projectId, shortName),
    },
  ]
}

function buildProjectMonitorNode(project) {
  return {
    id: project.id,
    label: project.shortName || project.name,
    fullName: project.name,
    status: project.status,
    connected: project.id === props.focusProjectId,
    nodeType: 'project',
    children: buildCategoryNodes(project),
  }
}

function buildHqRootNode() {
  return {
    id: HQ_SELECTION_ID,
    label: '工程指挥部',
    nodeType: 'root',
    children: filteredProjects.value.map((p) => buildProjectMonitorNode(p)),
  }
}

const treeData = computed(() => {
  if (isHqView.value) {
    return [buildHqRootNode()]
  }
  if (!activeProject.value) return []
  return [{
    id: activeProject.value.id,
    label: activeProject.value.shortName || activeProject.value.name,
    fullName: activeProject.value.name,
    nodeType: 'project-banner',
    children: buildCategoryNodes(activeProject.value),
  }]
})

const defaultExpandedKeys = computed(() => {
  if (isHqView.value) {
    return [
      HQ_SELECTION_ID,
      props.focusProjectId,
      `${props.focusProjectId}-video`,
      `${props.focusProjectId}-dispatch`,
    ]
  }
  if (!activeProject.value) return []
  return [
    activeProject.value.id,
    `${activeProject.value.id}-video`,
    `${activeProject.value.id}-dispatch`,
  ]
})

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
  if (data.nodeType === 'project' && isHqView.value) {
    currentNodeKey.value = data.id
    emit('project-change', data.id)
    return
  }
  if (data.nodeType === 'camera') {
    currentNodeKey.value = data.id
    if (isInteractiveCamera(data)) {
      emit('camera-click', data.camera)
    }
    return
  }
  if (data.nodeType === 'dispatch') {
    currentNodeKey.value = data.id
    emit('dispatch-click', data.device)
  }
}

function isInteractiveCamera(data) {
  if (data.nodeType !== 'camera') return false
  if (isHqView.value) return data.projectId === props.focusProjectId
  return data.projectId === props.selectionId
}

function getVisibleDragIds(type, projectId) {
  const project = props.projects.find((p) => p.id === projectId)
  if (type === 'camera') {
    if (!project || !isOrderedProject(projectId)) return []
    let cams = sortCamerasByOrder(project.cameras || [], props.cameraOrder)
    if (props.videoFilter === 'key') cams = cams.filter((c) => c.key)
    return cams.map((c) => c.id)
  }
  return buildDispatchChildren(projectId, project?.shortName || project?.name || '').map((item) => item.id)
}

function resolveDropSlot(clientY, type, projectId) {
  const treeEl = treeRef.value?.$el
  if (!treeEl) return 0
  const selector = type === 'camera'
    ? `.cam-drag-item[data-project-id="${projectId}"]`
    : `.dispatch-leaf-row[data-project-id="${projectId}"]`
  const items = treeEl.querySelectorAll(selector)
  if (!items.length) return 0
  for (let i = 0; i < items.length; i++) {
    const rect = items[i].getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return i
  }
  return items.length
}

function onDocMouseMove(event) {
  if (!draggingItem.value) return
  dropSlot.value = resolveDropSlot(
    event.clientY,
    draggingItem.value.type,
    draggingProjectId.value,
  )
}

function finishDrag() {
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', finishDrag)

  const dragMeta = draggingItem.value
  const slot = dropSlot.value
  const projectId = draggingProjectId.value
  draggingItem.value = null
  draggingProjectId.value = null
  dropSlot.value = null

  if (!dragMeta || slot === null || !projectId) return

  const visibleIds = getVisibleDragIds(dragMeta.type, projectId)
  const from = visibleIds.indexOf(dragMeta.id)
  if (from === -1) return

  let targetSlot = slot
  if (from < targetSlot) targetSlot -= 1
  if (targetSlot === from) return

  const payload = {
    projectId,
    dragId: dragMeta.id,
    insertIndex: slot,
    visibleIds,
  }

  if (dragMeta.type === 'camera') emit('camera-reorder', payload)
  else emit('dispatch-reorder', payload)
}

function startDrag(type, id, projectId, event) {
  draggingItem.value = { type, id }
  draggingProjectId.value = projectId
  dropSlot.value = resolveDropSlot(event.clientY, type, projectId)
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup', finishDrag)
}

function showDropLine(data, index) {
  if (!draggingItem.value || draggingProjectId.value !== data.projectId) return false
  const type = data.nodeType === 'camera' ? 'camera' : 'dispatch'
  if (draggingItem.value.type !== type) return false
  return dropSlot.value === index
}

function getLeafIndex(data) {
  if (data.nodeType === 'camera') {
    const project = props.projects.find((p) => p.id === data.projectId) || { id: data.projectId, cameras: [] }
    return buildVideoChildren(project).findIndex((item) => item.id === data.id)
  }
  const project = props.projects.find((p) => p.id === data.projectId)
  return buildDispatchChildren(data.projectId, project?.shortName || project?.name || '').findIndex((item) => item.id === data.id)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup', finishDrag)
})
</script>

<template>
  <div class="panel-card module-panel project-module">
    <div class="panel-title simple-title">
      <span>监控列表</span>
    </div>
    <div class="panel-body module-body">
      <div class="tree-toolbar">
        <el-input
          v-model="searchKeyword"
          :placeholder="isHqView ? '搜索项目或监控设备' : '搜索监控设备'"
          size="large"
          clearable
          :prefix-icon="Search"
          class="tree-search"
        />
        <div v-if="isHqView" class="status-filter-tags">
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
      </div>
      <el-tree
        ref="treeRef"
        :key="`${selectionId}-${focusProjectId}-${videoFilter}-${searchKeyword}-${statusFilters.join(',')}-${cameraOrder.join(',')}-${dispatchOrder.join(',')}`"
        :data="treeData"
        node-key="id"
        highlight-current
        :current-node-key="currentNodeKey"
        :default-expanded-keys="defaultExpandedKeys"
        :expand-on-click-node="false"
        class="project-tree"
        :class="{ 'is-dragging': !!draggingItem }"
        @node-click="onTreeClick"
      >
        <template #default="{ node, data }">
          <span
            v-if="data.nodeType === 'root'"
            class="tree-node is-root"
          >
            <span class="tree-label">{{ node.label }}</span>
          </span>

          <span
            v-else-if="data.nodeType === 'project-banner'"
            class="tree-node is-project-banner"
          >
            <span class="project-banner-name" :title="data.fullName || node.label">
              {{ data.fullName || node.label }}
            </span>
            <button
              type="button"
              class="back-hq-btn"
              @click.stop="emit('back-to-hq')"
            >
              返回指挥部
            </button>
          </span>

          <span
            v-else-if="data.nodeType === 'category'"
            class="tree-node is-category"
          >
            <span class="tree-label">{{ node.label }}</span>
          </span>

          <span
            v-else-if="data.nodeType === 'project'"
            class="tree-node is-project"
            :class="{ 'is-connected': data.connected, 'is-clickable': isHqView }"
          >
            <span class="tree-label" :title="data.fullName || node.label">{{ node.label }}</span>
            <span v-if="data.status" class="tree-status" :class="statusClass(data.status)">{{ data.status }}</span>
          </span>

          <div
            v-else-if="data.nodeType === 'camera'"
            class="cam-leaf-wrap"
            @click.stop
          >
            <div
              v-if="isInteractiveCamera(data) && showDropLine(data, getLeafIndex(data))"
              class="cam-drop-line"
              aria-hidden="true"
            />
            <div
              class="cam-drag-item"
              :class="{
                dragging: isInteractiveCamera(data) && draggingItem?.type === 'camera' && draggingItem?.id === data.id,
                active: currentNodeKey === data.id,
              }"
              :data-project-id="data.projectId"
              @click="onTreeClick(data)"
            >
              <span class="cam-node">
                <span class="cam-row-top">
                  <span class="cam-row-name">
                    <el-icon :size="11" class="cam-icon"><VideoCamera /></el-icon>
                    <span class="tree-label" :title="data.label">{{ data.label }}</span>
                  </span>
                  <el-tooltip
                    v-if="isInteractiveCamera(data)"
                    content="拖动排序"
                    placement="top"
                    :show-after="200"
                  >
                    <span
                      class="drag-handle"
                      @mousedown.prevent.stop="startDrag('camera', data.id, data.projectId, $event)"
                    >
                      <el-icon :size="12"><Rank /></el-icon>
                    </span>
                  </el-tooltip>
                </span>
                <span class="cam-row-meta">
                  <template v-if="isInteractiveCamera(data)">
                    <span v-if="data.camera.key" class="tree-key">重点</span>
                    <el-tooltip v-else content="设置为重点" placement="top" :show-after="200">
                      <button
                        type="button"
                        class="fav-btn"
                        aria-label="设置为重点"
                        @click.stop="emit('camera-set-key', data.camera)"
                      >
                        <el-icon :size="13"><Star /></el-icon>
                      </button>
                    </el-tooltip>
                  </template>
                  <span class="tree-cam-status" :class="data.camera.online ? 'online' : 'offline'">
                    <i class="status-dot" :class="data.camera.online ? 'online' : 'offline'" />
                    {{ data.camera.online ? '在线' : '离线' }}
                  </span>
                </span>
              </span>
            </div>
          </div>

          <div
            v-else-if="data.nodeType === 'dispatch'"
            class="leaf-wrap"
            @click.stop
          >
            <div
              v-if="showDropLine(data, getLeafIndex(data))"
              class="leaf-drop-line"
              aria-hidden="true"
            />
            <div
              class="monitor-leaf-row dispatch-leaf-row"
              :class="{
                dragging: draggingItem?.type === 'dispatch' && draggingItem?.id === data.id,
                active: currentNodeKey === data.id,
              }"
              :data-project-id="data.projectId"
              @click="onTreeClick(data)"
            >
              <span class="leaf-row-top">
                <span class="leaf-row-name">
                  <el-icon :size="11" class="leaf-icon dispatch"><Microphone /></el-icon>
                  <span class="tree-label" :title="data.label">{{ data.label }}</span>
                </span>
                <el-tooltip content="拖动排序" placement="top" :show-after="200">
                  <span
                    class="drag-handle"
                    @mousedown.prevent.stop="startDrag('dispatch', data.id, data.projectId, $event)"
                  >
                    <el-icon :size="12"><Rank /></el-icon>
                  </span>
                </el-tooltip>
              </span>
              <span class="leaf-row-meta">
                <span class="type-badge" :class="data.device.type">
                  {{ getDispatchDeviceTypeLabel(data.device.type) }}
                </span>
                <span class="tree-status-badge" :class="data.device.online ? 'online' : 'offline'">
                  <i class="status-dot" :class="data.device.online ? 'online' : 'offline'" />
                  {{ data.device.online ? '在线' : '离线' }}
                </span>
              </span>
            </div>
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
  font-size: calc(18px + var(--coc-font-boost));
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

.status-filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.status-tag {
  padding: 4px 10px;
  border-radius: 10px;
  font-size: calc(10px + var(--coc-font-boost));
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
  font-size: calc(13px + var(--coc-font-boost));
}

.project-tree.is-dragging {
  user-select: none;
  cursor: grabbing;
}

.project-tree.is-dragging .drag-handle {
  cursor: grabbing;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  padding: 0;
}

.tree-node.is-category .tree-label {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
}

.tree-node.is-root .tree-label {
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 800;
  color: var(--coc-accent);
  letter-spacing: 1px;
}

.tree-node.is-project-banner {
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 2px 0 4px;
}

.project-banner-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: calc(14px + var(--coc-font-boost));
  font-weight: 700;
  color: var(--coc-text);
}

.back-hq-btn {
  flex-shrink: 0;
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  padding: 3px 10px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-accent);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
  transition: border-color 0.2s, background 0.2s;
}

.back-hq-btn:hover {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.tree-node.is-project .tree-label {
  font-weight: 600;
}

.tree-node.is-project.is-connected .tree-label {
  color: var(--coc-accent);
}

.tree-node.is-project.is-clickable {
  cursor: pointer;
}

.tree-node.is-project.is-clickable:hover .tree-label {
  color: var(--coc-accent);
}

.leaf-wrap {
  width: 100%;
  min-width: 0;
}

.cam-leaf-wrap {
  width: 100%;
  min-width: 0;
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
  width: 100%;
  min-width: 0;
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

.cam-row-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 17px;
}

.cam-drag-item .tree-label {
  color: var(--coc-text-secondary);
  font-size: calc(12px + var(--coc-font-boost));
}

.cam-icon {
  color: var(--coc-accent);
  flex-shrink: 0;
}

.tree-cam-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: calc(11px + var(--coc-font-boost));
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

.leaf-drop-line {
  height: 2px;
  margin: 2px 0;
  background: #409eff;
  border-radius: 1px;
  pointer-events: none;
}

.monitor-leaf-row {
  width: 100%;
  min-width: 0;
  border-radius: 8px;
  cursor: pointer;
  padding: 2px 0;
  transition: opacity 0.15s, background 0.15s;
}

.monitor-leaf-row:hover {
  background: rgba(201, 123, 99, 0.06);
}

.monitor-leaf-row.active {
  background: rgba(201, 123, 99, 0.12);
}

.monitor-leaf-row.dragging {
  opacity: 0.42;
}

.leaf-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.leaf-row-name {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.leaf-row-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 17px;
  margin-top: 2px;
}

.leaf-icon {
  color: var(--coc-accent);
  flex-shrink: 0;
}

.leaf-icon.dispatch {
  color: #409eff;
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

.tree-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-secondary);
}

.tree-status {
  font-size: calc(11px + var(--coc-font-boost));
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
  font-size: calc(11px + var(--coc-font-boost));
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

.type-badge {
  font-size: calc(10px + var(--coc-font-boost));
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
  font-weight: 600;
}

.type-badge.handheld {
  background: rgba(201, 123, 99, 0.15);
  color: var(--coc-accent);
}

.type-badge.app,
.type-badge.web {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.tree-status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
}

.tree-status-badge.online {
  color: var(--coc-success);
  background: rgba(103, 194, 58, 0.1);
}

.tree-status-badge.offline {
  color: var(--coc-danger);
  background: rgba(245, 108, 108, 0.1);
}

:deep(.el-tree-node) { margin-bottom: 0; }

:deep(.el-tree-node__content) {
  min-height: 24px;
  height: auto;
  border-radius: 8px;
  margin-bottom: 0;
  padding-top: 2px;
  padding-bottom: 2px;
}

:deep(.el-tree-node__content:has(.cam-drag-item)),
:deep(.el-tree-node__content:has(.monitor-leaf-row)) {
  height: auto;
  align-items: flex-start;
  padding-top: 2px;
  padding-bottom: 2px;
}

:deep(.el-tree > .el-tree-node:first-child > .el-tree-node__content) {
  min-height: 26px;
  margin-bottom: 4px;
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: rgba(201, 123, 99, 0.12) !important;
}

:deep(.el-tree-node__content:hover) {
  background: rgba(201, 123, 99, 0.06);
}
</style>

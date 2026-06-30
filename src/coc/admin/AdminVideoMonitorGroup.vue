<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Upload, ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import {
  getMonitorProjects,
  getProjectGroups,
  getGroupCameras,
  addProjectGroup,
  removeProjectGroup,
  setGroupCameraIds,
  moveGroupCamera,
  cameraTypeLabel,
} from '../utils/monitorAdminStorage.js'

defineProps({
  title: { type: String, default: '监控分组' },
  description: { type: String, default: '' },
})

const projectKeyword = ref('')
const cameraKeyword = ref('')
const selectedProjectId = ref('')
const selectedGroupId = ref('')
const groupsMap = ref({})

const importVisible = ref(false)
const importChecked = ref([])

const projects = computed(() => getMonitorProjects())

const filteredProjects = computed(() => {
  const q = projectKeyword.value.trim().toLowerCase()
  if (!q) return projects.value
  return projects.value.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.shortName && p.shortName.toLowerCase().includes(q)),
  )
})

const currentGroups = computed(() =>
  selectedProjectId.value ? groupsMap.value[selectedProjectId.value] || [] : [],
)

const activeGroup = computed(() =>
  currentGroups.value.find((g) => g.id === selectedGroupId.value),
)

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === selectedProjectId.value),
)

const groupCameras = computed(() => {
  if (!selectedProjectId.value || !activeGroup.value) return []
  let list = getGroupCameras(selectedProjectId.value, activeGroup.value)
  const q = cameraKeyword.value.trim()
  if (!q) return list
  return list.filter((c) =>
    [c.name, c.location, cameraTypeLabel(c.type)].some((f) => String(f || '').includes(q)),
  )
})

const importOptions = computed(() => {
  if (!selectedProject.value || !activeGroup.value) return []
  const project = selectedProject.value
  return project.cameras.map((cam) => ({
    ...cam,
    typeLabel: cameraTypeLabel(cam.type),
  }))
})

function loadGroups() {
  const map = {}
  projects.value.forEach((p) => {
    map[p.id] = getProjectGroups(p.id)
  })
  groupsMap.value = map
}

function selectProject(projectId) {
  selectedProjectId.value = projectId
  const groups = groupsMap.value[projectId] || []
  selectedGroupId.value = groups[0]?.id || ''
}

function selectGroup(projectId, groupId) {
  selectedProjectId.value = projectId
  selectedGroupId.value = groupId
}

async function handleAddGroup(projectId) {
  try {
    const { value } = await ElMessageBox.prompt('请输入分组名称', '新增分组', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /\S+/,
      inputErrorMessage: '分组名称不能为空',
      inputValue: `分组${(groupsMap.value[projectId]?.length || 0) + 1}`,
    })
    const group = addProjectGroup(projectId, value)
    loadGroups()
    selectGroup(projectId, group.id)
    ElMessage.success('分组已创建')
  } catch {
    /* cancelled */
  }
}

async function handleDeleteGroup(projectId, group) {
  try {
    await ElMessageBox.confirm(`确定删除分组「${group.name}」？`, '提示', { type: 'warning' })
    removeProjectGroup(projectId, group.id)
    loadGroups()
    if (selectedGroupId.value === group.id) {
      const rest = groupsMap.value[projectId] || []
      selectedGroupId.value = rest[0]?.id || ''
    }
    ElMessage.success('已删除')
  } catch {
    /* cancelled */
  }
}

function openImport() {
  importChecked.value = [...(activeGroup.value?.cameraIds || [])]
  importVisible.value = true
}

function confirmImport() {
  if (!selectedProjectId.value || !selectedGroupId.value) return
  setGroupCameraIds(selectedProjectId.value, selectedGroupId.value, importChecked.value)
  loadGroups()
  importVisible.value = false
  ElMessage.success('已从监控列表导入')
}

function removeFromGroup(cameraId) {
  if (!activeGroup.value) return
  const ids = activeGroup.value.cameraIds.filter((id) => id !== cameraId)
  setGroupCameraIds(selectedProjectId.value, selectedGroupId.value, ids)
  loadGroups()
}

function moveCamera(cameraId, direction) {
  moveGroupCamera(selectedProjectId.value, selectedGroupId.value, cameraId, direction)
  loadGroups()
}

function onGroupsChange() {
  loadGroups()
}

onMounted(() => {
  loadGroups()
  if (filteredProjects.value.length) {
    selectProject(filteredProjects.value[0].id)
  }
  window.addEventListener('coc-monitor-groups-change', onGroupsChange)
})

onUnmounted(() => {
  window.removeEventListener('coc-monitor-groups-change', onGroupsChange)
})
</script>

<template>
  <div class="panel-card admin-page admin-video-page">
    <div class="panel-title simple-title">
      <span>监控分组</span>
      <el-input
        v-if="activeGroup"
        v-model="cameraKeyword"
        placeholder="搜索分组内摄像头…"
        clearable
        class="search-input"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <div class="panel-body video-split-body">
      <aside class="project-sidebar group-sidebar">
        <div class="sidebar-head">项目与分组</div>
        <el-input
          v-model="projectKeyword"
          placeholder="搜索项目"
          clearable
          size="small"
          class="sidebar-search"
        />
        <div class="project-scroll">
          <div
            v-for="project in filteredProjects"
            :key="project.id"
            class="group-block"
            :class="{ 'active-project': project.id === selectedProjectId }"
          >
            <div class="group-block-head" @click="selectProject(project.id)">
              <span class="group-block-title" :title="project.name">
                {{ project.shortName || project.name }}
              </span>
              <span class="project-meta">{{ project.cameraCount }} 路</span>
            </div>
            <div v-if="project.id === selectedProjectId" class="group-list">
              <div
                v-for="group in currentGroups"
                :key="group.id"
                class="group-item"
                :class="{ active: group.id === selectedGroupId }"
                @click="selectGroup(project.id, group.id)"
              >
                <span class="group-item-name">{{ group.name }}</span>
                <span class="group-item-count">{{ group.cameraIds.length }} 路</span>
              </div>
              <el-button
                class="add-group-btn"
                size="small"
                :icon="Plus"
                @click="handleAddGroup(project.id)"
              >
                新增分组
              </el-button>
            </div>
          </div>
          <div v-if="!filteredProjects.length" class="sidebar-empty">无匹配项目</div>
        </div>
      </aside>

      <section class="group-detail-panel">
        <template v-if="activeGroup && selectedProject">
          <div class="group-detail-head">
            <div>
              <div class="group-detail-title">{{ activeGroup.name }}</div>
              <div class="group-detail-sub">
                {{ selectedProject.shortName }} · 已纳入 {{ activeGroup.cameraIds.length }} 路监控
              </div>
            </div>
            <div class="group-toolbar">
              <el-button type="primary" size="small" :icon="Upload" @click="openImport">
                从监控列表导入
              </el-button>
              <el-button
                size="small"
                type="danger"
                plain
                :icon="Delete"
                @click="handleDeleteGroup(selectedProjectId, activeGroup)"
              >
                删除分组
              </el-button>
            </div>
          </div>

          <el-table :data="groupCameras" stripe border empty-text="分组暂无摄像头，请从监控列表导入" height="100%">
            <el-table-column type="index" label="序号" width="56" />
            <el-table-column prop="name" label="摄像头名称" min-width="150" show-overflow-tooltip />
            <el-table-column label="类型" width="72">
              <template #default="{ row }">{{ cameraTypeLabel(row.type) }}</template>
            </el-table-column>
            <el-table-column prop="location" label="位置" min-width="120" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.online ? 'success' : 'info'" size="small">
                  {{ row.online ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="排序" width="88" align="center">
              <template #default="{ row }">
                <div class="sort-btns">
                  <el-button size="small" link :icon="ArrowUp" @click="moveCamera(row.id, 'up')" />
                  <el-button size="small" link :icon="ArrowDown" @click="moveCamera(row.id, 'down')" />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row }">
                <el-button link type="danger" @click="removeFromGroup(row.id)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <div v-else class="panel-empty">请从左侧选择项目并创建/选择分组</div>
      </section>
    </div>

    <el-dialog v-model="importVisible" title="从监控列表导入" width="640px" destroy-on-close>
      <p class="import-tip">
        勾选需要纳入「{{ activeGroup?.name }}」的摄像头，顺序与勾选先后无关；导入后可在列表中使用上下箭头调整排序。
      </p>
      <el-checkbox-group v-model="importChecked" class="import-check-group">
        <el-checkbox
          v-for="cam in importOptions"
          :key="cam.id"
          :value="cam.id"
          class="import-check-item"
        >
          <span class="import-cam-name">{{ cam.name }}</span>
          <span class="muted">{{ cam.typeLabel }} · {{ cam.location || '—' }}</span>
        </el-checkbox>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport">确定导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
@import './admin-video.css';

.import-check-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
}

.import-check-item {
  display: flex;
  align-items: center;
  margin-right: 0;
  height: auto;
  padding: 6px 0;
}

.import-cam-name {
  margin-right: 8px;
  font-weight: 600;
}
</style>

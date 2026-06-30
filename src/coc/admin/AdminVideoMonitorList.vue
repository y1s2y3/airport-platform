<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, VideoCamera, Edit, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import {
  getMonitorProjects,
  getProjectCameras,
  saveProjectCamera,
  moveProjectCamera,
  emptyCameraForm,
  cameraTypeLabel,
  MONITOR_CAMERAS_CHANGE_EVENT,
} from '../utils/monitorAdminStorage.js'

defineProps({
  title: { type: String, default: '监控列表' },
  description: { type: String, default: '' },
})

const keyword = ref('')
const projectKeyword = ref('')
const selectedProjectId = ref('')
const cameraList = ref([])
const formVisible = ref(false)
const form = ref(emptyCameraForm())

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

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === selectedProjectId.value),
)

const cameras = computed(() => {
  let list = cameraList.value
  const q = keyword.value.trim()
  if (!q) return list
  return list.filter((c) =>
    [c.name, c.location, cameraTypeLabel(c.type)].some((f) => String(f || '').includes(q)),
  )
})

function loadCameras() {
  if (!selectedProjectId.value) {
    cameraList.value = []
    return
  }
  cameraList.value = getProjectCameras(selectedProjectId.value)
}

function selectProject(project) {
  selectedProjectId.value = project.id
}

function openEdit(row) {
  form.value = emptyCameraForm(row)
  formVisible.value = true
}

function validateForm() {
  if (!form.value.name?.trim()) {
    ElMessage.warning('请填写摄像头名称')
    return false
  }
  if (!form.value.location?.trim()) {
    ElMessage.warning('请填写摄像头位置')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm() || !selectedProjectId.value) return
  saveProjectCamera(selectedProjectId.value, form.value.id, {
    name: form.value.name.trim(),
    location: form.value.location.trim(),
    type: form.value.type,
    online: form.value.online,
    key: form.value.key,
  })
  loadCameras()
  formVisible.value = false
  ElMessage.success('摄像头信息已更新')
}

function moveCamera(cameraId, direction) {
  moveProjectCamera(selectedProjectId.value, cameraId, direction)
  loadCameras()
}

function initSelection() {
  if (!selectedProjectId.value && filteredProjects.value.length) {
    selectedProjectId.value = filteredProjects.value[0].id
  }
}

watch(selectedProjectId, () => {
  keyword.value = ''
  loadCameras()
})

onMounted(() => {
  initSelection()
  loadCameras()
  window.addEventListener(MONITOR_CAMERAS_CHANGE_EVENT, loadCameras)
})

onUnmounted(() => {
  window.removeEventListener(MONITOR_CAMERAS_CHANGE_EVENT, loadCameras)
})
</script>

<template>
  <div class="panel-card admin-page admin-video-page">
    <div class="panel-title simple-title">
      <span>监控列表</span>
      <el-input
        v-if="selectedProject"
        v-model="keyword"
        placeholder="搜索摄像头名称、位置…"
        clearable
        class="search-input"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <div class="panel-body video-split-body">
      <aside class="project-sidebar">
        <div class="sidebar-head">项目列表</div>
        <el-input
          v-model="projectKeyword"
          placeholder="搜索项目"
          clearable
          size="small"
          class="sidebar-search"
        />
        <div class="project-scroll">
          <button
            v-for="project in filteredProjects"
            :key="project.id"
            type="button"
            class="project-item"
            :class="{ active: project.id === selectedProjectId }"
            @click="selectProject(project)"
          >
            <span class="project-name" :title="project.name">{{ project.shortName || project.name }}</span>
            <span class="project-meta">
              <el-icon><VideoCamera /></el-icon>
              {{ project.onlineCount }}/{{ project.cameraCount }}
            </span>
          </button>
          <div v-if="!filteredProjects.length" class="sidebar-empty">无匹配项目</div>
        </div>
      </aside>

      <section class="camera-panel">
        <template v-if="selectedProject">
          <div class="camera-panel-head">
            <div>
              <div class="camera-panel-title">{{ selectedProject.shortName || selectedProject.name }}</div>
              <div class="camera-panel-sub">{{ selectedProject.name }}</div>
            </div>
            <span class="camera-count">共 {{ cameras.length }} 路摄像头</span>
          </div>
          <el-table :data="cameras" stripe border empty-text="该项目暂无摄像头" height="100%">
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
            <el-table-column label="重点" width="72">
              <template #default="{ row }">
                <el-tag v-if="row.key" type="warning" size="small">重点</el-tag>
                <span v-else class="muted">—</span>
              </template>
            </el-table-column>
            <el-table-column prop="id" label="设备ID" width="100" show-overflow-tooltip />
            <el-table-column label="排序" width="88" align="center">
              <template #default="{ row }">
                <div class="sort-btns">
                  <el-button size="small" link :icon="ArrowUp" @click="moveCamera(row.id, 'up')" />
                  <el-button size="small" link :icon="ArrowDown" @click="moveCamera(row.id, 'down')" />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="72" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
        <div v-else class="panel-empty">请从左侧选择项目</div>
      </section>
    </div>

    <el-dialog v-model="formVisible" title="编辑摄像头" width="520px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="设备ID">
          <el-input v-model="form.id" readonly />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="摄像头名称" />
        </el-form-item>
        <el-form-item label="位置" required>
          <el-input v-model="form.location" placeholder="安装位置" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="bullet">枪机</el-radio>
            <el-radio value="ptz">球机</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="在线状态">
          <el-switch v-model="form.online" active-text="在线" inactive-text="离线" />
        </el-form-item>
        <el-form-item label="重点视频">
          <el-switch v-model="form.key" active-text="是" inactive-text="否" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
@import './admin-video.css';

.sort-btns {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
}

.sort-btns .el-button {
  margin: 0;
  padding: 2px 6px;
  min-height: 20px;
}
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Edit, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
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

const { selectedProjectId, headerProjectLabel } = useCurrentProject()
const keyword = ref('')
const cameraList = ref([])
const formVisible = ref(false)
const form = ref(emptyCameraForm())

const scopeProjectId = computed(() => selectedProjectId.value)

const selectedProject = computed(
  () => getMonitorProjects().find((p) => p.id === scopeProjectId.value) || null,
)

const panelProjectLabel = computed(() => {
  if (selectedProject.value) {
    return selectedProject.value.shortName || selectedProject.value.name
  }
  return headerProjectLabel.value
})

const cameras = computed(() => {
  let list = cameraList.value
  const q = keyword.value.trim()
  if (!q) return list
  return list.filter((c) =>
    [c.name, c.location, cameraTypeLabel(c.type)].some((f) => String(f || '').includes(q)),
  )
})

const stats = computed(() => {
  const list = cameraList.value
  return {
    total: list.length,
    online: list.filter((c) => c.online).length,
    offline: list.filter((c) => !c.online).length,
    key: list.filter((c) => c.key).length,
  }
})

function loadCameras() {
  if (!scopeProjectId.value) {
    cameraList.value = []
    return
  }
  cameraList.value = getProjectCameras(scopeProjectId.value)
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
  if (!validateForm() || !scopeProjectId.value) return
  saveProjectCamera(scopeProjectId.value, form.value.id, {
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
  moveProjectCamera(scopeProjectId.value, cameraId, direction)
  loadCameras()
}

function handleReset() {
  keyword.value = ''
}

watch(scopeProjectId, () => {
  keyword.value = ''
  loadCameras()
})

onMounted(() => {
  loadCameras()
  window.addEventListener(MONITOR_CAMERAS_CHANGE_EVENT, loadCameras)
})

onUnmounted(() => {
  window.removeEventListener(MONITOR_CAMERAS_CHANGE_EVENT, loadCameras)
})
</script>

<template>
  <div class="panel-card admin-page video-monitor-page">
    <div class="panel-title simple-title">
      <div class="title-main">
        <span class="title-text">{{ title }}</span>
        <el-tag size="small" effect="plain" class="project-tag">{{ panelProjectLabel }}</el-tag>
      </div>
      <div class="title-meta">
        <span class="stat-chip">通道 {{ stats.total }}</span>
        <span class="stat-chip is-online">在线 {{ stats.online }}</span>
        <span class="stat-chip is-offline">离线 {{ stats.offline }}</span>
        <span class="stat-chip is-key">重点 {{ stats.key }}</span>
      </div>
      <div class="title-actions">
        <el-input
          v-model="keyword"
          placeholder="搜索名称、位置、类型"
          clearable
          :prefix-icon="Search"
          class="search-input" aria-label="搜索名称、位置、类型"/>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </div>

    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>
      <template v-if="selectedProject">
        <el-table :data="cameras" border stripe class="ap-table" empty-text="该项目暂无摄像头">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="通道名称" min-width="150" show-overflow-tooltip />
          <el-table-column label="类型" width="80" align="center">
            <template #default="{ row }">{{ cameraTypeLabel(row.type) }}</template>
          </el-table-column>
          <el-table-column prop="location" label="位置" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="88" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.online ? 'ap-tag-enabled' : 'ap-tag-disabled'">
                {{ row.online ? '在线' : '离线' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="重点" width="80" align="center">
            <template #default="{ row }">
              <span v-if="row.key" class="ap-status-tag ap-tag-high">重点</span>
              <span v-else class="muted">—</span>
            </template>
          </el-table-column>
          <el-table-column prop="id" label="设备ID" width="120" show-overflow-tooltip />
          <el-table-column label="排序" width="72" align="center">
            <template #default="{ row }">
              <div class="sort-btns">
                <el-button size="small" link :icon="ArrowUp" @click="moveCamera(row.id, 'up')" />
                <el-button size="small" link :icon="ArrowDown" @click="moveCamera(row.id, 'down')" />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <div v-else class="panel-empty">当前项目暂无监控数据</div>
    </div>

    <el-dialog v-model="formVisible" title="编辑摄像头" width="520px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item label="设备ID">
          <el-input v-model="form.id" readonly />
        </el-form-item>
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="摄像头名称" aria-label="摄像头名称"/>
        </el-form-item>
        <el-form-item label="位置" required>
          <el-input v-model="form.location" placeholder="安装位置" aria-label="安装位置"/>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio value="gun">枪机</el-radio>
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
        <el-button type="primary" class="ap-btn-primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: calc(100vh - 120px);
}

.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ap-text, #303133);
  border-left: 4px solid var(--ap-primary, #8f0045);
  padding: 4px 0 4px 12px;
}

.title-main {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.title-text {
  line-height: 1.3;
}

.project-tag {
  font-weight: 500;
  border-color: rgba(143, 0, 69, 0.28);
  color: var(--ap-primary, #8f0045);
  background: rgba(143, 0, 69, 0.06);
}

.title-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  font-size: 12px;
  font-weight: 500;
  color: var(--ap-text-secondary, #606266);
  background: #f4f5f7;
}

.stat-chip.is-online {
  color: #067647;
  background: #ecfdf3;
}

.stat-chip.is-offline {
  color: #475467;
  background: #f2f4f7;
}

.stat-chip.is-key {
  color: #b54708;
  background: #fffaeb;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-left: auto;
}

.search-input {
  width: 240px;
}

.page-body {
  padding: 16px 20px 24px !important;
}

.page-desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--ap-text-muted, #909399);
}

.panel-empty {
  padding: 48px 16px;
  text-align: center;
  font-size: 14px;
  color: var(--ap-text-muted);
}

.muted {
  color: var(--ap-text-muted);
}

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

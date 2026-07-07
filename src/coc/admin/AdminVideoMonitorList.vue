<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Edit, ArrowUp, ArrowDown } from '@element-plus/icons-vue'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
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

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const keyword = ref('')
const cameraList = ref([])
const formVisible = ref(false)
const form = ref(emptyCameraForm())

const monitorProjects = computed(() => getMonitorProjects())

const treeData = computed(() => [
  {
    id: 'hq',
    label: '工程指挥部',
    children: monitorProjects.value.map((project) => ({
      id: project.id,
      label: `${project.shortName || project.name}(${project.onlineCount}/${project.cameraCount})`,
    })),
  },
])

const selectedProject = computed(() =>
  monitorProjects.value.find((p) => p.id === scopeProjectId.value) || null,
)

const panelProjectLabel = computed(() => {
  if (selectedProject.value) {
    return selectedProject.value.shortName || selectedProject.value.name
  }
  return scopeProjectLabel.value
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
  const project = selectedProject.value
  if (!project) {
    return { total: 0, online: 0, offline: 0, key: 0 }
  }
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

function ensureValidProjectSelection() {
  const ids = monitorProjects.value.map((p) => p.id)
  if (!ids.length) return
  if (!ids.includes(scopeProjectId.value)) {
    treeProjectId.value = ids[0]
  }
}

watch(monitorProjects, ensureValidProjectSelection, { immediate: true })

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
  <div class="monitor-list-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">视频监控 / 监控列表</div>
      <div class="page-heading">
        <h1 class="page-title">监控列表</h1>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ panelProjectLabel }}</p>
      <p v-if="description" class="page-tip">{{ description }}</p>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree
          :data="treeData"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="treeProjectId"
          :expand-on-click-node="false"
          class="project-tree"
          @node-click="onTreeNodeClick"
        />
      </aside>

      <div class="monitor-panel page-panel">
        <div v-if="isHqSelected" class="panel-title">{{ panelProjectLabel }}</div>

        <template v-if="selectedProject">
          <div class="panel-head">
            <div class="panel-stats">
              <span>通道 {{ stats.total }} 路</span>
              <span>在线 {{ stats.online }}</span>
              <span>离线 {{ stats.offline }}</span>
              <span>重点 {{ stats.key }}</span>
            </div>
          </div>

          <div class="filter-bar">
            <el-input
              v-model="keyword"
              placeholder="搜索摄像头名称、位置、类型"
              clearable
              :prefix-icon="Search"
              class="search-input"
            />
            <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </div>

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

        <div v-else class="panel-empty">
          {{ isHqSelected ? '当前项目暂无监控数据，请从左侧选择其他项目' : '当前项目暂无监控数据' }}
        </div>
      </div>
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
        <el-button type="primary" class="ap-btn-primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.monitor-list-page {
  padding: 0;
}

.page-header {
  margin-bottom: 16px;
}

.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted);
  margin-bottom: 8px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-scope {
  margin: 4px 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
}

.page-tip {
  margin-top: 0;
  font-size: 12px;
  color: var(--ap-text-muted);
  line-height: 1.5;
}

.page-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.page-layout.with-tree {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  min-height: 560px;
}

.project-tree-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 12px;
}

.project-tree :deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 4px;
}

.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}

.panel-head {
  margin-bottom: 12px;
}

.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.search-input {
  width: 300px;
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

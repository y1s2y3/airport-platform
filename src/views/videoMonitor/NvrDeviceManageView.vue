<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  getNvrDevices,
  saveNvrDevice,
  removeNvrDevice,
  emptyNvrDevice,
  NVR_DEVICES_CHANGE_EVENT,
} from '../../coc/utils/nvrDeviceStorage.js'

defineProps({
  title: { type: String, default: '设备管理' },
  description: { type: String, default: '' },
})

const { selectedProjectId, headerProjectLabel } = useCurrentProject()
const keyword = ref('')
const list = ref([])
const formVisible = ref(false)
const form = ref(emptyNvrDevice())

const scopedList = computed(() =>
  list.value.filter((row) => row.projectId === selectedProjectId.value),
)

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return scopedList.value
  return scopedList.value.filter((row) =>
    [row.id, row.name, row.project, row.ip, row.remark].some((f) => String(f || '').includes(q)),
  )
})

const onlineCount = computed(() => scopedList.value.filter((row) => row.online).length)
const offlineCount = computed(() => scopedList.value.length - onlineCount.value)

function load() {
  list.value = getNvrDevices()
}

function openCreate() {
  form.value = emptyNvrDevice({
    projectId: selectedProjectId.value,
    project: headerProjectLabel.value,
  })
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptyNvrDevice(row)
  formVisible.value = true
}

function validateForm() {
  if (!form.value.name?.trim()) {
    ElMessage.warning('请填写 NVR 名称')
    return false
  }
  if (!selectedProjectId.value) {
    ElMessage.warning('请先在顶部选择项目')
    return false
  }
  if (!form.value.ip?.trim()) {
    ElMessage.warning('请填写 IP 地址')
    return false
  }
  return true
}

function submitForm() {
  if (!validateForm()) return
  saveNvrDevice({
    ...form.value,
    name: form.value.name.trim(),
    projectId: selectedProjectId.value,
    project: headerProjectLabel.value,
    ip: form.value.ip.trim(),
    lastSync: form.value.online
      ? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      : form.value.lastSync,
  })
  load()
  formVisible.value = false
  ElMessage.success('NVR 设备信息已保存')
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除 NVR「${row.name}」？`, '提示', { type: 'warning' })
    removeNvrDevice(row.id)
    load()
    ElMessage.success('已删除')
  } catch {
    /* cancelled */
  }
}

watch(selectedProjectId, () => {
  keyword.value = ''
})

onMounted(() => {
  load()
  window.addEventListener(NVR_DEVICES_CHANGE_EVENT, load)
})

onUnmounted(() => {
  window.removeEventListener(NVR_DEVICES_CHANGE_EVENT, load)
})
</script>

<template>
  <div class="panel-card admin-page video-monitor-page">
    <div class="panel-title simple-title">
      <div class="title-main">
        <span class="title-text">{{ title }}</span>
        <el-tag size="small" effect="plain" class="project-tag">{{ headerProjectLabel }}</el-tag>
      </div>
      <div class="title-meta">
        <span class="stat-chip">设备 {{ filtered.length }}</span>
        <span class="stat-chip is-online">在线 {{ onlineCount }}</span>
        <span class="stat-chip is-offline">离线 {{ offlineCount }}</span>
      </div>
      <div class="title-actions">
        <el-input v-model="keyword" placeholder="搜索名称、IP…" clearable class="search-input" />
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">注册 NVR</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="当前项目暂无 NVR 设备">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="id" label="设备编号" width="108" />
        <el-table-column prop="name" label="NVR 名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="project" label="绑定项目" width="120" />
        <el-table-column label="IP / 端口" width="160">
          <template #default="{ row }">{{ row.ip }}:{{ row.port }}</template>
        </el-table-column>
        <el-table-column label="通道" width="100">
          <template #default="{ row }">{{ row.usedChannels }}/{{ row.channelCount }}</template>
        </el-table-column>
        <el-table-column label="在线状态" width="96">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'info'" size="small">
              {{ row.online ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastSync" label="最近同步" width="148" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="form.id ? '编辑 NVR' : '注册 NVR'" width="560px" destroy-on-close>
      <el-form label-width="108px">
        <el-form-item label="NVR 名称" required>
          <el-input v-model="form.name" placeholder="如：三跑道 NVR-01" />
        </el-form-item>
        <el-form-item label="绑定项目">
          <el-input :model-value="headerProjectLabel" readonly />
        </el-form-item>
        <el-form-item label="IP 地址" required>
          <el-input v-model="form.ip" placeholder="192.168.1.100" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="form.port" :min="1" :max="65535" controls-position="right" />
        </el-form-item>
        <el-form-item label="通道总数">
          <el-input-number v-model="form.channelCount" :min="1" :max="128" controls-position="right" />
        </el-form-item>
        <el-form-item label="已用通道">
          <el-input-number v-model="form.usedChannels" :min="0" :max="form.channelCount" controls-position="right" />
        </el-form-item>
        <el-form-item label="登录账号">
          <el-input v-model="form.username" placeholder="admin" />
        </el-form-item>
        <el-form-item label="在线状态">
          <el-switch v-model="form.online" active-text="在线" inactive-text="离线" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选" />
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
</style>

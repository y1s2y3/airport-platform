<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import { buildProjects } from '../../coc/mock/data.js'
import {
  getPatrolDevices,
  savePatrolDevice,
  emptyPatrolDevice,
} from '../../utils/cocAdminDeviceStorage.js'

defineProps({
  title: { type: String, default: '巡检仪管理' },
  description: { type: String, default: '' },
})

const keyword = ref('')
const list = ref([])
const formVisible = ref(false)
const form = ref(emptyPatrolDevice())

const projectOptions = buildProjects().map((p) => p.shortName || p.name)

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return list.value
  return list.value.filter((row) =>
    [row.id, row.name, row.project, row.bindPerson].some((f) => String(f || '').includes(q)),
  )
})

function load() {
  list.value = getPatrolDevices()
}

function openCreate() {
  form.value = emptyPatrolDevice()
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptyPatrolDevice(row)
  formVisible.value = true
}

function submitForm() {
  if (!form.value.name?.trim()) {
    ElMessage.warning('请填写设备名称')
    return
  }
  if (!form.value.project?.trim()) {
    ElMessage.warning('请选择绑定项目')
    return
  }
  savePatrolDevice({
    ...form.value,
    lastOnline: form.value.online
      ? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      : form.value.lastOnline,
  })
  load()
  formVisible.value = false
  ElMessage.success('巡检仪信息已保存')
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-input v-model="keyword" placeholder="搜索编号、项目、人员…" clearable class="search-input" />
        <el-button type="primary" :icon="Plus" @click="openCreate">注册设备</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无巡检仪设备">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="id" label="设备编号" width="120" />
        <el-table-column prop="name" label="设备名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="project" label="绑定项目" width="120" />
        <el-table-column prop="bindPerson" label="绑定人员" width="108" />
        <el-table-column label="在线状态" width="96">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'info'" size="small">
              {{ row.online ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="对讲关联" width="96">
          <template #default="{ row }">
            <el-tag :type="row.intercomLinked ? 'success' : 'warning'" size="small">
              {{ row.intercomLinked ? '已关联' : '未关联' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastOnline" label="最近在线" width="148" />
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="form.id ? '编辑巡检仪' : '注册巡检仪'" width="520px">
      <el-form label-width="96px">
        <el-form-item label="设备名称" required>
          <el-input v-model="form.name" placeholder="如：三跑道东区巡检仪" />
        </el-form-item>
        <el-form-item label="绑定项目" required>
          <el-select v-model="form.project" placeholder="选择项目" filterable style="width: 100%">
            <el-option v-for="p in projectOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="绑定人员">
          <el-input v-model="form.bindPerson" placeholder="可选，绑定现场负责人" />
        </el-form-item>
        <el-form-item label="在线状态">
          <el-switch v-model="form.online" active-text="在线" inactive-text="离线" />
        </el-form-item>
        <el-form-item label="调度对讲">
          <el-switch v-model="form.intercomLinked" active-text="已关联" inactive-text="未关联" />
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
.simple-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 16px;
  border-left: 4px solid #409eff;
  padding-left: 12px;
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
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}
</style>

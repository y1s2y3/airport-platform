<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit } from '@element-plus/icons-vue'
import { buildProjects } from '../../coc/mock/data.js'
import {
  getSmartHelmets,
  saveSmartHelmet,
  emptySmartHelmet,
} from '../../utils/cocAdminDeviceStorage.js'

defineProps({
  title: { type: String, default: '智能安全帽管理' },
  description: { type: String, default: '' },
})

const keyword = ref('')
const list = ref([])
const formVisible = ref(false)
const form = ref(emptySmartHelmet())

const projectOptions = buildProjects().map((p) => p.shortName || p.name)

const filtered = computed(() => {
  const q = keyword.value.trim()
  if (!q) return list.value
  return list.value.filter((row) =>
    [row.id, row.serialNo, row.project, row.bindPerson, row.location].some((f) =>
      String(f || '').includes(q),
    ),
  )
})

function load() {
  list.value = getSmartHelmets()
}

function openCreate() {
  form.value = emptySmartHelmet()
  formVisible.value = true
}

function openEdit(row) {
  form.value = emptySmartHelmet(row)
  formVisible.value = true
}

function submitForm() {
  if (!form.value.serialNo?.trim()) {
    ElMessage.warning('请填写设备序列号')
    return
  }
  if (!form.value.project?.trim()) {
    ElMessage.warning('请选择绑定项目')
    return
  }
  saveSmartHelmet({
    ...form.value,
    lastHeartbeat: form.value.online
      ? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      : form.value.lastHeartbeat,
  })
  load()
  formVisible.value = false
  ElMessage.success('安全帽信息已保存')
}

onMounted(load)
</script>

<template>
  <div class="panel-card admin-page">
    <div class="panel-title simple-title">
      <span>{{ title }}</span>
      <div class="title-actions">
        <el-input v-model="keyword" placeholder="搜索序列号、项目、人员…" clearable class="search-input" />
        <el-button type="primary" :icon="Plus" @click="openCreate">新增设备</el-button>
      </div>
    </div>
    <div class="panel-body page-body">
      <p v-if="description" class="page-desc">{{ description }}</p>
      <el-table :data="filtered" stripe border empty-text="暂无智能安全帽设备">
        <el-table-column type="index" label="序号" width="56" />
        <el-table-column prop="serialNo" label="序列号" width="140" />
        <el-table-column prop="bindPerson" label="绑定人员" width="108" />
        <el-table-column prop="project" label="所属项目" width="120" />
        <el-table-column label="在线状态" width="96">
          <template #default="{ row }">
            <el-tag :type="row.online ? 'success' : 'info'" size="small">
              {{ row.online ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="定位位置" min-width="160" show-overflow-tooltip />
        <el-table-column prop="lastHeartbeat" label="最近心跳" width="148" />
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="formVisible" :title="form.id ? '编辑安全帽' : '新增安全帽'" width="520px">
      <el-form label-width="96px">
        <el-form-item label="序列号" required>
          <el-input v-model="form.serialNo" placeholder="如：HLM-20260301" />
        </el-form-item>
        <el-form-item label="绑定项目" required>
          <el-select v-model="form.project" placeholder="选择项目" filterable style="width: 100%">
            <el-option v-for="p in projectOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="绑定人员">
          <el-input v-model="form.bindPerson" placeholder="绑定佩戴人员" />
        </el-form-item>
        <el-form-item label="定位位置">
          <el-input v-model="form.location" placeholder="最新定位描述" />
        </el-form-item>
        <el-form-item label="在线状态">
          <el-switch v-model="form.online" active-text="在线" inactive-text="离线" />
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
  border-left: 4px solid #67c23a;
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

<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  projectList,
  createEmptyProject,
  createProjectFields,
  deriveShortName,
  formatConstructionPeriod,
} from '../../mock/projectBasicInfo'
import { mergeSafetyProfile } from '../../mock/projectSafetyProfile'
import ProjectSafetyProfileForm from '../../components/basicData/ProjectSafetyProfileForm.vue'

const filters = ref({
  projectName: '',
})

const dialogVisible = ref(false)
const formMode = ref('create')
const formModel = ref(null)

const filteredList = computed(() => {
  return projectList.filter((row) => {
    if (!filters.value.projectName) return true
    const kw = filters.value.projectName.trim()
    return row.projectName.includes(kw) || row.shortName.includes(kw)
  })
})

const dialogTitle = computed(() => {
  if (formMode.value === 'create') return '新增项目基础信息'
  if (formMode.value === 'view') {
    return formModel.value?.projectName
      ? `查看项目画像 · ${formModel.value.projectName}`
      : '查看项目画像'
  }
  return formModel.value?.projectName ? `编辑 · ${formModel.value.projectName}` : '编辑项目基础信息'
})

function handleReset() {
  filters.value = { projectName: '' }
}

function cloneProject(row) {
  return {
    ...row,
    ...createProjectFields(row),
    safetyProfile: mergeSafetyProfile(row.safetyProfile),
  }
}

function openCreate() {
  formMode.value = 'create'
  formModel.value = createEmptyProject()
  dialogVisible.value = true
}

function openEdit(row) {
  const source = projectList.find((item) => item.id === row.id)
  if (!source) return
  formMode.value = 'edit'
  formModel.value = cloneProject(source)
  dialogVisible.value = true
}

function openViewPortrait(row) {
  const source = projectList.find((item) => item.id === row.id)
  if (!source) return
  formMode.value = 'view'
  formModel.value = cloneProject(source)
  dialogVisible.value = true
}

function formatPeriod(row) {
  return formatConstructionPeriod(row) || '—'
}

function handleSave() {
  const data = formModel.value
  if (!data?.projectName?.trim()) {
    ElMessage.warning('请填写项目名称')
    return
  }

  data.projectName = data.projectName.trim()
  data.shortName = deriveShortName(data.projectName)

  if (formMode.value === 'create') {
    projectList.unshift({ ...data })
    ElMessage.success('新增成功')
  } else {
    const index = projectList.findIndex((item) => item.id === data.id)
    if (index === -1) {
      ElMessage.error('未找到要编辑的项目')
      return
    }
    Object.assign(projectList[index], data)
    ElMessage.success('保存成功')
  }

  dialogVisible.value = false
  formModel.value = null
}
</script>

<template>
  <div class="project-info-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 项目基础信息</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">项目基础信息</h1>
          <span class="level-tag">项目填报</span>
        </div>
        <el-button class="ap-btn-primary" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label>项目名称</label>
          <el-input v-model="filters.projectName" placeholder="项目名称/简称" clearable style="width: 240px" />
        </div>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-summary">共 {{ filteredList.length }} 个项目</div>
      <el-table :data="filteredList" border stripe class="ap-table project-info-table">
        <el-table-column type="index" label="#" width="52" align="center" />
        <el-table-column prop="projectName" label="项目名称" min-width="280" show-overflow-tooltip />
        <el-table-column prop="shortName" label="项目简称" width="140" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="项目编号" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.projectCode || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="项目状态" width="96" align="center" />
        <el-table-column label="建设期" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatPeriod(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="personInCharge" label="负责人" width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.personInCharge || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="是否隐藏" width="96" align="center">
          <template #default="{ row }">
            <el-switch v-model="row.hidden" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="168" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openViewPortrait(row)">查看项目画像</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="1200px"
      top="3vh"
      destroy-on-close
      class="project-detail-dialog"
    >
      <div class="dialog-scroll-body">
        <ProjectSafetyProfileForm
          v-if="formModel"
          :model="formModel"
          :readonly="formMode === 'view'"
        />
      </div>

      <template #footer>
        <template v-if="formMode === 'view'">
          <el-button class="ap-btn-primary" type="primary" @click="dialogVisible = false">关闭</el-button>
        </template>
        <template v-else>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button class="ap-btn-primary" type="primary" @click="handleSave">保存</el-button>
        </template>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.project-info-page {
  padding: 20px 24px 24px;
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
  gap: 16px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--ap-text);
}

.level-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--ap-primary);
  background: var(--ap-primary-light);
  border: 1px solid rgba(143, 0, 69, 0.15);
}

.filter-bar {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 13px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.table-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
}

.table-summary {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.dialog-scroll-body {
  max-height: calc(92vh - 140px);
  overflow: auto;
}

.project-detail-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}
</style>

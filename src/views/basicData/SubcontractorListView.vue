<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getProjectSelectOptions } from '../../mock/projectBasicInfo'
import {
  subcontractorList,
  createEmptyParticipantUnit,
  cloneParticipantUnit,
} from '../../mock/subcontractorManagement'

const projectOptions = computed(() => getProjectSelectOptions())

const filters = ref({
  projectId: projectOptions.value[0]?.id || '',
  name: '',
})

watch(
  projectOptions,
  (options) => {
    if (!options.length) {
      filters.value.projectId = ''
      return
    }
    if (!options.some((item) => item.id === filters.value.projectId)) {
      filters.value.projectId = options[0].id
    }
  },
  { immediate: true },
)

const dialogVisible = ref(false)
const formMode = ref('create')
const formModel = ref(null)

const filteredList = computed(() => {
  return subcontractorList.filter((row) => {
    if (filters.value.projectId && row.projectId !== filters.value.projectId) return false
    if (filters.value.name) {
      const kw = filters.value.name.trim()
      if (!row.name.includes(kw) && !row.shortName.includes(kw)) return false
    }
    return true
  })
})

const currentProjectName = computed(
  () => projectOptions.value.find((p) => p.id === filters.value.projectId)?.name || '—',
)

const dialogTitle = computed(() => {
  if (formMode.value === 'create') return '新增分包单位'
  return formModel.value?.name ? `编辑 · ${formModel.value.name}` : '编辑分包单位'
})

function handleReset() {
  filters.value = {
    projectId: projectOptions.value[0]?.id || '',
    name: '',
  }
}

function resolveProjectName(projectId) {
  return projectOptions.value.find((item) => item.id === projectId)?.name || ''
}

function openCreate() {
  const projectId = filters.value.projectId || projectOptions.value[0]?.id || ''
  formMode.value = 'create'
  formModel.value = createEmptyParticipantUnit(projectId, resolveProjectName(projectId))
  dialogVisible.value = true
}

function openEdit(row) {
  const source = subcontractorList.find((item) => item.id === row.id)
  if (!source) return
  formMode.value = 'edit'
  formModel.value = cloneParticipantUnit(source)
  dialogVisible.value = true
}

function onFormProjectChange(projectId) {
  if (!formModel.value) return
  formModel.value.projectId = projectId
  formModel.value.projectName = resolveProjectName(projectId)
}

function handleSave() {
  const data = formModel.value
  if (!data?.projectId) {
    ElMessage.warning('请选择所属项目')
    return
  }
  if (!data.name?.trim()) {
    ElMessage.warning('请填写分包单位名称')
    return
  }

  data.name = data.name.trim()
  data.shortName = data.shortName?.trim() || data.name.slice(0, 8)
  data.projectName = resolveProjectName(data.projectId)

  if (formMode.value === 'create') {
    subcontractorList.unshift({ ...data })
    ElMessage.success('新增成功')
  } else {
    const index = subcontractorList.findIndex((item) => item.id === data.id)
    if (index === -1) {
      ElMessage.error('未找到要编辑的记录')
      return
    }
    Object.assign(subcontractorList[index], data)
    ElMessage.success('保存成功')
  }

  dialogVisible.value = false
  formModel.value = null
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    const index = subcontractorList.findIndex((item) => item.id === row.id)
    if (index === -1) return
    subcontractorList.splice(index, 1)
    ElMessage.success('已删除')
  } catch {
    /* cancelled */
  }
}
</script>

<template>
  <div class="sub-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 分包单位管理</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">分包单位管理</h1>
          <span class="level-tag">按项目登记</span>
        </div>
        <el-button class="ap-btn-primary" type="primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label>所属项目</label>
          <el-select v-model="filters.projectId" filterable style="width: 320px">
            <el-option
              v-for="opt in projectOptions"
              :key="opt.id"
              :label="opt.name"
              :value="opt.id"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <label>分包单位</label>
          <el-input v-model="filters.name" placeholder="单位名称/简称" clearable style="width: 200px" />
        </div>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-summary">
        {{ currentProjectName }} · 共 {{ filteredList.length }} 家分包单位
      </div>
      <el-table :data="filteredList" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="56" align="center" />
        <el-table-column prop="name" label="分包单位名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="safetyLicenseNo" label="安全生产许可证编号" min-width="180" show-overflow-tooltip />
        <el-table-column prop="safetyLicenseExpiry" label="许可证有效期" width="120" />
        <el-table-column prop="projectManagerContact" label="项目负责人" min-width="160" show-overflow-tooltip />
        <el-table-column prop="safetyManagerContact" label="安全管理人员" min-width="160" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="1080px"
      destroy-on-close
      class="participant-dialog"
    >
      <el-form v-if="formModel" :model="formModel" label-width="168px" class="register-form">
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="所属项目" required>
              <el-select
                :model-value="formModel.projectId"
                filterable
                style="width: 100%"
                @update:model-value="onFormProjectChange"
              >
                <el-option
                  v-for="opt in projectOptions"
                  :key="opt.id"
                  :label="opt.name"
                  :value="opt.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分包单位名称" required>
              <el-input v-model="formModel.name" placeholder="单位全称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位简称">
              <el-input v-model="formModel.shortName" placeholder="可选" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="section-title">安全生产许可</div>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="单位安全生产许可证编号">
              <el-input v-model="formModel.safetyLicenseNo" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="安全生产许可证有效期">
              <el-date-picker
                v-model="formModel.safetyLicenseExpiry"
                type="date"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="安全生产许可证照片">
              <el-input v-model="formModel.safetyLicensePhoto" placeholder="附件名称" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="section-title">现场管理人员</div>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="项目负责人姓名及电话">
              <el-input v-model="formModel.projectManagerContact" placeholder="姓名 / 电话" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="安全管理人员姓名及电话">
              <el-input v-model="formModel.safetyManagerContact" placeholder="姓名 / 电话" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="安全管理人员姓名及电话">
              <el-input v-model="formModel.safetyManagerContact2" placeholder="姓名 / 电话" />
            </el-form-item>
          </el-col>
        </el-row>

        <div
          v-for="idx in 3"
          :key="`qual-${idx}`"
          class="qual-block"
        >
          <div class="section-title">资质证书 {{ idx }}</div>
          <el-row :gutter="16">
            <el-col :span="8">
              <el-form-item label="资质证书">
                <el-input v-model="formModel.qualifications[idx - 1].name" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="证书编号">
                <el-input v-model="formModel.qualifications[idx - 1].certNo" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="资质证书照片">
                <el-input v-model="formModel.qualifications[idx - 1].photo" placeholder="附件名称" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button class="ap-btn-primary" type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sub-page {
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
  overflow: auto;
}

.table-summary {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.register-form :deep(.el-form-item) {
  margin-bottom: 14px;
}

.section-title {
  margin: 8px 0 14px;
  padding-left: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  border-left: 3px solid var(--ap-primary);
}

.qual-block + .qual-block {
  margin-top: 4px;
}
</style>

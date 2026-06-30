<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  projectList,
  getProjectDetail,
  unitTypeOptions,
  buildNatureOptions,
  projectStatusOptions,
  hiddenOptions,
} from '../../mock/projectBasicInfo'

const filters = ref({
  projectName: '',
  projectCode: '',
  projectStatus: '',
})

const detailVisible = ref(false)
const viewing = ref(true)
const basicInfo = ref({})
const unitRows = ref([])

const filteredList = computed(() => {
  return projectList.filter((row) => {
    if (filters.value.projectName) {
      const kw = filters.value.projectName.trim()
      if (!row.projectName.includes(kw) && !row.shortName.includes(kw)) return false
    }
    if (filters.value.projectCode && !row.projectCode.includes(filters.value.projectCode.trim())) {
      return false
    }
    if (filters.value.projectStatus && row.projectStatus !== filters.value.projectStatus) {
      return false
    }
    return true
  })
})

function handleSearch() {
  // list is reactive via computed
}

function handleReset() {
  filters.value = { projectName: '', projectCode: '', projectStatus: '' }
}

function statusTagClass(status) {
  if (status === '在建') return 'ap-tag-enabled'
  if (status === '前期') return 'ap-tag-draft'
  if (status === '停工') return 'ap-tag-medium'
  if (status === '竣工') return 'ap-tag-low'
  return 'ap-tag-disabled'
}

function openDetail(row) {
  const detail = getProjectDetail(row.id)
  if (!detail) return
  basicInfo.value = {
    projectName: detail.projectName,
    projectCode: detail.projectCode,
    nationalCode: detail.nationalCode,
    manager: detail.manager,
    currentPhase: detail.currentPhase,
    sceneId: detail.sceneId,
  }
  unitRows.value = detail.relatedUnits.map((item) => ({ ...item }))
  viewing.value = true
  detailVisible.value = true
}

function handleView() {
  viewing.value = true
}

function handleEdit() {
  viewing.value = false
}

function handleSave() {
  viewing.value = true
  ElMessage.success('项目基础信息已保存')
}

function addUnitRow() {
  const nextId = unitRows.value.reduce((max, row) => Math.max(max, row.id), 0) + 1
  unitRows.value.push({
    id: nextId,
    unitType: '',
    unitName: '',
    projectShortName: '',
    recordNo: '',
    buildNature: '',
    projectStatus: '',
    sortOrder: 1000,
    hidden: false,
    contact: '',
    phone: '',
  })
}

async function removeUnitRow(row) {
  await ElMessageBox.confirm('确认删除该相关单位记录？', '提示', { type: 'warning' })
  unitRows.value = unitRows.value.filter((item) => item.id !== row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="project-info-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">基础数据管理 / 项目管理 / 项目基础信息</div>
      <div class="page-heading">
        <div class="title-block">
          <h1 class="page-title">项目基础信息</h1>
          <span class="level-tag">指挥部层级</span>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label>项目名称</label>
          <el-input v-model="filters.projectName" placeholder="项目名称/简称" clearable style="width: 180px" />
        </div>
        <div class="filter-item">
          <label>项目编号</label>
          <el-input v-model="filters.projectCode" placeholder="项目编号" clearable style="width: 160px" />
        </div>
        <div class="filter-item">
          <label>项目状态</label>
          <el-select v-model="filters.projectStatus" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="opt in projectStatusOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="table-summary">共 {{ filteredList.length }} 个项目</div>
      <el-table :data="filteredList" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="shortName" label="项目简称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="projectName" label="项目名称" min-width="220" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="项目编号" min-width="140" show-overflow-tooltip />
        <el-table-column prop="nationalCode" label="国家统一编码" min-width="180" show-overflow-tooltip />
        <el-table-column label="项目状态" width="90" align="center">
          <template #default="{ row }">
            <span class="ap-status-tag" :class="statusTagClass(row.projectStatus)">{{ row.projectStatus }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="currentPhase" label="项目当前阶段" min-width="110" />
        <el-table-column prop="manager" label="负责人" width="90" />
        <el-table-column prop="sortOrder" label="排序" width="70" align="center" />
        <el-table-column label="是否隐藏" width="90" align="center">
          <template #default="{ row }">
            {{ row.hidden ? '是' : '否' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="detailVisible"
      :title="basicInfo.projectName || '项目详情'"
      width="960px"
      destroy-on-close
      class="project-detail-dialog"
    >
      <div class="dialog-actions">
        <el-button v-if="!viewing" :icon="View" @click="handleView">查看</el-button>
        <el-button v-else @click="handleEdit">编辑</el-button>
        <el-button class="ap-btn-primary" type="primary" :disabled="viewing" @click="handleSave">保存</el-button>
      </div>

      <section class="info-section">
        <div class="section-title">项目基本信息</div>
        <el-form :model="basicInfo" label-width="120px" class="basic-form" :disabled="viewing">
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="项目名称">
                <el-input v-model="basicInfo.projectName" placeholder="请输入项目名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目编号">
                <el-input v-model="basicInfo.projectCode" placeholder="请输入项目编号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="国家统一编码">
                <el-input v-model="basicInfo.nationalCode" placeholder="请输入国家统一编码" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="负责人">
                <el-input v-model="basicInfo.manager" placeholder="请输入负责人" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="项目当前阶段">
                <el-input v-model="basicInfo.currentPhase" placeholder="请输入项目当前阶段" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="关联场景ID">
                <el-input v-model="basicInfo.sceneId" placeholder="请输入关联场景ID" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </section>

      <section class="info-section">
        <div class="section-head">
          <div class="section-title">相关单位信息</div>
          <el-button
            class="ap-btn-primary"
            type="primary"
            :icon="Plus"
            :disabled="viewing"
            @click="addUnitRow"
          >
            添加
          </el-button>
        </div>

        <el-table :data="unitRows" border stripe class="ap-table unit-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column label="单位性质" min-width="120">
            <template #default="{ row }">
              <el-select v-model="row.unitType" placeholder="请选择" clearable :disabled="viewing">
                <el-option v-for="opt in unitTypeOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="单位名称" min-width="140">
            <template #default="{ row }">
              <el-input v-model="row.unitName" placeholder="请选择" :disabled="viewing" />
            </template>
          </el-table-column>
          <el-table-column label="项目简称" min-width="110">
            <template #default="{ row }">
              <el-input v-model="row.projectShortName" placeholder="项目简称" :disabled="viewing" />
            </template>
          </el-table-column>
          <el-table-column label="备案编号" min-width="150">
            <template #default="{ row }">
              <el-input v-model="row.recordNo" placeholder="备案编号" :disabled="viewing" />
            </template>
          </el-table-column>
          <el-table-column label="建设性质" min-width="110">
            <template #default="{ row }">
              <el-select v-model="row.buildNature" placeholder="请选择" clearable :disabled="viewing">
                <el-option v-for="opt in buildNatureOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column min-width="110">
            <template #header>
              <span class="required-label">项目状态</span>
            </template>
            <template #default="{ row }">
              <el-select v-model="row.projectStatus" placeholder="请选择" clearable :disabled="viewing">
                <el-option v-for="opt in projectStatusOptions" :key="opt" :label="opt" :value="opt" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="排序" width="100">
            <template #default="{ row }">
              <el-input-number
                v-model="row.sortOrder"
                :min="0"
                :controls="false"
                class="sort-input"
                :disabled="viewing"
              />
            </template>
          </el-table-column>
          <el-table-column label="是否隐藏" width="100">
            <template #default="{ row }">
              <el-select v-model="row.hidden" placeholder="请选择" :disabled="viewing">
                <el-option
                  v-for="opt in hiddenOptions"
                  :key="String(opt.value)"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="联系人" min-width="100">
            <template #default="{ row }">
              <el-input v-model="row.contact" placeholder="联系人" :disabled="viewing" />
            </template>
          </el-table-column>
          <el-table-column label="联系方式" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.phone" placeholder="联系方式" :disabled="viewing" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="danger" :disabled="viewing" @click="removeUnitRow(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
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

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 16px;
}

.info-section {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px 20px 20px;
  margin-bottom: 16px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
  margin-bottom: 16px;
}

.section-head .section-title {
  margin-bottom: 0;
}

.basic-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.unit-table :deep(.el-select),
.unit-table :deep(.el-input),
.unit-table :deep(.el-input-number) {
  width: 100%;
}

.sort-input {
  width: 100%;
}

.required-label::before {
  content: '*';
  color: var(--ap-danger);
  margin-right: 4px;
}
</style>

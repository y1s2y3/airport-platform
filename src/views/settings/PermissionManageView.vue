<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { permissionList, permissionTypeOptions } from '../../mock/rbac'

const keyword = ref('')
const typeFilter = ref('全部')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredList = computed(() => {
  return permissionList.filter((row) => {
    if (typeFilter.value !== '全部' && row.type !== typeFilter.value) return false
    const kw = keyword.value.trim()
    if (!kw) return true
    return (
      row.code.includes(kw) ||
      row.name.includes(kw) ||
      row.module.includes(kw) ||
      row.description.includes(kw)
    )
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function typeTagClass(type) {
  if (type === '菜单') return 'type-menu'
  if (type === '按钮') return 'type-btn'
  return 'type-api'
}

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  keyword.value = ''
  typeFilter.value = '全部'
  currentPage.value = 1
}
</script>

<template>
  <div class="settings-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">组织管理 / 权限管理</div>
      <div class="page-heading">
        <h1 class="page-title">权限管理</h1>
        <div class="page-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button class="ap-btn-primary" type="primary" :icon="Plus">新增权限</el-button>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="权限编码 / 名称 / 模块" clearable class="filter-input" />
      <el-select v-model="typeFilter" placeholder="权限类型" class="filter-select">
        <el-option v-for="t in permissionTypeOptions" :key="t" :label="t" :value="t" />
      </el-select>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="code" label="权限编码" min-width="180" />
      <el-table-column prop="name" label="权限名称" min-width="140" />
      <el-table-column label="类型" width="88" align="center">
        <template #default="{ row }">
          <span class="perm-type-tag" :class="typeTagClass(row.type)">{{ row.type }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="module" label="所属模块" min-width="120" />
      <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default>
          <el-button link type="primary">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredList.length"
        layout="total, prev, pager, next"
        background
      />
    </div>
  </div>
</template>

<style scoped>
.settings-page {
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

.page-title {
  font-size: 20px;
  font-weight: 600;
}

.page-actions {
  display: flex;
  gap: 8px;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-input {
  max-width: 320px;
}

.filter-select {
  width: 140px;
}

.perm-type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.type-menu {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.type-btn {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.type-api {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.table-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>

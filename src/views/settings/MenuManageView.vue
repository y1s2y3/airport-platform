<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { menuList, menuTypeOptions } from '../../mock/rbac'

const keyword = ref('')
const menuTypeFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const menuTypeLabelMap = Object.fromEntries(menuTypeOptions.map((o) => [o.value, o.label]))

const filteredList = computed(() => {
  return menuList.filter((row) => {
    if (menuTypeFilter.value && row.menuType !== menuTypeFilter.value) return false
    const kw = keyword.value.trim()
    if (!kw) return true
    return row.name.includes(kw) || row.path.includes(kw) || row.permission.includes(kw)
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function menuTypeTagClass(type) {
  if (type === 'system') return 'tag-system'
  if (type === 'phase1') return 'tag-phase1'
  if (type === 'archive') return 'tag-archive'
  return 'tag-coc'
}

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  keyword.value = ''
  menuTypeFilter.value = ''
  currentPage.value = 1
}
</script>

<template>
  <div class="settings-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">系统设置 / 菜单管理</div>
      <div class="page-heading">
        <h1 class="page-title">菜单管理</h1>
        <div class="page-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button class="ap-btn-primary" type="primary" :icon="Plus">新增菜单</el-button>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="菜单名称 / 路由 / 权限标识" clearable class="filter-input" />
      <el-select v-model="menuTypeFilter" placeholder="菜单类型" clearable class="filter-select">
        <el-option v-for="opt in menuTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
      </el-select>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="菜单名称" min-width="140" />
      <el-table-column label="菜单类型" width="120" align="center">
        <template #default="{ row }">
          <span class="menu-type-tag" :class="menuTypeTagClass(row.menuType)">
            {{ menuTypeLabelMap[row.menuType] }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="parentName" label="上级菜单" min-width="120" />
      <el-table-column prop="path" label="路由路径" min-width="180" />
      <el-table-column prop="permission" label="权限标识" min-width="180" />
      <el-table-column prop="sort" label="排序" width="72" align="center" />
      <el-table-column label="显示" width="72" align="center">
        <template #default="{ row }">
          <el-tag :type="row.visible ? 'success' : 'info'" size="small" effect="plain">
            {{ row.visible ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
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
  width: 160px;
}

.menu-type-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.tag-system {
  background: rgba(144, 147, 153, 0.12);
  color: #606266;
}

.tag-phase1 {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.tag-archive {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.tag-coc {
  background: rgba(201, 123, 99, 0.12);
  color: #c97b63;
}

.table-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>

<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus, Download, ArrowDown } from '@element-plus/icons-vue'
import { qualityInspectList, listStats } from '../../mock/qualityInspect.js'

const filters = ref({
  title1: '',
  title2: '',
  keyword: '',
})

const expanded = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const selectedRows = ref([])

const filteredList = computed(() => {
  return qualityInspectList.filter((row) => {
    if (filters.value.keyword) {
      const kw = filters.value.keyword.toLowerCase()
      const hay = `${row.model}${row.supplier}${row.receiver}${row.location}`.toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  filters.value = { title1: '', title2: '', keyword: '' }
  currentPage.value = 1
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}
</script>

<template>
  <div class="inspect-page page-card">
    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-item">
          <label>标题名称</label>
          <el-select v-model="filters.title1" placeholder="标题1" clearable style="width: 140px">
            <el-option label="标题1" value="1" />
            <el-option label="标题2" value="2" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>标题名称</label>
          <el-select v-model="filters.title2" placeholder="标题2" clearable style="width: 140px">
            <el-option label="标题1" value="1" />
            <el-option label="标题2" value="2" />
          </el-select>
        </div>
        <div class="filter-item filter-search">
          <el-input v-model="filters.keyword" placeholder="搜索某字段" clearable>
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        <button type="button" class="expand-btn" @click="expanded = !expanded">
          {{ expanded ? '收起' : '展开' }}
          <el-icon :size="12"><ArrowDown /></el-icon>
        </button>
        <div class="filter-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>
      <div v-if="expanded" class="filter-row filter-extra">
        <div class="filter-item">
          <label>供应商</label>
          <el-input placeholder="请输入供应商" clearable />
        </div>
        <div class="filter-item">
          <label>收料人</label>
          <el-input placeholder="请输入收料人" clearable />
        </div>
      </div>
    </div>

    <div class="toolbar">
      <div class="toolbar-stats">
        <span>共 <b>{{ listStats.total }}</b> 条</span>
        <span>计划 <b>{{ listStats.planned }}</b> 条</span>
        <span>履约 <b>{{ listStats.fulfilled }}</b> 条</span>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="Download">导出</el-button>
        <el-button>批量操作</el-button>
        <el-button class="ap-btn-primary" type="primary" :icon="Plus">新增</el-button>
      </div>
    </div>

    <el-table
      :data="pagedList"
      border
      stripe
      class="ap-table inspect-table"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="48" align="center" />
      <el-table-column type="index" label="#" width="50" align="center" />
      <el-table-column prop="model" label="物料型号" min-width="180" show-overflow-tooltip />
      <el-table-column prop="unit" label="物料单位" width="90" align="center" />
      <el-table-column prop="quantity" label="数量" width="80" align="center" />
      <el-table-column prop="location" label="施工部位" min-width="180" show-overflow-tooltip />
      <el-table-column prop="date" label="日期" width="110" align="center" />
      <el-table-column prop="supplier" label="供应商" min-width="160" show-overflow-tooltip />
      <el-table-column prop="receiver" label="收料人" width="90" align="center" />
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default>
          <span class="ap-link">编辑</span>
          <span class="ap-link">授权</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-footer">
      <span class="total-text">共 400 条</span>
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="400"
        :page-sizes="[10, 20, 50]"
        layout="sizes, prev, pager, next, jumper"
        background
      />
    </div>
  </div>
</template>

<style scoped>
.inspect-page {
  padding: 16px 20px 12px;
}

.filter-bar {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--ap-border);
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
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

.filter-search {
  flex: 1;
  min-width: 200px;
  max-width: 280px;
}

.filter-search .el-input {
  width: 100%;
}

.expand-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--ap-text-secondary);
  font-size: 13px;
  cursor: pointer;
}

.expand-btn:hover {
  color: var(--ap-primary);
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.filter-extra {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #eee;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toolbar-stats {
  font-size: 13px;
  color: var(--ap-text-secondary);
  display: flex;
  gap: 20px;
}

.toolbar-stats b {
  color: var(--ap-text);
  font-weight: 600;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.inspect-table :deep(.el-table__header th) {
  background: #faf6f8 !important;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.total-text {
  font-size: 13px;
  color: var(--ap-text-secondary);
}

:deep(.el-pagination.is-background .el-pager li.is-active) {
  background-color: var(--ap-primary);
}
</style>

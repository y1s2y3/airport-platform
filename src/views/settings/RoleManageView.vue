<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  roleRecords,
  roleLevelOptions,
  roleStatusOptions,
  deleteRole,
  toggleRoleStatus,
} from '../../mock/roles'

const router = useRouter()

const nameFilter = ref('')
const levelFilter = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredList = computed(() => {
  const kw = nameFilter.value.trim().toLowerCase()
  return roleRecords.value.filter((row) => {
    if (levelFilter.value && row.level !== levelFilter.value) return false
    if (statusFilter.value && row.status !== statusFilter.value) return false
    if (!kw) return true
    return row.name.toLowerCase().includes(kw)
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
  nameFilter.value = ''
  levelFilter.value = ''
  statusFilter.value = ''
  currentPage.value = 1
}

function goCreate() {
  router.push({ name: 'SysRoleCreate' })
}

function goEdit(row) {
  router.push({ name: 'SysRoleEdit', params: { id: row.id } })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除角色「${row.name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    const result = deleteRole(row.id)
    if (!result.ok) {
      ElMessage.warning(result.message)
      return
    }
    ElMessage.success('已删除')
  } catch {
    /* cancelled */
  }
}

function handleToggleStatus(row) {
  toggleRoleStatus(row.id)
  ElMessage.success(row.status === '启用' ? '已启用' : '已禁用')
}
</script>

<template>
  <div class="role-page page-card">
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">角色名称</span>
        <el-input
          v-model="nameFilter"
          class="filter-input"
          placeholder="请输入"
          clearable
          @keyup.enter="handleSearch"
        />
        <span class="field-label">角色级别</span>
        <el-select v-model="levelFilter" placeholder="请选择" clearable class="filter-select">
          <el-option
            v-for="opt in roleLevelOptions.filter((o) => o.value)"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <span class="field-label">角色状态</span>
        <el-select v-model="statusFilter" placeholder="请选择" clearable class="filter-select">
          <el-option
            v-for="opt in roleStatusOptions.filter((o) => o.value)"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-button type="primary" class="ap-btn-primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <div class="table-head">
      <span class="total-text">共 {{ filteredList.length }} 条</span>
      <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="goCreate">新增</el-button>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table" empty-text="暂无角色数据">
      <el-table-column prop="name" label="角色名称" min-width="140" />
      <el-table-column prop="level" label="角色级别" width="100" align="center" />
      <el-table-column prop="status" label="角色状态" width="100" align="center" />
      <el-table-column prop="source" label="角色来源" width="120" align="center" />
      <el-table-column label="备注" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.remark || '—' }}</template>
      </el-table-column>
      <el-table-column prop="updatedBy" label="更新人" width="120" align="center" />
      <el-table-column prop="updatedAt" label="更新时间" width="170" align="center" />
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="goEdit(row)">编辑</el-button>
          <span class="op-divider">|</span>
          <el-button
            link
            :type="row.status === '启用' ? 'warning' : 'primary'"
            @click="handleToggleStatus(row)"
          >
            {{ row.status === '启用' ? '禁用' : '启用' }}
          </el-button>
          <span class="op-divider">|</span>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="table-footer">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredList.length"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
      />
    </div>
  </div>
</template>

<style scoped>
.role-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.toolbar {
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 14px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-input {
  width: 160px;
}

.filter-select {
  width: 120px;
}

.table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.total-text {
  font-size: 14px;
  color: var(--ap-text-secondary);
}

.ap-table {
  flex: 1;
}

.table-footer {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.op-divider {
  color: var(--ap-border);
  margin: 0 2px;
}
</style>

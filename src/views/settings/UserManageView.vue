<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  sysUserRecords,
  userStatusOptions,
  deleteSysUser,
  toggleSysUserStatus,
} from '../../mock/sysUsers'
import { useOrgScope } from '../../composables/useOrgScope'

const router = useRouter()
const { isUserInCurrentProject } = useOrgScope()

const statusFilter = ref('')
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const filteredList = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return sysUserRecords.value.filter((row) => {
    if (!isUserInCurrentProject(row.orgId)) return false
    if (statusFilter.value === 'enabled' && !row.status) return false
    if (statusFilter.value === 'disabled' && row.status) return false
    if (!kw) return true
    return (
      row.name.toLowerCase().includes(kw) ||
      row.loginAccount.toLowerCase().includes(kw) ||
      row.phone.includes(kw)
    )
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
  statusFilter.value = ''
  keyword.value = ''
  currentPage.value = 1
}

function goCreate() {
  router.push({ name: 'SysUserCreate' })
}

function goDetail(row) {
  router.push({ name: 'SysUserDetail', params: { id: row.id } })
}

function goEdit(row) {
  router.push({ name: 'SysUserEdit', params: { id: row.id } })
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    if (deleteSysUser(row.id)) {
      ElMessage.success('已删除')
    }
  } catch {
    /* cancelled */
  }
}

function handleStatusChange(row, status) {
  toggleSysUserStatus(row.id, status)
  ElMessage.success(status ? '已启用' : '已停用')
}
</script>

<template>
  <div class="user-page page-card">
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">用户状态</span>
        <el-select v-model="statusFilter" placeholder="请选择" clearable class="status-select">
          <el-option
            v-for="opt in userStatusOptions"
            :key="opt.value || 'all'"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-input
          v-model="keyword"
          class="keyword-input"
          placeholder="姓名、账号、手机号"
          clearable
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" class="ap-btn-primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
      <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="goCreate">新增</el-button>
    </div>

    <el-table :data="pagedList" border stripe class="ap-table" empty-text="暂无用户数据">
      <el-table-column prop="name" label="姓名" min-width="110" />
      <el-table-column prop="loginAccount" label="登录账号" min-width="120" />
      <el-table-column prop="phone" label="手机号" min-width="130" />
      <el-table-column label="状态" width="88" align="center">
        <template #default="{ row }">
          <el-switch :model-value="row.status" @change="(val) => handleStatusChange(row, val)" />
        </template>
      </el-table-column>
      <el-table-column prop="email" label="邮件" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row)">详情</el-button>
          <span class="op-divider">|</span>
          <el-button link type="primary" @click="goEdit(row)">编辑</el-button>
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
.user-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
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

.status-select {
  width: 120px;
}

.keyword-input {
  width: 220px;
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

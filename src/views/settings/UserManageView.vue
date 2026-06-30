<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import { sysUserList } from '../../mock/rbac'
import {
  unifiedOrgTree,
  getDefaultNodeId,
  getUsersByNodeId,
  findTreeNode,
} from '../../mock/orgStructure'

const selectedNodeId = ref(getDefaultNodeId())
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const roleByEmail = Object.fromEntries(sysUserList.map((u) => [u.email, u]))

const selectedNode = computed(() => findTreeNode(unifiedOrgTree.value, selectedNodeId.value))

const selectedNodeLabel = computed(() => selectedNode.value?.rawLabel || '')

const userList = computed(() => {
  unifiedOrgTree.value
  return getUsersByNodeId(selectedNodeId.value, selectedNode.value).map((row) => {
    const extra = roleByEmail[row.email]
    return {
      ...row,
      roles: extra?.roles ?? ['普通用户'],
      status: extra?.status ?? '启用',
    }
  })
})

const filteredList = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return userList.value
  return userList.value.filter(
    (row) =>
      row.name.includes(kw) ||
      row.dept.includes(kw) ||
      row.phone.includes(kw) ||
      row.email.includes(kw),
  )
})

const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

function handleNodeClick(data) {
  selectedNodeId.value = data.id
  currentPage.value = 1
}

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  keyword.value = ''
  currentPage.value = 1
}
</script>

<template>
  <div class="settings-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">系统设置 / 用户管理</div>
      <div class="page-heading">
        <h1 class="page-title">用户管理</h1>
        <div class="page-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Plus">新增用户</el-button>
        </div>
      </div>
    </div>

    <div class="user-layout">
      <aside class="org-tree-panel">
        <div class="panel-head">
          <span class="panel-title">组织结构</span>
          <span class="panel-tip">按节点筛选用户</span>
        </div>
        <el-tree
          :data="unifiedOrgTree"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="selectedNodeId"
          :expand-on-click-node="false"
          class="org-tree"
          @node-click="handleNodeClick"
        />
      </aside>

      <section class="user-panel">
        <div class="panel-head user-head">
          <div>
            <span class="panel-title">{{ selectedNodeLabel || '请选择组织节点' }}</span>
            <span class="user-count">共 {{ filteredList.length }} 人</span>
          </div>
          <div class="user-toolbar">
            <el-input
              v-model="keyword"
              class="user-search"
              placeholder="姓名 / 部门 / 手机 / 邮箱"
              clearable
              :prefix-icon="Search"
              @keyup.enter="handleSearch"
            />
            <el-button :icon="Search" @click="handleSearch">查询</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </div>
        </div>

        <el-table :data="pagedList" border stripe class="ap-table" empty-text="暂无用户数据">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" min-width="100" />
          <el-table-column prop="gender" label="性别" width="72" align="center" />
          <el-table-column prop="dept" label="部门" min-width="160" />
          <el-table-column prop="phone" label="手机" min-width="130" />
          <el-table-column prop="email" label="邮箱" min-width="220" show-overflow-tooltip />
          <el-table-column label="角色" min-width="140">
            <template #default="{ row }">
              <el-tag v-for="r in row.roles" :key="r" size="small" effect="plain" class="role-tag">{{ r }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === '启用' ? 'success' : 'info'" effect="light">
                {{ row.status }}
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
      </section>
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

.user-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  min-height: 520px;
}

.org-tree-panel,
.user-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.user-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}

.user-head {
  align-items: flex-start;
  flex-wrap: wrap;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ap-text);
}

.panel-tip {
  font-size: 12px;
  color: var(--ap-text-muted);
}

.user-count {
  margin-left: 10px;
  font-size: 13px;
  color: var(--ap-text-muted);
  font-weight: 400;
}

.user-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.user-search {
  width: 260px;
}

.org-tree :deep(.el-tree-node__content) {
  height: 34px;
  border-radius: 4px;
}

.org-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
  color: var(--ap-primary);
  font-weight: 600;
}

.org-tree :deep(.el-tree > .el-tree-node > .el-tree-node__content) {
  font-weight: 600;
}

.role-tag {
  margin-right: 4px;
}

.ap-table {
  flex: 1;
}

.table-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>

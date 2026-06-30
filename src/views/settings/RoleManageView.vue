<script setup>
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  roleList,
  dataScopeOptions,
  businessMenuTree,
  projectOptions,
} from '../../mock/rbac'

const dialogVisible = ref(false)
const editingRole = ref(null)

const form = ref({
  code: '',
  name: '',
  description: '',
  dataScope: 'dept',
  projectIds: [],
  menuIds: [],
  status: '启用',
})

const projectNameMap = Object.fromEntries(projectOptions.map((p) => [p.id, p.name]))

function openEdit(row) {
  editingRole.value = row
  form.value = {
    code: row.code,
    name: row.name,
    description: row.description,
    dataScope: row.dataScope,
    projectIds: [...(row.projectIds || [])],
    menuIds: [...(row.menuIds || [])],
    status: row.status,
  }
  dialogVisible.value = true
}

function handleSave() {
  if (editingRole.value) {
    Object.assign(editingRole.value, {
      ...form.value,
      dataScopeLabel: dataScopeOptions.find((o) => o.value === form.value.dataScope)?.label || '',
    })
  }
  dialogVisible.value = false
  ElMessage.success('角色权限配置已保存')
}

const dataScopeLabel = computed(() =>
  dataScopeOptions.find((o) => o.value === form.value.dataScope)?.label || '',
)
</script>

<template>
  <div class="settings-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">系统设置 / 角色管理</div>
      <div class="page-heading">
        <h1 class="page-title">角色管理</h1>
        <div class="page-actions">
          <el-button class="ap-btn-primary" type="primary" :icon="Plus">新增角色</el-button>
        </div>
      </div>
      <p class="page-desc">基于 RBAC 模型，为角色配置数据权限（可访问哪些数据）与业务权限（可访问哪些菜单）。</p>
    </div>

    <el-table :data="roleList" border stripe class="ap-table">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="code" label="角色编码" min-width="140" />
      <el-table-column prop="name" label="角色名称" min-width="120" />
      <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip />
      <el-table-column prop="dataScopeLabel" label="数据权限" min-width="120" />
      <el-table-column label="业务权限（菜单）" min-width="200">
        <template #default="{ row }">
          <span class="perm-summary">已授权 {{ row.menuIds?.length || 0 }} 项菜单</span>
        </template>
      </el-table-column>
      <el-table-column prop="userCount" label="用户数" width="80" align="center" />
      <el-table-column prop="status" label="状态" width="80" align="center" />
      <el-table-column label="操作" width="100" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">配置权限</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="`配置角色权限 · ${form.name}`"
      width="720px"
      destroy-on-close
    >
      <el-form label-width="100px" class="role-form">
        <el-form-item label="角色编码">
          <el-input v-model="form.code" disabled />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>

        <div class="perm-section-title">数据权限</div>
        <el-form-item label="数据范围">
          <el-select v-model="form.dataScope" style="width: 100%">
            <el-option v-for="opt in dataScopeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.dataScope === 'project'" label="指定项目">
          <el-select v-model="form.projectIds" multiple style="width: 100%" placeholder="选择可访问项目">
            <el-option v-for="p in projectOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <div v-else class="scope-hint">当前范围：{{ dataScopeLabel }}</div>

        <div class="perm-section-title">业务权限（菜单）</div>
        <el-form-item label="菜单授权">
          <el-tree
            :data="businessMenuTree"
            show-checkbox
            node-key="id"
            default-expand-all
            :default-checked-keys="form.menuIds"
            :props="{ label: 'label', children: 'children' }"
            class="menu-tree"
            @check="(_, { checkedKeys }) => { form.menuIds = checkedKeys }"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
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

.page-desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--ap-text-muted);
}

.perm-summary {
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.perm-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text);
  margin: 16px 0 12px;
  padding-left: 8px;
  border-left: 3px solid var(--ap-primary);
}

.scope-hint {
  margin: 0 0 8px 100px;
  font-size: 13px;
  color: var(--ap-text-muted);
}

.menu-tree {
  width: 100%;
  border: 1px solid var(--ap-border);
  border-radius: 6px;
  padding: 8px;
  max-height: 260px;
  overflow: auto;
}
</style>

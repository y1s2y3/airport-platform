<script setup>
import { ref, computed, reactive } from 'vue'
import { Refresh, Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  unifiedOrgTree,
  getDefaultNodeId,
  getDirectChildNodes,
  findTreeNode,
  addOrgNode,
  updateOrgNode,
  deleteOrgNode,
} from '../../mock/orgStructure'

const selectedNodeId = ref(getDefaultNodeId())
const treeRef = ref(null)
const syncing = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref('add')
const formRef = ref(null)

const form = reactive({
  id: '',
  label: '',
  remark: '',
})

const formRules = {
  label: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
}

const selectedNode = computed(() => findTreeNode(unifiedOrgTree.value, selectedNodeId.value))

const selectedNodeLabel = computed(() => selectedNode.value?.rawLabel || '')

const childNodeList = computed(() => {
  unifiedOrgTree.value
  return getDirectChildNodes(selectedNodeId.value, selectedNode.value)
})

const showSyncButton = computed(() => {
  const node = selectedNode.value
  if (!node) return false
  if (node.syncable) return true
  if (node.categoryKey === 'oa') return true
  return selectedNodeId.value.startsWith('oa-') || selectedNodeId.value === 'cat-oa'
})

function handleNodeClick(data) {
  selectedNodeId.value = data.id
}

async function handleSyncOa() {
  syncing.value = true
  await new Promise((resolve) => setTimeout(resolve, 800))
  syncing.value = false
  ElMessage.success('OA组织数据同步完成')
}

function openAddDialog() {
  dialogMode.value = 'add'
  form.id = ''
  form.label = ''
  form.remark = ''
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  form.id = row.id
  form.label = row.label
  form.remark = row.remark || ''
  dialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除组织节点「${row.label}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    if (deleteOrgNode(row.id)) {
      ElMessage.success('已删除')
    } else {
      ElMessage.error('删除失败')
    }
  } catch {
    /* cancelled */
  }
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (dialogMode.value === 'add') {
    addOrgNode(selectedNodeId.value, { label: form.label, remark: form.remark })
    ElMessage.success('子节点已新增')
  } else {
    updateOrgNode(form.id, { label: form.label, remark: form.remark })
    ElMessage.success('节点已更新')
  }
  dialogVisible.value = false
}
</script>

<template>
  <div class="org-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">系统设置 / 组织结构</div>
      <div class="page-heading">
        <h1 class="page-title">组织结构管理</h1>
        <div class="page-actions">
          <el-button
            v-if="showSyncButton"
            class="ap-btn-primary"
            type="primary"
            :icon="Refresh"
            :loading="syncing"
            @click="handleSyncOa"
          >
            同步OA数据
          </el-button>
        </div>
      </div>
    </div>

    <div class="org-layout">
      <aside class="org-tree-panel">
        <div class="panel-head">
          <span class="panel-title">组织节点</span>
          <span class="panel-tip">含 OA / 外部 / 其他用户</span>
        </div>
        <el-tree
          ref="treeRef"
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

      <section class="org-child-panel">
        <div class="panel-head child-head">
          <div>
            <span class="panel-title">{{ selectedNodeLabel || '请选择组织节点' }}</span>
            <span class="child-count">子节点 {{ childNodeList.length }} 个</span>
          </div>
          <el-button class="ap-btn-primary" type="primary" :icon="Plus" @click="openAddDialog">
            新增子节点
          </el-button>
        </div>

        <el-table :data="childNodeList" border stripe class="ap-table" empty-text="当前节点暂无子节点">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="label" label="节点名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="userCount" label="用户数" width="88" align="center" />
          <el-table-column prop="childCount" label="下级节点" width="96" align="center" />
          <el-table-column label="数据来源" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="row.syncable ? 'success' : 'info'" effect="plain">
                {{ row.syncable ? 'OA' : '本地' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
          <el-table-column label="操作" width="140" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Edit" @click="openEditDialog(row)">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'add' ? '新增子节点' : '编辑节点'"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="88px">
        <el-form-item v-if="dialogMode === 'add'" label="上级节点">
          <el-input :model-value="selectedNodeLabel" disabled />
        </el-form-item>
        <el-form-item label="节点名称" prop="label">
          <el-input v-model="form.label" placeholder="请输入节点名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="选填" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.org-page {
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
  color: var(--ap-text);
}

.org-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 16px;
  min-height: 520px;
}

.org-tree-panel,
.org-child-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  min-height: 0;
}

.org-child-panel {
  display: flex;
  flex-direction: column;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 8px;
}

.child-head {
  align-items: flex-start;
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

.child-count {
  margin-left: 10px;
  font-size: 13px;
  color: var(--ap-text-muted);
  font-weight: 400;
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

.ap-table {
  flex: 1;
}
</style>

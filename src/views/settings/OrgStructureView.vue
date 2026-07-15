<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { Search, Plus, Edit, Delete, DArrowLeft, DArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  unifiedOrgTree,
  getDefaultNodeId,
  findTreeNode,
  filterOrgTree,
  getOrgMembers,
  getOrgPositions,
  getOrgInfo,
  getOrgDataPermissionConfig,
  getParentOrgOptions,
  getParentOrgId,
  addOrgNode,
  updateOrgNode,
  deleteOrgNode,
  removeOrgMembers,
  toggleMemberStatus,
  setMemberRoles,
  setPositionRoles,
  setOrgRoles,
  getOrgRoles,
  saveOrgDataPermissionConfig,
  ORG_LEVEL_OPTIONS,
  orgRoleOptions,
  dataPermissionProjectScopeOptions,
} from '../../mock/orgStructure'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions'

const selectedNodeId = ref(getDefaultNodeId())
const treeKeyword = ref('')
const sidebarCollapsed = ref(false)
const activeTab = ref('members')

const memberKeyword = ref('')
const showSubordinates = ref(false)
const memberPage = ref(1)
const memberPageSize = ref(10)
const selectedMemberIds = ref([])

const positionKeyword = ref('')

const orgDialogVisible = ref(false)
const orgDialogMode = ref('add')
const orgFormRef = ref(null)
const orgForm = reactive({
  id: '',
  parentId: '',
  orgLevel: '',
  label: '',
  shortName: '',
  orgCode: '',
  sortOrder: 0,
  enabled: true,
})

const orgFormRules = computed(() => ({
  parentId: orgDialogMode.value === 'add'
    ? [{ required: true, message: '请选择父节点', trigger: 'change' }]
    : [],
  orgLevel: [{ required: true, message: '请选择组织级别', trigger: 'change' }],
  label: [{ required: true, message: '请输入组织名称', trigger: 'blur' }],
  orgCode: [{ required: true, message: '请输入组织编码', trigger: 'blur' }],
  sortOrder: [{ required: true, message: '请输入排序', trigger: 'change' }],
}))

const roleDialogVisible = ref(false)
const roleDialogTarget = ref(null)
const roleTransferValue = ref([])

const dataPermDialogVisible = ref(false)
const dataPermForm = reactive({
  hqEnabled: false,
  projectEnabled: false,
  projectScope: 'all',
  projectIds: [],
})

const projectSelectOptions = COC_PROJECT_OPTIONS

const selectedNode = computed(() => findTreeNode(unifiedOrgTree.value, selectedNodeId.value))
const selectedNodeLabel = computed(() => selectedNode.value?.rawLabel || '')

const filteredTree = computed(() => filterOrgTree(treeKeyword.value))

const memberList = computed(() => {
  unifiedOrgTree.value
  return getOrgMembers(selectedNodeId.value, showSubordinates.value)
})

const filteredMembers = computed(() => {
  const kw = memberKeyword.value.trim().toLowerCase()
  if (!kw) return memberList.value
  return memberList.value.filter(
    (row) =>
      row.name.toLowerCase().includes(kw) ||
      row.loginAccount.toLowerCase().includes(kw) ||
      row.phone.includes(kw),
  )
})

const pagedMembers = computed(() => {
  const start = (memberPage.value - 1) * memberPageSize.value
  return filteredMembers.value.slice(start, start + memberPageSize.value)
})

const positionList = computed(() => {
  unifiedOrgTree.value
  const kw = positionKeyword.value.trim().toLowerCase()
  const list = getOrgPositions(selectedNodeId.value)
  if (!kw) return list
  return list.filter((row) => row.name.toLowerCase().includes(kw) || row.duty.toLowerCase().includes(kw))
})

const orgInfo = computed(() => {
  unifiedOrgTree.value
  return getOrgInfo(selectedNodeId.value)
})

const parentOrgOptions = computed(() => getParentOrgOptions(orgForm.id))

const roleTransferData = computed(() =>
  orgRoleOptions.map((item) => ({ key: item.key, label: item.label })),
)

const roleDialogTitle = computed(() => {
  const kind = roleDialogTarget.value?.kind
  return kind === 'position' ? '添加权限' : '设置角色'
})

watch(selectedNodeId, () => {
  memberPage.value = 1
  selectedMemberIds.value = []
  memberKeyword.value = ''
  positionKeyword.value = ''
})

watch(
  () => dataPermForm.projectEnabled,
  (enabled) => {
    if (!enabled) {
      dataPermForm.projectScope = 'all'
      dataPermForm.projectIds = []
    }
  },
)

watch(
  () => dataPermForm.projectScope,
  (scope) => {
    if (scope !== 'specific') dataPermForm.projectIds = []
  },
)

function handleNodeClick(data) {
  selectedNodeId.value = data.id
}

function resetOrgForm(parentId = selectedNodeId.value) {
  orgForm.id = ''
  orgForm.parentId = parentId
  orgForm.orgLevel = ''
  orgForm.label = ''
  orgForm.shortName = ''
  orgForm.orgCode = ''
  orgForm.sortOrder = 0
  orgForm.enabled = true
}

function openAddOrgDialog(parentId = selectedNodeId.value) {
  orgDialogMode.value = 'add'
  resetOrgForm(parentId)
  orgDialogVisible.value = true
}

function openEditOrgDialog(node) {
  orgDialogMode.value = 'edit'
  const raw = findTreeNode(unifiedOrgTree.value, node.id)
  orgForm.id = node.id
  orgForm.parentId = getParentOrgId(node.id) || 'org-root'
  orgForm.orgLevel = raw?.orgLevel || ''
  orgForm.label = raw?.rawLabel || node.rawLabel
  orgForm.shortName = raw?.shortName || ''
  orgForm.orgCode = raw?.orgCode || ''
  orgForm.sortOrder = raw?.sortOrder ?? 0
  orgForm.enabled = raw?.enabled !== false
  orgDialogVisible.value = true
}

async function handleDeleteOrg(node) {
  try {
    await ElMessageBox.confirm(`确定删除组织「${node.rawLabel}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    if (deleteOrgNode(node.id)) {
      if (selectedNodeId.value === node.id) selectedNodeId.value = getDefaultNodeId()
      ElMessage.success('已删除')
    } else {
      ElMessage.error('无法删除该组织')
    }
  } catch {
    /* cancelled */
  }
}

async function submitOrgForm() {
  const valid = await orgFormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (orgDialogMode.value === 'add') {
    addOrgNode(orgForm.parentId, {
      label: orgForm.label,
      orgLevel: orgForm.orgLevel,
      orgType: orgForm.orgLevel,
      shortName: orgForm.shortName,
      orgCode: orgForm.orgCode,
      sortOrder: orgForm.sortOrder,
      enabled: orgForm.enabled,
    })
    ElMessage.success('组织已新增')
  } else {
    updateOrgNode(orgForm.id, {
      label: orgForm.label,
      orgLevel: orgForm.orgLevel,
      orgType: orgForm.orgLevel,
      shortName: orgForm.shortName,
      orgCode: orgForm.orgCode,
      sortOrder: orgForm.sortOrder,
      enabled: orgForm.enabled,
    })
    ElMessage.success('组织已更新')
  }
  orgDialogVisible.value = false
}

function handleMemberSelection(rows) {
  selectedMemberIds.value = rows.map((row) => row.id)
}

async function handleRemoveMembers(singleId) {
  const ids = singleId ? [singleId] : selectedMemberIds.value
  if (!ids.length) {
    ElMessage.warning('请选择要移除的人员')
    return
  }
  try {
    await ElMessageBox.confirm(`确定移除选中的 ${ids.length} 名人员？`, '移除确认', {
      type: 'warning',
    })
    removeOrgMembers(selectedNodeId.value, ids)
    selectedMemberIds.value = []
    ElMessage.success('已移除')
  } catch {
    /* cancelled */
  }
}

function handleMemberStatusChange(row, status) {
  toggleMemberStatus(selectedNodeId.value, row.id, status)
  ElMessage.success(status ? '已启用' : '已停用')
}

function openMemberRoleDialog(row) {
  roleDialogTarget.value = { kind: 'member', orgId: selectedNodeId.value, id: row.id, title: row.name }
  roleTransferValue.value = [...(row.roleIds || [])]
  roleDialogVisible.value = true
}

function openPositionRoleDialog(row) {
  roleDialogTarget.value = { kind: 'position', orgId: selectedNodeId.value, id: row.id, title: row.name }
  roleTransferValue.value = [...(row.roleIds || [])]
  roleDialogVisible.value = true
}

function openOrgRoleDialog() {
  roleDialogTarget.value = {
    kind: 'org',
    orgId: selectedNodeId.value,
    id: selectedNodeId.value,
    title: selectedNodeLabel.value,
  }
  roleTransferValue.value = getOrgRoles(selectedNodeId.value)
  roleDialogVisible.value = true
}

function submitRoleDialog() {
  const target = roleDialogTarget.value
  if (!target) return
  if (target.kind === 'member') {
    setMemberRoles(target.orgId, target.id, roleTransferValue.value)
  } else if (target.kind === 'org') {
    setOrgRoles(target.orgId, roleTransferValue.value)
  } else {
    setPositionRoles(target.orgId, target.id, roleTransferValue.value)
  }
  roleDialogVisible.value = false
  ElMessage.success(target.kind === 'position' ? '权限已保存' : '角色已设置')
}

function openDataPermDialog() {
  const config = getOrgDataPermissionConfig(selectedNodeId.value)
  dataPermForm.hqEnabled = config.hqEnabled
  dataPermForm.projectEnabled = config.projectEnabled
  dataPermForm.projectScope = config.projectScope || 'all'
  dataPermForm.projectIds = [...(config.projectIds || [])]
  dataPermDialogVisible.value = true
}

function submitDataPermForm() {
  if (dataPermForm.projectEnabled && dataPermForm.projectScope === 'specific' && !dataPermForm.projectIds.length) {
    ElMessage.warning('请选择至少一个项目')
    return
  }
  saveOrgDataPermissionConfig(selectedNodeId.value, {
    hqEnabled: dataPermForm.hqEnabled,
    projectEnabled: dataPermForm.projectEnabled,
    projectScope: dataPermForm.projectScope,
    projectIds: [...dataPermForm.projectIds],
  })
  dataPermDialogVisible.value = false
  ElMessage.success('数据权限已保存')
}

function handleSetDataPermFromInfo() {
  openDataPermDialog()
}
</script>

<template>
  <div class="org-page page-card">
    <div class="org-layout" :class="{ collapsed: sidebarCollapsed }">
      <aside class="org-sidebar">
        <div class="sidebar-head">
          <span class="sidebar-title">组织架构</span>
          <el-button type="primary" :icon="Plus" @click="openAddOrgDialog(selectedNodeId)">
            新增
          </el-button>
        </div>
        <el-input
          v-model="treeKeyword"
          class="tree-search"
          placeholder="关键字搜索"
          clearable
          :prefix-icon="Search"
        />
        <el-tree
          :data="filteredTree"
          node-key="id"
          highlight-current
          default-expand-all
          :current-node-key="selectedNodeId"
          :expand-on-click-node="false"
          class="org-tree"
          @node-click="handleNodeClick"
        >
          <template #default="{ data }">
            <div class="tree-node-row">
              <span class="tree-node-label" :title="data.rawLabel">{{ data.rawLabel }}</span>
              <span class="tree-node-actions" @click.stop>
                <el-button link type="primary" :icon="Edit" title="编辑" @click="openEditOrgDialog(data)" />
                <el-button link type="primary" :icon="Plus" title="新增子组织" @click="openAddOrgDialog(data.id)" />
                <el-button
                  v-if="data.id !== 'org-root'"
                  link
                  type="danger"
                  :icon="Delete"
                  title="删除"
                  @click="handleDeleteOrg(data)"
                />
              </span>
            </div>
          </template>
        </el-tree>
      </aside>

      <button type="button" class="collapse-toggle" @click="sidebarCollapsed = !sidebarCollapsed">
        <el-icon><component :is="sidebarCollapsed ? DArrowRight : DArrowLeft" /></el-icon>
      </button>

      <section class="org-main">
        <el-tabs v-model="activeTab" class="org-tabs">
          <el-tab-pane label="组织成员" name="members">
            <div class="tab-toolbar">
              <div class="toolbar-left">
                <span class="field-label">姓名</span>
                <el-input
                  v-model="memberKeyword"
                  placeholder="姓名、账号、手机号"
                  clearable
                  class="member-search"
                  @keyup.enter="memberPage = 1"
                />
                <el-checkbox v-model="showSubordinates">展示下级人员</el-checkbox>
              </div>
              <el-button type="danger" plain @click="handleRemoveMembers()">移除人员</el-button>
            </div>

            <el-table
              :data="pagedMembers"
              border
              stripe
              class="ap-table"
              empty-text="暂无组织成员"
              @selection-change="handleMemberSelection"
            >
              <el-table-column type="selection" width="48" align="center" />
              <el-table-column prop="name" label="姓名" min-width="120" />
              <el-table-column prop="loginAccount" label="登录账号" min-width="120" />
              <el-table-column prop="phone" label="手机号" width="130" />
              <el-table-column prop="position" label="任职岗位" min-width="160" show-overflow-tooltip />
              <el-table-column prop="orgPath" label="所属组织" min-width="180" show-overflow-tooltip />
              <el-table-column label="状态" width="88" align="center">
                <template #default="{ row }">
                  <el-switch
                    :model-value="row.status"
                    @change="(val) => handleMemberStatusChange(row, val)"
                  />
                </template>
              </el-table-column>
              <el-table-column label="操作" width="240" fixed="right" align="center">
                <template #default="{ row }">
                  <el-button link type="danger" @click="handleRemoveMembers(row.id)">移除</el-button>
                  <el-button link type="primary" @click="openMemberRoleDialog(row)">设置角色</el-button>
                  <el-button link type="primary" @click="openDataPermDialog">设置数据权限</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="table-footer">
              <span class="total-text">共 {{ filteredMembers.length }} 条</span>
              <el-pagination
                v-model:current-page="memberPage"
                v-model:page-size="memberPageSize"
                :total="filteredMembers.length"
                :page-sizes="[10, 20, 50]"
                layout="sizes, prev, pager, next, jumper"
                background
              />
            </div>
          </el-tab-pane>

          <el-tab-pane label="组织岗位" name="positions">
            <div class="tab-toolbar">
              <div class="toolbar-left">
                <span class="field-label">岗位名称</span>
                <el-input v-model="positionKeyword" placeholder="请输入" clearable class="member-search" />
              </div>
            </div>

            <el-table :data="positionList" border stripe class="ap-table" empty-text="暂无岗位">
              <el-table-column prop="name" label="岗位名称" min-width="180" />
              <el-table-column prop="headcount" label="岗位人数" width="100" align="center" />
              <el-table-column prop="duty" label="岗位职责" min-width="220" show-overflow-tooltip />
              <el-table-column label="操作" width="120" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" @click="openPositionRoleDialog(row)">添加权限</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="组织信息" name="info">
            <div class="info-actions">
              <el-button @click="openOrgRoleDialog">设置角色</el-button>
              <el-button @click="handleSetDataPermFromInfo">设置数据权限</el-button>
            </div>

            <div v-if="orgInfo" class="info-grid">
              <div class="info-item">
                <span class="info-label">上级组织</span>
                <span class="info-value">{{ orgInfo.parentOrg }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">组织类型</span>
                <span class="info-value">{{ orgInfo.orgType }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">组织名称</span>
                <span class="info-value">{{ orgInfo.orgName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">组织简称</span>
                <span class="info-value">{{ orgInfo.shortName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">排序</span>
                <span class="info-value">{{ orgInfo.sortOrder }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">状态</span>
                <span class="info-value">{{ orgInfo.enabled ? '启用' : '停用' }}</span>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>
    </div>

    <!-- 新增/编辑组织 -->
    <el-dialog
      v-model="orgDialogVisible"
      :title="orgDialogMode === 'add' ? '新增组织' : '编辑组织'"
      width="640px"
      destroy-on-close
    >
      <el-form ref="orgFormRef" :model="orgForm" :rules="orgFormRules" label-width="96px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="父节点" prop="parentId">
              <el-select
                v-model="orgForm.parentId"
                placeholder="选择组织"
                style="width: 100%"
                :disabled="orgDialogMode === 'edit'"
              >
                <el-option
                  v-for="opt in parentOrgOptions"
                  :key="opt.value || 'root'"
                  :label="opt.label"
                  :value="opt.value || selectedNodeId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组织级别" prop="orgLevel">
              <el-select v-model="orgForm.orgLevel" placeholder="请选择组织级别" style="width: 100%">
                <el-option v-for="item in ORG_LEVEL_OPTIONS" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组织名称" prop="label">
              <el-input v-model="orgForm.label" placeholder="请输入组织名称" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组织简称">
              <el-input v-model="orgForm.shortName" placeholder="请输入组织简称" maxlength="20" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组织编码" prop="orgCode">
              <el-input v-model="orgForm.orgCode" placeholder="请输入组织编码" maxlength="32" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序" prop="sortOrder">
              <el-input-number v-model="orgForm.sortOrder" :min="0" :max="9999" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否启用">
              <el-radio-group v-model="orgForm.enabled">
                <el-radio :value="true">是</el-radio>
                <el-radio :value="false">否</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="orgDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitOrgForm">提交</el-button>
      </template>
    </el-dialog>

    <!-- 添加权限 / 设置角色 -->
    <el-dialog
      v-model="roleDialogVisible"
      :title="roleDialogTitle"
      width="720px"
      destroy-on-close
    >
      <el-transfer
        v-model="roleTransferValue"
        :data="roleTransferData"
        :titles="['角色列表', '已选角色']"
        filterable
        filter-placeholder="角色名称"
      />
      <template #footer>
        <el-button @click="roleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRoleDialog">提交</el-button>
      </template>
    </el-dialog>

    <!-- 设置数据权限 -->
    <el-dialog v-model="dataPermDialogVisible" title="设置数据权限" width="560px" destroy-on-close>
      <div class="data-perm-form">
        <el-checkbox v-model="dataPermForm.hqEnabled">指挥部层级</el-checkbox>

        <div class="data-perm-project-block">
          <el-checkbox v-model="dataPermForm.projectEnabled">项目层级</el-checkbox>
          <div v-if="dataPermForm.projectEnabled" class="data-perm-project-options">
            <el-radio-group v-model="dataPermForm.projectScope">
              <el-radio
                v-for="item in dataPermissionProjectScopeOptions"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </el-radio>
            </el-radio-group>
            <el-select
              v-if="dataPermForm.projectScope === 'specific'"
              v-model="dataPermForm.projectIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="请选择项目"
              style="width: 100%; margin-top: 12px"
            >
              <el-option
                v-for="project in projectSelectOptions"
                :key="project.id"
                :label="project.label"
                :value="project.id"
              />
            </el-select>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="dataPermDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitDataPermForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.org-page {
  padding: 0;
  min-height: calc(100vh - 120px);
}

.org-layout {
  display: grid;
  grid-template-columns: 280px 12px minmax(0, 1fr);
  min-height: calc(100vh - 120px);
  background: #fff;
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  overflow: hidden;
}

.org-layout.collapsed {
  grid-template-columns: 0 12px minmax(0, 1fr);
}

.org-sidebar {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--ap-border);
  padding: 16px 12px;
  overflow: hidden;
}

.org-layout.collapsed .org-sidebar {
  padding: 0;
  border-right: none;
  opacity: 0;
  pointer-events: none;
}

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ap-text);
}

.tree-search {
  margin-bottom: 12px;
}

.org-tree {
  flex: 1;
  overflow: auto;
}

.org-tree :deep(.el-tree-node__content) {
  height: 36px;
  border-radius: 4px;
}

.org-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: var(--ap-primary-light);
}

.tree-node-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  min-width: 0;
  padding-right: 4px;
}

.tree-node-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node-actions {
  display: none;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}

.org-tree :deep(.el-tree-node__content:hover) .tree-node-actions,
.org-tree :deep(.el-tree-node.is-current > .el-tree-node__content) .tree-node-actions {
  display: inline-flex;
}

.collapse-toggle {
  border: none;
  background: #f5f7fa;
  color: var(--ap-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.collapse-toggle:hover {
  background: #eef2f6;
  color: var(--ap-primary);
}

.org-main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 16px 16px;
}

.org-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.org-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
}

.org-tabs :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
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

.member-search {
  width: 220px;
}

.ap-table {
  flex: 1;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  gap: 12px;
}

.total-text {
  font-size: 13px;
  color: var(--ap-text-muted);
}

.info-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 32px;
  max-width: 720px;
}

.info-item {
  display: flex;
  gap: 12px;
  font-size: 14px;
  line-height: 1.6;
}

.info-label {
  width: 72px;
  flex-shrink: 0;
  color: var(--ap-text-muted);
}

.info-value {
  color: var(--ap-text);
  font-weight: 500;
}

.perm-dialog-toolbar {
  margin-bottom: 12px;
}

.data-perm-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0 8px;
}

.data-perm-project-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.data-perm-project-options {
  margin-left: 22px;
  padding: 12px;
  border: 1px solid var(--ap-border);
  border-radius: 6px;
  background: var(--ap-bg-muted, #f5f7fa);
}
</style>

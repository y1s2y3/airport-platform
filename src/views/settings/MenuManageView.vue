<script setup>
import { ref, computed } from 'vue'
import {
  Monitor,
  User,
  Van,
  VideoCamera,
  Connection,
  Collection,
  OfficeBuilding,
  Setting,
  FolderOpened,
  Notebook,
} from '@element-plus/icons-vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  webMenuTree,
  appMenuTree,
  menuNodeTypeOptions,
  moduleNameOptions,
  menuIconOptions,
  listParentMenuOptions,
  createEmptyMenuNode,
  cloneMenuNode,
  saveMenuNode,
  deleteMenuNode,
} from '../../mock/menus'
import { permissionList } from '../../mock/rbac'

const activePlatform = ref('web')
const dialogVisible = ref(false)
const editingId = ref('')
const parentIdForCreate = ref('')
const formRef = ref(null)
const form = ref(createEmptyMenuNode())

const iconMap = {
  Monitor,
  User,
  Van,
  VideoCamera,
  Connection,
  Collection,
  OfficeBuilding,
  Setting,
  FolderOpened,
  Notebook,
}

const dialogTitle = computed(() => (editingId.value ? '编辑菜单' : '新增菜单'))

const currentTree = computed(() => (activePlatform.value === 'web' ? webMenuTree.value : appMenuTree.value))

const parentOptions = computed(() => listParentMenuOptions(activePlatform.value))

const permissionCodeOptions = computed(() =>
  permissionList.map((item) => ({ label: `${item.name} (${item.code})`, value: item.code })),
)

const rules = {
  menuType: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入菜单编码', trigger: 'blur' }],
  routePath: [{ required: true, message: '请输入路由地址', trigger: 'blur' }],
  componentPath: [{ required: true, message: '请输入组件路径', trigger: 'blur' }],
}

function boolLabel(val) {
  return val ? '是' : '否'
}

function openCreate(parentId = '') {
  editingId.value = ''
  parentIdForCreate.value = parentId
  form.value = {
    ...createEmptyMenuNode(parentId),
    menuType: parentId ? 'menu' : 'directory',
    componentPath: parentId ? '' : 'Layout',
  }
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  parentIdForCreate.value = row.parentId || ''
  form.value = cloneMenuNode(row)
  dialogVisible.value = true
}

function openAddChild(row) {
  openCreate(row.id)
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除菜单「${row.name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    if (deleteMenuNode(activePlatform.value, row.id)) {
      ElMessage.success('已删除')
    }
  } catch {
    /* cancelled */
  }
}

function addPermissionRow() {
  form.value.permissions.push({ name: '', code: '' })
}

function removePermissionRow(index) {
  form.value.permissions.splice(index, 1)
}

function handleMenuTypeChange(type) {
  if (type === 'directory') {
    form.value.componentPath = 'Layout'
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning('请完善必填项')
      return
    }
    const payload = {
      ...form.value,
      parentId: form.value.parentId ?? parentIdForCreate.value ?? '',
    }
    saveMenuNode(activePlatform.value, payload, editingId.value || undefined)
    dialogVisible.value = false
    ElMessage.success(editingId.value ? '保存成功' : '新增成功')
  })
}
</script>

<template>
  <div class="menu-page page-card">
    <div class="page-toolbar">
      <el-tabs v-model="activePlatform" class="platform-tabs">
        <el-tab-pane label="Web端" name="web" />
        <el-tab-pane label="App端" name="app" />
      </el-tabs>
      <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate()">
        新增
      </el-button>
    </div>

    <el-table
      :data="currentTree"
      row-key="id"
      border
      stripe
      default-expand-all
      class="ap-table menu-tree-table"
      :tree-props="{ children: 'children' }"
      empty-text="暂无菜单数据"
    >
      <el-table-column prop="name" label="菜单名称" min-width="180" />
      <el-table-column label="图标" width="72" align="center">
        <template #default="{ row }">
          <el-icon v-if="row.icon && iconMap[row.icon]" :size="18">
            <component :is="iconMap[row.icon]" />
          </el-icon>
          <span v-else class="muted-text">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="72" align="center" />
      <el-table-column prop="componentName" label="组件name" min-width="140" show-overflow-tooltip />
      <el-table-column prop="routePath" label="路由地址" min-width="180" show-overflow-tooltip />
      <el-table-column prop="componentPath" label="组件路径" min-width="160" show-overflow-tooltip />
      <el-table-column label="是否隐藏" width="96" align="center">
        <template #default="{ row }">{{ boolLabel(row.hidden) }}</template>
      </el-table-column>
      <el-table-column label="是否外链" width="96" align="center">
        <template #default="{ row }">{{ boolLabel(row.externalLink) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <span class="op-divider">|</span>
          <el-button link type="primary" @click="openAddChild(row)">新增</el-button>
          <span class="op-divider">|</span>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="760px"
      destroy-on-close
      class="menu-dialog"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="上级菜单">
          <el-select v-model="form.parentId" placeholder="主类目" style="width: 100%">
            <el-option
              v-for="opt in parentOptions"
              :key="opt.value || 'root'"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="菜单类型" prop="menuType" required>
          <el-radio-group v-model="form.menuType" @change="handleMenuTypeChange">
            <el-radio
              v-for="opt in menuNodeTypeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="菜单图标">
          <el-select v-model="form.icon" placeholder="请选择图标" clearable style="width: 100%">
            <el-option v-for="icon in menuIconOptions" :key="icon" :label="icon" :value="icon" />
          </el-select>
        </el-form-item>

        <el-row :gutter="24">
          <el-col :span="12">
            <el-form-item label="菜单名称" prop="name" required>
              <el-input v-model="form.name" placeholder="请输入菜单名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序编号">
              <el-input-number
                v-model="form.sort"
                :min="0"
                :max="9999"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="菜单编码" prop="code" required>
              <el-input v-model="form.code" placeholder="请输入菜单编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="模块名称">
              <el-select
                v-model="form.moduleName"
                placeholder="请选择模块名称"
                clearable
                style="width: 100%"
              >
                <el-option v-for="name in moduleNameOptions" :key="name" :label="name" :value="name" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="路由地址" prop="routePath" required>
              <el-input v-model="form.routePath" placeholder="请输入路由地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组件路径" prop="componentPath" required>
              <el-input v-model="form.componentPath" placeholder="请输入组件路径" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否隐藏">
              <el-radio-group v-model="form.hidden">
                <el-radio :value="false">否</el-radio>
                <el-radio :value="true">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否外链">
              <el-radio-group v-model="form.externalLink">
                <el-radio :value="false">否</el-radio>
                <el-radio :value="true">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>

        <template v-if="form.menuType === 'menu'">
          <div class="perm-section">
            <div class="perm-head">
              <span class="perm-title">权限列表</span>
              <el-button type="primary" link @click="addPermissionRow">+ 添加</el-button>
            </div>
            <div v-for="(perm, index) in form.permissions" :key="index" class="perm-row">
              <el-input v-model="perm.name" placeholder="请输入权限名称" />
              <el-select v-model="perm.code" placeholder="请选择权限码" clearable filterable>
                <el-option
                  v-for="opt in permissionCodeOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
              <el-button type="danger" plain @click="removePermissionRow(index)">删除</el-button>
            </div>
          </div>

          <el-form-item label="备注描述">
            <el-input
              v-model="form.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入备注描述"
            />
          </el-form-item>
        </template>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.menu-page {
  padding: 16px 20px 20px;
  min-height: calc(100vh - 120px);
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.platform-tabs {
  flex: 1;
}

.platform-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.menu-tree-table {
  width: 100%;
}

.muted-text {
  color: var(--ap-text-muted);
}

.op-divider {
  color: var(--ap-border);
  margin: 0 2px;
}

.perm-section {
  margin: 8px 0 16px;
  padding: 12px;
  border: 1px solid var(--ap-border);
  border-radius: 6px;
  background: var(--ap-bg-muted, #fafafa);
}

.perm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.perm-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ap-text-primary);
}

.perm-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  margin-bottom: 8px;
}
</style>

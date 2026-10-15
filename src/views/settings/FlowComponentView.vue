<script setup>
/**
 * 流程组件（指挥部 · 流程管理）
 * 流程设计器可拖拽使用的控件库：筛选（组件名称 / 组件分类 / 启用状态）+ 台账 + 新增 / 编辑 / 删除
 */
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listFlowComponents,
  createEmptyFlowComponent,
  cloneFlowComponent,
  saveFlowComponent,
  removeFlowComponent,
  enabledLabel,
  enabledTagType,
  joinOptions,
  FLOW_COMPONENT_CATEGORY_OPTIONS,
  FLOW_CLIENT_OPTIONS,
} from '../../mock/flowManage'

const filterForm = ref({
  component_name: '',
  category: '',
  enabled: '',
})

/** 检索条件仅在点击「搜索」时生效 */
const appliedFilter = ref({ ...filterForm.value })

const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref(null)
const form = ref(createEmptyFlowComponent())

const dialogTitle = computed(() => (editingId.value ? '编辑流程组件' : '新增流程组件'))

const rules = {
  component_name: [
    { required: true, message: '请输入组件名称', trigger: 'blur' },
    { max: 30, message: '组件名称不超过 30 个字符', trigger: 'blur' },
  ],
  component_code: [
    { required: true, message: '请输入组件编码', trigger: 'blur' },
    { max: 40, message: '组件编码不超过 40 个字符', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]+$/, message: '组件编码仅支持字母、数字与下划线', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择组件分类', trigger: 'change' }],
  clients: [{ required: true, type: 'array', min: 1, message: '请至少选择一个适用端', trigger: 'change' }],
  config_desc: [{ max: 200, message: '配置说明不超过 200 个字符', trigger: 'blur' }],
  remark: [{ max: 100, message: '备注不超过 100 个字符', trigger: 'blur' }],
}

const filteredList = computed(() => {
  const { component_name, category, enabled } = appliedFilter.value
  return listFlowComponents().filter((row) => {
    if (component_name && !String(row.component_name || '').toLowerCase().includes(component_name.trim().toLowerCase())) {
      return false
    }
    if (category && row.category !== category) return false
    if (enabled !== '' && Boolean(row.enabled) !== enabled) return false
    return true
  })
})

function handleSearch() {
  appliedFilter.value = { ...filterForm.value }
}

function handleReset() {
  filterForm.value = { component_name: '', category: '', enabled: '' }
  appliedFilter.value = { ...filterForm.value }
}

function openCreate() {
  editingId.value = ''
  form.value = createEmptyFlowComponent()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = cloneFlowComponent(row)
  dialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除流程组件「${row.component_name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const res = removeFlowComponent(row.id)
  if (res.ok) {
    ElMessage.success('已删除')
  } else {
    ElMessage.warning(res.msg)
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (!valid) {
      ElMessage.warning('请完善必填项')
      return
    }
    const res = saveFlowComponent(form.value, editingId.value || undefined)
    if (!res.ok) {
      ElMessage.warning(res.msg)
      return
    }
    dialogVisible.value = false
    ElMessage.success(editingId.value ? '保存成功' : '新增成功')
  })
}
</script>

<template>
  <div class="flow-component-page page-card">
    <div class="page-head">
      <h1 class="page-title">流程组件</h1>
      <p class="page-tip">维护流程设计器可拖拽使用的控件库，供流程表单与流程配置引用。</p>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">组件名称</span>
        <el-input
          v-model="filterForm.component_name"
          class="filter-input"
          placeholder="请输入组件名称"
          clearable
          aria-label="请输入组件名称"
          @keyup.enter="handleSearch"
        />
        <span class="field-label">组件分类</span>
        <el-select
          v-model="filterForm.category"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择组件分类"
        >
          <el-option v-for="opt in FLOW_COMPONENT_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
        </el-select>
        <span class="field-label">启用状态</span>
        <el-select
          v-model="filterForm.enabled"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择启用状态"
        >
          <el-option label="启用" :value="true" />
          <el-option label="停用" :value="false" />
        </el-select>
        <span class="toolbar-actions">
          <el-button type="primary" class="ap-btn-primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </span>
      </div>
    </div>

    <div class="table-head">
      <span class="total-text">共 {{ filteredList.length }} 条</span>
      <div class="table-actions">
        <el-button type="primary" class="ap-btn-primary" :icon="Plus" @click="openCreate">新增</el-button>
      </div>
    </div>

    <el-table :data="filteredList" border stripe class="ap-table" empty-text="暂无数据">
      <el-table-column prop="component_name" label="组件名称" min-width="150" />
      <el-table-column prop="component_code" label="组件编码" min-width="180" />
      <el-table-column prop="category" label="组件分类" width="120" align="center" />
      <el-table-column label="适用端" width="140">
        <template #default="{ row }">{{ joinOptions(row.clients) }}</template>
      </el-table-column>
      <el-table-column label="启用状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="enabledTagType(row.enabled)" effect="plain">{{ enabledLabel(row.enabled) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort_no" label="排序号" width="90" align="center" />
      <el-table-column label="备注" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.remark">{{ row.remark }}</span>
          <span v-else class="empty-cell">--</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <span class="op-divider">|</span>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="组件名称" prop="component_name" required>
          <el-input v-model="form.component_name" placeholder="如 单行文本" maxlength="30" aria-label="请输入组件名称" />
        </el-form-item>
        <el-form-item label="组件编码" prop="component_code" required>
          <el-input v-model="form.component_code" placeholder="如 input_text" maxlength="40" aria-label="请输入组件编码" />
        </el-form-item>
        <el-form-item label="组件分类" prop="category" required>
          <el-select v-model="form.category" placeholder="请选择组件分类" style="width: 100%" aria-label="请选择组件分类">
            <el-option v-for="opt in FLOW_COMPONENT_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用端" prop="clients" required>
          <el-checkbox-group v-model="form.clients">
            <el-checkbox v-for="opt in FLOW_CLIENT_OPTIONS" :key="opt" :value="opt">{{ opt }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="配置说明" prop="config_desc">
          <el-input
            v-model="form.config_desc"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="说明该组件可配置项（如最大长度、是否必填）"
            aria-label="请输入配置说明"
          />
        </el-form-item>
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="排序号" prop="sort_no">
          <el-input-number v-model="form.sort_no" :min="0" :max="9999" :step="10" aria-label="请输入排序号" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" maxlength="100" placeholder="选填" aria-label="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="handleSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.flow-component-page {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.page-head {
  margin-bottom: 12px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2329;
}

.page-tip {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ap-text-secondary);
}

.toolbar {
  margin-bottom: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.field-label {
  font-size: 14px;
  color: var(--ap-text-secondary);
  white-space: nowrap;
}

.filter-input,
.filter-select {
  width: 140px;
}

.toolbar-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
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

.empty-cell {
  color: var(--ap-text-secondary);
}

.op-divider {
  color: var(--ap-border);
  margin: 0 2px;
}
</style>

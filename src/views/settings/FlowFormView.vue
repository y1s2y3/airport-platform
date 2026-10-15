<script setup>
/**
 * 流程表单（指挥部 · 流程管理）
 * 流程绑定的业务表单模板：筛选（表单名称 / 所属流程分类 / 状态）+ 台账 + 新增 / 编辑 / 删除
 */
import { ref, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listFlowForms,
  createEmptyFlowForm,
  cloneFlowForm,
  saveFlowForm,
  removeFlowForm,
  formStatusTagType,
  FLOW_FORM_CATEGORY_OPTIONS,
  FLOW_FORM_TYPE_OPTIONS,
  FLOW_FORM_STATUS_OPTIONS,
} from '../../mock/flowManage'

const filterForm = ref({
  form_name: '',
  category: '',
  status: '',
})

/** 检索条件仅在点击「搜索」时生效 */
const appliedFilter = ref({ ...filterForm.value })

const dialogVisible = ref(false)
const editingId = ref('')
const formRef = ref(null)
const form = ref(createEmptyFlowForm())

const dialogTitle = computed(() => (editingId.value ? '编辑流程表单' : '新增流程表单'))

const rules = {
  form_name: [
    { required: true, message: '请输入表单名称', trigger: 'blur' },
    { max: 40, message: '表单名称不超过 40 个字符', trigger: 'blur' },
  ],
  form_code: [
    { required: true, message: '请输入表单编号', trigger: 'blur' },
    { max: 40, message: '表单编号不超过 40 个字符', trigger: 'blur' },
  ],
  category: [{ required: true, message: '请选择所属流程分类', trigger: 'change' }],
  form_type: [{ required: true, message: '请选择表单类型', trigger: 'change' }],
  version: [
    { required: true, message: '请输入版本号', trigger: 'blur' },
    { max: 20, message: '版本号不超过 20 个字符', trigger: 'blur' },
  ],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
  definition: [{ max: 60, message: '关联流程定义不超过 60 个字符', trigger: 'blur' }],
  remark: [{ max: 200, message: '说明不超过 200 个字符', trigger: 'blur' }],
}

const filteredList = computed(() => {
  const { form_name, category, status } = appliedFilter.value
  return listFlowForms().filter((row) => {
    if (form_name) {
      const kw = form_name.trim().toLowerCase()
      const hit = String(row.form_name || '').toLowerCase().includes(kw) || String(row.form_code || '').toLowerCase().includes(kw)
      if (!hit) return false
    }
    if (category && row.category !== category) return false
    if (status && row.status !== status) return false
    return true
  })
})

function handleSearch() {
  appliedFilter.value = { ...filterForm.value }
}

function handleReset() {
  filterForm.value = { form_name: '', category: '', status: '' }
  appliedFilter.value = { ...filterForm.value }
}

function openCreate() {
  editingId.value = ''
  form.value = createEmptyFlowForm()
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  form.value = cloneFlowForm(row)
  dialogVisible.value = true
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除流程表单「${row.form_name}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  const res = removeFlowForm(row.id)
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
    const res = saveFlowForm(form.value, editingId.value || undefined)
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
  <div class="flow-form-page page-card">
    <div class="page-head">
      <h1 class="page-title">流程表单</h1>
      <p class="page-tip">维护流程绑定的业务表单模板，供流程定义引用。</p>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <span class="field-label">表单名称</span>
        <el-input
          v-model="filterForm.form_name"
          class="filter-input"
          placeholder="名称或编号"
          clearable
          aria-label="请输入表单名称或编号"
          @keyup.enter="handleSearch"
        />
        <span class="field-label">所属流程分类</span>
        <el-select
          v-model="filterForm.category"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择所属流程分类"
        >
          <el-option v-for="opt in FLOW_FORM_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
        </el-select>
        <span class="field-label">状态</span>
        <el-select
          v-model="filterForm.status"
          class="filter-select"
          placeholder="请选择"
          clearable
          aria-label="请选择状态"
        >
          <el-option v-for="opt in FLOW_FORM_STATUS_OPTIONS" :key="opt" :label="opt" :value="opt" />
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
      <el-table-column prop="form_name" label="表单名称" min-width="190" />
      <el-table-column prop="form_code" label="表单编号" min-width="180" />
      <el-table-column prop="category" label="所属流程分类" width="130" align="center" />
      <el-table-column prop="form_type" label="表单类型" width="120" align="center" />
      <el-table-column prop="version" label="版本号" width="100" align="center" />
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="formStatusTagType(row.status)" effect="plain">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关联流程定义" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.definition">{{ row.definition }}</span>
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="表单名称" prop="form_name" required>
          <el-input v-model="form.form_name" placeholder="如 材料设备进场申请单" maxlength="40" aria-label="请输入表单名称" />
        </el-form-item>
        <el-form-item label="表单编号" prop="form_code" required>
          <el-input v-model="form.form_code" placeholder="如 FORM_MAT_ENTRY" maxlength="40" aria-label="请输入表单编号" />
        </el-form-item>
        <el-form-item label="所属流程分类" prop="category" required>
          <el-select v-model="form.category" placeholder="请选择所属流程分类" style="width: 100%" aria-label="请选择所属流程分类">
            <el-option v-for="opt in FLOW_FORM_CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="表单类型" prop="form_type" required>
          <el-select v-model="form.form_type" placeholder="请选择表单类型" style="width: 100%" aria-label="请选择表单类型">
            <el-option v-for="opt in FLOW_FORM_TYPE_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="版本号" prop="version" required>
          <el-input v-model="form.version" placeholder="如 V1.0" maxlength="20" aria-label="请输入版本号" />
        </el-form-item>
        <el-form-item label="状态" prop="status" required>
          <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%" aria-label="请选择状态">
            <el-option v-for="opt in FLOW_FORM_STATUS_OPTIONS" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="关联流程定义" prop="definition">
          <el-input v-model="form.definition" maxlength="60" placeholder="选填，填流程定义名称或编号" aria-label="请输入关联流程定义" />
        </el-form-item>
        <el-form-item label="说明" prop="remark">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="200"
            show-word-limit
            placeholder="选填"
            aria-label="请输入说明"
          />
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
.flow-form-page {
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
  width: 150px;
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

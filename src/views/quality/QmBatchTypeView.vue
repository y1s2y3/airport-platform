<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  batchTypeForms,
  batchTypes,
  bindBatchTypeForm,
  createBatchType,
  formTemplates,
  resolveTemplateName,
  unbindBatchTypeForm,
} from '../../mock/qm.js'

const currentId = ref(batchTypes[0]?.id || '')
const bindForm = reactive({ form_template_id: '', is_primary: 1 })
const typeVisible = ref(false)
const typeForm = reactive({
  type_code: '',
  type_name: '',
  specialty: '结构',
  status: 1,
  remark: '',
})

const current = computed(() => batchTypes.find((t) => t.id === currentId.value))
const links = computed(() =>
  batchTypeForms.filter((l) => l.batch_type_id === currentId.value).sort((a, b) => a.sort_no - b.sort_no),
)
const enabledForms = computed(() => formTemplates.filter((t) => t.status === 1 && t.apply_level === 1))

function onBind() {
  const r = bindBatchTypeForm(currentId.value, bindForm.form_template_id, {
    is_primary: bindForm.is_primary,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已绑定表单')
  bindForm.form_template_id = ''
}

function onUnbind(id) {
  const r = unbindBatchTypeForm(id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已解除绑定')
}

function toggleType(row) {
  row.status = row.status === 1 ? 0 : 1
  ElMessage.success(row.status === 1 ? '已启用' : '已停用')
}

function openCreateType() {
  Object.assign(typeForm, { type_code: '', type_name: '', specialty: '结构', status: 1, remark: '' })
  typeVisible.value = true
}

function submitType() {
  const r = createBatchType({ ...typeForm })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已创建检验批类型，请绑定启用表单')
  currentId.value = r.type.id
  typeVisible.value = false
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 检验批类型</div>
      <h1 class="page-title">检验批类型与表单绑定</h1>
      <p class="page-tip">类型 : 表单 = 1 : N（钢筋类型已演示绑定 2 张省统表）；未绑启用表单不可用于新建检验批</p>
    </div>
    <div class="toolbar">
      <el-button type="primary" :icon="Plus" @click="openCreateType">新建类型</el-button>
    </div>
    <div class="layout">
      <el-table :data="batchTypes" highlight-current-row border @current-change="(r) => r && (currentId = r.id)">
        <el-table-column prop="type_code" label="类型编码" width="120" />
        <el-table-column prop="type_name" label="类型名称" min-width="160" />
        <el-table-column prop="specialty" label="专业" width="90" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">{{ row.status === 1 ? '启用' : '停用' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" @click="toggleType(row)">切换</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="current" class="bind-panel">
        <h3>{{ current.type_name }} · 已绑表单（{{ links.length }}）</h3>
        <el-table :data="links" border size="small" class="mb">
          <el-table-column label="表单模板" min-width="200">
            <template #default="{ row }">{{ resolveTemplateName(row.form_template_id) }}</template>
          </el-table-column>
          <el-table-column prop="sort_no" label="排序" width="70" />
          <el-table-column label="主表" width="70">
            <template #default="{ row }">{{ row.is_primary === 1 ? '是' : '否' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="90">
            <template #default="{ row }">
              <el-button link type="danger" @click="onUnbind(row.id)">解除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="filter-bar">
          <el-select v-model="bindForm.form_template_id" placeholder="选择启用中的检验批表单" style="width: 280px">
            <el-option
              v-for="t in enabledForms"
              :key="t.id"
              :label="t.template_name"
              :value="t.id"
            />
          </el-select>
          <el-checkbox v-model="bindForm.is_primary" :true-value="1" :false-value="0">设为主表</el-checkbox>
          <el-button type="primary" @click="onBind">绑定</el-button>
        </div>
      </div>
    </div>

    <el-dialog v-model="typeVisible" title="新建检验批类型" width="480px">
      <el-form label-width="100px">
        <el-form-item label="类型编码" required><el-input v-model="typeForm.type_code" /></el-form-item>
        <el-form-item label="类型名称" required><el-input v-model="typeForm.type_name" /></el-form-item>
        <el-form-item label="专业" required><el-input v-model="typeForm.specialty" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="typeForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitType">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.toolbar { display: flex; }
.layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.bind-panel { background: #fff; border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.mb { margin-bottom: 12px; }
@media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }
</style>

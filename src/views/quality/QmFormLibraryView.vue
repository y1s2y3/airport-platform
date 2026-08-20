<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import {
  APPLY_LEVEL,
  formTemplates,
  getItemDefsByTemplate,
  ITEM_CATEGORY,
  removeFormItemDef,
  saveFormItemDef,
  saveFormTemplate,
  setTemplateStatus,
  SOURCE_KIND,
  TEMPLATE_STATUS,
} from '../../mock/qm.js'

const keyword = ref('')
const visible = ref(false)
const itemVisible = ref(false)
const currentTplId = ref(formTemplates[0]?.id || '')
const form = reactive({
  id: '',
  template_code: '',
  template_name: '',
  apply_level: 1,
  source_kind: 2,
  specialty: '主体结构',
  standard_ref: '',
  version_no: 'V1',
  status: 0,
  form_schema_text: '[]',
})
const itemForm = reactive({
  id: '',
  template_id: '',
  seq_no: 1,
  item_category: 1,
  item_name: '',
  standard_desc: '',
  check_method: '',
  check_freq: '',
  need_photo: 0,
  enable_auto_judge: 0,
})

const list = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return formTemplates
  return formTemplates.filter((t) => `${t.template_code}${t.template_name}`.includes(kw))
})

const itemDefs = computed(() => getItemDefsByTemplate(currentTplId.value))
const currentTpl = computed(() => formTemplates.find((t) => t.id === currentTplId.value))

function openCreate() {
  Object.assign(form, {
    id: '',
    template_code: '',
    template_name: '',
    apply_level: 1,
    source_kind: 2,
    specialty: '主体结构',
    standard_ref: '',
    version_no: 'V1',
    status: 0,
    form_schema_text: '["工程名称","验收部位"]',
  })
  visible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    ...row,
    form_schema_text: JSON.stringify(row.form_schema?.fields || [], null, 0),
  })
  visible.value = true
}

function submit() {
  let fields = []
  try {
    fields = JSON.parse(form.form_schema_text || '[]')
    if (!Array.isArray(fields)) throw new Error('not array')
  } catch {
    return ElMessage.error('表单 Schema 须为 JSON 数组，如 ["工程名称"]')
  }
  const payload = {
    template_code: form.template_code,
    template_name: form.template_name,
    apply_level: form.apply_level,
    source_kind: form.source_kind,
    specialty: form.specialty,
    standard_ref: form.standard_ref,
    version_no: form.version_no,
    status: form.status,
    form_schema: { fields },
  }
  const r = saveFormTemplate(payload, form.id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(form.id ? '已更新' : '已创建')
  visible.value = false
}

function toggle(row, status) {
  setTemplateStatus(row, status)
  ElMessage.success(`已${TEMPLATE_STATUS[status]}`)
}

function openItemCreate() {
  if (!currentTplId.value) return ElMessage.warning('请先选择模板')
  Object.assign(itemForm, {
    id: '',
    template_id: currentTplId.value,
    seq_no: itemDefs.value.length + 1,
    item_category: 1,
    item_name: '',
    standard_desc: '',
    check_method: '',
    check_freq: '',
    need_photo: 0,
    enable_auto_judge: 0,
  })
  itemVisible.value = true
}

function openItemEdit(row) {
  Object.assign(itemForm, { ...row })
  itemVisible.value = true
}

function submitItem() {
  const r = saveFormItemDef({ ...itemForm }, itemForm.id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(itemForm.id ? '检查项已更新' : '检查项已新增')
  itemVisible.value = false
}

function onRemoveItem(id) {
  const r = removeFormItemDef(id)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success('已删除')
}

</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量验评 / 验收单模板库</div>
      <h1 class="page-title">验收单模板库</h1>
      <p class="page-tip">维护验收单模板及其检查项；启用后方可被检验批类型/验评节点引用</p>
    </div>
    <div class="filter-bar">
      <el-input v-model="keyword" clearable placeholder="编码/名称" style="width: 220px" :prefix-icon="Search" aria-label="编码/名称"/>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建模板</el-button>
    </div>
    <el-table
      :data="list"
      stripe
      border
      highlight-current-row
      @current-change="(r) => r && (currentTplId = r.id)"
    >
      <el-table-column prop="template_code" label="模板编码" width="140" />
      <el-table-column prop="template_name" label="模板名称" min-width="200" />
      <el-table-column label="适用层级" width="100">
        <template #default="{ row }">{{ APPLY_LEVEL[row.apply_level] }}</template>
      </el-table-column>
      <el-table-column label="来源" width="110">
        <template #default="{ row }">{{ SOURCE_KIND[row.source_kind] }}</template>
      </el-table-column>
      <el-table-column prop="specialty" label="专业" width="110" />
      <el-table-column prop="version_no" label="版本" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'">
            {{ TEMPLATE_STATUS[row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="row.status !== 1" link type="success" @click="toggle(row, 1)">启用</el-button>
          <el-button v-if="row.status === 1" link type="warning" @click="toggle(row, 2)">停用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="currentTpl" class="item-panel">
      <div class="panel-head">
        <h3>本模板检查项 · {{ currentTpl.template_name }}</h3>
        <el-button type="primary" size="small" :icon="Plus" @click="openItemCreate">新增检查项</el-button>
      </div>
      <p class="hint">表头字段 Schema：{{ (currentTpl.form_schema?.fields || []).join('、') || '—' }}</p>
      <el-table :data="itemDefs" border size="small">
        <el-table-column prop="seq_no" label="序号" width="60" />
        <el-table-column label="类别" width="80">
          <template #default="{ row }">{{ ITEM_CATEGORY[row.item_category] }}</template>
        </el-table-column>
        <el-table-column prop="item_name" label="检查项名称" min-width="160" />
        <el-table-column prop="standard_desc" label="标准要求" min-width="140" show-overflow-tooltip />
        <el-table-column label="必影像" width="70">
          <template #default="{ row }">{{ row.need_photo === 1 ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button link type="primary" @click="openItemEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onRemoveItem(row.id)">删</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="visible" :title="form.id ? '编辑模板' : '新建模板'" width="560px">
      <el-form label-width="110px">
        <el-form-item label="模板编码" required>
          <el-input v-model="form.template_code" />
        </el-form-item>
        <el-form-item label="模板名称" required>
          <el-input v-model="form.template_name" />
        </el-form-item>
        <el-form-item label="适用层级">
          <el-select v-model="form.apply_level" style="width: 100%">
            <el-option v-for="(label, val) in APPLY_LEVEL" :key="val" :label="label" :value="Number(val)" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="form.source_kind" style="width: 100%">
            <el-option v-for="(label, val) in SOURCE_KIND" :key="val" :label="label" :value="Number(val)" />
          </el-select>
        </el-form-item>
        <el-form-item label="专业"><el-input v-model="form.specialty" /></el-form-item>
        <el-form-item label="标准依据"><el-input v-model="form.standard_ref" /></el-form-item>
        <el-form-item label="版本号"><el-input v-model="form.version_no" /></el-form-item>
        <el-form-item label="表头字段Schema">
          <el-input v-model="form.form_schema_text" type="textarea" :rows="2" placeholder='["工程名称","验收部位"]' />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="itemVisible" :title="itemForm.id ? '编辑检查项' : '新增检查项'" width="520px">
      <el-form label-width="110px">
        <el-form-item label="序号"><el-input-number v-model="itemForm.seq_no" :min="1" /></el-form-item>
        <el-form-item label="类别">
          <el-select v-model="itemForm.item_category" style="width: 100%">
            <el-option v-for="(label, val) in ITEM_CATEGORY" :key="val" :label="label" :value="Number(val)" />
          </el-select>
        </el-form-item>
        <el-form-item label="检查项名称" required><el-input v-model="itemForm.item_name" /></el-form-item>
        <el-form-item label="标准要求"><el-input v-model="itemForm.standard_desc" /></el-form-item>
        <el-form-item label="检测方法"><el-input v-model="itemForm.check_method" /></el-form-item>
        <el-form-item label="检查频次"><el-input v-model="itemForm.check_freq" /></el-form-item>
        <el-form-item label="必须影像">
          <el-switch v-model="itemForm.need_photo" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemVisible = false">取消</el-button>
        <el-button type="primary" @click="submitItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.qm-page { display: flex; flex-direction: column; gap: 16px; }
.page-breadcrumb { font-size: 12px; color: #909399; }
.page-title { margin: 4px 0; font-size: 20px; }
.page-tip { margin: 0; font-size: 13px; color: #606266; }
.filter-bar { display: flex; gap: 8px; }
.item-panel { border: 1px solid #ebeef5; border-radius: 8px; padding: 12px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.panel-head h3 { margin: 0; font-size: 15px; }
.hint { font-size: 12px; color: #909399; margin: 0 0 8px; }
</style>

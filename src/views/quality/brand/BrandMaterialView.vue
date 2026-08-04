<script setup>
import './brand-page.css'
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  deleteSpec,
  listMaterials,
  listSpecsByMaterial,
  MATERIAL_TYPE,
  saveMaterial,
  saveSpec,
  toggleMaterialStatus,
} from '../../../mock/brand.js'

const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)
const dialogVisible = ref(false)
const specVisible = ref(false)
const current = ref(null)
const form = reactive({
  material_id: '',
  material_name: '',
  material_type: 'material',
  remark: '',
})
const newSpec = ref('')
const editingSpecId = ref('')
const editingSpecModel = ref('')

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listMaterials({
    keyword: keyword.value,
    status: statusFilter.value,
    projectId: scopeProjectId.value,
  }).map((m) => ({
    ...m,
    specs: listSpecsByMaterial(m.material_id),
  }))
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function openCreate() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  Object.assign(form, {
    material_id: '',
    material_name: '',
    material_type: 'material',
    remark: '',
  })
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    material_id: row.material_id,
    material_name: row.material_name,
    material_type: row.material_type,
    remark: row.remark || '',
  })
  dialogVisible.value = true
}

function onSave() {
  if (!scopeProjectId.value) return ElMessage.warning('请先切换到具体项目')
  const r = saveMaterial({ ...form, project_id: scopeProjectId.value })
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  dialogVisible.value = false
  ElMessage.success('已保存')
}

function onToggle(row) {
  const r = toggleMaterialStatus(row.material_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success(r.data.status === 'active' ? '已启用' : '已停用')
}

function openSpecs(row) {
  current.value = row
  newSpec.value = ''
  cancelEditSpec()
  specVisible.value = true
  tick.value += 1
}

const currentSpecs = computed(() => {
  void tick.value
  if (!current.value) return []
  return listSpecsByMaterial(current.value.material_id)
})

function onAddSpec() {
  const r = saveSpec(current.value.material_id, newSpec.value)
  if (!r.ok) return ElMessage.error(r.msg)
  newSpec.value = ''
  tick.value += 1
  ElMessage.success('已添加规格')
}

function startEditSpec(row) {
  editingSpecId.value = row.spec_id
  editingSpecModel.value = row.spec_model
}

function cancelEditSpec() {
  editingSpecId.value = ''
  editingSpecModel.value = ''
}

function onSaveEditSpec() {
  const r = saveSpec(current.value.material_id, editingSpecModel.value, editingSpecId.value)
  if (!r.ok) return ElMessage.error(r.msg)
  cancelEditSpec()
  tick.value += 1
  ElMessage.success('已更新规格')
}

async function onDeleteSpec(row) {
  try {
    await ElMessageBox.confirm(
      `确认删除规格「${row.spec_model}」？\n将同步清除品牌库中对该规格的关联。`,
      '删除规格',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const r = deleteSpec(row.spec_id)
  if (!r.ok) return ElMessage.error(r.msg)
  if (editingSpecId.value === row.spec_id) cancelEditSpec()
  tick.value += 1
  ElMessage.success('已删除规格')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 材料规格库</div>
      <h1 class="page-title">材料规格库</h1>
      <p class="page-tip">
        项目级主数据 · 当前：{{ isHqSelected ? '请切换到具体项目' : scopeProjectLabel }} ·
        报审导入仅可选本项目启用材料 · 不含报审手填数据
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      class="mb"
      title="请切换到具体项目后维护本项目材料规格库"
    />

    <template v-else>
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="材料名称"
        style="width: 220px"
        :prefix-icon="Search"
      />
      <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 120px">
        <el-option label="启用" value="active" />
        <el-option label="停用" value="inactive" />
      </el-select>
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增材料</el-button>
    </div>

    <el-table :data="list" stripe border>
      <el-table-column prop="material_id" label="材料ID" width="100" />
      <el-table-column prop="material_name" label="材料名称" min-width="140" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
      </el-table-column>
      <el-table-column label="规格" min-width="200">
        <template #default="{ row }">
          <el-tag v-for="s in row.specs" :key="s.spec_id" size="small" class="tag" effect="plain">
            {{ s.spec_model }}
          </el-tag>
          <span v-if="!row.specs.length" class="muted">无</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openSpecs(row)">规格</el-button>
          <el-button link type="warning" @click="onToggle(row)">
            {{ row.status === 'active' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.material_id ? '编辑材料' : '新增材料'" width="480px">
      <el-form label-width="100px">
        <el-form-item label="材料名称" required>
          <el-input v-model="form.material_name" />
        </el-form-item>
        <el-form-item label="材料类型" required>
          <el-select v-model="form.material_type" style="width: 100%">
            <el-option v-for="(label, val) in MATERIAL_TYPE" :key="val" :label="label" :value="val" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="specVisible"
      :title="`规格维护 · ${current?.material_name || ''}`"
      width="620px"
      destroy-on-close
      @closed="cancelEditSpec"
    >
      <el-table :data="currentSpecs" border size="small" class="mb" empty-text="暂无规格">
        <el-table-column prop="spec_id" label="规格ID" width="100" />
        <el-table-column label="规格型号" min-width="180">
          <template #default="{ row }">
            <el-input
              v-if="editingSpecId === row.spec_id"
              v-model="editingSpecModel"
              size="small"
              placeholder="规格型号"
            />
            <span v-else>{{ row.spec_model }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="editingSpecId === row.spec_id">
              <el-button link type="primary" @click="onSaveEditSpec">保存</el-button>
              <el-button link @click="cancelEditSpec">取消</el-button>
            </template>
            <template v-else>
              <el-button link type="primary" @click="startEditSpec(row)">编辑</el-button>
              <el-button link type="danger" @click="onDeleteSpec(row)">删除</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
      <div class="row">
        <el-input v-model="newSpec" placeholder="新规格型号，如 C30" @keyup.enter="onAddSpec" />
        <el-button type="primary" @click="onAddSpec">添加</el-button>
      </div>
    </el-dialog>
    </template>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.tag {
  margin-right: 4px;
}
.muted {
  color: var(--el-text-color-secondary);
}
.mb {
  margin-bottom: 12px;
}
.row {
  display: flex;
  gap: 8px;
}
</style>

<script setup>
import './brand-page.css'
import { computed, nextTick, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import {
  listBrandMaterialRows,
  listMaterials,
  listSpecsByMaterial,
  MATERIAL_TYPE,
  removeBrandMaterial,
  saveBrand,
  SOURCE_TYPE,
  toggleBrandStatus,
} from '../../../mock/brand.js'

const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)
const dialogVisible = ref(false)
/** create | edit | addMaterial */
const dialogMode = ref('create')

const form = reactive({
  brand_lib_id: '',
  brand_name: '',
  manufacturer: '',
  material_id: '',
  /** 编辑时锁定的原材料 ID */
  editMaterialId: '',
  spec_ids: [],
})

const list = computed(() => {
  void tick.value
  return listBrandMaterialRows({
    keyword: keyword.value,
    status: statusFilter.value,
  })
})

const activeMaterials = computed(() => {
  void tick.value
  const all = listMaterials({ status: 'active' })
  // 新增材料：排除该品牌下已有材料（一条数据=品牌+一个材料）
  if (dialogMode.value === 'addMaterial' && form.brand_lib_id) {
    const used = new Set(
      listBrandMaterialRows({})
        .filter((r) => r.brand_lib_id === form.brand_lib_id && r.material_id)
        .map((r) => r.material_id),
    )
    return all.filter((m) => !used.has(m.material_id))
  }
  return all
})

const formSpecOptions = computed(() =>
  form.material_id ? listSpecsByMaterial(form.material_id) : [],
)

const dialogTitle = computed(() => {
  if (dialogMode.value === 'edit') return '编辑品牌材料'
  if (dialogMode.value === 'addMaterial') return '新增材料规格'
  return '新增品牌'
})

const brandNameLocked = computed(() => dialogMode.value === 'addMaterial')

function onFormMaterialChange() {
  if (dialogMode.value !== 'edit') form.spec_ids = []
  else form.spec_ids = []
}

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function openCreate() {
  dialogMode.value = 'create'
  Object.assign(form, {
    brand_lib_id: '',
    brand_name: '',
    manufacturer: '',
    material_id: '',
    editMaterialId: '',
    spec_ids: [],
  })
  dialogVisible.value = true
}

/** 在已有品牌下再增加一条「材料+多规格」数据 */
function openAddMaterial(row) {
  dialogMode.value = 'addMaterial'
  Object.assign(form, {
    brand_lib_id: row.brand_lib_id,
    brand_name: row.brand_name,
    manufacturer: row.manufacturer,
    material_id: '',
    editMaterialId: '',
    spec_ids: [],
  })
  dialogVisible.value = true
}

async function openEdit(row) {
  dialogMode.value = 'edit'
  Object.assign(form, {
    brand_lib_id: row.brand_lib_id,
    brand_name: row.brand_name,
    manufacturer: row.manufacturer,
    material_id: row.material_id || '',
    editMaterialId: row.material_id || '',
    spec_ids: [],
  })
  dialogVisible.value = true
  await nextTick()
  form.spec_ids = (row.specs || []).map((s) => s.spec_id)
}

function onSave() {
  let r
  if (dialogMode.value === 'edit') {
    r = saveBrand({
      brand_lib_id: form.brand_lib_id,
      brand_name: form.brand_name,
      manufacturer: form.manufacturer,
      material_id: form.material_id,
      editMaterialId: form.editMaterialId,
      spec_ids: form.spec_ids,
    })
  } else if (dialogMode.value === 'addMaterial') {
    // 复用品牌，新增一条材料数据
    r = saveBrand({
      brand_name: form.brand_name,
      manufacturer: form.manufacturer,
      material_id: form.material_id,
      spec_ids: form.spec_ids,
    })
  } else {
    r = saveBrand({
      brand_name: form.brand_name,
      manufacturer: form.manufacturer,
      material_id: form.material_id,
      spec_ids: form.spec_ids,
    })
  }
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  dialogVisible.value = false
  ElMessage.success('已保存')
}

function onToggle(row) {
  const r = toggleBrandStatus(row.brand_lib_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success(r.data.status === 'active' ? '已启用' : '已停用')
}

async function onRemoveRow(row) {
  if (!row.material_id) return ElMessage.warning('该行无材料关联')
  try {
    await ElMessageBox.confirm(
      `确认删除「${row.brand_name} · ${row.material_name}」这条数据？\n将清除该品牌在该材料下的全部规格关联。`,
      '删除',
      { type: 'warning' },
    )
  } catch {
    return
  }
  const r = removeBrandMaterial(row.brand_lib_id, row.material_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 品牌库管理</div>
      <h1 class="page-title">品牌库管理</h1>
      <p class="page-tip">
        一条数据 = 一个品牌 + 一个材料 + 多个规格；同一品牌可有多条数据（不同材料）；一个生产厂家可对应多个品牌
      </p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="品牌 / 厂家 / 材料 / 规格"
        style="width: 260px"
        :prefix-icon="Search"
      />
      <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 120px">
        <el-option label="启用" value="active" />
        <el-option label="停用" value="inactive" />
      </el-select>
      <el-button type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增品牌</el-button>
    </div>

    <el-table :data="list" stripe border row-key="row_key">
      <el-table-column prop="brand_name" label="品牌名称" width="120" />
      <el-table-column prop="manufacturer" label="生产厂家" min-width="180" show-overflow-tooltip />
      <el-table-column label="材料" min-width="120">
        <template #default="{ row }">
          <span v-if="row.material_name">
            {{ row.material_name }}
            <el-tag v-if="row.material_type" size="small" type="info" effect="plain" class="type-tag">
              {{ MATERIAL_TYPE[row.material_type] || row.material_type }}
            </el-tag>
          </span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="材料规格" min-width="200">
        <template #default="{ row }">
          <el-tag
            v-for="s in row.specs"
            :key="s.spec_id"
            size="small"
            class="tag"
            effect="plain"
          >
            {{ s.spec_model }}
          </el-tag>
          <span v-if="!row.specs.length" class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="来源" width="120">
        <template #default="{ row }">{{ SOURCE_TYPE[row.source_type] || row.source_type }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openAddMaterial(row)">新增材料</el-button>
          <el-button link type="danger" :disabled="!row.material_id" @click="onRemoveRow(row)">
            删除
          </el-button>
          <el-button link type="warning" @click="onToggle(row)">
            {{ row.status === 'active' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="品牌名称" required>
          <el-input
            v-model="form.brand_name"
            :disabled="brandNameLocked"
            placeholder="请输入品牌名称"
          />
        </el-form-item>
        <el-form-item label="生产厂家" required>
          <el-input
            v-model="form.manufacturer"
            :disabled="brandNameLocked"
            placeholder="请输入生产厂家"
          />
        </el-form-item>
        <el-form-item label="材料" required>
          <el-select
            v-model="form.material_id"
            filterable
            placeholder="一条数据对应一个材料"
            style="width: 100%"
            @change="onFormMaterialChange"
          >
            <el-option
              v-for="m in activeMaterials"
              :key="m.material_id"
              :label="`${m.material_name}（${MATERIAL_TYPE[m.material_type]}）`"
              :value="m.material_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="材料规格" required>
          <el-select
            v-model="form.spec_ids"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            :disabled="!form.material_id"
            placeholder="同一材料下可多选规格"
            style="width: 100%"
          >
            <el-option
              v-for="s in formSpecOptions"
              :key="s.spec_id"
              :label="s.spec_model"
              :value="s.spec_id"
            />
          </el-select>
          <p v-if="form.material_id && !formSpecOptions.length" class="hint">
            该材料暂无规格，请先在「材料规格库」维护
          </p>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
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
  margin: 0 6px 4px 0;
}
.type-tag {
  margin-left: 6px;
}
.muted {
  color: var(--el-text-color-secondary);
}
.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}
</style>

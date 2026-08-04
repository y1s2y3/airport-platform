# -*- coding: utf-8 -*-
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "src" / "views" / "quality" / "brand"

LIB = """\
<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import {
  getBrandMaterials,
  linkBrandMaterial,
  listBrands,
  listMaterials,
  MATERIAL_TYPE,
  saveBrand,
  SOURCE_TYPE,
  toggleBrandStatus,
} from '../../../mock/brand.js'

const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)
const dialogVisible = ref(false)
const linkVisible = ref(false)
const currentBrand = ref(null)
const form = reactive({ brand_lib_id: '', brand_name: '', manufacturer: '' })
const linkMaterialId = ref('')

const list = computed(() => {
  void tick.value
  return listBrands({ keyword: keyword.value, status: statusFilter.value }).map((b) => ({
    ...b,
    materials: getBrandMaterials(b.brand_lib_id),
  }))
})

const activeMaterials = computed(() => listMaterials({ status: 'active' }))

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function openCreate() {
  Object.assign(form, { brand_lib_id: '', brand_name: '', manufacturer: '' })
  dialogVisible.value = true
}

function openEdit(row) {
  Object.assign(form, {
    brand_lib_id: row.brand_lib_id,
    brand_name: row.brand_name,
    manufacturer: row.manufacturer,
  })
  dialogVisible.value = true
}

function onSave() {
  const r = saveBrand(form)
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

function openLink(row) {
  currentBrand.value = row
  linkMaterialId.value = ''
  linkVisible.value = true
}

function onLink() {
  const r = linkBrandMaterial(currentBrand.value.brand_lib_id, linkMaterialId.value)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  linkVisible.value = false
  ElMessage.success('已关联材料')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 品牌库管理</div>
      <h1 class="page-title">品牌库管理</h1>
      <p class="page-tip">企业级主数据 · 只存品牌名称与厂家 · 材料通过关联挂接材料规格库</p>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="品牌名称 / 生产厂家"
        style="width: 240px"
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

    <el-table :data="list" stripe border>
      <el-table-column prop="brand_lib_id" label="品牌ID" width="100" />
      <el-table-column prop="brand_name" label="品牌名称" width="120" />
      <el-table-column prop="manufacturer" label="生产厂家" min-width="200" />
      <el-table-column label="来源" width="120">
        <template #default="{ row }">{{ SOURCE_TYPE[row.source_type] || row.source_type }}</template>
      </el-table-column>
      <el-table-column label="关联材料" min-width="180">
        <template #default="{ row }">
          <el-tag
            v-for="m in row.materials"
            :key="m.material_id"
            size="small"
            class="tag"
            effect="plain"
          >
            {{ m.material_name }}
          </el-tag>
          <span v-if="!row.materials.length" class="muted">未关联</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="primary" @click="openLink(row)">关联材料</el-button>
          <el-button link type="warning" @click="onToggle(row)">
            {{ row.status === 'active' ? '停用' : '启用' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.brand_lib_id ? '编辑品牌' : '新增品牌'" width="480px">
      <el-form label-width="100px">
        <el-form-item label="品牌名称" required>
          <el-input v-model="form.brand_name" />
        </el-form-item>
        <el-form-item label="生产厂家" required>
          <el-input v-model="form.manufacturer" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="linkVisible" title="关联企业材料" width="480px">
      <el-form label-width="100px">
        <el-form-item label="品牌">{{ currentBrand?.brand_name }}</el-form-item>
        <el-form-item label="企业材料" required>
          <el-select v-model="linkMaterialId" filterable style="width: 100%">
            <el-option
              v-for="m in activeMaterials"
              :key="m.material_id"
              :label="`${m.material_name}（${MATERIAL_TYPE[m.material_type]}）`"
              :value="m.material_id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkVisible = false">取消</el-button>
        <el-button type="primary" @click="onLink">确定</el-button>
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
  margin-right: 4px;
}
.muted {
  color: var(--el-text-color-secondary);
}
</style>
"""

MAT = """\
<script setup>
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import {
  listMaterials,
  listSpecsByMaterial,
  MATERIAL_TYPE,
  saveMaterial,
  saveSpec,
  toggleMaterialStatus,
} from '../../../mock/brand.js'

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

const list = computed(() => {
  void tick.value
  return listMaterials({ keyword: keyword.value, status: statusFilter.value }).map((m) => ({
    ...m,
    specs: listSpecsByMaterial(m.material_id),
  }))
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

function openCreate() {
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
  const r = saveMaterial(form)
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
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 材料规格库</div>
      <h1 class="page-title">材料规格库</h1>
      <p class="page-tip">企业级主数据 · 报审导入仅可选启用材料 · 不含报审手填数据</p>
    </div>

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
      width="520px"
    >
      <el-table :data="currentSpecs" border size="small" class="mb" empty-text="暂无规格">
        <el-table-column prop="spec_id" label="规格ID" width="100" />
        <el-table-column prop="spec_model" label="规格型号" />
      </el-table>
      <div class="row">
        <el-input v-model="newSpec" placeholder="新规格型号，如 C30" />
        <el-button type="primary" @click="onAddSpec">添加</el-button>
      </div>
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
"""


def main():
    (BASE / "BrandLibraryView.vue").write_text(LIB, encoding="utf-8")
    (BASE / "BrandMaterialView.vue").write_text(MAT, encoding="utf-8")
    lib_text = (BASE / "BrandLibraryView.vue").read_text(encoding="utf-8")
    mat_text = (BASE / "BrandMaterialView.vue").read_text(encoding="utf-8")
    assert "品牌库管理" in lib_text
    assert "材料规格库" in mat_text
    print("OK")


if __name__ == "__main__":
    main()

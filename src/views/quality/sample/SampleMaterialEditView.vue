<script setup>
/**
 * 新建材料定样：定版定样与比选记录逻辑一致
 * 级联：供应商（品牌报审）→ 材料名称 → 材料规格 → 效果图
 */
import './sample-page.css'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { submitMaterialApp } from '../../../mock/sample.js'
import {
  listSampleMaterialsFromBrand,
  listSampleSpecsFromBrand,
  listSampleSuppliersFromBrand,
} from '../../../mock/brand.js'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()

const form = reactive({
  use_part: '',
  location_id: '',
  location_ids: [],
  remark: '',
})

const sampleBlock = reactive({
  material_name: '',
  material_spec: '',
  supplier: '',
  effectImages: [],
})

const supplierOptions = computed(() =>
  scopeProjectId.value ? listSampleSuppliersFromBrand(scopeProjectId.value) : [],
)

const materialOptions = computed(() =>
  scopeProjectId.value && sampleBlock.supplier
    ? listSampleMaterialsFromBrand(scopeProjectId.value, sampleBlock.supplier)
    : [],
)

const specOptions = computed(() =>
  scopeProjectId.value && sampleBlock.supplier && sampleBlock.material_name
    ? listSampleSpecsFromBrand(
        scopeProjectId.value,
        sampleBlock.supplier,
        sampleBlock.material_name,
      )
    : [],
)

watch(
  () => sampleBlock.supplier,
  () => {
    sampleBlock.material_name = ''
    sampleBlock.material_spec = ''
  },
)

watch(
  () => sampleBlock.material_name,
  () => {
    sampleBlock.material_spec = ''
  },
)

function emptyCompareRow() {
  return {
    key: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    material_name: '',
    material_spec: '',
    supplier: '',
    effectImages: [],
  }
}

const compareList = ref([emptyCompareRow()])

function compareMaterialOptions(row) {
  if (!scopeProjectId.value || !row.supplier) return []
  return listSampleMaterialsFromBrand(scopeProjectId.value, row.supplier)
}

function compareSpecOptions(row) {
  if (!scopeProjectId.value || !row.supplier || !row.material_name) return []
  return listSampleSpecsFromBrand(scopeProjectId.value, row.supplier, row.material_name)
}

function onCompareSupplierChange(row) {
  row.material_name = ''
  row.material_spec = ''
}

function onCompareMaterialChange(row) {
  row.material_spec = ''
}

function addCompareRow() {
  compareList.value.push(emptyCompareRow())
}

function removeCompareRow(idx) {
  if (compareList.value.length <= 1) {
    compareList.value[0] = emptyCompareRow()
    return
  }
  compareList.value.splice(idx, 1)
}

function toEffectNames(list) {
  return (list || []).map((f) => f.name || f).filter(Boolean)
}

function isCompareRowFilled(row) {
  return !!(
    String(row.material_name || '').trim() ||
    String(row.material_spec || '').trim() ||
    String(row.supplier || '').trim() ||
    toEffectNames(row.effectImages).length
  )
}

function isCompareRowComplete(row) {
  return (
    !!String(row.material_name || '').trim() &&
    !!String(row.material_spec || '').trim() &&
    !!String(row.supplier || '').trim() &&
    toEffectNames(row.effectImages).length >= 1
  )
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.use_part.trim() && !(form.location_ids || []).length) {
    return ElMessage.warning('请选择施工部位')
  }
  if (!sampleBlock.supplier.trim()) return ElMessage.warning('请选择定版定样的供应商')
  if (!sampleBlock.material_name.trim()) return ElMessage.warning('请选择定版定样的材料名称')
  if (!sampleBlock.material_spec.trim()) return ElMessage.warning('请选择定版定样的材料规格')
  const sampleEffects = toEffectNames(sampleBlock.effectImages)
  if (!sampleEffects.length) return ElMessage.warning('请至少上传 1 张定版定样效果图')

  const compare_items = []
  for (let i = 0; i < compareList.value.length; i += 1) {
    const row = compareList.value[i]
    if (!isCompareRowFilled(row)) continue
    if (!isCompareRowComplete(row)) {
      return ElMessage.warning(`比选记录第 ${i + 1} 条请补全供应商、材料名称、规格与效果图`)
    }
    compare_items.push({
      material_name: row.material_name.trim(),
      material_spec: row.material_spec.trim(),
      supplier: row.supplier.trim(),
      effect_images: toEffectNames(row.effectImages),
    })
  }

  const r = submitMaterialApp({
    project_id: scopeProjectId.value,
    material_name: sampleBlock.material_name,
    use_part: form.use_part,
    location_id: form.location_id,
    location_ids: [...(form.location_ids || [])],
    sample_spec: {
      material_spec: sampleBlock.material_spec.trim(),
      supplier: sampleBlock.supplier.trim(),
      effect_images: sampleEffects,
    },
    compare_items,
    remark: form.remark,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`)
  router.push('/qm/sample/material/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 材料定样报审 / 新建</div>
      <h1 class="page-title">新建材料定样报审</h1>
    </div>

    <el-form label-width="112px" class="create-form">
      <el-form-item label="施工部位" required>
        <ConstructionLocationSelect
          v-model:location-id="form.location_id"
          v-model:location-ids="form.location_ids"
          v-model:location-name="form.use_part"
          :project-id="scopeProjectId"
          multiple
          placeholder="可多选施工部位"
        />
      </el-form-item>

      <section class="mod-block">
        <div class="mod-block-head">
          <h2 class="mod-block-title">定版定样</h2>
          <span class="mod-block-tip">先选供应商，再选材料名称与规格（均来自品牌报审已通过单据）</span>
        </div>
        <!-- 定版定样上部：供应商与材料名称相邻；选择顺序 供应商 → 材料 → 规格 -->
        <el-form-item label="供应商" required>
          <el-select
            v-model="sampleBlock.supplier"
            filterable
            clearable
            placeholder="从品牌报审选择供应商"
            style="width: 100%"
            :disabled="!supplierOptions.length"
          >
            <el-option
              v-for="s in supplierOptions"
              :key="s.supplier"
              :label="s.label"
              :value="s.supplier"
            />
          </el-select>
          <p v-if="!supplierOptions.length" class="field-hint">
            本项目暂无已通过的品牌报审，请先完成品牌报审
          </p>
        </el-form-item>
        <el-form-item label="材料名称" required>
          <el-select
            v-model="sampleBlock.material_name"
            filterable
            clearable
            placeholder="请先选择供应商"
            style="width: 100%"
            :disabled="!sampleBlock.supplier"
          >
            <el-option
              v-for="m in materialOptions"
              :key="m.material_id || m.material_name"
              :label="m.material_name"
              :value="m.material_name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="材料规格" required>
          <el-select
            v-model="sampleBlock.material_spec"
            filterable
            clearable
            placeholder="请先选择材料名称"
            style="width: 100%"
            :disabled="!sampleBlock.material_name"
          >
            <el-option
              v-for="s in specOptions"
              :key="s.spec_id || s.spec_model"
              :label="s.spec_model"
              :value="s.spec_model"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="效果图" required>
          <DispatchImageAttachments
            v-model="sampleBlock.effectImages"
            name-prefix="定版效果图"
            :max="9"
            :max-size-mb="5"
          />
        </el-form-item>
      </section>

      <section class="mod-block">
        <div class="mod-block-head">
          <h2 class="mod-block-title">比选记录</h2>
          <span class="mod-block-tip">与定版定样相同：先选供应商，再选材料名称与规格（品牌报审）</span>
        </div>

        <div v-for="(row, idx) in compareList" :key="row.key" class="compare-card">
          <div class="compare-card-head">
            <span class="compare-card-title">比选 {{ idx + 1 }}</span>
            <el-button
              type="danger"
              link
              :icon="Delete"
              :disabled="compareList.length <= 1 && !isCompareRowFilled(row)"
              @click="removeCompareRow(idx)"
            >
              删除
            </el-button>
          </div>
          <el-form-item label="供应商">
            <el-select
              v-model="row.supplier"
              filterable
              clearable
              placeholder="从品牌报审选择供应商"
              style="width: 100%"
              @change="onCompareSupplierChange(row)"
            >
              <el-option
                v-for="s in supplierOptions"
                :key="s.supplier"
                :label="s.label"
                :value="s.supplier"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="材料名称">
            <el-select
              v-model="row.material_name"
              filterable
              clearable
              placeholder="请先选择供应商"
              style="width: 100%"
              :disabled="!row.supplier"
              @change="onCompareMaterialChange(row)"
            >
              <el-option
                v-for="m in compareMaterialOptions(row)"
                :key="m.material_id || m.material_name"
                :label="m.material_name"
                :value="m.material_name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="材料规格">
            <el-select
              v-model="row.material_spec"
              filterable
              clearable
              placeholder="请先选择材料名称"
              style="width: 100%"
              :disabled="!row.material_name"
            >
              <el-option
                v-for="s in compareSpecOptions(row)"
                :key="s.spec_id || s.spec_model"
                :label="s.spec_model"
                :value="s.spec_model"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="效果图">
            <DispatchImageAttachments
              v-model="row.effectImages"
              :name-prefix="`比选${idx + 1}效果图`"
              :max="9"
              :max-size-mb="5"
            />
          </el-form-item>
        </div>

        <div class="compare-add-row">
          <el-button type="primary" plain :icon="Plus" @click="addCompareRow">添加比选</el-button>
        </div>
      </section>

      <el-form-item label="备注">
        <el-input v-model="form.remark" placeholder="选填" />
      </el-form-item>
      <div class="form-actions">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交报审</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.create-form {
  max-width: 760px;
}
.mod-block {
  margin: 8px 0 20px;
  padding: 12px 14px 4px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.mod-block-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 8px;
}
.mod-block-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.mod-block-tip {
  flex: 1;
  font-size: 12px;
  color: #909399;
}
.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #e6a23c;
}
.compare-card {
  margin-bottom: 12px;
  padding: 10px 12px 2px;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  background: #fff;
}
.compare-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.compare-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.compare-add-row {
  margin: 4px 0 12px;
}
.form-actions {
  padding-left: 112px;
  display: flex;
  gap: 8px;
}
</style>

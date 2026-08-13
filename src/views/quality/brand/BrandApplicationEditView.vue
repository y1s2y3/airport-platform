<script setup>
import './brand-page.css'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Document, Box } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  MATERIAL_TYPE,
  createEmptyCandidate,
  listSpecsByMaterial,
  searchActiveBrands,
  searchActiveMaterials,
  submitApplication,
} from '../../../mock/brand.js'
import BrandCandidateAttachBlock from './BrandCandidateAttachBlock.vue'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const form = reactive({
  material_id: '',
  material_name: '',
  material_type: 'material',
  use_part: '',
  location_id: '',
  specs: [{ spec_model: '', material_spec_id: '' }],
  candidates: [createEmptyCandidate(), createEmptyCandidate(), createEmptyCandidate()],
})

const importVisible = ref(false)
const importKw = ref('')
const importPage = ref(1)
const importPageSize = ref(5)
const brandSuggest = ref({})

const imported = computed(() => !!form.material_id)
const importAll = computed(() =>
  scopeProjectId.value ? searchActiveMaterials(importKw.value, scopeProjectId.value) : [],
)
const importTotal = computed(() => importAll.value.length)
const importList = computed(() => {
  const start = (importPage.value - 1) * importPageSize.value
  return importAll.value.slice(start, start + importPageSize.value)
})

watch([importKw, importPageSize], () => {
  importPage.value = 1
})

function openImport() {
  importKw.value = ''
  importPage.value = 1
  importPageSize.value = 5
  importVisible.value = true
}

function applyImport(row) {
  form.material_id = row.material_id
  form.material_name = row.material_name
  form.material_type = row.material_type
  form.specs = listSpecsByMaterial(row.material_id).map((s) => ({
    spec_model: s.spec_model,
    material_spec_id: s.spec_id,
  }))
  if (!form.specs.length) form.specs = [{ spec_model: '', material_spec_id: '' }]
  importVisible.value = false
  ElMessage.success('已从材料库导入（名称/类型只读；本单规格可逐条删除）')
}

function clearImport() {
  form.material_id = ''
  form.material_name = ''
  form.material_type = 'material'
  form.specs = [{ spec_model: '', material_spec_id: '' }]
}

function addSpec() {
  form.specs.push({ spec_model: '', material_spec_id: '' })
}

function removeSpec(idx) {
  if (form.specs.length <= 1) return ElMessage.warning('至少保留 1 条规格')
  form.specs.splice(idx, 1)
}

function addCandidate() {
  form.candidates.push(createEmptyCandidate())
}

function removeCandidate(idx) {
  if (form.candidates.length <= 3) return ElMessage.warning('备选品牌至少 3 条')
  form.candidates.splice(idx, 1)
}

function onBrandInput(idx) {
  const c = form.candidates[idx]
  if (c.brand_lib_id) return
  brandSuggest.value[idx] = searchActiveBrands(c.brand_name, scopeProjectId.value)
}

function pickBrand(idx, brand) {
  const c = form.candidates[idx]
  c.brand_lib_id = brand.brand_lib_id
  c.brand_name = brand.brand_name
  c.manufacturer = brand.manufacturer
  brandSuggest.value[idx] = []
}

function clearBrandLib(idx) {
  form.candidates.splice(idx, 1, createEmptyCandidate())
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  const r = submitApplication({
    project_id: scopeProjectId.value,
    material_id: form.material_id,
    material_name: form.material_name,
    material_type: form.material_type,
    use_part: form.use_part,
    specs: form.specs,
    candidates: form.candidates,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  if (r.warn) ElMessage.warning(r.warn)
  ElMessage.success(`已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`)
  router.push('/qm/brand/applications')
}
</script>

<template>
  <div class="qm-page page-card brand-create">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审申请 / 新建</div>
      <div class="title-row">
        <h1 class="page-title">新增品牌报审</h1>
        <el-tag size="small" effect="plain" type="info">无草稿 · 直接提交</el-tag>
      </div>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
      </p>
    </div>

    <el-form label-width="128px" class="create-form" label-position="right">
      <!-- 材料信息（含本单规格） -->
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Box /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">材料信息</h2>
            </div>
            <p class="section-desc">可从材料库导入或手填；本单规格至少 1 条</p>
          </div>
        </header>

        <div class="section-body">
          <div class="import-bar" :class="{ 'is-imported': imported }">
            <template v-if="imported">
              <div class="import-meta">
                <el-tag type="success" effect="light">已导入材料库</el-tag>
                <span class="import-name">{{ form.material_name }}</span>
                <el-tag size="small" type="info" effect="plain">
                  {{ MATERIAL_TYPE[form.material_type] }}
                </el-tag>
              </div>
              <el-button type="danger" link @click="clearImport">删除导入</el-button>
            </template>
            <template v-else>
              <div class="import-meta">
                <span class="import-placeholder">尚未导入材料库数据</span>
                <span class="hint">导入后名称/类型只读，规格可逐条删除</span>
              </div>
              <el-button type="primary" plain @click="openImport">从材料库导入</el-button>
            </template>
          </div>

          <div class="field-grid">
            <el-form-item label="材料/设备名称" required class="field-span-2">
              <el-input
                v-model="form.material_name"
                :disabled="imported"
                placeholder="请输入材料或设备名称"
                clearable
              />
            </el-form-item>
            <el-form-item label="材料类型" required>
              <el-select
                v-model="form.material_type"
                :disabled="imported"
                placeholder="请选择"
                style="width: 100%"
              >
                <el-option
                  v-for="(label, val) in MATERIAL_TYPE"
                  :key="val"
                  :label="label"
                  :value="val"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="施工部位">
              <ConstructionLocationSelect
                v-model:location-id="form.location_id"
                v-model:location-name="form.use_part"
                :project-id="scopeProjectId"
                placeholder="非必填"
              />
            </el-form-item>
          </div>

          <div class="material-spec-block">
            <div class="material-spec-head">
              <div class="material-spec-title">
                <span>本单规格</span>
                <el-tag size="small" type="warning" effect="plain">至少 1 条</el-tag>
              </div>
              <p class="material-spec-desc">
                {{
                  imported
                    ? '导入规格型号只读；不需要的可逐条删除'
                    : '手填规格型号，可继续添加'
                }}
              </p>
            </div>
            <div class="spec-list">
              <div v-for="(s, idx) in form.specs" :key="idx" class="spec-row">
                <span class="spec-idx">{{ idx + 1 }}</span>
                <el-input
                  v-model="s.spec_model"
                  :disabled="imported && !!s.material_spec_id"
                  placeholder="规格型号，如 C30"
                  class="spec-input"
                />
                <el-tag v-if="s.material_spec_id" size="small" type="info" effect="plain">
                  企业规格
                </el-tag>
                <el-button
                  :icon="Delete"
                  link
                  type="danger"
                  :disabled="form.specs.length <= 1"
                  @click="removeSpec(idx)"
                >
                  删除
                </el-button>
              </div>
              <button
                v-if="!imported"
                type="button"
                class="spec-add-bar"
                @click="addSpec"
              >
                <el-icon class="spec-add-icon"><Plus /></el-icon>
                <span>添加规格</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 备选品牌 -->
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Document /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">备选品牌</h2>
              <el-tag size="small" type="warning" effect="plain">至少 3 条</el-tag>
            </div>
            <p class="section-desc">每个备选可勾选上传附件并填写备注（均非强制）</p>
          </div>
        </header>

        <div class="section-body cand-list">
          <div v-for="(c, idx) in form.candidates" :key="idx" class="cand-card">
            <div class="cand-card-head">
              <div class="cand-card-title">
                <span class="cand-badge">{{ idx + 1 }}</span>
                <span>备选品牌</span>
                <el-tag v-if="c.brand_lib_id" size="small" type="success" effect="light">库选入</el-tag>
              </div>
              <el-button
                v-if="c.brand_lib_id"
                link
                type="danger"
                :icon="Delete"
                @click="clearBrandLib(idx)"
              >
                删除
              </el-button>
              <el-button
                v-else
                link
                type="danger"
                :icon="Delete"
                :disabled="form.candidates.length <= 3"
                @click="removeCandidate(idx)"
              >
                删除
              </el-button>
            </div>

            <div class="cand-fields">
              <el-form-item label="品牌名称" required label-width="88px" class="cand-field">
                <el-input
                  v-model="c.brand_name"
                  :disabled="!!c.brand_lib_id"
                  placeholder="输入可匹配品牌库"
                  clearable
                  @input="onBrandInput(idx)"
                />
              </el-form-item>
              <el-form-item label="生产厂家" required label-width="88px" class="cand-field">
                <el-input
                  v-model="c.manufacturer"
                  :disabled="!!c.brand_lib_id"
                  placeholder="生产厂家"
                  clearable
                />
              </el-form-item>
            </div>

            <div v-if="brandSuggest[idx]?.length" class="suggest">
              <div class="suggest-label">匹配品牌库（点击选入）</div>
              <div
                v-for="b in brandSuggest[idx]"
                :key="b.brand_lib_id"
                class="suggest-item"
                @click="pickBrand(idx, b)"
              >
                <span class="suggest-brand">{{ b.brand_name }}</span>
                <span class="suggest-mfr">{{ b.manufacturer }}</span>
              </div>
            </div>

            <BrandCandidateAttachBlock :candidate="c" editable />
          </div>

          <button type="button" class="cand-add-bar" @click="addCandidate">
            <el-icon class="cand-add-icon"><Plus /></el-icon>
            <span>添加备选</span>
          </button>
        </div>
      </section>

    </el-form>

    <div class="form-footer">
      <el-button @click="router.back()">取消</el-button>
      <el-button type="primary" @click="onSubmit">提交审批</el-button>
    </div>

    <el-dialog v-model="importVisible" title="从材料库导入" width="680px" destroy-on-close>
      <el-input v-model="importKw" clearable placeholder="搜索材料名称（仅启用）" class="mb" />
      <el-table :data="importList" border stripe max-height="360" empty-text="无启用材料">
        <el-table-column prop="material_name" label="材料名称" min-width="160" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="primary" @click="applyImport(row)">导入</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="import-pager">
        <el-pagination
          v-model:current-page="importPage"
          v-model:page-size="importPageSize"
          :total="importTotal"
          :page-sizes="[5, 10, 20]"
          layout="total, sizes, prev, pager, next"
          background
          small
        />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.brand-create {
  gap: 16px;
  padding-bottom: 72px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.page-tip strong {
  color: #1f2329;
  font-weight: 600;
}

.create-form {
  max-width: 960px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
}

.section-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px 12px;
  background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
  border-bottom: 1px solid #f0f2f5;
}

.section-head-main {
  flex: 1;
  min-width: 0;
}

.section-icon {
  margin-top: 2px;
  font-size: 18px;
  color: var(--el-color-primary);
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2329;
  line-height: 1.4;
}

.section-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.section-body {
  padding: 16px 18px 18px;
}

.import-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
}

.import-bar.is-imported {
  background: #f0f9eb;
  border-style: solid;
  border-color: #e1f3d8;
}

.import-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.import-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.import-placeholder {
  font-size: 13px;
  color: #606266;
}

.hint {
  font-size: 12px;
  color: #909399;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
}

.field-span-2 {
  grid-column: 1 / -1;
}

.field-grid :deep(.el-form-item) {
  margin-bottom: 12px;
}

.field-grid :deep(.el-form-item__label) {
  white-space: nowrap;
}

.material-spec-block {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.material-spec-head {
  margin-bottom: 10px;
}

.material-spec-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.material-spec-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.spec-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spec-add-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 10px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #303133;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.spec-add-bar:hover {
  border-color: #c0c4cc;
  background: #fafafa;
  color: #000;
}

.spec-add-bar:active {
  background: #f5f7fa;
}

.spec-add-icon {
  font-size: 15px;
}

.spec-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f2f5;
}

.spec-idx {
  flex: 0 0 24px;
  height: 24px;
  border-radius: 50%;
  background: #ecf5ff;
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spec-input {
  flex: 1;
  max-width: 360px;
}

.cand-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cand-add-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  margin: 0;
  padding: 12px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 10px;
  background: #fff;
  color: #303133;
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.cand-add-bar:hover {
  border-color: #c0c4cc;
  background: #fafafa;
  color: #000;
}

.cand-add-bar:active {
  background: #f5f7fa;
}

.cand-add-icon {
  font-size: 16px;
}

.cand-card {
  padding: 14px 14px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.cand-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.cand-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.cand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.cand-fields {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 4px 12px;
}

.cand-field {
  margin-bottom: 8px;
}

.suggest {
  margin: 0 0 10px;
  border: 1px solid #d9ecff;
  border-radius: 8px;
  background: #f5faff;
  overflow: hidden;
}

.suggest-label {
  padding: 6px 12px;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #e8f3ff;
}

.suggest-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.suggest-item:hover {
  background: #ecf5ff;
}

.suggest-brand {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.suggest-mfr {
  font-size: 12px;
  color: #909399;
}

.form-footer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  max-width: 960px;
  margin-top: 4px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #ebeef5;
  border-radius: 10px;
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.04);
  backdrop-filter: blur(6px);
}

.mb {
  margin-bottom: 12px;
}

.import-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

@media (max-width: 768px) {
  .field-grid,
  .cand-fields {
    grid-template-columns: 1fr;
  }

  .import-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-footer {
    justify-content: stretch;
  }

  .form-footer .el-button {
    flex: 1;
  }
}
</style>

<script setup>
import './brand-page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, Document, Box, UserFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  MATERIAL_TYPE,
  createEmptyCandidate,
  searchLedgerBrands,
  submitApplication,
  resubmitWithdrawnBrand,
  buildCopyPayloadFromRejected,
  buildReEditPayloadFromWithdrawn,
  listBrandProjectUsers,
  resolveDefaultApprovers,
  findBrandProjectUser,
  findApprovedDuplicateMaterialApplications,
  normalizeBrandMaterialName,
} from '../../../mock/brand.js'
import BrandCandidateAttachBlock from './BrandCandidateAttachBlock.vue'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const reEditId = ref(String(route.query.id || ''))
const isReEdit = ref(route.query.reEdit === '1' || route.query.mode === 'resubmit')

const form = reactive({
  material_name: '',
  material_type: 'material',
  use_part: '',
  location_id: '',
  copy_from_application_id: '',
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
  pm_approver_user_id: '',
  pm_approver_name: '',
  candidates: [
    { ...createEmptyCandidate(), is_primary: true },
    createEmptyCandidate(),
    createEmptyCandidate(),
  ],
})

const brandSuggest = ref({})
const copyFromLabel = ref('')
const projectUsers = computed(() => listBrandProjectUsers(scopeProjectId.value))

/** 同项目已通过单材料名重复提示（仅提示，不拦截提交） */
const duplicateMaterialHits = computed(() => {
  if (isHqSelected.value || !scopeProjectId.value) return []
  const name = normalizeBrandMaterialName(form.material_name)
  if (!name) return []
  return findApprovedDuplicateMaterialApplications(scopeProjectId.value, name)
})

const duplicateMaterialTip = computed(() => {
  if (!duplicateMaterialHits.value.length) return ''
  const name = normalizeBrandMaterialName(form.material_name)
  const ids = duplicateMaterialHits.value.map((h) => h.application_id).join('、')
  return `本项目已有材料/设备名称为「${name}」的已通过报审单（${ids}），仍可继续提交。`
})

/** 第 1 条固定为主选，其后均为备选（无需勾选） */
function syncPrimaryByPosition() {
  form.candidates.forEach((c, i) => {
    c.is_primary = i === 0
  })
}

function applyApproverFields(src) {
  form.supervisor_approver_user_id = src.supervisor_approver_user_id || ''
  form.supervisor_approver_name = src.supervisor_approver_name || ''
  form.pm_approver_user_id = src.pm_approver_user_id || ''
  form.pm_approver_name = src.pm_approver_name || ''
}

function applyDefaultApprovers() {
  if (isHqSelected.value || !scopeProjectId.value) {
    applyApproverFields({})
    return
  }
  applyApproverFields(resolveDefaultApprovers(scopeProjectId.value))
}

function onApproverChange(role) {
  if (role === 'supervisor') {
    const u = findBrandProjectUser(form.supervisor_approver_user_id)
    form.supervisor_approver_name = u?.name || ''
  } else if (role === 'pm') {
    const u = findBrandProjectUser(form.pm_approver_user_id)
    form.pm_approver_name = u?.name || ''
  }
}

onMounted(() => {
  if (isReEdit.value && reEditId.value) {
    const payload = buildReEditPayloadFromWithdrawn(reEditId.value)
    if (!payload) {
      ElMessage.warning('无法重新申报，请确认该单为已撤回状态')
      isReEdit.value = false
      reEditId.value = ''
      applyDefaultApprovers()
      return
    }
    form.material_name = payload.material_name
    form.material_type = payload.material_type
    form.use_part = payload.use_part
    applyApproverFields(payload)
    form.candidates = payload.candidates.length
      ? payload.candidates
      : [
          { ...createEmptyCandidate(), is_primary: true },
          createEmptyCandidate(),
          createEmptyCandidate(),
        ]
    syncPrimaryByPosition()
    ElMessage.success(`已载入撤回单 ${reEditId.value}，修改后提交将回到待审批`)
    return
  }

  const copyFrom = String(route.query.copyFrom || '')
  if (copyFrom) {
    const payload = buildCopyPayloadFromRejected(copyFrom)
    if (!payload) {
      ElMessage.warning('无法从该单复制，请确认其为已驳回报审单')
      applyDefaultApprovers()
      return
    }
    form.material_name = payload.material_name
    form.material_type = payload.material_type
    form.use_part = payload.use_part
    form.copy_from_application_id = payload.copy_from_application_id
    applyApproverFields(payload)
    form.candidates = payload.candidates.length
      ? payload.candidates
      : [
          { ...createEmptyCandidate(), is_primary: true },
          createEmptyCandidate(),
          createEmptyCandidate(),
        ]
    syncPrimaryByPosition()
    copyFromLabel.value = copyFrom
    ElMessage.success(`已从驳回单 ${copyFrom} 预填，请核对后提交`)
    return
  }

  applyDefaultApprovers()
})

function addCandidate() {
  form.candidates.push(createEmptyCandidate())
  syncPrimaryByPosition()
}

function removeCandidate(idx) {
  const c = form.candidates[idx]
  if (c.ledger_id) {
    form.candidates.splice(idx, 1, createEmptyCandidate())
    syncPrimaryByPosition()
    return
  }
  if (form.candidates.length <= 3) return ElMessage.warning('须 1 主选 + 至少 2 备选')
  form.candidates.splice(idx, 1)
  syncPrimaryByPosition()
}

function onBrandInput(idx) {
  const c = form.candidates[idx]
  if (c.ledger_id) return
  brandSuggest.value[idx] = searchLedgerBrands(c.brand_name, scopeProjectId.value)
}

function pickLedgerBrand(idx, item) {
  const c = form.candidates[idx]
  c.ledger_id = item.ledger_id
  c.brand_name = item.brand_name
  c.manufacturer = item.manufacturer
  brandSuggest.value[idx] = []
}

function clearLedgerPick(idx) {
  form.candidates.splice(idx, 1, createEmptyCandidate())
  syncPrimaryByPosition()
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  syncPrimaryByPosition()
  const payload = {
    project_id: scopeProjectId.value,
    material_name: form.material_name,
    material_type: form.material_type,
    use_part: form.use_part,
    copy_from_application_id: form.copy_from_application_id,
    supervisor_approver_user_id: form.supervisor_approver_user_id,
    supervisor_approver_name: form.supervisor_approver_name,
    pm_approver_user_id: form.pm_approver_user_id,
    pm_approver_name: form.pm_approver_name,
    candidates: form.candidates,
  }
  const r =
    isReEdit.value && reEditId.value
      ? resubmitWithdrawnBrand(reEditId.value, payload)
      : submitApplication(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  if (duplicateMaterialHits.value.length) {
    ElMessage.warning(duplicateMaterialTip.value)
  }
  ElMessage.success(
    isReEdit.value
      ? `已重新申报 ${r.data.application_id}，状态已回到待审批`
      : copyFromLabel.value
        ? `已重新申报 ${r.data.application_id}，已进入个人中心待办（待监理审）`
        : `已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`,
  )
  router.push('/qm/brand/applications')
}
</script>

<template>
  <div class="qm-page page-card brand-create">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审申请 / {{ isReEdit || copyFromLabel ? '重新申报' : '新建' }}</div>
      <div class="title-row">
        <h1 class="page-title">{{ isReEdit || copyFromLabel ? '重新申报品牌报审' : '新增品牌报审' }}</h1>
        <el-tag v-if="isReEdit && reEditId" size="small" type="success" effect="light">
          原单 {{ reEditId }}
        </el-tag>
        <el-tag v-if="copyFromLabel" size="small" type="warning" effect="light">
          复制自 {{ copyFromLabel }}
        </el-tag>
      </div>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
      </p>
    </div>

    <el-form label-width="128px" class="create-form" label-position="right">
      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Box /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">材料/设备信息</h2>
            </div>
          </div>
        </header>

        <div class="section-body">
          <div class="field-grid">
            <el-form-item label="材料/设备名称" required class="field-span-2">
              <el-input
                v-model="form.material_name"
                placeholder="请输入材料或设备名称"
                clearable
                aria-label="请输入材料或设备名称"
              />
              <el-alert
                v-if="duplicateMaterialTip"
                class="material-dup-alert"
                type="warning"
                :closable="false"
                show-icon
                :title="duplicateMaterialTip"
              />
            </el-form-item>
            <el-form-item label="类型" required>
              <el-select v-model="form.material_type" placeholder="请选择" style="width: 100%" aria-label="请选择">
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
        </div>
      </section>

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><Document /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">报审品牌</h2>
            </div>
          </div>
        </header>

        <div class="section-body cand-list">
          <div v-for="(c, idx) in form.candidates" :key="idx" class="cand-card">
            <div class="cand-card-head">
              <div class="cand-card-title">
                <span class="cand-badge">{{ idx + 1 }}</span>
                <el-tag v-if="idx === 0" size="small" type="success" effect="plain">主选品牌</el-tag>
                <el-tag v-else size="small" type="info" effect="plain">备选品牌</el-tag>
                <el-tag v-if="c.ledger_id" size="small" type="success" effect="light">台账选入</el-tag>
              </div>
              <el-button
                v-if="c.ledger_id"
                link
                type="danger"
                :icon="Delete"
                @click="clearLedgerPick(idx)"
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
                  :disabled="!!c.ledger_id"
                  placeholder="输入品牌名称后，将自动搜索项目已有品牌"
                  clearable
                  @input="onBrandInput(idx)" aria-label="输入品牌名称后，将自动搜索项目已有品牌"/>
              </el-form-item>
              <el-form-item label="生产厂家" required label-width="88px" class="cand-field">
                <el-input
                  v-model="c.manufacturer"
                  :disabled="!!c.ledger_id"
                  placeholder="生产厂家"
                  clearable aria-label="生产厂家"/>
              </el-form-item>
            </div>

            <div v-if="brandSuggest[idx]?.length && !c.ledger_id" class="suggest">
              <div class="suggest-label">台账联想（点击选入）</div>
              <div
                v-for="b in brandSuggest[idx]"
                :key="b.ledger_id"
                class="suggest-item"
                @click="pickLedgerBrand(idx, b)"
              >
                <span class="suggest-brand">{{ b.brand_name }}</span>
                <span class="suggest-mfr">{{ b.manufacturer }}</span>
                <span v-if="b.material_name" class="suggest-mfr">材料：{{ b.material_name }}</span>
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

      <section class="form-section">
        <header class="section-head">
          <el-icon class="section-icon"><UserFilled /></el-icon>
          <div class="section-head-main">
            <div class="section-title-row">
              <h2 class="section-title">审批人配置</h2>
            </div>
          </div>
        </header>

        <div class="section-body">
          <div class="field-grid">
            <el-form-item label="监理单位审批" required>
              <el-select
                v-model="form.supervisor_approver_user_id"
                placeholder="请选择监理单位审批人"
                filterable
                clearable
                style="width: 100%"
                aria-label="请选择监理单位审批人"
                @change="onApproverChange('supervisor')"
              >
                <el-option
                  v-for="u in projectUsers"
                  :key="u.user_id"
                  :label="`${u.name}（${u.org}）`"
                  :value="u.user_id"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="项目经理审批" required>
              <el-select
                v-model="form.pm_approver_user_id"
                placeholder="请选择项目经理审批人"
                filterable
                clearable
                style="width: 100%"
                aria-label="请选择项目经理审批人"
                @change="onApproverChange('pm')"
              >
                <el-option
                  v-for="u in projectUsers"
                  :key="u.user_id"
                  :label="`${u.name}（${u.org}）`"
                  :value="u.user_id"
                />
              </el-select>
            </el-form-item>
          </div>
        </div>
      </section>
    </el-form>

    <div class="form-footer">
      <el-button @click="router.back()">取消</el-button>
      <el-button type="primary" @click="onSubmit">提交审批</el-button>
    </div>
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

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 16px;
}

.field-span-2 {
  grid-column: 1 / -1;
}

.material-dup-alert {
  margin-top: 8px;
}

.field-grid :deep(.el-form-item) {
  margin-bottom: 12px;
}

.field-grid :deep(.el-form-item__label) {
  white-space: nowrap;
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
  grid-template-columns: 1fr;
  gap: 4px 0;
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

@media (max-width: 768px) {
  .field-grid,
  .cand-fields {
    grid-template-columns: 1fr;
  }

  .form-footer {
    justify-content: stretch;
  }

  .form-footer .el-button {
    flex: 1;
  }
}
</style>

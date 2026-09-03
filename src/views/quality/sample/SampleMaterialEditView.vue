<script setup>
/**
 * 新建材料设备定样报审：对齐省统表 GD-C1-346
 * 品牌选自品牌台账；生产厂家手填；使用部位（实体分解树单选）自动带出单位工程
 */
import './sample-page.css'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildCopyPayloadFromRejectedMaterial,
  submitMaterialApp,
  listBrandProjectUsers,
  resolveDefaultApprovers,
  findBrandProjectUser,
  formatBrandProjectUserLabel,
  MATERIAL_TYPE,
} from '../../../mock/sample.js'
import { listSampleBrandOptionsFromLedger } from '../../../mock/brand.js'
import {
  listEntityPartSelectTree,
  resolveUnitSubunitFromWbsNode,
  getEntityNodePathLabel,
  getUnitSubunitLabel,
} from '../../../mock/constructionLocation.js'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const syncingPrefill = ref(false)

const form = reactive({
  sample_name: '',
  sample_date: '',
  spec: '',
  material_type: 'material',
  brand_name: '',
  manufacturer: '',
  use_part_wbs_id: '',
  use_part: '',
  unit_wbs_id: '',
  unit_name: '',
  remark: '',
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
  pm_approver_user_id: '',
  pm_approver_name: '',
})

const samplePhotos = ref([])
const signFiles = ref([])
const certificateFiles = ref([])

const projectUsers = computed(() =>
  scopeProjectId.value ? listBrandProjectUsers(scopeProjectId.value) : [],
)

const brandOptions = computed(() =>
  scopeProjectId.value ? listSampleBrandOptionsFromLedger(scopeProjectId.value) : [],
)

const partTree = computed(() =>
  scopeProjectId.value ? listEntityPartSelectTree(scopeProjectId.value) : [],
)

function applyApproverFields(src = {}) {
  form.supervisor_approver_user_id = src.supervisor_approver_user_id || ''
  form.supervisor_approver_name = src.supervisor_approver_name || ''
  form.pm_approver_user_id = src.pm_approver_user_id || ''
  form.pm_approver_name = src.pm_approver_name || ''
}

function applyDefaultApprovers() {
  if (!scopeProjectId.value) {
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

/** 选择使用部位（实体分解节点）→ 自动带出单位工程 */
function onPartChange(wbsId) {
  if (syncingPrefill.value) return
  form.use_part_wbs_id = wbsId || ''
  if (!wbsId) {
    form.use_part = ''
    form.unit_wbs_id = ''
    form.unit_name = ''
    return
  }
  form.use_part = getEntityNodePathLabel(wbsId)
  const hit = resolveUnitSubunitFromWbsNode(wbsId)
  form.unit_wbs_id = hit.unit_wbs_id || ''
  form.unit_name = hit.unit_name || ''
}

function onPickFile(uploadFile, targetRef, label) {
  const file = uploadFile.raw || uploadFile
  if (!file) return false
  if (file.size > 30 * 1024 * 1024) {
    ElMessage.warning('单个文件不超过 30MB')
    return false
  }
  const name = file.name || `${label}-${targetRef.value.length + 1}`
  if (targetRef.value.some((f) => f.name === name)) {
    ElMessage.warning('同名文件已存在')
    return false
  }
  targetRef.value = [...targetRef.value, { name, url: '#' }]
  ElMessage.success(`已添加：${name}`)
  return false
}

function removeFile(targetRef, idx) {
  targetRef.value = targetRef.value.filter((_, i) => i !== idx)
}

function applyCopyPayload(data) {
  syncingPrefill.value = true
  form.sample_name = data.sample_name || data.material_name || ''
  form.sample_date = data.sample_date || ''
  form.spec = data.spec || data.indicator_desc || ''
  form.material_type = data.material_type === 'equipment' ? 'equipment' : 'material'
  form.brand_name = data.brand_name || ''
  form.manufacturer = data.manufacturer || data.supplier || ''
  form.use_part_wbs_id = data.use_part_wbs_id || data.location_id || ''
  form.use_part =
    data.use_part ||
    (form.use_part_wbs_id ? getEntityNodePathLabel(form.use_part_wbs_id) : '')
  form.unit_wbs_id = data.unit_wbs_id || ''
  form.unit_name = data.unit_name || getUnitSubunitLabel(form.unit_wbs_id) || ''
  if (form.use_part_wbs_id && !form.unit_wbs_id) {
    const hit = resolveUnitSubunitFromWbsNode(form.use_part_wbs_id)
    form.unit_wbs_id = hit.unit_wbs_id || ''
    form.unit_name = hit.unit_name || ''
  }
  form.remark = data.remark || ''
  applyApproverFields(data)
  samplePhotos.value = (data.sample_photos || data.effect_images || []).map((f) => ({
    name: f.name || f,
    url: f.url || '#',
  }))
  signFiles.value = (data.sign_files || data.approval_files || []).map((f) => ({
    name: f.name || f,
    url: f.url || '#',
  }))
  certificateFiles.value = (data.certificate_files || []).map((f) => ({
    name: f.name || f,
    url: f.url || '#',
  }))
  queueMicrotask(() => {
    syncingPrefill.value = false
  })
}

onMounted(() => {
  if (!copyFromId.value) {
    applyDefaultApprovers()
    return
  }
  const r = buildCopyPayloadFromRejectedMaterial(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    router.replace('/qm/sample/material/applications/edit')
    return
  }
  applyCopyPayload(r.data)
})

watch(scopeProjectId, () => {
  if (!copyFromId.value) applyDefaultApprovers()
})

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.sample_name.trim()) return ElMessage.warning('请填写样品名称')
  if (!form.sample_date) return ElMessage.warning('请选择送样日期')
  if (!form.spec.trim()) return ElMessage.warning('请填写规格（或技术参数）')
  if (!form.material_type || !['material', 'equipment'].includes(form.material_type)) {
    return ElMessage.warning('请选择材料类型')
  }
  if (!form.brand_name.trim()) return ElMessage.warning('请选择品牌')
  if (!form.manufacturer.trim()) return ElMessage.warning('请填写生产厂家')
  if (!form.use_part_wbs_id) return ElMessage.warning('请选择使用部位')
  if (!form.unit_wbs_id && !form.unit_name.trim()) {
    return ElMessage.warning('未能带出单位工程，请重新选择使用部位')
  }
  if (!samplePhotos.value.length) return ElMessage.warning('请至少上传 1 张样品照片')
  if (!signFiles.value.length) {
    return ElMessage.warning('请至少上传 1 份材料设备送样定板报审签字附件')
  }
  if (!certificateFiles.value.length) {
    return ElMessage.warning('请至少上传 1 份样品出厂质量证明文件')
  }
  if (!form.supervisor_approver_user_id) return ElMessage.warning('请选择监理审批人')
  if (!form.pm_approver_user_id) return ElMessage.warning('请选择项目经理审批人')

  const payload = {
    project_id: scopeProjectId.value,
    sample_name: form.sample_name.trim(),
    material_name: form.sample_name.trim(),
    material_type: form.material_type,
    sample_date: form.sample_date,
    spec: form.spec.trim(),
    indicator_desc: form.spec.trim(),
    brand_name: form.brand_name,
    manufacturer: form.manufacturer.trim(),
    supplier: form.manufacturer.trim(),
    use_part_wbs_id: form.use_part_wbs_id,
    use_part: form.use_part || getEntityNodePathLabel(form.use_part_wbs_id),
    unit_wbs_id: form.unit_wbs_id,
    unit_name: form.unit_name || getUnitSubunitLabel(form.unit_wbs_id),
    location_id: form.use_part_wbs_id,
    location_ids: form.use_part_wbs_id ? [form.use_part_wbs_id] : [],
    sample_photos: samplePhotos.value.map((f) => ({ name: f.name || f, url: f.url || '#' })),
    effect_images: samplePhotos.value.map((f) => ({ name: f.name || f, url: f.url || '#' })),
    sign_files: signFiles.value.map((f) => ({ name: f.name, url: f.url || '#' })),
    approval_files: signFiles.value.map((f) => ({ name: f.name, url: f.url || '#' })),
    certificate_files: certificateFiles.value.map((f) => ({ name: f.name, url: f.url || '#' })),
    copy_from_application_id: copyFromId.value,
    remark: form.remark,
    supervisor_approver_user_id: form.supervisor_approver_user_id,
    supervisor_approver_name: form.supervisor_approver_name,
    pm_approver_user_id: form.pm_approver_user_id,
    pm_approver_name: form.pm_approver_name,
  }
  const r = submitMaterialApp(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.application_id}，已进入个人中心待办（审批中）`)
  router.push('/qm/sample/material/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 定样审批 / 新建</div>
      <div class="title-row">
        <h1 class="page-title">新建材料设备定样报审</h1>
        <el-tag v-if="copyFromId" size="small" type="warning" effect="plain">
          从驳回单 {{ copyFromId }} 重新申报
        </el-tag>
      </div>
    </div>

    <el-form label-width="200px" class="create-form">
      <section class="mod-block">
        <div class="mod-block-head">
          <h2 class="mod-block-title">材料设备定样</h2>
          <span class="mod-block-tip">
            品牌选自品牌台账；生产厂家手填；先选使用部位，自动带出单位工程
          </span>
        </div>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="样品名称" required>
              <el-input
                v-model="form.sample_name"
                maxlength="100"
                show-word-limit
                placeholder="请填写样品名称"
                aria-label="样品名称"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送样日期" required>
              <el-date-picker
                v-model="form.sample_date"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="请选择送样日期"
                style="width: 100%"
                aria-label="送样日期"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="规格（或技术参数）" required>
          <el-input
            v-model="form.spec"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
            placeholder="描述规格、技术参数、色号、厚度等"
            aria-label="规格（或技术参数）"
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="材料类型" required>
              <el-select
                v-model="form.material_type"
                placeholder="请选择材料类型"
                style="width: 100%"
                aria-label="材料类型"
              >
                <el-option
                  v-for="(label, val) in MATERIAL_TYPE"
                  :key="val"
                  :label="label"
                  :value="val"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌" required>
              <el-select
                v-model="form.brand_name"
                filterable
                clearable
                placeholder="从品牌台账选择品牌"
                style="width: 100%"
                :disabled="!brandOptions.length"
                aria-label="从品牌台账选择品牌"
              >
                <el-option
                  v-for="b in brandOptions"
                  :key="b.brand_name"
                  :label="b.label"
                  :value="b.brand_name"
                />
              </el-select>
              <p v-if="!brandOptions.length" class="field-hint">
                本项目暂无已通过的品牌报审，请先完成品牌报审
              </p>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="生产厂家" required>
          <el-input
            v-model="form.manufacturer"
            maxlength="200"
            show-word-limit
            placeholder="请填写生产厂家"
            aria-label="生产厂家"
          />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="使用部位" required>
              <el-tree-select
                v-model="form.use_part_wbs_id"
                :data="partTree"
                filterable
                clearable
                check-strictly
                node-key="id"
                :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
                :render-after-expand="false"
                default-expand-all
                placeholder="从实体工程分解树单选"
                style="width: 100%"
                :disabled="!partTree.length"
                aria-label="使用部位"
                @change="onPartChange"
              />
              <p v-if="!partTree.length" class="field-hint">本项目暂无实体工程分解节点</p>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位工程" required>
              <el-input
                :model-value="form.unit_name || '选择使用部位后自动带出'"
                readonly
                aria-label="单位工程"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="样品照片" required>
          <DispatchImageAttachments
            v-model="samplePhotos"
            name-prefix="样品照片"
            :max="9"
            :max-size-mb="5"
          />
        </el-form-item>

        <el-form-item label="材料设备送样定板报审签字附件" required>
          <div class="approval-files">
            <el-upload
              :show-file-list="false"
              :before-upload="(f) => onPickFile(f, signFiles, '定板报审签字附件')"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            >
              <el-button :icon="UploadFilled">上传签字附件</el-button>
            </el-upload>
            <ul v-if="signFiles.length" class="file-list">
              <li v-for="(f, idx) in signFiles" :key="f.name">
                <span>{{ f.name }}</span>
                <el-button link type="danger" @click="removeFile(signFiles, idx)">删除</el-button>
              </li>
            </ul>
            <p v-else class="field-hint">至少上传 1 份签字附件（对齐省统表 GD-C1-346）</p>
          </div>
        </el-form-item>

        <el-form-item label="样品出厂质量证明文件" required>
          <div class="approval-files">
            <el-upload
              :show-file-list="false"
              :before-upload="(f) => onPickFile(f, certificateFiles, '出厂质量证明')"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            >
              <el-button :icon="UploadFilled">上传质量证明文件</el-button>
            </el-upload>
            <ul v-if="certificateFiles.length" class="file-list">
              <li v-for="(f, idx) in certificateFiles" :key="f.name">
                <span>{{ f.name }}</span>
                <el-button link type="danger" @click="removeFile(certificateFiles, idx)">
                  删除
                </el-button>
              </li>
            </ul>
            <p v-else class="field-hint">至少上传 1 份样品出厂质量证明文件</p>
          </div>
        </el-form-item>

        <el-form-item label="备注" class="remark-item">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            placeholder="选填"
            aria-label="备注"
          />
        </el-form-item>
      </section>

      <section class="form-section">
        <h2 class="section-title">审批人配置</h2>
        <div class="approver-grid">
          <el-form-item label="监理审批" required>
            <el-select
              v-model="form.supervisor_approver_user_id"
              placeholder="请选择监理审批人"
              filterable
              clearable
              style="width: 100%"
              aria-label="请选择监理审批人"
              @change="onApproverChange('supervisor')"
            >
              <el-option
                v-for="u in projectUsers"
                :key="u.user_id"
                :label="formatBrandProjectUserLabel(u)"
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
                :key="`pm-${u.user_id}`"
                :label="formatBrandProjectUserLabel(u)"
                :value="u.user_id"
              />
            </el-select>
          </el-form-item>
        </div>
      </section>

      <div class="form-actions">
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交报审</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.create-form {
  max-width: 920px;
}
.create-form :deep(.el-form-item) {
  margin-bottom: 20px;
}
.mod-block {
  margin: 8px 0 16px;
  padding: 14px 16px 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.mod-block-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin-bottom: 12px;
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
.remark-item {
  margin-bottom: 20px;
}
.form-section {
  margin: 0 0 20px;
  padding: 14px 16px 8px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.section-title {
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}
.approver-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 28px;
  row-gap: 4px;
}
.approver-grid :deep(.el-form-item) {
  margin-bottom: 16px;
}
.approver-grid :deep(.el-form-item__label) {
  white-space: nowrap;
}
.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #e6a23c;
}
.approval-files {
  width: 100%;
}
.file-list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.file-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: #606266;
}
.form-actions {
  padding-left: 200px;
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>

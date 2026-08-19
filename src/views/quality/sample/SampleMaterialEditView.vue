<script setup>
/**
 * 新建材料定样 V2.0：供应商→材料名称（品牌台账）；指标说明+效果图+审批文件
 */
import './sample-page.css'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  buildCopyPayloadFromRejectedMaterial,
  buildReEditPayloadFromWithdrawnMaterial,
  submitMaterialApp,
  resubmitWithdrawnSample,
} from '../../../mock/sample.js'
import {
  listSampleMaterialsFromBrand,
  listSampleSuppliersFromBrand,
} from '../../../mock/brand.js'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'
import DispatchImageAttachments from '../../../coc/components/DispatchImageAttachments.vue'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const reEditId = ref(String(route.query.id || ''))
const isReEdit = ref(route.query.reEdit === '1' || route.query.mode === 'resubmit')

const form = reactive({
  use_part: '',
  location_id: '',
  location_ids: [],
  material_name: '',
  brand_name: '',
  supplier: '',
  indicator_desc: '',
  remark: '',
})

const effectImages = ref([])
const approvalFiles = ref([])

const supplierOptions = computed(() =>
  scopeProjectId.value ? listSampleSuppliersFromBrand(scopeProjectId.value) : [],
)

const materialOptions = computed(() =>
  scopeProjectId.value && form.supplier
    ? listSampleMaterialsFromBrand(scopeProjectId.value, form.supplier)
    : [],
)

watch(
  () => form.supplier,
  (val, oldVal) => {
    // 首次从空赋值（复制/重编预填）不清空已写入的材料
    if (!oldVal) return
    if (val === oldVal) return
    form.material_name = ''
    form.brand_name = ''
  },
)

watch(
  () => form.material_name,
  (name) => {
    const hit = materialOptions.value.find((m) => m.material_name === name)
    form.brand_name = hit?.brand_name || ''
  },
)

function toEffectNames(list) {
  return (list || []).map((f) => f.name || f).filter(Boolean)
}

function onPickApproval(uploadFile) {
  const file = uploadFile.raw || uploadFile
  if (!file) return false
  if (file.size > 30 * 1024 * 1024) {
    ElMessage.warning('单个文件不超过 30MB')
    return false
  }
  const name = file.name || `审批文件-${approvalFiles.value.length + 1}`
  if (approvalFiles.value.some((f) => f.name === name)) {
    ElMessage.warning('同名文件已存在')
    return false
  }
  approvalFiles.value = [...approvalFiles.value, { name, url: '#' }]
  ElMessage.success(`已添加：${name}`)
  return false
}

function removeApprovalFile(idx) {
  approvalFiles.value = approvalFiles.value.filter((_, i) => i !== idx)
}

function applyCopyPayload(data) {
  form.use_part = data.use_part || ''
  form.location_id = data.location_id || ''
  form.location_ids = Array.isArray(data.location_ids) ? [...data.location_ids] : []
  form.material_name = data.material_name || ''
  form.brand_name = data.brand_name || ''
  form.supplier = data.supplier || ''
  form.indicator_desc = data.indicator_desc || ''
  form.remark = data.remark || ''
  effectImages.value = (data.effect_images || []).map((f) => ({
    name: f.name,
    url: f.url || '#',
  }))
  approvalFiles.value = (data.approval_files || []).map((f) => ({
    name: f.name,
    url: f.url || '#',
  }))
}

onMounted(() => {
  if (isReEdit.value && reEditId.value) {
    const r = buildReEditPayloadFromWithdrawnMaterial(reEditId.value)
    if (!r.ok) {
      ElMessage.error(r.msg)
      isReEdit.value = false
      reEditId.value = ''
      return
    }
    applyCopyPayload(r.data)
    ElMessage.success(`已载入撤回单 ${reEditId.value}，修改后提交将回到待审批`)
    return
  }
  if (!copyFromId.value) return
  const r = buildCopyPayloadFromRejectedMaterial(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    router.replace('/qm/sample/material/applications/edit')
    return
  }
  applyCopyPayload(r.data)
})

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.use_part.trim() && !(form.location_ids || []).length) {
    return ElMessage.warning('请选择施工部位')
  }
  if (!form.supplier.trim()) return ElMessage.warning('请选择供应商')
  if (!form.material_name.trim()) return ElMessage.warning('请选择材料名称')
  if (!form.indicator_desc.trim()) return ElMessage.warning('请填写材料指标说明')
  const effects = toEffectNames(effectImages.value)
  if (!effects.length) return ElMessage.warning('请至少上传 1 张效果图')
  if (!approvalFiles.value.length) return ElMessage.warning('请至少上传 1 份审批文件')

  const payload = {
    project_id: scopeProjectId.value,
    material_name: form.material_name,
    brand_name: form.brand_name,
    supplier: form.supplier,
    use_part: form.use_part,
    location_id: form.location_id,
    location_ids: [...(form.location_ids || [])],
    indicator_desc: form.indicator_desc,
    effect_images: effectImages.value.map((f) => ({ name: f.name || f, url: f.url || '#' })),
    approval_files: approvalFiles.value.map((f) => ({ name: f.name, url: f.url || '#' })),
    copy_from_application_id: copyFromId.value,
    remark: form.remark,
  }
  const r =
    isReEdit.value && reEditId.value
      ? resubmitWithdrawnSample('material', reEditId.value, payload)
      : submitMaterialApp(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(
    isReEdit.value
      ? `已重新提交 ${r.data.application_id}，状态已回到待审批`
      : `已提交 ${r.data.application_id}，已进入个人中心待办（待监理审）`,
  )
  router.push('/qm/sample/material/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 材料定样报审 / {{ isReEdit ? '重新编辑' : '新建' }}</div>
      <div class="title-row">
        <h1 class="page-title">{{ isReEdit ? '重新编辑材料定样' : '新建材料定样报审' }}</h1>
        <el-tag v-if="isReEdit && reEditId" size="small" type="success" effect="plain">
          原单 {{ reEditId }}
        </el-tag>
        <el-tag v-if="copyFromId" size="small" type="warning" effect="plain">
          从驳回单 {{ copyFromId }} 复制
        </el-tag>
      </div>
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
          <h2 class="mod-block-title">材料定样</h2>
          <span class="mod-block-tip">先选供应商（厂家），再选材料名称（品牌台账级联，无规格）</span>
        </div>
        <el-form-item label="供应商" required>
          <el-select
            v-model="form.supplier"
            filterable
            clearable
            placeholder="从品牌台账选择供应商"
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
            v-model="form.material_name"
            filterable
            clearable
            placeholder="请先选择供应商"
            style="width: 100%"
            :disabled="!form.supplier"
          >
            <el-option
              v-for="m in materialOptions"
              :key="m.material_id || m.material_name"
              :label="m.material_name"
              :value="m.material_name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="材料指标说明" required>
          <el-input
            v-model="form.indicator_desc"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
            placeholder="描述材料性能指标、色号、厚度等"
          />
        </el-form-item>
        <el-form-item label="效果图" required>
          <DispatchImageAttachments
            v-model="effectImages"
            name-prefix="定样效果图"
            :max="9"
            :max-size-mb="5"
          />
        </el-form-item>
        <el-form-item label="审批文件" required>
          <div class="approval-files">
            <el-upload
              :show-file-list="false"
              :before-upload="onPickApproval"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            >
              <el-button :icon="UploadFilled">上传审批文件</el-button>
            </el-upload>
            <ul v-if="approvalFiles.length" class="file-list">
              <li v-for="(f, idx) in approvalFiles" :key="f.name">
                <span>{{ f.name }}</span>
                <el-button link type="danger" @click="removeApprovalFile(idx)">删除</el-button>
              </li>
            </ul>
            <p v-else class="field-hint">至少上传 1 份审批文件（如定样审批表）</p>
          </div>
        </el-form-item>
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
.approval-files {
  width: 100%;
}
.file-list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.file-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
  color: #606266;
}
.form-actions {
  padding-left: 112px;
  display: flex;
  gap: 8px;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>

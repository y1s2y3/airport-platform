<script setup>
import './mat-page.css'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, UploadFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  ENTRY_TYPE_LABEL,
  buildCopyPayloadFromRejectedMat,
  buildReEditPayloadFromWithdrawnMat,
  createDefaultUnpackItems,
  listApprovedSamples,
  searchEntryBrands,
  submitEntry,
  resubmitWithdrawnEntry,
} from '../../../mock/mat.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const reEditId = ref(String(route.query.id || ''))
const isReEdit = ref(route.query.reEdit === '1' || route.query.mode === 'resubmit')
const entryType = ref(
  route.query.entry_type === 'equipment' ? 'equipment' : 'material',
)

const form = reactive({
  sample_application_id: '',
  ledger_id: '',
  brand_name: '',
  manufacturer: '',
  material_name: '',
  equipment_name: '',
  model: '',
  use_part: '',
  location_id: '',
  location_ids: [],
  supplier: '',
  quantity: '',
  unit: entryType.value === 'equipment' ? '台' : '件',
  serial_no: '',
  cert_file: '',
  inspect_file: '',
  photo_file: '',
  inspect_result_checked: false,
  inspect_result_file: '',
})

const brandKeyword = ref('')
const brandLockedFromSample = ref(false)

function emptyLine() {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    material_name: form.material_name || '',
    material_spec: '',
    quantity: '',
    unit: '件',
    waybill_no: '',
    batch_no: '',
  }
}

const entryLines = ref([emptyLine()])
const unpackItems = ref(createDefaultUnpackItems())

const samples = computed(() =>
  scopeProjectId.value ? listApprovedSamples(scopeProjectId.value) : [],
)

const brandOptions = computed(() => {
  if (!scopeProjectId.value) return []
  return searchEntryBrands(brandKeyword.value, scopeProjectId.value, {
    materialType: entryType.value === 'equipment' ? 'equipment' : 'material',
  })
})

const pageTitle = computed(() => {
  if (isReEdit.value || copyFromId.value) return '重新申报进场申请'
  return '进场申报'
})

const ledgerLocked = computed(() => brandLockedFromSample.value || !!form.ledger_id)

function syncLineMaterialNames() {
  const name = form.material_name || ''
  entryLines.value.forEach((row) => {
    row.material_name = name
  })
}

watch(entryType, (t) => {
  form.unit = t === 'equipment' ? '台' : '件'
  if (t === 'equipment') unpackItems.value = createDefaultUnpackItems()
  if (!brandLockedFromSample.value && form.ledger_id) {
    const hit = searchEntryBrands('', scopeProjectId.value).find((b) => b.ledger_id === form.ledger_id)
    const expect = t === 'equipment' ? 'equipment' : 'material'
    if (hit && (hit.material_type || 'material') !== expect) {
      form.ledger_id = ''
      form.brand_name = ''
      form.manufacturer = ''
    }
  }
})

watch(
  () => form.sample_application_id,
  (id) => {
    brandLockedFromSample.value = false
    if (!id) return
    const s = samples.value.find((x) => x.sample_application_id === id || x.sample_id === id)
    if (!s) return
    form.material_name = s.material_name || ''
    form.use_part = s.use_part || ''
    form.brand_name = s.brand_name || ''
    form.manufacturer = s.manufacturer || ''
    brandLockedFromSample.value = true
    const brands = searchEntryBrands('', scopeProjectId.value, {
      materialType: entryType.value === 'equipment' ? 'equipment' : 'material',
    })
    const hit =
      brands.find(
        (b) =>
          b.brand_name === s.brand_name &&
          b.manufacturer === s.manufacturer &&
          b.material_name === s.material_name,
      ) ||
      brands.find((b) => b.brand_name === s.brand_name && b.manufacturer === s.manufacturer)
    form.ledger_id = hit?.ledger_id || ''
    syncLineMaterialNames()
  },
)

watch(
  () => form.ledger_id,
  (id) => {
    if (brandLockedFromSample.value) return
    if (!id) {
      form.brand_name = ''
      form.manufacturer = ''
      return
    }
    const hit =
      brandOptions.value.find((b) => b.ledger_id === id) ||
      searchEntryBrands('', scopeProjectId.value).find((b) => b.ledger_id === id)
    if (!hit) return
    form.brand_name = hit.brand_name
    form.manufacturer = hit.manufacturer
    if (entryType.value === 'material') {
      form.material_name = hit.material_name || ''
      syncLineMaterialNames()
    }
    if (entryType.value === 'equipment') {
      form.equipment_name = hit.material_name || ''
    }
  },
)

watch(
  () => form.material_name,
  () => syncLineMaterialNames(),
)

function applyCopyPayload(data) {
  entryType.value = data.entry_type || 'material'
  form.sample_application_id = data.sample_application_id || ''
  form.ledger_id = data.ledger_id || ''
  form.brand_name = data.brand_name || ''
  form.manufacturer = data.manufacturer || ''
  form.material_name = data.material_name || ''
  form.equipment_name = data.equipment_name || ''
  form.model = data.model || ''
  form.use_part = data.use_part || ''
  form.location_id = data.location_id || ''
  form.location_ids = Array.isArray(data.location_ids) ? [...data.location_ids] : []
  form.supplier = data.supplier || ''
  form.quantity = data.quantity != null ? String(data.quantity) : ''
  form.unit = data.unit || (entryType.value === 'equipment' ? '台' : '件')
  form.serial_no = data.serial_no || ''
  form.cert_file = data.cert_file || ''
  form.inspect_file = data.inspect_file || ''
  form.photo_file = data.photo_file || ''
  form.inspect_result_checked = !!data.inspect_result_checked
  form.inspect_result_file = data.inspect_result_file || ''
  if (data.line_items?.length) {
    entryLines.value = data.line_items.map((l) => ({
      key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      material_name: l.material_name || data.material_name || '',
      material_spec: l.material_spec || '',
      quantity: l.quantity != null ? String(l.quantity) : '',
      unit: l.unit || '件',
      waybill_no: l.waybill_no || '',
      batch_no: l.batch_no || '',
    }))
  }
  if (data.unpack_items?.length) {
    unpackItems.value = data.unpack_items.map((i) => ({ ...i }))
  }
}

onMounted(() => {
  if (route.query.entry_type === 'equipment') entryType.value = 'equipment'
  if (isReEdit.value && reEditId.value) {
    const r = buildReEditPayloadFromWithdrawnMat(reEditId.value)
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
  const r = buildCopyPayloadFromRejectedMat(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    router.replace(`/qm/mat/applications/edit?entry_type=${entryType.value}`)
    return
  }
  applyCopyPayload(r.data)
})

function addEntryLine() {
  entryLines.value.push(emptyLine())
}

function removeEntryLine(idx) {
  if (entryLines.value.length <= 1) {
    entryLines.value[0] = emptyLine()
    return
  }
  entryLines.value.splice(idx, 1)
}

function onPickFile(field, uploadFile) {
  const file = uploadFile.raw || uploadFile
  if (!file) return false
  if (file.size > 30 * 1024 * 1024) {
    ElMessage.warning('单个文件不超过 30MB')
    return false
  }
  form[field] = file.name || `${field}-${Date.now()}`
  ElMessage.success(`已上传：${form[field]}`)
  return false
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.ledger_id && (!form.brand_name.trim() || !form.manufacturer.trim())) {
    return ElMessage.warning('请选择品牌台账中的品牌')
  }
  if (!String(form.supplier || '').trim()) return ElMessage.warning('请填写供应商')

  const base = {
    project_id: scopeProjectId.value,
    entry_type: entryType.value,
    sample_application_id: form.sample_application_id,
    ledger_id: form.ledger_id,
    brand_name: form.brand_name,
    manufacturer: form.manufacturer,
    use_part: form.use_part,
    location_id: form.location_id,
    location_ids: [...(form.location_ids || [])],
    supplier: form.supplier,
    cert_file: form.cert_file,
    inspect_file: form.inspect_file,
    photo_file: form.photo_file,
    inspect_result_checked: form.inspect_result_checked,
    inspect_result_file: form.inspect_result_file,
    copy_from_entry_id: copyFromId.value,
  }

  if (entryType.value === 'equipment') {
    if (!form.equipment_name.trim()) return ElMessage.warning('请填写设备名称')
    if (!form.quantity || Number(form.quantity) <= 0) {
      return ElMessage.warning('请填写有效数量')
    }
    const submitPayload = {
      ...base,
      equipment_name: form.equipment_name,
      model: form.model,
      quantity: Number(form.quantity),
      unit: form.unit,
      serial_no: form.serial_no,
      unpack_items: unpackItems.value,
    }
    const r =
      isReEdit.value && reEditId.value
        ? resubmitWithdrawnEntry(reEditId.value, submitPayload)
        : submitEntry(submitPayload)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success(
      isReEdit.value
        ? `已重新申报 ${r.data.entry_id}，状态已回到待审批`
        : copyFromId.value
          ? `已重新申报 ${r.data.entry_id}，进入待审批`
          : `已提交 ${r.data.entry_id}，进入待审批`,
    )
    router.push('/qm/mat/applications')
    return
  }

  const line_items = []
  for (let i = 0; i < entryLines.value.length; i += 1) {
    const row = entryLines.value[i]
    const material_name = String(row.material_name || form.material_name || '').trim()
    const material_spec = String(row.material_spec || '').trim()
    const quantity = String(row.quantity || '').trim()
    const unit = String(row.unit || '').trim()
    if (!material_name) return ElMessage.warning(`进场明细第 ${i + 1} 条请填写材料名称`)
    if (!material_spec) return ElMessage.warning(`进场明细第 ${i + 1} 条请填写材料规格`)
    if (!quantity || Number(quantity) <= 0) {
      return ElMessage.warning(`进场明细第 ${i + 1} 条请填写有效数量`)
    }
    if (!unit) return ElMessage.warning(`进场明细第 ${i + 1} 条请填写单位`)
    line_items.push({
      material_name,
      material_spec,
      quantity: Number(quantity),
      unit,
      waybill_no: String(row.waybill_no || '').trim(),
      batch_no: String(row.batch_no || '').trim(),
    })
  }

  const submitPayload = {
    ...base,
    material_name: form.material_name || line_items[0].material_name,
    line_items,
  }
  const r =
    isReEdit.value && reEditId.value
      ? resubmitWithdrawnEntry(reEditId.value, submitPayload)
      : submitEntry(submitPayload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(
    isReEdit.value
      ? `已重新申报 ${r.data.entry_id}，状态已回到待审批`
      : copyFromId.value
        ? `已重新申报 ${r.data.entry_id}，进入待审批`
        : `已提交 ${r.data.entry_id}，进入待审批`,
  )
  router.push('/qm/mat/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料设备进场管理 / 进场申请 / {{ isReEdit || copyFromId ? '重新申报' : '新建' }}</div>
      <div class="title-row">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-tag v-if="isReEdit && reEditId" size="small" type="success" effect="plain">
          原单 {{ reEditId }}
        </el-tag>
        <el-tag v-if="copyFromId" size="small" type="warning" effect="plain">
          从驳回单 {{ copyFromId }} 复制
        </el-tag>
      </div>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
        · 品牌须选自品牌台账（与台账一致） · 定样可选关联
      </p>
    </div>

    <el-form label-width="120px" class="mat-entry-form">
      <section class="form-section">
        <h2 class="section-title">进场类型</h2>
        <el-radio-group v-model="entryType">
          <el-radio value="material">{{ ENTRY_TYPE_LABEL.material }}</el-radio>
          <el-radio value="equipment">{{ ENTRY_TYPE_LABEL.equipment }}</el-radio>
        </el-radio-group>
      </section>

      <section class="form-section">
        <h2 class="section-title">品牌与定样</h2>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="关联定样">
              <el-select
                v-model="form.sample_application_id"
                filterable
                clearable
                placeholder="可选：已通过定样"
                style="width: 100%"
              >
                <el-option
                  v-for="s in samples"
                  :key="s.sample_application_id || s.sample_id"
                  :label="`${s.sample_application_id || s.sample_id} · ${s.material_name}`"
                  :value="s.sample_application_id || s.sample_id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌台账" required>
              <el-select
                v-model="form.ledger_id"
                filterable
                remote
                :remote-method="(q) => (brandKeyword = q)"
                clearable
                placeholder="搜索：品牌 / 厂家 / 材料"
                style="width: 100%"
                :disabled="brandLockedFromSample"
              >
                <el-option
                  v-for="b in brandOptions"
                  :key="b.ledger_id"
                  :label="b.label || `${b.brand_name} · ${b.manufacturer} · ${b.material_name}`"
                  :value="b.ledger_id"
                />
              </el-select>
              <p v-if="brandLockedFromSample" class="field-hint">已选定样，品牌与材料只读带出</p>
              <p v-else class="field-hint">同一品牌可对应多条材料，请按「品牌·厂家·材料」选择对应台账行</p>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌">
              <el-input v-model="form.brand_name" disabled placeholder="由台账带出" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产厂家">
              <el-input v-model="form.manufacturer" disabled placeholder="由台账带出" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" required>
              <el-input v-model="form.supplier" placeholder="请填写供应商" />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section v-if="entryType === 'material'" class="form-section">
        <h2 class="section-title">材料进场明细</h2>
        <el-form-item label="材料名称">
          <el-input
            v-model="form.material_name"
            :disabled="ledgerLocked"
            :placeholder="ledgerLocked ? '由定样/台账带出' : '可手填或由定样/台账带出'"
          />
        </el-form-item>
        <div v-for="(row, idx) in entryLines" :key="row.key" class="entry-line-card">
          <div class="entry-line-head">
            <span class="entry-line-title">明细 {{ idx + 1 }}</span>
            <el-button
              type="danger"
              link
              :icon="Delete"
              :disabled="entryLines.length <= 1"
              @click="removeEntryLine(idx)"
            >
              删除
            </el-button>
          </div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="材料规格" required>
                <el-input v-model="row.material_spec" placeholder="如 C30 / SBS-3mm" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数量" required>
                <el-input v-model="row.quantity" placeholder="数量" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="单位" required>
                <el-input v-model="row.unit" placeholder="单位" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="运单号">
                <el-input v-model="row.waybill_no" placeholder="选填" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="批次号">
                <el-input v-model="row.batch_no" placeholder="选填" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <div class="entry-line-add">
          <el-button type="primary" plain :icon="Plus" @click="addEntryLine">新增明细</el-button>
        </div>
      </section>

      <section v-else class="form-section">
        <h2 class="section-title">设备信息</h2>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="设备名称" required>
              <el-input
                v-model="form.equipment_name"
                :disabled="ledgerLocked"
                :placeholder="ledgerLocked ? '由台账带出' : '设备名称'"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="型号">
              <el-input v-model="form.model" placeholder="型号规格" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="数量" required>
              <el-input v-model="form.quantity" placeholder="数量" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="单位" required>
              <el-input v-model="form.unit" placeholder="台/套" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="序列号">
              <el-input v-model="form.serial_no" placeholder="选填" />
            </el-form-item>
          </el-col>
        </el-row>
        <h3 class="sub-title">开箱清单</h3>
        <el-table :data="unpackItems" border stripe size="small">
          <el-table-column prop="label" label="检查项" min-width="140" />
          <el-table-column label="是否合格" width="100">
            <template #default="{ row }">
              <el-checkbox v-model="row.ok" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="160">
            <template #default="{ row }">
              <el-input v-model="row.remark" placeholder="选填" size="small" />
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="form-section">
        <h2 class="section-title">附件（三件套必填）</h2>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="合格证" required>
              <el-upload
                :show-file-list="false"
                :before-upload="(f) => onPickFile('cert_file', f)"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              >
                <el-button :icon="UploadFilled">上传</el-button>
              </el-upload>
              <span class="muted" style="margin-left: 8px">{{ form.cert_file || '未上传' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="质检报告" required>
              <el-upload
                :show-file-list="false"
                :before-upload="(f) => onPickFile('inspect_file', f)"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              >
                <el-button :icon="UploadFilled">上传</el-button>
              </el-upload>
              <span class="muted" style="margin-left: 8px">{{ form.inspect_file || '未上传' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="现场照片" required>
              <el-upload
                :show-file-list="false"
                :before-upload="(f) => onPickFile('photo_file', f)"
                accept=".jpg,.jpeg,.png,.webp,.gif"
              >
                <el-button :icon="UploadFilled">上传</el-button>
              </el-upload>
              <span class="muted" style="margin-left: 8px">{{ form.photo_file || '未上传' }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="送检结果">
              <el-checkbox v-model="form.inspect_result_checked">勾选后上传（非必填）</el-checkbox>
              <template v-if="form.inspect_result_checked">
                <el-upload
                  class="inline-upload"
                  :show-file-list="false"
                  :before-upload="(f) => onPickFile('inspect_result_file', f)"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                >
                  <el-button style="margin-left: 12px" :icon="UploadFilled">上传</el-button>
                </el-upload>
                <span class="muted" style="margin-left: 8px">{{
                  form.inspect_result_file || '未上传'
                }}</span>
              </template>
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <div class="op-bar">
        <el-button @click="router.push('/qm/mat/applications')">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交进场</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.mat-entry-form :deep(.el-form-item) {
  width: 100%;
}
.section-title {
  margin: 0 0 8px;
}
.sub-title {
  margin: 12px 0 8px;
  font-size: 14px;
}
.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #e6a23c;
}
.entry-line-card {
  margin-bottom: 12px;
  padding: 12px 14px 4px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafbfc;
}
.entry-line-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.entry-line-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.entry-line-add {
  margin: 4px 0 8px;
}
.inline-upload {
  display: inline-block;
  vertical-align: middle;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>

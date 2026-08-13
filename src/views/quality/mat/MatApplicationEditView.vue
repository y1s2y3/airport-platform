<script setup>
import './mat-page.css'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, UploadFilled } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  getRejectedEntryForReopen,
  listApprovedSamples,
  submitEntry,
} from '../../../mock/mat.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const relatedRejectId = ref(String(route.query.relatedRejectId || ''))

const form = reactive({
  sample_id: '',
  material_name: '',
  use_part: '',
  location_id: '',
  location_ids: [],
  brand_name: '',
  manufacturer: '',
  supplier: '',
  cert_file: '',
  inspect_file: '',
  photo_file: '',
  inspect_result_checked: false,
  inspect_result_file: '',
})

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

/** 进场信息多模块，默认一条 */
const entryLines = ref([emptyLine()])

const samples = computed(() =>
  scopeProjectId.value ? listApprovedSamples(scopeProjectId.value) : [],
)

const pageTitle = computed(() =>
  relatedRejectId.value ? '重开材料进场申请' : '新增材料进场',
)

function syncLineMaterialNames() {
  const name = form.material_name || ''
  entryLines.value.forEach((row) => {
    row.material_name = name
  })
}

watch(
  () => form.sample_id,
  (id) => {
    if (!id) {
      form.material_name = ''
      form.use_part = ''
      form.location_id = ''
      form.location_ids = []
      form.brand_name = ''
      form.manufacturer = ''
      syncLineMaterialNames()
      return
    }
    const s = samples.value.find((x) => x.sample_id === id)
    if (!s) return
    form.material_name = s.material_name || ''
    form.use_part = s.use_part || ''
    form.location_id = s.location_id || (Array.isArray(s.location_ids) ? s.location_ids[0] : '') || ''
    form.location_ids = Array.isArray(s.location_ids)
      ? [...s.location_ids]
      : form.location_id
        ? [form.location_id]
        : []
    form.brand_name = s.brand_name || ''
    form.manufacturer = s.manufacturer || ''
    syncLineMaterialNames()
  },
)

watch(
  () => form.material_name,
  () => {
    syncLineMaterialNames()
  },
)

onMounted(() => {
  if (!relatedRejectId.value) return
  const r = getRejectedEntryForReopen(relatedRejectId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    relatedRejectId.value = ''
    router.replace('/qm/mat/applications/edit')
    return
  }
  const origin = r.data
  form.sample_id = origin.sample_id || ''
  form.supplier = origin.supplier || ''
  form.cert_file = origin.cert_file || ''
  form.inspect_file = origin.inspect_file || ''
  form.photo_file = origin.photo_file || ''
  form.inspect_result_checked = !!origin.inspect_result_checked
  form.inspect_result_file = origin.inspect_result_file || ''
  const lines = Array.isArray(origin.line_items) && origin.line_items.length
    ? origin.line_items
    : [
        {
          material_name: origin.material_name,
          material_spec: origin.material_spec || '',
          quantity: origin.quantity,
          unit: origin.unit,
          waybill_no: origin.waybill_no || '',
          batch_no: origin.batch_no || '',
        },
      ]
  entryLines.value = lines.map((l) => ({
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    material_name: l.material_name || origin.material_name || '',
    material_spec: l.material_spec || '',
    quantity: l.quantity != null ? String(l.quantity) : '',
    unit: l.unit || '件',
    waybill_no: l.waybill_no || '',
    batch_no: l.batch_no || '',
  }))
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
  const name = file.name || `${field}-${Date.now()}`
  form[field] = name
  ElMessage.success(`已上传：${name}`)
  return false
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }

  const line_items = []
  for (let i = 0; i < entryLines.value.length; i += 1) {
    const row = entryLines.value[i]
    const material_name = String(row.material_name || form.material_name || '').trim()
    const material_spec = String(row.material_spec || '').trim()
    const quantity = String(row.quantity || '').trim()
    const unit = String(row.unit || '').trim()
    const waybill_no = String(row.waybill_no || '').trim()
    const batch_no = String(row.batch_no || '').trim()
    if (!material_name) {
      return ElMessage.warning(`进场信息第 ${i + 1} 条请先关联定样`)
    }
    if (!material_spec) return ElMessage.warning(`进场信息第 ${i + 1} 条请填写材料规格`)
    if (!quantity || Number(quantity) <= 0) {
      return ElMessage.warning(`进场信息第 ${i + 1} 条请填写有效数量`)
    }
    if (!unit) return ElMessage.warning(`进场信息第 ${i + 1} 条请填写单位`)
    line_items.push({
      material_name,
      material_spec,
      quantity: Number(quantity),
      unit,
      waybill_no,
      batch_no,
    })
  }

  if (!form.sample_id) return ElMessage.warning('请关联已通过定样')
  if (!String(form.supplier || '').trim()) return ElMessage.warning('请填写供应商')

  const r = submitEntry({
    project_id: scopeProjectId.value,
    sample_id: form.sample_id,
    material_name: form.material_name || line_items[0].material_name,
    use_part: form.use_part,
    location_id: form.location_id,
    location_ids: [...(form.location_ids || [])],
    brand_name: form.brand_name,
    manufacturer: form.manufacturer,
    supplier: form.supplier,
    line_items,
    cert_file: form.cert_file,
    inspect_file: form.inspect_file,
    photo_file: form.photo_file,
    inspect_result_checked: form.inspect_result_checked,
    inspect_result_file: form.inspect_result_file,
    related_reject_id: relatedRejectId.value,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.entry_id}，进入审核中`)
  router.push('/qm/mat/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料进场管理 / 材料进场申请 / {{ relatedRejectId ? '重开' : '新建' }}</div>
      <div class="title-row">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-tag v-if="relatedRejectId" size="small" type="warning" effect="plain">
          关联驳回原单 {{ relatedRejectId }}
        </el-tag>
        <el-tag v-else size="small" effect="plain" type="info">无草稿 · 直接提交</el-tag>
      </div>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
        · 选定样后品牌只读 · 同一定样可多次进场
      </p>
    </div>

    <el-form label-width="120px" class="mat-entry-form">
      <section class="form-section">
        <h2 class="section-title">定样与品牌</h2>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="关联定样" required>
              <el-select
                v-model="form.sample_id"
                filterable
                clearable
                placeholder="选择已通过定样"
                style="width: 100%"
              >
                <el-option
                  v-for="s in samples"
                  :key="s.sample_id"
                  :label="`${s.sample_id} · ${s.material_name} · ${s.brand_name}`"
                  :value="s.sample_id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="材料名称" required>
              <el-input
                v-model="form.material_name"
                disabled
                placeholder="由关联定样带出"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="施工部位">
              <el-input
                :model-value="form.use_part || ''"
                disabled
                placeholder="由关联定样带出"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌" required>
              <el-input
                v-model="form.brand_name"
                disabled
                placeholder="由关联定样带出"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产厂家">
              <el-input
                v-model="form.manufacturer"
                disabled
                placeholder="由关联定样带出"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" required>
              <el-input v-model="form.supplier" placeholder="请填写供应商" />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section class="form-section">
        <h2 class="section-title">进场信息</h2>

        <div v-for="(row, idx) in entryLines" :key="row.key" class="entry-line-card">
          <div class="entry-line-head">
            <span class="entry-line-title">进场明细 {{ idx + 1 }}</span>
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
              <el-form-item label="材料名称" required>
                <el-input
                  :model-value="row.material_name || form.material_name || ''"
                  disabled
                  placeholder="由定样带出"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="材料规格" required>
                <el-input
                  v-model="row.material_spec"
                  placeholder="如：C30 / SBS-3mm"
                  maxlength="120"
                />
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
                <el-input v-model="row.waybill_no" placeholder="选填" maxlength="80" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="批次号">
                <el-input v-model="row.batch_no" placeholder="选填" maxlength="80" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="entry-line-add">
          <el-button type="primary" plain :icon="Plus" @click="addEntryLine">新增进场明细</el-button>
        </div>
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
@media (max-width: 768px) {
  .mat-entry-form :deep(.el-col) {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>

<script setup>
/**
 * APP · 进场申报（附件一律拍照）
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  ENTRY_TYPE_LABEL,
  buildCopyPayloadFromRejectedMat,
  buildReEditPayloadFromWithdrawnMat,
  createDefaultUnpackItems,
  listApprovedSamples,
  searchEntryBrands,
  submitEntry,
  resubmitWithdrawnEntry,
} from '../../mock/mat.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const reEditId = ref(String(route.query.id || ''))
const isReEdit = ref(route.query.reEdit === '1' || route.query.mode === 'resubmit')
const entryType = ref(route.query.entry_type === 'equipment' ? 'equipment' : 'material')

const form = reactive({
  sample_application_id: '',
  ledger_id: '',
  brand_name: '',
  manufacturer: '',
  material_name: '',
  equipment_name: '',
  model: '',
  use_part: '',
  supplier: '',
  quantity: '',
  unit: entryType.value === 'equipment' ? '台' : '件',
  serial_no: '',
  material_spec: '',
  cert_file: '',
  inspect_file: '',
  photo_file: '',
  inspect_result_checked: false,
  inspect_result_file: '',
})

const photoPreview = reactive({
  cert_file: '',
  inspect_file: '',
  photo_file: '',
  inspect_result_file: '',
})

const unpackItems = ref(createDefaultUnpackItems())

const pageTitle = computed(() => {
  if (isReEdit.value || copyFromId.value) return '重新申报进场'
  return '进场申报'
})

const samples = computed(() =>
  scopeProjectId.value ? listApprovedSamples(scopeProjectId.value) : [],
)

const brandOptions = computed(() => {
  if (!scopeProjectId.value) return []
  return searchEntryBrands('', scopeProjectId.value, {
    materialType: entryType.value === 'equipment' ? 'equipment' : 'material',
  })
})

function applyPayload(data) {
  entryType.value = data.entry_type === 'equipment' ? 'equipment' : 'material'
  form.sample_application_id = data.sample_application_id || ''
  form.ledger_id = data.ledger_id || ''
  form.brand_name = data.brand_name || ''
  form.manufacturer = data.manufacturer || ''
  form.material_name = data.material_name || ''
  form.equipment_name = data.equipment_name || ''
  form.model = data.model || ''
  form.use_part = data.use_part || ''
  form.supplier = data.supplier || ''
  form.quantity = data.quantity != null ? String(data.quantity) : ''
  form.unit = data.unit || (entryType.value === 'equipment' ? '台' : '件')
  form.serial_no = data.serial_no || ''
  form.material_spec =
    data.material_spec ||
    (Array.isArray(data.line_items) && data.line_items[0]?.material_spec) ||
    ''
  form.cert_file = data.cert_file || ''
  form.inspect_file = data.inspect_file || ''
  form.photo_file = data.photo_file || ''
  form.inspect_result_checked = !!data.inspect_result_checked
  form.inspect_result_file = data.inspect_result_file || ''
  if (data.unpack_items?.length) {
    unpackItems.value = data.unpack_items.map((i) => ({ ...i }))
  }
}

onMounted(() => {
  if (isReEdit.value && reEditId.value) {
    const r = buildReEditPayloadFromWithdrawnMat(reEditId.value)
    if (!r.ok) {
      ElMessage.error(r.msg)
      isReEdit.value = false
      reEditId.value = ''
      return
    }
    applyPayload(r.data)
    ElMessage.success(`已载入撤回单 ${reEditId.value}`)
    return
  }
  if (!copyFromId.value) return
  const r = buildCopyPayloadFromRejectedMat(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    return
  }
  applyPayload(r.data)
  ElMessage.success(`已从驳回单 ${copyFromId.value} 预填`)
})

watch(entryType, (t) => {
  if (isReEdit.value || copyFromId.value) return
  form.unit = t === 'equipment' ? '台' : '件'
  form.ledger_id = ''
  form.brand_name = ''
  form.manufacturer = ''
  if (t === 'equipment') unpackItems.value = createDefaultUnpackItems()
})

watch(
  () => form.ledger_id,
  (id) => {
    if (!id) {
      form.brand_name = ''
      form.manufacturer = ''
      return
    }
    const hit = brandOptions.value.find((b) => b.ledger_id === id)
    if (!hit) return
    form.brand_name = hit.brand_name
    form.manufacturer = hit.manufacturer
    if (entryType.value === 'material') form.material_name = hit.material_name || ''
    else form.equipment_name = hit.material_name || ''
  },
)

watch(
  () => form.sample_application_id,
  (id) => {
    if (!id) return
    const s = samples.value.find((x) => x.sample_application_id === id || x.sample_id === id)
    if (!s) return
    form.material_name = s.material_name || form.material_name
    form.use_part = s.use_part || form.use_part
    form.brand_name = s.brand_name || ''
    form.manufacturer = s.manufacturer || ''
    const hit =
      brandOptions.value.find(
        (b) =>
          b.brand_name === s.brand_name &&
          b.manufacturer === s.manufacturer &&
          b.material_name === s.material_name,
      ) ||
      brandOptions.value.find(
        (b) => b.brand_name === s.brand_name && b.manufacturer === s.manufacturer,
      )
    form.ledger_id = hit?.ledger_id || form.ledger_id
  },
)

function takePhoto(field, label) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'environment'
  input.onchange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const name = `拍照-${label}-${Date.now()}.jpg`
    form[field] = name
    photoPreview[field] = URL.createObjectURL(file)
    ElMessage.success(`已拍照：${label}`)
  }
  input.click()
}

function clearPhoto(field) {
  form[field] = ''
  if (photoPreview[field]) {
    URL.revokeObjectURL(photoPreview[field])
    photoPreview[field] = ''
  }
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.ledger_id) return ElMessage.warning('请选择品牌台账')
  if (!form.supplier.trim()) return ElMessage.warning('请填写供应商')
  if (!form.cert_file) return ElMessage.warning('请拍照上传合格证')
  if (!form.inspect_file) return ElMessage.warning('请拍照上传质检报告')
  if (!form.photo_file) return ElMessage.warning('请拍照上传现场照片')

  const base = {
    project_id: scopeProjectId.value,
    entry_type: entryType.value,
    sample_application_id: form.sample_application_id,
    ledger_id: form.ledger_id,
    brand_name: form.brand_name,
    manufacturer: form.manufacturer,
    use_part: form.use_part,
    supplier: form.supplier,
    cert_file: form.cert_file,
    inspect_file: form.inspect_file,
    photo_file: form.photo_file,
    inspect_result_checked: form.inspect_result_checked,
    inspect_result_file: form.inspect_result_file,
    copy_from_entry_id: copyFromId.value,
  }

  let payload
  if (entryType.value === 'equipment') {
    if (!form.equipment_name.trim()) return ElMessage.warning('请确认设备名称')
    if (!form.quantity || Number(form.quantity) <= 0) return ElMessage.warning('请填写有效数量')
    payload = {
      ...base,
      equipment_name: form.equipment_name,
      model: form.model,
      quantity: Number(form.quantity),
      unit: form.unit,
      serial_no: form.serial_no,
      unpack_items: unpackItems.value,
    }
  } else {
    if (!form.material_name.trim()) return ElMessage.warning('请确认材料名称')
    if (!form.material_spec.trim()) return ElMessage.warning('请填写材料规格')
    if (!form.quantity || Number(form.quantity) <= 0) return ElMessage.warning('请填写有效数量')
    if (!form.unit.trim()) return ElMessage.warning('请填写单位')
    payload = {
      ...base,
      material_name: form.material_name,
      line_items: [
        {
          material_name: form.material_name,
          material_spec: form.material_spec,
          quantity: Number(form.quantity),
          unit: form.unit,
          waybill_no: '',
          batch_no: '',
        },
      ],
    }
  }

  const r =
    isReEdit.value && reEditId.value
      ? resubmitWithdrawnEntry(reEditId.value, payload)
      : submitEntry(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(
    isReEdit.value
      ? `已重新申报 ${r.data.entry_id}，状态已回到待审批`
      : copyFromId.value
        ? `已重新申报 ${r.data.entry_id}`
        : `已提交 ${r.data.entry_id}`,
  )
  router.push('/mobile/mat/entry')
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button type="button" class="mb" @click="goBack">‹</button>
      <h1 class="mt">{{ pageTitle }}</h1>
    </header>

    <div class="form-body">
      <div v-if="isHqSelected" class="tip-banner">请先切换到具体项目后再申报</div>
      <div v-else class="tip-banner muted">{{ scopeProjectLabel }} · 所有附件仅支持拍照</div>

      <section class="form-section">
        <div class="fs-title">进场类型</div>
        <div class="form-tags">
          <button
            v-for="(label, val) in ENTRY_TYPE_LABEL"
            :key="val"
            type="button"
            class="tag-btn"
            :class="{ active: entryType === val }"
            @click="entryType = val"
          >
            {{ label }}
          </button>
        </div>
      </section>

      <section class="form-section">
        <div class="fs-title">品牌与定样</div>
        <div class="form-row">
          <span class="form-label">关联定样</span>
          <select v-model="form.sample_application_id" class="form-input">
            <option value="">不关联（可选）</option>
            <option
              v-for="s in samples"
              :key="s.sample_application_id || s.sample_id"
              :value="s.sample_application_id || s.sample_id"
            >
              {{ s.sample_application_id || s.sample_id }} · {{ s.material_name }}
            </option>
          </select>
        </div>
        <div class="form-row">
          <span class="form-label">品牌台账<span class="required-mark">*</span></span>
          <select v-model="form.ledger_id" class="form-input">
            <option value="" disabled>请选择品牌·厂家·材料</option>
            <option v-for="b in brandOptions" :key="b.ledger_id" :value="b.ledger_id">
              {{ b.label || `${b.brand_name} · ${b.material_name}` }}
            </option>
          </select>
        </div>
        <div class="form-row">
          <span class="form-label">品牌</span>
          <input class="form-input" :value="form.brand_name" disabled placeholder="台账带出" />
        </div>
        <div class="form-row">
          <span class="form-label">厂家</span>
          <input class="form-input" :value="form.manufacturer" disabled placeholder="台账带出" />
        </div>
        <div class="form-row">
          <span class="form-label">供应商<span class="required-mark">*</span></span>
          <input v-model="form.supplier" class="form-input" placeholder="请填写供应商" />
        </div>
        <div class="form-row">
          <span class="form-label">施工部位</span>
          <input v-model="form.use_part" class="form-input" placeholder="选填" />
        </div>
      </section>

      <section v-if="entryType === 'material'" class="form-section">
        <div class="fs-title">材料明细</div>
        <div class="form-row">
          <span class="form-label">材料名称<span class="required-mark">*</span></span>
          <input v-model="form.material_name" class="form-input" disabled placeholder="台账带出" />
        </div>
        <div class="form-row">
          <span class="form-label">规格<span class="required-mark">*</span></span>
          <input v-model="form.material_spec" class="form-input" placeholder="如 C30 / SBS-3mm" />
        </div>
        <div class="form-row">
          <span class="form-label">数量<span class="required-mark">*</span></span>
          <input v-model="form.quantity" class="form-input" type="number" placeholder="数量" />
        </div>
        <div class="form-row">
          <span class="form-label">单位<span class="required-mark">*</span></span>
          <input v-model="form.unit" class="form-input" placeholder="单位" />
        </div>
      </section>

      <section v-else class="form-section">
        <div class="fs-title">设备信息</div>
        <div class="form-row">
          <span class="form-label">设备名称<span class="required-mark">*</span></span>
          <input v-model="form.equipment_name" class="form-input" disabled placeholder="台账带出" />
        </div>
        <div class="form-row">
          <span class="form-label">型号</span>
          <input v-model="form.model" class="form-input" placeholder="选填" />
        </div>
        <div class="form-row">
          <span class="form-label">数量<span class="required-mark">*</span></span>
          <input v-model="form.quantity" class="form-input" type="number" placeholder="数量" />
        </div>
        <div class="form-row">
          <span class="form-label">单位</span>
          <input v-model="form.unit" class="form-input" />
        </div>
        <div class="form-row">
          <span class="form-label">出厂编号</span>
          <input v-model="form.serial_no" class="form-input" placeholder="选填" />
        </div>
        <div class="unpack">
          <div class="unpack-title">开箱清单</div>
          <label v-for="item in unpackItems" :key="item.key" class="unpack-item">
            <input v-model="item.ok" type="checkbox" />
            <span>{{ item.label }}</span>
          </label>
        </div>
      </section>

      <section class="form-section">
        <div class="fs-title">附件（拍照）</div>
        <div v-for="slot in [
          { field: 'cert_file', label: '合格证', required: true },
          { field: 'inspect_file', label: '质检报告', required: true },
          { field: 'photo_file', label: '现场照片', required: true },
        ]" :key="slot.field" class="form-row">
          <span class="form-label">
            {{ slot.label }}
            <span v-if="slot.required" class="required-mark">*</span>
          </span>
          <div class="photo-group">
            <div v-if="form[slot.field]" class="photo-box">
              <img v-if="photoPreview[slot.field]" :src="photoPreview[slot.field]" alt="" />
              <span v-else>📷 已拍</span>
              <button type="button" class="photo-del" @click="clearPhoto(slot.field)">✕</button>
            </div>
            <button
              v-else
              type="button"
              class="photo-add"
              @click="takePhoto(slot.field, slot.label)"
            >
              + 拍照
            </button>
          </div>
        </div>
        <div class="form-row">
          <span class="form-label">送检结果</span>
          <label class="check-row">
            <input v-model="form.inspect_result_checked" type="checkbox" />
            <span>已完成送检</span>
          </label>
        </div>
        <div v-if="form.inspect_result_checked" class="form-row">
          <span class="form-label">送检照片</span>
          <div class="photo-group">
            <div v-if="form.inspect_result_file" class="photo-box">
              <img
                v-if="photoPreview.inspect_result_file"
                :src="photoPreview.inspect_result_file"
                alt=""
              />
              <span v-else>📷 已拍</span>
              <button type="button" class="photo-del" @click="clearPhoto('inspect_result_file')">
                ✕
              </button>
            </div>
            <button
              v-else
              type="button"
              class="photo-add"
              @click="takePhoto('inspect_result_file', '送检结果')"
            >
              + 拍照
            </button>
          </div>
        </div>
      </section>
    </div>

    <div class="bottom-bar">
      <button type="button" class="submit-btn" @click="onSubmit">
        {{ isReEdit || copyFromId ? '重新申报' : '提交进场申报' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.mp {
  width: 100%;
  max-width: 402px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f5f5;
  font-family: 'PingFang SC', -apple-system, sans-serif;
  padding-bottom: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.05);
}
.mh {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #8f0045;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}
.mb {
  background: none;
  border: none;
  color: #fff;
  font-size: 28px;
  padding: 0 4px 0 0;
  line-height: 1;
  cursor: pointer;
}
.mt {
  flex: 1;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}
.form-body {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
}
.tip-banner {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff7e6;
  border-radius: 8px;
  font-size: 12px;
  color: #ad6800;
}
.tip-banner.muted {
  background: #fff;
  color: #666;
}
.form-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}
.fs-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #8f0045;
}
.form-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  align-items: flex-start;
}
.form-row:last-child {
  margin-bottom: 0;
}
.form-label {
  color: #666;
  flex-shrink: 0;
  width: 72px;
  font-size: 13px;
  padding-top: 8px;
}
.required-mark {
  color: #e53935;
  margin-left: 2px;
  font-weight: 600;
}
.form-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  background: #fff;
  min-width: 0;
}
.form-input:disabled {
  background: #f5f5f5;
  color: #666;
}
.form-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tag-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 16px;
  background: #fff;
  font-size: 13px;
  color: #666;
  cursor: pointer;
}
.tag-btn.active {
  background: #8f0045;
  color: #fff;
  border-color: #8f0045;
}
.photo-group {
  flex: 1;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.photo-box {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  overflow: hidden;
}
.photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  cursor: pointer;
  padding: 0;
  line-height: 18px;
}
.photo-add {
  width: 72px;
  height: 72px;
  border: 1px dashed #c0c4cc;
  border-radius: 8px;
  background: #fafafa;
  color: #8f0045;
  font-size: 12px;
  cursor: pointer;
}
.check-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  font-size: 13px;
  color: #333;
}
.unpack {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}
.unpack-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}
.unpack-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #444;
  margin-bottom: 8px;
}
.bottom-bar {
  position: sticky;
  bottom: 0;
  width: 100%;
  margin-top: auto;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0));
  background: #fff;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 5;
}
.submit-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 12px;
  background: #8f0045;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
</style>

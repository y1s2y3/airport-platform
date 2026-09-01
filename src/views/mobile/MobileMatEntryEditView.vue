<script setup>
/**
 * APP · 进场申报（合格证/现场照片仅图片：拍照或相册）
 * 材料/设备明细：多组，字段与 Web 进场申报对齐
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useQmProjectScope } from '../../composables/useCurrentProject'
import {
  ENTRY_TYPE_LABEL,
  QUALITY_RESULT_OPTIONS,
  buildCopyPayloadFromRejectedMat,
  createDefaultUnpackItems,
  findMatSupervisorApprover,
  listApprovedSamples,
  listMaterialsForEntryBrand,
  listMatSupervisorApprovers,
  formatMatSupervisorApproverLabel,
  parseBatchSeq,
  searchEntryBrands,
  submitEntry,
} from '../../mock/mat.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
const entryType = ref(route.query.entry_type === 'equipment' ? 'equipment' : 'material')

const form = reactive({
  sample_application_id: '',
  ledger_id: '',
  brand_name: '',
  manufacturer: '',
  equipment_name: '',
  model: '',
  use_part: '',
  supplier: '',
  quantity: '',
  unit: entryType.value === 'equipment' ? '台' : '件',
  serial_no: '',
  cert_file: '',
  inspect_file: '',
  photo_file: '',
  other_file: '',
  /** 设备进场（移动端单组）送检；材料进场写在各明细行 */
  inspect_result_checked: false,
  inspect_result_file: '',
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
})

const photoPreview = reactive({
  cert_file: '',
  inspect_file: '',
  photo_file: '',
  other_file: '',
  inspect_result_file: '',
})

const unpackItems = ref(createDefaultUnpackItems())
const entryLines = ref([emptyLine()])
const equipmentLines = ref([emptyEquipmentLine()])

const supervisorApprovers = computed(() =>
  scopeProjectId.value ? listMatSupervisorApprovers(scopeProjectId.value) : [],
)

function onSupervisorApproverChange() {
  const u = findMatSupervisorApprover(form.supervisor_approver_user_id)
  form.supervisor_approver_name = u?.name || ''
}

function nowEntryDate() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function emptyLine() {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    material_name: '',
    material_spec: '',
    quantity: '',
    unit: '件',
    purpose: '',
    use_part: '',
    location_id: '',
    location_ids: [],
    waybill_no: '',
    batch_no: 1,
    appearance_quality: '合格',
    acceptance_result: '合格',
    entry_date: nowEntryDate(),
    cert_file: '',
    inspect_file: '',
    photo_file: '',
    other_file: '',
    cert_preview: '',
    inspect_preview: '',
    photo_preview: '',
    other_preview: '',
    inspect_result_checked: false,
    inspect_result_file: '',
    inspect_result_preview: '',
  }
}

function emptyEquipmentLine() {
  return {
    key: `eq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    equipment_name: '',
    model: '',
    quantity: '',
    unit: '台',
    purpose: '',
    use_part: '',
    location_id: '',
    location_ids: [],
    waybill_no: '',
    batch_no: 1,
    serial_no: '',
    appearance_quality: '合格',
    acceptance_result: '合格',
    entry_date: nowEntryDate(),
    cert_file: '',
    inspect_file: '',
    photo_file: '',
    other_file: '',
    cert_preview: '',
    inspect_preview: '',
    photo_preview: '',
    other_preview: '',
    inspect_result_checked: false,
    inspect_result_file: '',
    inspect_result_preview: '',
    unpack_items: createDefaultUnpackItems(),
  }
}

function mapEquipmentLineFromData(l, data) {
  const row = emptyEquipmentLine()
  row.equipment_name = l.equipment_name || l.material_name || ''
  row.model = l.model || l.material_spec || ''
  row.quantity = l.quantity != null ? String(l.quantity) : ''
  row.unit = l.unit || '台'
  row.purpose = l.purpose || ''
  row.use_part = l.use_part || data.use_part || ''
  row.waybill_no = l.waybill_no || ''
  row.batch_no = parseBatchSeq(l.batch_no, 1)
  row.serial_no = l.serial_no || ''
  row.appearance_quality = l.appearance_quality || '合格'
  row.acceptance_result = l.acceptance_result || '合格'
  row.entry_date = l.entry_date || nowEntryDate()
  row.cert_file = l.cert_file || ''
  row.inspect_file = l.inspect_file || ''
  row.photo_file = l.photo_file || ''
  row.other_file = l.other_file || ''
  row.inspect_result_checked = !!l.inspect_result_checked
  row.inspect_result_file = l.inspect_result_file || ''
  if (Array.isArray(l.unpack_items) && l.unpack_items.length) {
    row.unpack_items = l.unpack_items.map((i) => ({ ...i }))
  }
  return row
}

function mapLineFromData(l, data) {
  const row = emptyLine()
  row.material_name = l.material_name || ''
  row.material_spec = l.material_spec || ''
  row.quantity = l.quantity != null ? String(l.quantity) : ''
  row.unit = l.unit || '件'
  row.purpose = l.purpose || ''
  row.use_part = l.use_part || data.use_part || ''
  row.location_id = l.location_id || data.location_id || ''
  row.location_ids = Array.isArray(l.location_ids)
    ? [...l.location_ids]
    : Array.isArray(data.location_ids)
      ? [...data.location_ids]
      : []
  row.waybill_no = l.waybill_no || ''
  row.batch_no = parseBatchSeq(l.batch_no, 1)
  row.appearance_quality = l.appearance_quality || '合格'
  row.acceptance_result = l.acceptance_result || '合格'
  row.entry_date = l.entry_date || nowEntryDate()
  row.cert_file = l.cert_file || data.cert_file || ''
  row.inspect_file = l.inspect_file || data.inspect_file || ''
  row.photo_file = l.photo_file || data.photo_file || ''
  row.other_file = l.other_file || data.other_file || ''
  row.inspect_result_checked = !!(l.inspect_result_checked ?? data.inspect_result_checked)
  row.inspect_result_file = l.inspect_result_file || data.inspect_result_file || ''
  return row
}

const pageTitle = computed(() => {
  if (copyFromId.value) return '重新报审进场'
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

const materialNameOptions = computed(() => {
  if (!scopeProjectId.value || !form.brand_name || !form.manufacturer) return []
  const names = listMaterialsForEntryBrand(
    scopeProjectId.value,
    form.brand_name,
    form.manufacturer,
    { materialType: 'material' },
  )
  const sample = samples.value.find(
    (x) => x.sample_application_id === form.sample_application_id,
  )
  const extra = sample?.material_name || ''
  if (extra && !names.includes(extra)) names.push(extra)
  return names
})

const equipmentNameOptions = computed(() => {
  if (!scopeProjectId.value || !form.brand_name || !form.manufacturer) return []
  return listMaterialsForEntryBrand(
    scopeProjectId.value,
    form.brand_name,
    form.manufacturer,
    { materialType: 'equipment' },
  )
})

function addEntryLine() {
  entryLines.value.push(emptyLine())
}

function removeEntryLine(idx) {
  if (entryLines.value.length <= 1) {
    entryLines.value[0] = emptyLine()
    return
  }
  const removed = entryLines.value[idx]
  ;['cert_preview', 'inspect_preview', 'photo_preview', 'other_preview', 'inspect_result_preview'].forEach(
    (k) => {
      if (removed?.[k]) URL.revokeObjectURL(removed[k])
    },
  )
  entryLines.value.splice(idx, 1)
}

function addEquipmentLine() {
  equipmentLines.value.push(emptyEquipmentLine())
}

function removeEquipmentLine(idx) {
  if (equipmentLines.value.length <= 1) {
    equipmentLines.value[0] = emptyEquipmentLine()
    return
  }
  const removed = equipmentLines.value[idx]
  ;['cert_preview', 'inspect_preview', 'photo_preview', 'other_preview', 'inspect_result_preview'].forEach(
    (k) => {
      if (removed?.[k]) URL.revokeObjectURL(removed[k])
    },
  )
  equipmentLines.value.splice(idx, 1)
}

function pruneLineMaterials() {
  const allow = new Set(materialNameOptions.value)
  entryLines.value.forEach((row) => {
    if (row.material_name && !allow.has(row.material_name)) row.material_name = ''
  })
}

function pruneEquipmentNames() {
  const allow = new Set(equipmentNameOptions.value)
  equipmentLines.value.forEach((row) => {
    if (row.equipment_name && !allow.has(row.equipment_name)) row.equipment_name = ''
  })
}

function applyPayload(data) {
  entryType.value = data.entry_type === 'equipment' ? 'equipment' : 'material'
  form.sample_application_id = data.sample_application_id || ''
  form.ledger_id = data.ledger_id || ''
  form.brand_name = data.brand_name || ''
  form.manufacturer = data.manufacturer || ''
  form.use_part = data.use_part || ''
  form.supplier = data.supplier || ''
  form.supervisor_approver_user_id = data.supervisor_approver_user_id || ''
  form.supervisor_approver_name = data.supervisor_approver_name || ''
  if (data.entry_type === 'equipment') {
    if (data.line_items?.length) {
      equipmentLines.value = data.line_items.map((l) => mapEquipmentLineFromData(l, data))
    } else {
      equipmentLines.value = [
        mapEquipmentLineFromData(
          {
            equipment_name: data.equipment_name,
            model: data.model,
            quantity: data.quantity,
            unit: data.unit,
            serial_no: data.serial_no,
            waybill_no: data.waybill_no,
            batch_no: data.batch_no,
            unpack_items: data.unpack_items,
            cert_file: data.cert_file,
            inspect_file: data.inspect_file,
            photo_file: data.photo_file,
            other_file: data.other_file,
            inspect_result_checked: data.inspect_result_checked,
            inspect_result_file: data.inspect_result_file,
            appearance_quality: data.appearance_quality,
            acceptance_result: data.acceptance_result,
            entry_date: data.entry_date,
            purpose: data.purpose,
            use_part: data.use_part,
          },
          data,
        ),
      ]
    }
    entryLines.value = [emptyLine()]
  } else if (data.line_items?.length) {
    entryLines.value = data.line_items.map((l) => mapLineFromData(l, data))
    equipmentLines.value = [emptyEquipmentLine()]
  } else {
    const row = mapLineFromData(
      {
        material_name: data.material_name,
        material_spec: data.material_spec,
        quantity: data.quantity,
        unit: data.unit,
        waybill_no: data.waybill_no,
        batch_no: data.batch_no,
      },
      data,
    )
    entryLines.value = [row]
    equipmentLines.value = [emptyEquipmentLine()]
  }
}

onMounted(() => {
  if (!copyFromId.value) return
  const r = buildCopyPayloadFromRejectedMat(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    return
  }
  applyPayload(r.data)
  ElMessage.success(`已从驳回单 ${copyFromId.value} 预填，提交将生成新单`)
})

watch(entryType, (t) => {
  if (copyFromId.value) return
  form.ledger_id = ''
  form.brand_name = ''
  form.manufacturer = ''
  if (t === 'equipment') {
    equipmentLines.value = [emptyEquipmentLine()]
    entryLines.value = [emptyLine()]
  } else {
    entryLines.value = [emptyLine()]
    equipmentLines.value = [emptyEquipmentLine()]
  }
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
    if (entryType.value === 'material') {
      if (hit.material_name) {
        entryLines.value.forEach((row, idx) => {
          if (idx === 0 || !row.material_name) row.material_name = hit.material_name
        })
      }
      pruneLineMaterials()
    } else {
      if (hit.material_name) {
        equipmentLines.value.forEach((row, idx) => {
          if (idx === 0 || !row.equipment_name) row.equipment_name = hit.material_name
        })
      }
      pruneEquipmentNames()
    }
  },
)

watch(
  () => form.sample_application_id,
  (id) => {
    if (!id) return
    const s = samples.value.find((x) => x.sample_application_id === id)
    if (!s) return
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
    if (entryType.value === 'material') {
      if (s.material_name && entryLines.value.length && !entryLines.value[0].material_name) {
        entryLines.value[0].material_name = s.material_name
      }
      if (s.use_part && entryLines.value.length && !entryLines.value[0].use_part) {
        entryLines.value[0].use_part = s.use_part
      }
    } else if (s.material_name && equipmentLines.value.length) {
      if (!equipmentLines.value[0].equipment_name) {
        equipmentLines.value[0].equipment_name = s.material_name
      }
      if (s.use_part && !equipmentLines.value[0].use_part) {
        equipmentLines.value[0].use_part = s.use_part
      }
    }
  },
)

function pickImageFile({ capture = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,.jpg,.jpeg,.png'
    if (capture) input.capture = 'environment'
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      resolve(file || null)
    }
    input.click()
  })
}

function pickAcceptFile(accept) {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = (e) => {
      const file = e.target.files?.[0]
      resolve(file || null)
    }
    input.click()
  })
}

function isImageUploadFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const byExt = /\.(jpe?g|png)$/i.test(name)
  const type = String(file?.type || '')
  return byExt || type === 'image/jpeg' || type === 'image/png'
}

function isPdfUploadFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '')
  return /\.pdf$/i.test(name) || type === 'application/pdf'
}

function isOtherUploadFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const type = String(file?.type || '')
  if (/\.(jpe?g|png|pdf|docx?)$/i.test(name)) return true
  return (
    type === 'image/jpeg' ||
    type === 'image/png' ||
    type === 'application/pdf' ||
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
}

async function takePhoto(field, label) {
  const file = await pickImageFile({ capture: true })
  if (!file) return
  if (!isImageUploadFile(file)) {
    return ElMessage.warning(`${label}仅支持图片（jpg / png）`)
  }
  const name = `拍照-${label}-${Date.now()}.jpg`
  form[field] = name
  photoPreview[field] = URL.createObjectURL(file)
  ElMessage.success(`已拍照：${label}`)
}

async function pickAlbumPhoto(field, label) {
  const file = await pickImageFile({ capture: false })
  if (!file) return
  if (!isImageUploadFile(file)) {
    return ElMessage.warning(`${label}仅支持图片（jpg / png）`)
  }
  const name = file.name || `相册-${label}-${Date.now()}.jpg`
  form[field] = name
  photoPreview[field] = URL.createObjectURL(file)
  ElMessage.success(`已选择：${label}`)
}

async function pickFormDoc(field, label, mode) {
  const accept =
    mode === 'pdf'
      ? '.pdf,application/pdf'
      : '.jpg,.jpeg,.png,.pdf,.doc,.docx,image/jpeg,image/png,application/pdf'
  const file = await pickAcceptFile(accept)
  if (!file) return
  if (mode === 'pdf' && !isPdfUploadFile(file)) {
    return ElMessage.warning('质量证明文件仅支持 PDF')
  }
  if (mode === 'other' && !isOtherUploadFile(file)) {
    return ElMessage.warning('其他仅支持 jpg / png / pdf / word')
  }
  form[field] = file.name || `${label}-${Date.now()}`
  if (photoPreview[field]) {
    URL.revokeObjectURL(photoPreview[field])
    photoPreview[field] = ''
  }
  if (isImageUploadFile(file)) {
    photoPreview[field] = URL.createObjectURL(file)
  }
  ElMessage.success(`已选择：${label}`)
}

function clearPhoto(field) {
  form[field] = ''
  if (photoPreview[field]) {
    URL.revokeObjectURL(photoPreview[field])
    photoPreview[field] = ''
  }
}

async function takeLinePhoto(row, field, label) {
  const previewKey = `${field.replace('_file', '')}_preview`
  const file = await pickImageFile({ capture: true })
  if (!file) return
  if (!isImageUploadFile(file)) {
    return ElMessage.warning(`${label}仅支持图片（jpg / png）`)
  }
  if (row[previewKey]) URL.revokeObjectURL(row[previewKey])
  row[field] = `拍照-${label}-${Date.now()}.jpg`
  row[previewKey] = URL.createObjectURL(file)
  ElMessage.success(`已拍照：${label}`)
}

async function pickLineAlbum(row, field, label) {
  const previewKey = `${field.replace('_file', '')}_preview`
  const file = await pickImageFile({ capture: false })
  if (!file) return
  if (!isImageUploadFile(file)) {
    return ElMessage.warning(`${label}仅支持图片（jpg / png）`)
  }
  if (row[previewKey]) URL.revokeObjectURL(row[previewKey])
  row[field] = file.name || `相册-${label}-${Date.now()}.jpg`
  row[previewKey] = URL.createObjectURL(file)
  ElMessage.success(`已选择：${label}`)
}

async function pickLineDoc(row, field, label, mode) {
  const previewKey = `${field.replace('_file', '')}_preview`
  const accept =
    mode === 'pdf'
      ? '.pdf,application/pdf'
      : '.jpg,.jpeg,.png,.pdf,.doc,.docx,image/jpeg,image/png,application/pdf'
  const file = await pickAcceptFile(accept)
  if (!file) return
  if (mode === 'pdf' && !isPdfUploadFile(file)) {
    return ElMessage.warning('质量证明文件仅支持 PDF')
  }
  if (mode === 'other' && !isOtherUploadFile(file)) {
    return ElMessage.warning('其他仅支持 jpg / png / pdf / word')
  }
  if (row[previewKey]) URL.revokeObjectURL(row[previewKey])
  row[field] = file.name || `${label}-${Date.now()}`
  row[previewKey] = isImageUploadFile(file) ? URL.createObjectURL(file) : ''
  ElMessage.success(`已选择：${label}`)
}

function clearLinePhoto(row, field) {
  const previewKey = `${field.replace('_file', '')}_preview`
  row[field] = ''
  if (row[previewKey]) {
    URL.revokeObjectURL(row[previewKey])
    row[previewKey] = ''
  }
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  if (!form.ledger_id) return ElMessage.warning('请选择品牌台账')
  if (!form.supplier.trim()) return ElMessage.warning('请填写供应商')
  if (!form.supervisor_approver_user_id) return ElMessage.warning('请选择监理审批人')

  const base = {
    project_id: scopeProjectId.value,
    entry_type: entryType.value,
    sample_application_id: form.sample_application_id,
    ledger_id: form.ledger_id,
    brand_name: form.brand_name,
    manufacturer: form.manufacturer,
    use_part: form.use_part,
    supplier: form.supplier,
    copy_from_entry_no: copyFromId.value,
    supervisor_approver_user_id: form.supervisor_approver_user_id,
    supervisor_approver_name: form.supervisor_approver_name,
  }

  let payload
  if (entryType.value === 'equipment') {
    if (!form.brand_name || !form.manufacturer) {
      return ElMessage.warning('请先选择品牌，再填写设备明细')
    }
    const line_items = []
    const allow = equipmentNameOptions.value
    for (let i = 0; i < equipmentLines.value.length; i += 1) {
      const row = equipmentLines.value[i]
      const equipment_name = String(row.equipment_name || '').trim()
      const model = String(row.model || '').trim()
      const quantity = String(row.quantity || '').trim()
      const unit = String(row.unit || '').trim()
      if (!equipment_name) return ElMessage.warning(`设备明细第 ${i + 1} 组请选择设备名称`)
      if (allow.length && !allow.includes(equipment_name)) {
        return ElMessage.warning(`设备明细第 ${i + 1} 组设备不在所选品牌对应范围内`)
      }
      if (!model) return ElMessage.warning(`设备明细第 ${i + 1} 组请填写规格型号`)
      if (!unit) return ElMessage.warning(`设备明细第 ${i + 1} 组请填写数量单位`)
      if (!quantity || Number(quantity) <= 0) {
        return ElMessage.warning(`设备明细第 ${i + 1} 组请填写有效数量`)
      }
      if (!row.appearance_quality) {
        return ElMessage.warning(`设备明细第 ${i + 1} 组请选择外观质量`)
      }
      if (!row.acceptance_result) {
        return ElMessage.warning(`设备明细第 ${i + 1} 组请选择验收结论`)
      }
      if (!row.entry_date) {
        return ElMessage.warning(`设备明细第 ${i + 1} 组请填写进场日期`)
      }
      if (!row.cert_file) return ElMessage.warning(`设备明细第 ${i + 1} 组请拍照上传合格证`)
      if (!row.inspect_file) {
        return ElMessage.warning(`设备明细第 ${i + 1} 组请上传质量证明文件（PDF）`)
      }
      if (!row.photo_file) return ElMessage.warning(`设备明细第 ${i + 1} 组请拍照上传现场照片`)
      if (!row.unpack_items?.length) {
        return ElMessage.warning(`设备明细第 ${i + 1} 组请填写开箱清单`)
      }
      line_items.push({
        equipment_name,
        material_name: equipment_name,
        model,
        material_spec: model,
        quantity: Number(quantity),
        unit,
        serial_no: String(row.serial_no || '').trim(),
        purpose: String(row.purpose || '').trim(),
        use_part: String(row.use_part || '').trim(),
        waybill_no: String(row.waybill_no || '').trim(),
        batch_no: parseBatchSeq(row.batch_no, 1),
        appearance_quality: row.appearance_quality,
        acceptance_result: row.acceptance_result,
        entry_date: row.entry_date,
        cert_file: row.cert_file,
        inspect_file: row.inspect_file,
        photo_file: row.photo_file,
        other_file: row.other_file || '',
        inspect_result_checked: !!row.inspect_result_checked,
        inspect_result_file: row.inspect_result_checked ? row.inspect_result_file || '' : '',
        unpack_items: row.unpack_items.map((item) => ({ ...item })),
      })
    }
    const first = line_items[0]
    payload = {
      ...base,
      equipment_name: first.equipment_name,
      model: first.model,
      use_part: first.use_part || form.use_part,
      serial_no: first.serial_no,
      quantity: first.quantity,
      unit: first.unit,
      cert_file: first.cert_file,
      inspect_file: first.inspect_file,
      photo_file: first.photo_file,
      other_file: first.other_file || '',
      unpack_items: first.unpack_items,
      line_items,
    }
  } else {
    if (!form.brand_name || !form.manufacturer) {
      return ElMessage.warning('请先选择品牌，再填写进场明细')
    }
    const line_items = []
    const allow = materialNameOptions.value
    for (let i = 0; i < entryLines.value.length; i += 1) {
      const row = entryLines.value[i]
      const material_name = String(row.material_name || '').trim()
      const material_spec = String(row.material_spec || '').trim()
      const quantity = String(row.quantity || '').trim()
      const unit = String(row.unit || '').trim()
      if (!material_name) return ElMessage.warning(`进场明细第 ${i + 1} 组请选择材料名称`)
      if (allow.length && !allow.includes(material_name)) {
        return ElMessage.warning(`进场明细第 ${i + 1} 组材料不在所选品牌对应范围内`)
      }
      if (!material_spec) return ElMessage.warning(`进场明细第 ${i + 1} 组请填写规格型号`)
      if (!unit) return ElMessage.warning(`进场明细第 ${i + 1} 组请填写数量单位`)
      if (!quantity || Number(quantity) <= 0) {
        return ElMessage.warning(`进场明细第 ${i + 1} 组请填写有效数量`)
      }
      if (!row.appearance_quality) {
        return ElMessage.warning(`进场明细第 ${i + 1} 组请选择外观质量`)
      }
      if (!row.acceptance_result) {
        return ElMessage.warning(`进场明细第 ${i + 1} 组请选择验收结论`)
      }
      if (!row.entry_date) {
        return ElMessage.warning(`进场明细第 ${i + 1} 组请填写进场日期`)
      }
      if (!row.cert_file) return ElMessage.warning(`进场明细第 ${i + 1} 组请拍照上传合格证`)
      if (!row.inspect_file) {
        return ElMessage.warning(`进场明细第 ${i + 1} 组请上传质量证明文件（PDF）`)
      }
      if (!row.photo_file) return ElMessage.warning(`进场明细第 ${i + 1} 组请拍照上传现场照片`)
      line_items.push({
        material_name,
        material_spec,
        quantity: Number(quantity),
        unit,
        purpose: String(row.purpose || '').trim(),
        use_part: String(row.use_part || '').trim(),
        location_id: row.location_id || '',
        location_ids: [...(row.location_ids || [])],
        waybill_no: String(row.waybill_no || '').trim(),
        batch_no: parseBatchSeq(row.batch_no, 1),
        appearance_quality: row.appearance_quality,
        acceptance_result: row.acceptance_result,
        entry_date: row.entry_date,
        cert_file: row.cert_file,
        inspect_file: row.inspect_file,
        photo_file: row.photo_file,
        other_file: row.other_file || '',
        inspect_result_checked: !!row.inspect_result_checked,
        inspect_result_file: row.inspect_result_checked ? row.inspect_result_file || '' : '',
      })
    }
    const first = line_items[0]
    payload = {
      ...base,
      material_name: first.material_name,
      use_part: first.use_part || form.use_part,
      location_id: first.location_id,
      location_ids: [...(first.location_ids || [])],
      cert_file: first.cert_file,
      inspect_file: first.inspect_file,
      photo_file: first.photo_file,
      other_file: first.other_file || '',
      line_items,
    }
  }

  const r = submitEntry(payload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(
    copyFromId.value
      ? `已重新报审 ${r.data.entry_no}，进入审批中`
      : `已提交 ${r.data.entry_no}，进入审批中`,
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
      <div v-else class="tip-banner muted">
        {{ scopeProjectLabel }} · 合格证、现场照片仅支持图片（jpg / png）
      </div>

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
              :key="s.sample_application_id"
              :value="s.sample_application_id"
            >
              {{ s.sample_application_id }} · {{ s.material_name }}
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
      </section>

      <section v-if="entryType === 'material'" class="form-section">
        <div class="fs-title">材料进场明细</div>
        <p class="section-tip">一个进场单可对应多组材料；每组含材料信息与附件，默认一组。</p>
        <div v-for="(row, idx) in entryLines" :key="row.key" class="line-card">
          <div class="line-head">
            <span class="line-title">材料 {{ idx + 1 }}</span>
            <button
              type="button"
              class="line-del"
              :disabled="entryLines.length <= 1"
              @click="removeEntryLine(idx)"
            >
              删除
            </button>
          </div>
          <div class="form-row">
            <span class="form-label">材料名称<span class="required-mark">*</span></span>
            <select
              v-model="row.material_name"
              class="form-input"
              :disabled="!materialNameOptions.length"
            >
              <option value="" disabled>
                {{ materialNameOptions.length ? '请选择材料' : '请先选择品牌' }}
              </option>
              <option v-for="name in materialNameOptions" :key="name" :value="name">
                {{ name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <span class="form-label">规格型号<span class="required-mark">*</span></span>
            <input v-model="row.material_spec" class="form-input" placeholder="如 C30 / SBS-3mm" />
          </div>
          <div class="form-row">
            <span class="form-label">数量<span class="required-mark">*</span></span>
            <input v-model="row.quantity" class="form-input qty-num" type="number" placeholder="数量" />
            <input v-model="row.unit" class="form-input qty-unit" placeholder="单位" />
          </div>
          <div class="form-row">
            <span class="form-label">用途</span>
            <input v-model="row.purpose" class="form-input" placeholder="选填" />
          </div>
          <div class="form-row">
            <span class="form-label">施工部位</span>
            <input v-model="row.use_part" class="form-input" placeholder="选填" />
          </div>
          <div class="form-row">
            <span class="form-label">运单号</span>
            <input v-model="row.waybill_no" class="form-input" placeholder="选填" />
          </div>
          <div class="form-row">
            <span class="form-label">批次号</span>
            <div class="batch-row">
              <span class="batch-affix">第</span>
              <input
                v-model.number="row.batch_no"
                class="form-input batch-input"
                type="number"
                min="1"
                step="1"
              />
              <span class="batch-affix">批</span>
            </div>
          </div>
          <div class="form-row">
            <span class="form-label">外观质量<span class="required-mark">*</span></span>
            <div class="radio-row">
              <label v-for="opt in QUALITY_RESULT_OPTIONS" :key="opt.value" class="radio-item">
                <input v-model="row.appearance_quality" type="radio" :value="opt.value" />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <span class="form-label">验收结论<span class="required-mark">*</span></span>
            <div class="radio-row">
              <label v-for="opt in QUALITY_RESULT_OPTIONS" :key="opt.value" class="radio-item">
                <input v-model="row.acceptance_result" type="radio" :value="opt.value" />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <span class="form-label">进场日期<span class="required-mark">*</span></span>
            <input v-model="row.entry_date" class="form-input" placeholder="YYYY-MM-DD HH:mm:ss" />
          </div>
          <div class="attach-title">附件</div>
          <div
            v-for="slot in [
              { field: 'cert_file', label: '合格证', required: true, preview: 'cert_preview', mode: 'image' },
              {
                field: 'inspect_file',
                label: '质量证明文件',
                required: true,
                preview: 'inspect_preview',
                mode: 'pdf',
              },
              { field: 'photo_file', label: '现场照片', required: true, preview: 'photo_preview', mode: 'image' },
              { field: 'other_file', label: '其他', required: false, preview: 'other_preview', mode: 'other' },
            ]"
            :key="slot.field"
            class="form-row"
          >
            <span class="form-label">
              {{ slot.label }}
              <span v-if="slot.required" class="required-mark">*</span>
            </span>
            <div class="photo-group">
              <div v-if="row[slot.field]" class="photo-box">
                <img v-if="row[slot.preview]" :src="row[slot.preview]" alt="" />
                <span v-else>📄 已上传</span>
                <button type="button" class="photo-del" @click="clearLinePhoto(row, slot.field)">
                  ✕
                </button>
              </div>
              <template v-else-if="slot.mode === 'image'">
                <button
                  type="button"
                  class="photo-add"
                  @click="takeLinePhoto(row, slot.field, slot.label)"
                >
                  + 拍照
                </button>
                <button
                  type="button"
                  class="photo-add"
                  @click="pickLineAlbum(row, slot.field, slot.label)"
                >
                  相册
                </button>
              </template>
              <button
                v-else
                type="button"
                class="photo-add"
                @click="pickLineDoc(row, slot.field, slot.label, slot.mode)"
              >
                {{ slot.mode === 'pdf' ? '+ 选择 PDF' : '+ 选择文件' }}
              </button>
            </div>
            <div v-if="slot.mode === 'image'" class="attach-hint">仅支持图片（jpg / png）</div>
            <div v-else-if="slot.mode === 'pdf'" class="attach-hint">仅支持 PDF</div>
            <div v-else class="attach-hint">支持 jpg / png / pdf / word</div>
          </div>
          <div class="form-row">
            <span class="form-label">送检</span>
            <label class="check-row">
              <input v-model="row.inspect_result_checked" type="checkbox" />
              <span>已完成送检</span>
            </label>
          </div>
          <div v-if="row.inspect_result_checked" class="form-row">
            <span class="form-label">送检附件</span>
            <div class="photo-group">
              <div v-if="row.inspect_result_file" class="photo-box">
                <img v-if="row.inspect_result_preview" :src="row.inspect_result_preview" alt="" />
                <span v-else>📄 已上传</span>
                <button
                  type="button"
                  class="photo-del"
                  @click="clearLinePhoto(row, 'inspect_result_file')"
                >
                  ✕
                </button>
              </div>
              <template v-else>
                <button
                  type="button"
                  class="photo-add"
                  @click="takeLinePhoto(row, 'inspect_result_file', '送检结果')"
                >
                  + 拍照
                </button>
                <button
                  type="button"
                  class="photo-add"
                  @click="pickLineDoc(row, 'inspect_result_file', '送检结果', 'other')"
                >
                  + 文件
                </button>
              </template>
            </div>
            <div class="attach-hint">选填；支持图片 / PDF</div>
          </div>
        </div>
        <button type="button" class="add-line-btn" @click="addEntryLine">＋ 新增一组材料</button>
      </section>

      <section v-else class="form-section">
        <div class="fs-title">设备进场明细</div>
        <p class="section-tip">一个进场单可对应多组设备；每组含设备信息、附件与开箱清单，默认一组。</p>
        <div v-for="(row, idx) in equipmentLines" :key="row.key" class="line-card">
          <div class="line-head">
            <span class="line-title">设备 {{ idx + 1 }}</span>
            <button type="button" class="line-del" :disabled="equipmentLines.length <= 1" @click="removeEquipmentLine(idx)">删除</button>
          </div>
          <div class="form-row">
            <span class="form-label">设备名称<span class="required-mark">*</span></span>
            <select v-model="row.equipment_name" class="form-input" :disabled="!equipmentNameOptions.length">
              <option value="" disabled>{{ equipmentNameOptions.length ? '请选择设备' : '请先选择品牌' }}</option>
              <option v-for="name in equipmentNameOptions" :key="name" :value="name">{{ name }}</option>
            </select>
          </div>
          <div class="form-row">
            <span class="form-label">规格型号<span class="required-mark">*</span></span>
            <input v-model="row.model" class="form-input" placeholder="规格型号" />
          </div>
          <div class="form-row">
            <span class="form-label">数量<span class="required-mark">*</span></span>
            <input v-model="row.quantity" class="form-input qty-num" type="number" placeholder="数量" />
            <input v-model="row.unit" class="form-input qty-unit" placeholder="单位" />
          </div>
          <div class="form-row"><span class="form-label">用途</span><input v-model="row.purpose" class="form-input" placeholder="选填" /></div>
          <div class="form-row"><span class="form-label">施工部位</span><input v-model="row.use_part" class="form-input" placeholder="选填" /></div>
          <div class="form-row"><span class="form-label">出厂编号</span><input v-model="row.serial_no" class="form-input" placeholder="选填" /></div>
          <div class="form-row"><span class="form-label">运单号</span><input v-model="row.waybill_no" class="form-input" placeholder="选填" /></div>
          <div class="form-row">
            <span class="form-label">批次号</span>
            <div class="batch-row">
              <span class="batch-affix">第</span>
              <input v-model.number="row.batch_no" class="form-input batch-input" type="number" min="1" step="1" />
              <span class="batch-affix">批</span>
            </div>
          </div>
          <div class="form-row">
            <span class="form-label">外观质量<span class="required-mark">*</span></span>
            <div class="radio-row">
              <label v-for="opt in QUALITY_RESULT_OPTIONS" :key="opt.value" class="radio-item">
                <input v-model="row.appearance_quality" type="radio" :value="opt.value" /><span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <span class="form-label">验收结论<span class="required-mark">*</span></span>
            <div class="radio-row">
              <label v-for="opt in QUALITY_RESULT_OPTIONS" :key="'a'+opt.value" class="radio-item">
                <input v-model="row.acceptance_result" type="radio" :value="opt.value" /><span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="form-row">
            <span class="form-label">进场日期<span class="required-mark">*</span></span>
            <input v-model="row.entry_date" class="form-input" placeholder="YYYY-MM-DD HH:mm:ss" />
          </div>
          <div class="unpack">
            <div class="unpack-title">开箱清单<span class="required-mark">*</span></div>
            <label v-for="item in row.unpack_items" :key="item.key" class="unpack-item">
              <input v-model="item.ok" type="checkbox" /><span>{{ item.label }}</span>
            </label>
          </div>
          <div class="attach-title">附件</div>
          <div
            v-for="slot in [
              { field: 'cert_file', label: '合格证', required: true, preview: 'cert_preview', mode: 'image' },
              { field: 'inspect_file', label: '质量证明文件', required: true, preview: 'inspect_preview', mode: 'pdf' },
              { field: 'photo_file', label: '现场照片', required: true, preview: 'photo_preview', mode: 'image' },
              { field: 'other_file', label: '其他', required: false, preview: 'other_preview', mode: 'other' },
            ]"
            :key="slot.field"
            class="form-row"
          >
            <span class="form-label">{{ slot.label }}<span v-if="slot.required" class="required-mark">*</span></span>
            <div class="photo-group">
              <div v-if="row[slot.field]" class="photo-box">
                <img v-if="row[slot.preview]" :src="row[slot.preview]" alt="" />
                <span v-else>📄 已上传</span>
                <button type="button" class="photo-del" @click="clearLinePhoto(row, slot.field)">✕</button>
              </div>
              <template v-else-if="slot.mode === 'image'">
                <button type="button" class="photo-add" @click="takeLinePhoto(row, slot.field, slot.label)">+ 拍照</button>
                <button type="button" class="photo-add" @click="pickLineAlbum(row, slot.field, slot.label)">相册</button>
              </template>
              <button v-else type="button" class="photo-add" @click="pickLineDoc(row, slot.field, slot.label, slot.mode)">{{ slot.mode === 'pdf' ? '+ 选择 PDF' : '+ 选择文件' }}</button>
            </div>
            <div v-if="slot.mode === 'image'" class="attach-hint">仅支持图片（jpg / png）</div>
            <div v-else-if="slot.mode === 'pdf'" class="attach-hint">仅支持 PDF</div>
            <div v-else class="attach-hint">支持 jpg / png / pdf / word</div>
          </div>
          <div class="form-row">
            <span class="form-label">送检</span>
            <label class="check-row"><input v-model="row.inspect_result_checked" type="checkbox" /><span>已完成送检</span></label>
          </div>
          <div v-if="row.inspect_result_checked" class="form-row">
            <span class="form-label">送检附件</span>
            <div class="photo-group">
              <div v-if="row.inspect_result_file" class="photo-box">
                <img v-if="row.inspect_result_preview" :src="row.inspect_result_preview" alt="" />
                <span v-else>📄 已上传</span>
                <button type="button" class="photo-del" @click="clearLinePhoto(row, 'inspect_result_file')">✕</button>
              </div>
              <template v-else>
                <button type="button" class="photo-add" @click="takeLinePhoto(row, 'inspect_result_file', '送检结果')">+ 拍照</button>
                <button type="button" class="photo-add" @click="pickLineDoc(row, 'inspect_result_file', '送检结果', 'other')">+ 文件</button>
              </template>
            </div>
            <div class="attach-hint">选填；支持图片 / PDF</div>
          </div>
        </div>
        <button type="button" class="add-line-btn" @click="addEquipmentLine">＋ 新增一组设备</button>
      </section>

      <section class="form-section">
        <div class="fs-title">审批人</div>
        <div class="form-row">
          <span class="form-label">监理审批人<span class="required-mark">*</span></span>
          <select
            v-model="form.supervisor_approver_user_id"
            class="form-input"
            @change="onSupervisorApproverChange"
          >
            <option value="" disabled>请选择本项目监理岗位人员</option>
            <option v-for="u in supervisorApprovers" :key="u.user_id" :value="u.user_id">
              {{ formatMatSupervisorApproverLabel(u) }}
            </option>
          </select>
        </div>
      </section>
    </div>

    <div class="bottom-bar">
      <button type="button" class="submit-btn" @click="onSubmit">
        {{ copyFromId ? '重新报审' : '提交进场申报' }}
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
.section-tip {
  margin: -4px 0 12px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
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
.qty-num {
  flex: 1.2;
}
.qty-unit {
  flex: 0.8;
  max-width: 72px;
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
.line-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fafafa;
}
.line-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.line-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.line-del {
  border: none;
  background: none;
  color: #e53935;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.line-del:disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}
.attach-title {
  font-size: 12px;
  font-weight: 600;
  color: #606266;
  margin: 4px 0 10px;
  padding-top: 8px;
  border-top: 1px dashed #e4e7ed;
}
.add-line-btn {
  width: 100%;
  border: 1px dashed #8f0045;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  color: #8f0045;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.batch-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.batch-affix {
  font-size: 13px;
  color: #666;
  flex-shrink: 0;
}
.batch-input {
  max-width: 88px;
  flex: 0 0 88px;
}
.radio-row {
  flex: 1;
  display: flex;
  gap: 16px;
  padding-top: 8px;
}
.radio-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #333;
}
.photo-group {
  flex: 1;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.attach-hint {
  width: 100%;
  margin-top: 6px;
  padding: 4px 10px;
  display: inline-block;
  box-sizing: border-box;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
  background: #f4f4f5;
  border-radius: 4px;
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

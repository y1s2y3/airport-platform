<script setup>
import './mat-page.css'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete, UploadFilled } from '@element-plus/icons-vue'
import ConstructionLocationSelect from '../../../components/ConstructionLocationSelect.vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
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
} from '../../../mock/mat.js'

const route = useRoute()
const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const copyFromId = ref(String(route.query.copyFrom || ''))
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
  other_file: '',
  supervisor_approver_user_id: '',
  supervisor_approver_name: '',
})

const brandKeyword = ref('')
const brandLockedFromSample = ref(false)

const supervisorApprovers = computed(() =>
  scopeProjectId.value ? listMatSupervisorApprovers(scopeProjectId.value) : [],
)

function onSupervisorApproverChange(userId) {
  const u = findMatSupervisorApprover(userId)
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
    inspect_result_checked: false,
    inspect_result_file: '',
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
    inspect_result_checked: false,
    inspect_result_file: '',
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
  row.location_id = l.location_id || data.location_id || ''
  row.location_ids = Array.isArray(l.location_ids)
    ? [...l.location_ids]
    : Array.isArray(data.location_ids)
      ? [...data.location_ids]
      : []
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
  row.cert_file = l.cert_file || ''
  row.inspect_file = l.inspect_file || ''
  row.photo_file = l.photo_file || ''
  row.other_file = l.other_file || ''
  row.inspect_result_checked = !!l.inspect_result_checked
  row.inspect_result_file = l.inspect_result_file || ''
  return row
}

const entryLines = ref([emptyLine()])
const equipmentLines = ref([emptyEquipmentLine()])

const samples = computed(() =>
  scopeProjectId.value ? listApprovedSamples(scopeProjectId.value) : [],
)

const ledgerOptions = computed(() => {
  if (!scopeProjectId.value) return []
  const materialType = entryType.value === 'equipment' ? 'equipment' : 'material'
  const list = searchEntryBrands(brandKeyword.value, scopeProjectId.value, { materialType })
  if (form.ledger_id && !list.some((b) => b.ledger_id === form.ledger_id)) {
    const cur =
      searchEntryBrands('', scopeProjectId.value, { materialType }).find(
        (b) => b.ledger_id === form.ledger_id,
      ) ||
      (form.brand_name && form.manufacturer
        ? {
            ledger_id: form.ledger_id,
            brand_name: form.brand_name,
            manufacturer: form.manufacturer,
            material_name: form.material_name || form.equipment_name || '',
            label: `${form.brand_name} · ${form.manufacturer} · ${form.material_name || form.equipment_name || ''}`,
          }
        : null)
    if (cur) list.unshift(cur)
  }
  return list
})

const equipmentNameOptions = computed(() => {
  if (!scopeProjectId.value || !form.brand_name || !form.manufacturer) return []
  const names = listMaterialsForEntryBrand(
    scopeProjectId.value,
    form.brand_name,
    form.manufacturer,
    { materialType: 'equipment' },
  )
  const sample = samples.value.find(
    (x) =>
      x.sample_application_id === form.sample_application_id ||
      x.sample_id === form.sample_application_id,
  )
  const extra = sample?.material_name || ''
  if (extra && !names.includes(extra)) names.push(extra)
  return names
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
    (x) =>
      x.sample_application_id === form.sample_application_id ||
      x.sample_id === form.sample_application_id,
  )
  const extra = sample?.material_name || ''
  if (extra && !names.includes(extra)) names.push(extra)
  return names
})

const pageTitle = computed(() => {
  if (copyFromId.value) return '重新报审进场申请'
  return '进场申报'
})

function pruneLineMaterials() {
  const allow = new Set(materialNameOptions.value)
  entryLines.value.forEach((row) => {
    if (row.material_name && !allow.has(row.material_name)) row.material_name = ''
  })
}

function pruneLineEquipments() {
  const allow = new Set(equipmentNameOptions.value)
  equipmentLines.value.forEach((row) => {
    if (row.equipment_name && !allow.has(row.equipment_name)) row.equipment_name = ''
  })
}

function onLedgerChange(id) {
  if (brandLockedFromSample.value) return
  if (!id) {
    form.brand_name = ''
    form.manufacturer = ''
    entryLines.value.forEach((row) => {
      row.material_name = ''
    })
    equipmentLines.value.forEach((row) => {
      row.equipment_name = ''
    })
    return
  }
  const materialType = entryType.value === 'equipment' ? 'equipment' : 'material'
  const hit =
    ledgerOptions.value.find((b) => b.ledger_id === id) ||
    searchEntryBrands('', scopeProjectId.value, { materialType }).find((b) => b.ledger_id === id)
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
    pruneLineEquipments()
  }
}

watch(entryType, (t) => {
  if (t === 'equipment') {
    if (!equipmentLines.value.length) equipmentLines.value = [emptyEquipmentLine()]
  } else if (!entryLines.value.length) {
    entryLines.value = [emptyLine()]
  }
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
    form.ledger_id = hit?.ledger_id || form.ledger_id || ''
    if (entryType.value === 'material' && s.material_name) {
      if (entryLines.value.length && !entryLines.value[0].material_name) {
        entryLines.value[0].material_name = s.material_name
      }
      if (s.use_part && entryLines.value.length && !entryLines.value[0].use_part) {
        entryLines.value[0].use_part = s.use_part
      }
    }
    if (entryType.value === 'equipment') {
      if (equipmentLines.value.length && !equipmentLines.value[0].equipment_name) {
        equipmentLines.value[0].equipment_name = s.material_name || ''
      }
      if (s.use_part && equipmentLines.value.length && !equipmentLines.value[0].use_part) {
        equipmentLines.value[0].use_part = s.use_part
      }
    }
  },
)

watch(() => form.ledger_id, onLedgerChange)

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
  form.other_file = data.other_file || ''
  form.supervisor_approver_user_id = data.supervisor_approver_user_id || ''
  form.supervisor_approver_name = data.supervisor_approver_name || ''
  if (data.line_items?.length) {
    if (data.entry_type === 'equipment') {
      equipmentLines.value = data.line_items.map((l, idx) => {
        const row = mapEquipmentLineFromData(l, data)
        if (idx === 0) {
          if (!row.cert_file) row.cert_file = data.cert_file || ''
          if (!row.inspect_file) row.inspect_file = data.inspect_file || ''
          if (!row.photo_file) row.photo_file = data.photo_file || ''
          if (!row.other_file) row.other_file = data.other_file || ''
          if (!row.inspect_result_checked && data.inspect_result_checked) {
            row.inspect_result_checked = true
            row.inspect_result_file = data.inspect_result_file || ''
          }
          if (!row.unpack_items?.length && data.unpack_items?.length) {
            row.unpack_items = data.unpack_items.map((i) => ({ ...i }))
          }
        }
        return row
      })
    } else {
      entryLines.value = data.line_items.map((l, idx) => {
        const row = mapLineFromData(l, data)
        if (idx === 0) {
          if (!row.cert_file) row.cert_file = data.cert_file || ''
          if (!row.inspect_file) row.inspect_file = data.inspect_file || ''
          if (!row.photo_file) row.photo_file = data.photo_file || ''
          if (!row.other_file) row.other_file = data.other_file || ''
          if (!row.inspect_result_checked && data.inspect_result_checked) {
            row.inspect_result_checked = true
            row.inspect_result_file = data.inspect_result_file || ''
          }
        }
        return row
      })
    }
  } else if (data.entry_type === 'equipment') {
    const row = mapEquipmentLineFromData(
      {
        equipment_name: data.equipment_name,
        model: data.model,
        quantity: data.quantity,
        unit: data.unit,
        serial_no: data.serial_no,
        waybill_no: data.waybill_no,
        batch_no: data.batch_no,
        unpack_items: data.unpack_items,
        inspect_result_checked: data.inspect_result_checked,
        inspect_result_file: data.inspect_result_file,
      },
      data,
    )
    row.cert_file = data.cert_file || ''
    row.inspect_file = data.inspect_file || ''
    row.photo_file = data.photo_file || ''
    row.other_file = data.other_file || ''
    equipmentLines.value = [row]
  } else if (data.entry_type !== 'equipment') {
    const row = mapLineFromData(
      {
        material_name: data.material_name,
        material_spec: data.material_spec,
        quantity: data.quantity,
        unit: data.unit,
        waybill_no: data.waybill_no,
        batch_no: data.batch_no,
        inspect_result_checked: data.inspect_result_checked,
        inspect_result_file: data.inspect_result_file,
      },
      data,
    )
    row.cert_file = data.cert_file || ''
    row.inspect_file = data.inspect_file || ''
    row.photo_file = data.photo_file || ''
    row.other_file = data.other_file || ''
    entryLines.value = [row]
  }
}

onMounted(() => {
  if (route.query.entry_type === 'equipment') entryType.value = 'equipment'
  if (!copyFromId.value) return
  const r = buildCopyPayloadFromRejectedMat(copyFromId.value)
  if (!r.ok) {
    ElMessage.error(r.msg)
    copyFromId.value = ''
    router.replace(`/qm/mat/applications/edit?entry_type=${entryType.value}`)
    return
  }
  applyCopyPayload(r.data)
  ElMessage.success(`已从驳回单 ${copyFromId.value} 预填，提交将生成新单`)
})

function addEquipmentLine() {
  equipmentLines.value.push(emptyEquipmentLine())
}

function removeEquipmentLine(idx) {
  if (equipmentLines.value.length <= 1) {
    equipmentLines.value[0] = emptyEquipmentLine()
    return
  }
  equipmentLines.value.splice(idx, 1)
}

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

function isImageUploadFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const byExt = /\.(jpe?g|png)$/i.test(name)
  const type = String(file?.type || '')
  const byMime = type === 'image/jpeg' || type === 'image/png'
  return byExt || byMime
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

function validateAttachField(field, file) {
  if (field === 'cert_file' || field === 'photo_file') {
    if (!isImageUploadFile(file)) {
      return field === 'cert_file'
        ? '合格证仅支持上传图片（jpg / png）'
        : '现场照片仅支持上传图片（jpg / png）'
    }
    return ''
  }
  if (field === 'inspect_file') {
    if (!isPdfUploadFile(file)) return '质量证明文件仅支持 PDF'
    return ''
  }
  if (field === 'other_file') {
    if (!isOtherUploadFile(file)) return '其他仅支持 jpg / png / pdf / word'
    return ''
  }
  if (field === 'inspect_result_file') {
    if (!isImageUploadFile(file) && !isPdfUploadFile(file)) {
      return '送检附件仅支持图片或 PDF'
    }
    return ''
  }
  return ''
}

function onPickLineFile(row, field, uploadFile) {
  const file = uploadFile.raw || uploadFile
  if (!file) return false
  const err = validateAttachField(field, file)
  if (err) {
    ElMessage.warning(err)
    return false
  }
  if (file.size > 30 * 1024 * 1024) {
    ElMessage.warning('单个文件不超过 30MB')
    return false
  }
  row[field] = file.name || `${field}-${Date.now()}`
  ElMessage.success(`已上传：${row[field]}`)
  return false
}

function onPickFormFile(field, uploadFile) {
  const file = uploadFile.raw || uploadFile
  if (!file) return false
  const err = validateAttachField(field, file)
  if (err) {
    ElMessage.warning(err)
    return false
  }
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
  if (!form.ledger_id) {
    return ElMessage.warning('请选择品牌台账')
  }
  if (!String(form.supplier || '').trim()) return ElMessage.warning('请填写供应商')
  if (!form.supervisor_approver_user_id) return ElMessage.warning('请选择监理审批人')

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
    copy_from_entry_id: copyFromId.value,
    supervisor_approver_user_id: form.supervisor_approver_user_id,
    supervisor_approver_name: form.supervisor_approver_name,
  }

  if (entryType.value === 'equipment') {
    const line_items = []
    const allow = equipmentNameOptions.value
    for (let i = 0; i < equipmentLines.value.length; i += 1) {
      const row = equipmentLines.value[i]
      const equipment_name = String(row.equipment_name || '').trim()
      const model = String(row.model || '').trim()
      const quantity = String(row.quantity || '').trim()
      const unit = String(row.unit || '').trim()
      if (!form.brand_name || !form.manufacturer) {
        return ElMessage.warning('请先选择品牌，再填写设备明细')
      }
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
      if (!row.cert_file) return ElMessage.warning(`设备明细第 ${i + 1} 组请上传合格证`)
      if (!row.inspect_file) return ElMessage.warning(`设备明细第 ${i + 1} 组请上传质量证明文件`)
      if (!row.photo_file) return ElMessage.warning(`设备明细第 ${i + 1} 组请上传现场照片`)
      const missingFixed = !row.unpack_items?.length
      if (missingFixed) {
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
        unpack_items: row.unpack_items.map((item) => ({ ...item })),
      })
    }

    const first = line_items[0]
    const submitPayload = {
      ...base,
      equipment_name: first.equipment_name,
      model: first.model,
      use_part: first.use_part,
      location_id: first.location_id,
      location_ids: [...(first.location_ids || [])],
      serial_no: first.serial_no,
      cert_file: first.cert_file,
      inspect_file: first.inspect_file,
      photo_file: first.photo_file,
      other_file: first.other_file || '',
      unpack_items: first.unpack_items,
      line_items,
    }
    const r = submitEntry(submitPayload)
    if (!r.ok) return ElMessage.error(r.msg)
    ElMessage.success(
      copyFromId.value
        ? `已重新报审 ${r.data.entry_id}，进入审批中`
        : `已提交 ${r.data.entry_id}，进入审批中`,
    )
    router.push('/qm/mat/applications')
    return
  }

  const line_items = []
  const allow = materialNameOptions.value
  for (let i = 0; i < entryLines.value.length; i += 1) {
    const row = entryLines.value[i]
    const material_name = String(row.material_name || '').trim()
    const material_spec = String(row.material_spec || '').trim()
    const quantity = String(row.quantity || '').trim()
    const unit = String(row.unit || '').trim()
    if (!form.brand_name || !form.manufacturer) {
      return ElMessage.warning('请先选择品牌，再填写进场明细')
    }
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
    if (!row.cert_file) return ElMessage.warning(`进场明细第 ${i + 1} 组请上传合格证`)
    if (!row.inspect_file) return ElMessage.warning(`进场明细第 ${i + 1} 组请上传质量证明文件`)
    if (!row.photo_file) return ElMessage.warning(`进场明细第 ${i + 1} 组请上传现场照片`)
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
  const submitPayload = {
    ...base,
    material_name: first.material_name,
    use_part: first.use_part,
    location_id: first.location_id,
    location_ids: [...(first.location_ids || [])],
    cert_file: first.cert_file,
    inspect_file: first.inspect_file,
    photo_file: first.photo_file,
    other_file: first.other_file || '',
    line_items,
  }
  const r = submitEntry(submitPayload)
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(
    copyFromId.value
      ? `已重新报审 ${r.data.entry_id}，进入审批中`
      : `已提交 ${r.data.entry_id}，进入审批中`,
  )
  router.push('/qm/mat/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">材料设备进场 / 进场申请 / {{ copyFromId ? '重新报审' : '新建' }}</div>
      <div class="title-row">
        <h1 class="page-title">{{ pageTitle }}</h1>
        <el-tag v-if="copyFromId" size="small" type="warning" effect="plain">
          从驳回单 {{ copyFromId }} 复制新建
        </el-tag>
      </div>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
        · 品牌须选自品牌台账 · 定样可选关联 · 审批流程：施工方填报 → 监理单位审批
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
            <el-form-item label="品牌台账" required>
              <el-select
                v-model="form.ledger_id"
                filterable
                remote
                :remote-method="(q) => (brandKeyword = q)"
                clearable
                :placeholder="
                  entryType === 'equipment'
                    ? '搜索：品牌 / 厂家 / 设备'
                    : '搜索：品牌 / 厂家 / 材料'
                "
                style="width: 100%"
                :disabled="brandLockedFromSample"
              >
                <el-option
                  v-for="b in ledgerOptions"
                  :key="b.ledger_id"
                  :label="b.label"
                  :value="b.ledger_id"
                />
              </el-select>
              <p v-if="brandLockedFromSample" class="field-hint">已选定样，品牌台账只读带出</p>
              <p v-else class="field-hint">从本项目品牌台账下拉选择（品牌·厂家·材料/设备）</p>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="品牌">
              <el-input v-model="form.brand_name" disabled placeholder="由台账带出" aria-label="由台账带出"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产厂家">
              <el-input v-model="form.manufacturer" disabled placeholder="由台账带出" aria-label="由台账带出"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" required>
              <el-input v-model="form.supplier" placeholder="请填写供应商" aria-label="请填写供应商"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联定样">
              <el-select
                v-model="form.sample_application_id"
                filterable
                clearable
                placeholder="可选：已通过定样"
                style="width: 100%" aria-label="可选：已通过定样">
                <el-option
                  v-for="s in samples"
                  :key="s.sample_application_id || s.sample_id"
                  :label="`${s.sample_application_id || s.sample_id} · ${s.material_name}`"
                  :value="s.sample_application_id || s.sample_id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section v-if="entryType === 'material'" class="form-section">
        <h2 class="section-title">材料进场明细</h2>
        <p class="section-tip">一个进场单可对应多组材料；每组含材料信息与附件，默认一组。</p>
        <div v-for="(row, idx) in entryLines" :key="row.key" class="entry-line-card">
          <div class="entry-line-head">
            <span class="entry-line-title">材料 {{ idx + 1 }}</span>
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
                <el-select
                  v-model="row.material_name"
                  filterable
                  clearable
                  :disabled="!materialNameOptions.length"
                  :placeholder="materialNameOptions.length ? '请选择材料' : '请先选择品牌'"
                  style="width: 100%" aria-label="materialNameOptions.length ? '请选择材料' : '请先选择品牌'">
                  <el-option
                    v-for="name in materialNameOptions"
                    :key="name"
                    :label="name"
                    :value="name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规格型号" required>
                <el-input v-model="row.material_spec" placeholder="如 C30 / SBS-3mm" aria-label="如 C30 / SBS-3mm"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数量" required>
                <div class="qty-with-unit">
                  <el-input v-model="row.quantity" placeholder="数量" class="qty-num" aria-label="数量"/>
                  <el-input v-model="row.unit" placeholder="单位" class="qty-unit" aria-label="单位"/>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="用途">
                <el-input v-model="row.purpose" placeholder="选填" aria-label="选填"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="施工部位">
                <ConstructionLocationSelect
                  v-model:location-id="row.location_id"
                  v-model:location-ids="row.location_ids"
                  v-model:location-name="row.use_part"
                  :project-id="scopeProjectId"
                  multiple
                  placeholder="请选择施工部位"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="运单号">
                <el-input v-model="row.waybill_no" placeholder="选填" aria-label="选填"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="批次号">
                <div class="batch-stepper">
                  <span class="batch-affix">第</span>
                  <el-input-number
                    v-model="row.batch_no"
                    :min="1"
                    :step="1"
                    :precision="0"
                    controls-position="right"
                  />
                  <span class="batch-affix">批</span>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="外观质量" required>
                <el-radio-group v-model="row.appearance_quality">
                  <el-radio
                    v-for="opt in QUALITY_RESULT_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="验收结论" required>
                <el-radio-group v-model="row.acceptance_result">
                  <el-radio
                    v-for="opt in QUALITY_RESULT_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="进场日期" required>
                <el-date-picker
                  v-model="row.entry_date"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="默认填报时间，可修改"
                  style="width: 100%" aria-label="默认填报时间，可修改"/>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="entry-attach-title">附件</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="合格证" required>
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'cert_file', f)"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    >
                      <el-button :icon="UploadFilled">上传图片</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.cert_file }">
                      {{ row.cert_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">仅支持图片（jpg / png）</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="质量证明文件" required>
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'inspect_file', f)"
                      accept=".pdf,application/pdf"
                    >
                      <el-button :icon="UploadFilled">上传 PDF</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.inspect_file }">
                      {{ row.inspect_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">仅支持 PDF</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="现场照片" required>
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'photo_file', f)"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    >
                      <el-button :icon="UploadFilled">上传图片</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.photo_file }">
                      {{ row.photo_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">仅支持图片（jpg / png）</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="其他">
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'other_file', f)"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,image/jpeg,image/png,application/pdf"
                    >
                      <el-button :icon="UploadFilled">上传</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.other_file }">
                      {{ row.other_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">支持 jpg / png / pdf / word</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="送检">
                <el-checkbox v-model="row.inspect_result_checked">已完成送检</el-checkbox>
              </el-form-item>
            </el-col>
            <el-col v-if="row.inspect_result_checked" :span="12">
              <el-form-item label="送检附件">
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'inspect_result_file', f)"
                      accept="image/*,.pdf"
                    >
                      <el-button :icon="UploadFilled">上传</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.inspect_result_file }">
                      {{ row.inspect_result_file || '选填' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">选填；支持图片 / PDF</p>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>
        <div class="entry-line-add">
          <el-button type="primary" plain :icon="Plus" @click="addEntryLine">新增一组材料</el-button>
        </div>
      </section>

      <section v-else class="form-section">
        <h2 class="section-title">设备进场明细</h2>
        <p class="section-tip">一个进场单可对应多组设备；每组含设备信息、附件与开箱清单，默认一组。</p>
        <div v-for="(row, idx) in equipmentLines" :key="row.key" class="entry-line-card">
          <div class="entry-line-head">
            <span class="entry-line-title">设备 {{ idx + 1 }}</span>
            <el-button
              type="danger"
              link
              :icon="Delete"
              :disabled="equipmentLines.length <= 1"
              @click="removeEquipmentLine(idx)"
            >
              删除
            </el-button>
          </div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="设备名称" required>
                <el-select
                  v-model="row.equipment_name"
                  filterable
                  clearable
                  :disabled="!equipmentNameOptions.length"
                  :placeholder="equipmentNameOptions.length ? '请选择设备' : '请先选择品牌'"
                  style="width: 100%" aria-label="equipmentNameOptions.length ? '请选择设备' : '请先选择品牌'">
                  <el-option
                    v-for="name in equipmentNameOptions"
                    :key="name"
                    :label="name"
                    :value="name"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="规格型号" required>
                <el-input v-model="row.model" placeholder="型号规格" aria-label="型号规格"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="数量" required>
                <div class="qty-with-unit">
                  <el-input v-model="row.quantity" placeholder="数量" class="qty-num" aria-label="数量"/>
                  <el-input v-model="row.unit" placeholder="单位" class="qty-unit" aria-label="单位"/>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="序列号">
                <el-input v-model="row.serial_no" placeholder="选填" aria-label="选填"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="用途">
                <el-input v-model="row.purpose" placeholder="选填" aria-label="选填"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="施工部位">
                <ConstructionLocationSelect
                  v-model:location-id="row.location_id"
                  v-model:location-ids="row.location_ids"
                  v-model:location-name="row.use_part"
                  :project-id="scopeProjectId"
                  multiple
                  placeholder="请选择施工部位"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="运单号">
                <el-input v-model="row.waybill_no" placeholder="选填" aria-label="选填"/>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="批次号">
                <div class="batch-stepper">
                  <span class="batch-affix">第</span>
                  <el-input-number
                    v-model="row.batch_no"
                    :min="1"
                    :step="1"
                    :precision="0"
                    controls-position="right"
                  />
                  <span class="batch-affix">批</span>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="外观质量" required>
                <el-radio-group v-model="row.appearance_quality">
                  <el-radio
                    v-for="opt in QUALITY_RESULT_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="验收结论" required>
                <el-radio-group v-model="row.acceptance_result">
                  <el-radio
                    v-for="opt in QUALITY_RESULT_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="进场日期" required>
                <el-date-picker
                  v-model="row.entry_date"
                  type="datetime"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="默认填报时间，可修改"
                  style="width: 100%" aria-label="默认填报时间，可修改"/>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="entry-attach-title">附件</div>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="合格证" required>
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'cert_file', f)"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    >
                      <el-button :icon="UploadFilled">上传图片</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.cert_file }">
                      {{ row.cert_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">仅支持图片（jpg / png）</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="质量证明文件" required>
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'inspect_file', f)"
                      accept=".pdf,application/pdf"
                    >
                      <el-button :icon="UploadFilled">上传 PDF</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.inspect_file }">
                      {{ row.inspect_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">仅支持 PDF</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="现场照片" required>
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'photo_file', f)"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    >
                      <el-button :icon="UploadFilled">上传图片</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.photo_file }">
                      {{ row.photo_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">仅支持图片（jpg / png）</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="其他">
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'other_file', f)"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,image/jpeg,image/png,application/pdf"
                    >
                      <el-button :icon="UploadFilled">上传</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.other_file }">
                      {{ row.other_file || '未上传' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">支持 jpg / png / pdf / word</p>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="送检">
                <el-checkbox v-model="row.inspect_result_checked">已完成送检</el-checkbox>
              </el-form-item>
            </el-col>
            <el-col v-if="row.inspect_result_checked" :span="12">
              <el-form-item label="送检附件">
                <div class="attach-field">
                  <div class="attach-upload-row">
                    <el-upload
                      :show-file-list="false"
                      :before-upload="(f) => onPickLineFile(row, 'inspect_result_file', f)"
                      accept="image/*,.pdf"
                    >
                      <el-button :icon="UploadFilled">上传</el-button>
                    </el-upload>
                    <span class="attach-file-name" :class="{ 'is-empty': !row.inspect_result_file }">
                      {{ row.inspect_result_file || '选填' }}
                    </span>
                  </div>
                  <p class="attach-format-tip">选填；支持图片 / PDF</p>
                </div>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="entry-attach-title">开箱清单</div>
          <el-row :gutter="16" class="unpack-grid">
            <el-col v-for="unpackRow in row.unpack_items" :key="unpackRow.key" :span="6">
              <div class="unpack-card">
                <div class="unpack-card-head">
                  <span class="unpack-label">{{ unpackRow.label }}</span>
                  <el-checkbox v-model="unpackRow.ok">合格</el-checkbox>
                </div>
                <el-input v-model="unpackRow.remark" placeholder="备注（选填）" size="small" aria-label="备注（选填）"/>
              </div>
            </el-col>
          </el-row>
        </div>
        <div class="entry-line-add">
          <el-button type="primary" plain :icon="Plus" @click="addEquipmentLine">新增一组设备</el-button>
        </div>
      </section>

      <section class="form-section">
        <h2 class="section-title">审批人</h2>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="监理审批人" required>
              <el-select
                v-model="form.supervisor_approver_user_id"
                filterable
                clearable
                placeholder="请选择本项目监理岗位人员"
                style="width: 100%"
                aria-label="请选择监理审批人"
                @change="onSupervisorApproverChange"
              >
                <el-option
                  v-for="u in supervisorApprovers"
                  :key="u.user_id"
                  :label="formatMatSupervisorApproverLabel(u)"
                  :value="u.user_id"
                />
              </el-select>
              <p class="field-hint">仅可选本项目监理单位相关岗位人员（总监/代总/专监/驻场等，岗位字典待定稿）</p>
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <div class="op-bar">
        <el-button @click="router.push('/qm/mat/applications')">取消</el-button>
        <el-button type="primary" @click="onSubmit">
          {{ copyFromId ? '重新报审' : '提交进场' }}
        </el-button>
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
.section-tip {
  margin: 0 0 12px;
  font-size: 13px;
  color: #909399;
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
.attach-field {
  width: 100%;
}
.attach-upload-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.attach-file-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  word-break: break-all;
}
.attach-file-name.is-empty {
  color: #c0c4cc;
}
.attach-format-tip {
  margin: 8px 0 0;
  padding: 4px 10px;
  display: inline-block;
  font-size: 12px;
  line-height: 1.5;
  color: #909399;
  background: #f4f4f5;
  border-radius: 4px;
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
.entry-attach-title {
  margin: 4px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.entry-line-add {
  margin: 4px 0 8px;
}
.unpack-grid {
  margin-bottom: 8px;
}
.unpack-card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
}
.unpack-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}
.unpack-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
}
.batch-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.batch-affix {
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}
.qty-with-unit {
  display: flex;
  width: 100%;
  align-items: stretch;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}
.qty-with-unit:focus-within {
  border-color: #409eff;
}
.qty-with-unit :deep(.el-input__wrapper) {
  box-shadow: none !important;
  border-radius: 0;
}
.qty-num {
  flex: 1;
  min-width: 0;
}
.qty-unit {
  width: 88px;
  flex-shrink: 0;
  border-left: 1px solid #dcdfe6;
}
.qty-unit :deep(.el-input__inner) {
  text-align: center;
}
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
</style>

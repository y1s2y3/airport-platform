<script setup>
import '../mat/mat-page.css'
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { getNoSampleAllowed } from '../../../mock/mat.js'
import {
  createDefaultUnpackItems,
  listApprovedBrands,
  listApprovedSamples,
  submitEntry,
} from '../../../mock/eq.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const form = reactive({
  sample_id: '',
  no_sample: false,
  equipment_name: '',
  model: '',
  use_part: '',
  brand_name: '',
  manufacturer: '',
  brand_id: '',
  quantity: '',
  unit: '台',
  supplier: '',
  serial_no: '',
  cert_file: '',
  inspect_file: '',
  photo_file: '',
  inspect_result_checked: false,
  inspect_result_file: '',
  unpack_items: createDefaultUnpackItems(),
})

const customLabel = ref('')

const allowNoSample = computed(() => {
  if (!scopeProjectId.value) return false
  return getNoSampleAllowed(scopeProjectId.value)
})

const samples = computed(() =>
  scopeProjectId.value ? listApprovedSamples(scopeProjectId.value) : [],
)

const brands = computed(() =>
  scopeProjectId.value ? listApprovedBrands(scopeProjectId.value) : [],
)

watch(
  () => form.sample_id,
  (id) => {
    if (!id) return
    const s = samples.value.find((x) => x.sample_id === id)
    if (!s) return
    form.no_sample = false
    form.equipment_name = s.equipment_name
    form.use_part = s.use_part
    form.brand_name = s.brand_name
    form.manufacturer = s.manufacturer
    form.model = s.model || ''
    form.brand_id = ''
  },
)

watch(
  () => form.no_sample,
  (v) => {
    if (v) {
      form.sample_id = ''
      form.equipment_name = ''
      form.use_part = ''
      form.brand_name = ''
      form.manufacturer = ''
      form.model = ''
    }
  },
)

function onPickBrand(brandId) {
  const b = brands.value.find((x) => x.brand_id === brandId)
  if (!b) return
  form.brand_id = b.brand_id
  form.brand_name = b.brand_name
  form.manufacturer = b.manufacturer
  if (!form.equipment_name) form.equipment_name = b.equipment_name
}

function mockUpload(field) {
  const map = {
    cert_file: '合格证-设备演示.pdf',
    inspect_file: '质检报告-设备演示.pdf',
    photo_file: '现场照片-设备演示.jpg',
    inspect_result_file: '送检结果-设备演示.pdf',
  }
  form[field] = map[field]
  ElMessage.success(`已模拟上传：${form[field]}`)
}

function addCustomUnpack() {
  const label = customLabel.value.trim()
  if (!label) return ElMessage.warning('请填写补充项名称')
  form.unpack_items.push({
    key: `custom-${Date.now()}`,
    label,
    fixed: false,
    ok: false,
    remark: '',
  })
  customLabel.value = ''
}

function removeCustom(idx) {
  const item = form.unpack_items[idx]
  if (item?.fixed) return
  form.unpack_items.splice(idx, 1)
}

function onSubmit() {
  if (isHqSelected.value || !scopeProjectId.value) {
    return ElMessage.warning('请先切换到具体项目')
  }
  const r = submitEntry({
    project_id: scopeProjectId.value,
    sample_id: form.no_sample ? '' : form.sample_id,
    equipment_name: form.equipment_name,
    model: form.model,
    use_part: form.use_part,
    brand_name: form.brand_name,
    manufacturer: form.manufacturer,
    quantity: form.quantity,
    unit: form.unit,
    supplier: form.supplier,
    serial_no: form.serial_no,
    cert_file: form.cert_file,
    inspect_file: form.inspect_file,
    photo_file: form.photo_file,
    inspect_result_checked: form.inspect_result_checked,
    inspect_result_file: form.inspect_result_file,
    unpack_items: form.unpack_items,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(`已提交 ${r.data.entry_id}，已进入个人中心待办（待监理审）`)
  router.push('/qm/eq/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">设备进场管理 / 设备进场申请 / 新建</div>
      <div class="title-row">
        <h1 class="page-title">新建设备进场</h1>
        <el-tag size="small" effect="plain" type="info">无草稿 · 直接提交</el-tag>
      </div>
      <p class="page-tip">
        当前项目：
        <strong>{{ isHqSelected ? '未选择（请先切换项目）' : scopeProjectLabel }}</strong>
        · 规则对齐材料进场 · 含开箱清单
      </p>
    </div>

    <el-form label-width="120px">
      <section class="form-section">
        <h2 class="section-title">定样与品牌</h2>
        <el-form-item v-if="allowNoSample" label="无定样进场">
          <el-switch v-model="form.no_sample" />
          <span class="muted" style="margin-left: 8px">与材料进场共用项目开关</span>
        </el-form-item>
        <el-form-item v-if="!form.no_sample" label="关联定样" required>
          <el-select
            v-model="form.sample_id"
            filterable
            clearable
            placeholder="选择已通过设备定样"
            style="width: 100%; max-width: 480px"
          >
            <el-option
              v-for="s in samples"
              :key="s.sample_id"
              :label="`${s.sample_id} · ${s.equipment_name} · ${s.brand_name}`"
              :value="s.sample_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="报审入选品牌" required>
          <el-select
            :model-value="form.brand_id"
            filterable
            placeholder="选择本项目报审通过品牌"
            style="width: 100%; max-width: 480px"
            @change="onPickBrand"
          >
            <el-option
              v-for="b in brands"
              :key="b.brand_id"
              :label="`${b.brand_name} · ${b.equipment_name}`"
              :value="b.brand_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="设备名称" required>
          <el-input
            v-model="form.equipment_name"
            :readonly="!!form.sample_id"
            style="max-width: 480px"
          />
        </el-form-item>
        <el-form-item label="型号">
          <el-input v-model="form.model" :readonly="!!form.sample_id" style="max-width: 480px" />
        </el-form-item>
        <el-form-item label="使用部位">
          <el-input v-model="form.use_part" :readonly="!!form.sample_id" style="max-width: 480px" />
        </el-form-item>
        <el-form-item label="品牌" required>
          <el-input
            v-model="form.brand_name"
            readonly
            style="max-width: 480px"
            placeholder="由定样/报审带出，不可改"
          />
        </el-form-item>
        <el-form-item label="生产厂家">
          <el-input v-model="form.manufacturer" readonly style="max-width: 480px" />
        </el-form-item>
      </section>

      <section class="form-section">
        <h2 class="section-title">进场信息</h2>
        <el-form-item label="数量" required>
          <el-input v-model="form.quantity" style="width: 160px" placeholder="数量" />
          <el-input v-model="form.unit" style="width: 100px; margin-left: 8px" placeholder="单位" />
        </el-form-item>
        <el-form-item label="供应商" required>
          <el-input v-model="form.supplier" style="max-width: 480px" />
        </el-form-item>
        <el-form-item label="出厂编号">
          <el-input v-model="form.serial_no" style="max-width: 480px" />
        </el-form-item>
      </section>

      <section class="form-section">
        <h2 class="section-title">开箱清单（写死四项 + 可补充）</h2>
        <el-table :data="form.unpack_items" border stripe class="mb">
          <el-table-column prop="label" label="检查项" min-width="140" />
          <el-table-column label="齐全" width="100">
            <template #default="{ row }">
              <el-switch v-model="row.ok" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="160">
            <template #default="{ row }">
              <el-input v-model="row.remark" placeholder="可选" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row, $index }">
              <el-button
                v-if="!row.fixed"
                link
                type="danger"
                :icon="Delete"
                @click="removeCustom($index)"
              />
              <span v-else class="muted">固定</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="title-row" style="margin-bottom: 8px">
          <el-input v-model="customLabel" placeholder="补充检查项名称" style="width: 240px" />
          <el-button :icon="Plus" @click="addCustomUnpack">添加补充项</el-button>
        </div>
      </section>

      <section class="form-section">
        <h2 class="section-title">附件（三件套必填）</h2>
        <el-form-item label="合格证" required>
          <el-button @click="mockUpload('cert_file')">模拟上传</el-button>
          <span class="muted" style="margin-left: 8px">{{ form.cert_file || '未上传' }}</span>
        </el-form-item>
        <el-form-item label="质检报告" required>
          <el-button @click="mockUpload('inspect_file')">模拟上传</el-button>
          <span class="muted" style="margin-left: 8px">{{ form.inspect_file || '未上传' }}</span>
        </el-form-item>
        <el-form-item label="现场照片" required>
          <el-button @click="mockUpload('photo_file')">模拟上传</el-button>
          <span class="muted" style="margin-left: 8px">{{ form.photo_file || '未上传' }}</span>
        </el-form-item>
        <el-form-item label="送检结果">
          <el-checkbox v-model="form.inspect_result_checked">勾选后上传（非必填）</el-checkbox>
          <template v-if="form.inspect_result_checked">
            <el-button style="margin-left: 12px" @click="mockUpload('inspect_result_file')">
              模拟上传
            </el-button>
            <span class="muted" style="margin-left: 8px">
              {{ form.inspect_result_file || '未上传' }}
            </span>
          </template>
        </el-form-item>
      </section>

      <div class="op-bar">
        <el-button @click="router.push('/qm/eq/applications')">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交进场</el-button>
      </div>
    </el-form>
  </div>
</template>

# -*- coding: utf-8 -*-
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "src" / "views" / "quality" / "brand"


def w(name: str, content: str) -> None:
    (BASE / name).write_text(content.replace("\r\n", "\n"), encoding="utf-8", newline="\n")
    assert "品牌报审" in (BASE / name).read_text(encoding="utf-8")
    print("OK", name)


w(
    "BrandApplicationEditView.vue",
    """\
<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  MATERIAL_TYPE,
  listSpecsByMaterial,
  searchActiveBrands,
  searchActiveMaterials,
  submitApplication,
} from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()

const form = reactive({
  material_id: '',
  material_name: '',
  material_type: 'material',
  use_part: '',
  remark: '',
  specs: [{ spec_model: '', material_spec_id: '' }],
  candidates: [
    { brand_lib_id: '', brand_name: '', manufacturer: '' },
    { brand_lib_id: '', brand_name: '', manufacturer: '' },
    { brand_lib_id: '', brand_name: '', manufacturer: '' },
  ],
})

const importVisible = ref(false)
const importKw = ref('')
const brandSuggest = ref({})

const imported = computed(() => !!form.material_id)
const importList = computed(() => searchActiveMaterials(importKw.value))

function openImport() {
  importKw.value = ''
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
  ElMessage.success('已导入企业材料（只读，仅可删除导入）')
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
  form.candidates.push({ brand_lib_id: '', brand_name: '', manufacturer: '' })
}

function removeCandidate(idx) {
  if (form.candidates.length <= 3) return ElMessage.warning('备选品牌至少 3 条')
  form.candidates.splice(idx, 1)
}

function onBrandInput(idx) {
  const c = form.candidates[idx]
  if (c.brand_lib_id) return
  brandSuggest.value[idx] = searchActiveBrands(c.brand_name)
}

function pickBrand(idx, brand) {
  const c = form.candidates[idx]
  c.brand_lib_id = brand.brand_lib_id
  c.brand_name = brand.brand_name
  c.manufacturer = brand.manufacturer
  brandSuggest.value[idx] = []
}

function clearBrandLib(idx) {
  form.candidates.splice(idx, 1, { brand_lib_id: '', brand_name: '', manufacturer: '' })
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
    remark: form.remark,
    specs: form.specs,
    candidates: form.candidates,
  })
  if (!r.ok) return ElMessage.error(r.msg)
  if (r.warn) ElMessage.warning(r.warn)
  ElMessage.success(`已提交 ${r.data.application_id}，进入待监理审`)
  router.push('/qm/brand/applications')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审申请 / 新建</div>
      <h1 class="page-title">新增品牌报审</h1>
      <p class="page-tip">
        无草稿 · 直接提交 · 当前项目：{{ isHqSelected ? '未选择' : scopeProjectLabel }}
      </p>
    </div>

    <el-form label-width="120px" class="form">
      <el-divider content-position="left">材料信息</el-divider>
      <el-form-item label="企业材料">
        <template v-if="imported">
          <el-tag type="success" class="mr">已导入：{{ form.material_name }}</el-tag>
          <el-button type="danger" link @click="clearImport">删除导入</el-button>
        </template>
        <el-button v-else @click="openImport">从材料规格库导入</el-button>
        <span class="hint">也可不导入，手填材料名称与类型</span>
      </el-form-item>
      <el-form-item label="材料/设备名称" required>
        <el-input v-model="form.material_name" :disabled="imported" style="max-width: 360px" />
      </el-form-item>
      <el-form-item label="材料类型" required>
        <el-select v-model="form.material_type" :disabled="imported" style="width: 180px">
          <el-option v-for="(label, val) in MATERIAL_TYPE" :key="val" :label="label" :value="val" />
        </el-select>
      </el-form-item>
      <el-form-item label="使用部位">
        <el-input v-model="form.use_part" style="max-width: 360px" placeholder="非必填" />
      </el-form-item>

      <el-divider content-position="left">本单规格（至少1条）</el-divider>
      <div v-for="(s, idx) in form.specs" :key="idx" class="row-line">
        <el-input
          v-model="s.spec_model"
          :disabled="imported && !!s.material_spec_id"
          placeholder="规格型号"
          style="width: 240px"
        />
        <el-tag v-if="s.material_spec_id" size="small" type="info">企业规格</el-tag>
        <el-button
          v-if="!imported"
          :icon="Delete"
          link
          type="danger"
          @click="removeSpec(idx)"
        />
      </div>
      <el-button v-if="!imported" :icon="Plus" @click="addSpec">添加规格</el-button>

      <el-divider content-position="left">备选品牌（至少3条）</el-divider>
      <div v-for="(c, idx) in form.candidates" :key="idx" class="cand-block">
        <div class="row-line">
          <el-input
            v-model="c.brand_name"
            :disabled="!!c.brand_lib_id"
            placeholder="品牌名称"
            style="width: 180px"
            @input="onBrandInput(idx)"
          />
          <el-input
            v-model="c.manufacturer"
            :disabled="!!c.brand_lib_id"
            placeholder="生产厂家"
            style="width: 280px"
          />
          <el-tag v-if="c.brand_lib_id" size="small" type="success">库选入</el-tag>
          <el-button v-if="c.brand_lib_id" link type="danger" @click="clearBrandLib(idx)">删除</el-button>
          <el-button v-else link type="danger" :icon="Delete" @click="removeCandidate(idx)" />
        </div>
        <div v-if="brandSuggest[idx]?.length" class="suggest">
          <div
            v-for="b in brandSuggest[idx]"
            :key="b.brand_lib_id"
            class="suggest-item"
            @click="pickBrand(idx, b)"
          >
            {{ b.brand_name }} · {{ b.manufacturer }}
          </div>
        </div>
      </div>
      <el-button :icon="Plus" @click="addCandidate">添加备选</el-button>

      <el-form-item label="备注" class="mt">
        <el-input v-model="form.remark" type="textarea" :rows="2" style="max-width: 560px" />
      </el-form-item>

      <el-form-item>
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" @click="onSubmit">提交审批</el-button>
      </el-form-item>
    </el-form>

    <el-dialog v-model="importVisible" title="导入企业材料（仅启用）" width="640px" destroy-on-close>
      <el-input v-model="importKw" clearable placeholder="搜索材料名称" class="mb" />
      <el-table :data="importList" border stripe max-height="360" empty-text="无启用材料">
        <el-table-column prop="material_name" label="材料名称" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="primary" @click="applyImport(row)">导入</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
.form {
  max-width: 900px;
}
.row-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.cand-block {
  margin-bottom: 12px;
}
.suggest {
  margin: 0 0 8px 0;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  max-width: 480px;
  background: #fff;
}
.suggest-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
}
.suggest-item:hover {
  background: var(--el-fill-color-light);
}
.hint {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.mr {
  margin-right: 8px;
}
.mt {
  margin-top: 16px;
}
.mb {
  margin-bottom: 12px;
}
</style>
""",
)

w(
    "BrandApproveDetailView.vue",
    """\
<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getApplicationDetail,
  getInactiveSelectedHint,
  MATERIAL_TYPE,
  NODE_LABEL,
  pmApprove,
  STATUS_LABEL,
  statusTagType,
  supervisorApprove,
} from '../../../mock/brand.js'

const route = useRoute()
const router = useRouter()
const tick = ref(0)
const opinion = ref('')
const selectedId = ref('')
const materialPick = ref('')

const detail = computed(() => {
  void tick.value
  return getApplicationDetail(String(route.query.id || ''))
})

const inactiveHints = computed(() => {
  if (!detail.value) return []
  return getInactiveSelectedHint(detail.value.app.application_id)
})

const isSupervisor = computed(
  () => detail.value?.app.status === 'in_approval' && detail.value?.app.current_node === 'supervisor',
)
const isPm = computed(
  () => detail.value?.app.status === 'in_approval' && detail.value?.app.current_node === 'pm',
)

async function doSupervisor(action) {
  const r = supervisorApprove(detail.value.app.application_id, { action, opinion: opinion.value })
  if (!r.ok) return ElMessage.error(r.msg)
  ElMessage.success(action === 'agree' ? '已同意，流转至项目经理' : '已退回施工')
  tick.value += 1
  if (action === 'reject') router.push('/qm/brand/approve')
}

async function doPm(action) {
  if (action === 'agree') {
    if (!selectedId.value) return ElMessage.warning('请选定恰好 1 个入选品牌')
    const hit = detail.value.candidates.find((c) => c.candidate_id === selectedId.value)
    if (hit?.brand_lib_id && inactiveHints.value.some((c) => c.candidate_id === hit.candidate_id)) {
      try {
        await ElMessageBox.confirm(
          '该备选关联的品牌库品牌已停用。若仍入选，将新建一条启用品牌（允许与停用记录同名+同厂家并存）。是否继续？',
          '品牌已停用提示',
          { type: 'warning' },
        )
      } catch {
        return
      }
    }
  }
  const r = pmApprove(detail.value.app.application_id, {
    action,
    opinion: opinion.value,
    selectedCandidateId: selectedId.value,
    resolveMaterialId: materialPick.value || undefined,
  })
  if (!r.ok) {
    if (r.needChooseMaterial) {
      materialPick.value = r.materials[0]?.material_id || ''
      return ElMessage.warning(r.msg)
    }
    return ElMessage.error(r.msg)
  }
  ElMessage.success(action === 'agree' ? '终审通过，已入库' : '已退回施工')
  router.push('/qm/brand/approve')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审审批</div>
      <h1 class="page-title">报审审批</h1>
    </div>

    <el-empty v-if="!detail" description="未找到报审单" />
    <template v-else>
      <el-descriptions :column="2" border class="mb">
        <el-descriptions-item label="报审编号">{{ detail.app.application_id }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(detail.app.status)">
            {{ STATUS_LABEL[detail.app.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="材料/设备">{{ detail.app.material_name }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ MATERIAL_TYPE[detail.app.material_type] }}</el-descriptions-item>
        <el-descriptions-item label="当前节点">{{ NODE_LABEL[detail.app.current_node] }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ detail.app.submit_time }}</el-descriptions-item>
      </el-descriptions>

      <el-alert
        v-if="inactiveHints.length"
        type="warning"
        :closable="false"
        show-icon
        class="mb"
        :title="`以下库选备选对应品牌已停用：${inactiveHints.map((c) => c.brand_name).join('、')}。终审若仍入选将新建启用品牌。`"
      />

      <h3 class="sec">本单规格</h3>
      <el-table :data="detail.specs" border size="small" class="mb">
        <el-table-column prop="spec_model" label="规格型号" />
        <el-table-column prop="material_spec_id" label="企业规格ID" />
      </el-table>

      <h3 class="sec">备选品牌{{ isPm ? '（请选定入选）' : '' }}</h3>
      <el-table :data="detail.candidates" border size="small" class="mb">
        <el-table-column v-if="isPm" label="入选" width="70" align="center">
          <template #default="{ row }">
            <el-radio v-model="selectedId" :value="row.candidate_id" />
          </template>
        </el-table-column>
        <el-table-column prop="brand_name" label="品牌名称" />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="180" />
        <el-table-column label="来源" width="90">
          <template #default="{ row }">{{ row.brand_lib_id ? '库选入' : '手填' }}</template>
        </el-table-column>
      </el-table>

      <el-form v-if="isSupervisor || isPm" label-width="100px">
        <el-form-item label="审批意见">
          <el-input
            v-model="opinion"
            type="textarea"
            :rows="3"
            placeholder="退回时必填；同意可选"
            style="max-width: 520px"
          />
        </el-form-item>
        <el-form-item v-if="isSupervisor">
          <el-button type="primary" @click="doSupervisor('agree')">同意</el-button>
          <el-button type="danger" @click="doSupervisor('reject')">退回</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
        <el-form-item v-else-if="isPm">
          <el-button type="primary" @click="doPm('agree')">同意并入库</el-button>
          <el-button type="danger" @click="doPm('reject')">退回</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
      </el-form>
      <el-button v-else @click="router.back()">返回</el-button>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
.sec {
  margin: 12px 0 8px;
  font-size: 15px;
}
</style>
""",
)

print("done part2")

<script setup>
/**
 * 风险点管控 — 新增 / 编辑风险辨识
 * 风险类型 → 风险点 → 风险细分 均来自配置库联动；风险等级在细分之后。
 */
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import { nowStr } from '../../utils/datetime.js'
import {
  RISK_LEVELS,
  findRiskPointConfig,
  getRiskPointControl,
  listConfigRiskPoints,
  listConfigRiskSegments,
  listConfigRiskTypes,
  normalizeLocationWbsIds,
  riskPersonCandidates,
  saveRiskPointControl,
} from '../../mock/riskManage.js'
import {
  listEntityPartSelectTree,
} from '../../mock/constructionLocation.js'

const route = useRoute()
const router = useRouter()
const { laborProjectId, isHqSelected } = useCurrentProject()

const editId = computed(() => {
  const id = route.params.id
  return id && id !== 'create' ? String(id) : ''
})
const pageTitle = computed(() => (editId.value ? '编辑风险辨识' : '新增风险辨识'))

const form = reactive({
  plan_month: nowStr().slice(0, 7),
  risk_type: '',
  risk_point: '',
  risk_segment: '',
  risk_level: '',
  risk_location_wbs_id: [],
  risk_desc: '',
  control_measure: '',
  plan_start: '',
  plan_end: '',
  control_person_id: '',
  implement_person_id: '',
})

const typeOptions = computed(() => listConfigRiskTypes(laborProjectId.value))
const pointOptions = computed(() => {
  if (!form.risk_type) return []
  return listConfigRiskPoints(laborProjectId.value, form.risk_type)
})
const segmentOptions = computed(() => {
  if (!form.risk_type || !form.risk_point) return []
  return listConfigRiskSegments(laborProjectId.value, form.risk_type, form.risk_point)
})
const partTree = computed(() => listEntityPartSelectTree(laborProjectId.value))
const loaded = ref(false)
/** 避免编辑回填时联动清空 / 覆盖已有措施 */
const syncing = ref(false)

function goBack() {
  router.push('/site-construction/risk-point-control')
}

function openEntityBreakdown() {
  const href = router.resolve({
    path: '/basic-data/entity-breakdown',
    query: laborProjectId.value ? { project_id: laborProjectId.value } : {},
  }).href
  window.open(href, '_blank', 'noopener,noreferrer')
}

function onLocationChange(ids) {
  form.risk_location_wbs_id = normalizeLocationWbsIds(ids)
}

function applyConfigTemplate() {
  if (!form.risk_type || !form.risk_point) return
  const segs = listConfigRiskSegments(laborProjectId.value, form.risk_type, form.risk_point)
  if (!segs.includes((form.risk_segment || '').trim())) return
  const cfg = findRiskPointConfig(
    laborProjectId.value,
    form.risk_type,
    form.risk_point,
    form.risk_segment,
  )
  if (!cfg) return
  if (cfg.control_measure) form.control_measure = cfg.control_measure
  if (cfg.risk_desc && !form.risk_desc) form.risk_desc = cfg.risk_desc
}

function onRiskTypeChange() {
  if (syncing.value) return
  form.risk_point = ''
  form.risk_segment = ''
}

function onRiskPointChange() {
  if (syncing.value) return
  form.risk_segment = ''
  const segs = listConfigRiskSegments(laborProjectId.value, form.risk_type, form.risk_point)
  // 仅一条细分（含空）时自动带出并回填措施
  if (segs.length === 1) {
    form.risk_segment = segs[0]
    applyConfigTemplate()
  }
}

function onRiskSegmentChange() {
  if (syncing.value) return
  applyConfigTemplate()
}

function loadEdit() {
  if (!editId.value) {
    loaded.value = true
    return
  }
  const row = getRiskPointControl(editId.value)
  if (!row || row.project_id !== laborProjectId.value) {
    ElMessage.warning('记录不存在或不属于当前项目')
    goBack()
    return
  }
  syncing.value = true
  form.plan_month = row.plan_month || nowStr().slice(0, 7)
  form.risk_type = row.risk_type || ''
  form.risk_point = row.risk_point || ''
  form.risk_segment = row.risk_segment || ''
  form.risk_level = row.risk_level || ''
  form.risk_location_wbs_id = normalizeLocationWbsIds(row.risk_location_wbs_id)
  form.risk_desc = row.risk_desc || ''
  form.control_measure = row.control_measure || ''
  form.plan_start = row.plan_start || ''
  form.plan_end = row.plan_end || ''
  form.control_person_id = row.control_person_id || ''
  form.implement_person_id = row.implement_person_id || ''
  loaded.value = true
  syncing.value = false
}

onMounted(() => {
  if (isHqSelected.value || !laborProjectId.value) {
    ElMessage.warning('请先选择项目')
    goBack()
    return
  }
  if (!editId.value && !typeOptions.value.length) {
    ElMessage.warning('请先在「风险点管控配置库」维护风险类型')
    goBack()
    return
  }
  loadEdit()
})

watch(
  () => laborProjectId.value,
  () => {
    if (!loaded.value || syncing.value) return
    form.risk_type = ''
    form.risk_point = ''
    form.risk_segment = ''
  },
)

function handleSubmit() {
  const r = saveRiskPointControl(
    laborProjectId.value,
    {
      id: editId.value || undefined,
      ...form,
    },
    '系统管理员',
  )
  if (!r.ok) {
    ElMessage.warning(r.msg)
    return
  }
  ElMessage.success(editId.value ? '已保存' : '已提交')
  goBack()
}
</script>

<template>
  <div v-if="loaded" class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 风险点管控 / {{ pageTitle }}</div>
        <div class="heading-row">
          <el-button link type="primary" @click="goBack">← 返回</el-button>
          <h3 class="page-title">{{ pageTitle }}</h3>
        </div>
      </div>
    </div>

    <el-form label-width="120px" class="risk-form" @submit.prevent>
      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="计划月份" required>
            <el-date-picker
              v-model="form.plan_month"
              type="month"
              value-format="YYYY-MM"
              placeholder="请选择"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="风险类型" required>
            <el-select
              v-model="form.risk_type"
              filterable
              placeholder="请从配置库选择"
              style="width: 100%"
              @change="onRiskTypeChange"
            >
              <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="风险点" required>
            <el-select
              v-model="form.risk_point"
              filterable
              placeholder="请先选风险类型"
              style="width: 100%"
              :disabled="!form.risk_type"
              @change="onRiskPointChange"
            >
              <el-option v-for="p in pointOptions" :key="p" :label="p" :value="p" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="风险细分" required>
            <el-select
              v-model="form.risk_segment"
              filterable
              placeholder="请先选风险点"
              style="width: 100%"
              :disabled="!form.risk_point"
              @change="onRiskSegmentChange"
            >
              <el-option v-for="s in segmentOptions" :key="s" :label="s" :value="s" />
            </el-select>
            <p v-if="form.risk_point && !segmentOptions.length" class="field-hint">
              该风险点下配置库暂无风险细分，请先在配置库维护
            </p>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="风险等级" required>
            <el-select v-model="form.risk_level" placeholder="请选择" style="width: 100%">
              <el-option v-for="lv in RISK_LEVELS" :key="lv" :label="lv" :value="lv" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="风险点位置">
        <div class="loc-row">
          <el-tree-select
            :model-value="form.risk_location_wbs_id"
            :data="partTree"
            multiple
            show-checkbox
            collapse-tags
            collapse-tags-tooltip
            filterable
            clearable
            check-strictly
            node-key="id"
            :props="{ label: 'label', children: 'children', disabled: 'disabled' }"
            :render-after-expand="false"
            default-expand-all
            placeholder="从实体工程分解树多选（选填）"
            style="width: 100%"
            :disabled="!partTree.length"
            aria-label="风险点位置"
            @change="onLocationChange"
          />
          <el-button link type="primary" @click="openEntityBreakdown">去配置</el-button>
        </div>
        <p v-if="!partTree.length" class="field-hint">本项目暂无实体工程分解节点，请先维护后再选</p>
      </el-form-item>

      <el-form-item label="风险描述">
        <el-input
          v-model="form.risk_desc"
          type="textarea"
          :rows="4"
          maxlength="300"
          show-word-limit
          placeholder="选填"
        />
      </el-form-item>

      <el-form-item label="管控措施" required>
        <el-input
          v-model="form.control_measure"
          type="textarea"
          :rows="3"
          maxlength="300"
          show-word-limit
          placeholder="选择配置项后可自动带出，仍可修改"
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="计划开始时间">
            <el-date-picker
              v-model="form.plan_start"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选填"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="计划结束时间">
            <el-date-picker
              v-model="form.plan_end"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选填"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="管控责任人" required>
            <el-select
              v-model="form.control_person_id"
              filterable
              clearable
              placeholder="请选择（本项目人员）"
              style="width: 100%"
            >
              <el-option
                v-for="p in riskPersonCandidates"
                :key="p.id"
                :label="`${p.name}（${p.dept}）`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="8">
          <el-form-item label="实施责任人" required>
            <el-select
              v-model="form.implement_person_id"
              filterable
              clearable
              placeholder="请选择（本项目人员）"
              style="width: 100%"
            >
              <el-option
                v-for="p in riskPersonCandidates"
                :key="p.id"
                :label="`${p.name}（${p.dept}）`"
                :value="p.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <div class="form-footer">
      <el-button @click="goBack">取消</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 20px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
.heading-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
}
.risk-form {
  max-width: 1100px;
}
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
.loc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #909399;
}
</style>

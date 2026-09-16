<script setup>
/**
 * 风险点管控列表（项目级）
 */
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  RISK_LEVELS,
  formatRiskCell,
  listConfigRiskTypes,
  listRiskPointControls,
  removeRiskPointControl,
  riskLocationLabel,
  riskPersonLabel,
} from '../../mock/riskManage.js'

const router = useRouter()
const { laborProjectId, isHqSelected } = useCurrentProject()

const filters = reactive({
  plan_month: '',
  risk_type: '',
  risk_level: '',
})

const tableData = computed(() => {
  if (!laborProjectId.value) return []
  return listRiskPointControls(laborProjectId.value, { ...filters })
})

const typeOptions = computed(() => listConfigRiskTypes(laborProjectId.value))

watch(laborProjectId, () => {
  filters.plan_month = ''
  filters.risk_type = ''
  filters.risk_level = ''
})

function resetFilters() {
  filters.plan_month = ''
  filters.risk_type = ''
  filters.risk_level = ''
}

function goCreate() {
  if (!laborProjectId.value) {
    ElMessage.warning('请先选择项目')
    return
  }
  if (!typeOptions.value.length) {
    ElMessage.warning('请先在「风险点管控配置库」维护至少一条风险类型')
    return
  }
  router.push('/site-construction/risk-point-control/create')
}

function goEdit(row) {
  router.push(`/site-construction/risk-point-control/${row.id}/edit`)
}

function handleDelete(row) {
  ElMessageBox.confirm(`确认删除风险点「${row.risk_point}」？`, '提示', { type: 'warning' })
    .then(() => {
      const r = removeRiskPointControl(laborProjectId.value, row.id)
      if (!r.ok) {
        ElMessage.warning(r.msg)
        return
      }
      ElMessage.success('已删除')
    })
    .catch(() => {})
}
</script>

<template>
  <div class="page page-card">
    <div class="page-head">
      <div>
        <div class="page-breadcrumb">风险管理 / 风险点管控</div>
        <h3 class="page-title">风险点管控</h3>
        <p class="page-tip">按月登记本项目风险辨识与管控责任；风险类型须从配置库选择。</p>
      </div>
      <span class="total-count">共 {{ tableData.length }} 条</span>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="info"
      :closable="false"
      show-icon
      title="本功能仅项目级可用，请先在顶部切换到具体项目。"
      class="mb-16"
    />

    <template v-else>
      <div class="toolbar">
        <el-date-picker
          v-model="filters.plan_month"
          type="month"
          value-format="YYYY-MM"
          placeholder="计划月份"
          style="width: 160px"
          aria-label="计划月份"
        />
        <el-select
          v-model="filters.risk_type"
          clearable
          filterable
          placeholder="风险类型"
          style="width: 160px"
          aria-label="风险类型"
        >
          <el-option v-for="t in typeOptions" :key="t" :label="t" :value="t" />
        </el-select>
        <el-select
          v-model="filters.risk_level"
          clearable
          placeholder="风险等级"
          style="width: 140px"
          aria-label="风险等级"
        >
          <el-option v-for="lv in RISK_LEVELS" :key="lv" :label="lv" :value="lv" />
        </el-select>
        <el-button type="primary" @click="() => {}">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
        <div class="toolbar-spacer" />
        <el-button type="primary" @click="goCreate">+ 新增</el-button>
      </div>

      <el-table :data="tableData" border stripe class="ap-table" style="width: 100%" empty-text="暂无数据">
        <el-table-column prop="plan_month" label="计划月份" width="110" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.plan_month) }}</template>
        </el-table-column>
        <el-table-column prop="risk_type" label="风险类型" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_type) }}</template>
        </el-table-column>
        <el-table-column prop="risk_level" label="风险等级" width="100" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.risk_level) }}</template>
        </el-table-column>
        <el-table-column prop="risk_point" label="风险点" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ formatRiskCell(row.risk_point) }}</template>
        </el-table-column>
        <el-table-column label="风险点位置" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ riskLocationLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="管控责任人" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ riskPersonLabel(row.control_person_id) }}</template>
        </el-table-column>
        <el-table-column label="实施责任人" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ riskPersonLabel(row.implement_person_id) }}</template>
        </el-table-column>
        <el-table-column prop="plan_start" label="计划开始" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.plan_start) }}</template>
        </el-table-column>
        <el-table-column prop="plan_end" label="计划结束" width="120" align="center">
          <template #default="{ row }">{{ formatRiskCell(row.plan_end) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="goEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
}
.page-title {
  margin: 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2329;
}
.page-tip {
  margin: 0;
  font-size: 13px;
  color: #909399;
}
.total-count {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  padding-top: 8px;
}
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.toolbar-spacer {
  flex: 1;
}
.mb-16 {
  margin-bottom: 16px;
}
.ap-table {
  font-size: 13px;
}
</style>

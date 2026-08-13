<script setup>
/**
 * 考勤统计
 * - 指挥部：按项目汇总出勤率（工种/管理人员/建筑工人/特种）
 * - 项目级：按人员汇总（不做班组统计）
 */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import {
  selectedProjectId,
  useLaborProjectScope,
} from '../../composables/useCurrentProject'
import {
  getPersonStats,
  workTypes,
  buildHqAttendanceStatsByProject,
} from '../../mock/laborAttendanceStats'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useLaborProjectScope()

const hqDate = ref('2026-07-20')
const hqKeyword = ref('')

const hqRows = computed(() => buildHqAttendanceStatsByProject(hqDate.value))

const hqFiltered = computed(() => {
  const kw = hqKeyword.value.trim()
  if (!kw) return hqRows.value
  return hqRows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function resetHq() {
  hqKeyword.value = ''
  hqDate.value = '2026-07-20'
}

function handleHqSearch() {
  ElMessage.success(`已按条件查询，共 ${hqFiltered.value.length} 个项目`)
}

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  await router.push('/labor/attendance')
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}

const personFilters = ref({ name: '', company: '', workType: '' })

const allPersonList = computed(() => getPersonStats(scopeProjectId.value))

const filteredPersonList = computed(() => {
  return allPersonList.value.filter((row) => {
    if (personFilters.value.name && !row.name.includes(personFilters.value.name.trim())) return false
    if (personFilters.value.company && !row.company.includes(personFilters.value.company.trim()))
      return false
    if (personFilters.value.workType && row.workType !== personFilters.value.workType) return false
    return true
  })
})

const personSummary = computed(() => ({
  total: filteredPersonList.value.length,
  avgRate: filteredPersonList.value.length
    ? `${(
        filteredPersonList.value.reduce((sum, row) => sum + parseFloat(row.attendanceRate), 0) /
        filteredPersonList.value.length
      ).toFixed(1)}%`
    : '-',
  overtime: filteredPersonList.value.reduce((sum, row) => sum + row.overtimeHours, 0),
}))

watch(scopeProjectId, () => {
  personFilters.value = { name: '', company: '', workType: '' }
})

function handleReset() {
  personFilters.value = { name: '', company: '', workType: '' }
}

function handlePersonSearch() {
  ElMessage.success(`已按条件查询，共 ${filteredPersonList.value.length} 人`)
}

function formatRate(n) {
  return `${Number(n).toFixed(1)}%`
}
</script>

<template>
  <div v-if="isHqSelected" class="att-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 考勤统计</div>
      <h1 class="page-title">考勤统计</h1>
      <p class="page-tip">按项目汇总出勤率（含管理人员/建筑工人/特种）；班组级明细不在平台统计。</p>
    </div>

    <div class="filter-bar">
      <el-date-picker
        v-model="hqDate"
        type="date"
        value-format="YYYY-MM-DD"
        placeholder="统计日期"
        :clearable="false"
        style="width: 160px"
      />
      <el-input
        v-model="hqKeyword"
        clearable
        placeholder="项目名称"
        style="width: 220px"
        :prefix-icon="Search"
      />
      <el-button type="primary" :icon="Search" @click="handleHqSearch">查询</el-button>
      <el-button :icon="Refresh" @click="resetHq">重置</el-button>
    </div>

    <el-table :data="hqFiltered" stripe border empty-text="暂无项目考勤数据">
      <el-table-column prop="project_name" label="项目名称" min-width="220" fixed show-overflow-tooltip />
      <el-table-column label="全部出勤率" width="120" align="center">
        <template #default="{ row }">{{ formatRate(row.allRate) }}</template>
      </el-table-column>
      <el-table-column label="管理人员出勤率" width="140" align="center">
        <template #default="{ row }">{{ formatRate(row.manageRate) }}</template>
      </el-table-column>
      <el-table-column label="建筑工人出勤率" width="140" align="center">
        <template #default="{ row }">{{ formatRate(row.laborRate) }}</template>
      </el-table-column>
      <el-table-column label="特种作业人员出勤率" width="160" align="center">
        <template #default="{ row }">{{ formatRate(row.specialRate) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="130" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>

  <div v-else class="att-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">人员实名制管理 / 考勤统计</div>
      <h1 class="page-title">考勤统计</h1>
      <p class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">按人员汇总出勤（对接闸机数据）。班组级明细由项目自有系统完成，平台不做班组排行。</p>
    </div>

    <div class="page-layout">
      <section class="stats-panel">
        <div class="panel-head">
          <div class="panel-stats">
            <span>人员 {{ personSummary.total }} 人</span>
            <span>平均出勤率 {{ personSummary.avgRate }}</span>
            <span>加班合计 {{ personSummary.overtime }} h</span>
          </div>
        </div>

        <div class="filter-bar">
          <el-input v-model="personFilters.name" placeholder="姓名" clearable style="width: 120px" />
          <el-input
            v-model="personFilters.company"
            placeholder="施工单位"
            clearable
            style="width: 140px"
          />
          <el-select v-model="personFilters.workType" placeholder="工种" clearable style="width: 110px">
            <el-option v-for="t in workTypes" :key="t" :label="t" :value="t" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search" @click="handlePersonSearch">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>

        <el-table :data="filteredPersonList" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="company" label="施工单位" min-width="120" />
          <el-table-column prop="workType" label="工种" width="90" />
          <el-table-column prop="attendanceDays" label="出勤天数" width="90" align="center" />
          <el-table-column prop="totalHours" label="总工时(h)" width="95" align="center" />
          <el-table-column prop="avgHours" label="日均(h)" width="85" align="center" />
          <el-table-column prop="lateCount" label="迟到" width="70" align="center" />
          <el-table-column prop="earlyLeaveCount" label="早退" width="70" align="center" />
          <el-table-column prop="absentCount" label="缺勤" width="70" align="center" />
          <el-table-column prop="overtimeHours" label="加班(h)" width="85" align="center" />
          <el-table-column prop="attendanceRate" label="出勤率" width="90" align="center" />
        </el-table>
      </section>
    </div>
  </div>
</template>

<style scoped>
.att-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; }
.page-scope { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: var(--ap-text); }
.page-tip { margin-top: 0; font-size: 12px; color: var(--ap-text-muted); }
.stats-panel {
  border: 1px solid var(--ap-border);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}
.panel-head { margin-bottom: 12px; }
.panel-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--ap-text-secondary);
}
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; align-items: center; }
</style>

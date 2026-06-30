<script setup>
import { ref } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { attendancePersonList, attendanceTeamList, workTypes } from '../../mock/laborManagement'

const activeTab = ref('person')
const personFilters = ref({ name: '', company: '', workType: '' })

const filteredPersonList = ref(attendancePersonList)

function handleSearch() {
  filteredPersonList.value = attendancePersonList.filter((row) => {
    if (personFilters.value.name && !row.name.includes(personFilters.value.name.trim())) return false
    if (personFilters.value.company && !row.company.includes(personFilters.value.company.trim())) return false
    if (personFilters.value.workType && row.workType !== personFilters.value.workType) return false
    return true
  })
}

function handleReset() {
  personFilters.value = { name: '', company: '', workType: '' }
  filteredPersonList.value = attendancePersonList
}
</script>

<template>
  <div class="att-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">劳务管理 / 考勤统计</div>
      <h1 class="page-title">考勤统计</h1>
      <p class="page-tip">在场人数统计口径：当日已打上班卡且未打下班卡。</p>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="按人员统计" name="person">
        <div class="filter-bar">
          <el-input v-model="personFilters.name" placeholder="姓名" clearable style="width: 120px" />
          <el-input v-model="personFilters.company" placeholder="施工单位" clearable style="width: 140px" />
          <el-select v-model="personFilters.workType" placeholder="工种" clearable style="width: 110px">
            <el-option v-for="t in workTypes" :key="t" :label="t" :value="t" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search" @click="handleSearch">查询</el-button>
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
      </el-tab-pane>

      <el-tab-pane label="按班组统计" name="team">
        <el-table :data="attendanceTeamList" border stripe class="ap-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="team" label="班组" min-width="120" />
          <el-table-column prop="company" label="施工单位" min-width="120" />
          <el-table-column prop="headcount" label="人数" width="80" align="center" />
          <el-table-column prop="presentDays" label="出勤人天" width="100" align="center" />
          <el-table-column prop="avgRate" label="平均出勤率" width="110" align="center" />
          <el-table-column prop="absentTotal" label="缺勤合计" width="90" align="center" />
          <el-table-column prop="overtimeHours" label="加班(h)" width="90" align="center" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.att-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; }
.page-tip { margin-top: 8px; font-size: 12px; color: var(--ap-text-muted); }
.filter-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
</style>

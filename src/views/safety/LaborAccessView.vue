<script setup>
import { ref, computed } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import {
  accessStatsSummary,
  accessStatsByProject,
  projectList,
  getAccessBlockDetails,
  maskIdCard,
  blockTypeOptions,
} from '../../mock/laborManagement'

const filters = ref({ projectId: '' })
const detailVisible = ref(false)
const currentProject = ref(null)
const detailKeyword = ref('')
const detailBlockType = ref('')

const filteredList = computed(() => {
  if (!filters.value.projectId) return accessStatsByProject
  return accessStatsByProject.filter((row) => row.projectId === filters.value.projectId)
})

const summary = computed(() => accessStatsSummary)

const blockDetails = computed(() => {
  if (!currentProject.value) return []
  return getAccessBlockDetails(currentProject.value.projectId)
})

const filteredDetails = computed(() => {
  const kw = detailKeyword.value.trim()
  return blockDetails.value.filter((row) => {
    if (detailBlockType.value && row.blockType !== detailBlockType.value) return false
    if (!kw) return true
    const hay = `${row.name}${row.idCard}${row.phone}${row.company}${row.team}${row.blockReason}`
    return hay.includes(kw)
  })
})

function handleReset() {
  filters.value = { projectId: '' }
}

function openDetail(row) {
  currentProject.value = row
  detailKeyword.value = ''
  detailBlockType.value = ''
  detailVisible.value = true
}

function blockTypeTagClass(type) {
  if (type === '黑名单') return 'ap-tag-high'
  if (type === '证件过期') return 'ap-tag-medium'
  if (type === '违规准入') return 'ap-tag-high'
  return 'ap-tag-draft'
}
</script>

<template>
  <div class="access-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">劳务管理 / 准入核验</div>
      <h1 class="page-title">准入核验</h1>
    </div>

    <div class="stats-row">
      <div class="stat-card"><span class="stat-label">统计项目</span><span class="stat-value">{{ summary.projectCount }}</span></div>
      <div class="stat-card"><span class="stat-label">在场人数</span><span class="stat-value">{{ summary.totalOnSite.toLocaleString() }}</span></div>
      <div class="stat-card"><span class="stat-label">今日核验</span><span class="stat-value">{{ summary.todayAccess.toLocaleString() }}</span></div>
      <div class="stat-card"><span class="stat-label">通过</span><span class="stat-value ok">{{ summary.passCount.toLocaleString() }}</span></div>
      <div class="stat-card"><span class="stat-label">拦截</span><span class="stat-value danger">{{ summary.blockCount }}</span></div>
      <div class="stat-card"><span class="stat-label">通过率</span><span class="stat-value">{{ summary.passRate }}</span></div>
    </div>

    <div class="filter-bar">
      <el-select v-model="filters.projectId" placeholder="全部项目" clearable filterable style="width: 260px">
        <el-option v-for="p in projectList" :key="p.id" :label="p.name" :value="p.id" />
      </el-select>
      <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
      <el-button :icon="Refresh" @click="handleReset">重置</el-button>
    </div>

    <div class="table-section">
      <div class="section-title">各项目准入核验统计</div>
      <el-table :data="filteredList" border stripe class="ap-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="projectName" label="项目" min-width="180" show-overflow-tooltip />
        <el-table-column prop="onSite" label="在场人数" width="90" align="center">
          <template #header>
            <el-tooltip content="已打上班卡且未打下班卡" placement="top">
              <span>在场人数</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="todayAccess" label="今日核验" width="90" align="center" />
        <el-table-column prop="passCount" label="通过" width="80" align="center" />
        <el-table-column prop="blockCount" label="拦截" width="80" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.blockCount > 5 }">{{ row.blockCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="passRate" label="通过率" width="90" align="center" />
        <el-table-column prop="violationCount" label="违规准入" width="90" align="center" />
        <el-table-column prop="noTraining" label="未培训" width="80" align="center" />
        <el-table-column prop="expiredCert" label="证件过期" width="90" align="center" />
        <el-table-column prop="blacklist" label="黑名单" width="80" align="center" />
        <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="detailVisible"
      :title="`${currentProject?.projectName || ''} - 拦截明细`"
      width="960px"
      destroy-on-close
      class="block-detail-dialog"
    >
      <div class="detail-summary">
        今日拦截 <strong>{{ currentProject?.blockCount ?? 0 }}</strong> 人次，
        明细记录 <strong>{{ blockDetails.length }}</strong> 条
      </div>

      <div class="detail-filter">
        <el-input
          v-model="detailKeyword"
          placeholder="姓名 / 身份证 / 单位 / 拦截原因"
          clearable
          :prefix-icon="Search"
          style="width: 280px"
        />
        <el-select v-model="detailBlockType" placeholder="拦截类型" clearable style="width: 130px">
          <el-option v-for="opt in blockTypeOptions" :key="opt" :label="opt" :value="opt" />
        </el-select>
      </div>

      <el-table :data="filteredDetails" border stripe class="ap-table" max-height="420">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="姓名" width="90" />
        <el-table-column label="身份证号" min-width="170">
          <template #default="{ row }">{{ maskIdCard(row.idCard) }}</template>
        </el-table-column>
        <el-table-column label="手机号" width="130">
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column prop="workType" label="工种" width="90" />
        <el-table-column prop="company" label="分包单位" min-width="110" show-overflow-tooltip />
        <el-table-column prop="team" label="班组" min-width="100" show-overflow-tooltip />
        <el-table-column label="拦截类型" width="100" align="center">
          <template #default="{ row }">
            <span class="ap-status-tag" :class="blockTypeTagClass(row.blockType)">{{ row.blockType }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="blockReason" label="拦截原因" min-width="160" show-overflow-tooltip />
        <el-table-column prop="gate" label="闸机" width="120" show-overflow-tooltip />
        <el-table-column prop="time" label="拦截时间" width="160" />
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
.access-page { padding: 20px 24px 24px; }
.page-header { margin-bottom: 16px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; }
.stats-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 16px; }
.stat-card { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; }
.stat-label { font-size: 13px; color: var(--ap-text-muted); }
.stat-value { font-size: 22px; font-weight: 700; color: var(--ap-primary); }
.stat-value.ok { color: var(--ap-success); }
.stat-value.danger { color: var(--ap-danger); }
.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; }
.table-section { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px 20px 20px; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
.text-danger { color: var(--ap-danger); font-weight: 600; }
.detail-summary { margin-bottom: 12px; font-size: 13px; color: var(--ap-text-secondary); }
.detail-summary strong { color: var(--ap-danger); font-size: 16px; }
.detail-filter { display: flex; gap: 8px; margin-bottom: 12px; }
</style>

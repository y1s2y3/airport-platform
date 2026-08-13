<script setup>
/**
 * 品牌报审统计（指挥部 · 质量看板）
 * 按项目汇总报审单状态，支持下钻至项目报审台账
 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId } from '../../../composables/useCurrentProject'
import {
  buildHqBrandApprovalStatsByProject,
  buildHqBrandApprovalSummary,
} from '../../../mock/brand.js'

const router = useRouter()
const keyword = ref('')

const rows = computed(() => buildHqBrandApprovalStatsByProject())
const summary = computed(() => buildHqBrandApprovalSummary())

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function reset() {
  keyword.value = ''
}

function handleSearch() {
  ElMessage.success(`已按条件查询，共 ${filtered.value.length} 个项目`)
}

/** 下钻：切换到项目并打开品牌报审台账 */
async function drillToProject(row, status = '') {
  if (!row?.project_id) return
  const path = status === 'approved' || !status
    ? '/qm/brand/ledger'
    : '/qm/brand/applications'
  await router.push(path)
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量看板 / 品牌报审统计</div>
      <h1 class="page-title">品牌报审统计</h1>
      <p class="page-tip">
        指挥部按项目汇总品牌报审数据。点击项目名称或「下钻」可切换至该项目并打开报审台账/申请列表。
      </p>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <span class="kpi-label">覆盖项目数</span>
        <span class="kpi-value">{{ summary.projectCount }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">报审单合计</span>
        <span class="kpi-value">{{ summary.total }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">审批中</span>
        <span class="kpi-value warn">{{ summary.in_approval }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">已通过</span>
        <span class="kpi-value ok">{{ summary.approved }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">已驳回</span>
        <span class="kpi-value danger">{{ summary.rejected }}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">已撤回</span>
        <span class="kpi-value">{{ summary.withdrawn }}</span>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="项目名称 / 编号"
        style="width: 260px"
        :prefix-icon="Search"
      />
      <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无报审统计数据">
      <el-table-column type="index" label="序号" width="64" align="center" />
      <el-table-column label="项目名称" min-width="200">
        <template #default="{ row }">
          <el-button link type="primary" @click="drillToProject(row)">{{ row.project_name }}</el-button>
        </template>
      </el-table-column>
      <el-table-column prop="project_id" label="项目编号" width="100" />
      <el-table-column prop="total" label="报审合计" width="100" align="center" />
      <el-table-column prop="in_approval" label="审批中" width="90" align="center" />
      <el-table-column prop="approved" label="已通过" width="90" align="center" />
      <el-table-column prop="rejected" label="已驳回" width="90" align="center" />
      <el-table-column prop="withdrawn" label="已撤回" width="90" align="center" />
      <el-table-column label="操作" width="160" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="drillToProject(row, 'approved')">台账</el-button>
          <el-button link type="primary" @click="drillToProject(row, 'all')">申请</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 16px;
}
.page-breadcrumb {
  font-size: 13px;
  color: var(--ap-text-muted, #909399);
  margin-bottom: 8px;
}
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
.page-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.kpi-card {
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kpi-label {
  font-size: 12px;
  color: var(--ap-text-muted, #909399);
}
.kpi-value {
  font-size: 22px;
  font-weight: 600;
  color: var(--ap-text, #303133);
}
.kpi-value.ok {
  color: #67c23a;
}
.kpi-value.warn {
  color: #e6a23c;
}
.kpi-value.danger {
  color: #f56c6c;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
@media (max-width: 1200px) {
  .kpi-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>

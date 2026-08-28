<script setup>
/**
 * 品牌报审（指挥部 · 质量看板）
 * 按项目汇总报审状态与台账品牌数；操作仅「查看项目详情」
 */
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId } from '../../../composables/useCurrentProject'
import {
  buildHqBrandApprovalStatsByProject,
  buildHqBrandApprovalSummary,
  paginateBrandRows,
} from '../../../mock/brand.js'
import '../qm-hq-stats.css'

const router = useRouter()
const keyword = ref('')
const page = ref(1)
const pageSize = ref(20)

const rows = computed(() => buildHqBrandApprovalStatsByProject())
const summary = computed(() => buildHqBrandApprovalSummary())

const filteredAll = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

const total = computed(() => filteredAll.value.length)

const filtered = computed(
  () => paginateBrandRows(filteredAll.value, page.value, pageSize.value).items,
)

function reset() {
  keyword.value = ''
  page.value = 1
}

watch(keyword, () => {
  page.value = 1
})

function handleSearch() {
  page.value = 1
  ElMessage.success(`已按条件查询，共 ${total.value} 个项目`)
}

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  await router.push('/qm/brand/ledger')
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">质量看板 / 品牌报审</div>
      <h1 class="page-title">品牌报审</h1>
      <p class="page-tip">指挥部按项目汇总品牌报审数据。操作仅支持查看项目详情（进入该项目品牌台账）。</p>
    </div>

    <div class="hq-stat-row">
      <div class="hq-stat-card">
        <span class="hq-stat-label">覆盖项目数</span>
        <span class="hq-stat-value">{{ summary.projectCount }}</span>
      </div>
      <div class="hq-stat-card">
        <span class="hq-stat-label">品牌总数</span>
        <span class="hq-stat-value">{{ summary.ledger_count }}</span>
      </div>
      <div class="hq-stat-card">
        <span class="hq-stat-label">报审单合计</span>
        <span class="hq-stat-value">{{ summary.total }}</span>
      </div>
      <div class="hq-stat-card">
        <span class="hq-stat-label">待审批</span>
        <span class="hq-stat-value warn">{{ summary.pending }}</span>
      </div>
      <div class="hq-stat-card">
        <span class="hq-stat-label">审批中</span>
        <span class="hq-stat-value warn">{{ summary.in_approval }}</span>
      </div>
      <div class="hq-stat-card">
        <span class="hq-stat-label">已通过</span>
        <span class="hq-stat-value ok">{{ summary.approved }}</span>
      </div>
      <div class="hq-stat-card">
        <span class="hq-stat-label">已驳回</span>
        <span class="hq-stat-value danger">{{ summary.rejected }}</span>
      </div>
      <div class="hq-stat-card">
        <span class="hq-stat-label">已撤回</span>
        <span class="hq-stat-value">{{ summary.withdrawn }}</span>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="项目名称 / 编号"
        style="width: 260px"
        :prefix-icon="Search" aria-label="项目名称 / 编号"/>
      <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无报审统计数据" class="stats-table">
      <el-table-column type="index" label="序号" width="64" align="center" />
      <el-table-column prop="project_name" label="项目名称" min-width="200" show-overflow-tooltip />
      <el-table-column prop="project_id" label="项目编号" width="100" />
      <el-table-column prop="ledger_count" label="品牌总数" width="110" align="center" />
      <el-table-column prop="total" label="报审合计" width="100" align="center" />
      <el-table-column label="待审批" width="90" align="center">
        <template #default="{ row }">
          <span :class="{ 'warn-num': row.pending > 0 }">{{ row.pending }}</span>
        </template>
      </el-table-column>
      <el-table-column label="审批中" width="90" align="center">
        <template #default="{ row }">
          <span :class="{ 'warn-num': row.in_approval > 0 }">{{ row.in_approval }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="approved" label="已通过" width="90" align="center" />
      <el-table-column label="已驳回" width="90" align="center">
        <template #default="{ row }">
          <span :class="{ 'danger-num': row.rejected > 0 }">{{ row.rejected }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="withdrawn" label="已撤回" width="90" align="center" />
      <el-table-column label="操作" width="130" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="total > 0" class="pagination-wrap">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
      />
    </div>
  </div>
</template>

<style scoped>
.qm-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page-header {
  margin-bottom: 4px;
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
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0 12px;
}
.stats-table {
  width: 100%;
}
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>

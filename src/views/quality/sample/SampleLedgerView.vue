<script setup>
import './sample-page.css'
import '../qm-hq-stats.css'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, ArrowLeft, View } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../../config/projectOptions'
import {
  BIZ_TYPE_LABEL,
  buildHqSampleStatsByProject,
  buildHqSampleSummary,
  listLedger,
  statusLabel,
  statusTagType,
} from '../../../mock/sample.js'

const router = useRouter()
const route = useRoute()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const fromHq = computed(() => route.query.from === 'hq')
const queryProjectId = computed(() => String(route.query.projectId || '').trim())

const isHqLedgerPage = computed(() => route.path.startsWith('/hq/qm/sample/ledger'))

const viewProjectId = computed(() => {
  if (fromHq.value && queryProjectId.value) return queryProjectId.value
  if (!isHqSelected.value && scopeProjectId.value) return scopeProjectId.value
  return ''
})

const viewProjectLabel = computed(() => {
  if (!viewProjectId.value) return ''
  const found = COC_PROJECT_OPTIONS.find((p) => p.id === viewProjectId.value)
  return found?.label || viewProjectId.value
})

const canViewProjectLedger = computed(() => !isHqLedgerPage.value && !!viewProjectId.value)

const keyword = ref('')
const bizType = ref('')
const usePart = ref('')
const hqKeyword = ref('')

const hqRows = computed(() => buildHqSampleStatsByProject())
const hqSummary = computed(() => buildHqSampleSummary())
const hqFiltered = computed(() => {
  const kw = hqKeyword.value.trim()
  if (!kw) return hqRows.value
  return hqRows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

const list = computed(() => {
  if (!canViewProjectLedger.value) return []
  return listLedger(viewProjectId.value, {
    bizType: bizType.value,
    keyword: keyword.value,
    usePart: usePart.value,
  })
})

function reset() {
  keyword.value = ''
  bizType.value = ''
  usePart.value = ''
}

function resetHq() {
  hqKeyword.value = ''
}

function handleHqSearch() {
  ElMessage.success(`已按条件查询，共 ${hqFiltered.value.length} 个项目`)
}

function openDetail(row) {
  if (row.biz_type === 'material') {
    router.push(`/qm/sample/material/applications/detail?id=${row.application_id}`)
  } else {
    router.push(`/qm/sample/process/applications/detail?id=${row.application_id}`)
  }
}

function viewProjectDetail(row) {
  if (!row?.project_id) return
  router.push({
    path: '/qm/sample/ledger',
    query: { from: 'hq', projectId: row.project_id },
  })
}

function goBackToHQ() {
  router.push('/hq/qm/sample/ledger')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ isHqLedgerPage || fromHq ? '质量看板' : '样板管理' }} / 样板台账
      </div>
      <div class="hq-title-row">
        <el-button
          v-if="!isHqLedgerPage && fromHq && canViewProjectLedger"
          link
          type="primary"
          :icon="ArrowLeft"
          @click="goBackToHQ"
        >
          返回
        </el-button>
        <h1 class="page-title">样板台账</h1>
        <span
          v-if="!isHqLedgerPage && fromHq && canViewProjectLedger"
          class="hq-title-project"
        >
          {{ viewProjectLabel }}
        </span>
      </div>
      <p v-if="isHqLedgerPage" class="page-tip">
        指挥部按项目汇总样板报审与台账数据。点击「查看详情」进入该项目样板台账（不切换顶栏项目）。
      </p>
      <p v-else class="page-tip">
        当前：{{
          viewProjectLabel || (isHqSelected ? '请从看板选择项目查看' : scopeProjectLabel)
        }}
        <template v-if="fromHq">（指挥部只读）</template>
      </p>
    </div>

    <template v-if="isHqLedgerPage">
      <div class="hq-stat-row">
        <div class="hq-stat-card">
          <span class="hq-stat-label">覆盖项目数</span>
          <span class="hq-stat-value">{{ hqSummary.projectCount }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">台账条数</span>
          <span class="hq-stat-value">{{ hqSummary.ledger_count }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">材料定样已通过</span>
          <span class="hq-stat-value ok">{{ hqSummary.material_approved }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">工序样板已通过</span>
          <span class="hq-stat-value ok">{{ hqSummary.process_approved }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">审批中</span>
          <span class="hq-stat-value warn">{{ hqSummary.in_approval }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">已驳回</span>
          <span class="hq-stat-value danger">{{ hqSummary.rejected }}</span>
        </div>
        <div class="hq-stat-card">
          <span class="hq-stat-label">已撤回</span>
          <span class="hq-stat-value">{{ hqSummary.withdrawn }}</span>
        </div>
      </div>

      <div class="filter-bar">
        <el-input
          v-model="hqKeyword"
          clearable
          placeholder="项目名称"
          style="width: 260px"
          :prefix-icon="Search"
          aria-label="项目名称"
        />
        <el-button type="primary" :icon="Search" @click="handleHqSearch">查询</el-button>
        <el-button :icon="Refresh" @click="resetHq">重置</el-button>
      </div>

      <el-table :data="hqFiltered" stripe border empty-text="暂无样板统计数据">
        <el-table-column type="index" label="序号" width="64" align="center" />
        <el-table-column prop="project_name" label="项目名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ledger_count" label="台账条数" width="100" align="center" />
        <el-table-column prop="material_approved" label="材料定样已通过" width="140" align="center" />
        <el-table-column prop="process_approved" label="工序样板已通过" width="140" align="center" />
        <el-table-column label="审批中" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'warn-num': row.in_approval > 0 }">{{ row.in_approval }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已驳回" width="90" align="center">
          <template #default="{ row }">
            <span :class="{ 'danger-num': row.rejected > 0 }">{{ row.rejected }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="withdrawn" label="已撤回" width="90" align="center" />
        <el-table-column label="操作" width="110" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :icon="View" @click="viewProjectDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <template v-else>
      <el-alert
        v-if="!canViewProjectLedger"
        type="warning"
        :closable="false"
        show-icon
        title="请先在顶部切换到具体项目，或从指挥部样板台账进入"
        class="mb"
      />

      <template v-else>
        <div class="filter-bar">
          <el-input
            v-model="keyword"
            clearable
            placeholder="编号 / 名称 / 部位"
            style="width: 220px"
            :prefix-icon="Search"
            aria-label="编号 / 名称 / 部位"
          />
          <el-select v-model="bizType" clearable placeholder="类型" style="width: 140px" aria-label="类型">
            <el-option
              v-for="(label, val) in BIZ_TYPE_LABEL"
              :key="val"
              :label="label"
              :value="val"
            />
          </el-select>
          <el-input v-model="usePart" clearable placeholder="部位" style="width: 160px" aria-label="部位" />
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="list" stripe border empty-text="暂无已通过样板">
          <el-table-column prop="application_id" label="单据编号" width="120" />
          <el-table-column label="类型" width="100">
            <template #default="{ row }">{{ BIZ_TYPE_LABEL[row.biz_type] }}</template>
          </el-table-column>
          <el-table-column prop="title" label="名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="use_part" label="施工部位" min-width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="finish_time" label="通过时间" width="170" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </template>
  </div>
</template>

<style scoped>
.mb {
  margin-bottom: 12px;
}
</style>

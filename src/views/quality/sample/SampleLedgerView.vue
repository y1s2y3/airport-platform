<script setup>
import './sample-page.css'
import '../qm-hq-stats.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId, useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  BIZ_TYPE_LABEL,
  buildHqSampleStatsByProject,
  buildHqSampleSummary,
  listLedger,
  statusLabel,
  statusTagType,
} from '../../../mock/sample.js'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()
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
  if (isHqSelected.value) return []
  const projectId = scopeProjectId.value
  if (!projectId) return []
  return listLedger(projectId, {
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

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">
        {{ isHqSelected ? '质量看板' : '样板管理' }} / 样板台账
      </div>
      <h1 class="page-title">样板台账</h1>
      <p v-if="isHqSelected" class="page-tip">
        指挥部按项目汇总样板报审与台账数据。操作仅支持查看项目详情（进入该项目样板台账）。
      </p>
    </div>

    <template v-if="isHqSelected">
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
          <span class="hq-stat-label">待审批</span>
          <span class="hq-stat-value warn">{{ hqSummary.pending }}</span>
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
          placeholder="项目名称 / 编号"
          style="width: 260px"
          :prefix-icon="Search"
        />
        <el-button type="primary" :icon="Search" @click="handleHqSearch">查询</el-button>
        <el-button :icon="Refresh" @click="resetHq">重置</el-button>
      </div>

      <el-table :data="hqFiltered" stripe border empty-text="暂无样板统计数据">
        <el-table-column type="index" label="序号" width="64" align="center" />
        <el-table-column prop="project_name" label="项目名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="project_id" label="项目编号" width="100" />
        <el-table-column prop="ledger_count" label="台账条数" width="100" align="center" />
        <el-table-column prop="material_approved" label="材料定样已通过" width="140" align="center" />
        <el-table-column prop="process_approved" label="工序样板已通过" width="140" align="center" />
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
    </template>

    <el-alert
      v-else-if="!scopeProjectId"
      type="warning"
      :closable="false"
      show-icon
      title="请先在顶部切换到具体项目"
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
        />
        <el-select v-model="bizType" clearable placeholder="类型" style="width: 140px">
          <el-option
            v-for="(label, val) in BIZ_TYPE_LABEL"
            :key="val"
            :label="label"
            :value="val"
          />
        </el-select>
        <el-input v-model="usePart" clearable placeholder="部位" style="width: 160px" />
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
  </div>
</template>

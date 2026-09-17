<script setup>
import './engineering-work-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useCurrentProject } from '../../composables/useCurrentProject'
import {
  listEngineeringWorks,
  STATUS_LABEL,
  NODE_LABEL,
  statusTagType,
  emptyCell,
  formatSupervisorDisplay,
} from '../../mock/engineeringWork.js'

const router = useRouter()
const { isHqSelected, laborProjectId, projectLabel } = useCurrentProject()
const keyword = ref('')
const statusFilter = ref('')
const appliedKeyword = ref('')
const appliedStatus = ref('')

const list = computed(() => {
  if (isHqSelected.value || !laborProjectId.value) return []
  return listEngineeringWorks(laborProjectId.value, {
    keyword: appliedKeyword.value,
    status: appliedStatus.value,
  })
})

function onQuery() {
  appliedKeyword.value = keyword.value
  appliedStatus.value = statusFilter.value
}

function reset() {
  keyword.value = ''
  statusFilter.value = ''
  appliedKeyword.value = ''
  appliedStatus.value = ''
}

function goCreate() {
  router.push('/site-construction/engineering-work/edit')
}

function goDetail(row) {
  router.push(`/site-construction/engineering-work/detail?id=${row.id}`)
}

function copyFromRejected(row) {
  router.push(`/site-construction/engineering-work/edit?copyFrom=${row.id}`)
}
</script>

<template>
  <div class="ew-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">施工作业申报 / 工程作业申报</div>
      <h1 class="page-title">工程作业申报</h1>
      <p class="page-tip">
        从每日施工作业选择危险作业并申报，监理在个人中心待办审批 · 当前：{{
          isHqSelected ? '请切换到具体项目' : projectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="工程作业申报为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="单号 / 作业类别 / 区域 / 施工单位"
          style="width: 280px"
          :prefix-icon="Search"
          aria-label="单号 / 作业类别 / 区域 / 施工单位"
          @keyup.enter="onQuery"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onQuery">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="goCreate">新建申报</el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无工程作业申报单">
        <el-table-column prop="biz_no" label="申报单号" width="150" />
        <el-table-column label="作业类别" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.snapshot?.dangerWorkCategory) }}</template>
        </el-table-column>
        <el-table-column label="施工日期" width="120">
          <template #default="{ row }">{{ emptyCell(row.snapshot?.reportDate) }}</template>
        </el-table-column>
        <el-table-column label="施工区域" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.snapshot?.workArea) }}</template>
        </el-table-column>
        <el-table-column label="施工单位" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ emptyCell(row.snapshot?.contractor) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前节点" width="110">
          <template #default="{ row }">{{ NODE_LABEL[row.current_node_key] || '--' }}</template>
        </el-table-column>
        <el-table-column label="监理审批人" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ formatSupervisorDisplay(row) }}</template>
        </el-table-column>
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ emptyCell(row.submit_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="goDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="primary"
              @click="copyFromRejected(row)"
            >
              重新申报
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

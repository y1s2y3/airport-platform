<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import { BIZ_TYPE_LABEL, listLedger, STATUS_LABEL, statusTagType } from '../../../mock/sample.js'
import SampleDemoRoleBar from './SampleDemoRoleBar.vue'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const bizType = ref('')
const usePart = ref('')

const list = computed(() => {
  const projectId = isHqSelected.value ? '' : scopeProjectId.value
  if (!isHqSelected.value && !projectId) return []
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

function openDetail(row) {
  if (row.biz_type === 'material') {
    router.push(`/qm/sample/material/applications/detail?id=${row.application_id}`)
  } else {
    router.push(`/qm/sample/process/applications/detail?id=${row.application_id}`)
  }
}

function openQr(row) {
  router.push(`/qm/sample/process/qr?id=${row.application_id}`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 样板台账</div>
      <h1 class="page-title">样板台账</h1>
      <p class="page-tip">
        仅展示已通过单据（视图）· 当前：{{
          isHqSelected ? '指挥部（跨项目）' : scopeProjectLabel || '请选择项目'
        }}
      </p>
    </div>

    <SampleDemoRoleBar />

    <el-alert
      v-if="!isHqSelected && !scopeProjectId"
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
        <el-table-column prop="use_part" label="部位" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="finish_time" label="通过时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.biz_type === 'process' && row.has_qr"
              link
              type="success"
              @click="openQr(row)"
            >
              二维码
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listProcessApps,
  STATUS_LABEL,
  statusTagType,
  resubmitSample,
} from '../../../mock/sample.js'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listProcessApps(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

async function onResubmit(row) {
  try {
    await ElMessageBox.confirm(`确认重提 ${row.application_id}？`, '重提', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = resubmitSample('process', row.application_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已重提，进入待监理审')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 关键工序样板报审</div>
      <h1 class="page-title">关键工序样板报审</h1>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="请先切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="编号 / 工序 / 部位"
          style="width: 220px"
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="router.push('/qm/sample/process/applications/edit')"
        >
          新建工序样板
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无工序样板报审">
        <el-table-column prop="application_id" label="报审编号" width="120" />
        <el-table-column prop="process_name" label="工序名称" min-width="150" />
        <el-table-column prop="use_part" label="施工部位" min-width="130" show-overflow-tooltip />
        <el-table-column
          prop="briefing_content"
          label="关键工序样板说明"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/sample/process/applications/detail?id=${row.application_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="primary"
              @click="onResubmit(row)"
            >
              重提
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

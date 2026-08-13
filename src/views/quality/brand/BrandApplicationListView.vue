<script setup>
import './brand-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listApplications,
  MATERIAL_TYPE,
  NODE_LABEL,
  STATUS_LABEL,
  statusTagType,
  withdrawApplication,
  resubmitApplication,
  getApplicationDetail,
} from '../../../mock/brand.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listApplications(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  }).map((a) => {
    const detail = getApplicationDetail(a.application_id)
    return {
      ...a,
      candidate_count: detail?.candidates?.length || 0,
      brand_preview: (detail?.candidates || [])
        .slice(0, 3)
        .map((c) => c.brand_name)
        .join(' / '),
    }
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

async function onWithdraw(row) {
  try {
    await ElMessageBox.confirm(`确认撤回报审单 ${row.application_id}？仅待监理审时可撤。`, '撤回', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = withdrawApplication(row.application_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已撤回')
}

async function onResubmit(row) {
  try {
    await ElMessageBox.confirm(`确认重提报审单 ${row.application_id}？将清空全部入选标记。`, '重提', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = resubmitApplication(row.application_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已重提，进入待监理审')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">品牌报审 / 报审申请</div>
      <h1 class="page-title">报审申请</h1>
      <p class="page-tip">
        施工直接提交 · 审批在个人中心待办处理 · 当前：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="报审申请为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="报审编号 / 材料 / 品牌"
          style="width: 240px"
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/qm/brand/applications/edit')">
          新增品牌报审
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无报审单">
        <el-table-column prop="application_id" label="报审编号" width="130" />
        <el-table-column prop="material_name" label="材料/设备" min-width="130" />
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] }}</template>
        </el-table-column>
        <el-table-column prop="brand_preview" label="备选品牌" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前节点" width="120">
          <template #default="{ row }">{{ NODE_LABEL[row.current_node] || '—' }}</template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/brand/applications/detail?id=${row.application_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'in_approval' && row.current_node === 'supervisor'"
              link
              type="warning"
              @click="onWithdraw(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="row.status === 'rejected' || row.status === 'withdrawn'"
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

<style scoped>
.mb {
  margin-bottom: 12px;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
</style>

<script setup>
import '../mat/mat-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listEntries,
  STATUS_LABEL,
  statusTagType,
  withdrawEntry,
  resubmitEntry,
} from '../../../mock/eq.js'

const router = useRouter()
const { isHqSelected, scopeProjectId, scopeProjectLabel } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listEntries(scopeProjectId.value, {
    keyword: keyword.value,
    status: statusFilter.value,
  })
})

function reset() {
  keyword.value = ''
  statusFilter.value = ''
}

async function onWithdraw(row) {
  try {
    await ElMessageBox.confirm(`确认撤回设备进场单 ${row.entry_id}？仅待监理审时可撤。`, '撤回', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = withdrawEntry(row.entry_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已撤回')
}

async function onResubmit(row) {
  try {
    await ElMessageBox.confirm(`确认重提设备进场单 ${row.entry_id}？`, '重提', { type: 'warning' })
  } catch {
    return
  }
  const r = resubmitEntry(row.entry_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已重提，进入待监理审')
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">设备进场管理 / 设备进场申请</div>
      <h1 class="page-title">设备进场申请</h1>
      <p class="page-tip">
        含开箱清单 · 审批在个人中心待办 · 当前：{{
          isHqSelected ? '请切换到具体项目' : scopeProjectLabel
        }}
      </p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="设备进场申请为项目级功能，请先在顶部切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="单号 / 设备 / 品牌"
          style="width: 240px"
          :prefix-icon="Search"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/qm/eq/applications/edit')">
          新建设备进场
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无设备进场申请">
        <el-table-column prop="entry_id" label="进场单号" width="110" />
        <el-table-column prop="equipment_name" label="设备名称" min-width="120" />
        <el-table-column prop="brand_name" label="品牌" width="100" />
        <el-table-column prop="sample_id" label="定样" width="100">
          <template #default="{ row }">{{ row.sample_id || '无定样' }}</template>
        </el-table-column>
        <el-table-column label="数量" width="90">
          <template #default="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">
              {{ STATUS_LABEL[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/eq/applications/detail?id=${row.entry_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending_supervisor'"
              link
              type="warning"
              @click="onWithdraw(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="row.status === 'rejected' || row.status === 'withdrawn'"
              link
              type="success"
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

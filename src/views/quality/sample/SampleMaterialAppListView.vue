<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listMaterialApps,
  STATUS_LABEL,
  statusLabel,
  statusTagType,
  withdrawSampleApp,
} from '../../../mock/sample.js'

const router = useRouter()
const { isHqSelected, scopeProjectId } = useQmProjectScope()
const keyword = ref('')
const statusFilter = ref('')
const tick = ref(0)

const list = computed(() => {
  void tick.value
  if (isHqSelected.value || !scopeProjectId.value) return []
  return listMaterialApps(scopeProjectId.value, {
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
    await ElMessageBox.confirm(`确认撤回报审单 ${row.application_id}？仅待审批时可撤。`, '撤回', {
      type: 'warning',
    })
  } catch {
    return
  }
  const r = withdrawSampleApp('material', row.application_id)
  if (!r.ok) return ElMessage.error(r.msg)
  tick.value += 1
  ElMessage.success('已撤回')
}

function onCopyNew(row) {
  router.push(`/qm/sample/material/applications/edit?copyFrom=${row.application_id}`)
}

function onReEdit(row) {
  router.push(`/qm/sample/material/applications/edit?id=${row.application_id}&reEdit=1`)
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 材料定样报审</div>
      <h1 class="page-title">材料定样报审</h1>
      <p class="page-tip">已撤回可重新编辑回待审批 · 已驳回请复制新建</p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="材料定样报审为项目级功能，请先切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="编号 / 材料 / 品牌 / 部位"
          style="width: 220px"
          :prefix-icon="Search" aria-label="编号 / 材料 / 品牌 / 部位"/>
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="router.push('/qm/sample/material/applications/edit')"
        >
          新建材料定样
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无材料定样报审单">
        <el-table-column prop="application_id" label="报审编号" width="110" />
        <el-table-column prop="material_name" label="材料名称" min-width="140" />
        <el-table-column prop="brand_name" label="品牌" width="120" show-overflow-tooltip />
        <el-table-column prop="supplier" label="供应商" min-width="160" show-overflow-tooltip />
        <el-table-column prop="use_part" label="施工部位" min-width="120" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/sample/material/applications/detail?id=${row.application_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              link
              type="warning"
              @click="onWithdraw(row)"
            >
              撤回
            </el-button>
            <el-button
              v-if="row.status === 'withdrawn'"
              link
              type="success"
              @click="onReEdit(row)"
            >
              重新编辑
            </el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="success"
              @click="onCopyNew(row)"
            >
              复制新建
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>
  </div>
</template>

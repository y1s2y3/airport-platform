<script setup>
import './sample-page.css'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useQmProjectScope } from '../../../composables/useCurrentProject'
import {
  listMaterialApps,
  STATUS_LABEL,
  NODE_LABEL,
  MATERIAL_TYPE,
  statusLabel,
  statusTagType,
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

function onCopyNew(row) {
  router.push(`/qm/sample/material/applications/edit?copyFrom=${row.application_id}`)
}

function onExportTemplate() {
  const url = `${import.meta.env.BASE_URL}templates/材料设备送样定板报审表-模板.docx`
  const a = document.createElement('a')
  a.href = url
  a.download = '材料设备送样定板报审表-模板.docx'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  ElMessage.success('已开始下载模板')
}

function sampleName(row) {
  return row.sample_name || row.material_name || '—'
}

function manufacturerName(row) {
  return row.manufacturer || row.supplier || '—'
}
</script>

<template>
  <div class="qm-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">样板管理 / 定样审批</div>
      <h1 class="page-title">定样审批</h1>
      <p class="page-tip">审批在个人中心待办处理 · 已驳回请重新申报</p>
    </div>

    <el-alert
      v-if="isHqSelected"
      type="warning"
      :closable="false"
      show-icon
      title="定样审批为项目级功能，请先切换到具体项目"
      class="mb"
    />

    <template v-else>
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="编号 / 样品 / 品牌 / 厂家 / 部位"
          style="width: 240px"
          :prefix-icon="Search"
          aria-label="编号 / 样品 / 品牌 / 厂家 / 部位"
        />
        <el-select v-model="statusFilter" clearable placeholder="状态" style="width: 140px" aria-label="状态">
          <el-option v-for="(label, val) in STATUS_LABEL" :key="val" :label="label" :value="val" />
        </el-select>
        <el-button type="primary" :icon="Search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
        <el-button :icon="Download" @click="onExportTemplate">
          导出材料设备送样定板报审表-模板
        </el-button>
        <el-button
          type="primary"
          :icon="Plus"
          @click="router.push('/qm/sample/material/applications/edit')"
        >
          新建材料设备定样报审
        </el-button>
      </div>

      <el-table :data="list" stripe border empty-text="暂无定样审批单">
        <el-table-column prop="application_id" label="报审编号" width="110" />
        <el-table-column label="样品名称" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ sampleName(row) }}</template>
        </el-table-column>
        <el-table-column label="类型" width="80">
          <template #default="{ row }">{{ MATERIAL_TYPE[row.material_type] || '—' }}</template>
        </el-table-column>
        <el-table-column prop="brand_name" label="品牌" width="120" show-overflow-tooltip />
        <el-table-column label="生产厂家" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ manufacturerName(row) }}</template>
        </el-table-column>
        <el-table-column prop="sample_date" label="送样日期" width="120" />
        <el-table-column prop="unit_name" label="单位工程" min-width="140" show-overflow-tooltip />
        <el-table-column prop="use_part" label="使用部位" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前节点" width="120">
          <template #default="{ row }">{{ NODE_LABEL[row.current_node] || '—' }}</template>
        </el-table-column>
        <el-table-column prop="submit_time" label="提交时间" width="170" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="router.push(`/qm/sample/material/applications/detail?id=${row.application_id}`)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'rejected'"
              link
              type="primary"
              @click="onCopyNew(row)"
            >
              重新申报
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

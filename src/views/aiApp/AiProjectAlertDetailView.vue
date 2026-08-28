<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import { AI_CATEGORY_META, getAiAlerts } from '../../mock/aiApp.js'
import './ai-app.css'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => String(route.params.projectId || ''))
const category = computed(() => String(route.params.category || ''))
const project = computed(() => COC_PROJECT_OPTIONS.find((item) => item.id === projectId.value) || null)
const meta = computed(() => AI_CATEGORY_META[category.value] || null)
const title = computed(() =>
  project.value && meta.value ? `${project.value.label}-${meta.value.label}` : '项目预警明细',
)

const rows = computed(() =>
  getAiAlerts({ projectId: projectId.value, category: category.value }),
)

function goBack() {
  router.push('/ai-alert-dashboard')
}
</script>

<template>
  <div class="ai-page page-card">
    <el-page-header class="detail-page-header" @back="goBack">
      <template #content>
        <span class="detail-page-title">{{ title }}</span>
      </template>
    </el-page-header>

    <div class="ai-panel">
      <div class="ai-panel-title">预警明细</div>
      <el-table :data="rows" stripe border class="ap-table" empty-text="当前条件下暂无预警记录">
        <el-table-column type="index" label="序号" width="58" align="center" />
        <el-table-column label="预警截图" width="120" align="center">
          <template #default="{ row }">
            <div class="ai-snapshot">
              <span class="ai-snapshot-label">{{ row.alertType }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="occurredAt" label="预警时间" width="165" />
        <el-table-column prop="alertType" label="预警类型" width="135" />
        <el-table-column prop="content" label="预警内容" min-width="210" show-overflow-tooltip />
        <el-table-column label="发生位置" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.location }}</div>
            <div style="margin-top: 3px; color: var(--ap-text-muted); font-size: 12px">{{ row.camera }}</div>
          </template>
        </el-table-column>
        <el-table-column label="处置人" width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.status === '已处置' ? (row.disposedBy || row.handler || '') : '' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="预警状态" width="92" align="center">
          <template #default="{ row }">
            <span class="ai-status-tag" :class="row.status === '未处置' ? 'unhandled' : 'handled'">{{ row.status }}</span>
          </template>
        </el-table-column>
        <el-table-column label="处置结果" width="92" align="center">
          <template #default="{ row }">
            <span v-if="row.disposition" class="ai-result-tag" :class="row.disposition === '误报' ? 'false-alarm' : 'processed'">
              {{ row.disposition }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="disposedAt" label="处置时间" width="165">
          <template #default="{ row }">{{ row.disposedAt || '-' }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.detail-page-header {
  margin-bottom: 16px;
}

.detail-page-title {
  color: var(--ap-text);
  font-size: 16px;
  font-weight: 600;
}
</style>

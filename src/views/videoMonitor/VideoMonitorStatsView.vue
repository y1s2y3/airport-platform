<script setup>
/**
 * 视频监控统计（指挥部）— 按项目汇总摄像头在线/离线及预警
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { selectedProjectId } from '../../composables/useCurrentProject'
import { COC_PROJECT_OPTIONS } from '../../config/projectOptions.js'
import {
  buildHqVideoMonitorStatsByProject,
  ensureVideoDeviceLedgerSeed,
} from '../../coc/utils/videoDeviceLedgerStorage.js'

defineProps({
  title: { type: String, default: '视频监控统计' },
  description: { type: String, default: '' },
})

const router = useRouter()
const keyword = ref('')

onMounted(() => {
  ensureVideoDeviceLedgerSeed()
})

const rows = computed(() => buildHqVideoMonitorStatsByProject(COC_PROJECT_OPTIONS))

/** 指挥部汇总：全部项目指标合计 */
const summary = computed(() =>
  rows.value.reduce(
    (acc, row) => {
      acc.total += row.total
      acc.online += row.online
      acc.offline += row.offline
      acc.offlineOver15 += row.offlineOver15
      acc.untreatedWarnings += row.untreatedWarnings
      return acc
    },
    { total: 0, online: 0, offline: 0, offlineOver15: 0, untreatedWarnings: 0 },
  ),
)

const filtered = computed(() => {
  const kw = keyword.value.trim()
  if (!kw) return rows.value
  return rows.value.filter((r) => `${r.project_name}${r.project_id}`.includes(kw))
})

function reset() {
  keyword.value = ''
}

function handleSearch() {
  ElMessage.success(`已按条件查询，共 ${filtered.value.length} 个项目`)
}

async function viewProjectDetail(row) {
  if (!row?.project_id) return
  // 先离开指挥部专属页，再切项目，避免 leaveRestrictedPages 踢回工作台
  await router.push('/video-monitor/preview')
  selectedProjectId.value = row.project_id
  ElMessage.success(`已切换至项目：${row.project_name}`)
}
</script>

<template>
  <div class="vm-stats-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">安全看板 / 视频监控统计</div>
      <h1 class="page-title">{{ title }}</h1>
      <p class="page-tip">
        {{
          description ||
          '按项目统计摄像头总数、在线/离线数量、超15日离线数量及离线预警未处置数量；点击「查看项目详情」进入项目级视频预览'
        }}
      </p>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value">{{ summary.total }}</div>
        <div class="summary-label">摄像头总数</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ summary.online }}</div>
        <div class="summary-label">在线数量</div>
      </div>
      <div class="summary-card">
        <div class="summary-value">{{ summary.offline }}</div>
        <div class="summary-label">离线数量</div>
      </div>
      <div class="summary-card warn">
        <div class="summary-value">{{ summary.offlineOver15 }}</div>
        <div class="summary-label">超15日离线摄像头数量</div>
      </div>
      <div class="summary-card warn">
        <div class="summary-value">{{ summary.untreatedWarnings }}</div>
        <div class="summary-label">离线预警未处置数量</div>
      </div>
    </div>

    <div class="filter-bar">
      <el-input
        v-model="keyword"
        clearable
        placeholder="项目名称"
        style="width: 260px"
        :prefix-icon="Search"
      />
      <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      <el-button :icon="Refresh" @click="reset">重置</el-button>
    </div>

    <el-table :data="filtered" stripe border empty-text="暂无项目视频监控数据">
      <el-table-column prop="project_name" label="项目名称" min-width="220" fixed show-overflow-tooltip />
      <el-table-column label="摄像头总数" width="120" align="center" prop="total" />
      <el-table-column label="在线数量" width="110" align="center" prop="online" />
      <el-table-column label="离线数量" width="110" align="center" prop="offline" />
      <el-table-column label="超15日离线摄像头数量" width="180" align="center" prop="offlineOver15" />
      <el-table-column label="离线预警未处置数量" width="160" align="center">
        <template #default="{ row }">
          <span :class="{ 'warn-text': row.untreatedWarnings > 0 }">{{ row.untreatedWarnings }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewProjectDetail(row)">查看项目详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.vm-stats-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page-breadcrumb {
  font-size: 12px;
  color: #909399;
}
.page-title {
  margin: 4px 0;
  font-size: 20px;
}
.page-tip {
  margin: 0;
  font-size: 13px;
  color: #606266;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}
.summary-card {
  border: 1px solid var(--ap-border, #e4e7ed);
  border-radius: 8px;
  background: #fff;
  padding: 16px;
  text-align: center;
}
.summary-card.warn {
  border-color: rgba(229, 57, 53, 0.25);
  background: #fff8f7;
}
.summary-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--ap-text, #303133);
  line-height: 1.2;
}
.summary-card.warn .summary-value {
  color: var(--ap-danger, #e53935);
}
.summary-label {
  margin-top: 6px;
  font-size: 12px;
  color: var(--ap-text-secondary, #909399);
  line-height: 1.4;
  min-height: 2.8em;
  display: flex;
  align-items: center;
  justify-content: center;
}
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.warn-text {
  color: var(--ap-danger, #e53935);
  font-weight: 600;
}
@media (max-width: 1400px) {
  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

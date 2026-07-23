<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Refresh, Download, DataAnalysis, DataLine, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope, selectedProjectId } from '../../composables/useCurrentProject'
import {
  projectTree, indicatorDefs, getRegions, getPoints, getDevices,
  getIndicatorsByDevice, getMonitorData, enrichMonitorData, getMonitorStats,
  getHQProjectStats, getAlertRecords,
} from '../../mock/majorHazard'

const props = defineProps({
  hazardType: { type: String, required: true },
  title: { type: String, default: '' },
  breadcrumb: { type: String, default: '' },
  tip: { type: String, default: '' },
})

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const router = useRouter()

// 视图切换
const viewMode = ref('table') // table | chart

// 筛选条件
const keyword = ref('')
const filters = ref({ regionId: '', pointId: '', indicatorId: '' })
const dataList = ref([])
const allData = ref([])

// 分页
const page = ref(1)
const pageSize = ref(15)

// 图表数据
const chartSeries = ref([])
const chartCategories = ref([])

const treeData = computed(() =>
  projectTree.map((g) => ({ id: g.id, label: g.label, children: g.children?.map((c) => ({ id: c.id, label: c.label.replace(/\(\d+\)$/, '') })) }))
)

const regionOptions = computed(() => getRegions(scopeProjectId.value, props.hazardType))
const pointOptions = computed(() => {
  if (!filters.value.regionId) return []
  return getPoints(scopeProjectId.value, props.hazardType).filter(p => p.regionId === filters.value.regionId)
})
const indicatorOptions = computed(() => indicatorDefs[props.hazardType] || [])

const stats = computed(() => getMonitorStats(scopeProjectId.value, props.hazardType))

// 指挥部看板数据
const hqProjectStats = ref([])
function loadHQStats() {
  hqProjectStats.value = getHQProjectStats(props.hazardType)
}
const hqTotalStats = computed(() => {
  const list = hqProjectStats.value
  return {
    regionCount: list.reduce((s, p) => s + p.regionCount, 0),
    deviceCount: list.reduce((s, p) => s + p.deviceCount, 0),
    todayAlertCount: list.reduce((s, p) => s + p.todayAlertCount, 0),
    pendingAlertCount: list.reduce((s, p) => s + p.pendingAlertCount, 0),
  }
})

const filteredData = computed(() => {
  let list = allData.value
  const kw = keyword.value.trim()
  if (kw) list = list.filter(r => `${r.regionName}${r.pointName}${r.deviceName}${r.indicatorName}`.includes(kw))
  if (filters.value.regionId) list = list.filter(r => r.regionId === filters.value.regionId)
  if (filters.value.pointId) list = list.filter(r => r.pointId === filters.value.pointId)
  if (filters.value.indicatorId) list = list.filter(r => r.indicatorId === filters.value.indicatorId)
  return list
})

const pagedData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

const totalCount = computed(() => filteredData.value.length)

// 数值指标透视表：每个监测点位一行，各指标值为列
const pivotData = computed(() => {
  const data = filteredData.value
  const grouped = {}
  data.forEach(r => {
    const key = r.pointId // 按监测点分组
    if (!grouped[key]) {
      grouped[key] = {
        regionName: r.regionName,
        pointName: r.pointName,
        deviceName: r.deviceName,
        deviceSN: r.deviceSN,
        _latestTime: r.collectTime,
      }
    }
    // 以指标名称为列名存储值
    grouped[key][r.indicatorName] = r.value
    grouped[key][r.indicatorName + '_unit'] = r.unit
    grouped[key][r.indicatorName + '_alert'] = r.value >= r.alertThreshold
    if (r.collectTime > grouped[key]._latestTime) {
      grouped[key]._latestTime = r.collectTime
    }
  })
  return Object.entries(grouped).map(([pointId, row]) => ({ pointId, ...row }))
})

const indicatorColumns = computed(() => {
  return (indicatorDefs[props.hazardType] || []).map(ind => ind.name)
})

function loadData() {
  const raw = getMonitorData(scopeProjectId.value, props.hazardType, {})
  allData.value = enrichMonitorData(raw)
  dataList.value = allData.value
  buildChart()
}

function buildChart() {
  const data = allData.value.slice(0, 100)
  if (data.length === 0) { chartSeries.value = []; chartCategories.value = []; return }
  const grouped = {}
  data.forEach(d => {
    const key = d.indicatorName || '未知'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push({ time: d.collectTime.slice(11, 16), value: d.value })
  })
  chartCategories.value = [...new Set(data.map(d => d.collectTime.slice(11, 16)))].sort()
  chartSeries.value = Object.entries(grouped).map(([name, pts]) => ({
    name,
    data: chartCategories.value.map(t => pts.find(p => p.time === t)?.value ?? null),
  }))
}

watch(scopeProjectId, () => {
  keyword.value = ''
  filters.value = { regionId: '', pointId: '', indicatorId: '' }
  page.value = 1
  loadData()
  loadHQStats()
}, { immediate: true })

function handleReset() {
  keyword.value = ''
  filters.value = { regionId: '', pointId: '', indicatorId: '' }
  page.value = 1
}

function handleRegionChange() {
  filters.value.pointId = ''
}

function handleExport() {
  const headers = ['监测区域', '监测点', '设备名称', '监测指标', '监测值', '单位', '预警值', '超限阈值', '采集时间']
  const rows = filteredData.value.map(r => [r.regionName, r.pointName, r.deviceName, r.indicatorName, r.value, r.unit, r.warningThreshold, r.alertThreshold, r.collectTime])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${props.title}_监测数据_${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

function viewProjectDetail(row) {
  selectedProjectId.value = row.projectId
  router.push('/major-hazard/' + (props.hazardType === 'pit' ? 'deep-foundation-pit' : props.hazardType === 'subway' ? 'subway-protection' : 'high-formwork'))
}
</script>

<template>
  <div class="hazard-page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">{{ breadcrumb }}</div>
      <div class="page-heading">
        <h1 class="page-title">{{ title }}</h1>
        <div class="view-switch" v-if="!isHqSelected">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="table"><el-icon><DataAnalysis /></el-icon> 表格视图</el-radio-button>
            <el-radio-button value="chart"><el-icon><DataLine /></el-icon> 图表视图</el-radio-button>
          </el-radio-group>
        </div>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">{{ tip }}</p>
    </div>

    <div class="page-layout">
      <aside v-if="false" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree :data="treeData" node-key="id" highlight-current default-expand-all
          :current-node-key="treeProjectId" :expand-on-click-node="false" class="project-tree"
          @node-click="onTreeNodeClick" />
      </aside>

      <section class="content-panel">
        <!-- 指挥部看板视图 -->
        <template v-if="isHqSelected">
          <div class="hq-dashboard">
            <div class="stat-cards">
              <div class="stat-card"><div class="sc-value">{{ hqTotalStats.regionCount }}</div><div class="sc-label">监测区域数</div></div>
              <div class="stat-card"><div class="sc-value">{{ hqTotalStats.deviceCount }}</div><div class="sc-label">设备接入数量</div></div>
              <div class="stat-card"><div class="sc-value warn">{{ hqTotalStats.todayAlertCount }}</div><div class="sc-label">今日告警数</div></div>
              <div class="stat-card"><div class="sc-value danger">{{ hqTotalStats.pendingAlertCount }}</div><div class="sc-label">待处理告警数</div></div>
            </div>
            <el-table :data="hqProjectStats" border stripe class="ap-table" style="width:100%;margin-top:16px">
              <el-table-column type="index" label="序号" width="55" align="center" />
              <el-table-column prop="projectName" label="项目名称" min-width="180" />
              <el-table-column prop="regionCount" label="监测区域数量" width="110" align="center" />
              <el-table-column prop="pointCount" label="监测点数量" width="100" align="center" />
              <el-table-column prop="deviceCount" label="接入设备数量" width="100" align="center" />
              <el-table-column prop="todayAlertCount" label="今日告警数" width="90" align="center">
                <template #default="{ row }"><span :class="row.todayAlertCount > 0 ? 'text-alert' : ''">{{ row.todayAlertCount }}</span></template>
              </el-table-column>
              <el-table-column prop="pendingAlertCount" label="待处理告警数" width="100" align="center">
                <template #default="{ row }"><span :class="row.pendingAlertCount > 0 ? 'text-alert' : ''">{{ row.pendingAlertCount }}</span></template>
              </el-table-column>
              <el-table-column label="操作" width="120" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" :icon="View" @click="viewProjectDetail(row)">查看详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>

        <!-- 项目级详请视图 -->
        <template v-if="!isHqSelected">
          <div class="panel-head">
            <div class="panel-stats">
              <span>监测区域 <b>{{ stats.regions }}</b> 个</span>
              <span>监测点 <b>{{ stats.points }}</b> 个</span>
              <span>监测设备 <b>{{ stats.devices }}</b> 台</span>
              <span class="stat-normal">在线 <b>{{ stats.onlineDevices }}</b> 台</span>
            </div>
          </div>

        <div class="filter-bar">
          <el-input v-model="keyword" placeholder="搜索区域/点/设备/指标" clearable style="width: 200px" :prefix-icon="Search" />
          <el-select v-model="filters.regionId" placeholder="监测区域" clearable style="width: 180px" @change="handleRegionChange">
            <el-option v-for="r in regionOptions" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
          <el-select v-model="filters.pointId" placeholder="监测点" clearable style="width: 160px">
            <el-option v-for="p in pointOptions" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
          <el-select v-model="filters.indicatorId" placeholder="监测指标" clearable style="width: 130px">
            <el-option v-for="ind in indicatorOptions" :key="ind.name" :label="ind.name" :value="ind.name" />
          </el-select>
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          <el-button :icon="Download" @click="handleExport" style="margin-left:auto">导出</el-button>
        </div>

        <!-- 表格视图 -->
        <template v-if="viewMode === 'table'">
          <el-table :data="pivotData" border stripe class="ap-table" style="width:100%">
            <el-table-column type="index" label="序号" width="55" align="center" />
            <el-table-column prop="regionName" label="监测区域" min-width="130" show-overflow-tooltip />
            <el-table-column prop="pointName" label="监测点" min-width="120" show-overflow-tooltip />
            <el-table-column prop="deviceName" label="设备名称" min-width="130" show-overflow-tooltip />
            <el-table-column prop="deviceSN" label="设备SN" width="110" />
            <el-table-column v-for="ind in indicatorColumns" :key="ind" :label="ind" width="100" align="center">
              <template #default="{ row }">
                <span v-if="row[ind] != null" :class="row[ind + '_alert'] ? 'text-alert' : ''">
                  {{ row[ind] }} {{ row[ind + '_unit'] || '' }}
                </span>
                <span v-else class="ap-muted">-</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="page" v-model:page-size="pageSize"
              :total="pivotData.length" :page-sizes="[10, 15, 30, 50]"
              layout="total, sizes, prev, pager, next" background small />
          </div>
        </template>

        <!-- 图表视图 -->
        <template v-if="viewMode === 'chart'">
          <div class="chart-container">
            <div class="chart-header">
              <h4>监测数据趋势图</h4>
              <span class="chart-hint">各指标监测值变化趋势</span>
            </div>
            <div v-if="chartSeries.length > 0" class="chart-body">
              <div v-for="(series, si) in chartSeries" :key="si" class="chart-item">
                <div class="chart-legend">
                  <span class="chart-dot" :style="{ background: ['#8f0045','#e68a2e','#4a90d9','#5cb87a'][si % 4] }"></span>
                  <span class="chart-label">{{ series.name }}</span>
                </div>
                <div class="chart-bars">
                  <div v-for="(val, vi) in series.data" :key="vi" class="bar-group" :title="`${chartCategories[vi]} ${val ?? '-'}`">
                    <div class="bar-fill" :style="{ height: val != null ? Math.min((val / Math.max(...series.data.filter(v => v != null))) * 100, 100) + '%' : '0', background: ['#8f0045','#e68a2e','#4a90d9','#5cb87a'][si % 4] }"></div>
                    <div class="bar-label" v-if="vi % 4 === 0">{{ chartCategories[vi] }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="chart-empty">暂无数据</div>
          </div>
        </template>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.hazard-page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; flex-wrap: wrap; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.view-switch { flex-shrink: 0; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
.project-tree-panel, .content-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
.panel-stats { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: var(--ap-text-secondary); }
.panel-stats .stat-normal { color: var(--ap-success); }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; align-items: center; }
.pagination-wrap { margin-top: 12px; display: flex; justify-content: flex-end; }
.project-tree { font-size: 13px; }
.project-tree :deep(.el-tree-node__content) { height: 36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background: #fceef4; color: var(--ap-primary); font-weight: 600; }
.text-alert { color: var(--ap-danger); font-weight: 600; cursor: pointer; }

/* 图表 */
.chart-container { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 16px; }
.chart-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.chart-header h4 { margin: 0; font-size: 14px; }
.chart-hint { font-size: 12px; color: var(--ap-text-muted); }
.chart-body { display: flex; flex-direction: column; gap: 24px; }
.chart-item { }
.chart-legend { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.chart-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.chart-label { font-size: 13px; font-weight: 600; }
.chart-bars { display: flex; align-items: flex-end; gap: 2px; height: 120px; border-bottom: 1px solid #ddd; padding-bottom: 18px; position: relative; }
.bar-group { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: pointer; }
.bar-fill { width: 60%; min-height: 2px; border-radius: 2px 2px 0 0; transition: height 0.3s; }
.bar-label { font-size: 10px; color: #999; margin-top: 4px; white-space: nowrap; transform: rotate(-30deg); }
.chart-empty { text-align: center; color: #ccc; padding: 40px 0; }

/* 指挥部看板 */
.stat-cards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
.stat-card { flex: 1; min-width: 160px; background: #fff; border: 1px solid var(--ap-border); border-radius: 8px; padding: 20px 24px; text-align: center; }
.sc-value { font-size: 32px; font-weight: 700; color: var(--ap-primary); line-height: 1.2; }
.sc-value.warn { color: var(--ap-warning); }
.sc-value.danger { color: var(--ap-danger); }
.sc-label { font-size: 13px; color: var(--ap-text-secondary); margin-top: 4px; }
</style>

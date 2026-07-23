<script setup>
import { ref, computed, watch } from 'vue'
import { Search, Download, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { projectTree, getAlertRecords, handleAlertRecord, getRegions } from '../../mock/majorHazard'

const { isHqSelected, treeProjectId, scopeProjectId, scopeProjectLabel, onTreeNodeClick } = useLaborProjectScope()
const isReadOnly = computed(() => isHqSelected.value)

const keyword = ref('')
const filters = ref({ regionId: '', level: '', status: '', startTime: '', endTime: '', hazardType: '' })
const list = ref([])

// 分页
const page = ref(1)
const pageSize = ref(10)

const treeData = computed(() =>
  projectTree.map((g) => ({ id: g.id, label: g.label, children: g.children?.map((c) => ({ id: c.id, label: c.label.replace(/\(\d+\)$/, '') })) }))
)

const typeOptions = [
  { label: '全部类型', value: '' },
  { label: '深基坑', value: 'pit' },
  { label: '地铁铁路', value: 'subway' },
  { label: '高支模', value: 'formwork' },
]

const levelOptions = ['一级', '二级', '三级']
const statusOptions = ['未处置', '已处置']

const regionOpts = computed(() => {
  if (!filters.value.hazardType) return getRegions(scopeProjectId.value, '')
  return getRegions(scopeProjectId.value, filters.value.hazardType)
})

const filteredList = computed(() => {
  let l = list.value
  const kw = keyword.value.trim()
  if (kw) l = l.filter(r => `${r.region}${r.point}${r.deviceName}${r.indicatorName}`.includes(kw))
  if (filters.value.regionId) l = l.filter(r => r.regionId === filters.value.regionId)
  if (filters.value.level) l = l.filter(r => r.level === filters.value.level)
  if (filters.value.status) l = l.filter(r => r.status === filters.value.status)
  if (filters.value.startTime) l = l.filter(r => r.time >= filters.value.startTime)
  if (filters.value.endTime) l = l.filter(r => r.time <= filters.value.endTime + ' 23:59:59')
  return l
})

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const totalCount = computed(() => filteredList.value.length)

function load() {
  list.value = getAlertRecords(scopeProjectId.value, filters.value.hazardType || '', {})
}

watch(scopeProjectId, () => {
  Object.keys(filters.value).forEach(k => filters.value[k] = '')
  page.value = 1
  load()
}, { immediate: true })

watch(() => filters.value.hazardType, () => {
  filters.value.regionId = ''
  page.value = 1
  load()
})

function handleReset() {
  Object.keys(filters.value).forEach(k => filters.value[k] = '')
  page.value = 1
}

// 详情弹窗
const detailVisible = ref(false)
const detailItem = ref(null)

function viewDetail(row) {
  detailItem.value = row
  detailVisible.value = true
}

// 处置弹窗
const disposeVisible = ref(false)
const disposeItem = ref(null)
const disposeContent = ref('')

function openDispose(row) {
  disposeItem.value = row
  disposeContent.value = ''
  disposeVisible.value = true
}

function submitDispose() {
  if (!disposeContent.value.trim()) { ElMessage.warning('请填写处置记录'); return }
  handleAlertRecord(disposeItem.value.id, { content: disposeContent.value })
  ElMessage.success('处置完成')
  disposeVisible.value = false
  load()
}

function handleExport() {
  const headers = ['告警类型', '监测区域', '监测点位', '设备名称', '监测指标', '当前数值', '告警阈值', '告警等级', '告警详情', '发生时间', '处置状态', '负责人']
  const rows = filteredList.value.map(r => [r.alertType, r.region, r.point, r.deviceName, r.indicatorName, r.currentValue, r.threshold, r.level, r.detail, r.time, r.status, r.handler || ''])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `告警记录_${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}
</script>

<template>
  <div class="page page-card">
    <div class="page-header">
      <div class="page-breadcrumb">危大工程监管 / 告警记录</div>
      <div class="page-heading">
        <h1 class="page-title">告警记录</h1>
      </div>
      <p v-if="!isHqSelected" class="page-scope">当前项目：{{ scopeProjectLabel }}</p>
      <p class="page-tip">查看、处置告警记录。设备监测值超出配置阈值时自动生成告警并按配置推送。</p>
    </div>

    <div class="page-layout" :class="{ 'with-tree': isHqSelected }">
      <aside v-if="isHqSelected" class="project-tree-panel">
        <div class="panel-title">项目列表</div>
        <el-tree :data="treeData" node-key="id" highlight-current default-expand-all
          :current-node-key="treeProjectId" :expand-on-click-node="false" class="project-tree"
          @node-click="onTreeNodeClick" />
      </aside>

      <section class="content-panel">
        <div class="filter-bar">
          <el-input v-model="keyword" placeholder="区域/点位/设备" clearable style="width: 180px" :prefix-icon="Search" />
          <el-select v-model="filters.hazardType" placeholder="工程类型" clearable style="width: 110px">
            <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
          <el-select v-model="filters.regionId" placeholder="监测区域" clearable style="width: 170px">
            <el-option v-for="r in regionOpts" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
          <el-select v-model="filters.level" placeholder="告警等级" clearable style="width: 100px">
            <el-option v-for="lv in levelOptions" :key="lv" :label="lv" :value="lv" />
          </el-select>
          <el-select v-model="filters.status" placeholder="处置状态" clearable style="width: 100px">
            <el-option v-for="s in statusOptions" :key="s" :label="s" :value="s" />
          </el-select>
          <el-date-picker v-model="filters.startTime" type="date" placeholder="开始时间" value-format="YYYY-MM-DD" style="width: 130px" />
          <el-date-picker v-model="filters.endTime" type="date" placeholder="结束时间" value-format="YYYY-MM-DD" style="width: 130px" />
          <el-button class="ap-btn-primary" type="primary" :icon="Search">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button :icon="Download" @click="handleExport" style="margin-left:auto">导出</el-button>
        </div>

        <el-table :data="pagedList" border stripe class="ap-table" style="width:100%">
          <el-table-column type="index" label="序" width="40" align="center" />
          <el-table-column prop="alertType" label="告警类型" min-width="120" show-overflow-tooltip />
          <el-table-column prop="region" label="监测区域" min-width="130" show-overflow-tooltip />
          <el-table-column prop="point" label="监测点位" min-width="120" show-overflow-tooltip />
          <el-table-column prop="deviceName" label="设备名称" min-width="130" show-overflow-tooltip />
          <el-table-column prop="indicatorName" label="超限指标" width="80" align="center" />
          <el-table-column label="当前值/阈值" width="110" align="center">
            <template #default="{ row }">{{ row.currentValue }} / {{ row.threshold }} {{ row.unit }}</template>
          </el-table-column>
          <el-table-column prop="level" label="等级" width="55" align="center" />
          <el-table-column prop="time" label="发生时间" width="145" />
          <el-table-column label="状态" width="70" align="center">
            <template #default="{ row }">
              <span class="ap-status-tag" :class="row.status === '未处置' ? 'ap-tag-high' : 'ap-tag-enabled'">{{ row.status }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" align="center">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
              <el-button v-if="row.status === '未处置' && !isReadOnly" link type="primary" size="small" @click="openDispose(row)">处置</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="totalCount"
            :page-sizes="[5, 10, 20, 50]" layout="total, sizes, prev, pager, next" background small />
        </div>
      </section>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="告警详情" width="520px" :close-on-click-modal="false">
      <div v-if="detailItem" class="detail-wrap">
        <div class="dr"><span class="dl">告警类型</span><span class="dv">{{ detailItem.alertType }}</span></div>
        <div class="dr"><span class="dl">监测区域</span><span class="dv">{{ detailItem.region }}</span></div>
        <div class="dr"><span class="dl">监测点位</span><span class="dv">{{ detailItem.point }}</span></div>
        <div class="dr"><span class="dl">设备名称</span><span class="dv">{{ detailItem.deviceName }}</span></div>
        <div class="dr"><span class="dl">超限指标</span><span class="dv">{{ detailItem.indicatorName }}</span></div>
        <div class="dr"><span class="dl">当前数值</span><span class="dv">{{ detailItem.currentValue }} {{ detailItem.unit }}</span></div>
        <div class="dr"><span class="dl">告警阈值</span><span class="dv">{{ detailItem.threshold }} {{ detailItem.unit }}</span></div>
        <div class="dr"><span class="dl">告警等级</span><span class="dv">{{ detailItem.level }}</span></div>
        <div class="dr"><span class="dl">发生时间</span><span class="dv">{{ detailItem.time }}</span></div>
        <div class="dr"><span class="dl">处置状态</span><span class="dv"><span class="ap-status-tag" :class="detailItem.status === '未处置' ? 'ap-tag-high' : 'ap-tag-enabled'">{{ detailItem.status }}</span></span></div>
        <template v-if="detailItem.status === '已处置'">
          <div class="dr"><span class="dl">负责人</span><span class="dv">{{ detailItem.handler || '-' }}</span></div>
          <div class="dr"><span class="dl">处置记录</span><span class="dv">{{ detailItem.handlingContent || '-' }}</span></div>
          <div class="dr"><span class="dl">处置时间</span><span class="dv">{{ detailItem.handlingTime || '-' }}</span></div>
        </template>
      </div>
      <template #footer><el-button type="primary" class="ap-btn-primary" @click="detailVisible = false">关闭</el-button></template>
    </el-dialog>

    <!-- 处置弹窗 -->
    <el-dialog v-model="disposeVisible" title="告警处置" width="480px" :close-on-click-modal="false">
      <div v-if="disposeItem" class="dispose-hint">
        告警：{{ disposeItem.alertType }}（{{ disposeItem.deviceName }}）
      </div>
      <el-form label-width="80px">
        <el-form-item label="处置记录" required>
          <el-input v-model="disposeContent" type="textarea" :rows="4" placeholder="请填写处置内容及措施..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disposeVisible = false">取消</el-button>
        <el-button type="primary" class="ap-btn-primary" @click="submitDispose">确认处置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { padding: 20px 24px 32px; }
.page-breadcrumb { font-size: 13px; color: var(--ap-text-muted); margin-bottom: 4px; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
.page-title { font-size: 20px; font-weight: 600; margin: 0; }
.page-scope, .page-tip { font-size: 13px; color: var(--ap-text-secondary); margin: 0 0 8px; }
.page-layout.with-tree { display: grid; grid-template-columns: 240px 1fr; gap: 16px; }
.project-tree-panel, .content-panel { border: 1px solid var(--ap-border); border-radius: 8px; background: #fff; padding: 16px; }
.panel-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; align-items: center; }
.pagination-wrap { margin-top: 12px; display: flex; justify-content: flex-end; }
.project-tree { font-size: 13px; }
.project-tree :deep(.el-tree-node__content) { height: 36px; }
.project-tree :deep(.el-tree-node.is-current > .el-tree-node__content) { background: #fceef4; color: var(--ap-primary); font-weight: 600; }
.detail-wrap { padding: 0 8px; }
.dr { display: flex; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
.dr:last-child { border-bottom: none; }
.dl { width: 90px; color: var(--ap-text-secondary); flex-shrink: 0; }
.dv { flex: 1; color: #1f2329; }
.dispose-hint { margin-bottom: 16px; font-size: 13px; color: var(--ap-text-secondary); }
</style>

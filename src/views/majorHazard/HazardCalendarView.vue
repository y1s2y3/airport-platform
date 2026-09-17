<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import {
  buildCalendarAlerts,
  buildLedgerRows,
  ensureMajorHazardData,
  getLedgerEndDate,
  getLedgerStartDate,
  getLedgerStatus,
  getMajorHazardData,
} from '../../utils/majorHazardManualStorage.js'
import { getPersonalWarningCenterItem, syncMajorHazardWarningCenter } from '../../mock/personalCenter.js'

const { selectedProjectId, isHqSelected } = useCurrentProject()
const router = useRouter()
const projectId = computed(() => (isHqSelected.value ? '' : selectedProjectId.value))
const data = ref({ ledgers: [], identifications: [], alertActions: {} })
const calendarDate = ref(new Date())
const selectedDay = ref(new Date().toISOString().slice(0, 10))

const ledgerRows = computed(() => buildLedgerRows(data.value))
const activeRows = computed(() => ledgerRows.value.filter((item) => getLedgerStatus(item) === '在施'))
const alerts = computed(() => buildCalendarAlerts(data.value, ledgerRows.value))
const pendingAlerts = computed(() => alerts.value.filter((item) => item.status !== '已处理'))
const categoryStats = computed(() => {
  const map = new Map()
  ledgerRows.value.forEach((row) => map.set(row.categoryName, (map.get(row.categoryName) || 0) + 1))
  return [...map.entries()].map(([name, count]) => ({ name, count }))
})
const selectedEvents = computed(() => eventsOf(selectedDay.value))

function load() {
  if (!projectId.value) { data.value = { ledgers: [], identifications: [], alertActions: {} }; return }
  ensureMajorHazardData(projectId.value)
  data.value = getMajorHazardData(projectId.value)
}

function eventsOf(day) {
  return ledgerRows.value.filter((row) => (row.parts || []).some((part) => part.startDate && part.plannedEndDate && part.startDate <= day && part.plannedEndDate >= day))
}
function activePartNames(row) {
  const parts = (row.parts || []).filter((part) => part.startDate && part.plannedEndDate && part.startDate <= selectedDay.value && part.plannedEndDate >= selectedDay.value)
  return parts.map((part) => part.wbsPath || part.name).filter(Boolean).join('；') || '—'
}
function plannedTime(row) { return `${row.source?.plannedStart || '—'} 至 ${row.source?.plannedEnd || '—'}` }
function constructionTime(row) { return `${getLedgerStartDate(row) || '—'} 至 ${getLedgerEndDate(row) || '—'}` }
function openLedger(row) { router.push({ path: `/major-hazard/hazard-list/${encodeURIComponent(row.sourceId)}`, query: { mode: 'view' } }) }

function eventClass(row) { return row.isSuperMajor === '是' ? 'super' : 'normal' }
function formatCalendarDay(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function chooseDay(day) {
  selectedDay.value = day
  const [year, month, date] = day.split('-').map(Number)
  calendarDate.value = new Date(year, month - 1, date)
}
function changeCalendarMonth(offset) {
  const current = new Date(calendarDate.value)
  const targetYear = current.getFullYear()
  const targetMonth = current.getMonth() + offset
  const targetDay = Math.min(current.getDate(), new Date(targetYear, targetMonth + 1, 0).getDate())
  const target = new Date(targetYear, targetMonth, targetDay)
  calendarDate.value = target
  selectedDay.value = formatCalendarDay(target)
}
function goCalendarToday() {
  const today = new Date()
  calendarDate.value = today
  selectedDay.value = formatCalendarDay(today)
}
function typeOf(status) { return status === '已处理' ? 'success' : 'danger' }
function openAlertLedger() { router.push('/major-hazard/calendar/alerts') }
function openAlertDetail(alert) {
  syncMajorHazardWarningCenter()
  const centerId = `wc-major-hazard-${projectId.value}-${stableWarningHash(alert.id)}`
  const row = getPersonalWarningCenterItem(centerId)
  if (!row) {
    ElMessage.warning('未找到对应预警中心任务，请稍后重试')
    return
  }
  router.push({
    path: '/personal-center/todo/handle',
    query: { id: row.id, from: 'warning-center' },
  })
}
function stableWarningHash(value) {
  let hash = 0
  for (const char of String(value || '')) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash).toString().padStart(8, '0').slice(-8)
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <div class="calendar-page page-card">
    <template v-if="projectId">
      <div class="calendar-layout">
        <aside class="summary-panel">
          <h3>危大工程概览</h3>
          <div class="stat-grid">
            <div><b>{{ activeRows.length }}</b><span>在施工程</span></div>
            <div><b class="danger-text">{{ activeRows.filter((row) => row.isSuperMajor === '是').length }}</b><span>在施超危</span></div>
            <div><b class="danger-text">{{ pendingAlerts.length }}</b><span>待处理异常</span></div>
            <div><b class="success-text">{{ alerts.filter((row) => row.status === '已处理').length }}</b><span>已处理异常</span></div>
          </div>
          <h3>危大工程类别分布</h3>
          <div v-if="categoryStats.length" class="category-list">
            <div v-for="item in categoryStats" :key="item.name"><span>{{ item.name }}</span><b>{{ item.count }}</b></div>
          </div>
          <el-empty v-else :image-size="54" description="暂无危大工程数据" />

          <div class="alert-title"><h3>异常跟踪</h3><el-button link type="primary" @click="openAlertLedger">更多</el-button></div>
          <div v-if="alerts.length" class="alert-list">
            <div v-for="alert in alerts.slice(0, 4)" :key="alert.id" class="alert-item" @click="openAlertDetail(alert)">
              <WarningFilled class="warning-icon" />
              <div><strong>{{ alert.ledgerName }}</strong><p>{{ alert.content }}</p><el-tag size="small" :type="typeOf(alert.status)">{{ alert.status }}</el-tag></div>
            </div>
          </div>
          <el-empty v-else :image-size="54" description="暂无异常跟踪" />
        </aside>

        <section class="calendar-panel">
          <el-calendar v-model="calendarDate">
            <template #header="{ date }">
              <div class="calendar-header">
                <strong>{{ date }}</strong>
                <div>
                  <el-button size="small" @click="changeCalendarMonth(-1)">上月</el-button>
                  <el-button size="small" @click="goCalendarToday">今天</el-button>
                  <el-button size="small" @click="changeCalendarMonth(1)">下月</el-button>
                </div>
              </div>
            </template>
            <template #date-cell="{ data: cell }">
              <div class="calendar-day" :class="{ chosen: selectedDay === cell.day }" @click="chooseDay(cell.day)">
                <span class="day-number">{{ cell.day.slice(-2) }}</span>
                <div class="event-list">
                  <span v-for="row in eventsOf(cell.day).slice(0, 2)" :key="row.sourceId" class="event-chip" :class="eventClass(row)" :title="row.name">{{ row.name }}</span>
                  <span v-if="eventsOf(cell.day).length > 2" class="more-event">+{{ eventsOf(cell.day).length - 2 }}</span>
                </div>
              </div>
            </template>
          </el-calendar>
          <div class="day-detail">
            <div class="day-detail-title"><strong>{{ selectedDay }} 作业安排</strong><span>危大清单台账 · 共 {{ selectedEvents.length }} 项</span></div>
            <el-table :data="selectedEvents" border stripe empty-text="该日期暂无危大工程施工安排" class="day-ledger-table">
              <el-table-column prop="categoryName" label="危大工程类别" min-width="160" show-overflow-tooltip />
              <el-table-column prop="name" label="危大工程名称" min-width="190" show-overflow-tooltip />
              <el-table-column label="施工部位" min-width="240" show-overflow-tooltip><template #default="{ row }">{{ activePartNames(row) }}</template></el-table-column>
              <el-table-column label="计划时间" width="210"><template #default="{ row }">{{ plannedTime(row) }}</template></el-table-column>
              <el-table-column label="施工时间" width="210"><template #default="{ row }">{{ constructionTime(row) }}</template></el-table-column>
              <el-table-column prop="subcontractor" label="责任分包单位" min-width="180" show-overflow-tooltip />
              <el-table-column label="施工情况" width="100"><template #default="{ row }"><el-tag size="small" :type="getLedgerStatus(row) === '在施' ? 'primary' : getLedgerStatus(row) === '完工' ? 'success' : 'info'">{{ getLedgerStatus(row) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="openLedger(row)">查看</el-button></template></el-table-column>
            </el-table>
          </div>
        </section>
      </div>
    </template>
    <el-empty v-else description="危大工程日历仅支持项目级使用，请切换至具体项目。" />

  </div>
</template>

<style scoped>
.calendar-page{padding:20px 24px 32px}.calendar-layout{display:grid;grid-template-columns:310px minmax(0,1fr);gap:16px;align-items:start}.calendar-panel,.summary-panel{border:1px solid var(--ap-border-color,#ebeef5);border-radius:8px;background:#fff;min-width:0}.calendar-header{display:flex;align-items:center;justify-content:space-between;width:100%;font-size:16px}.calendar-day{height:100%;min-height:92px;padding:5px;border:1px solid transparent;cursor:pointer}.calendar-day.chosen{border-color:var(--el-color-primary);background:#f1f7ff;border-radius:4px}.day-number{font-size:13px;color:var(--ap-text-secondary)}.event-list{display:flex;flex-direction:column;gap:3px;margin-top:4px}.event-chip{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 5px;border-radius:3px;font-size:11px;color:#2773d6;background:#eaf3ff}.event-chip.super{color:#c45656;background:#fef0f0}.more-event{font-size:11px;color:var(--ap-text-muted)}.day-detail{padding:16px;border-top:1px solid var(--ap-border-color,#ebeef5);font-size:13px}.day-detail-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}.day-detail-title span{font-size:12px;color:var(--ap-text-muted)}.day-ledger-table{width:100%}.summary-panel{padding:16px}.summary-panel h3{font-size:14px;margin:0 0 10px}.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px}.stat-grid>div{padding:12px 10px;border-radius:6px;background:#f7f9fc}.stat-grid b{display:block;font-size:22px;line-height:1.2}.stat-grid span{font-size:12px;color:var(--ap-text-muted)}.danger-text{color:#d9534f}.success-text{color:#3f9d63}.category-list{margin:-2px 0 20px}.category-list div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px dashed #e8ecf2;font-size:13px}.category-list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ap-text-secondary)}.category-list b{color:var(--el-color-primary)}.alert-title{display:flex;justify-content:space-between;align-items:center}.alert-title h3{margin:0}.alert-item{display:flex;gap:8px;padding:10px 0;border-top:1px solid #edf0f4;cursor:pointer}.alert-item:hover{background:#fafbfc}.alert-item strong{font-size:13px}.alert-item p{margin:4px 0 6px;font-size:12px;line-height:1.45;color:var(--ap-text-secondary)}.warning-icon{flex:0 0 auto;width:16px;color:#e6a23c;margin-top:2px}@media(max-width:1000px){.calendar-layout{grid-template-columns:1fr}}
</style>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close, FullScreen, Location, Refresh, VideoCamera } from '@element-plus/icons-vue'
import HqEdgeLights from '../coc/components/hq/HqEdgeLights.vue'
import headerBg from '../coc/assets/hq/header/header-bg.png'
import weatherIcon from '../coc/assets/hq/header/weather-icon.svg?url'
import videoMonitorThumb from '../coc/assets/video-monitor-thumb.png'
import dailyWorkSeed from '../coc/mock/dailyWorkSeed.json'
import { formatTimeRange, isDangerWorkRecord, isMajorProjectRecord } from '../coc/utils/dailyWorkClassifier.js'
import { EQUIPMENT_ANOMALIES, EQUIPMENT_SAMPLE_RECORDS } from '../coc/mock/data.js'
import { getAiAlerts } from '../mock/aiApp.js'
import { getAttendanceDetails } from '../mock/laborAttendanceDetail.js'
import { getProjectPersonnel, maskPhone } from '../mock/laborRealName.js'
import { getProjectWarnings } from '../mock/laborWarningList.js'
import { INSPECTION_DEMO_TODAY, inspectionHazards } from '../mock/inspectionDemoData.js'
import { listMobileInspectionTasks } from '../mock/mobileInspectionTasks.js'
import { formatInspectionCategories } from '../config/inspectionManagement.js'
import { getAlertRecords, getDevices, getMonitorStats } from '../mock/majorHazard.js'
import { getProjectAccessRecords } from '../mock/vehicleManagement.js'
import {
  HQ_SELECTION_ID,
  LAYER_OPTIONS,
  buildMapPoints,
  buildMonitorRows,
  buildProjectRows,
  buildScopeSummary,
  buildTrend,
  getAiOverview,
  getTypeMeta,
} from './mock/situationData.js'
import './styles/screen.css'

const route = useRoute()
const router = useRouter()
const projectRows = buildProjectRows()
const allowedIds = new Set([HQ_SELECTION_ID, ...projectRows.map((item) => item.id)])
const requestedProjectId = String(route.query.projectId || '')

const selectionId = ref(allowedIds.has(requestedProjectId) ? requestedProjectId : HQ_SELECTION_ID)
const mapMode = ref('gis')
const trendRange = ref(7)
const activeLayers = ref(LAYER_OPTIONS.map((item) => item.value))
const selectedPoint = ref(null)
const clockText = ref('')
const dateText = ref('')
const weekdayText = ref('')
const lastRefresh = ref('')
const detailType = ref('')
const detailFilter = ref('')
const realtimeCarouselIndex = ref(0)
let timer = null
let realtimeTimer = null

const VIDEO_CAMERAS = [
  { id: 'cam-01', name: '航站楼全景摄像机01', group: '航站楼区域', online: true, state: 'playing' },
  { id: 'cam-02', name: '客服改造区摄像机02', group: '施工重点区域', online: true, state: 'playing' },
  { id: 'cam-03', name: '西区施工面球机03', group: '西区施工面', online: true, state: 'loading' },
  { id: 'cam-04', name: '材料堆场摄像机04', group: '材料堆场', online: false, state: 'offline' },
  { id: 'cam-05', name: '基坑入口摄像机05', group: '基坑区域', online: true, state: 'playing' },
  { id: 'cam-06', name: '塔吊作业区摄像机06', group: '机械作业区', online: true, state: 'playing' },
]

const DETAIL_CONFIG = {
  labor: {
    title: '现场人员明细',
    source: '人员实名制管理 > 实名制统计',
    rowKind: 'project',
    columns: [
      { label: '在岗人数', key: 'people', suffix: '人' },
      { label: '管理人员', key: 'managers', suffix: '人' },
      { label: '建筑工人', key: 'workers', suffix: '人' },
      { label: '特种作业人员', key: 'specialPeople', suffix: '人' },
      { label: '今日综合出勤率', key: 'attendanceRate', suffix: '%' },
      { label: '管理人员出勤率', key: 'manageAttendanceRate', suffix: '%' },
    ],
  },
  vehicle: {
    title: '车辆进出场明细',
    source: '车辆管理 > 车辆管理看板 / 进出场记录（当日）',
    rowKind: 'project',
    columns: [
      { label: '今日进场', key: 'vehicleIn', suffix: '辆' },
      { label: '今日出场', key: 'vehicleOut', suffix: '辆' },
    ],
  },
  laborMonthWarning: {
    title: '本月实名制预警明细',
    source: '人员实名制管理 > 人员预警',
    rowKind: 'record',
    columns: [
      { label: '人员姓名', key: 'personName' },
      { label: '预警事项', key: 'warningItem' },
    ],
  },
  laborPendingWarning: {
    title: '未处置实名制预警明细',
    source: '人员实名制管理 > 人员预警（状态：待处理）',
    rowKind: 'record',
    columns: [
      { label: '人员姓名', key: 'personName' },
      { label: '预警事项', key: 'warningItem' },
    ],
  },
  inspectionTask: {
    title: '巡检任务明细',
    source: '巡检管理 > 巡检看板 / 巡检任务',
    rowKind: 'project',
    columns: [
      { label: '任务总数', key: 'inspectionTotal', suffix: '项' },
      { label: '待执行数', key: 'inspectionPending', suffix: '项' },
      { label: '已完成数', key: 'inspectionDone', suffix: '项' },
      { label: '逾期任务数', key: 'inspectionOverdue', suffix: '项' },
      { label: '任务完成率', key: 'inspectionRate', suffix: '%' },
    ],
  },
  inspectionHazard: {
    title: '巡检隐患明细',
    source: '巡检管理 > 巡检看板 / 隐患清单',
    rowKind: 'project',
    columns: [
      { label: '隐患总数', key: 'inspectionHazards', suffix: '条' },
      { label: '待整改数', key: 'hazardPending', suffix: '条' },
      { label: '逾期数', key: 'hazardOverdue', suffix: '条' },
      { label: '闭环率', key: 'hazardClosureRate', suffix: '%' },
    ],
  },
  ai: {
    title: 'AI应用预警明细',
    source: 'AI应用 > 八类预警台账',
    rowKind: 'project',
    columns: [
      { label: '预警总数', key: 'aiTotal', suffix: '条' },
      { label: '今日预警', key: 'aiToday', suffix: '条' },
      { label: '本月预警', key: 'aiMonth', suffix: '条' },
    ],
  },
  equipmentConfig: {
    title: '重点设备配置明细',
    source: '机械设备监管 / 危大工程监测 > 设备配置',
    rowKind: 'project',
    columns: [
      { label: '塔吊', key: 'towerConfigured', suffix: '台' },
      { label: '升降机', key: 'liftConfigured', suffix: '台' },
      { label: '高支模', key: 'formworkConfigured', suffix: '台' },
      { label: '深基坑', key: 'pitConfigured', suffix: '台' },
    ],
  },
  equipmentAlerts: {
    title: '机械设备与危大工程预警明细',
    source: '机械设备监管 / 危大工程监测 > 预警记录（当日）',
    rowKind: 'record',
    columns: [
      { label: '预警类型', key: 'alertType' },
      { label: '预警内容', key: 'alertContent' },
    ],
  },
  projectPersonnel: {
    title: '人员实名制明细',
    source: '人员实名制管理 > 人员实名制',
    rowKind: 'record',
    primary: { label: '人员编号', key: 'personnelNo' },
    minWidth: 1320,
    columns: [
      { label: '姓名', key: 'personName' },
      { label: '手机号码', key: 'phone' },
      { label: '工人类型', key: 'personnelCategory' },
      { label: '工种/职务', key: 'workType' },
      { label: '参建单位名称', key: 'unitName' },
      { label: '特种资质有效期', key: 'certValidTo' },
      { label: '在岗状态', key: 'entryStatus' },
    ],
  },
  projectAttendance: {
    title: '今日考勤明细',
    source: '人员实名制管理 > 考勤管理 > 考勤明细',
    rowKind: 'record',
    primary: { label: '姓名', key: 'personName' },
    minWidth: 1660,
    columns: [
      { label: '身份证号', key: 'idCard' },
      { label: '工种', key: 'workType' },
      { label: '分包单位', key: 'unitName' },
      { label: '进出场', key: 'entryStatus' },
      { label: '进场时间', key: 'clockIn' },
      { label: '进场闸机', key: 'gateIn' },
      { label: '出场时间', key: 'clockOut' },
      { label: '出场闸机', key: 'gateOut' },
      { label: '工时(h)', key: 'workHours' },
      { label: '在场状态', key: 'onSiteStatus' },
    ],
  },
  projectVehicleAccess: {
    title: '车辆进出场记录',
    source: '车辆管理 > 进出场记录',
    rowKind: 'record',
    primary: { label: '车牌号', key: 'plateNo' },
    minWidth: 900,
    columns: [
      { label: '车辆类型', key: 'vehicleType' },
      { label: '方向', key: 'direction' },
      { label: '道闸', key: 'gateName' },
      { label: '记录时间', key: 'recordTime' },
    ],
  },
  projectLaborWarning: {
    title: '实名制预警明细',
    source: '人员实名制管理 > 人员预警',
    rowKind: 'record',
    primary: { label: '预警编号', key: 'warningNo' },
    minWidth: 1320,
    columns: [
      { label: '人员姓名', key: 'personName' },
      { label: '人员编号', key: 'personnelNo' },
      { label: '预警类型', key: 'warningType' },
      { label: '工种/职务', key: 'workType' },
      { label: '触发时间', key: 'triggeredAt' },
      { label: '状态', key: 'status' },
    ],
  },
  projectInspectionTask: {
    title: '巡检任务明细',
    source: '巡检管理 > 巡检任务',
    rowKind: 'record',
    primary: { label: '任务单编号', key: 'taskNo' },
    minWidth: 1580,
    columns: [
      { label: '巡检分类', key: 'inspectionCategory' },
      { label: '任务名称', key: 'taskName' },
      { label: '执行人', key: 'executor' },
      { label: '同行人', key: 'companions' },
      { label: '截止日期', key: 'deadline' },
      { label: '巡检日期', key: 'inspectionDate' },
      { label: '状态', key: 'status' },
      { label: '巡检结果', key: 'result' },
      { label: '隐患数量', key: 'hazardCount' },
      { label: '是否逾期', key: 'overdue' },
    ],
  },
  projectInspectionHazard: {
    title: '隐患清单明细',
    source: '巡检管理 > 隐患清单',
    rowKind: 'record',
    primary: { label: '整改单编号', key: 'rectifyNo' },
    minWidth: 1500,
    columns: [
      { label: '巡检任务单编号', key: 'taskNo' },
      { label: '巡检分类', key: 'inspectionCategory' },
      { label: '整改人', key: 'rectifier' },
      { label: '复查人', key: 'reviewer' },
      { label: '整改日期', key: 'rectDate' },
      { label: '复查日期', key: 'reviewDate' },
      { label: '整改截止日期', key: 'deadline' },
      { label: '是否逾期', key: 'overdue' },
      { label: '状态', key: 'status' },
    ],
  },
  projectAiAlert: {
    title: 'AI应用预警明细',
    source: 'AI应用 > 预警台账',
    rowKind: 'record',
    primary: { label: '预警编号', key: 'alertNo' },
    minWidth: 1500,
    columns: [
      { label: '预警类型', key: 'alertType' },
      { label: '预警内容', key: 'alertContent' },
      { label: '位置', key: 'location' },
      { label: '摄像头', key: 'camera' },
      { label: '发生时间', key: 'occurredAt' },
      { label: '状态', key: 'status' },
    ],
  },
  projectEquipment: {
    title: '机械设备与危大工程设备明细',
    source: '机械设备监管 / 危大工程监测 > 设备管理',
    rowKind: 'record',
    primary: { label: '设备编号', key: 'deviceNo' },
    minWidth: 1180,
    columns: [
      { label: '设备名称', key: 'deviceName' },
      { label: '设备类型', key: 'deviceType' },
      { label: '设备状态', key: 'deviceStatus' },
      { label: '在线状态', key: 'onlineStatus' },
      { label: '最近在线时间', key: 'lastOnlineTime' },
    ],
  },
  projectEquipmentAlert: {
    title: '机械设备与危大工程预警明细',
    source: '机械设备监管 / 危大工程监测 > 预警记录（当日）',
    rowKind: 'record',
    primary: { label: '预警类型', key: 'alertType' },
    minWidth: 1040,
    columns: [
      { label: '预警内容', key: 'alertContent' },
      { label: '预警级别', key: 'level' },
      { label: '处置状态', key: 'status' },
    ],
  },
  projectDailyWork: {
    title: '今日作业明细',
    source: '每日作业 > 作业填报',
    rowKind: 'record',
    primary: { label: '作业区域', key: 'workArea' },
    minWidth: 1460,
    columns: [
      { label: '作业内容', key: 'workContent' },
      { label: '危险作业类型', key: 'dangerWorkCategory' },
      { label: '施工单位', key: 'contractor' },
      { label: '计划开始时间', key: 'startTime' },
      { label: '计划结束时间', key: 'endTime' },
      { label: '施工单位项目经理', key: 'contractorProjectManager' },
    ],
  },
}

const selectedProject = computed(() => selectionId.value === HQ_SELECTION_ID
  ? null
  : projectRows.find((item) => item.id === selectionId.value) || null)
const levelLabel = computed(() => selectedProject.value ? '项目级' : '工程指挥部级')
const scope = computed(() => buildScopeSummary(selectedProject.value, projectRows))
const aiOverview = computed(() => getAiOverview(selectionId.value))
const trend = computed(() => buildTrend(selectedProject.value, projectRows, trendRange.value))
const monitorRows = computed(() => buildMonitorRows(selectedProject.value, projectRows))
const detailConfig = computed(() => DETAIL_CONFIG[detailType.value] || null)
const mapPoints = computed(() => buildMapPoints(selectionId.value, projectRows)
  .filter((item) => activeLayers.value.includes(item.type)))

const dailyWorkRecords = Array.isArray(dailyWorkSeed?.records) ? dailyWorkSeed.records : []

function resolveDailyWorkProjectId(projectName = '') {
  const text = String(projectName || '')
  const hit = projectRows.find((row) => text.includes(row.label) || text.includes(row.fullName) || row.fullName.includes(text))
  if (hit) return hit.id
  if (text.includes('三跑道')) return 'p-015'
  if (text.includes('捷运线')) return 'p-011'
  if (text.includes('下穿通道')) return 'p-012'
  if (text.includes('T2航站')) return 'p-000'
  if (text.includes('T1航站')) return 'p-001'
  return ''
}

function isNightWork(start, end) {
  return /(?:22|23|00|01|02|03|04|05|06):/.test(`${start || ''} ${end || ''}`)
}

const dailyWorkSummary = computed(() => {
  const rows = dailyWorkRecords.filter((row) => !selectedProject.value || resolveDailyWorkProjectId(row.projectName) === selectedProject.value.id)
  const dangerRows = rows.filter(isDangerWorkRecord)
  const categoryNames = ['动火作业', '吊装作业', '动土作业', '高处作业', '临时用电作业', '不涉及危险作业']
  if (selectedProject.value && !rows.length) {
    const seed = selectedProject.value.index + 1
    const demoCounts = [2 + (seed % 3), 1 + ((seed * 2) % 4), 3 + (seed % 5), 1 + (seed % 2), 1 + ((seed + 1) % 3), 1 + (seed % 2)]
    return {
      total: demoCounts.reduce((sum, count) => sum + count, 0),
      danger: demoCounts.slice(0, 5).reduce((sum, count) => sum + count, 0),
      major: 1 + (seed % 3),
      night: seed % 4,
      areas: 3 + (seed % 3),
      categories: categoryNames.map((label, index) => ({ label, count: demoCounts[index] })),
      latest: [],
    }
  }
  return {
    total: rows.length,
    danger: dangerRows.length,
    major: rows.filter(isMajorProjectRecord).length,
    night: rows.filter((row) => isNightWork(row.startTime, row.endTime)).length,
    areas: new Set(rows.map((row) => row.workArea).filter(Boolean)).size,
    categories: categoryNames.map((label) => ({
      label,
      count: rows.filter((row) => String(row.dangerWorkCategory || '').includes(label.replace('作业', ''))).length,
    })),
    latest: rows.slice(0, 3),
  }
})

const dangerCategoryMeta = [
  { key: 'earth', label: '动土作业', match: '动土', color: '#4ba8ff' },
  { key: 'fire', label: '动火作业', match: '动火', color: '#ff9a52' },
  { key: 'height', label: '高处作业', match: '高处', color: '#ffd166' },
  { key: 'electric', label: '临时用电作业', match: '临时用电', color: '#ff7a45' },
  { key: 'lifting', label: '吊装作业', match: '吊装', color: '#b78aff' },
]

const DANGER_WORK_PROJECT_EXAMPLES = [
  { id: 'demo-01', label: 'T2航站区配套', categories: { earth: 3, fire: 3, height: 2, electric: 1, lifting: 3 } },
  { id: 'demo-02', label: '二跑道FOD探测', categories: { earth: 2, fire: 2, height: 1, electric: 2, lifting: 2 } },
  { id: 'demo-03', label: 'T1航站区配套', categories: { earth: 1, fire: 2, height: 2, electric: 0, lifting: 2 } },
  { id: 'demo-04', label: '二跑道停航改造', categories: { earth: 2, fire: 1, height: 1, electric: 1, lifting: 1 } },
  { id: 'demo-05', label: 'T1地基整治', categories: { earth: 1, fire: 1, height: 1, electric: 0, lifting: 1 } },
  { id: 'demo-06', label: '东北站坪软基', categories: { earth: 2, fire: 1, height: 1, electric: 1, lifting: 2 } },
  { id: 'demo-07', label: '综合配套三期', categories: { earth: 1, fire: 2, height: 2, electric: 1, lifting: 2 } },
]

const dangerWorkDistribution = computed(() => {
  const groups = new Map()
  dailyWorkRecords.filter(isDangerWorkRecord).forEach((record) => {
    const projectId = resolveDailyWorkProjectId(record.projectName)
    const project = projectRows.find((row) => row.id === projectId)
    const key = projectId || record.projectName || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        label: project?.label || record.projectName || '未关联项目',
        categories: Object.fromEntries(dangerCategoryMeta.map((category) => [category.key, 0])),
        total: 0,
      })
    }
    const group = groups.get(key)
    const category = dangerCategoryMeta.find((item) => String(record.dangerWorkCategory || '').includes(item.match))
    if (category) group.categories[category.key] += 1
    group.total += 1
  })
  const rows = [...groups.values()]
  const existingLabels = new Set(rows.map((row) => row.label))
  DANGER_WORK_PROJECT_EXAMPLES.forEach((example) => {
    if (existingLabels.has(example.label)) return
    rows.push({
      ...example,
      total: Object.values(example.categories).reduce((sum, value) => sum + value, 0),
    })
  })
  return rows.sort((a, b) => b.total - a.total)
})
const dangerWorkMaximum = computed(() => Math.max(5, Math.ceil(Math.max(...dangerWorkDistribution.value.map((row) => row.total), 1) / 5) * 5))
const dangerWorkAxis = computed(() => [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(dangerWorkMaximum.value * ratio)))

const equipmentFocusMeta = [
  { key: 'tower', label: '塔吊', kind: 'equipment', match: '塔吊', color: '#b78aff' },
  { key: 'lift', label: '升降机', kind: 'equipment', match: '施工电梯', color: '#4ba8ff' },
  { key: 'formwork', label: '高支模', kind: 'major', hazardType: 'formwork', color: '#ff9a52' },
  { key: 'pit', label: '深基坑', kind: 'major', hazardType: 'pit', color: '#ff6680' },
]

function buildEquipmentFocusRows() {
  const projectIds = selectedProject.value ? [selectedProject.value.id] : projectRows.map((row) => row.id)
  return equipmentFocusMeta.map((meta) => {
    if (meta.kind === 'equipment') {
      const records = EQUIPMENT_SAMPLE_RECORDS.filter((record) => projectIds.includes(record.projectId) && String(record.type || '').includes(meta.match))
      const anomalies = EQUIPMENT_ANOMALIES.filter((record) => projectIds.includes(record.projectId) && String(record.name || '').includes(meta.match))
      const latestDate = anomalies.reduce((latest, record) => String(record.date || '') > latest ? String(record.date) : latest, '')
      const todayRecords = anomalies.filter((record) => String(record.date || '') === latestDate)
      return {
        ...meta,
        configured: records.length,
        online: records.filter((record) => record.monitorConnected).length,
        alerts: anomalies.length,
        unhandled: anomalies.filter((record) => record.status !== '已闭合').length,
        todayAlerts: todayRecords.length,
        todayRecords,
      }
    }
    const totals = projectIds.reduce((total, projectId) => {
      const monitor = getMonitorStats(projectId, meta.hazardType)
      total.configured += monitor.devices
      total.online += monitor.onlineDevices
      return total
    }, { ...meta, configured: 0, online: 0 })
    const alerts = projectIds.flatMap((projectId) => getAlertRecords(projectId, meta.hazardType, {}))
    const latestDate = alerts.reduce((latest, record) => String(record.time || '').slice(0, 10) > latest ? String(record.time).slice(0, 10) : latest, '')
    const todayRecords = alerts.filter((record) => String(record.time || '').startsWith(latestDate))
    return {
      ...totals,
      alerts: alerts.length,
      unhandled: alerts.filter((record) => record.status === '未处置').length,
      todayAlerts: todayRecords.length,
      todayRecords,
    }
  })
}

const equipmentFocusRows = computed(() => buildEquipmentFocusRows())
const equipmentFocusTotals = computed(() => equipmentFocusRows.value.reduce((total, row) => ({
  configured: total.configured + row.configured,
  online: total.online + row.online,
  alerts: total.alerts + row.alerts,
  unhandled: total.unhandled + row.unhandled,
  todayAlerts: total.todayAlerts + row.todayAlerts,
}), { configured: 0, online: 0, alerts: 0, unhandled: 0, todayAlerts: 0 }))

function projectName(projectId) {
  return projectRows.find((row) => row.id === projectId)?.label || '未匹配项目'
}

const laborMonthWarningRows = computed(() => {
  const warnings = getProjectWarnings(HQ_SELECTION_ID)
  const latestMonth = warnings.reduce((latest, item) => {
    const month = String(item.triggered_at || '').slice(0, 7)
    return month > latest ? month : latest
  }, '')
  return warnings
    .filter((item) => String(item.triggered_at || '').startsWith(latestMonth))
    .map((item) => ({
      id: item.id,
      projectId: item.project_id,
      projectName: projectName(item.project_id),
      personName: item.name,
      warningItem: item.rule_label || item.trigger_reason,
      status: item.status,
    }))
})

const equipmentAlertRows = computed(() => equipmentFocusRows.value.flatMap((focus) => (focus.todayRecords || []).map((record) => ({
  id: `${focus.key}-${record.id}`,
  projectId: record.projectId,
  projectName: projectName(record.projectId),
  alertType: record.alertType || `${focus.label} · ${record.type || '运行预警'}`,
  alertContent: record.detail || record.desc || `${focus.label}监测数据异常`,
  status: record.status,
  level: focus.kind === 'major'
    ? (record.level === '一级' ? '重大' : '一般')
    : (record.type === '限位失效' ? '重大' : '一般'),
}))))

const equipmentAlertStats = computed(() => ({
  total: equipmentAlertRows.value.length,
  major: equipmentAlertRows.value.filter((row) => row.level === '重大').length,
  unhandled: equipmentAlertRows.value.filter((row) => !['已闭合', '已处置'].includes(row.status)).length,
}))

const equipmentConfigRows = computed(() => projectRows.map((row) => ({
  ...row,
  projectId: row.id,
  projectName: row.label,
  towerConfigured: EQUIPMENT_SAMPLE_RECORDS.filter((record) => record.projectId === row.id && record.type === '塔吊').length,
  liftConfigured: EQUIPMENT_SAMPLE_RECORDS.filter((record) => record.projectId === row.id && record.type === '施工电梯').length,
  formworkConfigured: getMonitorStats(row.id, 'formwork').devices,
  pitConfigured: getMonitorStats(row.id, 'pit').devices,
})))

function currentProjectId() {
  return selectedProject.value?.id || ''
}

function projectPersonnelRows(filter = 'all') {
  const rows = getProjectPersonnel(currentProjectId()).filter((item) => item.entry_status === '在岗')
  return rows
    .filter((item) => {
      if (filter === 'manager') return item.unit?.personnel_category === '管理人员'
      if (filter === 'worker') return item.unit?.personnel_category === '建筑工人'
      if (filter === 'special') return Boolean(item.is_special)
      return true
    })
    .map((item) => ({
      id: item.id,
      personnelNo: item.basic?.personnel_no,
      personName: item.basic?.name,
      phone: maskPhone(item.basic?.phone),
      personnelCategory: item.unit?.personnel_category,
      workType: item.unit?.work_type,
      unitName: item.unit?.unit_name,
      certValidTo: item.is_special ? item.unit?.cert_valid_to : '—',
      entryStatus: item.entry_status,
    }))
}

function projectAttendanceRows(filter = 'all') {
  const managerNames = new Set(getProjectPersonnel(currentProjectId())
    .filter((item) => item.unit?.personnel_category === '管理人员')
    .map((item) => item.basic?.name))
  return getAttendanceDetails(currentProjectId())
    .filter((item) => filter !== 'manager' || managerNames.has(item.name))
    .map((item) => ({
      id: item.id,
      personName: item.name,
      idCard: item.id_card,
      workType: item.work_type,
      unitName: item.unit_name,
      entryStatus: item.entry_status,
      clockIn: item.clock_in,
      gateIn: item.gate_in,
      clockOut: item.clock_out,
      gateOut: item.gate_out,
      workHours: item.work_hours,
      onSiteStatus: item.on_site_status,
    }))
}

function projectVehicleRows(filter = 'all') {
  return getProjectAccessRecords(currentProjectId())
    .filter((item) => filter === 'all' || item.direction === (filter === 'in' ? '进场' : '出场'))
    .map((item) => ({
      id: item.id,
      plateNo: item.plate_no,
      vehicleType: item.vehicle_type,
      direction: item.direction,
      gateName: item.gate_name,
      recordTime: item.record_time,
    }))
}

function projectWarningRows(filter = 'all') {
  return getProjectWarnings(currentProjectId())
    .filter((item) => filter !== 'pending' || item.status === '待处理')
    .map((item) => ({
      id: item.id,
      warningNo: item.warning_no,
      personName: item.name,
      personnelNo: item.personnel_no,
      warningType: item.rule_label,
      workType: item.work_type,
      triggeredAt: item.triggered_at,
      status: item.status,
    }))
}

function projectInspectionTaskRows(filter = 'all') {
  return listMobileInspectionTasks()
    .filter((item) => (item.project_id || item.projectId) === currentProjectId())
    .filter((item) => {
      if (filter === 'pending') return item.status === '待执行'
      if (filter === 'completed') return item.status === '已完成'
      if (filter === 'overdue') return Boolean(item.overdue)
      return true
    })
    .map((item) => ({
      id: item.id,
      taskNo: item.taskNo,
      inspectionCategory: formatInspectionCategories(item.inspectionCategories || item.inspectionCategory),
      taskName: item.taskName,
      executor: item.executor || item.inspector,
      companions: Array.isArray(item.companions) ? item.companions.join('、') : item.companions,
      deadline: item.deadline,
      inspectionDate: item.inspectionDate,
      status: item.status,
      result: item.result === 'normal' ? '正常' : item.result === 'hazard' ? '有隐患' : '',
      hazardCount: item.hazardCount,
      overdue: item.overdue ? '是' : '否',
    }))
}

function projectInspectionHazardRows(filter = 'all') {
  return inspectionHazards
    .filter((item) => (item.project_id || item.projectId) === currentProjectId())
    .filter((item) => {
      const overdue = item.deadline < INSPECTION_DEMO_TODAY && !['已复查', '已关闭'].includes(item.status)
      if (filter === 'pending') return item.status === '待整改'
      if (filter === 'overdue') return overdue
      if (filter === 'closed') return item.status === '已关闭'
      return true
    })
    .map((item) => ({
      id: item.id,
      rectifyNo: item.rectifyNo,
      taskNo: item.taskNo,
      inspectionCategory: item.inspectionCategory,
      rectifier: item.rectifier,
      reviewer: item.reviewer,
      rectDate: item.rectDate,
      reviewDate: item.reviewDate,
      deadline: item.deadline,
      overdue: item.deadline < INSPECTION_DEMO_TODAY && !['已复查', '已关闭'].includes(item.status) ? '是' : '否',
      status: item.status,
    }))
}

function projectAiAlertRows(filter = 'all') {
  const source = getAiAlerts({ projectId: currentProjectId() })
  const latestDate = source.reduce((latest, item) => String(item.occurredAt || '').slice(0, 10) > latest ? String(item.occurredAt).slice(0, 10) : latest, '')
  const latestMonth = latestDate.slice(0, 7)
  return source
    .filter((item) => {
      if (filter === 'today') return String(item.occurredAt || '').startsWith(latestDate)
      if (filter === 'month') return String(item.occurredAt || '').startsWith(latestMonth)
      if (filter.startsWith('type:')) return item.alertType === filter.slice(5)
      return true
    })
    .map((item) => ({
      id: item.id,
      alertNo: item.alertNo,
      alertType: item.alertType,
      alertContent: item.content,
      location: item.location,
      camera: item.camera,
      occurredAt: item.occurredAt,
      status: item.status,
    }))
}

function projectEquipmentRows(filter = 'all') {
  const typeKey = filter.startsWith('type:') ? filter.slice(5) : ''
  const metaRows = typeKey ? equipmentFocusMeta.filter((item) => item.key === typeKey) : equipmentFocusMeta
  const rows = metaRows.flatMap((meta) => {
    if (meta.kind === 'equipment') {
      return EQUIPMENT_SAMPLE_RECORDS
        .filter((item) => item.projectId === currentProjectId() && String(item.type || '').includes(meta.match))
        .map((item) => ({
          id: `equipment-${item.id}`,
          deviceNo: item.id,
          deviceName: item.name,
          deviceType: meta.label,
          deviceStatus: item.status || item.result,
          onlineStatus: item.monitorConnected ? '在线' : '离线',
          lastOnlineTime: item.date,
        }))
    }
    return getDevices(currentProjectId(), meta.hazardType).map((item) => ({
      id: `major-${meta.key}-${item.id}`,
      deviceNo: item.deviceNo,
      deviceName: item.name,
      deviceType: meta.label,
      deviceStatus: item.deviceStatus,
      onlineStatus: item.online ? '在线' : '离线',
      lastOnlineTime: item.lastOnlineTime,
    }))
  })
  return rows.filter((item) => filter !== 'online' || item.onlineStatus === '在线')
}

function projectEquipmentAlertRows(filter = 'all') {
  return equipmentAlertRows.value
    .filter((item) => item.projectId === currentProjectId())
    .filter((item) => {
      if (filter === 'major') return item.level === '重大'
      if (filter === 'unhandled') return !['已闭合', '已处置'].includes(item.status)
      if (filter.startsWith('type:')) return item.id.startsWith(`${filter.slice(5)}-`)
      return true
    })
}

function projectDailyWorkRows() {
  return dailyWorkRecords
    .filter((item) => resolveDailyWorkProjectId(item.projectName) === currentProjectId())
    .map((item) => ({
      id: item.id,
      workArea: item.workArea,
      workContent: item.workContent,
      dangerWorkCategory: item.dangerWorkCategory,
      contractor: item.contractor,
      startTime: item.startTime,
      endTime: item.endTime,
      contractorProjectManager: item.contractorProjectManager,
    }))
}

const detailRows = computed(() => {
  const baseRows = projectRows.map((row) => ({ ...row, projectId: row.id, projectName: row.label }))
  if (detailType.value === 'laborMonthWarning') return laborMonthWarningRows.value
  if (detailType.value === 'laborPendingWarning') return laborMonthWarningRows.value.filter((row) => row.status === '待处理')
  if (detailType.value === 'equipmentConfig') return equipmentConfigRows.value
  if (detailType.value === 'equipmentAlerts') return equipmentAlertRows.value
  if (detailType.value === 'projectPersonnel') return projectPersonnelRows(detailFilter.value)
  if (detailType.value === 'projectAttendance') return projectAttendanceRows(detailFilter.value)
  if (detailType.value === 'projectVehicleAccess') return projectVehicleRows(detailFilter.value)
  if (detailType.value === 'projectLaborWarning') return projectWarningRows(detailFilter.value)
  if (detailType.value === 'projectInspectionTask') return projectInspectionTaskRows(detailFilter.value)
  if (detailType.value === 'projectInspectionHazard') return projectInspectionHazardRows(detailFilter.value)
  if (detailType.value === 'projectAiAlert') return projectAiAlertRows(detailFilter.value)
  if (detailType.value === 'projectEquipment') return projectEquipmentRows(detailFilter.value)
  if (detailType.value === 'projectEquipmentAlert') return projectEquipmentAlertRows(detailFilter.value)
  if (detailType.value === 'projectDailyWork') return projectDailyWorkRows()
  return baseRows
})

const detailSubtitle = computed(() => detailConfig.value?.rowKind === 'project'
  ? `${projectRows.length}个在建项目`
  : `${selectedProject.value ? `${selectedProject.value.label} · ` : ''}${detailRows.value.length}条记录`)

function polarPoint(radius, angle) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: 100 + radius * Math.cos(radians), y: 100 + radius * Math.sin(radians) }
}

function roseSectorPath(index, count, maxCount, sectorCount = dailyWorkSummary.value.categories.length) {
  const step = 360 / Math.max(sectorCount, 1)
  const gap = 3
  const start = index * step + gap / 2
  const end = (index + 1) * step - gap / 2
  const radius = 24 + (count / Math.max(maxCount, 1)) * 68
  const p1 = polarPoint(radius, start)
  const p2 = polarPoint(radius, end)
  return `M 100 100 L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`
}

const dailyWorkRose = computed(() => {
  const categories = dailyWorkSummary.value.categories
  const maxCount = Math.max(...categories.map((item) => item.count), 1)
  return categories.map((item, index) => ({
    ...item,
    index,
    color: dangerCategoryMeta.find((meta) => meta.label === item.label)?.color || '#62d9a7',
    path: roseSectorPath(index, item.count, maxCount),
  })).filter((item) => item.count > 0)
})

const aiWarningRose = computed(() => {
  const categories = aiOverview.value.alertTypes
  const maxCount = Math.max(...categories.map((item) => item.value), 1)
  return categories.map((item, index) => ({
    ...item,
    path: roseSectorPath(index, item.value, maxCount, categories.length),
  }))
})

const realtimeAlerts = computed(() => {
  const alerts = []
  aiOverview.value.latest.slice(0, 3).forEach((item) => alerts.push({
    id: `ai-${item.id}`,
    type: 'ai',
    time: String(item.occurredAt || '').slice(11, 16) || '10:25',
    source: 'AI预警',
    content: item.alertType || '现场不安全行为',
    location: selectedProject.value ? item.location : (item.projectName || item.location),
    project: item.projectName || selectedProject.value?.label || '全机场工程',
    level: item.requiresDisposal === false ? '—' : item.status === '未处置' ? '重大' : '一般',
    status: item.status,
  }))
  monitorRows.value.slice(0, 3).forEach((item, index) => alerts.push({
    id: `monitor-${item.id}`,
    type: item.type === '危大' ? 'major' : 'machine',
    time: item.time || `10:${String(20 - index).padStart(2, '0')}`,
    source: item.type === '危大' ? '危大监测' : '机械设备',
    content: item.title,
    location: selectedProject.value ? item.position : item.project,
    project: item.project || selectedProject.value?.label || '全机场工程',
    level: item.level || '一般',
    status: '未处置',
  }))
  const overdueRows = (selectedProject.value ? [selectedProject.value] : projectRows)
    .filter((row) => row.inspectionOverdue > 0)
    .slice(0, 2)
  overdueRows.forEach((row, index) => alerts.push({
    id: `inspection-${row.id}`,
    type: 'inspection',
    time: `10:${String(20 - index * 3).padStart(2, '0')}`,
    source: '巡检',
    content: '巡检任务逾期未执行',
    location: selectedProject.value ? '施工现场' : row.label,
    project: row.label,
    level: '较大',
    status: '待处理',
  }))
  return alerts.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5)
})
const rotatingRealtimeAlerts = computed(() => {
  const list = realtimeAlerts.value
  if (list.length <= 4) return list
  return Array.from({ length: 4 }, (_, index) => list[(realtimeCarouselIndex.value + index) % list.length])
})

const trendStackedBars = computed(() => trend.value.map((item) => ({
  ...item,
  total: item.inspection + item.machine + item.major + item.ai,
  segments: [
    { key: 'inspection', value: item.inspection, color: '#4ba8ff', label: '巡检待执行' },
    { key: 'machine', value: item.machine, color: '#b78aff', label: '机械预警' },
    { key: 'major', value: item.major, color: '#ff6680', label: '危大预警' },
    { key: 'ai', value: item.ai, color: '#ff9a52', label: 'AI预警' },
  ],
})))
const trendStackedMaximum = computed(() => Math.max(...trendStackedBars.value.map((item) => item.total), 1))
const trendAxisMaximum = computed(() => Math.max(10, Math.ceil(trendStackedMaximum.value / 50) * 50))
const trendAxisTicks = computed(() => [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(trendAxisMaximum.value * ratio)))

function pad(value) {
  return String(value).padStart(2, '0')
}

function tick() {
  const now = new Date()
  clockText.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  dateText.value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  weekdayText.value = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()]
  if (!lastRefresh.value) lastRefresh.value = clockText.value
}

function changeProject(eventOrId) {
  const id = typeof eventOrId === 'string' ? eventOrId : eventOrId.target.value
  if (!allowedIds.has(id)) return
  selectionId.value = id
  selectedPoint.value = null
  if (id === HQ_SELECTION_ID) mapMode.value = 'gis'
  router.replace({ query: { ...route.query, projectId: id } })
}

function toggleLayer(type) {
  activeLayers.value = activeLayers.value.includes(type)
    ? activeLayers.value.filter((item) => item !== type)
    : [...activeLayers.value, type]
}

function enterPointProject() {
  if (selectedPoint.value?.projectId) changeProject(selectedPoint.value.projectId)
}

function refreshData() {
  const now = new Date()
  lastRefresh.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}

function closeScreen() {
  if (window.opener && !window.opener.closed) {
    window.close()
    return
  }
  window.location.hash = '#/workbench'
}

function openHqDetail(type) {
  if (selectedProject.value || !DETAIL_CONFIG[type]) return
  detailFilter.value = ''
  detailType.value = type
}

function openScopedDetail(hqType, projectType, filter = 'all') {
  const type = selectedProject.value ? projectType : hqType
  if (!type || !DETAIL_CONFIG[type]) return
  detailFilter.value = selectedProject.value ? filter : ''
  detailType.value = type
}

function openProjectDetail(type, filter = 'all') {
  if (!selectedProject.value || !DETAIL_CONFIG[type]) return
  detailFilter.value = filter
  detailType.value = type
}

function closeHqDetail() {
  detailType.value = ''
  detailFilter.value = ''
}

function enterDetailProject(projectId) {
  closeHqDetail()
  changeProject(projectId)
}

function detailValue(row, column) {
  const value = row[column.key]
  return value === undefined || value === null || value === '' ? '—' : `${value}${column.suffix || ''}`
}

function handleRealtimeAlert(item) {
  if (item.type === 'inspection') {
    router.push('/safety-inspection/task')
    return
  }
  if (item.type === 'ai') {
    router.push('/ai-app/unsafe-behavior')
    return
  }
  if (item.type === 'major') {
    router.push('/major-hazard/alert-record')
    return
  }
  router.push('/machine-supervise/alert-record')
}

/**
 * 画布等比缩放（用户 2026-10-21，方案 A）：
 * 大屏按 1920×1080 设计稿排版，再整体缩放到视口内并居中，
 * 避免窗口偏矮时面板被压扁、文字重叠（看着像乱码）。
 */
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const screenScale = ref(1)

function updateScreenScale() {
  const w = window.innerWidth || DESIGN_WIDTH
  const h = window.innerHeight || DESIGN_HEIGHT
  const scale = Math.min(w / DESIGN_WIDTH, h / DESIGN_HEIGHT)
  screenScale.value = Number.isFinite(scale) && scale > 0 ? Number(scale.toFixed(4)) : 1
}

onMounted(() => {
  document.body.classList.add('coc-hq-shell')
  updateScreenScale()
  window.addEventListener('resize', updateScreenScale)
  tick()
  timer = window.setInterval(tick, 1000)
  realtimeTimer = window.setInterval(() => {
    if (realtimeAlerts.value.length > 1) realtimeCarouselIndex.value = (realtimeCarouselIndex.value + 1) % realtimeAlerts.value.length
  }, 3500)
})

onUnmounted(() => {
  document.body.classList.remove('coc-hq-shell')
  window.removeEventListener('resize', updateScreenScale)
  if (timer) window.clearInterval(timer)
  if (realtimeTimer) window.clearInterval(realtimeTimer)
})
</script>

<template>
  <div class="safety-screen-app safety-screen-v1" :style="{ '--screen-scale': screenScale }">
    <HqEdgeLights />

    <header class="safety-header">
      <img class="safety-header__bg" :src="headerBg" alt="" aria-hidden="true" />
      <div class="safety-header__left">
        <span class="level-chip"><i />{{ levelLabel }}</span>
        <select class="project-select" :value="selectionId" @change="changeProject">
          <option :value="HQ_SELECTION_ID">工程指挥部 · 全部项目</option>
          <option v-for="project in projectRows" :key="project.id" :value="project.id">{{ project.label }}</option>
        </select>
      </div>
      <h1>深圳机场建设工程安全态势大屏</h1>
      <div class="safety-header__right">
        <span class="refresh-time">更新 {{ lastRefresh }}</span>
        <div class="header-clock"><strong>{{ clockText }}</strong><span>{{ dateText }}<br />{{ weekdayText }}</span></div>
        <img :src="weatherIcon" alt="" class="weather-icon" />
        <span class="temperature">32℃</span>
        <button title="刷新数据" @click="refreshData"><el-icon><Refresh /></el-icon></button>
        <button title="全屏" @click="toggleFullscreen"><el-icon><FullScreen /></el-icon></button>
        <button title="关闭" @click="closeScreen"><el-icon><Close /></el-icon></button>
      </div>
    </header>

    <main class="dashboard-shell">
      <aside class="dashboard-column dashboard-column--left">
        <section class="screen-panel resource-panel">
          <div class="panel-heading" :class="{ 'detail-trigger': !selectedProject }" @click="openHqDetail('labor')"><span>现场人员与车辆</span><small v-if="selectedProject">当前人员 / 车辆</small></div>
          <div class="metric-quad">
            <div class="detail-trigger" @click="openScopedDetail('labor', 'projectPersonnel', 'all')"><span>在岗人数</span><strong>{{ scope.people }}</strong><em>人</em></div>
            <div class="detail-trigger" @click="openScopedDetail('labor', 'projectPersonnel', 'manager')"><span>管理人员</span><strong>{{ scope.managers }}</strong><em>人</em></div>
            <div class="detail-trigger" @click="openScopedDetail('labor', 'projectPersonnel', 'worker')"><span>建筑工人</span><strong>{{ scope.workers }}</strong><em>人</em></div>
            <div class="detail-trigger" @click="openScopedDetail('labor', 'projectPersonnel', 'special')"><span>特种作业人员</span><strong>{{ scope.specialPeople }}</strong><em>人</em></div>
          </div>
          <div class="rate-list">
            <div class="detail-trigger" @click="openScopedDetail('labor', 'projectAttendance', 'all')"><p><span>今日综合出勤率</span><b>{{ scope.attendanceRate }}%</b></p><i><em :style="{ width: `${scope.attendanceRate}%` }" /></i></div>
            <div class="detail-trigger" @click="openScopedDetail('labor', 'projectAttendance', 'manager')"><p><span>管理人员出勤率</span><b>{{ scope.manageAttendanceRate }}%</b></p><i><em :style="{ width: `${scope.manageAttendanceRate}%` }" /></i></div>
          </div>
          <div class="resource-vehicle-strip">
            <div class="detail-trigger" @click="openScopedDetail('vehicle', 'projectVehicleAccess', 'in')"><span>今日进场</span><strong>{{ scope.vehicleIn }}</strong><em>辆</em></div>
            <div class="detail-trigger" @click="openScopedDetail('vehicle', 'projectVehicleAccess', 'out')"><span>今日出场</span><strong>{{ scope.vehicleOut }}</strong><em>辆</em></div>
          </div>
          <div class="inline-alerts">
            <span class="detail-trigger" @click="openScopedDetail('laborMonthWarning', 'projectLaborWarning', 'month')">本月实名制预警 <b>{{ scope.laborMonthWarnings }}</b></span>
            <span class="detail-trigger" @click="openScopedDetail('laborPendingWarning', 'projectLaborWarning', 'pending')">未处置 <b class="warn">{{ scope.laborPendingWarnings }}</b></span>
          </div>
        </section>

        <section class="screen-panel inspection-panel">
          <div class="panel-heading"><span>巡检管理</span><small v-if="selectedProject">任务与隐患闭环</small></div>
          <div class="inspection-overview">
            <div class="ring detail-trigger" :style="{ '--rate': `${scope.inspectionRate * 3.6}deg` }" @click="openScopedDetail('inspectionTask', 'projectInspectionTask', 'all')"><div><strong>{{ scope.inspectionRate }}%</strong><span>任务完成率</span></div></div>
            <div class="inspection-stats">
              <div class="detail-trigger" @click="openScopedDetail('inspectionTask', 'projectInspectionTask', 'all')"><span>任务总数</span><b>{{ scope.inspectionTotal }}</b></div>
              <div class="detail-trigger" @click="openScopedDetail('inspectionTask', 'projectInspectionTask', 'pending')"><span>待执行</span><b class="warn">{{ scope.inspectionPending }}</b></div>
              <div class="detail-trigger" @click="openScopedDetail('inspectionTask', 'projectInspectionTask', 'completed')"><span>已完成</span><b>{{ scope.inspectionDone }}</b></div>
              <div class="detail-trigger" @click="openScopedDetail('inspectionTask', 'projectInspectionTask', 'overdue')"><span>逾期任务</span><b class="danger">{{ scope.inspectionOverdue }}</b></div>
            </div>
          </div>
          <div class="hazard-strip">
            <div class="detail-trigger" @click="openScopedDetail('inspectionHazard', 'projectInspectionHazard', 'all')"><span>巡检隐患</span><strong>{{ scope.inspectionHazards }}</strong></div>
            <div class="detail-trigger" @click="openScopedDetail('inspectionHazard', 'projectInspectionHazard', 'pending')"><span>待整改</span><strong class="warn">{{ scope.hazardPending }}</strong></div>
            <div class="detail-trigger" @click="openScopedDetail('inspectionHazard', 'projectInspectionHazard', 'overdue')"><span>逾期</span><strong class="danger">{{ scope.hazardOverdue }}</strong></div>
            <div class="detail-trigger" @click="openScopedDetail('inspectionHazard', 'projectInspectionHazard', 'closed')"><span>闭环率</span><strong>{{ scope.hazardClosureRate }}%</strong></div>
          </div>
        </section>

      </aside>

      <section class="dashboard-center">
        <section class="screen-panel map-panel">
          <div class="map-toolbar">
            <div>
              <span class="map-title">
                <el-icon><VideoCamera v-if="mapMode === 'video'" /><Location v-else /></el-icon>
                {{ mapMode === 'video' ? (selectedProject ? `${selectedProject.label}视频监控` : '全机场工程视频监控总览') : (selectedProject ? selectedProject.fullName : '深圳机场建设工程安全总图') }}
              </span>
              <small>{{ mapMode === 'video' ? '重点区域视频轮巡与在线状态集中展示' : (selectedProject ? '项目安全数据与模型点位融合展示' : '全部在建项目安全数据汇聚展示') }}</small>
            </div>
            <div class="mode-switch">
              <button :class="{ active: mapMode === 'gis' }" @click="mapMode = 'gis'">GIS</button>
              <button :class="{ active: mapMode === 'bim' }" :disabled="!selectedProject" @click="mapMode = 'bim'">BIM</button>
              <button :class="{ active: mapMode === 'video' }" @click="mapMode = 'video'">视频监控</button>
            </div>
          </div>

          <div v-if="mapMode === 'video'" class="video-monitor-scene">
            <aside class="video-camera-sidebar">
              <div class="video-view-switch"><button class="active" title="列表视图">▦</button><button title="四宫格视图">▦</button><button title="九宫格视图">▦</button></div>
              <div class="video-list-heading"><strong>视频列表</strong><span>{{ VIDEO_CAMERAS.filter((item) => item.online).length }}/{{ VIDEO_CAMERAS.length }} 在线</span></div>
              <div class="video-search-row"><span>关键字搜索</span><button>全部⌄</button></div>
              <div class="video-group-title"><span>▾ 默认分组</span><b>({{ VIDEO_CAMERAS.filter((item) => item.online).length }}/{{ VIDEO_CAMERAS.length }})</b></div>
              <button v-for="camera in VIDEO_CAMERAS" :key="camera.id" type="button" class="video-camera-item" :class="{ offline: !camera.online }">
                <i />
                <span>◉</span>
                <strong>{{ camera.name }}</strong>
                <em>☆</em>
              </button>
            </aside>
            <div class="video-wall">
              <div v-for="(camera, index) in VIDEO_CAMERAS.slice(0, 4)" :key="camera.id" class="video-tile" :class="[`video-tile--${camera.state}`, `video-tile--${index + 1}`]">
                <img v-if="camera.state === 'playing'" :src="videoMonitorThumb" alt="" />
                <div v-if="camera.state === 'loading'" class="video-loading"><i /><span>请稍等，视频加载中……</span></div>
                <div v-else-if="camera.state === 'offline'" class="video-offline"><span>设备离线</span><small>请检查网络或设备状态</small></div>
                <div class="video-tile-status"><i :class="{ offline: !camera.online }" />{{ camera.online ? '实时' : '离线' }}</div>
                <strong class="video-tile-name">{{ camera.name }}</strong>
              </div>
            </div>
          </div>

          <div v-else class="map-scene" :class="[`mode-${mapMode}`, { 'project-scene': selectedProject }]">
            <div class="map-grid-lines" />
            <div class="airport-runway runway-a"><span>16L / 34R</span></div>
            <div class="airport-runway runway-b"><span>16R / 34L</span></div>
            <div class="terminal-shape terminal-main"><i /><i /><i /><span>{{ selectedProject && mapMode === 'bim' ? 'BIM施工模型' : '航站区' }}</span></div>
            <div class="terminal-shape terminal-side"><i /><i /><span>施工区域</span></div>
            <div v-if="selectedProject && mapMode === 'bim'" class="bim-model">
              <div class="bim-floor floor-4">屋面层</div><div class="bim-floor floor-3">设备层</div><div class="bim-floor floor-2">主体结构</div><div class="bim-floor floor-1">基础层</div>
            </div>

            <div class="map-metric-rail">
              <div class="detail-trigger" @click="openScopedDetail('labor', 'projectPersonnel', 'all')"><span>在岗人员</span><strong>{{ scope.people }}</strong><em>人</em></div>
              <div class="detail-trigger" @click="openScopedDetail('vehicle', 'projectVehicleAccess', 'all')"><span>在场车辆</span><strong>{{ scope.vehicles }}</strong><em>辆</em></div>
              <div class="detail-trigger" @click="openScopedDetail('inspectionTask', 'projectInspectionTask', 'pending')"><span>巡检待执行</span><strong>{{ scope.inspectionPending }}</strong><em>项</em></div>
              <div class="detail-trigger" @click="openScopedDetail('equipmentAlerts', 'projectEquipmentAlert', 'all')"><span>今日监测预警</span><strong>{{ equipmentAlertStats.total }}</strong><em>条</em></div>
              <div class="detail-trigger" @click="openScopedDetail('ai', 'projectAiAlert', 'all')"><span>AI预警</span><strong>{{ scope.aiTotal }}</strong><em>条</em></div>
            </div>

            <button
              v-for="point in mapPoints"
              :key="point.id"
              class="map-point"
              :class="[`point-${point.type}`, { selected: selectedPoint?.id === point.id, cluster: !selectedProject }]"
              :style="{ left: `${point.x}%`, top: `${point.y}%`, '--point-color': getTypeMeta(point.type).color }"
              :title="point.title"
              @click="selectedPoint = point"
            >
              <span>{{ selectedProject ? getTypeMeta(point.type).icon : point.value }}</span>
              <em v-if="selectedProject">{{ point.title }}</em>
            </button>

            <div v-if="selectedPoint" class="point-popover">
              <button class="popover-close" @click="selectedPoint = null">×</button>
              <div class="popover-type" :style="{ color: getTypeMeta(selectedPoint.type).color }">{{ getTypeMeta(selectedPoint.type).label }}</div>
              <h4>{{ selectedPoint.title }}</h4>
              <p>{{ selectedPoint.subtitle }}</p>
              <div class="popover-detail">{{ selectedPoint.detail }}</div>
              <button v-if="!selectedProject" class="enter-project-btn" @click="enterPointProject">进入项目级大屏</button>
            </div>

            <div class="map-compass"><span>N</span><i /></div>
            <div class="map-scale"><i />500m</div>
            <div class="map-status"><span />BIM+GIS服务正常</div>
          </div>

          <div v-if="mapMode === 'video'" class="video-monitor-footer">
            <span>监控总数 <b>{{ VIDEO_CAMERAS.length }}</b></span><span>在线 <b>{{ VIDEO_CAMERAS.filter((item) => item.online).length }}</b></span><span>离线 <b class="warn">{{ VIDEO_CAMERAS.filter((item) => !item.online).length }}</b></span><em>双击画面可进入单路监控详情</em>
          </div>
          <div v-else class="layer-bar">
            <span>数据图层</span>
            <button v-for="layer in LAYER_OPTIONS" :key="layer.value" :class="{ active: activeLayers.includes(layer.value) }" @click="toggleLayer(layer.value)">
              <i :style="{ background: layer.color }" />{{ layer.label }}
            </button>
          </div>
        </section>

      </section>

      <aside class="dashboard-column dashboard-column--right">
        <section class="screen-panel ai-panel is-drillable" @click="openScopedDetail('ai', 'projectAiAlert', 'all')">
          <div class="panel-heading"><span>AI应用预警</span><small v-if="selectedProject">八类预警统计</small></div>
          <div class="ai-summary">
            <div @click.stop="openScopedDetail('ai', 'projectAiAlert', 'all')"><span>预警总数</span><strong>{{ aiOverview.total }}</strong></div>
            <div @click.stop="openScopedDetail('ai', 'projectAiAlert', 'today')"><span>今日预警</span><strong>{{ aiOverview.today }}</strong></div>
            <div @click.stop="openScopedDetail('ai', 'projectAiAlert', 'month')"><span>本月预警</span><strong>{{ aiOverview.month }}</strong></div>
          </div>
          <div class="ai-rose-layout" aria-label="AI预警类别玫瑰图">
            <div class="ai-rose-chart">
              <svg viewBox="0 0 200 200" role="img">
                <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(83, 174, 211, 0.12)" stroke-width="1" />
                <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(83, 174, 211, 0.1)" stroke-width="1" />
                <circle cx="100" cy="100" r="44" fill="none" stroke="rgba(83, 174, 211, 0.1)" stroke-width="1" />
                <path v-for="item in aiWarningRose" :key="item.key" :d="item.path" :fill="item.color" fill-opacity="0.84" stroke="#07203b" stroke-width="1.5" @click.stop="openScopedDetail('ai', 'projectAiAlert', `type:${item.key}`)" />
              </svg>
              <div class="ai-rose-center"><strong>{{ aiOverview.total }}</strong><span>预警总数</span></div>
            </div>
            <div class="ai-rose-legend">
              <div v-for="item in aiWarningRose" :key="item.key" :title="item.label" @click.stop="openScopedDetail('ai', 'projectAiAlert', `type:${item.key}`)">
                <i :style="{ background: item.color, boxShadow: `0 0 6px ${item.color}` }" />
                <span>{{ item.label }}</span><b>{{ item.value }}</b>
              </div>
            </div>
          </div>
        </section>

        <section class="screen-panel equipment-panel">
          <div class="panel-heading"><span>机械设备与危大工程</span><small v-if="selectedProject">重点设备配置</small></div>
          <div class="equipment-summary">
            <div class="detail-trigger" @click="openScopedDetail('equipmentConfig', 'projectEquipment', 'all')"><span>配置设备</span><strong>{{ equipmentFocusTotals.configured }}</strong><em>台</em></div>
            <div class="detail-trigger" @click="openScopedDetail('equipmentConfig', 'projectEquipment', 'online')"><span>在线设备</span><strong>{{ equipmentFocusTotals.online }}</strong><em>台</em></div>
            <div class="detail-trigger" @click="openScopedDetail('equipmentAlerts', 'projectEquipmentAlert', 'all')"><span>今日预警数</span><strong class="warn">{{ equipmentFocusTotals.todayAlerts }}</strong><em>条</em></div>
            <div class="detail-trigger" @click="openScopedDetail('equipmentConfig', 'projectEquipment', 'all')"><span>在线率</span><strong>{{ equipmentFocusTotals.configured ? Math.round(equipmentFocusTotals.online / equipmentFocusTotals.configured * 100) : 0 }}</strong><em>%</em></div>
          </div>
          <div class="equipment-focus-head detail-trigger" @click="openScopedDetail('equipmentConfig', 'projectEquipment', 'all')"><span>重点类型</span><span>配置数</span><span>在线数</span><span>今日预警</span></div>
          <div class="equipment-focus-list">
            <div v-for="item in equipmentFocusRows" :key="item.key" class="equipment-focus-row detail-trigger" @click="openScopedDetail('equipmentConfig', 'projectEquipment', `type:${item.key}`)">
              <i :style="{ background: item.color, boxShadow: `0 0 8px ${item.color}` }" />
              <strong>{{ item.label }}</strong>
              <span><b>{{ item.configured }}</b><em>台</em></span>
              <span><b>{{ item.online }}</b><em>台</em></span>
              <span><b class="warn">{{ item.todayAlerts }}</b><em>条</em></span>
            </div>
          </div>
          <div class="equipment-alert-strip"><span class="detail-trigger" @click="openScopedDetail('equipmentAlerts', 'projectEquipmentAlert', 'all')">今日预警总数 <b>{{ equipmentAlertStats.total }}</b></span><span class="detail-trigger" @click="openScopedDetail('equipmentAlerts', 'projectEquipmentAlert', 'major')">重大预警数 <b class="danger">{{ equipmentAlertStats.major }}</b></span><span class="detail-trigger" @click="openScopedDetail('equipmentAlerts', 'projectEquipmentAlert', 'unhandled')">未处置数 <b class="warn">{{ equipmentAlertStats.unhandled }}</b></span></div>
        </section>

      </aside>

      <section class="dashboard-bottom">
        <section class="screen-panel daily-work-panel" :class="{ 'daily-work-panel--project': selectedProject, 'is-drillable': selectedProject }" @click="openProjectDetail('projectDailyWork')">
          <div class="panel-heading">
            <span>{{ selectedProject ? '每日作业' : '各项目当日危险作业情况分布' }}</span>
            <small>{{ selectedProject ? (dailyWorkSummary.total ? `今日填报 ${dailyWorkSummary.total} 项` : '暂无填报') : (dangerWorkDistribution.length ? `共 ${Math.min(7, dangerWorkDistribution.length)} 个项目` : '暂无填报') }}</small>
          </div>

          <template v-if="selectedProject">
            <div v-if="dailyWorkSummary.total" class="daily-work-rose-layout">
              <div class="daily-work-rose" aria-label="项目今日作业类型玫瑰图">
                <svg viewBox="0 0 200 200" role="img">
                  <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(83, 174, 211, 0.12)" stroke-width="1" />
                  <circle cx="100" cy="100" r="68" fill="none" stroke="rgba(83, 174, 211, 0.1)" stroke-width="1" />
                  <circle cx="100" cy="100" r="44" fill="none" stroke="rgba(83, 174, 211, 0.1)" stroke-width="1" />
                  <path v-for="item in dailyWorkRose" :key="item.label" :d="item.path" :fill="item.color" fill-opacity="0.78" stroke="#07203b" stroke-width="1.5" />
                </svg>
                <div class="daily-work-rose-center"><strong>{{ dailyWorkSummary.total }}</strong><span>今日作业</span></div>
              </div>
              <div class="daily-work-rose-legend">
                <div v-for="item in dailyWorkSummary.categories" :key="item.label">
                  <i :style="{ background: dailyWorkRose.find((rose) => rose.label === item.label)?.color || '#55788b' }" />
                  <span>{{ item.label }}</span><b>{{ item.count }}</b><em>项</em>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">当前项目暂无每日作业填报</div>
          </template>

          <template v-else>
            <div v-if="dangerWorkDistribution.length" class="danger-distribution">
              <div class="danger-distribution-legend">
                <span v-for="category in dangerCategoryMeta" :key="category.key"><i :style="{ background: category.color }" />{{ category.label.replace('作业', '') }}</span>
              </div>
              <div class="danger-distribution-list">
                <div v-for="row in dangerWorkDistribution.slice(0, 7)" :key="row.id" class="danger-distribution-row">
                  <span :title="row.label">{{ row.label }}</span>
                  <div class="danger-distribution-bar">
                    <i v-for="category in dangerCategoryMeta" :key="category.key" :style="{ width: `${row.categories[category.key] / dangerWorkMaximum * 100}%`, background: category.color }" />
                  </div>
                  <b>{{ row.total }}</b>
                </div>
              </div>
              <div class="danger-distribution-axis"><span v-for="tick in dangerWorkAxis" :key="tick">{{ tick }}</span></div>
            </div>
            <div v-else class="empty-state">当前暂无危险作业填报</div>
          </template>
        </section>

        <section class="screen-panel trend-panel">
          <div class="panel-heading">
            <span>巡检与预警趋势</span>
            <div class="range-switch"><button :class="{ active: trendRange === 7 }" @click="trendRange = 7">近7日</button><button :class="{ active: trendRange === 30 }" @click="trendRange = 30">近30日</button></div>
          </div>
          <div class="trend-legend"><span class="inspection">巡检待执行</span><span class="machine">机械预警</span><span class="major">危大预警</span><span class="ai">AI预警</span></div>
          <div class="stacked-trend-chart" aria-label="巡检与预警堆叠柱状图">
            <div class="trend-y-axis"><span v-for="tick in trendAxisTicks" :key="tick">{{ tick }}</span></div>
            <div class="stacked-grid"><i v-for="n in 4" :key="n" /></div>
            <div class="stacked-bars">
              <div v-for="(item, index) in trendStackedBars" v-show="trendRange === 7 || index % 5 === 0 || index === trendStackedBars.length - 1" :key="item.label" class="stacked-column">
                <div class="stacked-total">{{ item.total }}</div>
                <div class="stacked-bar">
                  <i v-for="segment in item.segments" :key="segment.key" :title="`${segment.label}：${segment.value}`" :style="{ height: `${segment.value / trendAxisMaximum * 100}%`, background: segment.color }" />
                </div>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="screen-panel realtime-panel">
          <div class="panel-heading"><span>实时预警</span><small>自动轮播 · {{ realtimeAlerts.length }}条</small></div>
          <div :key="realtimeCarouselIndex" class="realtime-list is-rotating">
            <button v-for="item in rotatingRealtimeAlerts" :key="item.id" type="button" class="realtime-item" @click="handleRealtimeAlert(item)">
              <span class="realtime-item__time">{{ item.time }}</span>
              <i :class="`realtime-item__dot realtime-item__dot--${item.type}`" />
              <span class="realtime-item__body"><strong>{{ item.source }} · {{ item.content }}</strong><small>{{ selectedProject ? item.location : item.project }}</small></span>
              <b :class="{ danger: item.level === '重大' || item.level === '较大', warn: item.level === '一般' }">{{ item.level }}</b>
            </button>
            <div v-if="!realtimeAlerts.length" class="empty-state">当前范围暂无实时预警</div>
          </div>
          <div v-if="realtimeAlerts.length > 1" class="realtime-carousel-dots"><i v-for="(_, index) in realtimeAlerts" :key="index" :class="{ active: index === realtimeCarouselIndex }" /></div>
        </section>
      </section>
    </main>

    <div v-if="detailConfig" class="detail-modal-mask" @click.self="closeHqDetail">
      <section class="detail-modal" role="dialog" aria-modal="true" :aria-label="detailConfig.title">
        <header class="detail-modal__header">
          <div><span>{{ detailConfig.title }}</span><small>{{ levelLabel }} · {{ detailSubtitle }}</small></div>
          <button title="关闭明细" @click="closeHqDetail">×</button>
        </header>
        <div class="detail-modal__source"><span>数据来源</span>{{ detailConfig.source }}<em v-if="detailConfig.rowKind === 'project'">点击项目名称可进入项目级大屏</em></div>
        <div class="detail-table-wrap">
          <table class="detail-table" :class="{ 'detail-table--records': detailConfig.rowKind === 'record' }" :style="detailConfig.minWidth ? { minWidth: `${detailConfig.minWidth}px` } : null">
            <thead><tr><th>{{ detailConfig.primary?.label || '项目名称' }}</th><th v-for="column in detailConfig.columns" :key="column.key">{{ column.label }}</th></tr></thead>
            <tbody>
              <tr v-for="row in detailRows" :key="row.id">
                <td><button v-if="detailConfig.rowKind === 'project'" :title="row.fullName" @click="enterDetailProject(row.projectId)">{{ row.projectName }}</button><span v-else>{{ detailValue(row, detailConfig.primary || { key: 'projectName' }) }}</span></td>
                <td v-for="column in detailConfig.columns" :key="column.key">{{ detailValue(row, column) }}</td>
              </tr>
              <tr v-if="!detailRows.length"><td class="detail-table__empty" :colspan="detailConfig.columns.length + 1">当前筛选条件下暂无明细数据</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

  </div>
</template>

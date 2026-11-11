<script setup>
import { computed, ref } from 'vue'
import { Camera } from '@element-plus/icons-vue'
import { maskPhone } from '../../../../utils/mask.js'

const props = defineProps({
  kind: { type: String, required: true, validator: (v) => ['hazard', 'danger', 'major'].includes(v) },
  record: { type: Object, required: true },
})

const detail = computed(() => props.record.detail || {})

const isSupervisionMeetingHazard = computed(() => {
  const ticket = detail.value.ticketType || props.record.ticketType || ''
  return ticket === '监理会议隐患'
})

/** 监理会议隐患：图片为空 */
const images = computed(() =>
  isSupervisionMeetingHazard.value ? [] : detail.value.images || [],
)

const hazardFields = computed(() => {
  if (props.kind !== 'hazard') return []
  const emptyForMeeting = isSupervisionMeetingHazard.value
  const channelLabel =
    props.record.channel === 'dispatch'
      ? '调度隐患'
      : props.record.channel === 'supervision'
        ? '监理例会登记'
        : props.record.channel === 'inspection'
          ? '巡检隐患'
          : ''
  return [
    { label: '单号类型', value: detail.value.ticketType || props.record.ticketType },
    ...(channelLabel ? [{ label: '来源', value: channelLabel }] : []),
    { label: '隐患类别', value: props.record.hazardCategory || (props.record.type === 'quality' ? '质量' : '安全') },
    { label: '隐患等级', value: props.record.level },
    {
      label: '整改状态',
      value: props.record.unifiedStatus || props.record.status,
    },
    ...(props.record.status &&
    props.record.unifiedStatus &&
    props.record.status !== props.record.unifiedStatus
      ? [{ label: '原始状态', value: props.record.status }]
      : []),
    { label: '整改期限', value: detail.value.deadline },
    {
      label: '上报人',
      value: emptyForMeeting ? '' : detail.value.reporter || props.record.reporter,
    },
    {
      label: '整改人',
      value: emptyForMeeting ? '' : detail.value.rectifier || props.record.rectifier,
    },
    { label: '上报时间', value: detail.value.reportTime },
    { label: '隐患描述', value: props.record.desc || detail.value.requirement, full: true },
  ]
})

const dangerFields = computed(() => {
  if (props.kind !== 'danger') return []
  return [
    { label: '施工日期', value: props.record.date },
    { label: '施工项目', value: props.record.projectName || props.record.projectShortName },
    { label: '施工单位', value: props.record.contractor || detail.value.unit },
    { label: '作业类型', value: props.record.type },
    { label: '作业状态', value: props.record.status },
    { label: '作业时段', value: props.record.time },
    { label: '施工区域', value: props.record.location },
    { label: '施工内容', value: props.record.subType, full: true },
    {
      label: '风险管控措施',
      value: props.record.measures || detail.value.measures,
      full: true,
    },
  ]
})

/** 危大工程详情：字段与「危大工程信息登记」一致；施工单位默认取施工总承包单位名称 */
const majorFields = computed(() => {
  if (props.kind !== 'major') return []
  return [
    { label: '施工日期', value: props.record.date },
    { label: '施工项目', value: props.record.projectName },
    { label: '施工单位', value: props.record.contractor },
    { label: '管理单位', value: props.record.leadUnit },
    { label: '危大工程类别', value: props.record.category },
    { label: '作业状态', value: props.record.status },
    { label: '作业时段', value: props.record.time },
    { label: '施工具体内容', value: props.record.workContent, full: true },
    { label: '风险管控措施', value: props.record.measures, full: true },
  ]
})

const fields = computed(() => {
  if (props.kind === 'hazard') return hazardFields.value
  if (props.kind === 'major') return majorFields.value
  return dangerFields.value
})

/**
 * 流程记录：巡检 / 监理例会 / 调度 三类隐患统一展示。
 * - 调度隐患、后台登记的监理例会隐患：取写入时记录的 statusLogs（最新在前 → 反转成时间正序）
 * - 巡检隐患、安质隐患池导入的监理例会隐患：无状态日志，按整改四态（待整改→待验收→待复查→已关闭）
 *   派生节点，节点措辞与「巡检管理·整改详情」既有流程记录一致
 */
const flowLogs = computed(() => {
  if (props.kind !== 'hazard') return []
  const record = props.record || {}
  const raw = record.raw || {}

  if (Array.isArray(raw.statusLogs) && raw.statusLogs.length) {
    const logs = [...raw.statusLogs].reverse().map((log) => {
      const operator = String(log.operator || '').trim()
      const role = String(log.operatorRole || '').trim()
      return {
        title: log.action || log.toStatus || '流程节点',
        user: operator && role && role !== operator ? `${operator}（${role}）` : operator,
        time: log.time || '',
        remark: log.remark || '',
        status: 'done',
      }
    })
    // 未关闭的隐患：日志只记到已完成动作，末尾补「当前停留节点」（标题取业务整改状态，不另造词）
    const rawStatus = String(record.status || raw.rectifyStatus || '待整改')
    if (!rawStatus.includes('关闭')) {
      logs.push({ title: rawStatus, user: '', time: '', remark: '', status: 'current' })
    }
    return logs
  }

  const detail = record.detail || {}
  const status = String(record.status || record.unifiedStatus || '待整改')
  const reporter = detail.reporter || record.reporter || ''
  const rectifier = detail.rectifier || record.rectifier || ''
  const steps = [
    { title: '下发整改单', user: reporter, time: detail.reportTime || '', remark: '' },
    { title: '整改人提交整改结果', user: rectifier, time: '', remark: '' },
    { title: '复查人复查通过', user: '', time: '', remark: '' },
    { title: '项目经理审批通过，整改单关闭', user: '', time: '', remark: '' },
  ]
  const doneCount = status === '已关闭' ? 4 : status === '待复查' ? 3 : status === '待验收' ? 2 : 1
  const currentTitle = { 待整改: '等待整改人执行', 待验收: '待监理复查', 待复查: '待项目经理审批' }[status]
  const currentUser = status === '待整改' ? rectifier : ''
  const logs = steps.slice(0, doneCount).map((step) => ({ ...step, status: 'done' }))
  if (status !== '已关闭' && currentTitle) {
    logs.push({ title: currentTitle, user: currentUser, time: '', remark: '', status: 'current' })
  }
  return logs
})

const flowItemType = (status) => (status === 'done' ? 'success' : status === 'current' ? 'primary' : 'info')

/* ---------- 参建单位管理人员（危险作业详情） ---------- */
const PERSONNEL_GROUPS = [
  {
    unit: '建设单位',
    fields: [
      { key: 'ownerProjectManager', label: '项目负责人' },
      { key: 'ownerSafetyManager', label: '现场安全监管人' },
    ],
  },
  {
    unit: '施工单位',
    fields: [
      { key: 'contractorProjectManager', label: '项目负责人' },
      { key: 'contractorSafetyManager', label: '现场安全监管人' },
    ],
  },
  {
    unit: '监理单位',
    fields: [
      { key: 'supervisorProjectManager', label: '项目负责人' },
      { key: 'supervisorSafetyManager', label: '现场安全监管人' },
    ],
  },
]

/** 解析「姓名/手机号，姓名/手机号…」为人员数组 */
function splitPersonnel(raw) {
  return String(raw || '')
    .split(/[，,;；]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const segments = part.split('/')
      const name = String(segments[0] || '').replace(/\s+/g, ' ').trim()
      const phones = segments.slice(1).map((item) => item.trim()).filter(Boolean)
      return { name, phones }
    })
}

/** 手机号默认脱敏，点「查看」后才显示明文 */
const revealedKeys = ref(new Set())

function isRevealed(key) {
  return revealedKeys.value.has(key)
}

function toggleReveal(key) {
  const next = new Set(revealedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  revealedKeys.value = next
}

function buildPersonnelRow(field, rawValue) {
  const raw = rawValue === undefined ? detail.value[field.key] : rawValue
  const people = splitPersonnel(raw)
  const revealed = isRevealed(field.key)
  return {
    key: field.key,
    label: field.label,
    hasValue: people.length > 0,
    revealed,
    people: people.map((person, index) => ({
      key: `${field.key}-${index}-${person.name}`,
      name: person.name,
      phones: person.phones.map((phone) => (revealed ? phone : maskPhone(phone))),
    })),
  }
}

/** 危大工程三方现场安全监管人 */
const MAJOR_SAFETY_COLUMNS = [
  { unit: '建设单位', field: 'ownerSafety' },
  { unit: '施工单位', field: 'contractorSafety' },
  { unit: '监理单位', field: 'supervisorSafety' },
]

const personnelGroups = computed(() => {
  if (props.kind === 'danger') {
    return PERSONNEL_GROUPS.map((group) => ({
      unit: group.unit,
      fields: group.fields.map((field) => buildPersonnelRow(field)),
    }))
  }
  if (props.kind === 'major') {
    return MAJOR_SAFETY_COLUMNS.map((column) => ({
      unit: column.unit,
      fields: [
        buildPersonnelRow(
          { key: `major-${column.field}`, label: '现场安全监管人' },
          props.record[column.field],
        ),
      ],
    }))
  }
  return []
})
</script>

<template>
  <div class="record-detail-body">
    <div class="detail-form" :class="{ 'single-col': kind === 'danger' }">
      <div
        v-for="(field, idx) in fields"
        :key="idx"
        class="form-row"
        :class="{ full: field.full }"
      >
        <span class="form-label">{{ field.label }}</span>
        <span class="form-value">{{ field.value || '--' }}</span>
      </div>
    </div>

    <div v-if="(kind === 'danger' || kind === 'major') && personnelGroups.length" class="detail-section personnel-section">
      <div class="section-label">参建单位管理人员</div>
      <div class="personnel-group" v-for="group in personnelGroups" :key="group.unit">
        <div class="personnel-unit">{{ group.unit }}</div>
        <div v-for="row in group.fields" :key="row.key" class="personnel-row">
          <span class="personnel-label">{{ row.label }}</span>
          <span class="personnel-value">
            <template v-if="row.hasValue">
              <span v-for="person in row.people" :key="person.key" class="person-chip">
                <span class="person-name">{{ person.name }}</span>
                <span class="person-phones">{{ person.phones.join(' / ') }}</span>
              </span>
              <button type="button" class="reveal-btn" @click="toggleReveal(row.key)">
                {{ row.revealed ? '隐藏' : '查看' }}
              </button>
            </template>
            <span v-else class="personnel-empty">--</span>
          </span>
        </div>
      </div>
    </div>

    <div v-if="kind === 'hazard' && images.length" class="detail-section">
      <div class="section-label">隐患图片</div>
      <div class="image-grid">
        <div
          v-for="img in images"
          :key="img.id"
          class="image-card"
          :class="{ 'has-url': !!img.url }"
          :style="img.url ? undefined : { background: img.background }"
        >
          <img v-if="img.url" class="image-card__photo" :src="img.url" :alt="img.label || '隐患图片'" />
          <template v-else>
            <el-icon :size="22" color="rgba(255,255,255,0.55)"><Camera /></el-icon>
            <span>{{ img.label }}</span>
          </template>
          <span v-if="img.url && img.label" class="image-card__caption">{{ img.label }}</span>
        </div>
      </div>
    </div>

    <div v-if="kind === 'hazard' && flowLogs.length" class="detail-section">
      <div class="section-label">流程记录</div>
      <el-timeline class="hazard-flow">
        <el-timeline-item
          v-for="(item, index) in flowLogs"
          :key="`${item.title}-${index}`"
          :type="flowItemType(item.status)"
          :hollow="item.status === 'pending'"
          :timestamp="item.time || (item.status === 'current' ? '待进行' : '--')"
          placement="top"
        >
          <div class="flow-card" :class="item.status">
            <div class="flow-card-title">
              {{ item.title }}
              <el-tag v-if="item.status === 'current'" size="small" type="warning" effect="dark">当前</el-tag>
            </div>
            <div class="flow-card-meta">处理人：{{ item.user || '--' }}</div>
            <div v-if="item.remark" class="flow-card-remark">备注：{{ item.remark }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<style scoped>
.record-detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
}

.detail-form.single-col {
  grid-template-columns: 1fr 1fr;
}

.form-row {
  display: flex;
  gap: 10px;
  font-size: calc(13px + var(--coc-font-boost));
  line-height: 1.45;
  align-items: flex-start;
}

.form-row.full {
  grid-column: 1 / -1;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  color: var(--coc-text-muted);
  min-width: 72px;
  flex-shrink: 0;
}

.form-row.full .form-label {
  min-width: 0;
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.form-value {
  color: var(--coc-text);
  flex: 1;
  word-break: break-word;
}

.detail-section {
  border-top: 1px solid var(--coc-border);
  padding-top: 12px;
}

/* ---------- 参建单位管理人员 ---------- */
.personnel-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.personnel-group + .personnel-group {
  margin-top: 10px;
}

.personnel-unit {
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: #5eeeff;
  line-height: 1.4;
}

.personnel-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: calc(13px + var(--coc-font-boost));
  line-height: 1.5;
}

.personnel-label {
  flex: 0 0 120px;
  white-space: nowrap;
  color: var(--coc-text-muted);
}

.personnel-value {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  color: var(--coc-text);
}

.person-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(94, 238, 255, 0.24);
  white-space: nowrap;
}

.person-name {
  color: var(--coc-text);
}

.person-phones {
  color: var(--coc-text-secondary);
  font-variant-numeric: tabular-nums;
}

.personnel-empty {
  color: var(--coc-text-muted);
}

.reveal-btn {
  border: none;
  background: none;
  padding: 0;
  color: #5eeeff;
  font-size: calc(12px + var(--coc-font-boost));
  cursor: pointer;
  line-height: 1.4;
}

.reveal-btn:hover {
  text-decoration: underline;
}

.section-label {
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-text-secondary);
  margin-bottom: 10px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.image-card {
  position: relative;
  height: 120px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: calc(12px + var(--coc-font-boost));
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
}

.image-card.has-url {
  padding: 0;
}

.image-card__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.image-card__caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.45);
  font-size: calc(11px + var(--coc-font-boost));
  text-align: center;
}

/* ---------- 流程记录（巡检 / 监理例会 / 调度 三类隐患统一） ---------- */
.hazard-flow {
  padding-top: 2px;
}

.hazard-flow :deep(.el-timeline-item) {
  padding-bottom: 14px;
}

.hazard-flow :deep(.el-timeline-item:last-child) {
  padding-bottom: 0;
}

.hazard-flow :deep(.el-timeline-item__tail) {
  border-left-color: rgba(94, 238, 255, 0.18);
}

.hazard-flow :deep(.el-timeline-item__timestamp) {
  font-size: calc(12px + var(--coc-font-boost));
  color: var(--coc-text-muted);
}

.hazard-flow :deep(.el-timeline-item__timestamp.is-top) {
  margin-bottom: 5px;
}

.hazard-flow :deep(.el-timeline-item__node) {
  background: rgba(148, 170, 197, 0.55);
}

.hazard-flow :deep(.el-timeline-item__node--success) {
  background: #3fae6a;
}

.hazard-flow :deep(.el-timeline-item__node--primary) {
  background: #e6a23c;
  box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.22);
}

.hazard-flow :deep(.el-timeline-item__node.is-hollow) {
  background: transparent;
  border-color: rgba(148, 170, 197, 0.55);
}

.flow-card {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(94, 238, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.flow-card.done {
  border-color: rgba(63, 174, 106, 0.35);
  background: rgba(63, 174, 106, 0.08);
}

.flow-card.current {
  border-color: rgba(230, 162, 60, 0.55);
  background: rgba(230, 162, 60, 0.12);
}

.flow-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: calc(13px + var(--coc-font-boost));
  font-weight: 600;
  line-height: 1.5;
  color: var(--coc-text);
}

.flow-card-meta,
.flow-card-remark {
  margin-top: 3px;
  font-size: calc(12px + var(--coc-font-boost));
  line-height: 1.5;
  color: var(--coc-text-secondary);
}

.flow-card-remark {
  color: var(--coc-text);
  opacity: 0.82;
  overflow-wrap: anywhere;
}
</style>

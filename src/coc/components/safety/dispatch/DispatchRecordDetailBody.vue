<script setup>
import { computed, ref } from 'vue'
import { Camera } from '@element-plus/icons-vue'
import { maskPhone } from '../../../../utils/mask.js'

const props = defineProps({
  kind: { type: String, required: true, validator: (v) => ['hazard', 'danger'].includes(v) },
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

const fields = computed(() => props.kind === 'hazard' ? hazardFields.value : dangerFields.value)

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

function buildPersonnelRow(field) {
  const people = splitPersonnel(detail.value[field.key])
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

const personnelGroups = computed(() => {
  if (props.kind !== 'danger') return []
  return PERSONNEL_GROUPS.map((group) => ({
    unit: group.unit,
    fields: group.fields.map(buildPersonnelRow),
  }))
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

    <div v-if="kind === 'danger'" class="detail-section personnel-section">
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
</style>

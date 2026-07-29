<script setup>
import { computed } from 'vue'
import { Camera } from '@element-plus/icons-vue'

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
  return [
    { label: '单号类型', value: detail.value.ticketType || props.record.ticketType },
    { label: '隐患类别', value: props.record.hazardCategory || (props.record.type === 'quality' ? '质量' : '安全') },
    { label: '隐患等级', value: props.record.level },
    { label: '整改状态', value: props.record.status },
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
    { label: '施工项目', value: props.record.projectName || props.record.projectShortName },
    { label: '施工单位', value: props.record.contractor || detail.value.unit },
    { label: '作业类型', value: props.record.type },
    { label: '施工内容', value: props.record.subType },
    { label: '施工区域', value: props.record.location },
  ]
})

const fields = computed(() => props.kind === 'hazard' ? hazardFields.value : dangerFields.value)
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
        <span class="form-value">{{ field.value || '—' }}</span>
      </div>
    </div>

    <div v-if="kind === 'hazard' && images.length" class="detail-section">
      <div class="section-label">隐患图片</div>
      <div class="image-grid">
        <div
          v-for="img in images"
          :key="img.id"
          class="image-card"
          :style="{ background: img.background }"
        >
          <el-icon :size="22" color="rgba(255,255,255,0.55)"><Camera /></el-icon>
          <span>{{ img.label }}</span>
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
  grid-template-columns: 1fr;
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
  height: 120px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: calc(12px + var(--coc-font-boost));
}
</style>

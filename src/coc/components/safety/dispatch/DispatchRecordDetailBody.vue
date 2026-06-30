<script setup>
import { computed } from 'vue'
import { Camera } from '@element-plus/icons-vue'

const props = defineProps({
  kind: { type: String, required: true, validator: (v) => ['hazard', 'danger'].includes(v) },
  record: { type: Object, required: true },
})

const detail = computed(() => props.record.detail || {})
const images = computed(() => detail.value.images || [])

const hazardFields = computed(() => {
  if (props.kind !== 'hazard') return []
  return [
    { label: '隐患类别', value: props.record.hazardCategory || (props.record.type === 'quality' ? '质量' : '安全') },
    { label: '发现日期', value: props.record.date },
    { label: '施工部位', value: props.record.location },
    { label: '隐患等级', value: props.record.level },
    { label: '整改状态', value: props.record.status },
    { label: '责任单位', value: detail.value.unit },
    { label: '整改期限', value: detail.value.deadline },
    { label: '上报人', value: detail.value.reporter || props.record.reporter },
    { label: '上报时间', value: detail.value.reportTime },
    { label: '整改措施', value: detail.value.measure, full: true },
    { label: '隐患描述', value: props.record.desc || detail.value.requirement, full: true },
  ]
})

const dangerFields = computed(() => {
  if (props.kind !== 'danger') return []
  return [
    { label: '作业类型', value: props.record.type },
    { label: '作业子类', value: props.record.subType },
    { label: '作业日期', value: props.record.date },
    { label: '作业时间', value: props.record.time },
    { label: '作业地点', value: props.record.location },
    { label: '作业人数', value: detail.value.personnel || props.record.personnel },
    { label: '许可状态', value: props.record.permitStatus },
    { label: '当前状态', value: props.record.status },
    { label: '责任单位', value: detail.value.unit },
    { label: '上报人', value: detail.value.reporter || props.record.reporter },
    { label: '上报时间', value: detail.value.reportTime },
    { label: '关联监控', value: detail.value.cameraId || props.record.cameraId },
    { label: '管控措施', value: detail.value.measures || props.record.measures, full: true },
  ]
})

const fields = computed(() => props.kind === 'hazard' ? hazardFields.value : dangerFields.value)
const checkItems = computed(() => detail.value.checkItems || [])
</script>

<template>
  <div class="record-detail-body">
    <div class="detail-form">
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

    <div v-if="kind === 'danger' && checkItems.length" class="detail-section">
      <div class="section-label">现场检查项</div>
      <ul class="check-list">
        <li v-for="(item, i) in checkItems" :key="i" :class="{ ok: item.ok, fail: !item.ok }">
          <span class="check-dot" />
          <span>{{ item.name }}</span>
          <span class="check-status">{{ item.ok ? '符合' : '待完善' }}</span>
        </li>
      </ul>
    </div>

    <div v-if="images.length" class="detail-section">
      <div class="section-label">{{ kind === 'hazard' ? '隐患图片' : '现场图片' }}</div>
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

.form-row {
  display: flex;
  gap: 10px;
  font-size: 13px;
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
  font-size: 13px;
  font-weight: 600;
  color: var(--coc-text-secondary);
  margin-bottom: 10px;
}

.check-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.check-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #faf8f6;
  border: 1px solid var(--coc-border);
  font-size: 12px;
}

.check-list li.ok {
  border-color: rgba(103, 194, 58, 0.35);
  background: rgba(103, 194, 58, 0.06);
}

.check-list li.fail {
  border-color: rgba(245, 108, 108, 0.35);
  background: rgba(245, 108, 108, 0.06);
}

.check-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #909399;
  flex-shrink: 0;
}

.check-list li.ok .check-dot { background: #67c23a; }
.check-list li.fail .check-dot { background: #f56c6c; }

.check-status {
  margin-left: auto;
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.check-list li.ok .check-status { color: #67c23a; }
.check-list li.fail .check-status { color: #f56c6c; }

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
  font-size: 12px;
}
</style>

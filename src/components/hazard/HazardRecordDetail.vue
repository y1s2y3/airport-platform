<script setup>
import { computed } from 'vue'
import { getInspectionHazardDetail } from '../../mock/inspectionHazardQuery.js'
import { resolveDispatchHazardPhotoSrc, resolveDispatchHazardPhotoName } from '../../utils/dispatchHazardStorage.js'

const props = defineProps({ row: { type: Object, default: null } })
const raw = computed(() => props.row?.raw || {})
const inspection = computed(() => props.row?.source === 'inspection' ? getInspectionHazardDetail(props.row.sourceId) : null)
const fields = computed(() => {
  const row = props.row
  if (!row) return []
  const data = raw.value
  const list = [
    ['单据编号', row.originalNo],
    ['项目', row.projectName],
    ['来源', row.sourceLabel],
    ['类别', row.categoryLabel],
    ['原业务状态', row.status],
    ['检查／登记时间', row.registeredAt],
    ['整改人', row.rectifier],
    ['完成期限', row.deadline],
  ]
  if (row.source === 'inspection') list.push(['巡检任务编号', data.taskNo], ['复查人', data.reviewer], ['项目经理', data.manager])
  if (row.source === 'supervision') list.push(['会议编号', data.meetingId], ['隐患等级', data.hazardLevel], ['备注', data.remark])
  if (row.source === 'dispatch') list.push(['隐患等级', data.hazardLevel], ['摄像头', data.cameraName], ['摄像头位置', data.cameraLocation], ['截图来源', data.sourceType])
  if (row.source === 'externalQuality') list.push(['标段', data.sectionName], ['问题类型', data.issueType], ['问题来源', data.source], ['发现人', data.finder], ['发起人', data.initiator], ['审核人', data.reviewer])
  return list
})
const photos = computed(() => inspection.value?.hazard?.photos || raw.value.hazardPhotos || (raw.value.snapshot ? [raw.value.snapshot] : []))
const rectPhotos = computed(() => inspection.value?.rectification?.photos || raw.value.rectifyPhotos || [])
const rectification = computed(() => inspection.value?.rectification?.note || raw.value.rectifyRemark || '')
const flow = computed(() => {
  const row = props.row
  if (!row) return []
  if (row.source === 'inspection') return (inspection.value?.flow || []).map(item => ({ title: item.a, time: item.d, note: item.dt, done: Boolean(item.d), cur: Boolean(item.cur) }))
  if (row.source === 'externalQuality') return (raw.value.approvalLogs || []).map(item => ({ title: `${item.stage} · ${item.person}`, time: item.time, note: item.opinion, done: true, cur: false }))
  return (raw.value.statusLogs || []).map(item => ({ title: `${item.action || item.toStatus} · ${item.operator || ''}`, time: item.time, note: item.remark, done: true, cur: false }))
})
const photoUrl = (file, index) => resolveDispatchHazardPhotoSrc(file, index)
const formatTime = value => value ? new Date(value).toLocaleString('sv-SE') : '--'
</script>

<template>
  <div v-if="row" class="record-detail">
    <div class="record-grid">
      <div v-for="[label, value] in fields" :key="label" class="record-field"><span>{{ label }}</span><strong>{{ value || '--' }}</strong></div>
    </div>

    <section class="record-section">
      <h4>隐患／问题内容</h4>
      <p>{{ row.title || '--' }}</p>
      <div v-if="photos.length" class="record-photos"><el-image v-for="(photo, index) in photos" :key="index" :src="photoUrl(photo, index)" :preview-src-list="photos.map(photoUrl)" :z-index="2000" preview-teleported fit="contain" /></div>
    </section>

    <section v-if="row.source === 'externalQuality' && raw.items?.length" class="record-section">
      <h4>问题描述与要求建议</h4>
      <div v-for="item in raw.items" :key="item.id" class="record-item">
        <p>{{ item.description }}</p>
        <p>要求建议：{{ item.advice || '--' }}</p>
        <div class="record-photos"><div v-for="(file, index) in item.attachments" :key="index"><el-image :src="photoUrl(file, index)" :preview-src-list="item.attachments.map(photoUrl)" :z-index="2000" preview-teleported fit="contain" /><small>{{ resolveDispatchHazardPhotoName(file, index) }}</small></div></div>
      </div>
    </section>

    <section v-if="rectification || rectPhotos.length" class="record-section">
      <h4>整改信息</h4>
      <p>{{ rectification || '--' }}</p>
      <p v-if="inspection?.rectification?.date">整改日期：{{ inspection.rectification.date }}</p>
      <div class="record-photos"><div v-for="(photo, index) in rectPhotos" :key="index"><el-image :src="photoUrl(photo, index)" :preview-src-list="rectPhotos.map(photoUrl)" :z-index="2000" preview-teleported fit="contain" /><small>{{ resolveDispatchHazardPhotoName(photo, index) }}</small></div></div>
    </section>

    <section v-if="inspection?.reviews?.length" class="record-section">
      <h4>复查信息</h4>
      <div v-for="review in inspection.reviews" :key="review.round">
        <p>{{ review.date || '--' }} · {{ review.result || '--' }}</p>
        <p>{{ review.comment || '--' }}</p>
      </div>
    </section>

    <section v-if="inspection?.managerApproval" class="record-section">
      <h4>项目经理审批</h4>
      <p>{{ inspection.managerApproval.manager || '--' }} · {{ inspection.managerApproval.status || '--' }}</p>
      <p>{{ inspection.managerApproval.comment || '--' }}</p>
    </section>

    <section v-if="flow.length" class="record-section">
      <h4>{{ row.source === 'externalQuality' ? '审批记录' : '流程记录' }}</h4>
      <div class="record-flow"><div v-for="(item, index) in flow" :key="index" class="record-flow-item" :class="{ done: item.done, cur: item.cur }"><div class="record-flow-dot"></div><div class="record-flow-body"><strong>{{ item.title }}</strong><span>{{ item.time || '--' }}</span><p v-if="item.note">{{ item.note }}</p></div></div></div>
    </section>
  </div>
</template>

<style scoped>
.record-detail { color: #303133; }
.record-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1px solid #e5e9ef; border-radius: 6px; overflow: hidden; }
.record-field { display: flex; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #f0f2f5; font-size: 13px; }
.record-field:nth-child(odd) { border-right: 1px solid #f0f2f5; }
.record-field span { color: #8b929b; min-width: 96px; }
.record-field strong { font-weight: 400; color: #303133; overflow-wrap: anywhere; }
.record-section { margin-top: 16px; padding-top: 12px; border-top: 1px dashed #e9edf3; }
.record-section h4 { margin: 0 0 8px; font-size: 14px; }
.record-section p { margin: 6px 0; font-size: 13px; color: #4b5563; }
.record-photos { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
.record-photos :deep(.el-image) { width: 150px; height: 96px; border-radius: 4px; }
.record-photos small { display: block; max-width: 150px; color: #9aa1aa; overflow-wrap: anywhere; }
.record-item { padding: 8px 0; border-bottom: 1px solid #f0f2f5; }
.record-flow { padding-top: 2px; }
.record-flow-item { display: flex; gap: 10px; padding-bottom: 12px; position: relative; }
.record-flow-item::before { content: ''; position: absolute; left: 6px; top: 16px; bottom: 0; width: 1px; background: #e5e9ef; }
.record-flow-item:last-child::before { display: none; }
.record-flow-dot { width: 13px; height: 13px; border-radius: 50%; background: #c4ccd6; flex-shrink: 0; margin-top: 3px; }
.record-flow-item.done .record-flow-dot { background: #34a853; }
.record-flow-item.cur .record-flow-dot { background: #8f0045; box-shadow: 0 0 0 3px #fceef4; }
.record-flow-body { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.record-flow-body span { color: #8b929b; font-size: 12px; }
.record-flow-body p { margin: 2px 0 0; color: #6d7580; font-size: 12px; }
</style>

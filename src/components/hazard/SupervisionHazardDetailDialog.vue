<script setup>
import { computed } from 'vue'
import { SHOW_HAZARD_SAMPLING } from '../../config/hazardSamplingVisibility.js'
import { getSupervisionHazardPhotoUrls, getSupervisionMeetings } from '../../utils/cocAdminDeviceStorage.js'
import { hazardTypeLabelOf as hazardTypeLabel } from '../../utils/supervisionMeetingTemplate.js'
import HazardSamplingPanel from '../HazardSamplingPanel.vue'

const props = defineProps({ record: { type: Object, default: null } })
const visible = defineModel({ type: Boolean, required: true })
const hazardPhotoUrls = computed(() => getSupervisionHazardPhotoUrls(props.record?.hazardPhotos))
const rectifyPhotoUrls = computed(() => getSupervisionHazardPhotoUrls(props.record?.rectifyPhotos))

/** 关联会议展示：会议日期（会议编号）；找不到时回退会议编号 */
function meetingLabel(meetingId) {
  if (!meetingId) return '--'
  const meeting = getSupervisionMeetings().find((item) => item.id === meetingId)
  if (!meeting) return meetingId
  const date = meeting.meetingDate || ''
  return date ? `${date}（${meetingId}）` : meetingId
}
</script>

<template>
  <el-dialog v-model="visible" title="监理隐患详情" width="660px" append-to-body>
    <template v-if="record">
      <HazardSamplingPanel v-if="SHOW_HAZARD_SAMPLING" source="supervision" :record-id="record.id" />
      <el-descriptions :column="1" border>
        <el-descriptions-item label="项目名称">{{ record.projectName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患编号">{{ record.id || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患类型">{{ hazardTypeLabel(record.hazardType) }}</el-descriptions-item>
        <el-descriptions-item label="隐患描述">{{ record.description || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患等级">{{ record.hazardLevel || '--' }}</el-descriptions-item>
        <el-descriptions-item label="登记人">{{ record.registrant || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患图片">
          <div v-if="hazardPhotoUrls.length" class="detail-photos">
            <el-image
              v-for="(url, index) in hazardPhotoUrls"
              :key="index"
              :src="url"
              :preview-src-list="hazardPhotoUrls"
              :initial-index="index"
              :z-index="3000"
              preview-teleported
              fit="cover"
              class="detail-photo"
              :alt="`隐患图片 ${index + 1}`"
            />
          </div>
          <span v-else>--</span>
        </el-descriptions-item>
        <el-descriptions-item label="整改说明">{{ record.rectifyRemark || '--' }}</el-descriptions-item>
        <el-descriptions-item label="整改图片">
          <div v-if="rectifyPhotoUrls.length" class="detail-photos">
            <el-image
              v-for="(url, index) in rectifyPhotoUrls"
              :key="index"
              :src="url"
              :preview-src-list="rectifyPhotoUrls"
              :initial-index="index"
              :z-index="3000"
              preview-teleported
              fit="cover"
              class="detail-photo"
              :alt="`整改图片 ${index + 1}`"
            />
          </div>
          <span v-else>--</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ record.remark || '--' }}</el-descriptions-item>
        <el-descriptions-item label="整改状态">{{ record.rectifyStatus || '待整改' }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ record.source || '--' }}</el-descriptions-item>
        <el-descriptions-item label="关联会议">{{ meetingLabel(record.meetingId) }}</el-descriptions-item>
        <el-descriptions-item label="登记时间">{{ record.uploadTime }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="record.statusLogs?.length" class="status-logs">
        <h4>操作留痕</h4>
        <el-timeline>
          <el-timeline-item
            v-for="(log, index) in record.statusLogs"
            :key="`${log.time}-${log.action}-${index}`"
            :timestamp="log.time"
            placement="top"
          >
            <div class="log-title">
              {{ log.action }}：{{ log.fromStatus || '--' }} → {{ log.toStatus }}
            </div>
            <div class="log-meta">{{ log.operator }}（{{ log.operatorRole }}）</div>
            <div v-if="log.remark" class="log-remark">备注：{{ log.remark }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>

      <div v-if="$slots.actions" class="detail-actions">
        <slot name="actions" />
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.detail-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-photo {
  width: 96px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebeef5;
  cursor: zoom-in;
}

.status-logs {
  margin-top: 20px;
}

.status-logs h4 {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.log-title {
  font-weight: 600;
  color: #303133;
}

.log-meta,
.log-remark {
  margin-top: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}

.detail-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}
</style>

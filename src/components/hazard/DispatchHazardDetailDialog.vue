<script setup>
import { computed } from 'vue'
import { SHOW_HAZARD_SAMPLING } from '../../config/hazardSamplingVisibility.js'
import { getDispatchHazardTypeLabel as hazardTypeLabel } from '../../config/dispatchHazardTypes.js'
import { dispatchHazardFlowRecords, resolveDispatchHazardPhotoSrc, resolveDispatchHazardPhotoName } from '../../utils/dispatchHazardStorage.js'
import HazardSamplingPanel from '../HazardSamplingPanel.vue'
import PersonalCenterReadonlyHint from '../PersonalCenterReadonlyHint.vue'

const props = defineProps({ record: { type: Object, default: null } })
const visible = defineModel({ type: Boolean, required: true })

const rectifyPhotoUrls = computed(() =>
  (props.record?.rectifyPhotos || []).map((photo, index) =>
    resolveDispatchHazardPhotoSrc(photo, index),
  ),
)

function sourceTypeLabel(type) {
  return { live: '实时', playback: '回放', meeting: '会议' }[type] || type || '--'
}
const flowRecords = computed(() => dispatchHazardFlowRecords(props.record))
</script>

<template>
  <el-dialog v-model="visible" title="调度隐患详情" width="720px" append-to-body destroy-on-close>
    <template v-if="record">
      <HazardSamplingPanel v-if="SHOW_HAZARD_SAMPLING" source="dispatch" :record-id="record.id" />
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="项目名称">{{ record.projectName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患类型">{{ hazardTypeLabel(record.hazardType) }}</el-descriptions-item>
        <el-descriptions-item label="隐患描述" :span="2">{{ record.description || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患类别">{{ record.hazardCategory || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患等级">{{ record.hazardLevel || '--' }}</el-descriptions-item>
        <el-descriptions-item label="整改要求" :span="2">{{ record.rectifyRequirement || '--' }}</el-descriptions-item>
        <el-descriptions-item label="复查人">{{ record.reviewer || '--' }}</el-descriptions-item>
        <el-descriptions-item label="下发整改单抄送">{{ record.issueCcPersons || '--' }}</el-descriptions-item>
        <el-descriptions-item label="完成抄送">{{ record.completionCcPersons || '--' }}</el-descriptions-item>
        <el-descriptions-item label="隐患照片" :span="2">
          <div v-if="record.hazardPhotos?.length" class="detail-photos">
            <el-image v-for="(url, index) in record.hazardPhotos" :key="index" :src="url" :preview-src-list="record.hazardPhotos" :initial-index="index" :z-index="3000" preview-teleported fit="cover" class="detail-photo" />
          </div>
          <span v-else>--</span>
        </el-descriptions-item>
        <el-descriptions-item label="整改状态">{{ record.rectifyStatus || '待整改' }}</el-descriptions-item>
        <el-descriptions-item label="当前流程节点">{{ record.currentNode || '--' }}</el-descriptions-item>
        <el-descriptions-item label="整改人">{{ record.rectifier || '--' }}</el-descriptions-item>
        <el-descriptions-item label="登记人">{{ record.registrant || '--' }}</el-descriptions-item>
        <el-descriptions-item label="整改期限">{{ record.hazardDeadline || '--' }}</el-descriptions-item>
        <el-descriptions-item label="摄像头">{{ record.cameraName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="监控点位">{{ record.cameraLocation || '--' }}</el-descriptions-item>
        <el-descriptions-item label="截图方式">{{ sourceTypeLabel(record.sourceType) }}</el-descriptions-item>
        <el-descriptions-item label="登记来源">{{ record.source || '问题截图' }}</el-descriptions-item>
        <el-descriptions-item label="登记时间" :span="2">{{ record.uploadTime || '--' }}</el-descriptions-item>
        <el-descriptions-item :label="`${hazardTypeLabel(record.hazardType)}隐患截图`" :span="2">
          <div class="detail-snapshot-thumb">
            <el-image
              v-if="record.snapshot"
              :src="record.snapshot"
              :preview-src-list="[record.snapshot]"
              fit="cover"
              class="detail-photo-thumb"
              alt="隐患截图"
            />
            <div v-else class="detail-snapshot-empty">暂无截图</div>
          </div>
        </el-descriptions-item>
        <el-descriptions-item v-if="record.rectifyStatus !== '待整改'" label="整改说明" :span="2">
          {{ record.rectifyRemark || '--' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="record.rectifyStatus !== '待整改'" label="整改照片" :span="2">
          <div v-if="record.rectifyPhotos?.length" class="detail-photo-thumbs">
            <el-image
              v-for="(photo, index) in record.rectifyPhotos"
              :key="`${resolveDispatchHazardPhotoName(photo, index)}-${index}`"
              :src="resolveDispatchHazardPhotoSrc(photo, index)"
              :preview-src-list="rectifyPhotoUrls"
              :initial-index="index"
              fit="cover"
              class="detail-photo-thumb"
              :alt="resolveDispatchHazardPhotoName(photo, index)"
            />
          </div>
          <span v-else>--</span>
        </el-descriptions-item>
      </el-descriptions>

      <div class="status-logs">
        <h4>流程记录</h4>
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in flowRecords"
            :key="`${item.label}-${index}`"
            :timestamp="item.date"
            placement="top"
            :type="item.current ? 'primary' : ''"
          >
            <div class="log-title">{{ item.label }}</div>
            <div v-if="item.actor" class="log-meta">处理人：{{ item.actor }}</div>
            <div v-if="item.comment" class="log-remark">{{ item.comment }}</div>
          </el-timeline-item>
        </el-timeline>
      </div>
      <PersonalCenterReadonlyHint
        v-if="record.rectifyStatus === '待整改' || record.rectifyStatus === '待验收'"
        title="整改提交与验收请在「个人中心 → 我的待办」中处理；本页仅查看详情。"
      />
    </template>
  </el-dialog>
</template>

<style scoped>
.detail-photo-thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-photo-thumb {
  width: 120px;
  height: 68px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--ap-border, #e4e7ed);
  cursor: pointer;
}

.detail-snapshot-thumb {
  display: flex;
}

.detail-snapshot-empty {
  width: 120px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #a3a6ad;
  background: #f5f7fa;
  border-radius: 4px;
  border: 1px solid var(--ap-border, #e4e7ed);
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
</style>

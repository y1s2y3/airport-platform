<script setup>
import { normalizeFlowNodeName } from '../../config/hazardFlowNodes.js'
import { dispatchApprovalPassed, getDispatchHazardDetailLogs } from '../../utils/dispatchHazardDetailLogs.js'
import { computed } from 'vue'
import {
  dispatchHazardFlowRecords,
  resolveDispatchHazardPhotoSrc,
  resolveDispatchHazardPhotoName,
} from '../../utils/dispatchHazardStorage.js'

const props = defineProps({
  record: { type: Object, default: null },
  inScreen: Boolean,
  dark: Boolean,
})
const record = computed(() => props.record)
const logs = computed(() => getDispatchHazardDetailLogs(record.value))
const rectification = computed(() => logs.value.rectification)
const review = computed(() => logs.value.review)
const approval = computed(() => logs.value.approval)
const confirmLog = computed(() => logs.value.confirmation)
const flowRecords = computed(() => dispatchHazardFlowRecords(record.value))

const hazardTypeText = computed(() => ({ safety: '安全', quality: '质量', other: '其他' }[record.value?.hazardType] || '--'))
const sourceTypeText = computed(() => ({ live: '实时', playback: '回放', meeting: '会议' }[record.value?.sourceType] || '--'))
const rectifyPhotos = computed(() => (record.value?.rectifyPhotos || []).map((photo, index) => ({
  src: resolveDispatchHazardPhotoSrc(photo, index),
  name: resolveDispatchHazardPhotoName(photo, index),
})))

</script>

<template>
  <div class="dispatch-detail-content" :class="{ 'dispatch-detail-content--dark': dark }">
    <template v-if="record">
      <section class="card">
        <h4 class="card-title">基本信息</h4>
        <div class="grid">
          <div class="item"><label>项目名称</label><span>{{ record.projectName || '--' }}</span></div>
          <div class="item"><label>来源</label><span>{{ record.source || '--' }}</span></div>
          <div class="item"><label>截图方式</label><span>{{ sourceTypeText }}</span></div>
          <div class="item"><label>摄像头</label><span>{{ record.cameraName || '--' }}</span></div>
          <div class="item"><label>监控点位</label><span>{{ record.cameraLocation || '--' }}</span></div>
          <div class="item"><label>整改人</label><span>{{ record.rectifier || '--' }}</span></div>
          <div class="item"><label>复查人</label><span>{{ record.reviewer || '--' }}</span></div>
          <div class="item"><label>整改期限</label><span>{{ record.hazardDeadline || '--' }}</span></div>
          <div class="item"><label>处置状态</label><span>{{ record.rectifyStatus || '--' }}</span></div>
          <div class="item"><label>当前流程节点</label><span>{{ normalizeFlowNodeName(record.currentNode) || '--' }}</span></div>
          <div class="item"><label>下发整改单抄送人</label><span>{{ record.issueCcPersons || '--' }}</span></div>
          <div class="item"><label>整改完成抄送人</label><span>{{ record.completionCcPersons || '--' }}</span></div>
          <div class="item"><label>登记人</label><span>{{ record.registrant || '--' }}</span></div>
          <div class="item"><label>登记时间</label><span>{{ record.uploadTime || '--' }}</span></div>
        </div>
      </section>

      <section class="card">
        <h4 class="card-title">隐患信息</h4>
        <div class="text-row"><label>隐患类型</label><span>{{ hazardTypeText }}</span></div>
        <div class="text-row"><label>隐患类别</label><span>{{ record.hazardCategory || '--' }}</span></div>
        <div class="text-row"><label>隐患等级</label><span>{{ record.hazardLevel || '--' }}</span></div>
        <div class="text-row"><label>隐患描述</label><span>{{ record.description || '--' }}</span></div>
        <div class="text-row"><label>整改要求</label><span class="pre">{{ record.rectifyRequirement || '--' }}</span></div>
        <div class="photo-row">
          <label>隐患截图</label>
          <el-image
            v-if="record.snapshot"
            :src="record.snapshot"
            fit="cover"
            class="thumb"
            :preview-src-list="[record.snapshot]"
            :preview-teleported="inScreen"
            :z-index="inScreen ? 240000 : undefined"
          />
          <span v-else>--</span>
        </div>
      </section>

      <section class="card" v-if="rectification">
        <h4 class="card-title">整改信息</h4>
        <div class="text-row"><label>整改日期</label><span>{{ rectification?.time || '--' }}</span></div>
        <div class="text-row"><label>整改说明</label><span class="pre">{{ record.rectifyRemark || rectification?.remark || '--' }}</span></div>
        <div class="photo-row" v-if="rectifyPhotos.length">
          <label>整改照片</label>
          <div class="thumbs">
            <el-image
              v-for="(photo, index) in rectifyPhotos"
              :key="photo.name + index"
              :src="photo.src"
              :preview-src-list="rectifyPhotos.map((item) => item.src)"
              :preview-teleported="inScreen"
              :z-index="inScreen ? 240000 : undefined"
              :initial-index="index"
              fit="cover"
              class="thumb"
              :alt="photo.name"
            />
          </div>
        </div>
      </section>

      <section class="card" v-if="review">
        <h4 class="card-title">复查信息</h4>
        <div class="text-row"><label>复查日期</label><span>{{ review?.time || '--' }}</span></div>
        <div class="text-row"><label>复查结论</label><span>{{ review ? (review.action === '复查通过' ? '通过' : '不通过') : '--' }}</span></div>
        <div class="text-row"><label>复查人</label><span>{{ review?.operator || record.reviewer || '--' }}</span></div>
        <div class="text-row"><label>复查意见</label><span class="pre">{{ review?.remark || '--' }}</span></div>
      </section>

      <section class="card" v-if="approval">
        <h4 class="card-title">审批信息</h4>
        <div class="text-row"><label>审批日期</label><span>{{ approval?.time || '--' }}</span></div>
        <div class="text-row"><label>审批结果</label><span>{{ dispatchApprovalPassed(approval) ? '通过' : '不通过' }}</span></div>
        <div class="text-row"><label>审批人</label><span>{{ approval?.operator || '--' }}</span></div>
        <div class="text-row"><label>审批意见</label><span class="pre">{{ approval?.remark || '--' }}</span></div>
      </section>

      <section class="card" v-if="confirmLog">
        <h4 class="card-title">确认信息</h4>
        <div class="text-row"><label>确认日期</label><span>{{ confirmLog?.time || '--' }}</span></div>
        <div class="text-row"><label>确认结果</label><span>{{ confirmLog ? '通过' : '--' }}</span></div>
        <div class="text-row"><label>确认人</label><span>{{ confirmLog?.operator || '--' }}</span></div>
        <div class="text-row"><label>确认意见</label><span class="pre">{{ confirmLog?.remark || '--' }}</span></div>
      </section>

      <section class="card" v-if="flowRecords.length">
        <h4 class="card-title">流程记录</h4>
        <div class="flow">
          <div v-for="(item, index) in flowRecords" :key="index" class="flow-item" :class="{ current: item.current, pending: item.pending }">
            <div class="flow-label">{{ item.label }}</div>
            <div v-if="item.actor" class="flow-meta">处理人：{{ item.actor }}</div>
            <div class="flow-time">{{ item.date || '当前' }}</div>
            <div v-if="item.comment" class="flow-comment">{{ item.comment }}</div>
          </div>
        </div>
      </section>

      <el-alert
        v-if="record.rectifyStatus === '待整改' || record.rectifyStatus === '待验收'"
        type="info"
        :closable="false"
        show-icon
        title="整改提交与验收请在「个人中心 → 我的待办」中处理；本页仅查看详情。"
      />
    </template>

    <el-empty v-else description="未找到该调度隐患" />
  </div>
</template>

<style scoped>
.dispatch-detail-content { container-type: inline-size; }
.dispatch-detail-content--dark {
  --detail-bg: #162438;
  --detail-border: #35455e;
  --detail-accent: #e6a23c;
  --detail-text: #eaf2fb;
  --detail-muted: #aabdd3;
  color: var(--detail-text);
}
.card { background: var(--detail-bg, #fff); border-radius: 10px; padding: 16px 18px; margin-bottom: 14px; border: 1px solid var(--detail-border, #eef1f5); }
.card-title { margin: 0 0 12px; padding-left: 9px; border-left: 3px solid var(--detail-accent, #8f0045); font-size: 15px; color: var(--detail-text, #1f2329); }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px 20px; }
.item { display: flex; gap: 8px; font-size: 13px; }
.item label { flex: 0 0 112px; color: var(--detail-muted, #747d89); }
.item span { color: var(--detail-text, #1f2329); word-break: break-all; }
.text-row { display: flex; gap: 10px; margin-bottom: 10px; font-size: 13px; }
.text-row label { flex: 0 0 84px; color: var(--detail-muted, #747d89); }
.text-row span { color: var(--detail-text, #1f2329); }
.pre { white-space: pre-wrap; }
.photo-row { display: flex; gap: 10px; margin-bottom: 10px; font-size: 13px; }
.photo-row label { flex: 0 0 84px; color: var(--detail-muted, #747d89); }
.thumbs { display: flex; gap: 8px; flex-wrap: wrap; }
.thumb { width: 96px; height: 72px; border-radius: 6px; border: 1px solid var(--detail-border, #eef1f5); }
.flow { display: flex; flex-direction: column; gap: 10px; }
.flow-item { border-left: 3px solid var(--detail-border, #e6e9ee); padding: 2px 0 2px 12px; }
.flow-item.current { border-left-color: var(--detail-accent, #8f0045); }
.flow-item.pending { opacity: .55; }
.flow-item.pending .flow-label { color: var(--detail-muted, #747d89); font-weight: 500; }
.flow-label { font-size: 14px; font-weight: 600; color: var(--detail-text, #1f2329); }
.flow-item.current .flow-label { color: var(--detail-accent, #8f0045); }
.flow-meta, .flow-comment { margin-top: 4px; font-size: 12px; color: var(--detail-muted, #6b7280); }
.flow-time { margin-top: 2px; font-size: 12px; color: var(--detail-muted, #747d89); }
@container (max-width: 660px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (max-width: 460px) {
  .grid { grid-template-columns: 1fr; }
}
</style>

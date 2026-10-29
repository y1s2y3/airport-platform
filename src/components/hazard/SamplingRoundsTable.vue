<script setup>
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { downloadSamplingAttachment } from '../../mock/hazardSampling.js'

const props = defineProps({
  rounds: { type: Array, default: () => [] },
  role: { type: String, default: 'hq' },
  dateRange: { type: Array, default: () => [] },
  coc: { type: Boolean, default: false },
  emptyText: { type: String, default: '尚未提交本身份的抽查记录' },
})
const formatTime = value => value ? new Date(value).toLocaleString('sv-SE') : '--'
const tableRows = computed(() => props.rounds.filter(round => round.logs.some(item => item.stage === props.role)).map(round => {
  const log = round.logs.filter(item => item.stage === props.role).at(-1)
  return { ...round, inspectionTime: log.time, inspectionResult: props.role === 'manager' ? '已复查' : log.result, inspectionNote: log.result === '不合格' ? log.note || '--' : '--', inspector: log.person || '--' }
}))
const filteredRounds = computed(() => tableRows.value.filter(round => {
  if (props.dateRange?.length !== 2) return true
  if (!round.inspectionTime) return false
  const day = formatTime(round.inspectionTime).slice(0, 10)
  return day >= props.dateRange[0] && day <= props.dateRange[1]
}))
const detailsVisible = ref(false)
const detailRoundId = ref('')
const currentDetails = computed(() => props.rounds.find(item => item.id === detailRoundId.value))
function showDetails(round) { detailRoundId.value = round.id; detailsVisible.value = true }
const download = file => downloadSamplingAttachment(file).catch(error => ElMessage.error(error.message))
</script>

<template>
  <div class="sampling-rounds">
    <el-table :data="filteredRounds" border class="sampling-round-table" :empty-text="dateRange?.length ? '暂无符合日期条件的抽查记录' : emptyText">
      <el-table-column label="抽查日期" width="172"><template #default="{ row: round }">{{ formatTime(round.inspectionTime) }}</template></el-table-column>
      <el-table-column label="抽查结果" width="100"><template #default="{ row: round }"><span :class="round.inspectionResult === '不合格' ? 'inspection-fail' : ['合格', '已复查'].includes(round.inspectionResult) ? 'inspection-pass' : 'sampling-hint'">{{ round.inspectionResult }}</span></template></el-table-column>
      <el-table-column prop="inspectionNote" label="不合格说明" min-width="180" show-overflow-tooltip />
      <el-table-column prop="inspector" label="抽查人" width="110" />
      <el-table-column label="操作" width="100" align="center" fixed="right"><template #default="{ row: round }"><el-button link type="primary" @click="showDetails(round)">查看</el-button></template></el-table-column>
    </el-table>

    <el-dialog v-model="detailsVisible" title="抽查记录详情" width="650px" :z-index="coc ? 220000 : undefined" append-to-body destroy-on-close>
      <template v-if="currentDetails">
        <div v-for="stage in currentDetails.stages" :key="stage.stage" class="sampling-stage-detail">
          <h4>{{ stage.name }}</h4>
          <p v-if="stage.restricted" class="sampling-hint">当前身份不展示该阶段的检查结论与资料。</p>
          <template v-else>
            <template v-if="!currentDetails.logs.some(log => log.stage === stage.stage)">
              <p class="sampling-hint">{{ stage.status }} · 办结日期：{{ formatTime(stage.time) }}</p>
              <p v-if="stage.status === '批次发起'" class="sampling-hint">该单据随批次纳入检查范围，未单独记录指挥部合格或不合格结论。</p>
            </template>
            <div v-for="log in currentDetails.logs.filter(item => item.stage === stage.stage)" :key="log.id" class="sampling-stage-log">
              <p>{{ log.person }} · {{ stage.stage === 'manager' ? '已复查' : log.result }}</p>
              <p>办结日期：{{ formatTime(log.time) }}</p>
              <p>说明：{{ log.note || '--' }}</p>
              <p v-if="log.reviewRecipient">全面复查下发至：{{ log.reviewRecipient }}</p>
              <div v-if="log.files?.length"><el-button v-for="file in log.files" :key="file.id || file.name" link type="primary" @click="download(file)">{{ file.name }}</el-button></div>
              <p v-if="role === 'hq' && log.pendingReason">历史任务未生成：{{ log.pendingReason }}</p>
              <p v-if="role === 'hq' && log.stage === 'hq' && typeof log.dispatch === 'boolean'">是否下发任务：{{ log.dispatch ? '是' : '否' }}</p>
            </div>
          </template>
        </div>
      </template>
      <template #footer><el-button @click="detailsVisible = false">关闭</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.sampling-rounds :deep(.sampling-round-table) { font-size: 13px; }
.sampling-hint { font-size: 12px; color: #8b929b; line-height: 1.7; }
.inspection-fail { color: #c74747; }
.inspection-pass { color: #278450; }
.sampling-stage-detail { padding: 0 0 12px; margin-bottom: 14px; border-bottom: 1px solid #ebeef5; }
.sampling-stage-detail h4 { margin: 0 0 10px; }
.sampling-stage-log { margin-top: 10px; padding: 10px; background: #f7f8fa; border-radius: 4px; }
.sampling-stage-log p { margin: 5px 0; font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; }
</style>

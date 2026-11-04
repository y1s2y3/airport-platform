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
const STAGE_NAMES = { hq: '指挥部抽查', supervisor: '抽检人检查', manager: '全面复查' }
const tableRows = computed(() => {
  if (props.coc) {
    /** COC 大屏：抽查记录不按当前身份过滤，项目内统一展示；每轮取最新一条记录 */
    return props.rounds.map(round => {
      const log = [...round.logs].sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))).at(-1) || null
      const latestStage = round.stages.find(stage => stage.complete) || null
      return {
        ...round,
        inspectionStage: log ? STAGE_NAMES[log.stage] || '--' : latestStage?.name || '--',
        inspectionTime: log?.time || round.createdAt || '',
        inspectionResult: log ? (log.stage === 'manager' ? '已复查' : log.result || '--') : latestStage?.status || '待办理',
        inspectionNote: log && log.result === '不合格' ? log.note || '--' : '--',
        inspector: log?.person || '--',
      }
    })
  }
  return props.rounds.filter(round => round.logs.some(item => item.stage === props.role)).map(round => {
    const log = round.logs.filter(item => item.stage === props.role).at(-1)
    return { ...round, inspectionStage: STAGE_NAMES[props.role] || '--', inspectionTime: log.time, inspectionResult: props.role === 'manager' ? '已复查' : log.result, inspectionNote: log.result === '不合格' ? log.note || '--' : '--', inspector: log.person || '--' }
  })
})
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
      <el-table-column v-if="coc" label="环节" width="110"><template #default="{ row: round }">{{ round.inspectionStage }}</template></el-table-column>
      <el-table-column label="抽查结果" width="100"><template #default="{ row: round }"><span :class="round.inspectionResult === '不合格' ? 'inspection-fail' : ['合格', '已复查'].includes(round.inspectionResult) ? 'inspection-pass' : 'sampling-hint'">{{ round.inspectionResult }}</span></template></el-table-column>
      <el-table-column prop="inspectionNote" label="不合格说明" min-width="180" show-overflow-tooltip />
      <el-table-column prop="inspector" label="抽查人" width="150" show-overflow-tooltip />
      <el-table-column label="操作" width="100" align="center" fixed="right"><template #default="{ row: round }"><el-button link type="primary" @click="showDetails(round)">查看</el-button></template></el-table-column>
    </el-table>

    <el-dialog v-model="detailsVisible" title="抽查记录详情" width="650px" :z-index="coc ? 220000 : undefined" :class="coc ? 'sampling-coc-dialog' : ''" append-to-body destroy-on-close>
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

<!-- COC 大屏：抽检相关弹窗深色主题（仅 coc 模式下给 el-dialog 加 .sampling-coc-dialog 类生效，平台侧不受影响） -->
<style>
.sampling-coc-dialog.el-dialog,
.sampling-coc-dialog .el-dialog {
  --el-dialog-bg-color: #1b2d46;
  --el-bg-color: #1b2d46;
  --el-bg-color-overlay: #1b2d46;
  --el-text-color-primary: #eff6ff;
  --el-text-color-regular: #dce8f6;
  --el-text-color-secondary: #a9bdd4;
  --el-border-color: #3e526b;
  --el-border-color-light: #3e526b;
  --el-border-color-lighter: #3e526b;
  --el-fill-color-blank: #243c57;
  --el-fill-color-light: #243c57;
  --el-color-primary: #c97b63;
  --el-color-primary-light-3: #a9553f;
  --el-color-info: #8ea6c0;
  background: #1b2d46;
  border: 1px solid #3e526b;
  border-radius: 10px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  color: #dce8f6;
}
.sampling-coc-dialog .el-dialog__header { margin-right: 0; padding: 14px 20px 12px; border-bottom: 1px solid #334a64; }
.sampling-coc-dialog .el-dialog__title { font-size: 15px; font-weight: 600; color: #eaf2ff; }
.sampling-coc-dialog .el-dialog__headerbtn .el-dialog__close { color: #8ea6c0; }
.sampling-coc-dialog .el-dialog__headerbtn:hover .el-dialog__close { color: #c97b63; }
.sampling-coc-dialog .el-dialog__body { padding: 16px 20px; color: #dce8f6; }
.sampling-coc-dialog .el-dialog__footer { padding: 12px 20px 16px; border-top: 1px solid #334a64; }
.sampling-coc-dialog .el-form-item__label { color: #a9bdd4; }
.sampling-coc-dialog .el-input__wrapper,
.sampling-coc-dialog .el-textarea__inner,
.sampling-coc-dialog .el-select__wrapper { background: #243c57; box-shadow: 0 0 0 1px #3e526b inset; }
.sampling-coc-dialog .el-input__inner,
.sampling-coc-dialog .el-textarea__inner,
.sampling-coc-dialog .el-range-input { color: #eaf2ff; }
.sampling-coc-dialog .el-input__inner::placeholder,
.sampling-coc-dialog .el-textarea__inner::placeholder { color: #7f96b0; }
.sampling-coc-dialog .el-range-separator,
.sampling-coc-dialog .el-input-number__decrease,
.sampling-coc-dialog .el-input-number__increase { color: #a9bdd4; }
.sampling-coc-dialog .el-radio__label,
.sampling-coc-dialog .el-checkbox__label { color: #dce8f6; }
.sampling-coc-dialog .el-radio__inner,
.sampling-coc-dialog .el-checkbox__inner { background: #243c57; border-color: #4a6484; }
.sampling-coc-dialog .el-radio__input.is-checked .el-radio__inner,
.sampling-coc-dialog .el-checkbox__input.is-checked .el-checkbox__inner { background: #c97b63; border-color: #c97b63; }
.sampling-coc-dialog .el-alert { background: rgba(201, 123, 99, 0.12); border: 1px solid rgba(201, 123, 99, 0.35); }
.sampling-coc-dialog .el-alert .el-alert__title { color: #e8d3ca; }
.sampling-coc-dialog .el-alert .el-alert__description { color: #c9dcf2; }
.sampling-coc-dialog .sampling-hint { color: #8ea6c0; }
.sampling-coc-dialog .sampling-stage-detail { border-bottom-color: #334a64; }
.sampling-coc-dialog .sampling-stage-detail h4 { color: #eaf2ff; }
.sampling-coc-dialog .sampling-stage-log { background: #22374f; border: 1px solid #334a64; border-radius: 6px; color: #c9dcf2; }
.sampling-coc-dialog .el-button:not(.el-button--primary) {
  --el-button-bg-color: transparent;
  --el-button-border-color: #3e526b;
  --el-button-text-color: #c9dcf2;
  --el-button-hover-bg-color: rgba(201, 123, 99, 0.12);
  --el-button-hover-border-color: #c97b63;
  --el-button-hover-text-color: #eaf2ff;
}
.sampling-coc-dialog .el-button--primary {
  --el-button-bg-color: #a9553f;
  --el-button-border-color: #a9553f;
  --el-button-hover-bg-color: #c97b63;
  --el-button-hover-border-color: #c97b63;
  --el-button-active-bg-color: #8f4634;
}
.sampling-coc-dialog .el-button.is-link { --el-button-text-color: #d8a18c; --el-button-hover-text-color: #f0c7b8; }

/* 抽检弹窗内：日期面板（teleport 到 body，用 popper-class 限定）与下拉（弹窗内渲染） */
.sampling-coc-popper.el-popper {
  --el-bg-color-overlay: #1b2d46;
  --el-bg-color: #1b2d46;
  --el-text-color-regular: #dce8f6;
  --el-text-color-primary: #eff6ff;
  --el-border-color-light: #3e526b;
  --el-border-color-lighter: #3e526b;
  --el-fill-color-light: #243c57;
  --el-fill-color-blank: #243c57;
  --el-color-primary: #c97b63;
  background: #1b2d46;
  border-color: #3e526b;
  color: #dce8f6;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}
.sampling-coc-popper .el-popper__arrow::before { background: #1b2d46; border-color: #3e526b; }
.sampling-coc-popper .el-picker-panel { background: #1b2d46; color: #dce8f6; border-color: #3e526b; }
.sampling-coc-popper .el-picker-panel__icon-btn,
.sampling-coc-popper .el-date-picker__header-label { color: #c9dcf2; }
.sampling-coc-popper .el-date-table th { color: #8ea6c0; border-bottom-color: #334a64; }
.sampling-coc-popper .el-date-table td.available .el-date-table-cell__text { color: #dce8f6; }
.sampling-coc-popper .el-date-table td.in-range .el-date-table-cell { background: rgba(201, 123, 99, 0.18); }
.sampling-coc-popper .el-date-table td.start-date .el-date-table-cell__text,
.sampling-coc-popper .el-date-table td.end-date .el-date-table-cell__text { background: #c97b63; color: #fff; }
.sampling-coc-popper .el-date-table td.today .el-date-table-cell__text { color: #f0c7b8; }
.sampling-coc-popper .el-date-table td.disabled .el-date-table-cell__text { color: #5b7593; }
.sampling-coc-popper .el-date-range-picker__content.is-left { border-right-color: #334a64; }
.sampling-coc-popper .el-picker-panel__footer { background: #1b2d46; border-top-color: #334a64; }
.sampling-coc-popper .el-picker-panel__shortcut { color: #c9dcf2; }

/* 弹窗内的下拉（popper-class 生效；teleported=false 时在弹窗内、true 时在 body，两种都覆盖） */
.sampling-coc-popper .el-select-dropdown,
.sampling-coc-popper .el-select-dropdown__list,
.sampling-coc-popper .el-scrollbar { background: #1b2d46; }
.sampling-coc-popper .el-select-dropdown__item { color: #dce8f6; }
.sampling-coc-popper .el-select-dropdown__item.is-hovering { background: rgba(201, 123, 99, 0.16); }
.sampling-coc-popper .el-select-dropdown__item.is-selected { color: #f0c7b8; }
.sampling-coc-popper .el-select-dropdown__empty { color: #8ea6c0; }
.sampling-coc-dialog .el-select__popper .el-select-dropdown { background: #1b2d46; }
.sampling-coc-dialog .el-select__popper .el-select-dropdown__item { color: #dce8f6; }
</style>

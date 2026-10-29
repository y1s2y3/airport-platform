<script setup>
import {ref,computed,inject,watch} from 'vue'
import {getCocHazardIssueRows,HAZARD_ISSUE_SOURCES} from '../../../../utils/hazardIssueSummary.js'
import {hqSamplingStatus,SAMPLING_STATUS,ensureSamplingExamples,sampling} from '../../../../mock/hazardSampling.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'
import CocHazardIssueDetail from './CocHazardIssueDetail.vue'
const dispatchHqUi=inject('dispatchHqUi',false)
const props=defineProps({projectId:{type:String,default:''}})
const hazardList=ref([]),hazardStatusFilter=ref(''),hazardSourceFilter=ref(''),hazardSamplingFilter=ref(''),hazardKeyword=ref(''),hazardDateRange=ref([]),hazardMoreOpen=ref(false),detailView=ref(null)
function reload(){hazardList.value=getCocHazardIssueRows(props.projectId);ensureSamplingExamples()}
reload();watch(()=>props.projectId,()=>{reload();detailView.value=null;hazardStatusFilter.value='';hazardSourceFilter.value='';hazardSamplingFilter.value=''})
/** 与隐患问题清单汇总保持一致：处理状态取全量数据的业务状态，不受当前项目过滤影响。 */
const hazardStatusOptions=computed(()=>[...new Set(getCocHazardIssueRows('').map(row=>row.status))])
const filtered=computed(()=>{void sampling.value.history.length;return hazardList.value.filter(row=>(!hazardStatusFilter.value||row.status===hazardStatusFilter.value)&&(!hazardSourceFilter.value||row.source===hazardSourceFilter.value)&&(!hazardSamplingFilter.value||hqSamplingStatus(row)===hazardSamplingFilter.value)&&(!hazardKeyword.value.trim()||[row.originalNo,row.title,row.rectifier,row.sourceLabel].join(' ').includes(hazardKeyword.value.trim()))&&(!hazardDateRange.value?.length||(row.registeredAt.slice(0,10)>=hazardDateRange.value[0]&&row.registeredAt.slice(0,10)<=hazardDateRange.value[1])))})
const hazardSamplingOptions=computed(()=>Object.values(SAMPLING_STATUS))
/** 预览固定每类来源至少一条，其余按原顺序补足 8 条 */
const previewList=computed(()=>{
  const picked=[]
  for(const source of HAZARD_ISSUE_SOURCES){const first=filtered.value.find(row=>row.source===source.value);if(first)picked.push(first)}
  const rest=filtered.value.filter(row=>!picked.includes(row))
  return [...picked,...rest].slice(0,8)
})
function openDetail(row){detailView.value=row}
</script>
<template>
 <div class="panel-card hazard-side-panel" :class="{'dispatch-hq-list-panel':dispatchHqUi}">
  <DispatchHqPanelTitle v-if="dispatchHqUi" title="隐患清单"><template #actions><div class="title-actions"><el-select v-model="hazardSourceFilter" clearable size="small" placeholder="全部来源" class="hazard-status-select"><el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value"/></el-select><el-select v-model="hazardStatusFilter" clearable size="small" placeholder="全部状态" class="hazard-status-select"><el-option v-for="status in hazardStatusOptions" :key="status" :label="status" :value="status"/></el-select><button class="title-more-btn" @click="hazardMoreOpen=true">更多</button></div></template></DispatchHqPanelTitle>
  <div v-else class="panel-title compact hazard-title-row title-left"><span>隐患清单</span><div class="title-actions"><el-select v-model="hazardSourceFilter" clearable size="small" placeholder="全部来源" class="hazard-status-select"><el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value"/></el-select><el-select v-model="hazardStatusFilter" clearable size="small" placeholder="全部状态" class="hazard-status-select"><el-option v-for="status in hazardStatusOptions" :key="status" :label="status" :value="status"/></el-select><button class="title-more-btn" @click="hazardMoreOpen=true">更多</button></div></div>
  <div class="panel-body panel-inner"><div class="list-wrap"><table class="data-table"><thead><tr><th>数据源</th><th>类别</th><th>描述</th><th>抽查状态</th><th>业务状态</th></tr></thead><tbody><tr v-for="row in previewList" :key="row.id" class="clickable-row" @dblclick="openDetail(row)"><td><span class="src-tag">{{row.sourceLabel}}</span></td><td>{{row.categoryLabel}}</td><td class="desc" :title="row.title">{{row.title}}</td><td><span class="inspection-state">{{hqSamplingStatus(row)}}</span></td><td><span class="status-tag">{{row.status}}</span></td></tr><tr v-if="!previewList.length"><td colspan="5" class="empty-row">暂无符合条件的隐患记录</td></tr></tbody></table></div></div>
  <DispatchDraggablePanel v-if="hazardMoreOpen" title="隐患清单汇总" :width="1000" :z-index="120010" placement="right" @close="hazardMoreOpen=false">
   <div class="more-dialog-toolbar"><span>共 {{filtered.length}} 条</span><div class="more-filters"><el-input v-model="hazardKeyword" clearable placeholder="编号／隐患内容" size="small"/><el-select v-model="hazardSourceFilter" clearable placeholder="全部来源" size="small"><el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value"/></el-select><el-select v-model="hazardStatusFilter" clearable placeholder="全部状态" size="small"><el-option v-for="status in hazardStatusOptions" :key="status" :label="status" :value="status"/></el-select><el-select v-model="hazardSamplingFilter" clearable placeholder="抽查状态" size="small"><el-option v-for="status in hazardSamplingOptions" :key="status" :label="status" :value="status"/></el-select><el-date-picker v-model="hazardDateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="登记开始日期" end-placeholder="登记结束日期" size="small"/></div></div>
   <table class="mini-table more-table"><thead><tr><th>数据源</th><th>类别</th><th>登记时间</th><th>隐患／问题内容</th><th>原业务状态</th><th>抽查状态</th></tr></thead><tbody><tr v-for="row in filtered" :key="row.id" class="clickable-row" @dblclick="openDetail(row)"><td>{{row.sourceLabel}}</td><td>{{row.categoryLabel}}</td><td>{{row.registeredAt||'--'}}</td><td class="desc" :title="row.title">{{row.title}}</td><td>{{row.status}}</td><td>{{hqSamplingStatus(row)}}</td></tr><tr v-if="!filtered.length"><td colspan="6" class="empty-row">暂无符合条件的隐患记录</td></tr></tbody></table>
  </DispatchDraggablePanel>
  <DispatchDraggablePanel v-if="detailView" :title="detailView.sourceLabel+' · 隐患详情'" :width="940" :z-index="120030" placement="right" right-backdrop @close="detailView=null"><CocHazardIssueDetail :row="detailView" @back="detailView=null"/></DispatchDraggablePanel>
 </div>
</template>
<style scoped>
@import './dispatch-lower.css';

.hazard-side-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.hazard-side-panel .panel-title {
  border-left: 4px solid #e6a23c;
}

.hazard-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.hazard-title-text {
  flex-shrink: 0;
  text-align: left;
}

.title-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.hazard-status-select {
  width: 96px;
}

.title-more-btn {
  border: 1px solid var(--coc-border);
  border-radius: 6px;
  background: #fff;
  padding: 4px 12px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
  color: var(--coc-accent);
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
}

.title-more-btn:hover {
  border-color: var(--coc-accent);
  background: rgba(201, 123, 99, 0.08);
}

.panel-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

.list-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: calc(12px + var(--coc-font-boost));
}

.data-table th,
.data-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--coc-border);
  text-align: left;
  vertical-align: middle;
}

.data-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #faf8f6;
  font-weight: 600;
  color: var(--coc-text-secondary);
}

.data-table .desc {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clickable-row {
  cursor: pointer;
}

.clickable-row:hover {
  background: rgba(201, 123, 99, 0.05);
}

.cat-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.src-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  color: #67c23a;
  background: rgba(103, 194, 58, 0.14);
  white-space: nowrap;
}

.src-tag--dispatch {
  color: #409eff;
  background: rgba(64, 158, 255, 0.14);
}

.src-tag--sup {
  color: #b37feb;
  background: rgba(179, 127, 235, 0.16);
}

.cat-tag.safety {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.cat-tag.quality {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.level-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: calc(11px + var(--coc-font-boost));
  font-weight: 600;
  white-space: nowrap;
}

.level-tag.normal {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.level-tag.medium {
  background: rgba(230, 162, 60, 0.15);
  color: #e6a23c;
}

.level-tag.major {
  background: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

.status-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: calc(12px + var(--coc-font-boost));
  font-weight: 600;
}

.status-tag.pending {
  background: rgba(144, 147, 153, 0.12);
  color: #909399;
}

.status-tag.doing {
  background: rgba(230, 162, 60, 0.12);
  color: #e6a23c;
}

.status-tag.review {
  background: rgba(64, 158, 255, 0.12);
  color: #409eff;
}

.status-tag.closed {
  background: rgba(103, 194, 58, 0.12);
  color: #67c23a;
}

.empty-row {
  text-align: center;
  color: var(--coc-text-muted);
  font-size: calc(13px + var(--coc-font-boost));
  padding: 16px 8px !important;
}

.hazard-date-filter {
  width: 240px;
}

.hazard-date-filter :deep(.el-range-input) {
  font-size: calc(12px + var(--coc-font-boost));
}

.more-filter {
  width: 108px;
}

.hazard-source-select {
  width: 120px;
}

.hazard-level-select {
  width: 128px;
}
</style>

<style scoped>
.inspection-state{font-size:11px;color:#a9c7e3}.hazard-side-panel .status-tag{white-space:nowrap}.more-filters{flex-wrap:wrap}.more-filters :deep(.el-input){max-width:210px}.more-filters :deep(.el-select){width:150px}
</style>

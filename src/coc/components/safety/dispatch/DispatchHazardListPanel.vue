<script setup>
import { SHOW_HAZARD_SAMPLING } from '../../../../config/hazardSamplingVisibility.js'
import {ref,computed,inject,watch} from 'vue'
import {getCocHazardIssueRows,HAZARD_ISSUE_SOURCES,isHazardIssueOverdue} from '../../../../utils/hazardIssueSummary.js'
import {hqSamplingStatus,SAMPLING_STATUS,ensureSamplingExamples,sampling} from '../../../../mock/hazardSampling.js'
import DispatchDraggablePanel from './DispatchDraggablePanel.vue'
import DispatchHqPanelTitle from './DispatchHqPanelTitle.vue'
import CocHazardIssueDetail from './CocHazardIssueDetail.vue'
const dispatchHqUi=inject('dispatchHqUi',false)
const props=defineProps({projectId:{type:String,default:''}})
const hazardList=ref([]),hazardStatusFilter=ref(''),hazardSourceFilter=ref(''),hazardCategoryFilter=ref(''),hazardSamplingFilter=ref(''),hazardKeyword=ref(''),hazardDateRange=ref([]),hazardMoreOpen=ref(false),detailView=ref(null)
function reload(){hazardList.value=getCocHazardIssueRows(props.projectId);if(SHOW_HAZARD_SAMPLING)ensureSamplingExamples()}
reload();watch(()=>props.projectId,()=>{reload();detailView.value=null;hazardStatusFilter.value='';hazardSourceFilter.value='';hazardSamplingFilter.value=''})
/** 与隐患问题清单汇总保持一致：处理状态取全量数据的业务状态，不受当前项目过滤影响。 */
const hazardStatusOptions=computed(()=>[...new Set(getCocHazardIssueRows('').map(row=>row.status))])
const hazardCategoryOptions=computed(()=>[...new Set(hazardList.value.flatMap(row=>row.categories||[]))])
const activeStat=ref('')

function selectStat(key){activeStat.value=activeStat.value===key?'':key;hazardPage.value=1}
const hazardStats=computed(()=>({total:hazardList.value.length,open:hazardList.value.filter(row=>!row.closed).length,overdue:hazardList.value.filter(row=>!row.closed&&isHazardIssueOverdue(row)===true).length,closed:hazardList.value.filter(row=>row.closed).length}))
const filtered=computed(()=>{if(SHOW_HAZARD_SAMPLING)void sampling.value.history.length;return hazardList.value.filter(row=>{if(hazardStatusFilter.value&&row.status!==hazardStatusFilter.value)return false;if(hazardCategoryFilter.value&&!(row.categories||[]).includes(hazardCategoryFilter.value))return false;if(hazardSourceFilter.value&&row.source!==hazardSourceFilter.value)return false;if(SHOW_HAZARD_SAMPLING&&hazardSamplingFilter.value&&hqSamplingStatus(row)!==hazardSamplingFilter.value)return false;const kw=hazardKeyword.value.trim();if(kw&&![row.originalNo,row.title,row.rectifier,row.sourceLabel].join(' ').includes(kw))return false;if(hazardDateRange.value?.length&&!(row.registeredAt.slice(0,10)>=hazardDateRange.value[0]&&row.registeredAt.slice(0,10)<=hazardDateRange.value[1]))return false;if(activeStat.value==='closed')return row.closed;if(activeStat.value==='open')return !row.closed;if(activeStat.value==='overdue')return !row.closed&&isHazardIssueOverdue(row)===true;return true})})
const hazardPage=ref(1),hazardPageSize=ref(10)
const pagedHazard=computed(()=>{const start=(hazardPage.value-1)*hazardPageSize.value;return filtered.value.slice(start,start+hazardPageSize.value)})
watch(()=>filtered.value.length,()=>{const max=Math.max(1,Math.ceil(filtered.value.length/hazardPageSize.value));if(hazardPage.value>max)hazardPage.value=max})
const hazardSamplingOptions=computed(()=>Object.values(SAMPLING_STATUS))
/** 预览固定每类来源至少一条，其余按原顺序补足 8 条 */
const previewList=computed(()=>{
  const picked=[]
  for(const source of HAZARD_ISSUE_SOURCES){const first=filtered.value.find(row=>row.source===source.value);if(first)picked.push(first)}
  const rest=filtered.value.filter(row=>!picked.includes(row))
  return [...picked,...rest].slice(0,8)
})
function openDetail(row){detailView.value=row}
/** 抽查结果标签配色：与「业务状态」列保持同一套标签字号/字重 */
function samplingStatusClass(row){const status=hqSamplingStatus(row);return status==='已通过'?'closed':status==='未通过'?'fail':'pending'}
/** 业务状态标签配色：与抽查结果同一套标签样式 */
function hazardStatusClass(row){const status=String(row.status||'');if(status.includes('关闭'))return 'closed';if(status.includes('复查')||status.includes('验收'))return 'review';if(status.includes('整改'))return 'doing';return 'pending'}
</script>
<template>
 <div class="panel-card hazard-side-panel" :class="{'dispatch-hq-list-panel':dispatchHqUi}">
  <DispatchHqPanelTitle v-if="dispatchHqUi" title="隐患清单"><template #actions><div class="title-actions"><el-select v-model="hazardSourceFilter" clearable size="small" placeholder="全部来源" class="hazard-status-select"><el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value"/></el-select><el-select v-model="hazardStatusFilter" clearable size="small" placeholder="整改状态" class="hazard-status-select"><el-option v-for="status in hazardStatusOptions" :key="status" :label="status" :value="status"/></el-select><button class="title-more-btn" @click="hazardMoreOpen=true">更多</button></div></template></DispatchHqPanelTitle>
  <div v-else class="panel-title compact hazard-title-row title-left"><span>隐患清单</span><div class="title-actions"><el-select v-model="hazardSourceFilter" clearable size="small" placeholder="全部来源" class="hazard-status-select"><el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value"/></el-select><el-select v-model="hazardStatusFilter" clearable size="small" placeholder="整改状态" class="hazard-status-select"><el-option v-for="status in hazardStatusOptions" :key="status" :label="status" :value="status"/></el-select><button class="title-more-btn" @click="hazardMoreOpen=true">更多</button></div></div>
  <div class="panel-body panel-inner"><div class="list-wrap"><table class="data-table"><thead><tr><th>数据源</th><th>类别</th><th>描述</th><th v-if="SHOW_HAZARD_SAMPLING">抽查结果</th><th>整改状态</th></tr></thead><tbody><tr v-for="row in previewList" :key="row.id" class="clickable-row" @dblclick="openDetail(row)"><td><span class="src-tag">{{row.sourceLabel}}</span></td><td>{{row.categoryLabel}}</td><td class="desc" :title="row.title">{{row.title}}</td><td v-if="SHOW_HAZARD_SAMPLING"><span class="status-tag" :class="samplingStatusClass(row)">{{hqSamplingStatus(row)}}</span></td><td><span class="status-tag" :class="hazardStatusClass(row)">{{row.status}}</span></td></tr><tr v-if="!previewList.length"><td :colspan="SHOW_HAZARD_SAMPLING ? 5 : 4" class="empty-row">暂无符合条件的隐患记录</td></tr></tbody></table></div></div>
  <DispatchDraggablePanel v-if="hazardMoreOpen" title="隐患清单汇总" :width="1000" :z-index="120010" placement="right" @close="hazardMoreOpen=false">
    <div class="hazard-stat-strip"><div class="hazard-stat clickable" :class="{'active':activeStat===''}" @click="selectStat('')"><span>问题记录总数</span><strong>{{hazardStats.total}}</strong></div><div class="hazard-stat clickable" :class="{'active':activeStat==='open'}" @click="selectStat('open')"><span>未闭环</span><strong class="warn">{{hazardStats.open}}</strong></div><div class="hazard-stat clickable" :class="{'active':activeStat==='overdue'}" @click="selectStat('overdue')"><span>逾期未闭环</span><strong class="danger">{{hazardStats.overdue}}</strong></div><div class="hazard-stat clickable" :class="{'active':activeStat==='closed'}" @click="selectStat('closed')"><span>已闭环</span><strong class="ok">{{hazardStats.closed}}</strong></div></div>
    <div class="more-dialog-toolbar hazard-toolbar"><div class="more-filters hazard-filters"><el-select v-model="hazardSourceFilter" clearable placeholder="搜索来源" size="small"><el-option v-for="source in HAZARD_ISSUE_SOURCES" :key="source.value" :label="source.label" :value="source.value"/></el-select><el-select v-model="hazardStatusFilter" clearable placeholder="整改状态" size="small"><el-option v-for="status in hazardStatusOptions" :key="status" :label="status" :value="status"/></el-select><el-select v-model="hazardCategoryFilter" clearable placeholder="类别" size="small"><el-option v-for="category in hazardCategoryOptions" :key="category" :label="category" :value="category"/></el-select><el-input v-model="hazardKeyword" clearable placeholder="问题内容" size="small"/></div><span class="hazard-count">共 {{filtered.length}} 条</span></div>
   <table class="mini-table more-table"><thead><tr><th>数据源</th><th>类别</th><th>登记时间</th><th>隐患／问题内容</th><th>整改状态</th><th v-if="SHOW_HAZARD_SAMPLING">抽查结果</th></tr></thead><tbody><tr v-for="row in pagedHazard" :key="row.id" class="clickable-row" @dblclick="openDetail(row)"><td>{{row.sourceLabel}}</td><td>{{row.categoryLabel}}</td><td>{{row.registeredAt||'--'}}</td><td class="desc" :title="row.title">{{row.title}}</td><td>{{row.status}}</td><td v-if="SHOW_HAZARD_SAMPLING">{{hqSamplingStatus(row)}}</td></tr><tr v-if="!filtered.length"><td :colspan="SHOW_HAZARD_SAMPLING ? 6 : 5" class="empty-row">暂无符合条件的隐患记录</td></tr></tbody></table>
   <div class="hazard-pager"><el-pagination v-model:current-page="hazardPage" v-model:page-size="hazardPageSize" :total="filtered.length" :page-sizes="[10,20,50]" layout="total, sizes, prev, pager, next" small background/></div>
  </DispatchDraggablePanel>
  <DispatchDraggablePanel v-if="detailView" :title="detailView.sourceLabel+' · 隐患详情'" :width="940" :z-index="120030" placement="right" right-backdrop @close="detailView=null"><CocHazardIssueDetail :row="detailView" @back="detailView=null"/></DispatchDraggablePanel>
 </div>
</template>
<style scoped>
.hazard-pager { display: flex; justify-content: flex-end; padding: 10px 4px 2px; }
.hazard-pager :deep(.el-pagination) { --el-pagination-bg-color: transparent; --el-pagination-text-color: #c7d6ea; --el-pagination-button-color: #c7d6ea; --el-pagination-button-bg-color: transparent; --el-pagination-hover-color: #e6a23c; }
.hazard-pager :deep(.el-pagination__total) { color: #9fb3cc; }
.hazard-pager :deep(.el-pager li) { background: rgba(255,255,255,.06); color: #c7d6ea; border-radius: 4px; }
.hazard-pager :deep(.el-pager li.is-active) { background: #2f6fed; color: #fff; }
.hazard-toolbar { display: flex; align-items: center; justify-content: space-between; }
.hazard-filters { justify-content: flex-start; }
.hazard-filters :deep(.el-select), .hazard-filters :deep(.el-input) { width: 150px; }
.hazard-filters :deep(.el-input__wrapper), .hazard-filters :deep(.el-select__wrapper) { width: 100%; }
.hazard-count { flex-shrink: 0; margin-left: 12px; }

.hazard-toolbar { flex-wrap: wrap; row-gap: 8px; }
.hazard-filters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.hazard-stat.clickable { cursor: pointer; transition: border-color .15s, box-shadow .15s; }
.hazard-stat.clickable:hover { border-color: rgba(230,162,60,.6); }
.hazard-stat.active { border-color: #e6a23c; box-shadow: 0 0 0 2px rgba(230,162,60,.18); }
.coc-filter-setting { display: flex; flex-direction: column; gap: 6px; }
.coc-filter-title { font-size: 13px; font-weight: 600; margin-bottom: 2px; color: #1f2329; }
.coc-filter-setting :deep(.el-checkbox) { margin-right: 0; }

.hazard-stat-strip { display: flex; gap: 10px; padding: 4px 2px 10px; }
.hazard-stat { flex: 1; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 8px; padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
.hazard-stat span { font-size: 12px; color: #9fb3c8; }
.hazard-stat strong { font-size: 20px; color: #eaf2fb; line-height: 1.1; }
.hazard-stat strong.warn { color: #e6a23c; }
.hazard-stat strong.danger { color: #f56c6c; }
.hazard-stat strong.ok { color: #67c23a; }

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
.status-tag.fail{background:rgba(245,108,108,.15);color:#f56c6c}.hazard-side-panel .status-tag{white-space:nowrap}.more-filters{flex-wrap:wrap}.more-filters :deep(.el-input){max-width:210px}.more-filters :deep(.el-select){width:150px}
</style>

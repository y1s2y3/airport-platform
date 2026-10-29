<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { sampling, visibleTasks, useSamplingRole, samplingPersonId, ensureSamplingExamples, hqMainTasks, linkedReviewTask, unlinkedReviewTasks, taskProgress } from '../../mock/hazardSampling.js'
import { getHazardIssueProjectOptions } from '../../utils/hazardIssueSummary.js'
import { rememberSupervisorTask, supervisorTaskLocation } from '../../utils/hazardSamplingTaskNavigation.js'
const route=useRoute(), router=useRouter()
const {selectedProjectId}=useCurrentProject()
const role=useSamplingRole(), isHq=computed(()=>role.value==='hq')
const isReviewMenu=computed(()=>route.path.startsWith('/hazard-issues/review'))
ensureSamplingExamples()
const stateOptions=['待办理','办理中','已办理']
const followOptions=['未下发','未完成','已办理']
const number=ref(''), stateFilter=ref(''), followFilter=ref(''), dates=ref([]), page=ref(1), projectFilter=ref(''), personFilter=ref('')
const projects=computed(()=>getHazardIssueProjectOptions())
/** 指挥部按「我下发的一轮检查」列一行原抽检任务；项目级仍列本人收到的两类任务。 */
const rows=computed(()=>{
  const base=isHq.value?hqMainTasks():visibleTasks(role.value,selectedProjectId.value)
  return base.map(task=>{
    const review=task.stage==='supervisor'?linkedReviewTask(task):null
    return { task, review, progress:taskProgress(task), reviewProgress:review?taskProgress(review):null }
  })
})
const unlinked=computed(()=>isHq.value?unlinkedReviewTasks().map(task=>({ task, progress:taskProgress(task) })):[])
const stateLabel=value=>value.submittedAt?'已办理':value.results&&Object.keys(value.results).length?'办理中':'待办理'
const followLabel=(review,progress)=>!review?'未下发':`${review.recipient||'--'} · 已复查 ${progress.done}/${progress.total} 张 · ${review.submittedAt?'已办理':progress.done?'办理中':'待办理'}`
const formatTime=value=>value?new Date(value).toLocaleString('sv-SE'):'--'
const resultCount=(task,result)=>task.ids.filter(id=>sampling.value.history.some(log=>log.id===task.results[id]&&log.stage===task.stage&&log.result===result)).length
const filtered=computed(()=>rows.value.filter(row=>{
  const task=row.task
  if(number.value.trim()&&!task.id.toLowerCase().includes(number.value.trim().toLowerCase()))return false
  if(stateFilter.value&&stateLabel(task)!==stateFilter.value)return false
  if(projectFilter.value&&task.projectKey!==projectFilter.value)return false
  if(personFilter.value.trim()){
    const text=`${task.recipient} ${task.assigneeName || ''} ${row.review?.recipient || ''} ${row.review?.assigneeName || ''}`
    if(!text.includes(personFilter.value.trim()))return false
  }
  if(followFilter.value){
    if(task.stage!=='supervisor')return false
    const has=Boolean(row.review)
    if(followFilter.value==='未下发'&&has)return false
    if(followFilter.value==='未完成'&&(!has||row.review.submittedAt))return false
    if(followFilter.value==='已办理'&&(!has||!row.review.submittedAt))return false
  }
  if(dates.value?.length===2){const day=formatTime(task.createdAt).slice(0,10);if(day<dates.value[0]||day>dates.value[1])return false}
  return true
}).sort((a,b)=>(Date.parse(b.task.createdAt)||0)-(Date.parse(a.task.createdAt)||0)))
const paged=computed(()=>filtered.value.slice((page.value-1)*10,page.value*10))
function reset(){number.value='';stateFilter.value='';followFilter.value='';dates.value=[];projectFilter.value='';personFilter.value='';page.value=1}
function syncRoute(){if(!route.query.taskView)return;const query={...route.query};delete query.taskView;router.replace({path:route.path,query})}
watch([number,stateFilter,followFilter,dates,projectFilter,personFilter],()=>{page.value=1})
watch([role,selectedProjectId,samplingPersonId],reset)
watch(()=>route.query.taskView,syncRoute)
onMounted(syncRoute)
function open(task){rememberSupervisorTask(task);const location=supervisorTaskLocation(task.id);router.push({...location,query:{...location.query,from:route.path}})}
</script>
<template>
  <section class="supervisor-task-list">
    <div class="task-filters">
      <el-input v-model="number" clearable placeholder="任务编号" style="width:210px"/>
      <el-select v-if="isHq" v-model="projectFilter" clearable filterable placeholder="所属项目" style="width:170px"><el-option v-for="project in projects" :key="project.key" :label="project.label" :value="project.key"/></el-select>
      <el-input v-if="isHq" v-model="personFilter" clearable placeholder="抽检人／复查人" style="width:170px"/>
      <el-select v-model="stateFilter" clearable placeholder="任务状态" aria-label="任务状态" class="task-state-filter" style="width:140px"><el-option v-for="state in stateOptions" :key="state" :label="state" :value="state"/></el-select>
      <el-select v-if="!isReviewMenu" v-model="followFilter" clearable placeholder="后续全面复查" aria-label="后续全面复查" style="width:150px"><el-option v-for="state in followOptions" :key="state" :label="state" :value="state"/></el-select>
      <span>下发日期</span><el-date-picker v-model="dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="max-width:320px"/><el-button @click="reset">重置</el-button>
    </div>
    <el-table :data="paged" border stripe class="supervisor-tasks" empty-text="暂无符合条件的任务">
      <el-table-column label="任务编号" min-width="185" show-overflow-tooltip><template #default="{row}">{{ row.task.id }}</template></el-table-column>
      <el-table-column v-if="isHq" label="项目" min-width="95"><template #default="{row}">{{ row.task.projectName }}</template></el-table-column>
      <el-table-column :label="isReviewMenu ? '复查人' : (isHq ? '抽检人' : '办理人')" min-width="150" show-overflow-tooltip><template #default="{row}">{{ row.task.recipient || '--' }}</template></el-table-column>
      <el-table-column v-if="isHq" label="下发人" min-width="105"><template #default="{row}">{{ row.task.sender || '指挥部检查人' }}</template></el-table-column>
      <el-table-column label="下发时间" width="145"><template #default="{row}">{{ formatTime(row.task.createdAt) }}</template></el-table-column>
      <el-table-column label="检查时间范围" min-width="175"><template #default="{row}">{{ row.task.start }} 至 {{ row.task.end }}</template></el-table-column>
      <el-table-column label="比例（%）" width="80"><template #default="{row}">{{ row.task.percent ?? '--' }}</template></el-table-column>
      <el-table-column v-if="isHq" :label="isReviewMenu ? '复查进度（张）' : '抽检进度（张）'" width="140"><template #default="{row}">{{ row.progress.done }}/{{ row.progress.total }}<span v-if="row.progress.failed" class="task-fail-count">，不合格{{ row.progress.failed }}张</span></template></el-table-column>
      <el-table-column v-else label="单据（张）" width="95"><template #default="{row}">{{ row.progress.total }}</template></el-table-column>
      <el-table-column v-if="!isHq" label="完成进度（张）" width="125"><template #default="{row}">{{ row.progress.done }} / {{ row.progress.total }}</template></el-table-column>
      <el-table-column v-if="isHq" :label="isReviewMenu ? '任务状态' : '原任务状态'" width="95"><template #default="{row}"><span class="task-state-pill" :class="{complete:row.task.submittedAt}">{{ stateLabel(row.task) }}</span></template></el-table-column>
      <el-table-column v-if="!isReviewMenu" label="后续全面复查" min-width="205"><template #default="{row}"><span v-if="row.task.stage!=='supervisor'" class="task-follow-empty">--</span><span v-else :class="{ 'task-follow-empty': !row.review }">{{ followLabel(row.review, row.reviewProgress || { done: 0, total: 0 }) }}</span></template></el-table-column>
      <el-table-column v-if="!isHq&&stateFilter==='已办理'" label="完成时间" width="170"><template #default="{row}">{{ formatTime(row.task.submittedAt) }}</template></el-table-column>
      <el-table-column v-if="!isHq&&stateFilter==='已办理'" label="合格／已复查（张）" width="155"><template #default="{row}">{{ resultCount(row.task,'合格') }}</template></el-table-column>
      <el-table-column v-if="!isHq&&stateFilter==='已办理'" label="不合格（张）" width="112"><template #default="{row}">{{ resultCount(row.task,'不合格') }}</template></el-table-column>
      <el-table-column v-if="!isHq" label="状态" width="100" fixed="right"><template #default="{row}"><span class="task-state-pill" :class="{complete:row.task.submittedAt}">{{ stateLabel(row.task) }}</span></template></el-table-column>
      <el-table-column label="操作" width="72" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row.task)">打开</el-button></template></el-table-column>
    </el-table>
    <el-collapse v-if="isHq && unlinked.length" class="unlinked-history">
      <el-collapse-item name="unlinked">
        <template #title><span class="unlinked-title">未关联历史任务（{{ unlinked.length }}）</span></template>
        <el-table :data="unlinked" border stripe size="small" empty-text="没有未关联的历史任务">
          <el-table-column label="任务编号" min-width="185" show-overflow-tooltip><template #default="{row}">{{ row.task.id }}</template></el-table-column>
          <el-table-column label="项目" min-width="120"><template #default="{row}">{{ row.task.projectName || '--' }}</template></el-table-column>
          <el-table-column label="复查人" min-width="150" show-overflow-tooltip><template #default="{row}">{{ row.task.recipient || '--' }}</template></el-table-column>
          <el-table-column label="下发人" min-width="130"><template #default="{row}">{{ row.task.sender || '--' }}</template></el-table-column>
          <el-table-column label="下发时间" width="145"><template #default="{row}">{{ formatTime(row.task.createdAt) }}</template></el-table-column>
          <el-table-column label="复查进度（张）" width="125"><template #default="{row}">{{ row.progress.done }}/{{ row.progress.total }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{row}"><span class="task-state-pill" :class="{complete:row.task.submittedAt}">{{ stateLabel(row.task) }}</span></template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{row}"><el-button link type="primary" @click="open(row.task)">查看</el-button></template></el-table-column>
        </el-table>
      </el-collapse-item>
    </el-collapse>
    <div class="task-pagination"><el-pagination v-model:current-page="page" :page-size="10" :total="filtered.length" layout="total,prev,pager,next"/></div>
  </section>
</template>
<style scoped>
.supervisor-task-list{padding:18px;border:1px solid #e5e9ef;border-radius:8px;background:#fff}.task-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 16px;font-size:13px;color:#737c89}.task-pagination{display:flex;justify-content:flex-end;padding-top:16px}.task-state-pill{display:inline-block;padding:2px 8px;border-radius:4px;line-height:22px;color:#9b690f;background:#fff5df;white-space:nowrap}.task-state-pill.complete{color:#278450;background:#edf8ef}.task-fail-count{color:#c74747}.task-follow-empty{color:#9aa1aa}.unlinked-history{margin-top:16px}.unlinked-title{font-size:13px;color:#737c89}
</style>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentProject } from '../../composables/useCurrentProject.js'
import { sampling, visibleTasks, useSamplingRole, samplingPersonId, ensureSamplingExamples } from '../../mock/hazardSampling.js'
import { getHazardIssueProjectOptions } from '../../utils/hazardIssueSummary.js'
import { rememberSupervisorTask, supervisorTaskLocation } from '../../utils/hazardSamplingTaskNavigation.js'
const route=useRoute(), router=useRouter()
const {selectedProjectId}=useCurrentProject()
const role=useSamplingRole(), isHq=computed(()=>role.value==='hq')
ensureSamplingExamples()
const stateOptions=['待办','已办','待办理','办理中']
const number=ref(''), stateFilter=ref(''), dates=ref([]), page=ref(1), projectFilter=ref(''), personFilter=ref('')
const projects=computed(()=>getHazardIssueProjectOptions())
const tasks=computed(()=>visibleTasks(role.value,selectedProjectId.value))
const stateLabel=task=>task.submittedAt?'已完成':Object.keys(task.results).length?'办理中':'待办理'
const formatTime=value=>value?new Date(value).toLocaleString('sv-SE'):'--'
const resultCount=(task,result)=>task.ids.filter(id=>sampling.value.history.some(log=>log.id===task.results[id]&&log.stage===task.stage&&log.result===result)).length
const filtered=computed(()=>tasks.value.filter(task=>{
  if(number.value.trim()&&!task.id.toLowerCase().includes(number.value.trim().toLowerCase()))return false
  if(stateFilter.value==='待办'&&task.submittedAt)return false
  if(stateFilter.value==='已办'&&!task.submittedAt)return false
  if(stateFilter.value&&!['待办','已办'].includes(stateFilter.value)&&stateLabel(task)!==stateFilter.value)return false
  if(projectFilter.value&&task.projectKey!==projectFilter.value)return false
  if(personFilter.value.trim()&&!`${task.recipient} ${task.assigneeName || ''}`.includes(personFilter.value.trim()))return false
  if(dates.value?.length===2){const day=formatTime(task.createdAt).slice(0,10);if(day<dates.value[0]||day>dates.value[1])return false}
  return true
}).sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0)))
const paged=computed(()=>filtered.value.slice((page.value-1)*10,page.value*10))
function reset(){number.value='';stateFilter.value='';dates.value=[];projectFilter.value='';personFilter.value='';page.value=1}
function syncRoute(){if(!route.query.taskView)return;const query={...route.query};delete query.taskView;router.replace({path:route.path,query})}
watch([number,stateFilter,dates,projectFilter,personFilter],()=>{page.value=1})
watch([role,selectedProjectId,samplingPersonId],reset)
watch(()=>route.query.taskView,syncRoute)
onMounted(syncRoute)
function open(task){rememberSupervisorTask(task);router.push(supervisorTaskLocation(task.id))}
</script>
<template>
  <section class="supervisor-task-list">
    <div class="task-filters">
      <el-input v-model="number" clearable placeholder="任务编号" style="width:210px"/>
      <el-select v-if="isHq" v-model="projectFilter" clearable filterable placeholder="所属项目" style="width:170px"><el-option v-for="project in projects" :key="project.key" :label="project.label" :value="project.key"/></el-select>
      <el-input v-if="isHq" v-model="personFilter" clearable placeholder="抽检人／复查人" style="width:170px"/>
      <el-select v-model="stateFilter" clearable placeholder="任务状态" aria-label="任务状态" class="task-state-filter" style="width:140px"><el-option v-for="state in stateOptions" :key="state" :label="state" :value="state"/></el-select>
      <span>下发日期</span><el-date-picker v-model="dates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="max-width:320px"/><el-button @click="reset">重置</el-button>
    </div>
    <el-table :data="paged" border stripe class="supervisor-tasks" empty-text="暂无符合条件的任务">
      <el-table-column prop="id" label="任务编号" min-width="225" show-overflow-tooltip/>
      <el-table-column v-if="isHq" prop="projectName" label="项目" min-width="120"/>
      <el-table-column v-if="isHq" label="任务类型" width="105"><template #default="{row}">{{row.stage==='manager'?'全面复查':'抽检'}}</template></el-table-column>
      <el-table-column prop="recipient" label="办理人" min-width="200" show-overflow-tooltip/>
      <el-table-column v-if="isHq" label="下发人" min-width="130"><template #default="{row}">{{row.sender||'指挥部检查人'}}</template></el-table-column>
      <el-table-column label="下发时间" width="170"><template #default="{row}">{{formatTime(row.createdAt)}}</template></el-table-column>
      <el-table-column label="检查时间范围" min-width="210"><template #default="{row}">{{row.start}} 至 {{row.end}}</template></el-table-column>
      <el-table-column label="比例（%）" width="95"><template #default="{row}">{{row.percent??'--'}}</template></el-table-column>
      <el-table-column label="单据（张）" width="95"><template #default="{row}">{{row.ids.length}}</template></el-table-column>
      <el-table-column label="完成进度（张）" width="125"><template #default="{row}">{{Object.keys(row.results).length}} / {{row.ids.length}}</template></el-table-column>
      <el-table-column v-if="!isHq&&stateFilter==='已办'" label="完成时间" width="170"><template #default="{row}">{{formatTime(row.submittedAt)}}</template></el-table-column>
      <el-table-column v-if="!isHq&&stateFilter==='已办'" label="合格／已复查（张）" width="155"><template #default="{row}">{{resultCount(row,'合格')}}</template></el-table-column>
      <el-table-column v-if="!isHq&&stateFilter==='已办'" label="不合格（张）" width="112"><template #default="{row}">{{resultCount(row,'不合格')}}</template></el-table-column>
      <el-table-column label="状态" width="100" fixed="right"><template #default="{row}"><span class="task-state-pill" :class="{complete:row.submittedAt}">{{stateLabel(row)}}</span></template></el-table-column>
      <el-table-column label="操作" width="115" fixed="right"><template #default="{row}"><el-button link type="primary" @click="open(row)">{{isHq||row.submittedAt?'查看':row.stage==='manager'?Object.keys(row.results).length?'继续复查':'开始复查':Object.keys(row.results).length?'继续抽检':'开始抽检'}}</el-button></template></el-table-column>
    </el-table>
    <div class="task-pagination"><el-pagination v-model:current-page="page" :page-size="10" :total="filtered.length" layout="total,prev,pager,next"/></div>
  </section>
</template>
<style scoped>
.supervisor-task-list{padding:18px;border:1px solid #e5e9ef;border-radius:8px;background:#fff}.task-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 16px;font-size:13px;color:#737c89}.task-pagination{display:flex;justify-content:flex-end;padding-top:16px}.task-state-pill{display:inline-block;padding:2px 8px;border-radius:4px;line-height:22px;color:#9b690f;background:#fff5df;white-space:nowrap}.task-state-pill.complete{color:#278450;background:#edf8ef}
</style>

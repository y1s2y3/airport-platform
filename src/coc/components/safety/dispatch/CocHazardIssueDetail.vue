<script setup>
import { computed } from 'vue'
import HazardSamplingPanel from '../../../../components/HazardSamplingPanel.vue'
import { getInspectionHazardDetail } from '../../../../mock/inspectionHazardQuery.js'
import { resolveDispatchHazardPhotoSrc, resolveDispatchHazardPhotoName } from '../../../../utils/dispatchHazardStorage.js'
const props=defineProps({row:{type:Object,required:true}})
defineEmits(['back'])
const raw=computed(()=>props.row.raw)
const inspection=computed(()=>props.row.source==='inspection'?getInspectionHazardDetail(props.row.sourceId):null)
const fields=computed(()=>{
 const r=props.row,d=raw.value
 const common=[['单据编号',r.originalNo],['项目',r.projectName],['来源',r.sourceLabel],['类别',r.categoryLabel],['整改状态',r.status],['检查／登记时间',r.registeredAt],['整改人',r.rectifier],['完成期限',r.deadline]]
 if(r.source==='inspection')common.push(['巡检任务编号',d.taskNo],['复查人',d.reviewer],['项目经理',d.manager])
 if(r.source==='supervision')common.push(['会议编号',d.meetingId],['隐患等级',d.hazardLevel],['备注',d.remark])
 if(r.source==='dispatch')common.push(['隐患等级',d.hazardLevel],['摄像头',d.cameraName],['摄像头位置',d.cameraLocation],['截图来源',d.sourceType])
 if(r.source==='externalQuality')common.push(['标段',d.sectionName],['问题类型',d.issueType],['问题来源',d.source],['发现人',d.finder],['发起人',d.initiator],['审核人',d.reviewer])
 return common
})
const photos=computed(()=>inspection.value?.hazard?.photos||raw.value.hazardPhotos||(raw.value.snapshot?[raw.value.snapshot]:[]))
const rectPhotos=computed(()=>inspection.value?.rectification?.photos||raw.value.rectifyPhotos||[])
const rectification=computed(()=>inspection.value?.rectification?.note||raw.value.rectifyRemark||'')
/** 流程记录：结构对齐工作台「我的待办」流程记录（节点标题 + 处理人 + 备注 + 时间 + 当前态），样式按大屏深色展示 */
const logs=computed(()=>{
 const row=props.row,d=raw.value
 if(row.source==='externalQuality'){
  const list=(d.approvalLogs||[]).map(item=>({title:item.stage||'审批',user:item.person||'',time:item.time||'',remark:item.opinion||'',status:'done'}))
  if(!list.length)list.push({title:'问题登记',user:d.initiator||'',time:d.createdAt||'',remark:'',status:'done'})
  return list
 }
 if(row.source==='inspection'){
  return (inspection.value?.flow||[]).map(item=>({title:item.a||'',user:item.by||'',time:item.d||'',remark:item.dt||'',status:item.cur?'current':item.d?'done':'pending'}))
 }
 const list=[...(d.statusLogs||[])].reverse().map(item=>{
  const actor=item.operator||''
  const role=item.operatorRole||''
  return {title:item.action||item.toStatus||'流程节点',user:actor&&role&&role!==actor?`${actor}（${role}）`:actor,time:item.time||'',remark:item.remark||'',status:'done'}
 })
 if(!list.length&&d.uploadTime)list.push({title:'登记',user:'',time:d.uploadTime,remark:'',status:'done'})
 return list
})
const flowType=(status)=>status==='done'?'success':status==='current'?'primary':'info'
const photoUrl=(file,index)=>resolveDispatchHazardPhotoSrc(file,index)
</script>
<template>
 <div class="coc-hazard-issue-detail">
  <HazardSamplingPanel :source="row.source" :record-id="row.sourceId" coc/>
  <section>
   <h3>基本信息</h3>
   <div class="source-fields"><div v-for="[label,value] in fields" :key="label" class="source-field"><span>{{label}}</span><strong>{{value||'--'}}</strong></div></div>
   <div class="hazard-content">
    <div class="hazard-content-label">隐患／问题内容</div>
    <p class="hazard-content-text">{{row.title}}</p>
    <div v-if="photos.length" class="source-photos"><el-image v-for="(photo,index) in photos" :key="index" :src="photoUrl(photo,index)" :preview-src-list="photos.map(photoUrl)" :z-index="240000" preview-teleported fit="contain"/></div>
   </div>
  </section>
  <section v-if="row.source==='externalQuality'"><h3>问题描述与要求建议</h3><div v-for="item in raw.items" :key="item.id" class="source-item"><p>{{item.description}}</p><p>要求建议：{{item.advice||'--'}}</p><div class="source-photos"><div v-for="(file,index) in item.attachments" :key="index"><el-image :src="photoUrl(file,index)" :preview-src-list="item.attachments.map(photoUrl)" :z-index="240000" preview-teleported fit="contain"/><small>{{file.name||file}}</small></div></div></div></section>
  <section v-if="rectification||rectPhotos.length"><h3>整改信息</h3><div class="source-field rectify-field"><span>整改说明</span><strong>{{rectification||'--'}}</strong></div><p v-if="inspection?.rectification?.date">整改日期：{{inspection.rectification.date}}</p><div class="hazard-content-label">整改图片</div><div v-if="rectPhotos.length" class="source-photos"><div v-for="(photo,index) in rectPhotos" :key="index"><el-image :src="photoUrl(photo,index)" :preview-src-list="rectPhotos.map(photoUrl)" :initial-index="index" :z-index="240000" preview-teleported fit="contain"/><small>{{resolveDispatchHazardPhotoName(photo,index)}}</small></div></div><p v-else>--</p></section>
  <section v-if="inspection?.reviews?.length"><h3>复查信息</h3><div v-for="review in inspection.reviews" :key="review.round"><p>{{review.date||'--'}} · {{review.result||'--'}}</p><p>{{review.comment||'--'}}</p></div></section>
  <section v-if="inspection?.managerApproval"><h3>项目经理审批</h3><p>{{inspection.managerApproval.manager||'--'}} · {{inspection.managerApproval.status||'--'}}</p><p>{{inspection.managerApproval.comment||'--'}}</p></section>
  <section><h3>流程记录</h3><el-timeline v-if="logs.length" class="coc-flow-timeline"><el-timeline-item v-for="(log,index) in logs" :key="index" :type="flowType(log.status)" :hollow="log.status==='pending'" :timestamp="log.time||'待进行'" placement="top"><div class="coc-flow-card" :class="log.status"><div class="coc-flow-title">{{log.title}}<el-tag v-if="log.status==='current'" size="small" type="warning" effect="dark">当前</el-tag></div><div class="coc-flow-meta">处理人：{{log.user||'--'}}</div><div v-if="log.remark" class="coc-flow-remark">备注：{{log.remark}}</div></div></el-timeline-item></el-timeline><p v-else>--</p></section>

 </div>
</template>
<style scoped>
.coc-hazard-issue-detail{color:#dce8f6;font-size:13px;--el-bg-color:#1b2d46;--el-fill-color-blank:#1b2d46;--el-text-color-regular:#dce8f6;--el-text-color-primary:#eff6ff;--el-border-color-lighter:#3e526b;--el-fill-color-light:#243c57}.source-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}.source-field{display:flex;gap:12px;line-height:1.6}.source-field span{color:#98adc6;min-width:100px}.source-field strong{font-weight:400;overflow-wrap:anywhere}.coc-hazard-issue-detail section{border-top:1px solid #354961;padding:14px 0;margin-top:14px}.coc-hazard-issue-detail h3{display:flex;align-items:center;gap:8px;font-size:15px;margin:0 0 12px;color:#eaf2ff}.coc-hazard-issue-detail h3::before{content:"";width:3px;height:14px;border-radius:2px;background:#c97b63}.coc-hazard-issue-detail p{line-height:1.7;margin:8px 0}.source-photos{display:flex;gap:12px;flex-wrap:wrap}.source-photos :deep(.el-image){width:180px;height:110px}.source-photos small{display:block;max-width:180px;overflow-wrap:anywhere;color:#9eb2ca}.coc-flow-timeline{padding:2px 0 0 2px}.coc-flow-timeline :deep(.el-timeline-item){padding-bottom:16px}.coc-flow-timeline :deep(.el-timeline-item:last-child){padding-bottom:0}.coc-flow-timeline :deep(.el-timeline-item__tail){border-left-color:#3a4f68}.coc-flow-timeline :deep(.el-timeline-item__timestamp){color:#94aac5;font-size:12px;line-height:1.5}.coc-flow-timeline :deep(.el-timeline-item__timestamp.is-top){margin-bottom:6px}.coc-flow-timeline :deep(.el-timeline-item__node){background:#4a5f79;border-color:#4a5f79}.coc-flow-timeline :deep(.el-timeline-item__node--success){background:#3fae6a}.coc-flow-timeline :deep(.el-timeline-item__node--primary){background:#c97b63;box-shadow:0 0 0 3px rgba(201,123,99,.25)}.coc-flow-timeline :deep(.el-timeline-item__node.is-hollow){background:#1b2d46;border-color:#4a5f79}.coc-flow-card{padding:10px 12px;border-radius:8px;background:rgba(35,55,78,.55);border:1px solid #334a64}.coc-flow-card.done{border-color:rgba(63,174,106,.38);background:rgba(63,174,106,.1)}.coc-flow-card.current{border-color:rgba(201,123,99,.7);background:rgba(201,123,99,.14)}.coc-flow-card.pending{opacity:.86}.coc-flow-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;line-height:1.5;color:#eaf2ff}.coc-flow-meta{margin-top:4px;font-size:12px;color:#a9bdd4}.coc-flow-remark{margin-top:2px;font-size:12px;line-height:1.6;color:#b9cbe0;overflow-wrap:anywhere}/* ===== 隐患／问题内容（并入基本信息） ===== */
.hazard-content{margin-top:14px;padding:12px 14px;border-radius:8px;background:rgba(35,55,78,.55);border:1px solid #334a64}
.hazard-content-label{font-size:13px;font-weight:600;line-height:1.5;color:#c9dcf2;margin-bottom:6px}
.hazard-content-text{margin:0;line-height:1.7;color:#dce8f6;overflow-wrap:anywhere}
.hazard-content .source-photos{margin-top:10px}
.rectify-field{display:flex;gap:12px;line-height:1.7;margin-bottom:6px}
.rectify-field span{color:#98adc6;min-width:70px;flex-shrink:0}
.rectify-field strong{font-weight:400;overflow-wrap:anywhere}
/* ===== 抽检记录（深色大屏美化） ===== */
.coc-hazard-issue-detail :deep(.sampling-panel){margin:0;padding:0;background:transparent;border:0;border-radius:0;color:#dce8f6}
.coc-hazard-issue-detail :deep(.sampling-panel-head){display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px;padding-bottom:10px;border-bottom:1px dashed #3a506a}
.coc-hazard-issue-detail :deep(.sampling-panel-head h3){display:flex;align-items:center;gap:8px;margin:0;font-size:15px;color:#eaf2ff}
.coc-hazard-issue-detail :deep(.sampling-panel-head h3::before){content:"";width:3px;height:14px;border-radius:2px;background:#c97b63}
.coc-hazard-issue-detail :deep(.sampling-panel .el-button--primary){--el-button-bg-color:#a9553f;--el-button-border-color:#a9553f;--el-button-hover-bg-color:#c97b63;--el-button-hover-border-color:#c97b63;--el-button-active-bg-color:#8f4634}
.coc-hazard-issue-detail :deep(.sampling-date-filter){margin:0 0 12px;padding:10px 12px;border-radius:8px;background:rgba(35,55,78,.55);border:1px solid #334a64;color:#a9bdd4}
.coc-hazard-issue-detail :deep(.sampling-date-filter .el-range-editor){background:#1b2d46;box-shadow:none}
.coc-hazard-issue-detail :deep(.sampling-date-filter .el-button){--el-button-bg-color:transparent;--el-button-border-color:#3e526b;--el-button-text-color:#c9dcf2;--el-button-hover-bg-color:rgba(201,123,99,.12);--el-button-hover-border-color:#c97b63;--el-button-hover-text-color:#eaf2ff;color:#c9dcf2}
.coc-hazard-issue-detail :deep(.sampling-pending-entry){margin:0 0 12px;padding:10px 12px;background:rgba(201,123,99,.12);border:1px solid rgba(201,123,99,.45);border-radius:8px;color:#dce8f6}
.coc-hazard-issue-detail :deep(.sampling-pending-entry strong){color:#f0c7b8}
.coc-hazard-issue-detail :deep(.sampling-rounds){margin-top:4px}
.coc-hazard-issue-detail :deep(.sampling-round-table){--el-table-bg-color:transparent;--el-table-tr-bg-color:transparent;--el-table-header-bg-color:#22374f;--el-table-header-text-color:#c9dcf2;--el-table-border-color:#334a64;--el-table-text-color:#dce8f6;--el-table-row-hover-bg-color:rgba(201,123,99,.12);background:transparent;border:1px solid #334a64;border-radius:8px;overflow:hidden}
.coc-hazard-issue-detail :deep(.sampling-round-table .el-button.is-link){color:#d8a18c}
.coc-hazard-issue-detail :deep(.sampling-round-table .el-button.is-link:hover){color:#f0c7b8}
.coc-hazard-issue-detail :deep(.sampling-round-table th.el-table__cell){background:#22374f;color:#c9dcf2;font-weight:600;border-bottom-color:#3a506a}
.coc-hazard-issue-detail :deep(.sampling-round-table td.el-table__cell){border-bottom-color:#2f4460}
.coc-hazard-issue-detail :deep(.sampling-round-table .el-table__empty-text){color:#8ea6c0}
.coc-hazard-issue-detail :deep(.sampling-hint){color:#8ea6c0}.source-item{padding:10px 0;border-bottom:1px solid #354961}
</style>

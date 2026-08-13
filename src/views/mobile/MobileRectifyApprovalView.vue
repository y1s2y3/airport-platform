<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMobileRectification, submitManagerApproval } from '../../composables/useMobileRectification'

const route = useRoute()
const router = useRouter()
const record = computed(() => getMobileRectification(route.params.id) || getMobileRectification('rec-007'))
const approvalDate = ref('')
const approvalComment = ref('')
const flowCollapsed = ref(false)
onMounted(() => document.querySelector('.page-viewport')?.scrollTo({ top:0 }))

const flowRecords = computed(() => [
  { action:'下发整改单', date:'2026-07-25 09:00' },
  { action:'整改人提交整改结果', date:'2026-07-28 16:30' },
  { action:'复查人复查通过', date:record.value.applyDate },
  { action:'待项目经理审批', date:'', current:true },
])

function handleApproval(pass) {
  if (!approvalDate.value) { ElMessage.warning('请选择审批日期'); return }
  if (!approvalComment.value.trim()) { ElMessage.warning('请输入审批意见'); return }
  submitManagerApproval(record.value.id, pass, {
    approvalDate: approvalDate.value,
    approvalComment: approvalComment.value.trim(),
  })
  ElMessage.success(pass ? '审批通过，整改流程已闭环' : '审批不通过，已退回复查人重新复查')
  const tab = route.query.tab
  router.push(tab ? `/mobile/rectify?tab=${pass ? '已关闭' : '待复查'}` : '/mobile/rectify')
}

function goBack() {
  const tab = route.query.tab
  router.push(tab ? `/mobile/rectify?tab=${tab}` : '/mobile/rectify')
}
</script>

<template>
  <div class="mp">
    <header class="mh">
      <button class="mb" @click="goBack">‹</button>
      <h1 class="mt">项目经理审批</h1>
    </header>

    <div class="info-bar">
      <div class="info-title">⚠ {{ record.rectifyNo }}</div>
      <div class="info-meta">巡检任务单编号：{{ record.taskNo }}</div>
      <div class="info-meta">巡检分类：{{ record.inspectionCategory }}</div>
      <div class="info-meta">{{ record.project }}</div>
      <div class="people-row">
        <span>整改人：{{ record.rectifier }}</span>
        <span>复查人：{{ record.reviewer }}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title collapsible" @click="flowCollapsed = !flowCollapsed">
        <span>流程记录</span>
        <span class="collapse-arrow">{{ flowCollapsed ? '展开 ▸' : '收起 ▾' }}</span>
      </div>
      <div v-show="!flowCollapsed" class="flow-list">
        <div v-for="(item,index) in flowRecords" :key="index" class="flow-item" :class="{ current:item.current }">
          <span class="flow-dot"></span>
          <div class="flow-content">
            <strong>{{ item.action }}</strong>
            <span>{{ item.date || '待处理' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">隐患与整改复查结果</div>
      <div class="info-row"><span>隐患说明</span><p>{{ record.hazard }}</p></div>
      <div class="info-row"><span>整改结果</span><p>已完成现场整改并上传整改照片</p></div>
      <div class="info-row"><span>复查结果</span><p class="pass-text">通过</p></div>
      <div class="info-row"><span>复查意见</span><p>{{ record.reviewComment || '整改符合要求，同意提交项目经理审批' }}</p></div>
    </div>

    <div class="section approval-card">
      <div class="section-title">审批意见</div>
      <label class="form-row">
        <span>审批日期 <i>*</i></span>
        <input v-model="approvalDate" type="date" />
      </label>
      <label class="form-row">
        <span>审批意见 <i>*</i></span>
        <textarea v-model="approvalComment" rows="3" placeholder="请输入审批意见..." />
      </label>
      <div class="actions">
        <button class="reject" @click="handleApproval(false)">不通过，退回复查</button>
        <button class="pass" @click="handleApproval(true)">通过并关闭</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mp { width:100%; max-width:402px; min-height:100vh; margin:0 auto; background:#f5f5f5; font-family:'PingFang SC',-apple-system,sans-serif; padding-bottom:20px; }
.mh { display:flex; align-items:center; padding:12px 16px; background:#8f0045; color:#fff; position:sticky; top:0; z-index:10; }
.mb { border:0; background:transparent; color:#fff; font-size:28px; line-height:1; cursor:pointer; }
.mt { flex:1; margin:0; font-size:18px; font-weight:600; }
.info-bar { background:#fff; padding:14px 16px; border-bottom:1px solid #eee; }
.info-title { font-size:15px; font-weight:600; color:#1f2329; margin-bottom:5px; }
.info-meta,.people-row { color:#999; font-size:12px; line-height:1.7; }
.people-row { display:flex; gap:10px; flex-wrap:wrap; }
.section { margin:12px 16px; padding:14px 16px; background:#fff; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.section-title { margin-bottom:12px; padding-left:9px; border-left:3px solid #8f0045; color:#1f2329; font-size:14px; font-weight:600; }
.collapsible { display:flex; justify-content:space-between; cursor:pointer; }
.collapse-arrow { color:#999; font-size:12px; font-weight:400; }
.flow-list { padding-left:6px; }
.flow-item { position:relative; display:flex; gap:10px; padding-bottom:14px; }
.flow-item::before { content:''; position:absolute; left:6px; top:14px; bottom:0; width:1px; background:#ddd; }
.flow-item:last-child::before { display:none; }
.flow-dot { width:13px; height:13px; margin-top:2px; border-radius:50%; background:#34a853; flex:none; }
.flow-item.current .flow-dot { background:#8f0045; box-shadow:0 0 0 3px #fceef4; }
.flow-content { flex:1; display:flex; justify-content:space-between; gap:8px; font-size:12px; }
.flow-content strong { color:#333; font-size:13px; }
.flow-content span { color:#999; }
.info-row { display:flex; gap:8px; margin-bottom:8px; font-size:13px; line-height:1.6; }
.info-row > span { width:68px; color:#999; flex:none; }
.info-row p { margin:0; color:#333; }
.pass-text { color:#34a853!important; font-weight:600; }
.form-row { display:flex; gap:8px; align-items:flex-start; margin-bottom:12px; font-size:13px; }
.form-row > span { width:72px; padding-top:7px; color:#666; flex:none; }
.form-row i { color:#e53935; font-style:normal; }
.form-row input,.form-row textarea { flex:1; box-sizing:border-box; min-width:0; padding:9px 10px; border:1px solid #ddd; border-radius:8px; background:#fff; font:inherit; }
.actions { display:flex; gap:10px; margin-top:14px; }
.actions button { flex:1; padding:12px 6px; border-radius:9px; font-size:14px; font-weight:600; cursor:pointer; }
.actions .reject { border:1px solid #e53935; background:#fff2f2; color:#e53935; }
.actions .pass { border:1px solid #8f0045; background:#8f0045; color:#fff; }
</style>

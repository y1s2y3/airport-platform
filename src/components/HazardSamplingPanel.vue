<script setup>
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getHazardIssueRows, getCurrentHazardIssueProjectKey } from '../utils/hazardIssueSummary.js'
import { useCurrentProject } from '../composables/useCurrentProject.js'
import { useSamplingRole, eligible, hqSamplingStatus, SAMPLING_STATUS, visibleHistory, actionableTask, submitReview, generateSample, saveSamplingAttachment, downloadSamplingAttachment } from '../mock/hazardSampling.js'
const props = defineProps({ source: String, recordId: String })
const route = useRoute()
const router = useRouter()
const role = useSamplingRole()
const { selectedProjectId } = useCurrentProject()
const row = computed(() => getHazardIssueRows().find(r => r.source === props.source && r.sourceId === props.recordId))
const allowed = computed(() => row.value && (role.value === 'hq' || row.value.projectKey === getCurrentHazardIssueProjectKey(selectedProjectId.value)))
const task = computed(() => row.value && actionableTask(row.value, role.value, route.query.samplingTask))
const canCheck = computed(() => allowed.value && eligible(row.value) && (role.value === 'hq' || task.value))
const status = computed(() => row.value ? hqSamplingStatus(row.value) : '')
const statusTagType = computed(() => status.value === SAMPLING_STATUS.PASS ? 'success' : status.value === SAMPLING_STATUS.FAIL ? 'danger' : 'info')
const history = computed(() => allowed.value ? visibleHistory(row.value.id, role.value) : [])
const form = reactive({ result: '', note: '', files: [], completed: false })
watch([role, () => props.recordId, () => route.query.samplingTask], () => { form.result = ''; form.note = ''; form.files = []; form.completed = false })
const stageNames = { hq: '指挥部抽检', supervisor: '监理复查', manager: '项目经理全面复查' }
async function upload(file) {
  if (form.files.length >= 9 || file.size > 50 * 1024 * 1024 || !/\.(pdf|jpe?g|png|docx?|xlsx?|pptx?)$/i.test(file.name)) return ElMessage.error('附件最多9个，单个≤50MB，支持文档、表格、演示文稿及图片')
  try { form.files.push(await saveSamplingAttachment(file.raw)) } catch { ElMessage.error('附件保存失败，请重试') }
}
function submit() {
  try {
    const result = submitReview(row.value, role.value, { ...form, files: [...form.files] }, route.query.samplingTask)
    form.result = ''; form.note = ''; form.files = []; form.completed = false
    result.warning ? ElMessage.warning(`抽检结果已保存，任务待生成：${result.warning}`) : ElMessage.success(result.task ? '结果已保存，已推送监理抽检任务' : '复查结果已保存')
  } catch (error) { ElMessage.error(error.message) }
}
function retry() { try { generateSample(row.value); ElMessage.success('监理任务已生成') } catch (error) { ElMessage.warning(error.message) } }
</script>
<template>
  <section v-if="allowed" class="sampling-panel">
    <div class="sampling-panel-head">
      <h3>抽检与复查历史</h3>
      <el-tag :type="statusTagType" effect="plain">抽检状态：{{ status }}</el-tag>
      <el-button v-if="route.query.samplingTask" link type="primary" @click="router.push({path:'/hazard-issues/summary',query:{tab:'sampling',task:route.query.samplingTask}})">返回本次抽检任务</el-button>
    </div>
    <div v-if="canCheck" class="sampling-form">
      <strong>{{ stageNames[role] }}</strong>
      <p v-if="task">任务：{{ task.id }} · 已办理 {{ Object.keys(task.results).length }}/{{ task.ids.length }} 张</p>
      <template v-if="role === 'manager'"><p>请逐单复查；发现问题请在线下整改完成后提交合格结果及支撑附件。</p><el-checkbox v-model="form.completed">已完成复查</el-checkbox></template>
      <el-radio-group v-model="form.result"><el-radio value="合格">合格</el-radio><el-radio v-if="role !== 'manager'" value="不合格">不合格</el-radio></el-radio-group>
      <el-input v-model="form.note" type="textarea" :rows="3" placeholder="填写检查说明；不合格时必须填写原因" />
      <el-upload :auto-upload="false" :show-file-list="false" :on-change="upload" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx"><el-button>上传支撑附件</el-button></el-upload>
      <div v-for="(file,index) in form.files" :key="index">{{ file.name }} <el-button link @click="form.files.splice(index,1)">移除</el-button></div>
      <el-button type="primary" @click="submit">保存本单检查结果</el-button>
    </div>
    <p v-if="row && !eligible(row)" class="sampling-hint">该单据当前状态为「{{ row.status || '--' }}」，尚不可抽检；整改复查完成进入「已复查 / 已关闭 / 已完成」后自动纳入可抽检范围。</p>
    <p v-else-if="!canCheck && role !== 'hq'" class="sampling-hint">该单据不在当前抽检任务范围内。</p>
    <el-empty v-if="!history.length" description="暂无当前身份可查看的抽检记录" :image-size="50" />
    <el-timeline v-else>
      <el-timeline-item v-for="log in [...history].reverse()" :key="log.id" :timestamp="new Date(log.time).toLocaleString()">
        <strong>{{ stageNames[log.stage] }} · {{ log.result }}</strong>
        <p>{{ log.person }} · {{ log.taskId || '指挥部定期抽检' }} {{ log.completed ? '· 已完成复查' : '' }}</p>
        <p>{{ log.note || '--' }}</p>
        <el-button v-for="file in log.files" :key="file.name" link type="primary" @click="downloadSamplingAttachment(file).catch(error => ElMessage.error(error.message))">{{ file.name }}</el-button>
        <p v-if="role === 'hq' && log.pendingReason">当时未生成任务：{{ log.pendingReason }} <el-button link type="primary" @click="retry">按当前规则重试生成</el-button></p>
      </el-timeline-item>
    </el-timeline>
  </section>
</template>
<style scoped>
.sampling-panel { margin:20px 0; padding:18px; background:#fff; border:1px solid #e5e9ef; border-radius:8px; }
.sampling-panel-head { display:flex; flex-wrap:wrap; align-items:center; gap:10px; margin-bottom:16px; }
.sampling-panel h3 { margin:0; font-size:16px; }
.sampling-hint { margin:0 0 14px; font-size:13px; color:#8b929b; }
.sampling-form { display:flex; flex-direction:column; align-items:flex-start; gap:12px; padding:16px; margin-bottom:22px; background:#faf7f9; }
.sampling-form p,.sampling-panel p { margin:6px 0; font-size:13px; color:#697180; }
.sampling-file { display:inline-block; margin-right:12px; color:#8f0045; }
</style>

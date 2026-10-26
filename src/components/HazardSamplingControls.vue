<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useCurrentProject } from '../composables/useCurrentProject.js'
import { sampling, projectSamplingRole, useSamplingRole, visibleTasks, taskComplete, submitTask, ruleFor } from '../mock/hazardSampling.js'
const props = defineProps({ modelValue: { type:String, default:'' }, compact: Boolean })
const emit = defineEmits(['update:modelValue'])
const router = useRouter()
const { selectedProjectId } = useCurrentProject()
const role = useSamplingRole()
const compactTask = ref('')
const selectedId = computed({ get: () => props.compact ? compactTask.value : props.modelValue, set: value => { if (props.compact) compactTask.value = value; emit('update:modelValue', value) } })
const tasks = computed(() => visibleTasks(role.value, selectedProjectId.value))
const selected = computed(() => tasks.value.find(t => t.id === selectedId.value))
const configVisible = ref(false)
const form = reactive({ days: 90, percent: 30, minimum: 3 })
const resolution = ref('')
function openRule() { Object.assign(form, ruleFor()); configVisible.value = true }
function saveRule() {
  if (role.value !== 'hq') return ElMessage.error('仅指挥部可配置抽检规则')
  if (!form.days || !form.percent || !form.minimum) return ElMessage.error('请填写完整的抽检规则')
  sampling.value.rule = { days: Math.round(form.days), percent: Math.round(form.percent), minimum: Math.round(form.minimum) }
  configVisible.value = false; ElMessage.success('规则已保存，后续新任务按此规则生成')
}
function submit() { try { submitTask(selected.value, role.value); ElMessage.success('任务报告已提交') } catch (error) { ElMessage.error(error.message) } }
function resolve() { if (!resolution.value.trim()) return ElMessage.error('请填写指挥部核查意见'); selected.value.resolution = resolution.value; ElMessage.success('结论差异核查意见已记录') }
const stateLabel = task => task.submittedAt ? '已完成' : Object.keys(task.results).length ? '办理中' : '待办理'
</script>
<template>
  <div class="sampling-controls">
    <div class="sampling-toolbar">
      <template v-if="role !== 'hq'"><span>原型演示身份</span><el-select v-model="projectSamplingRole" style="width:140px" @change="emit('update:modelValue','')"><el-option label="监理" value="supervisor"/><el-option label="项目经理" value="manager"/></el-select></template>
      <el-button v-if="role === 'hq' && !compact" @click="openRule">抽检规则配置</el-button>
      <el-select v-model="selectedId" clearable placeholder="选择抽检／全面复查任务" style="width:360px"><el-option v-for="task in tasks" :key="task.id" :label="`${task.projectName} · ${task.stage === 'supervisor' ? '监理抽检' : '全面复查'} · ${task.id}`" :value="task.id"/></el-select>
      <el-button v-if="compact" type="primary" @click="router.push({path:'/hazard-issues/summary',query:{tab:'sampling',task:selectedId}})">进入抽检</el-button>
    </div>
    <p v-if="!tasks.length">暂无当前身份的抽检任务。</p>
    <template v-if="selected">
      <div class="sampling-task-meta">{{ selected.id }} · {{ selected.recipient }} · {{ selected.start }} 至 {{ selected.end }} · 已完成 {{ Object.keys(selected.results).length }}/{{ selected.ids.length }} 张 <el-tag>{{ stateLabel(selected) }}</el-tag></div>
      <p v-if="role === 'supervisor'">本批次包含需重点核查的问题单据，请对全部单据逐项复查。</p>
      <p v-if="role === 'manager'">请全面复查指定范围内所有单据，逐单确认合格并上传支撑附件。</p>
      <el-button v-if="role === selected.stage && !selected.submittedAt && !compact" :disabled="!taskComplete(selected)" type="primary" @click="submit">提交本次任务报告</el-button>
      <div v-if="role === 'hq' && selected.discrepancy && !compact"><el-alert title="监理全部判为合格，请核查与指挥部抽检结论的差异" type="warning" :closable="false"/><p v-if="selected.resolution">核查意见：{{ selected.resolution }}</p><template v-else><el-input v-model="resolution" placeholder="填写证据核查及处理意见"/><el-button @click="resolve">确认核查意见</el-button></template></div>
    </template>
    <el-dialog v-if="role === 'hq'" v-model="configVisible" title="抽检规则配置" width="560px" destroy-on-close>
      <el-form label-width="140px">
        <el-form-item label="取单时间范围"><el-input-number v-model="form.days" :min="1" :max="365"/> 天（截至问题单复查通过日，向前取单）</el-form-item>
        <el-form-item label="抽取比例"><el-input-number v-model="form.percent" :min="1" :max="100"/> %</el-form-item>
        <el-form-item label="最少抽取数量"><el-input-number v-model="form.minimum" :min="2" :max="100"/> 张</el-form-item>
      </el-form>
      <template #footer><el-button @click="configVisible=false">取消</el-button><el-button type="primary" @click="saveRule">保存配置</el-button></template>
    </el-dialog>
  </div>
</template>
<style scoped>
.sampling-controls { margin-bottom:16px; padding:16px; background:#fff; border:1px solid #e5e9ef; border-radius:8px; }
.sampling-toolbar { display:flex; flex-wrap:wrap; align-items:center; gap:12px; }
.sampling-task-meta { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin:14px 0; font-size:13px; }
.sampling-controls p { color:#737c89; font-size:13px; }
</style>

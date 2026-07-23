<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const formMonth = ref('2026-07')
const planStart = ref('')
const planEnd = ref('')
const manager = ref('')

const monthOptions = computed(() => {
  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }
  return months
})

const riskTypeOptions = ['高处坠落', '坍塌事故', '触电事故', '火灾事故', '起重伤害', '物体打击', '机械伤害', '其他伤害']
const levelOptions = ['一般风险', '较大风险', '重大风险']
const managerOptions = ['张工（安全总监）', '李工（安全主管）', '王工（安全员）', '赵工（项目经理）', '陈工（技术负责人）']

const riskItems = ref([{ type: '', spot: '', level: '', desc: '', measure: '' }])

function addRiskItem() { riskItems.value.push({ type: '', spot: '', level: '', desc: '', measure: '' }) }
function removeRiskItem(idx) {
  if (riskItems.value.length > 1) {
    ElMessageBox.confirm('确定删除该风险项？', '提示', { type: 'warning' }).then(() => riskItems.value.splice(idx, 1)).catch(() => {})
  } else { ElMessage.warning('至少保留一条风险项') }
}
function submitForm() {
  if (!formMonth.value) { ElMessage.warning('请选择计划月份'); return }
  if (!planStart.value) { ElMessage.warning('请选择计划开始时间'); return }
  if (!planEnd.value) { ElMessage.warning('请选择计划结束时间'); return }
  if (!manager.value) { ElMessage.warning('请选择管控责任人'); return }
  for (const [i,item] of riskItems.value.entries()) {
    if (!item.type) { ElMessage.warning(`第 ${i+1} 条风险请选择风险类型`); return }
    if (!item.spot.trim()) { ElMessage.warning(`第 ${i+1} 条风险请填写风险点`); return }
    if (!item.level) { ElMessage.warning(`第 ${i+1} 条风险请选择风险等级`); return }
  }
  ElMessage.success('风险辨识已提交')
  router.push('/safety-inspection/risk')
}
function goBack() { router.push('/safety-inspection/risk') }
</script>

<template>
  <div class="fp">
    <div class="fh">
      <div class="fb">安全巡检 / 风险管理 / 新增风险辨识</div>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
        <el-button text @click="goBack">← 返回风险管理台账</el-button>
        <h1 class="ft">新增风险辨识</h1>
      </div>
    </div>

    <div class="fc">
      <div class="fs">
        <div class="fst">计划月份 <i class="req">*</i></div>
        <select v-model="formMonth" class="fi" style="width:200px">
          <option v-for="m in monthOptions" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>

      <div class="fs">
        <div class="fbar"><span class="fst">风险清单</span><button class="fadd" @click="addRiskItem">+ 新增</button></div>
        <div class="table-scroll">
          <table class="ftb">
            <thead>
              <tr>
                <th style="width:40px">序号</th>
                <th style="width:130px">风险类型 <i class="req">*</i></th>
                <th style="min-width:140px">风险点 <i class="req">*</i></th>
                <th style="width:120px">风险等级 <i class="req">*</i></th>
                <th>风险描述</th>
                <th>本月管控措施</th>
                <th style="width:60px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item,i) in riskItems" :key="i">
                <td>{{ i+1 }}</td>
                <td><select v-model="item.type" class="fi" style="width:115px"><option value="" disabled>请选择</option><option v-for="t in riskTypeOptions" :key="t" :value="t">{{ t }}</option></select></td>
                <td><input v-model="item.spot" class="fi" placeholder="请输入风险点" /></td>
                <td><select v-model="item.level" class="fi" style="width:110px"><option value="" disabled>请选择</option><option v-for="l in levelOptions" :key="l" :value="l">{{ l }}</option></select></td>
                <td><input v-model="item.desc" class="fi" placeholder="请输入风险描述" /></td>
                <td><input v-model="item.measure" class="fi" placeholder="请输入本月管控措施" /></td>
                <td><button class="fdel" @click="removeRiskItem(i)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="fs">
        <div class="ffg">
          <div class="fff">
            <label>计划开始时间 <i class="req">*</i></label>
            <input type="date" v-model="planStart" class="fi" />
          </div>
          <div class="fff">
            <label>计划结束时间 <i class="req">*</i></label>
            <input type="date" v-model="planEnd" class="fi" />
          </div>
          <div class="fff">
            <label>管控责任人 <i class="req">*</i></label>
            <select v-model="manager" class="fi"><option value="" disabled>请选择</option><option v-for="m in managerOptions" :key="m" :value="m">{{ m }}</option></select>
          </div>
        </div>
      </div>

      <div class="ffa">
        <button class="fbc" @click="goBack">取消</button>
        <button class="fbs" @click="submitForm">提交</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fp { padding:0; }
.fh { margin-bottom:20px; }
.fbb { background:none; border:1px solid #ddd; border-radius:6px; padding:4px 10px; font-size:16px; color:#666; cursor:pointer; line-height:1; }
.fbb:hover { color:#8f0045; border-color:#8f0045; }
.fb { font-size:13px; color:#999; margin-bottom:8px; }
.ft { font-size:20px; font-weight:600; color:#1f2329; margin:0; }
.fc { }
.fs { background:#fff; border:1px solid #e8e8e8; border-radius:8px; padding:16px 20px; margin-bottom:16px; }
.fst { font-size:14px; font-weight:600; color:#1f2329; padding-left:10px; border-left:3px solid #8f0045; margin-bottom:12px; }
.fbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.fbar .fst { margin-bottom:0; }
.fadd { padding:4px 12px; border:none; border-radius:4px; background:#8f0045; color:#fff; font-size:13px; cursor:pointer; }
.table-scroll { overflow-x:auto; width:100%; }
.ftb { width:100%; min-width:860px; border-collapse:collapse; font-size:13px; }
.ftb thead th { background:#f8f9fa; color:#495057; font-weight:500; padding:8px 10px; text-align:left; border-bottom:1px solid #e8e8e8; white-space:nowrap; }
.ftb tbody td { padding:6px 10px; border-bottom:1px solid #f2f2f2; color:#1f2329; }
.ftb tbody tr:last-child td { border-bottom:none; }
.fi { padding:5px 8px; border:1px solid #ddd; border-radius:4px; font-size:13px; background:#fff; width:100%; box-sizing:border-box; }
.fdel { background:none; border:none; color:#e53935; font-size:13px; cursor:pointer; padding:0; }
.ffg { display:flex; gap:20px; flex-wrap:wrap; }
.fff { display:flex; flex-direction:column; gap:6px; min-width:200px; flex:1; }
.fff label { font-size:13px; font-weight:500; color:#333; }
.req { color:#e53935; font-style:normal; margin-left:2px; font-weight:600; }
.ffa { display:flex; gap:12px; justify-content:flex-end; }
.fbc { padding:8px 24px; border:1px solid #ddd; border-radius:6px; background:#fff; font-size:13px; color:#666; cursor:pointer; }
.fbs { padding:8px 24px; border:none; border-radius:6px; background:#8f0045; color:#fff; font-size:13px; cursor:pointer; }
</style>

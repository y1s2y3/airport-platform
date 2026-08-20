<script setup>
import { ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLaborProjectScope } from '../../composables/useCurrentProject'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const { isHqSelected } = useLaborProjectScope()
const detailTab = ref('basic')

const machineData = {
  'mac-001': { id:'mac-001', machineType:'塔吊', name:'塔吊QTZ160（#1）', spec:'QTZ160', attr:'大型设备', entryType:'租赁', supplier:'四川三益机械有限公司', supplierContact:'张工', supplierPhone:'139****5566', recordNo:'渝U-T00789', manufacturer:'中联重科', factoryNo:'1012T002318', prodDate:'2021-07-16', entryDate:'2023-03-05', exitDate:'2024-05-08', status:'已退场', enabled:false, admin:'王工', address:'飞行区跑道延长工程-施工A区', project:'飞行区跑道延长工程' },
  'mac-002': { id:'mac-002', machineType:'塔吊', name:'塔吊QTZ160（#1）', spec:'WA6515-8', attr:'大型设备', entryType:'租赁', supplier:'四川三益机械有限公司', supplierContact:'张工', supplierPhone:'139****5566', recordNo:'渝U-T00790', manufacturer:'中联重科', factoryNo:'1012T002319', prodDate:'2023-02-10', entryDate:'2023-03-31', exitDate:'2025-01-17', status:'已退场', enabled:false, admin:'王工', address:'飞行区跑道延长工程-施工B区', project:'飞行区跑道延长工程' },
  'mac-003': { id:'mac-003', machineType:'塔吊', name:'塔吊QTZ80（#7）', spec:'QTZ250', attr:'大型设备', entryType:'租赁', supplier:'四川三益机械有限公司', supplierContact:'张工', supplierPhone:'139****5566', recordNo:'渝U-T00791', manufacturer:'徐州建机', factoryNo:'XUG025P123', prodDate:'2020-03-30', entryDate:'2023-07-12', exitDate:'2024-07-16', status:'已退场', enabled:false, admin:'张工', address:'新货运站建设工程-堆场区', project:'新货运站建设工程' },
  'mac-004': { id:'mac-004', machineType:'升降机', name:'升降机SC200（#2）', spec:'SC200/200', attr:'大型设备', entryType:'租赁', supplier:'重庆永鸿翔建筑机械有限公司', supplierContact:'张吉', supplierPhone:'19950234146', recordNo:'渝JB-S01946', manufacturer:'广州市特威工程机械有限公司', factoryNo:'220431782', prodDate:'2022-04-29', entryDate:'2024-02-02', exitDate:'2025-01-17', status:'已退场', enabled:false, admin:'李工', address:'飞行区跑道延长工程-施工B区', project:'飞行区跑道延长工程' },
  'mac-005': { id:'mac-005', machineType:'升降机', name:'升降机SC200（#4）', spec:'SC200/200', attr:'大型设备', entryType:'租赁', supplier:'重庆永鸿翔建筑机械有限公司', supplierContact:'张吉', supplierPhone:'19950234146', recordNo:'渝JB-S01947', manufacturer:'广州市特威工程机械有限公司', factoryNo:'220431781', prodDate:'2022-04-26', entryDate:'2024-01-14', exitDate:'2024-11-22', status:'已退场', enabled:false, admin:'张工', address:'新货运站建设工程-基础区', project:'新货运站建设工程' },
  'mac-006': { id:'mac-006', machineType:'桩基机械', name:'桩基钻孔机#5', spec:'ZJ-3000', attr:'大型设备', entryType:'租赁', supplier:'重庆永鸿翔建筑机械有限公司', supplierContact:'张吉', supplierPhone:'19950234146', recordNo:'渝JB-S01948', manufacturer:'广州市特威工程机械有限公司', factoryNo:'210828443', prodDate:'2021-08-16', entryDate:'2023-12-06', exitDate:'2025-01-17', status:'已退场', enabled:false, admin:'王工', address:'飞行区跑道延长工程-跑道区', project:'飞行区跑道延长工程' },
}
const machine = computed(() => machineData[route.params.id] || {})
const personOptions = ['王工', '李工', '张工', '赵工', '陈工', '刘工']
function goBack() { router.back() }

// ===== 巡检记录 =====
const inspectList = ref([
  { date:'2026-05-15', person:'王工', content:'塔吊结构安全检查', result:'正常', remark:'' },
  { date:'2026-04-15', person:'王工', content:'钢丝绳磨损检查', result:'正常', remark:'' },
])
const inspectDialog = ref(false)
const inspectForm = reactive({ date:'', person:'', content:'', result:'正常', remark:'' })
function openInspectAdd() { Object.assign(inspectForm, { date:'', person:'', content:'', result:'正常', remark:'' }); inspectDialog.value = true }
function addInspect() { if (!inspectForm.date || !inspectForm.person || !inspectForm.content || !inspectForm.result) { ElMessage.warning('请填写完整'); return }; inspectList.value.push({ ...inspectForm }); inspectDialog.value = false; ElMessage.success('巡检记录已添加') }
function delInspect(idx) { ElMessageBox.confirm('确认删除？','提示',{type:'warning'}).then(()=>inspectList.value.splice(idx,1)).catch(()=>{}) }

// ===== 维保记录 =====
const maintainList = ref([
  { date:'2026-06-10', person:'李工', type:'日常保养', content:'润滑、紧固螺栓', remark:'' },
  { date:'2026-05-20', person:'李工', type:'定期维修', content:'更换制动器摩擦片', remark:'' },
])
const maintainDialog = ref(false)
const maintainForm = reactive({ date:'', person:'', type:'日常保养', content:'', remark:'' })
function openMaintainAdd() { Object.assign(maintainForm, { date:'', person:'', type:'日常保养', content:'', remark:'' }); maintainDialog.value = true }
function addMaintain() { if (!maintainForm.date || !maintainForm.person || !maintainForm.type || !maintainForm.content) { ElMessage.warning('请填写完整'); return }; maintainList.value.push({ ...maintainForm }); maintainDialog.value = false; ElMessage.success('维保记录已添加') }
function delMaintain(idx) { ElMessageBox.confirm('确认删除？','提示',{type:'warning'}).then(()=>maintainList.value.splice(idx,1)).catch(()=>{}) }

// ===== 检测记录 =====
const checkList = ref([
  { date:'2026-06-01', person:'检测中心', type:'定期检测', content:'塔吊垂直度检测', result:'合格', remark:'' },
  { date:'2026-03-15', person:'检测中心', type:'安装检测', content:'安装完成后全面检测', result:'合格', remark:'' },
])
const checkDialog = ref(false)
const checkForm = reactive({ date:'', person:'', type:'定期检测', content:'', result:'合格', remark:'' })
function openCheckAdd() { Object.assign(checkForm, { date:'', person:'', type:'定期检测', content:'', result:'合格', remark:'' }); checkDialog.value = true }
function addCheck() { if (!checkForm.date || !checkForm.person || !checkForm.type || !checkForm.content || !checkForm.result) { ElMessage.warning('请填写完整'); return }; checkList.value.push({ ...checkForm }); checkDialog.value = false; ElMessage.success('检测记录已添加') }
function delCheck(idx) { ElMessageBox.confirm('确认删除？','提示',{type:'warning'}).then(()=>checkList.value.splice(idx,1)).catch(()=>{}) }
</script>

<template>
  <div class="detail-page">
    <div class="detail-head">
      <el-button text @click="goBack">← 返回</el-button>
      <h3 class="detail-title" v-if="machine.name">机械设备详情 - {{ machine.name }}</h3>
    </div>
    <div class="detail-body" v-if="machine.id">
      <el-tabs v-model="detailTab">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <div class="detail-section">
            <div class="section-title">基础信息</div>
            <div class="detail-grid">
              <div class="dg-item"><span class="dl">机械类型</span><span class="dv">{{ machine.machineType }}</span></div>
              <div class="dg-item"><span class="dl">机械设备名称</span><span class="dv">{{ machine.name }}</span></div>
              <div class="dg-item"><span class="dl">规格型号</span><span class="dv">{{ machine.spec }}</span></div>
              <div class="dg-item"><span class="dl">机械属性</span><span class="dv">{{ machine.attr }}</span></div>
              <div class="dg-item"><span class="dl">进场类型</span><span class="dv">{{ machine.entryType }}</span></div>
              <div class="dg-item"><span class="dl">设备管理员</span><span class="dv">{{ machine.admin }}</span></div>
              <div class="dg-item full"><span class="dl">详细地址</span><span class="dv">{{ machine.address }}</span></div>
              <div class="dg-item full"><span class="dl">备注</span><span class="dv" style="color:#999">-</span></div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">产权信息</div>
            <div class="detail-grid">
              <div class="dg-item"><span class="dl">设备供应商</span><span class="dv">{{ machine.supplier }}</span></div>
              <div class="dg-item"><span class="dl">供应商联系人</span><span class="dv">{{ machine.supplierContact }}</span></div>
              <div class="dg-item"><span class="dl">供应商联系人电话</span><span class="dv">{{ machine.supplierPhone }}</span></div>
              <div class="dg-item"><span class="dl">备案编号</span><span class="dv">{{ machine.recordNo }}</span></div>
              <div class="dg-item"><span class="dl">生产厂商</span><span class="dv">{{ machine.manufacturer }}</span></div>
              <div class="dg-item"><span class="dl">出厂编号</span><span class="dv">{{ machine.factoryNo }}</span></div>
              <div class="dg-item"><span class="dl">生产日期</span><span class="dv">{{ machine.prodDate }}</span></div>
            </div>
          </div>
          <div class="detail-section">
            <div class="section-title">操作信息</div>
            <div class="detail-grid">
              <div class="dg-item"><span class="dl">进场日期</span><span class="dv">{{ machine.entryDate }}</span></div>
              <div class="dg-item"><span class="dl">退场日期</span><span class="dv">{{ machine.exitDate }}</span></div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 巡检记录 -->
        <el-tab-pane label="巡检记录" name="inspect">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:14px;font-weight:600">巡检台账（{{ inspectList.length }} 条）</span>
            <el-button type="primary" size="small" @click="openInspectAdd" v-if="!isHqSelected">新增巡检记录</el-button>
          </div>
          <el-table :data="inspectList" border size="small" style="width:100%">
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="date" label="巡检日期" width="100" align="center" />
            <el-table-column prop="person" label="巡检人" width="80" align="center" />
            <el-table-column prop="content" label="巡检内容" min-width="200" />
            <el-table-column prop="result" label="巡检结果" width="80" align="center">
              <template #default="{ row }"><el-tag :type="row.result === '正常' ? 'success' : 'danger'" size="small" effect="plain">{{ row.result }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" />
            <el-table-column label="操作" width="60" align="center">
              <template #default="{ $index }"><el-button link type="danger" size="small" @click="delInspect($index)">删除</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 维保记录 -->
        <el-tab-pane label="维保记录" name="maintain">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:14px;font-weight:600">维保台账（{{ maintainList.length }} 条）</span>
            <el-button type="primary" size="small" @click="openMaintainAdd" v-if="!isHqSelected">新增维保记录</el-button>
          </div>
          <el-table :data="maintainList" border size="small" style="width:100%">
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="date" label="维保日期" width="100" align="center" />
            <el-table-column prop="person" label="维保人" width="80" align="center" />
            <el-table-column prop="type" label="维保类型" width="90" align="center" />
            <el-table-column prop="content" label="维保内容" min-width="200" />
            <el-table-column prop="remark" label="备注" min-width="120" />
            <el-table-column label="操作" width="60" align="center">
              <template #default="{ $index }"><el-button link type="danger" size="small" @click="delMaintain($index)">删除</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 检测记录 -->
        <el-tab-pane label="检测记录" name="check">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <span style="font-size:14px;font-weight:600">检测台账（{{ checkList.length }} 条）</span>
            <el-button type="primary" size="small" @click="openCheckAdd" v-if="!isHqSelected">新增检测记录</el-button>
          </div>
          <el-table :data="checkList" border size="small" style="width:100%">
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="date" label="检测日期" width="100" align="center" />
            <el-table-column prop="person" label="检测人" width="90" align="center" />
            <el-table-column prop="type" label="检测类型" width="90" align="center" />
            <el-table-column prop="content" label="检测内容" min-width="200" />
            <el-table-column prop="result" label="检测结果" width="80" align="center">
              <template #default="{ row }"><el-tag :type="row.result === '合格' ? 'success' : 'danger'" size="small" effect="plain">{{ row.result }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" />
            <el-table-column label="操作" width="60" align="center">
              <template #default="{ $index }"><el-button link type="danger" size="small" @click="delCheck($index)">删除</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 新增巡检记录弹窗 -->
    <el-dialog v-model="inspectDialog" title="新增巡检记录" width="480px" :close-on-click-modal="false">
      <el-form :model="inspectForm" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="巡检日期" required><el-date-picker v-model="inspectForm.date" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" aria-label="选择日期"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="巡检人" required><el-select v-model="inspectForm.person" placeholder="请选择" style="width:100%" aria-label="请选择"><el-option v-for="p in personOptions" :key="p" :label="p" :value="p" /></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="巡检内容" required><el-input v-model="inspectForm.content" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="巡检结果" required><el-select v-model="inspectForm.result" style="width:100%"><el-option label="正常" value="正常" /><el-option label="异常" value="异常" /></el-select></el-form-item></el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="inspectForm.remark" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="inspectDialog=false">取消</el-button><el-button type="primary" @click="addInspect">确认</el-button></template>
    </el-dialog>

    <!-- 新增维保记录弹窗 -->
    <el-dialog v-model="maintainDialog" title="新增维保记录" width="480px" :close-on-click-modal="false">
      <el-form :model="maintainForm" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="维保日期" required><el-date-picker v-model="maintainForm.date" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" aria-label="选择日期"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="维保人" required><el-select v-model="maintainForm.person" placeholder="请选择" style="width:100%" aria-label="请选择"><el-option v-for="p in personOptions" :key="p" :label="p" :value="p" /></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="维保类型" required><el-select v-model="maintainForm.type" style="width:100%"><el-option label="日常保养" value="日常保养" /><el-option label="定期维修" value="定期维修" /><el-option label="故障维修" value="故障维修" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="维保内容" required><el-input v-model="maintainForm.content" /></el-form-item></el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="maintainForm.remark" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="maintainDialog=false">取消</el-button><el-button type="primary" @click="addMaintain">确认</el-button></template>
    </el-dialog>

    <!-- 新增检测记录弹窗 -->
    <el-dialog v-model="checkDialog" title="新增检测记录" width="480px" :close-on-click-modal="false">
      <el-form :model="checkForm" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="检测日期" required><el-date-picker v-model="checkForm.date" type="date" placeholder="选择日期" style="width:100%" value-format="YYYY-MM-DD" aria-label="选择日期"/></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="检测人" required><el-select v-model="checkForm.person" placeholder="请选择" style="width:100%" aria-label="请选择"><el-option v-for="p in personOptions" :key="p" :label="p" :value="p" /></el-select></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="检测类型" required><el-select v-model="checkForm.type" style="width:100%"><el-option label="定期检测" value="定期检测" /><el-option label="安装检测" value="安装检测" /><el-option label="专项检测" value="专项检测" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="检测内容" required><el-input v-model="checkForm.content" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="检测结果" required><el-select v-model="checkForm.result" style="width:100%"><el-option label="合格" value="合格" /><el-option label="不合格" value="不合格" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="备注"><el-input v-model="checkForm.remark" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer><el-button @click="checkDialog=false">取消</el-button><el-button type="primary" @click="addCheck">确认</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.detail-page { padding:0; }
.detail-head { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
.detail-title { font-size:18px; font-weight:600; color:#1f2329; margin:0; }
.detail-body { background:#fff; border-radius:8px; padding:24px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
.detail-section { margin-bottom:24px; }
.section-title { font-size:14px; font-weight:600; color:#1f2329; margin-bottom:12px; padding-bottom:8px; border-bottom:1px solid #eee; }
.detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 24px; }
.dg-item { display:flex; font-size:13px; padding:4px 0; }
.dg-item.full { grid-column:1/-1; }
.dl { width:120px; color:#666; flex-shrink:0; }
.dv { color:#1f2329; }
.el-form-item__label::before {
  content: '' !important;
}
.el-form-item.is-required .el-form-item__label::after {
  content: '*';
  color: #e74c3c;
  margin-left: 4px;
  font-weight: bold;
}
</style>
